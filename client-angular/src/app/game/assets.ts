import Phaser from 'phaser';

/** 
 * Load a 16x16 spritesheet unless an earlier scene already has. Textures are
 * shared by the whole game, so whichever scene starts first loads them and
 * later scenes (or a restart of the same scene) skip the load.
 */
export function loadSpritesheetOnce(scene: Phaser.Scene, key: string, url: string): void {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, url, { frameWidth: 16, frameHeight: 16 });
}
