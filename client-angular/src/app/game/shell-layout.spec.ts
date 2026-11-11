import { centredStartX, tilePixel, MAP_PX, MAP_X, MAP_Y, TILE, VIEW_TILES } from './shell-layout';

describe('centredStartX', () => {
    it('centres normal-size text', () => {
        expect(centredStartX(18)).toBe(88);    // 'PARTY ORGANIZATION'
    });

    it('accounts for the scale of double-size text', () => {
        expect(centredStartX(6, 2)).toBe(112); // 'EXODUS'
    });

    it('rounds down when the leftover space is odd', () => {
        expect(centredStartX(3)).toBe(148);
        expect(centredStartX(5)).toBe(140);
    });

    it('starts at 0 for a full-width line', () => {
        expect(centredStartX(40)).toBe(0);
    });
});

describe('tilePixel', () => {
    it('puts tile (0,0) at the top-left of the map area', () => {
        expect(tilePixel(0, 0)).toEqual({ x: MAP_X, y: MAP_Y });
    });

    it('steps one tile at a time', () => {
        expect(tilePixel(5, 6)).toEqual({ x: MAP_X + 5 * TILE, y: MAP_Y + 6 * TILE });
    });

    it('fits the last tile of an 11x11 map exactly inside the map area', () => {
        const last = tilePixel(VIEW_TILES - 1, VIEW_TILES - 1);

        expect(last.x + TILE).toBe(MAP_X + MAP_PX);
        expect(last.y + TILE).toBe(MAP_Y + MAP_PX);
    });
});