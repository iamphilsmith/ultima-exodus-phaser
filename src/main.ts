import Phaser from 'phaser'

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
    scene: [ WorldScene ]
}

new Phaser.Game(config)

