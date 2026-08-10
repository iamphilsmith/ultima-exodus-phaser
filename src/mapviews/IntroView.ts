import Phaser from 'phaser'
import type { MapView } from './MapView'
import type { InputDirection } from '../services/InputDirection'
import type { LocationDef } from '../data/world-locations'

const TILE          = 16
const BORDER        = 8
const VIEW_TILES_W  = 19
const VIEW_TILES_H  = 6
const MAP_X         = BORDER
// Must match the divider position computed in IntroScene.drawBorder()
const MAP_Y         = 88

export class IntroView implements MapView {

    private scene!:          Phaser.Scene
    private addLogMessage!:  (msg: string) => void
    private onExit?:         () => void

    private tileSprites: Phaser.GameObjects.Image[][] = []
    private mapData!:     Phaser.Tilemaps.Tilemap
    private groundLayer!: Phaser.Tilemaps.TilemapLayer

    async load(
        scene: Phaser.Scene,
        addLogMessage: (msg: string) => void,
        onExit?: (destination?: LocationDef) => void,
    ): Promise<void> {
        this.scene         = scene
        this.addLogMessage = addLogMessage
        this.onExit        = () => onExit?.()

        this.mapData = scene.make.tilemap({ key: 'world-intro' })

        const tileset = this.mapData.addTilesetImage('intro', 'tiles')
        if (!tileset) throw new Error('IntroView: failed to load tileset')

        const layer = this.mapData.createLayer('intro-layer', tileset)
        if (!layer) throw new Error('IntroView: failed to create layer')
        this.groundLayer = layer
        this.groundLayer.setVisible(false)

        for (let row = 0; row < VIEW_TILES_H; row++) {
            this.tileSprites[row] = []
            for (let col = 0; col < VIEW_TILES_W; col++) {
                const tile = this.groundLayer.getTileAt(col, row)
                const img = scene.add.image(
                    MAP_X + col * TILE,
                    MAP_Y + row * TILE,
                    'tiles',
                    tile ? tile.index - 1 : 0
                )
                img.setOrigin(0, 0)
                img.setDepth(1)
                if (!tile) img.setAlpha(0)
                this.tileSprites[row][col] = img
            }
        }
    }

    teardown(): void {
        this.tileSprites.forEach(row => row.forEach(img => img.destroy()))
        this.tileSprites = []
        this.groundLayer.destroy()
        this.mapData.destroy()
    }

    // Static backdrop — no player movement — but MapView requires these.
    async handleMove(_dir: InputDirection): Promise<void> {}
    handleAttack(_dir: InputDirection): void {}
    handleInteract(): void {}
}