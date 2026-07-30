import Phaser from 'phaser'
import { InputService } from '../services/InputService'
import { OverworldView } from '../mapviews/OverworldView'
import { TownView } from '../mapviews/TownView'
import { ConflictView } from '../mapviews/ConflictView'
import type { MapView } from '../mapviews/MapView'
import { SOSARIA_LOCATIONS } from '../data/world-locations'
import type { LocationDef } from '../data/world-locations'

// ── Layout constants ──────────────────────────────────────────
const TILE      = 16
const CHAR_W    = 8
const CHAR_H    = 8
const BORDER    = 8
const VIEW_TILES = 11
const MAP_X     = BORDER
const MAP_Y     = BORDER
const MAP_PX    = VIEW_TILES * TILE              // 176
const PANEL_X   = MAP_X + MAP_PX + BORDER        // 192
const CANVAS_W  = 320
const CANVAS_H  = 192

const PARTY_H   = 128
const LOG_Y     = PARTY_H + 8
const LOG_ROWS  = 7

// ── EGA colours ───────────────────────────────────────────────
const EGA_CYAN  = 0x54fcfc
const EGA_WHITE = 0xfcfcfc
const EGA_BLUE  = 0x0000a8

// ── Charset helpers ───────────────────────────────────────────
function charFrame(ch: string): number { return ch.charCodeAt(0) }
const CHAR_ARROW_RIGHT = 16
const CHAR_ARROW_LEFT  = 17

export default class WorldScene extends Phaser.Scene {

    private activeView!:    MapView
    private inputService!:  InputService
    private pendingAttack = false
    private logLines:       Phaser.GameObjects.Image[][] = []
    private logMessages:    string[] = ["","","","","","",""]

    constructor() { super('world') }

    preload() {
        this.load.spritesheet('tiles', 'assets/sprites/shapes.png',  { frameWidth: 16, frameHeight: 16 })
        this.load.spritesheet('chars', 'assets/sprites/charset.png', { frameWidth: 16, frameHeight: 16 })

        // ── Overworld maps ────────────────────────────────────
        this.load.tilemapTiledJSON('map', 'assets/maps/worlds/world-sosaria.json')
        // this.load.tilemapTiledJSON('map', 'assets/maps/worlds/world-ambrosia.json')

        // ── Castle maps ───────────────────────────────────────
        this.load.tilemapTiledJSON('castle-british', 'assets/maps/castles/castle-british.json')
        this.load.tilemapTiledJSON('castle-exodus',  'assets/maps/castles/castle-exodus.json')

        // ── Town maps ─────────────────────────────────────────
        this.load.tilemapTiledJSON('town-lcb',      'assets/maps/towns/town-lcb.json')
        this.load.tilemapTiledJSON('town-moon',     'assets/maps/towns/town-moon.json')
        this.load.tilemapTiledJSON('town-dawn',     'assets/maps/towns/town-dawn.json')
        this.load.tilemapTiledJSON('town-death',    'assets/maps/towns/town-death.json')
        this.load.tilemapTiledJSON('town-devil-guard',    'assets/maps/towns/town-devil-guard.json')
        this.load.tilemapTiledJSON('town-fawn',     'assets/maps/towns/town-fawn.json')
        this.load.tilemapTiledJSON('town-grey',     'assets/maps/towns/town-grey.json')
        this.load.tilemapTiledJSON('town-montor_e', 'assets/maps/towns/town-montor_e.json')
        this.load.tilemapTiledJSON('town-montor_w', 'assets/maps/towns/town-montor_w.json')
        this.load.tilemapTiledJSON('town-yew',      'assets/maps/towns/town-yew.json')
        this.load.tilemapTiledJSON('conflict-grass', 'assets/maps/conflicts/conflict-grass.json')
    }

    async create() {
        const src = this.textures.get('chars').source[0]
        const img = src.image as HTMLImageElement
        this.textures.addSpriteSheet('chars', img, { frameWidth: 16, frameHeight: 16 })
        console.log('chars frameTotal:', this.textures.get('chars').frameTotal)

        this.drawBorder()
        this.drawMoonPhase()
        this.drawWindDirection()
        this.drawPartyPanel()
        this.drawLogPanel()

        await this.enterOverworld()

        this.inputService = new InputService(this)
        this.inputService.onMove(dir => this.handleMoveOrAttack(dir))
        this.inputService.onInteract(() => this.activeView.handleInteract())
        this.inputService.onAttack(() => this.startAttack())
        this.inputService.onCancel(() => this.cancelAttack())

        this.refreshLog()
    }

    update() {
        if (!this.inputService) return
        this.inputService.update()
    }
    private startAttack() {
        if (this.pendingAttack) return
        this.pendingAttack = true
        this.addLogMessage('Direction?')
    }

    private cancelAttack() {
        if (!this.pendingAttack) return
        this.pendingAttack = false
        this.addLogMessage('Attack cancelled')
    }

    private handleMoveOrAttack(direction: InputDirection) {
        if (this.pendingAttack) {
            this.pendingAttack = false
            this.activeView.handleAttack(direction)
            return
        }
        this.activeView.handleMove(direction)
    }
    // ── View transitions ──────────────────────────────────────

    private async enterOverworld(): Promise<void> {
        if (this.activeView) this.activeView.teardown()
        const view = new OverworldView(SOSARIA_LOCATIONS)
        await view.load(
            this,
            (msg) => this.addLogMessage(msg),
            (destination) => {
                if (destination) this.enterLocation(destination)
            },
            () => this.enterConflict(),
        )
        this.activeView = view
    }

    private async enterConflict(): Promise<void> {
        if (this.activeView) this.activeView.teardown()
        const view = new ConflictView()
        await view.load(
            this,
            (msg) => this.addLogMessage(msg),
            () => this.enterOverworld(),
        )
        this.activeView = view
    }

    private async enterLocation(def: LocationDef): Promise<void> {
        this.activeView.teardown()
        const view = new TownView()
        view.setLocation(def)
        await view.load(
            this,
            (msg) => this.addLogMessage(msg),
            () => this.enterOverworld()
        )
        this.activeView = view
    }

    // ─────────────────────────────────────────────────────────
    // Shell UI
    // ─────────────────────────────────────────────────────────

    private drawBorder() {
        const g = this.add.graphics()
        g.setDepth(2)
        g.fillStyle(EGA_BLUE)
        g.fillRect(0, 0, BORDER, CANVAS_H)
        g.fillRect(CANVAS_W - BORDER, 0, BORDER, (CHAR_H * 4) * 4 + BORDER)
        g.fillRect(0, 0, MAP_X + MAP_PX + BORDER, BORDER)
        g.fillRect(0, CANVAS_H - BORDER, MAP_X + MAP_PX + BORDER, BORDER)
        g.fillRect(MAP_X + MAP_PX, 0, BORDER, CANVAS_H)
    }

    private drawMoonPhase() {
        const text       = '\x10(0)(1)\x11'
        const mapCentreX = MAP_X + Math.floor(MAP_PX / 2)
        const startX     = mapCentreX - Math.floor(text.length * CHAR_W / 2)
        this.writeText(text, startX, 0, EGA_CYAN)
    }

    private drawWindDirection() {
        const text       = '\x10South Wind\x11'
        const mapCentreX = MAP_X + Math.floor(MAP_PX / 2)
        const startX     = mapCentreX - Math.floor(text.length * CHAR_W / 2)
        this.writeText(text, startX, CANVAS_H - CHAR_H, EGA_CYAN)
    }

    private drawPartyPanel() {
        const PANEL_W_CHARS = 15
        const party = [
            { num: '1', name: 'Gregory', cls: 'G', stats: 'MHF M:00 L:01', hp: 'H:0150 F:0149' },
            { num: '2', name: 'Bodur',   cls: 'G', stats: 'MDF M:00 L:01', hp: 'H:0150 F:0149' },
            { num: '3', name: 'Idris',   cls: 'G', stats: 'MBW M:03 L:01', hp: 'H:0150 F:0149' },
            { num: '4', name: 'Telmar',  cls: 'G', stats: 'MBW M:03 L:01', hp: 'H:0150 F:0149' },
        ]
        party.forEach((char, i) => {
            const baseY = i * 32
            const hg = this.add.graphics().setDepth(30)
            hg.fillStyle(EGA_BLUE)
            hg.fillRect(PANEL_X, baseY, CHAR_W * PANEL_W_CHARS, CHAR_H)
            const headerText = `\x10${char.num}\x11`
            const headerX    = PANEL_X + Math.floor((PANEL_W_CHARS - headerText.length) / 2) * CHAR_W
            this.writeText(headerText, headerX, baseY, EGA_CYAN)

            const nameCol  = PANEL_W_CHARS - 1
            const pad      = Math.ceil((nameCol - char.name.length) / 2)
            const nameLine = char.name.padStart(char.name.length + pad).padEnd(nameCol) + char.cls
            this.writeText(nameLine,                     PANEL_X, baseY + CHAR_H,     EGA_WHITE)
            this.writeText(` ${char.stats.padEnd(11)}`,  PANEL_X, baseY + CHAR_H * 2, EGA_CYAN)
            this.writeText(` ${char.hp.padEnd(11)}`,     PANEL_X, baseY + CHAR_H * 3, EGA_CYAN)
        })
        const g = this.add.graphics().setDepth(30)
        g.fillStyle(EGA_BLUE)
        g.fillRect(PANEL_X, PARTY_H, CHAR_W * PANEL_W_CHARS, BORDER)
    }

    private drawLogPanel() {
        for (let row = 0; row < LOG_ROWS; row++) {
            this.logLines[row] = []
            for (let col = 0; col < 15; col++) {
                const img = this.add.image(
                    PANEL_X + col * CHAR_W,
                    LOG_Y + row * CHAR_H,
                    'chars', 0
                )
                img.setOrigin(0, 0)
                img.setDisplaySize(CHAR_W, CHAR_H)
                img.setDepth(31)
                img.setTint(EGA_CYAN)
                img.setVisible(false)
                this.logLines[row][col] = img
            }
        }
    }

    public addLogMessage(msg: string) {
        this.logMessages.push(msg)
        if (this.logMessages.length > LOG_ROWS) {
            this.logMessages = this.logMessages.slice(-LOG_ROWS)
        }
        this.refreshLog()
    }

    private refreshLog() {
        this.logMessages.forEach((msg, row) => {
            const line = this.logLines[row]
            if (!line) return
            line[0].setFrame(CHAR_ARROW_RIGHT)
            line[0].setVisible(true)
            for (let col = 1; col < 15; col++) {
                const ch = msg[col - 1]
                if (ch) {
                    line[col].setFrame(charFrame(ch))
                    line[col].setVisible(true)
                } else {
                    line[col].setVisible(false)
                }
            }
        })
    }

    private writeText(text: string, x: number, y: number, tint: number) {
        for (let i = 0; i < text.length; i++) {
            const ch    = text[i]
            const frame = ch === '\x10' ? CHAR_ARROW_RIGHT
                        : ch === '\x11' ? CHAR_ARROW_LEFT
                        : charFrame(ch)
            const img = this.add.image(x + i * CHAR_W, y, 'chars', frame)
            img.setOrigin(0, 0)
            img.setDisplaySize(CHAR_W, CHAR_H)
            img.setDepth(31)
            img.setTint(tint)
        }
    }
}
