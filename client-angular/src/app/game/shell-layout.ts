// Ported from the old src/scenes/WorldScene.ts layout constants.

export const TILE = 16;
export const CHAR_W = 8;
export const CHAR_H = 8;
export const BORDER = 8;
export const VIEW_TILES = 11;
export const MAP_X = BORDER;
export const MAP_Y = BORDER;
export const MAP_PX = VIEW_TILES * TILE;         // 176
export const PANEL_X = MAP_X + MAP_PX + BORDER;  // 192
export const CANVAS_W = 320;
export const CANVAS_H = 192;

export const PARTY_H = 128;
export const LOG_Y = PARTY_H + 8;
export const LOG_ROWS = 7;

// EGA colours
export const EGA_CYAN = 0x54fcfc;
export const EGA_WHITE = 0xfcfcfc;
export const EGA_BLUE = 0x0000a8;
export const EGA_BLACK = 0x000000;

// Charset sentinels
export const CHAR_ARROW_RIGHT = 16;
export const CHAR_ARROW_LEFT = 17;

export const EGA_GREEN = 0x54fc54;
export const EGA_RED = 0xfc5454;

/** Left x pixel for text of `length` characters centred on the canvas. */
export function centredStartX(length: number, scale = 1): number {
    return Math.floor((CANVAS_W - length * CHAR_W * scale) / 2);
}