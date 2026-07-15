NPC data (32 NPCs, all populated) — some highlights:

NPC 17 is stationary at (32, 44) with dialog 8 — almost certainly Lord British himself, centred in the castle
NPCs 15, 16, 29–31 are merchants; NPCs 25–28 are hostile (guards)
NPC 32 at (32, 14) is Chuckles the jester, wandering near the entrance
All 8 sign slots are populated with flavour text ("Iolo sings:", "Enter... If you dare!", etc.)

Tile mapping — this map is much richer than Sosaria, using 38 distinct tile types (mostly in the 32–57 range — interior castle tiles like floors, walls, doors, thrones). All resolved by the same direct tile_num = frame assumption. The two known remapped tiles (33→20, 34→21) appear here too and are correctly handled.
This is ready to drop into assets/maps/. When you start wiring TownView to load specific town files, british.json will need a TownView variant that accounts for the fact that this is a castle (no exterior exit — entry/exit via specific door tiles rather than walking off the edge). That's something to handle when you get to the map-switching logic.