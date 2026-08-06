import Phaser from 'phaser'
import Hero from '../entities/Hero'
import { trpc } from '../lib/trpc'
import { InputDirection, DIRECTION_OFFSETS, DIRECTION_NAME } from '../services/InputDirection'
import type { ConflictMapConfig } from '../data/conflict-maps'
import { getConflictMapForMonsterIndex } from '../data/conflict-maps'
import type { MapView } from './MapView'
import type { LocationDef, WorldTileEntry } from '../data/world-locations'

const TILE        = 16
const BORDER      = 8
const VIEW_TILES  = 11
const VIEW_RADIUS = 5
const MAP_X       = BORDER
const MAP_Y       = BORDER

const EGA_BLACK = 0x000000

export class OverworldView implements MapView {

    private scene!:          Phaser.Scene
    private addLogMessage!:  (msg: string) => void
    private onExit?:         (destination?: LocationDef) => void
    private onConflict?:     (conflictMap?: ConflictMapConfig) => void

    // Location table for this world — passed in from WorldScene at construction.
    // OverworldView looks up the hero's tile position here on every interact.
    private locations:       WorldTileEntry[]

    private hero!:           Hero
    private tileSprites:     Phaser.GameObjects.Image[][] = []
    private mapData!:        Phaser.Tilemaps.Tilemap
    private groundLayer!:    Phaser.Tilemaps.TilemapLayer
    private mapWidthTiles!:  number
    private mapHeightTiles!: number
    private fogGraphics!:    Phaser.GameObjects.Graphics
    private moving =         false

    constructor(locations: WorldTileEntry[]) {
        this.locations = locations
    }

    async load(
        scene: Phaser.Scene,
        addLogMessage: (msg: string) => void,
        onExit?: (destination?: LocationDef) => void,
        onConflict?: (conflictMap?: ConflictMapConfig) => void,
    ): Promise<void> {
        this.scene         = scene
        this.addLogMessage = addLogMessage
        this.onExit        = onExit
        this.onConflict    = onConflict

        this.mapData = scene.make.tilemap({ key: 'map' })
        const tileset = this.mapData.addTilesetImage('sosaria', 'tiles')
        if (!tileset) throw new Error('OverworldView: failed to load tileset')
        const layer = this.mapData.createLayer('sosaria-layer', tileset)
        if (!layer) throw new Error('OverworldView: failed to create layer')
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

        this.fogGraphics = scene.add.graphics()
        this.fogGraphics.setDepth(5)

        const saved = await trpc.hero.load.query()
        this.hero = saved
            ? new Hero(scene, saved.tileX, saved.tileY)
            : new Hero(scene, 5, 5)

        scene.cameras.main.setScroll(0, 0)
        this.hero.sprite.setPosition(
            MAP_X + VIEW_RADIUS * TILE + TILE / 2,
            MAP_Y + VIEW_RADIUS * TILE + TILE / 2
        )
        this.hero.sprite.setDepth(10)

        this.refreshTiles()
    }

    async handleMove(direction: InputDirection): Promise<void> {
        if (this.moving) return

        const { dx: tileDX, dy: tileDY } = DIRECTION_OFFSETS[direction]
        const targetTileX = (this.hero.tileX + tileDX + this.mapWidthTiles)  % this.mapWidthTiles
        const targetTileY = (this.hero.tileY + tileDY + this.mapHeightTiles) % this.mapHeightTiles

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
                trpc.hero.save.mutate({
                    tileX: this.hero.tileX,
                    tileY: this.hero.tileY,
                    mapId: 'world',
                }).catch(err => console.error('Save failed', err))
            }
        })
    }

    handleAttack(direction: InputDirection): void {
        const { dx: tileDX, dy: tileDY } = DIRECTION_OFFSETS[direction]
        const targetTileX = (this.hero.tileX + tileDX + this.mapWidthTiles) % this.mapWidthTiles
        const targetTileY = (this.hero.tileY + tileDY + this.mapHeightTiles) % this.mapHeightTiles
        const tile = this.groundLayer.getTileAt(targetTileX, targetTileY)
        const conflictMap = tile ? getConflictMapForMonsterIndex(tile.index) : undefined

        if (conflictMap) {
            this.addLogMessage('Conflict')
            this.onConflict?.(conflictMap)
        } else {
            this.addLogMessage('Nothing to attack')
        }
    }

    handleInteract(): void {
        // Look up the hero's current tile position in the location table.
        // This replaces the old hardcoded tile-index check and works for
        // towns, castles, and shrines without any further branching here.
        const entry = this.locations.find(
            e => e.tileX === this.hero.tileX && e.tileY === this.hero.tileY
        )

        if (entry) {
            this.addLogMessage(entry.location.enterMsg)
            this.onExit?.(entry.location)
        } else {
            // Debug helper: log hero position so you can fill in world-locations.ts
            this.addLogMessage(`[${this.hero.tileX},${this.hero.tileY}]`)
        }
    }

    teardown(): void {
        this.tileSprites.forEach(row => row.forEach(img => img.destroy()))
        this.tileSprites = []
        this.fogGraphics.destroy()
        this.groundLayer.destroy()
        this.mapData.destroy()
        this.hero.sprite.destroy()
    }

    private refreshTiles(): void {
        for (let row = 0; row < VIEW_TILES; row++) {
            for (let col = 0; col < VIEW_TILES; col++) {
                const mapX = ((this.hero.tileX - VIEW_RADIUS + col) % this.mapWidthTiles  + this.mapWidthTiles)  % this.mapWidthTiles
                const mapY = ((this.hero.tileY - VIEW_RADIUS + row) % this.mapHeightTiles + this.mapHeightTiles) % this.mapHeightTiles
                const tile = this.groundLayer.getTileAt(mapX, mapY)
                if (tile) this.tileSprites[row][col].setFrame(tile.index - 1)
            }
        }
        this.renderFog()
    }

    private canMoveTo(tileX: number, tileY: number): boolean {
        const tile = this.groundLayer.getTileAt(tileX, tileY)
        if (!tile) return false
        return !tile.properties.solid
    }

    private renderFog(): void {
        this.fogGraphics.clear()
        for (let row = 0; row < VIEW_TILES; row++) {
            for (let col = 0; col < VIEW_TILES; col++) {
                const offsetX = col - VIEW_RADIUS
                const offsetY = row - VIEW_RADIUS
                if (!this.canSeeTile(0, 0, offsetX, offsetY)) {
                    this.fogGraphics.fillStyle(EGA_BLACK, 0.9)
                    this.fogGraphics.fillRect(MAP_X + col * TILE, MAP_Y + row * TILE, TILE, TILE)
                }
            }
        }
    }

    private canSeeTile(startX: number, startY: number, endX: number, endY: number): boolean {
        const dx    = endX - startX
        const dy    = endY - startY
        const steps = Math.max(Math.abs(dx), Math.abs(dy))
        if (steps === 0) return true
        const stepX = dx / steps
        const stepY = dy / steps
        let cx = startX
        let cy = startY
        for (let i = 0; i < steps; i++) {
            cx += stepX
            cy += stepY
            const mapX = ((this.hero.tileX + Math.floor(cx)) % this.mapWidthTiles  + this.mapWidthTiles)  % this.mapWidthTiles
            const mapY = ((this.hero.tileY + Math.floor(cy)) % this.mapHeightTiles + this.mapHeightTiles) % this.mapHeightTiles
            const tile = this.groundLayer.getTileAt(mapX, mapY)
            if (!tile) return false
            const isDest = Math.floor(cx) === endX && Math.floor(cy) === endY
            if (tile.properties['vision-blocking'] && !isDest) return false
        }
        return true
    }
}
