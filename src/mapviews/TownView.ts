import Phaser from 'phaser'
import Hero from '../entities/Hero'
import { InputDirection, DIRECTION_OFFSETS, DIRECTION_NAME } from '../services/InputDirection'
import type { MapView } from './MapView'
import type { LocationDef } from '../data/world-locations'

const TILE        = 16
const BORDER      = 8
const VIEW_TILES  = 11
const VIEW_RADIUS = 5
const MAP_X       = BORDER
const MAP_Y       = BORDER

export class TownView implements MapView {

    private scene!:          Phaser.Scene
    private addLogMessage!:  (msg: string) => void
    private onExit!:         () => void
    private def!:            LocationDef

    private hero!:           Hero
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
    ): Promise<void> {
        // TownView never passes a destination upward — exiting always returns
        // to the overworld. Wrap onExit so WorldScene.enterLocation signature
        // is satisfied without TownView needing to know about LocationDef.
        this.scene         = scene
        this.addLogMessage = addLogMessage
        this.onExit        = onExit ? () => onExit(undefined) : () => {}

        // def must be set via setLocation() before load() is called.
        // WorldScene does this immediately after construction.
        if (!this.def) throw new Error('TownView: setLocation() must be called before load()')

        console.log(`TownView: loading location '${this.def.id}'`)
        this.mapData = scene.make.tilemap({ key: this.def.tilemapKey })
        console.log(`TownView: map size is ${this.mapData.width}×${this.mapData.height} tiles`)
        const tileset = this.mapData.addTilesetImage(this.def.tilesetName, 'tiles')
        console.log(`TownView: loaded tileset '${this.def.tilesetName}' with tile size ${tileset.tileWidth}×${tileset.tileHeight}`)
        if (!tileset) throw new Error(`TownView: failed to load tileset '${this.def.tilesetName}'`)
        const layer = this.mapData.createLayer(this.def.layerName, tileset)
        if (!layer) throw new Error(`TownView: failed to create layer '${this.def.layerName}'`)
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

        this.hero = new Hero(scene, this.def.entryTileX, this.def.entryTileY)
        scene.cameras.main.setScroll(0, 0)
        this.hero.sprite.setPosition(
            MAP_X + VIEW_RADIUS * TILE + TILE / 2,
            MAP_Y + VIEW_RADIUS * TILE + TILE / 2
        )
        this.hero.sprite.setDepth(10)

        this.addLogMessage(this.def.enterMsg)
        this.refreshTiles()
    }

    /** Must be called before load(). WorldScene passes the LocationDef here. */
    setLocation(def: LocationDef): this {
        this.def = def
        return this
    }

    async handleMove(direction: InputDirection): Promise<void> {
        if (this.moving) return

        const { dx: tileDX, dy: tileDY } = DIRECTION_OFFSETS[direction]
        const targetTileX = this.hero.tileX + tileDX
        const targetTileY = this.hero.tileY + tileDY

        // Off any edge = exit back to overworld
        if (
            targetTileX < 0 || targetTileX >= this.mapWidthTiles ||
            targetTileY < 0 || targetTileY >= this.mapHeightTiles
        ) {
            this.addLogMessage('Leaving...')
            this.onExit()
            return
        }

        if (!this.canMoveTo(targetTileX, targetTileY)) {
            this.addLogMessage(`${DIRECTION_NAME[direction]} BLK`)
            return
        }

        const centerX = MAP_X + VIEW_RADIUS * TILE + TILE / 2
        const centerY = MAP_Y + VIEW_RADIUS * TILE + TILE / 2

        this.moving = true
        this.hero.tileX = targetTileX
        this.hero.tileY = targetTileY
        this.refreshTiles()

        this.scene.tweens.add({
            targets: this.hero.sprite,
            x: centerX + tileDX * 4,
            y: centerY + tileDY * 4,
            duration: 60,
            yoyo: true,
            onComplete: () => {
                this.hero.sprite.setPosition(centerX, centerY)
                this.moving = false
                this.addLogMessage(DIRECTION_NAME[direction])
            }
        })
    }

    handleInteract(): void {
        // TODO: NPC interaction, shop entry, etc.
        this.addLogMessage('Nothing here')
    }

    teardown(): void {
        this.tileSprites.forEach(row => row.forEach(img => img.destroy()))
        this.tileSprites = []
        this.groundLayer.destroy()
        this.mapData.destroy()
        this.hero.sprite.destroy()
    }

    private refreshTiles(): void {
        for (let row = 0; row < VIEW_TILES; row++) {
            for (let col = 0; col < VIEW_TILES; col++) {
                const mapX = this.hero.tileX - VIEW_RADIUS + col
                const mapY = this.hero.tileY - VIEW_RADIUS + row
                const sprite = this.tileSprites[row][col]
                if (
                    mapX < 0 || mapX >= this.mapWidthTiles ||
                    mapY < 0 || mapY >= this.mapHeightTiles
                ) {
                    sprite.setAlpha(0)
                } else {
                    const tile = this.groundLayer.getTileAt(mapX, mapY)
                    if (tile) {
                        sprite.setFrame(tile.index - 1)
                        sprite.setAlpha(1)
                    }
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
