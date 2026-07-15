/**
 * world-locations.ts
 *
 * Static lookup table mapping overworld tile coordinates to location definitions.
 * When the hero stands on a tile and presses E (interact), OverworldView checks
 * this table using the hero's current (tileX, tileY) as the key.
 *
 * Naming conventions (must match preload() keys in WorldScene):
 *   Overworld maps  — 'world-sosaria', 'world-ambrosia'
 *   Castle maps     — 'castle-british', 'castle-exodus'
 *   Town maps       — 'town-lcb', 'town-moon', etc.
 *
 * Entry points: the tile coordinate within the location map where the hero spawns.
 *   Towns   — left edge (tileX=0), vertically centred (tileY=32 on a 64×64 map)
 *   Castles — south gate; tileY is the last passable row, tileX is the gate column
 *
 * TODO: Fill in the correct overworld (tileX, tileY) for each location once
 * confirmed from the Sosaria map. Current values are placeholders marked TODO.
 */

export type LocationType = 'town' | 'castle' | 'shrine'

export interface LocationDef {
    id:          string        // human-readable identifier, used in log messages
    type:        LocationType
    tilemapKey:  string        // key as registered in WorldScene.preload()
    tilesetName: string        // tileset name inside the Tiled JSON
    layerName:   string        // layer name inside the Tiled JSON
    entryTileX:  number        // hero spawn position within the location map
    entryTileY:  number
    enterMsg:    string        // message shown in the action log on entry
}

export interface WorldTileEntry {
    tileX:    number           // hero position on the overworld that triggers entry
    tileY:    number
    location: LocationDef
}

// ── Location definitions ──────────────────────────────────────────────────────
// Each object is defined once and referenced in the world tables below.

const CASTLE_BRITISH: LocationDef = {
    id:          'british',
    type:        'castle',
    tilemapKey:  'castle-british',
    tilesetName: 'castle-british',
    layerName:   'castle-british-layer',
    entryTileX:  32,   // TODO: confirm gate column from british.json
    entryTileY:  63,   // south edge — last row of the 64×64 map
    enterMsg:    "Lord British's Castle",
}

const CASTLE_EXODUS: LocationDef = {
    id:          'exodus',
    type:        'castle',
    tilemapKey:  'castle-exodus',
    tilesetName: 'castle-exodus',
    layerName:   'castle-exodus-layer',
    entryTileX:  32,   // TODO: confirm gate column from exodus.json
    entryTileY:  63,
    enterMsg:    'Castle Exodus',
}

const TOWN_LCB: LocationDef = {
    id:          'lcb',
    type:        'town',
    tilemapKey:  'town-lcb',
    tilesetName: 'town-lcb',
    layerName:   'town-lcb-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Britain',
}

const TOWN_MOON: LocationDef = {
    id:          'moon',
    type:        'town',
    tilemapKey:  'town-moon',
    tilesetName: 'town-moon',
    layerName:   'town-moon-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Moon',
}

const TOWN_DAWN: LocationDef = {
    id:          'dawn',
    type:        'town',
    tilemapKey:  'town-dawn',
    tilesetName: 'town-dawn',
    layerName:   'town-dawn-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Dawn',
}

const TOWN_DEATH: LocationDef = {
    id:          'death',
    type:        'town',
    tilemapKey:  'town-death',
    tilesetName: 'town-death',
    layerName:   'town-death-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Death Gulch',
}

const TOWN_DEVIL: LocationDef = {
    id:          'devil',
    type:        'town',
    tilemapKey:  'town-devil-guard',
    tilesetName: 'town-devil-guard',
    layerName:   'town-devil-guard-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Devil Guard',
}

const TOWN_FAWN: LocationDef = {
    id:          'fawn',
    type:        'town',
    tilemapKey:  'town-fawn',
    tilesetName: 'town-fawn',
    layerName:   'town-fawn-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Fawn',
}

const TOWN_GREY: LocationDef = {
    id:          'grey',
    type:        'town',
    tilemapKey:  'town-grey',
    tilesetName: 'town-grey',
    layerName:   'town-grey-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Grey',
}

const TOWN_MONTOR_E: LocationDef = {
    id:          'montor_e',
    type:        'town',
    tilemapKey:  'town-montor_e',
    tilesetName: 'town-montor_e',
    layerName:   'town-montor_e-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Montor East',
}

const TOWN_MONTOR_W: LocationDef = {
    id:          'montor_w',
    type:        'town',
    tilemapKey:  'town-montor_w',
    tilesetName: 'town-montor_w',
    layerName:   'town-montor_w-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Montor West',
}

const TOWN_YEW: LocationDef = {
    id:          'yew',
    type:        'town',
    tilemapKey:  'town-yew',
    tilesetName: 'town-yew',
    layerName:   'town-yew-layer',
    entryTileX:  0,
    entryTileY:  32,
    enterMsg:    'Yew',
}

// ── Sosaria world table ───────────────────────────────────────────────────────
// TODO: Replace placeholder tileX/tileY values with confirmed overworld coordinates.
// Tip: stand on each location tile in-game and read the hero position from the
// save state (or add a debug log of hero.tileX / hero.tileY to handleInteract).

export const SOSARIA_LOCATIONS: WorldTileEntry[] = [
    { tileX:  45, tileY:  18, location: CASTLE_BRITISH },   // TODO
    { tileX:  10, tileY:  53, location: CASTLE_EXODUS },    // TODO
    { tileX:  46, tileY:  19, location: TOWN_LCB },         // TODO
    { tileX:  6, tileY:  13, location: TOWN_MOON },        // TODO
    { tileX:  38, tileY:  54, location: TOWN_DAWN },        // TODO
    { tileX:  56, tileY:  31, location: TOWN_DEATH },       // TODO
    { tileX:  18, tileY:  31, location: TOWN_DEVIL },       // TODO
    { tileX:  30, tileY:  2, location: TOWN_FAWN },        // TODO
    { tileX:  7, tileY:  44, location: TOWN_GREY },        // TODO
    { tileX:  49, tileY:  58, location: TOWN_MONTOR_E },    // TODO
    { tileX:  47, tileY:  58, location: TOWN_MONTOR_W },    // TODO
    { tileX:  34, tileY:  16, location: TOWN_YEW },         // TODO
]

// ── Ambrosia world table ──────────────────────────────────────────────────────
// Ambrosia contains four shrines (one per virtue stat).
// Shrine LocationDefs go here once shrine tile coordinates are confirmed.

export const AMBROSIA_LOCATIONS: WorldTileEntry[] = [
    // TODO: add shrine entries
]
