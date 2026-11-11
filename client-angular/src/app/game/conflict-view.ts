import Phaser from 'phaser';
import { MapData } from '../services/map';
import { PartyPosition } from '../services/game';
import { lookupTile } from './map-tile';
import { MapView } from './map-view';
import { MAP_X, MAP_Y, TILE } from './shell-layout';

const AVATAR_FRAME = 20; // party avatar in the 'tiles' sheet

/** Top-left pixel of a conflict-map tile on screen. The map fills the viewport. */
export function conflictTilePixel(x: number, y: number): { x: number; y: number } {
  return { x: MAP_X + x * TILE, y: MAP_Y + y * TILE };
}

/**
 * Draws a conflict map. It is exactly the size of the viewport, so nothing
 * scrolls: the tiles are drawn once and only the avatar moves, right up to the
 * edge. No fog.
 */
export class ConflictView implements MapView {
  private tileSprites: Phaser.GameObjects.Image[] = [];
  private avatar: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapData
  ) {
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const tile = lookupTile(map, col, row, false);
        if (tile === undefined) continue;

        const { x, y } = conflictTilePixel(col, row);
        const img = scene.add.image(x, y, 'tiles', tile);
        img.setOrigin(0, 0);
        img.setDepth(1);
        this.tileSprites.push(img);
      }
    }

    this.avatar = scene.add.image(0, 0, 'tiles', AVATAR_FRAME);
    this.avatar.setOrigin(0, 0);
    this.avatar.setDepth(10);
    this.avatar.setVisible(false); // hidden until the first render()
  }

  get mapId(): string {
    return this.map.mapId;
  }

  render(position: PartyPosition): void {
    const { x, y } = conflictTilePixel(position.x, position.y);
    this.avatar.setPosition(x, y).setVisible(true);
  }

  destroy(): void {
    this.tileSprites.forEach((img) => img.destroy());
    this.tileSprites = [];
    this.avatar.destroy();
  }
}