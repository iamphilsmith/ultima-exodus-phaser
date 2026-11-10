# Phase 7 conflict check. Run against the API started with the no-clip profile:
#   cd server-dotnet\UltimaExodus.Api
#   dotnet run --launch-profile http-noclip
# Start with the party on the overworld (not in a town or a conflict).
# No-clip also makes creature tiles walkable inside a conflict, so bumping into
# them is NOT checked here (GameServiceConflictTests covers it).
$base = "http://localhost:5223"
$mapSize = 64
$failures = 0

function Get-State { Invoke-RestMethod "$base/api/state" }
function Move-Party($dir) {
    Invoke-RestMethod -Method Post "$base/api/move" -ContentType "application/json" -Body (@{ direction = $dir } | ConvertTo-Json)
}
function Attack-Party($dir) {
    Invoke-RestMethod -Method Post "$base/api/attack" -ContentType "application/json" -Body (@{ direction = $dir } | ConvertTo-Json)
}
function Attack-Raw($dir) {
    Invoke-WebRequest -Method Post "$base/api/attack" -ContentType "application/json" -Body (@{ direction = $dir } | ConvertTo-Json) -SkipHttpErrorCheck
}
function Interact { Invoke-RestMethod -Method Post "$base/api/interact" }
# Shortest signed distance on the wrapping 64x64 overworld.
function Delta($from, $to) {
    $d = (($to - $from) % $mapSize + $mapSize) % $mapSize
    if ($d -gt $mapSize / 2) { $d - $mapSize } else { $d }
}
function Walk-To($tx, $ty) {
    $s = Get-State
    while ($s.position.x -ne $tx -or $s.position.y -ne $ty) {
        $dx = Delta $s.position.x $tx
        $dy = Delta $s.position.y $ty
        if ($dx -ne 0) { $dir = if ($dx -gt 0) { "East" } else { "West" } }
        else { $dir = if ($dy -gt 0) { "South" } else { "North" } }
        $before = "$($s.position.x),$($s.position.y)"
        $s = Move-Party $dir
        if ("$($s.position.x),$($s.position.y)" -eq $before) {
            throw "Stuck at $before moving $dir. Is the API running with the http-noclip profile?"
        }
    }
    $s
}
function Check($label, $actual, $expected) {
    if ("$actual" -eq "$expected") { "  ok   $label = $actual" }
    else { "  FAIL $label : expected '$expected', got '$actual'"; $script:failures++ }
}

# Where to stand, which way to attack, and the conflict map that should load.
$cases = @(
    @{ Name = "land monster"; X = 41; Y = 17; Dir = "South"; Map = "conflict-grass" },
    @{ Name = "sea creature"; X = 49; Y = 20; Dir = "North"; Map = "conflict-shore" }
)

$start = (Get-State).position
if ($start.category -ne 0) { throw "Start on the overworld (leave the town or conflict first)." }

"== nothing to attack"
Walk-To 41 17 | Out-Null
$s = Attack-Party "North"
Check "log"                $s.log[-1].text "Nothing to attack"
Check "position unchanged" "$($s.position.x),$($s.position.y)" "41,17"
Check "map"                $s.position.mapId "world-sosaria"

"== bad direction"
Check "unknown name" (Attack-Raw "Up").StatusCode 400
Check "out of range" (Attack-Raw 9).StatusCode 400

foreach ($c in $cases) {
    "== $($c.Name)"
    Walk-To $c.X $c.Y | Out-Null
    $s = Attack-Party $c.Dir
    Check "map after attack"   $s.position.mapId $c.Map
    Check "category"           $s.position.category 4
    Check "start tile"         "$($s.position.x),$($s.position.y)" "5,6"
    Check "log"                $s.log[-1].text "Conflict"

    $s = Get-State
    Check "map after refresh"  $s.position.mapId $c.Map

    $s = Interact
    Check "E inside"           $s.log[-1].text "Nothing here"
    $s = Attack-Party "North"
    Check "A inside"           $s.log[-1].text "Nothing to attack"
    Check "A inside, map"      $s.position.mapId $c.Map

    for ($i = 0; $i -lt 5; $i++) { $s = Move-Party "West" }
    Check "west edge"          "$($s.position.x),$($s.position.y)" "0,6"
    Check "still in conflict"  $s.position.mapId $c.Map

    $s = Move-Party "West"
    Check "map after leaving"  $s.position.mapId "world-sosaria"
    Check "category"           $s.position.category 0
    Check "back where I was"   "$($s.position.x),$($s.position.y)" "$($c.X),$($c.Y)"
    Check "leave message"      $s.log[-1].text "Leaving..."
    Check "map after refresh"  (Get-State).position.mapId "world-sosaria"
}

Walk-To $start.x $start.y | Out-Null
if ($failures -eq 0) { "ALL PASSED" } else { "$failures CHECK(S) FAILED" }