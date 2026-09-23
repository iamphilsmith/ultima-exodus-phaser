import Phaser from 'phaser';
import { 
  BORDER,
  CANVAS_W,
  CANVAS_H,
  CHAR_H,
  CHAR_W,
  MAP_X,
  MAP_PX,
  EGA_BLUE,  
  EGA_CYAN } from './shell-layout';
import { writeText } from './bitmap-text';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
  }

  preload(): void {
    this.load.spritesheet('chars', 'assets/sprites/charset.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    console.log('chars frameTotal:', this.textures.get('chars').frameTotal);

    this.drawBorder();
    this.drawMoonPhase();
    this.drawWindDirection();
  }

  private drawBorder(): void {
    const g = this.add.graphics();
    g.setDepth(2);
    g.fillStyle(EGA_BLUE);
    g.fillRect(0, 0, BORDER, CANVAS_H);
    g.fillRect(CANVAS_W - BORDER, 0, BORDER, (CHAR_H *4) * 4 + BORDER);
    g.fillRect(0, 0, MAP_X + MAP_PX + BORDER, BORDER);
    g.fillRect(0, CANVAS_H - BORDER, MAP_X + MAP_PX + BORDER, BORDER);
    g.fillRect(MAP_X + MAP_PX, 0, BORDER, CANVAS_H);
  }

  private drawMoonPhase(): void {
    const text = '\x10(0)(1)\x11';
    const mapCentreX = MAP_X + Math.floor(MAP_PX / 2);
    const startX = mapCentreX - Math.floor(text.length * CHAR_W) / 2;
    writeText(this, text, startX, 0, EGA_CYAN);
  }

  drawWindDirection(): void {
    const text = '\x10South Wind\x11';
    const mapCentreX = MAP_X + Math.floor(MAP_PX / 2);
    const startX = mapCentreX - Math.floor(text.length * CHAR_W) / 2;
    writeText(this, text, startX, CANVAS_H - CHAR_H, EGA_CYAN);
  }
}