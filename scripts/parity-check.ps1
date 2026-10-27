$base = "http://localhost:5223"
$mapSize = 64
$failures = 0

function Get-State { Invoke-RestMethod "$base/api/state" }
function Move-Party($dir) {
    Invoke-RestMethod -Method Post "$base/api/move" -ContentType "application/json" -Body (@{ direction = $dir } | ConvertTo-Json)
}
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

# Id, category (1 town, 2 castle), overworld tile, spawn, message, direction that leaves
$locations = @(
    @{ Id = "castle-british"; Cat = 2; X = 45; Y = 18; Ex = 32; Ey = 63; Msg = "Lord British's Castle"; Out = "South" },
    @{ Id = "castle-exodus"; Cat = 2; X = 10; Y = 53; Ex = 32; Ey = 63; Msg = "Castle Exodus"; Out = "South" },
    @{ Id = "town-lcb"; Cat = 1; X = 46; Y = 19; Ex = 0; Ey = 32; Msg = "Britain"; Out = "West" },
    @{ Id = "town-moon"; Cat = 1; X = 6; Y = 13; Ex = 0; Ey = 32; Msg = "Moon"; Out = "West" },
    @{ Id = "town-dawn"; Cat = 1; X = 38; Y = 54; Ex = 0; Ey = 32; Msg = "Dawn"; Out = "West" },
    @{ Id = "town-death"; Cat = 1; X = 56; Y = 31; Ex = 0; Ey = 32; Msg = "Death Gulch"; Out = "West" },
    @{ Id = "town-devil-guard"; Cat = 1; X = 18; Y = 31; Ex = 0; Ey = 32; Msg = "Devil Guard"; Out = "West" },
    @{ Id = "town-fawn"; Cat = 1; X = 30; Y = 2; Ex = 0; Ey = 32; Msg = "Fawn"; Out = "West" },
    @{ Id = "town-grey"; Cat = 1; X = 7; Y = 44; Ex = 0; Ey = 32; Msg = "Grey"; Out = "West" },
    @{ Id = "town-montor_e"; Cat = 1; X = 49; Y = 58; Ex = 0; Ey = 32; Msg = "Montor East"; Out = "West" },
    @{ Id = "town-montor_w"; Cat = 1; X = 47; Y = 58; Ex = 0; Ey = 32; Msg = "Montor West"; Out = "West" },
    @{ Id = "town-yew"; Cat = 1; X = 34; Y = 16; Ex = 0; Ey = 32; Msg = "Yew"; Out = "West" }
)

$start = (Get-State).position
if ($start.category -ne 0) { throw "Start on the overworld (leave the town first)." }

foreach ($l in $locations) {
    "== $($l.Id)"
    Walk-To $l.X $l.Y | Out-Null
    $s = Invoke-RestMethod -Method Post "$base/api/interact"
    Check "map after E"        $s.position.mapId $l.Id
    Check "category"           $s.position.category $l.Cat
    Check "spawn"              "$($s.position.x),$($s.position.y)" "$($l.Ex),$($l.Ey)"
    Check "enter message"      $s.log[-1].text $l.Msg
    $s = Invoke-RestMethod -Method Post "$base/api/interact"
    Check "E inside"           $s.log[-1].text "Nothing here"
    $s = Move-Party $l.Out
    Check "map after leaving"  $s.position.mapId "world-sosaria"
    Check "back on entrance"   "$($s.position.x),$($s.position.y)" "$($l.X),$($l.Y)"
    Check "leave message"      $s.log[-1].text "Leaving..."
}

Walk-To $start.x $start.y | Out-Null
if ($failures -eq 0) { "ALL PASSED" } else { "$failures CHECK(S) FAILED" }