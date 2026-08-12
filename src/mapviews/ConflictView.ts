import Phaser from 'phaser'
import PartyAvatar from '../world/PartyAvatar'
import { InputDirection, DIRECTION_OFFSETS, DIRECTION_NAME } from '../services/InputDirection'
import type { MapView } from './MapView'

const TILE        = 16
const BORDER      = 8
const VIEW_TILES  = 11
const VIEW_RADIUS = 5
const MAP_X       = BORDER
const MAP_Y       = BORDER

import type { ConflictMapConfig } from '../data/conflict-maps'

export class ConflictView implements MapView {

    private scene!:          Phaser.Scene
    private addLogMessage!:  (msg: string) => void
    private onExit?:         () => void

    private partyAvatar!:           PartyAvatar
    private tileSprites:     Phaser.GameObjects.Image[][] = []
    private mapData!:        Phaser.Tilemaps.Tilemap
    private groundLayer!:    Phaser.Tilemaps.TilemapLayer
    private mapWidthTiles!:  number
    private mapHeightTiles!: number
    private moving =         false

    async load(
        scene: Phaser.Scene,
        addLogMessage: (msg: string) => void,
        onExit?: (destination?: LocationDef) => void,
        conflictMap?: ConflictMapConfig,
    ): Promise<void> {
        this.scene         = scene
        this.addLogMessage = addLogMessage
        this.onExit        = () => onExit?.()

        const mapConfig = conflictMap ?? { tilemapKey: 'conflict-grass', layerName: 'conflict-grass-layer', monsterIndex: 25 }
        this.mapData = scene.make.tilemap({ key: mapConfig.tilemapKey })
        const tileset = this.mapData.addTilesetImage(mapConfig.tilemapKey, 'tiles')
        if (!tileset) throw new Error('ConflictView: failed to load tileset')
        const layer = this.mapData.createLayer(mapConfig.layerName, tileset)
        if (!layer) throw new Error('ConflictView: failed to create layer')
        this.groundLayer = layer
        this.groundLayer.setVisible(false)
        this.mapWidthTiles  = this.mapData.width
        this.mapHeightTiles = this.mapData.height

        for (let row = 0; row < VIEW_TILES; row++) {
            this.tileSprites[row] = []
            for (let col = 0; col < VIEW_TILES; col++) {
                const img = scene.add.image(
                    MAP_X + col * TILE,
                    MAP_Y + row * TILE,
                    'tiles', 0
                )
                img.setOrigin(0, 0)
                img.setDepth(1)
                this.tileSprites[row][col] = img
            }
        }

        this.partyAvatar = new PartyAvatar(scene, VIEW_RADIUS, VIEW_RADIUS)
        scene.cameras.main.setScroll(0, 0)
        this.partyAvatar.sprite.setPosition(
            MAP_X + this.partyAvatar.worldX,
            MAP_Y + this.partyAvatar.worldY
        )
        this.partyAvatar.sprite.setDepth(10)

        this.refreshTiles()
    }

    async handleMove(direction: InputDirection): Promise<void> {
        if (this.moving) return

        const { dx: tileDX, dy: tileDY } = DIRECTION_OFFSETS[direction]
        const targetTileX = this.partyAvatar.tileX + tileDX
        const targetTileY = this.partyAvatar.tileY + tileDY

        if (
            targetTileX < 0 || targetTileX >= this.mapWidthTiles ||
            targetTileY < 0 || targetTileY >= this.mapHeightTiles
        ) {
            this.addLogMessage('Leaving...')
            this.onExit?.()
            return
        }

        if (!this.canMoveTo(targetTileX, targetTileY)) {
            this.addLogMessage(`${DIRECTION_NAME[direction]} BLK`)
            return
        }

        this.moving = true
        this.partyAvatar.tileX = targetTileX
        this.partyAvatar.tileY = targetTileY
        this.refreshTiles()

        this.scene.tweens.add({
            targets: this.partyAvatar.sprite,
            x: MAP_X + this.partyAvatar.worldX,
            y: MAP_Y + this.partyAvatar.worldY,
            duration: 60,
            onComplete: () => {
                this.partyAvatar.sprite.setPosition(MAP_X + this.partyAvatar.worldX, MAP_Y + this.partyAvatar.worldY)
                this.moving = false
                this.addLogMessage(DIRECTION_NAME[direction])
            }
        })
    }

    handleAttack(direction: InputDirection): void {
        this.addLogMessage('Nothing to attack')
    }

    handleInteract(): void {
        this.addLogMessage('Nothing here')
    }

    teardown(): void {
        this.tileSprites.forEach(row => row.forEach(img => img.destroy()))
        this.tileSprites = []
        this.groundLayer.destroy()
        this.mapData.destroy()
        this.partyAvatar.sprite.destroy()
    }

    private refreshTiles(): void {
        for (let row = 0; row < VIEW_TILES; row++) {
            for (let col = 0; col < VIEW_TILES; col++) {
                const sprite = this.tileSprites[row][col]
                const tile = this.groundLayer.getTileAt(col, row)
                if (tile) {
                    sprite.setFrame(tile.index - 1)
                    sprite.setAlpha(1)
                } else {
                    sprite.setAlpha(0)
                }
            }
        }
    }

    private canMoveTo(tileX: number, tileY: number): boolean {
        const tile = this.groundLayer.getTileAt(tileX, tileY)
        if (!tile) return false
        return !tile.properties.solid
    }
}
