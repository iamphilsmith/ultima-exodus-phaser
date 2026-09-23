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
  LOG_Y,
  LOG_ROWS,
  EGA_BLUE,  
  EGA_CYAN,
  EGA_WHITE,
  CHAR_ARROW_RIGHT } from './shell-layout';
import { charFrame,writeText } from './bitmap-text';

export class WorldScene extends Phaser.Scene {
  private logLines: Phaser.GameObjects.Image[][] = [];
  private logMessages: string[] = ['', '', '', '', '', '', ''];

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
    this.drawLogPanel();
    this.refreshLog();

    // TEMPORARY: proves log scrolling. Remove once real logs land in Phase 3 step 20.
    let counter = 0;
    this.input.keyboard?.on('keydown-SPACE', () => {
      counter += 1;
      this.addLogMessage(`Test message ${counter}`);
    });
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

  private drawLogPanel(): void {
    for (let row = 0; row < LOG_ROWS; row++) {
      this.logLines[row] = [];
      for (let col = 0; col < 15; col++) {
        const img = this.add.image(
          PANEL_X + col * CHAR_W,
          LOG_Y + row * CHAR_H,
          'chars',
          0
        );
        img.setOrigin(0, 0);
        img.setDisplaySize(CHAR_W, CHAR_H);
        img.setDepth(31);
        img.setTint(EGA_CYAN);
        img.setVisible(false);
        this.logLines[row][col] = img;
      }
    }
  }

  public addLogMessage(msg: string): void {
    this.logMessages.push(msg);
    if (this.logMessages.length > LOG_ROWS) {
      this.logMessages = this.logMessages.slice(-LOG_ROWS);
    }
    this.refreshLog();
  }

  private refreshLog(): void {
    this.logMessages.forEach((msg, row) => {
      const line = this.logLines[row];
      if (!line) return;
      line[0].setFrame(CHAR_ARROW_RIGHT);
      line[0].setVisible(true);
      for (let col = 1; col < 15; col++) {
        const ch = msg[col - 1];
        if (ch) {
          line[col].setFrame(charFrame(ch));
          line[col].setVisible(true);
        } else {
          line[col].setVisible(false);
        }
      }
    });
  }
}