import Phaser from 'phaser';
import {
  CHAR_W, CHAR_H, CHAR_ARROW_RIGHT, CHAR_ARROW_LEFT, centredStartX
} from './shell-layout';

export function charFrame(ch: string): number {
  return ch.charCodeAt(0);
}

function glyphFrame(ch: string): number {
  return ch === '\x10' ? CHAR_ARROW_RIGHT :
         ch === '\x11' ? CHAR_ARROW_LEFT :
         charFrame(ch);
}

function drawRun(
  scene: Phaser.Scene,
  text: string,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  tint: number,
  depth: number
): Phaser.GameObjects.Image[] {
  const images: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < text.length; i++) {
    const img = scene.add.image(x + i * cellW, y, 'chars', glyphFrame(text[i]));
    img.setOrigin(0, 0);
    img.setDisplaySize(cellW, cellH);
    img.setDepth(depth);
    img.setTint(tint);
    images.push(img);
  }
  return images;
}

/** Left-aligned text at (x, y). Destroy the returned images to clear or update it. */
export function writeText(
  scene: Phaser.Scene,
  text: string,
  x: number,
  y: number,
  tint: number,
  depth = 31
): Phaser.GameObjects.Image[] {
  return drawRun(scene, text, x, y, CHAR_W, CHAR_H, tint, depth);
}

/** Text centred horizontally on the canvas at height y. scale 2 draws 16x16 characters. */
export function writeTextCentered(
  scene: Phaser.Scene,
  text: string,
  y: number,
  tint: number,
  scale = 1,
  depth = 31
): Phaser.GameObjects.Image[] {
  return drawRun(
    scene, text, centredStartX(text.length, scale), y,
    CHAR_W * scale, CHAR_H * scale, tint, depth
  );
}