import Phaser from 'phaser'

import MainMenuScene from './scenes/MainMenuScene.ts'
import WorldScene from './scenes/WorldScene.ts'

const config =
{
    type: Phaser.AUTO,
    width: 320,
    height: 192,
    backgroundColor: '#000000',
    pixelArt: true,
    zoom: 3,
    physics: {
        default: 'arcade',
        arcade: { debug: false}
    },
    scene: [ MainMenuScene, WorldScene ]
}

new Phaser.Game(config)