// src/ui/BitmapText.ts
import Phaser from 'phaser'

const CHAR_W = 8
const CHAR_H = 8
const CANVAS_W = 320

function charFrame(ch: string): number {
    return ch.charCodeAt(0)
}

/** Writes text left-aligned at (x, y). Returns the images so callers can destroy() them to clear/update. */
export function writeText(
    scene: Phaser.Scene, text: string, x: number, y: number, tint: number, depth = 31
): Phaser.GameObjects.Image[] {
    const images: Phaser.GameObjects.Image[] = []
    for (let i = 0; i < text.length; i++) {
        const img = scene.add.image(x + i * CHAR_W, y, 'chars', charFrame(text[i]))
        img.setOrigin(0, 0)
        img.setDisplaySize(CHAR_W, CHAR_H)
        img.setDepth(depth)
        img.setTint(tint)
        images.push(img)
    }
    return images
}

/** Writes text horizontally centred on the 320px canvas at height y. */
export function writeTextCentered(
    scene: Phaser.Scene, text: string, y: number, tint: number, scale = 1, depth = 31
): Phaser.GameObjects.Image[] {
    const w = CHAR_W * scale
    const h = CHAR_H * scale
    const startX = Math.floor((CANVAS_W - text.length * w) / 2)
    const images: Phaser.GameObjects.Image[] = []
    for (let i = 0; i < text.length; i++) {
        const img = scene.add.image(startX + i * w, y, 'chars', charFrame(text[i]))
        img.setOrigin(0, 0)
        img.setDisplaySize(w, h)
        img.setDepth(depth)
        img.setTint(tint)
        images.push(img)
    }
    return images
}