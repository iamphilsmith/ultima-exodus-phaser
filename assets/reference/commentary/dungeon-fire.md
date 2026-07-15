This is a dungeon, not a town map — a completely different format and rendering system (first-person DungeonView, not tile-based). The Tiled JSON format doesn't really apply here. Let me produce something more useful instead.Ran a command, read a fileRan a command, read a filefire.json done, but worth flagging — this is a dungeon, not a town. The format is completely different:

8 levels, each a 16×16 grid of cells (not 64×64 tiles)
Cells are encoded as a single byte: high nibble = structure type (corridor, wall, door, ladder up/down, secret door), low nibble = feature (chest, fountain, pit, altar, special)
No NPCs, no tileset mapping — dungeon rendering will be first-person (DungeonView) rather than top-down

The JSON I've produced uses a decoded cell structure { type, feature?, x, y, raw } per cell across 8 levels, with the sign text attached to each level. This will need a different loader than the town/overworld maps — something to design when you get to DungeonView.
The other dungeon files from original-file-format.md are: DARDIN.ULT, M.ULT, MINE.ULT, P.ULT, PERINIAN.ULT, and TIME.ULT. Shall I handle those the same way, or continue with the remaining town maps first?