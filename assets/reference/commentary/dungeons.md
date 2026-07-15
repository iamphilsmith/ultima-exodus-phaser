
8 levels, each a 16×16 grid of cells (not 64×64 tiles) Cells are encoded as a single byte: high nibble = structure type (corridor, wall, door, ladder up/down, secret door), low nibble = feature (chest, fountain, pit, altar, special) No NPCs, no tileset mapping — dungeon rendering will be first-person (DungeonView) rather than top-down

The JSON I've produced uses a decoded cell structure { type, feature?, x, y, raw } per cell across 8 levels, with the sign text attached to each level. This will need a different loader than the town/overworld maps — something to design when you get to DungeonView. The other dungeon files from original-file-format.md are: DARDIN.ULT, M.ULT, MINE.ULT, P.ULT, PERINIAN.ULT, and TIME.ULT.
### FIRE.ULT - Dungeon of Fire

### DARDIN.ULT - Dardin's Pit
The pit-focused dungeon. Level counts escalate dramatically toward the bottom: L6 has 22 pits ("Circle Death!"), L8 has 25 ("Traps to gold!") plus 2 altars. Level 3 is a vertical transit level (121 up-ladders — essentially a gravity shaft). Level 5 is the chest level with 5.

### M.ULT - Dungeon of Doom
The landmark entry is L7 with zero ladders up ("Reach up!") — you can only go deeper, a deliberate design trap. Heavy on downward ladders throughout. L8 is the reward level: 4 chests, 2 fountains, 1 altar. Signs are ominous: "Welcome fools to your doom!!"

### MINE.ULT - Mines of Morinia
The fountain dungeon. L7 is extraordinary: 175 fountains, almost every cell — "Dark prevails!" — suggesting a flooded level used as a navigation puzzle. L5 has 13 fountains ("Mines of madness"). 2 altars on L8 ("Dry hole").

### P.ULT - Dungeon of the Snake
The most lore-rich dungeon: L2 sign reads "<Insert> cards into Exodus!" and L3 says "<Search> the Shrines!" — quest-critical clues placed deep in a dungeon. L5 and L6 both warn "Don't drink!" against the fountains. Heavy on chests in the lower levels (8 on L5, 4 on L6 and L7).

### PERINIAN.ULT - Perinian Depths
The extremes dungeon. L4 has 41 fountains and 33 pits ("Quarter each!") and L6 has 85 fountains ("Map well!") — both levels are essentially obstacle courses. Signs are discouraging throughout: "Go back!", "Not here!", "Death awaits!". 2 altars on L8.

### TIME - Dungeon of Time
The most conventionally structured dungeon, with consistent ladder counts across levels. L8 has 17 pits and 2 altars, with the sign "Very near now!" — a reward tease for those who make it to the bottom. L3's "Golden center!" hints at treasure in the middle of the map.