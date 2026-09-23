import Phaser from 'phaser';

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

    // TEMPORARY: proves charset loads and slices correctly. Remove in 12b.
    this.add
      .image(8, 8, 'chars', 'A'.charCodeAt(0))
      .setOrigin(0, 0)
      .setDisplaySize(8, 8)
      .setTint(0x54fcfc);
  }
}