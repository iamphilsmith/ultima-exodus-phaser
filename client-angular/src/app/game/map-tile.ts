import type { MapData } from '../services/map';

/** Wrap a coordinate onto the map. (C#'s and JS's % can both go negative) */
export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * The tile at a map coordinate. The overworld wraps at its edges; towns and castles
 * don't, so a coordinate off the map has no tile (undefined). The server's tile
 * numbers are already 0-based, so they are the sheet frame numbers.
 */
export function lookupTile(
    map: Pick<MapData, 'width' | 'height' | 'tiles'>,
    x: number,
    y: number,
    wraps: boolean
): number | undefined {
  if (!wraps && (x < 0 || x >= map.width || y < 0 || y >= map.height)) {
    return undefined;
  }
  return map.tiles[wrap(y, map.height) * map.width + wrap(x, map.width)];
}