import Phaser from 'phaser';
import { MapService, MapCategory } from '../services/map';
import { loadSpritesheetOnce } from './assets';
import { writeTextCentered } from './bitmap-text';
import {
  BORDER, CANVAS_H, CANVAS_W, CHAR_H, TILE, EGA_BLUE, EGA_CYAN, EGA_WHITE,
} from './shell-layout';

const INTRO_TILES_H = 6;
/** The divider bar between the title area and the map strip (y = 80). */
const DIVIDER_Y = CANVAS_H - 2 * BORDER - INTRO_TILES_H * TILE;
/** The map strip sits directly under the divider (y = 88). */
const INTRO_MAP_Y = DIVIDER_Y + BORDER;

export class IntroScene extends Phaser.Scene {
  constructor(private readonly mapService: MapService) {
    super('intro');
  }

  preload(): void {
    loadSpritesheetOnce(this, 'chars', 'assets/sprites/charset.png');
    loadSpritesheetOnce(this, 'tiles', 'assets/sprites/shapes.png');
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#000000');
    this.drawBorder();
    writeTextCentered(this, 'EXODUS', 12, EGA_WHITE, 5);
    writeTextCentered(this, '\x10PRESS  <SPACE>\x11', CANVAS_H - CHAR_H, EGA_CYAN);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-SPACE', this.onSpace);
    });

    // Listen for SPACE only after the map attempt, and even if it failed,
    // so a missing map never strands the player on this screen.
    await this.drawMapStrip();
    this.input.keyboard?.on('keydown-SPACE', this.onSpace);
  }

  private readonly onSpace = (): void => {
    this.input.keyboard?.off('keydown-SPACE', this.onSpace);
    this.scene.start('main-menu');
  };

  private async drawMapStrip(): Promise<void> {
    try {
      const map = await this.mapService.getMap(MapCategory.World, 'world-intro');
      for (let row = 0; row < map.height; row++) {
        for (let col = 0; col < map.width; col++) {
          this.add
            .image(BORDER + col * TILE, INTRO_MAP_Y + row * TILE, 'tiles', map.tiles[row * map.width + col])
            .setOrigin(0, 0)
            .setDepth(1);
        }
      }
    } catch (error) {
      console.error('Intro map failed to load', error);
    }
  }

  private drawBorder(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(EGA_BLUE);
    g.fillRect(0, 0, BORDER, CANVAS_H);                    // left
    g.fillRect(0, 0, CANVAS_W, BORDER);                    // top
    g.fillRect(0, CANVAS_H - BORDER, CANVAS_W, BORDER);    // bottom
    g.fillRect(CANVAS_W - BORDER, 0, BORDER, CANVAS_H);    // right
    g.fillRect(0, DIVIDER_Y, CANVAS_W, BORDER);            // divider above the map strip
  }
}