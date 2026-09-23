import Phaser from 'phaser';
import { CHAR_W, CHAR_H, CHAR_ARROW_RIGHT, CHAR_ARROW_LEFT } from './shell-layout';

export function charFrame(ch: string): number {
  return ch.charCodeAt(0);
}

export function writeText(
  scene: Phaser.Scene,
  text: string,
  x: number,
  y: number,
  tint: number
): void {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const frame =
      ch === '\x10' ? CHAR_ARROW_RIGHT :
      ch === '\x11' ? CHAR_ARROW_LEFT :
      charFrame(ch);
    const img = scene.add.image(x + i * CHAR_W, y, 'chars', frame);
    img.setOrigin(0, 0);
    img.setDisplaySize(CHAR_W, CHAR_H);
    img.setDepth(31);
    img.setTint(tint);
  }
}