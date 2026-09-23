import Phaser from 'phaser';
import { EGA_CYAN } from './shell-layout';
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

    // TEMPORARY: proves shell-layout + bitmap-text work together. Remove in 12c.
    writeText(this, 'HELLO', 8, 8, EGA_CYAN);
  }
}