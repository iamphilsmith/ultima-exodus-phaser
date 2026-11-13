import { lookupTile, wrap } from './map-tile';

// 3x3 map; each tile's value is its position in reading order:
//   0 1 2
//   3 4 5
//   6 7 8
const map = { width: 3, height: 3, tiles: [0, 1, 2, 3, 4, 5, 6, 7, 8] };

describe('wrap', () => {
  it('leaves in-range values alone', () => expect(wrap(2, 3)).toBe(2));
  it('wraps negatives', () => expect(wrap(-1, 3)).toBe(2));
  it('wraps values past the end', () => expect(wrap(4, 3)).toBe(1));
});

describe('lookupTile', () => {
  it('reads an in-bounds tile', () => expect(lookupTile(map, 2, 2, false)).toBe(8));

  it('wraps past the right edge when wrapping', () => expect(lookupTile(map, 3, 1, true)).toBe(3));
  it('wraps past the left edge when wrapping', () => expect(lookupTile(map, -1, 0, true)).toBe(2));
  it('wraps past the top edge when wrapping', () => expect(lookupTile(map, 0, -1, true)).toBe(6));
  it('wraps past the bottom edge when wrapping', () => expect(lookupTile(map, 1, 3, true)).toBe(1));

  it('has no tile off the left edge when not wrapping', () => expect(lookupTile(map, -1, 0, false)).toBeUndefined());
  it('has no tile off the right edge when not wrapping', () => expect(lookupTile(map, 3, 0, false)).toBeUndefined());
  it('has no tile off the top edge when not wrapping', () => expect(lookupTile(map, 0, -1, false)).toBeUndefined());
  it('has no tile off the bottom edge when not wrapping', () => expect(lookupTile(map, 0, 3, false)).toBeUndefined());
});