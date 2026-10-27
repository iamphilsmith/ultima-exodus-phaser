import Phaser from 'phaser';
import { MapData } from '../services/map';
import { PartyPosition } from '../services/game';
import { TileCatalogueService } from '../services/tile-catalogue';
import { canSee } from './line-of-sight';
import { EGA_BLACK, MAP_X, MAP_Y, TILE, VIEW_TILES } from './shell-layout';

const VIEW_RADIUS = Math.floor(VIEW_TILES / 2); // 5 tiles either side of the party
const AVATAR_FRAME = 20; // party avatar in the 'tiles' sheet
const FOG_ALPHA = 0.9;

/** Wrap a coordinate onto the map. (C#'s and JS's % can both go negative.) */
export function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * Draws the 11x11 window of the overworld around the party, with fog of war.
 * The 121 tile images never move: render() just changes which frame each one
 * shows and redraws the fog.
 */
export class OverworldView {
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private avatar: Phaser.GameObjects.Image;
  private fog: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapData,
    private readonly tiles: TileCatalogueService
  ) {
    for (let row = 0; row < VIEW_TILES; row++) {
      this.tileSprites[row] = [];
      for (let col = 0; col < VIEW_TILES; col++) {
        const img = scene.add.image(MAP_X + col * TILE, MAP_Y + row * TILE, 'tiles', 0);
        img.setOrigin(0, 0);
        img.setDepth(1);
        img.setVisible(false); // hidden until the first render()
        this.tileSprites[row][col] = img;
      }
    }

    this.fog = scene.add.graphics();
    this.fog.setDepth(5);

    this.avatar = scene.add.image(
      MAP_X + VIEW_RADIUS * TILE + TILE / 2,
      MAP_Y + VIEW_RADIUS * TILE + TILE / 2,
      'tiles',
      AVATAR_FRAME
    );
    this.avatar.setDepth(10);
    this.avatar.setVisible(false);
  }

  get mapId(): string {
    return this.map.mapId;
  }

  render(position: PartyPosition): void {
    for (let row = 0; row < VIEW_TILES; row++) {
      for (let col = 0; col < VIEW_TILES; col++) {
        const tile = this.tileAt(position.x - VIEW_RADIUS + col, position.y - VIEW_RADIUS + row);
        this.tileSprites[row][col].setFrame(tile).setVisible(true);
      }
    }
    this.avatar.setVisible(true);
    this.renderFog(position);
  }

  private renderFog(position: PartyPosition): void {
    const blocksVisionAt = (dx: number, dy: number): boolean =>
      this.tiles.getProperties(this.tileAt(position.x + dx, position.y + dy)).visionBlocking;

    this.fog.clear();
    for (let row = 0; row < VIEW_TILES; row++) {
      for (let col = 0; col < VIEW_TILES; col++) {
        if (!canSee(col - VIEW_RADIUS, row - VIEW_RADIUS, blocksVisionAt)) {
          this.fog.fillStyle(EGA_BLACK, FOG_ALPHA);
          this.fog.fillRect(MAP_X + col * TILE, MAP_Y + row * TILE, TILE, TILE);
        }
      }
    }
  }

  /**
   * The tile at a map coordinate, wrapping at the edges. The server's tile
   * numbers are already 0-based, so they are the sheet frame numbers (the old
   * client needed `tile.index - 1`).
   */
  private tileAt(x: number, y: number): number {
    return this.map.tiles[wrap(y, this.map.height) * this.map.width + wrap(x, this.map.width)];
  }

  /** Remove everything this view added to the scene, so a new map can take its place. */
  destroy(): void {
    for (const row of this.tileSprites) {
      for (const img of row) {
        img.destroy();
      }
    }
    this.tileSprites = [];
    this.avatar.destroy();
    this.fog.destroy();
  }
}