# Phase 5 party organisation check. Run against a FRESH database: stop the API,
# delete server-dotnet\UltimaExodus.Api\ultima-exodus.db*, then start it again.
$base = "http://localhost:5223"
$failures = 0

function Post($path, $obj) {
    Invoke-RestMethod -Method Post -Uri "$base/$path" -ContentType "application/json" -Body ($obj | ConvertTo-Json)
}
function Post-Raw($path, $obj) {
    Invoke-WebRequest -Method Post -Uri "$base/$path" -ContentType "application/json" -Body ($obj | ConvertTo-Json) -SkipHttpErrorCheck
}
function New-Hero($name, $sex, $race, $class) {
    Post "api/roster/create" @{ name = $name; sex = $sex; race = $race; class = $class
        strength = 10; dexterity = 10; intelligence = 15; wisdom = 15 }
}
function Party { @((Invoke-RestMethod "$base/api/state").party.members) }
function Check($label, $actual, $expected) {
    if ("$actual" -eq "$expected") { "  ok   $label = $actual" }
    else { "  FAIL $label : expected '$expected', got '$actual'"; $script:failures++ }
}

$existing = @((Invoke-RestMethod "$base/api/roster").entries | Where-Object hero)
if ($existing.Count -ne 0) { throw "Roster is not empty. Start from a fresh database." }

"== empty start"
Check "party members" (Party).Count 0

"== create"
$r = New-Hero "Alpha" "Male" "Human" "Fighter";    Check "alpha"   "$($r.status) $($r.entry)" "Created 1"
$r = New-Hero "Beta"  "Female" "Elf" "Cleric";     Check "beta"    "$($r.status) $($r.entry)" "Created 2"
$r = New-Hero "Gamma" "Male" "Dwarf" "Wizard";     Check "gamma"   "$($r.status) $($r.entry)" "Created 3"
$r = New-Hero "Delta" "Female" "Bobbit" "Thief";   Check "delta"   "$($r.status) $($r.entry)" "Created 4"
$r = New-Hero "Echo"  "Male" "Fuzzy" "Druid";      Check "echo"    "$($r.status) $($r.entry)" "Created 5"
Check "gamma initials" $r.roster.entries[2].hero.initials "MDW"

"== form [3,1,4,2]"
$r = Post "api/party/form" @{ entries = 3, 1, 4, 2 }
Check "status" $r.status "Formed"
$m = Party
Check "member count" $m.Count 4
Check "names in order" ($m.name -join ",") "Gamma,Alpha,Delta,Beta"
Check "slots" ($m.slot -join ",") "1,2,3,4"
Check "types" ($m.type -join ",") "MDW,MHF,FBT,FEC"
Check "condition" ($m.condition | Select-Object -Unique) "G"
Check "hits / food / level / magic" "$($m[0].hits) $($m[0].food) $($m[0].level) $($m[0].magic)" "100 0 1 0"

"== refusals while a party exists"
Check "form again" (Post "api/party/form" @{ entries = 2, 3, 4, 5 }).status "AlreadyFormed"
Check "terminate party member" (Post "api/roster/terminate" @{ entry = 1 }).status "InParty"

"== disperse"
$r = Post "api/party/disperse" @{}
Check "partyFormed" $r.partyFormed "False"
Check "party members" (Party).Count 0
Check "heroes kept" @($r.entries | Where-Object hero).Count 5

"== malformed requests (no party now)"
Check "three entries"    (Post-Raw "api/party/form" @{ entries = 1, 2, 3 }).StatusCode 400
Check "entry above 20"   (Post-Raw "api/party/form" @{ entries = 2, 3, 4, 21 }).StatusCode 400
Check "terminate entry 25" (Post-Raw "api/roster/terminate" @{ entry = 25 }).StatusCode 400

"== rule outcomes"
Check "duplicate"        (Post "api/party/form" @{ entries = 1, 2, 2, 4 }).status "Duplicate"
Check "empty entry"      (Post "api/party/form" @{ entries = 2, 3, 4, 6 }).status "EmptyEntry"

"== terminated heroes (the old build's bugs)"
Check "terminate alpha"  (Post "api/roster/terminate" @{ entry = 1 }).status "Terminated"
Check "terminate again"  (Post "api/roster/terminate" @{ entry = 1 }).status "Empty"
Check "form with terminated entry" (Post "api/party/form" @{ entries = 1, 2, 3, 4 }).status "EmptyEntry"
$r = New-Hero "Foxtrot" "Female" "Human" "Paladin"
Check "entry reused" "$($r.status) $($r.entry)" "Created 1"
Check "form with replacement" (Post "api/party/form" @{ entries = 1, 2, 3, 5 }).status "Formed"
Check "first member" (Party)[0].name "Foxtrot"

Post "api/party/disperse" @{} | Out-Null
if ($failures -eq 0) { "ALL PASSED" } else { "$failures CHECK(S) FAILED" }