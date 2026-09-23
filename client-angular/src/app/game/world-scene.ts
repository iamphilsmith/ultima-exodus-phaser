import Phaser from 'phaser';
import { 
  BORDER,
  CANVAS_W,
  CANVAS_H,
  CHAR_H,
  CHAR_W,
  MAP_X,
  MAP_PX,
  PANEL_X,
  PARTY_H,
  EGA_BLUE,  
  EGA_CYAN,
  EGA_WHITE } from './shell-layout';
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
    this.drawPartyPanel();
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

  private drawPartyPanel(): void {
    const PANEL_W_CHARS = 15;
    const party = [
      { num: '1', name: 'Gregory', cls: 'G', stats: 'MHF M:00 L:01', hp: 'H:0150 F:0149' },
      { num: '2', name: 'Bodur', cls: 'G', stats: 'MDF M:00 L:01', hp: 'H:0150 F:0149' },
      { num: '3', name: 'Idris', cls: 'G', stats: 'MBW M:03 L:01', hp: 'H:0150 F:0149' },
      { num: '4', name: 'Telmar', cls: 'G', stats: 'MBW M:03 L:01', hp: 'H:0150 F:0149' },
    ];
    party.forEach((char, i) => {
      const baseY = i * 32;
      const hg = this.add.graphics().setDepth(30);
      hg.fillStyle(EGA_BLUE);
      hg.fillRect(PANEL_X, baseY, CHAR_W * PANEL_W_CHARS, CHAR_H);
      const headerText = `\x10${char.num}\x11`;
      const headerX =
        PANEL_X + Math.floor((PANEL_W_CHARS - headerText.length) / 2) * CHAR_W;
      writeText(this, headerText, headerX, baseY, EGA_CYAN);

      const nameCol = PANEL_W_CHARS - 1;
      const pad = Math.ceil((nameCol - char.name.length) / 2);
      const nameLine =
        char.name.padStart(char.name.length + pad).padEnd(nameCol) + char.cls;
      writeText(this, nameLine, PANEL_X, baseY + CHAR_H, EGA_WHITE);
      writeText(this, ` ${char.stats.padEnd(11)}`, PANEL_X, baseY + CHAR_H * 2, EGA_CYAN);
      writeText(this, ` ${char.hp.padEnd(11)}`, PANEL_X, baseY + CHAR_H * 3, EGA_CYAN);
    });
    const g = this.add.graphics().setDepth(30);
    g.fillStyle(EGA_BLUE);
    g.fillRect(PANEL_X, PARTY_H, CHAR_W * PANEL_W_CHARS, BORDER);
  }
}