# Ultima 3 File Structures


SHAPES.ULT
----------
This file contains 0x50 tiles. All tiles are 16*16 pixels^2.
Each tile in stored in CGA-compatible format. The first 0x20 bytes of each tile contain the first bit plane, the following 0x20 bytes contain the second bit plane.

| Offset | Length | Purpose |
|---|---|---|
| 0x0 | 0x40 | tile 0x0 |
| 0x40 | 0x40 | tile 0x1 |
| 0x80 | 0x40 | tile 0x2 |
| ... | | |
| 0x13C0 | 0x40 | tile 0x4f |

Mapping data from ult to phaser using current sprite

The ULT raw byte encodes the tile as `raw_byte / 4` (0-indexed). The Tiled tileset uses 1-indexed IDs, so: `tiled_id = raw_byte / 4 + 1`. Frame B tiles for animated sprites have raw codes > 0xFF and are not stored in map files; they are used only at runtime for animation.

Confidence key:
- **HIGH** – confirmed by matching raw ULT bytes to map data
- **MEDIUM** – structurally inferred from the sequential encoding pattern; not directly seen in overworld map
- **LOW** – text/sign tiles; sequence inferred but individual letter assignments are uncertain

| Code in ULT files | Row | Sprite tile number | Description | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 0x00 | 1 | 1 | Water | HIGH | Confirmed – most common tile in map |
| 0x04 | 1 | 2 | Grass | HIGH | Confirmed – second most common tile |
| 0x08 | 1 | 3 | Bush | HIGH | Confirmed |
| 0x0C | 1 | 4 | Forest | HIGH | Confirmed |
| 0x10 | 1 | 5 | Mountains | HIGH | Confirmed |
| 0x14 | 1 | 6 | Dungeon | HIGH | Confirmed – 7 entrances on map |
| 0x18 | 1 | 7 | Town | HIGH | Confirmed – 9 towns on map |
| 0x1C | 1 | 8 | Castle | HIGH | Confirmed – 2 castles on map |
| 0x20 | 1 | 9 | Pavement | MEDIUM | Not seen in overworld; inferred from pattern |
| 0x24 | 1 | 10 | Chest | MEDIUM | Not seen in overworld; chest encoding uses low 2 bits (see notes) |
| 0x28 | 2 | 11 | Horse | MEDIUM | Not seen in overworld; doc says stored as 0x28 |
| 0x2C | 2 | 12 | Boat | MEDIUM | Not seen in overworld; doc says stored as 0x2C |
| 0x30 | 2 | 13 | Whirlpool frame A | MEDIUM | Not seen in overworld; position stored separately at 0x1220 |
| 0x34 | 2 | 14 | Serpent | MEDIUM | Not seen in overworld |
| 0x38 | 2 | 15 | Man'o war | MEDIUM | Not seen in overworld |
| 0x3C | 2 | 16 | Pirate | MEDIUM | Not seen in overworld |
| 0x40 | 2 | 17 | Character 1 frame A | MEDIUM | Not seen in overworld; party tile |
| 0x44 | 2 | 18 | Lark frame A | MEDIUM | Not seen in overworld |
| 0x48 | 2 | 19 | Guard frame A | MEDIUM | Not seen in overworld |
| 0x4C | 2 | 20 | Lord British frame A | MEDIUM | Not seen in overworld |
| 0x50 | 3 | 21 | Fighter frame A | MEDIUM | Not seen in overworld |
| 0x54 | 3 | 22 | Cleric frame A | MEDIUM | Not seen in overworld |
| 0x58 | 3 | 23 | Wizard frame A | MEDIUM | Not seen in overworld |
| 0x5C | 3 | 24 | Character 2 frame A | MEDIUM | Not seen in overworld |
| 0x60 | 3 | 25 | Troll frame A | MEDIUM | Not seen in overworld |
| 0x64 | 3 | 26 | Skeleton frame A | MEDIUM | Not seen in overworld |
| 0x68 | 3 | 27 | Golem frame A | MEDIUM | Not seen in overworld |
| 0x6C | 3 | 28 | Monster 1 frame A | MEDIUM | Not seen in overworld |
| 0x70 | 3 | 29 | Monster 2 frame A | MEDIUM | Not seen in overworld |
| 0x74 | 3 | 30 | Dragon frame A | MEDIUM | Not seen in overworld |
| 0x78 | 4 | 31 | Monster 3 frame A | MEDIUM | Not seen in overworld |
| 0x7C | 4 | 32 | Exodus | MEDIUM | Not seen in overworld |
| 0x80 | 4 | 33 | Force field | MEDIUM | Not seen in overworld |
| 0x84 | 4 | 34 | Lava | HIGH | Confirmed – 13 lava tiles on overworld map |
| 0x88 | 4 | 35 | Moongate | HIGH | Confirmed – 1 moongate on overworld map |
| 0x8C | 4 | 36 | Wall | MEDIUM | Not seen in overworld |
| 0x90 | 4 | 37 | Blank | MEDIUM | Not seen in overworld |
| 0x94 | 4 | 38 | Char blank | MEDIUM | Text rendering tile; not in overworld |
| 0x98 | 4 | 39 | Char 'A' | LOW | Text tile; sequence inferred |
| 0x9C | 4 | 40 | Char 'B' | LOW | Text tile |
| 0xA0 | 5 | 41 | Char 'C' | LOW | Text tile |
| 0xA4 | 5 | 42 | Char 'D' | HIGH | Confirmed – devil-guard.ult: DEUIL (DEVIL), GUARD, FOOD, AND |
| 0xA8 | 5 | 43 | Char 'E' | LOW | Text tile |
| 0xAC | 5 | 44 | Char 'F' | LOW | Text tile |
| 0xB0 | 5 | 45 | Char 'G' | LOW | Text tile |
| 0xB4 | 5 | 46 | Char 'H' | LOW | Text tile |
| 0xB8 | 5 | 47 | Char 'I' | LOW | Text tile |
| 0xBC | 5 | 48 | Char 'V' | LOW | Text tile |
| 0xC0 | 5 | 49 | Char 'Y' | LOW | Text tile |
| 0xC4 | 5 | 50 | Char 'L' | LOW | Text tile |
| 0xC8 | 6 | 51 | Char 'M' | LOW | Text tile |
| 0xCC | 6 | 52 | Char 'N' | LOW | Text tile |
| 0xD0 | 6 | 53 | Char 'O' | LOW | Text tile |
| 0xD4 | 6 | 54 | Char 'P' | LOW | Text tile |
| 0xD8 | 6 | 55 | Char 'W' | LOW | Text tile |
| 0xDC | 6 | 56 | Char 'R' | LOW | Text tile |
| 0xE0 | 6 | 57 | Char 'S' | LOW | Text tile |
| 0xE4 | 6 | 58 | Char 'T' | LOW | Text tile |
| 0xE8 | 6 | 59 | Snake tail | HIGH | Confirmed – seen in overworld map at (10,57) |
| 0xEC | 6 | 60 | Snake head | HIGH | Confirmed – seen in overworld map at (10,58) |
| 0xF0 | 7 | 61 | Fireball type A | MEDIUM | Combat/animation tile; not in overworld |
| 0xF4 | 7 | 62 | Fireball type B | MEDIUM | Combat/animation tile |
| 0xF8 | 7 | 63 | Shrine | MEDIUM | Not seen in overworld |
| 0xFC | 7 | 64 | Ranger | MEDIUM | Not seen in overworld |
| — | 7 | 65 | Character 1 frame B | MEDIUM | Animation frame B; raw code >0xFF, runtime only |
| — | 7 | 66 | Lark frame B | MEDIUM | Animation frame B |
| — | 7 | 67 | Guard frame B | MEDIUM | Animation frame B |
| — | 7 | 68 | Lord British frame B | MEDIUM | Animation frame B |
| — | 7 | 69 | Fighter frame B | MEDIUM | Animation frame B |
| — | 7 | 70 | Cleric frame B | MEDIUM | Animation frame B |
| — | 8 | 71 | Wizard frame B | MEDIUM | Animation frame B |
| — | 8 | 72 | Character 2 frame B | MEDIUM | Animation frame B |
| — | 8 | 73 | Troll frame B | MEDIUM | Animation frame B |
| — | 8 | 74 | Skeleton frame B | MEDIUM | Animation frame B |
| — | 8 | 75 | Golem frame B | MEDIUM | Animation frame B |
| — | 8 | 76 | Monster 1 frame B | MEDIUM | Animation frame B |
| — | 8 | 77 | Monster 2 frame B | MEDIUM | Animation frame B |
| — | 8 | 78 | Dragon frame B | MEDIUM | Animation frame B |
| — | 8 | 79 | Monster 3 frame B | MEDIUM | Animation frame B |
| — | 8 | 80 | Whirlpool frame B | MEDIUM | Animation frame B; position stored separately |

### Correction history

The initial sosaria.json conversion contained four misidentified tiles, all resulting from the same root cause: the converter used sprite numbers from the character/monster rows (21–28) instead of the correct terrain tiles at those raw byte values.

| Raw byte | Was mapped to | Correct mapping | Count in map |
| --- | --- | --- | --- |
| 0x84 | 21 (Fighter frame A) | 34 (Lava) | 13 |
| 0x88 | 22 (Cleric frame A) | 35 (Moongate) | 1 |
| 0xE8 | 27 (Golem frame A) | 59 (Snake tail) | 1 |
| 0xEC | 28 (Monster 1 frame A) | 60 (Snake head) | 1 |



CHARSET.ULT
-----------

This file contains the 0x80 characters that make up the U3 font. All characters are 8*8 pixels^2.
Each character in stored in CGA-compatible format. The first 0x8 bytes of each character contain the first bit plane, the following 0x8 bytes contain the second bit plane.

| Offset | Length | Purpose |
|---|---|---|
| 0x0 | 0x10 | character 0x0
| 0x10 | 0x10 | character 0x1
| ... | | |
| 0x7F0 | 0x10 | character 0x7F |


SOSARIA.ULT
-----------

This file contains the world map and information about the game world state.

| Offset | Length | Purpose |
|---|---|---|
| 0x0 | 0x1000 | 64*64 world map |
| 0x1000 | 0x180 | not used |
| 0x1180 | 0x20 | tile number of monster 1-32;  divide by 4 to get real tile number |
| 0x11A0 | 0x20 | tile number of floor under monster 1-32;  divide by 4 to get real tile number |
| 0x11C0 | 0x20 | x coordinate of monster 1-32 |
| 0x11E0 | 0x20 | y coordinate of monster 1-32 |
| 0x1200 | 0x20 | movement flag of monster 1-32 |
| 0x1220 | 0x1 | x coordinate of whirlpool |
| 0x1221 | 0x1 | y coordinate of whirlpool |
| 0x1222 | 0x1 | signed byte to add to x coordinate of whirlpool; possible values: 0, 1, 0xFF |
| 0x1223 | 0x1 | signed byte to add to y coordinate of whirlpool; possible values: 0, 1, 0xFF |
| 0x1224 | 0x1 | current phase of left moon; ranges from 0-7 |
| 0x1225 | 0x1 | current phase of right moon; ranges from 0-7 |
| 0x1226 | 0x1 | current sub-phase of left moon; ranges from 0-0xB |
| 0x1227 | 0x1 | current sub-phase of right moon; ranges from 0-3 |

## Monsters, horses, ships, chests
The original Ultima Exodus game stores the location of these objects by writing them directly into the map. This will not be the way the new system will work.
1. Monsters
    1. Monsters are stored as basetile_number*4.
    2. The map tile under the monster is stored in the table at 0x11A0.
2. Horses
    1. Horses are stored as 0x28 == horse_tile*4.
    2. The tile under the horse can only be 0x1, because you can only dismount a horse on a grass tile.
3. ships
    1. Ships are stored as 0x2C == ship_tile*4.
    2. The tile under the ship can only be 0x0.
4. chests
    1. The map tile under the chest is encoded in the lowest 2 bits of the tile:
    2. 0x24 == chest_tile*4 + 0 --> chest on bricks (tile 0x8)
    3. 0x25 == chest_tile*4 + 1 --> chest on grass (tile 0x1)
    4. 0x26 == chest_tile*4 + 2 --> chest on forest (tile 0x2)
    5. 0x27 == chest_tile*4 + 3 --> chest on deep forest (tile 0x3)
    6. Monsters can't walk onto chests, so there can only be one chest per map square.

5. Moon phases and sub-phases
    1. Each turn, both sub-phases are decremented. When a sub-phase reaches -1, it is reset to 0xB/3, and the corresponding phase is incremented.
    2. The phases are the numbers displayed on the upper border of the game world window.


DEMO.ULT
--------

* This file contains the 19*6 map displayed in the main menu.
* Each byte represents a tile.


MOVES.ULT
---------

This file contains the animation script for the main menu map.

| Offset | Length | Purpose |
|---|---|---|
| 0x0 | 0x200 | command table |
| 0x200 | 0x200 | data table |


ROSTER.ULT
----------

Infomation about all characters the player has created.

| Offset | Length | Purpose |
|---|---|---|
| 0x0 | 0x40 | character record 1 |
| 0x40 | 0x40 | character record 2 |
| ... | | |
| 0x4C0 | 0x40 | character record 20 |

Character record format:
BCD = binary coded decimal (two digits per byte).

| Offset | Length | Purpose |
|---|---|---|
| 0x0 | 0xA | character name; ASCII string, 0-terminated. Padded with 0's. |
| 0xA | 0x4 | ? |
| 0xE | 0x1 | marks and cards; bit 0-7 = love, sol, moon, death, force, fire, snake, kings |
| 0xF | 0x1 | number of torches; BCD |
| 0x10 | 0x1 | 0x0 = character is not in party, 0xFF = character is in party |
| 0x11 | 0x1 | status; ASCII character: G = Good, P = Poinsoned, D = Dead, A = Ashes |
| 0x12 | 0x1 | strength; BCD |
| 0x13 | 0x1 | dexterity; BCD |
| 0x14 | 0x1 | intelligence; BCD |
| 0x15 | 0x1 | wisdom; BCD |
| 0x16 | 0x1 | race; ASCII character: E = Elf, D = Dwarf, F = Fuzzy, H = Human, B = Bobbit |
| 0x17 | 0x1 | class; ASCII character: W = Wizard, R = Ranger, T = Theif, I = Illusionist, A = Alchemist, D = Druid, F = Fighter, L = Lark, C = Cleric, B = Barbarian | P = Paladin
| 0x18 | 0x1 | gender; ASCII character: M = Male, F = Female, O = Other |
| 0x19 | 0x1 | current magic points; BCD |
| 0x1A | 0x2 | current hit points; BCD |
| 0x1C | 0x2 | maximum hit points; BCD |
| 0x1E | 0x2 | experience points; BCD |
| 0x20 | 0x1 | sub-morsels; BCD |
| 0x21 | 0x2 | food; BCD |
| 0x23 | 0x2 | gold; BCD |
| 0x25 | 0x1 | gems; BCD |
| 0x26 | 0x1 | keys; BCD |
| 0x27 | 0x1 | powders; BCD |
| 0x28 | 0x1 | currently worn armor |
| 0x29 | 0x7 | how many of each armor type; BCD |
| 0x30 | 0x1 | currently readied weapon |
| 0x31 | 0xF | how many of each weapon type; BCD |

Sub-morsels:

This field contains 2 digits (those behind the decimal point) of the food field.

On the surface, the game subtracts 10 from this field during every turn (remember that it contains a BCD). Everywhere else, the game subtracts 10 every 4 turns.

### Classes
To start with, you have the four base classes
| Code | Name | Description |
| --- | --- | --- |
| F | Fighter | Able to equip anything | 
| C | Cleric | Full Wisdom access to spells |
| W | Wizard | Full INT use of spells |
| T | Thief | High bonus versus traps and stealing |

The next six classes are a mix of two of the four base classes listed:
| Code | Name | Description |
| --- | --- | --- |
| P | Paladin | Fighter + Cleric |
| B | Barbarian | Fighter + Thief |
| L | Lark | Fighter + Wizard |
| I | Illusionist | Cleric + Thief |
| D | Druid | Cleric + Wizard |
| A | Alchemist | Thief + Wizard |
| R | Ranger | A bit of everything |


Weapon types

| Offset | Letter | Name |
| --- | --- | --- |
| 0x31 | B | Dagger |
| 0x32 | C | Mace |
| 0x33 | D | Sling |
| 0x34 | E | Axe |
| 0x35 | F | Bow |
| 0x36 | G | Sword |
| 0x37 | H | 2H Sword |
| 0x38 | I | +2 Axe |
| 0x39 | J | +2 Bow |
| 0x3A | K | +2 Sword |
| 0x3B | L | Gloves |
| 0x3C | M | +4 Axe |
| 0x3D | N | +4 Bow |
| 0x3E | O | +4 Sword |
| 0x3F | P | Exotic Weapon |

Armor types

| Offset | Letter | Name |
| --- | --- | --- |
| 0x29 | B | Cloth |
| 0x2A | C | Leather |
| 0x2B | D | Chain |
| 0x2C | E | Plate |
| 0x2D | F | +2 Chain |
| 0x2E | G | +2 Plate |
| 0x2F | H | Exotic Armor |


PARTY.ULT
---------

Information about the current party.
BCD = binary coded decimal (two digits per byte).

| Offset | Length | Purpose |
| --- | --- | --- |
| 0x0 | 0x1 | mode of transportation; 0xA = horse, 0xB = ship, 0x3F = on foot |
| 0x1 | 0x1 | ? |
| 0x2 | 0x1 | party location |
| 0x3 | 0x4 | number of moves; BCD |
| 0x7 | 0x1 | number of characters in the party |
| 0x8 | 0x1 | x coordinate of party (on Sosarian map) |
| 0x9 | 0x1 | y coordinate of party (on Sosarian map) |
| 0xA | 0x4 | number of PC in slot 1-4 (party order) |
| 0xE | 0x4 | ? |
| 0x12 | 0x40 | character record for PC 1 |
| 0x52 | 0x40 | character record for PC 2 |
| 0x92 | 0x40 | character record for PC 3 |
| 0xD2 | 0x40 | character record for PC 4 |

Party location:
* 0 = Sosaria
* 1 = dungeon
* 2 = towne
* 3 = castle (LB's Castle, Castle Death)
* 4 = shrine, fountain, mark
* 0x80 = combat
* 0xF0 = talking to merchant
* 0xFF = Ambrosia

You can only save your game in Sosaria, so the party location field in the file is always 0.


.ULT files (town maps)
----------------------

These files contain the map and "dialog" for each town. There are 32 NPC's in every town. (?)

```
BRITISH.ULT     Lord British's castle
DAWN.ULT        Dawn
DEATH.ULT       Death Gulch
DEVIL.ULT       Devil Guard
EXODUS.ULT      Exodus (Castle Death)
FAWN.ULT        Fawn
GREY.ULT        Grey
LCB.ULT         Britain
MONTOR_E.ULT    Montor East
MONTOR_W.ULT    Montor West
MOON.ULT        Moon
YEW.ULT         Yew
```

| Offset | Length | Purpose |
| --- | --- | --- |
| 0x0 | 0x1000 | 64*64 town map |
| 0x1000 | n*0x2 | sign text offsets; n <= 8, add 0x1000 to get the real offset |
| 0x1000+n*0x2 | variable | sign texts and dialog; all texts are 0-terminated ASCII strings |
| 0x1180 | 0x20 | tile number for each NPC; divide by 4 to get real tile number |
| 0x11A0 | 0x20 | tile number of floor under each NPC; divide by 4 to get real tile number |
| 0x11C0 | 0x20 | starting x coordinate of each NPC |
| 0x11E0 | 0x20 | starting y coordinate of each NPC |
| 0x1200 | 0x20 | movement flag + dialog number |
| 0x1220 | 0x8 | not used |

```
Movement flag + dialog number:
(byte >> 4) == 0 --> NPC walks around
(byte >> 4) == 4 --> NPC doesn't move
(byte >> 4) == 8 --> NPC is a merchant
(byte >> 4) == 0xC --> NPC attacks party
(byte % 0xF) == sentence number
Still unknown: 0x85, 0x86 (?)
```

.ULT files (dungeon maps)
-------------------------

These files contain the dungeon maps and sign texts.

| File name | Dungeon name |
| --- | ---|
| DARDIN.ULT | Dardin's Pit |
| FIRE.ULT | Dungeon of Fire |
| M.ULT | Dungeon of Doom |
| MINE.ULT | Mines of Morinia |
| P.ULT | Dungeon of the Snake |
| PERINIAN.ULT | Perinian Depths |
| TIME.ULT | Dungeon of Time |

More details

| Offset | Length | Purpose |
| --- | --- | --- |
| 0x0 | 0x100 | 16*16 map of level 1 |
| 0x100 | 0x100 | 16*16 map of level 2 |
| ... | | |
| 0x700 | 0x100 | 16*16 map of level 8 |
| 0x800 | n*0x2 | sign text offsets; n = 8, add 0x800 to get the real offset |
| 0x810 | 0x80 | sign texts; every sign text is a 0-terminated ASCII string |

There is at most one sign per dungeon level.
To find out the text for a sign, use (dungeon_level-1) as an index into the table at 0x800.


.ULT files (conflict maps)
--------------------------

These files contain the 11*11 conflict maps.

| File name | Terrain description |
| --- | --- |
| CNFLCT_A.ULT | ? |
| CNFLCT_B.ULT | ? |
| CNFLCT_C.ULT | ? |
| CNFLCT_F.ULT | ? |
| CNFLCT_G.ULT | Grasslands? |
| CNFLCT_M.ULT | ? |
| CNFLCT_Q.ULT | ? |
| CNFLCT_R.ULT | ? |
| CNFLCT_S.ULT | ? |

| Offset | Length | Purpose |
| --- | --- | --- |
| 0x0 | 0x79 | 11*11 map; each byte represents one tile
| 0x79 | 0x7 | ?
| 0x80 | 0x8 | starting x coordinates for monsters 1-8
| 0x88 | 0x8 | starting y coordinates for monsters 1-8
| 0x90 | 0x8 | not used
| 0x98 | 0x8 | not used
| 0xA0 | 0x4 | starting x coordinates for PC's 1-4
| 0xA4 | 0x4 | starting y coordinates for PC's 1-4
| 0xA8 | 0x4 | not used
| 0xAC | 0x4 | not used

U3 uses the 8 bytes at offset 0x90 (in memory) to store the tiles under monster 1-8.
U3 uses the 8 bytes at offset 0x98 (in memory) to store the hit points of monster 1-8.
U3 uses the 4 bytes at offset 0xA8 (in memory) to store the tiles under PC 1-4.
U3 uses the 4 bytes at offset 0xAC (in memory) to store the base tiles for PC 1-4.
U3 doesn't use the values stored at these locations in the conflict files.


.IMG files
----------

Each of these files contains an 11*11 tile^2 image.
Each byte represents a tile number.

| File name | Description |
| --- | --- |
| BRAND.IMG | brand |
| FOUNTAIN.IMG | fountain |
| SHRINE.IMG | Ambrosian shrine |
| TIME.IMG | Time Lord |


Notes
-----
I'm pretty sure that U3 doesn't save the wind direction.
