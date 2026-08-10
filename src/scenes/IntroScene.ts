import Phaser from 'phaser'
import { IntroView } from '../mapviews/IntroView'

// ── Layout constants ──────────────────────────────────────────
const TILES_W      = 19
const TILES_H      = 6
const CHAR_W    = 8
const CHAR_H    = 8
const BORDER    = 8
const VIEW_TILES = 16
const MAP_X     = BORDER
const MAP_PX    = VIEW_TILES * TILES_W              // 
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

export default class IntroScene extends Phaser.Scene {

    constructor() { super('intro') }

    // create() — actually construct and load the map view
    private introView = new IntroView()

    preload() {
        this.load.spritesheet('tiles', 'assets/sprites/shapes.png',  { frameWidth: 16, frameHeight: 16 })
        this.load.spritesheet('chars', 'assets/sprites/charset.png', { frameWidth: 16, frameHeight: 16 })

        // ── Intro map ────────────────────────────────────
        this.load.tilemapTiledJSON('world-intro', 'assets/maps/worlds/world-intro.json')

    }

    async create() {
        // charset ships as 16x16 frames but is meant to display at 8x8 —
        // same quirk WorldScene works around.
        const src = this.textures.get('chars').source[0]
        const img = src.image as HTMLImageElement
        this.textures.addSpriteSheet('chars', img, { frameWidth: 16, frameHeight: 16 })

        this.drawBorder()
        this.drawPressSpace()

        this.cameras.main.setBackgroundColor('#000000')

        await this.introView.load(this, () => {})

        this.writeTextCentered('EXODUS', 12, EGA_WHITE, 5)

        

        this.input.keyboard!.on('keydown-SPACE', () => this.selectMainMenu())
    }

    // ── Option handlers ────────────────────────────────────────

    private selectMainMenu() {
        this.scene.start('main-menu')
    }


    // ── Draw boarder ───────────────────────────────────────────

    private drawBorder() {
        const g = this.add.graphics()
        g.setDepth(2)
        g.fillStyle(EGA_BLUE)
        
        console.log("CANVAS_W: ", CANVAS_W, " CANVAS_H: ", CANVAS_H, " BORDER: ", BORDER, " MAP_X: ", MAP_X, " MAP_PX: ", MAP_PX)

        g.fillRect(0, 0, BORDER, CANVAS_H)                       // Left
        g.fillRect(0, 0, CANVAS_W, BORDER)                       // Top
        g.fillRect(0, CANVAS_H - BORDER, CANVAS_W, CANVAS_H)     // Bottom
        g.fillRect(CANVAS_W - BORDER, 0, CANVAS_W, CANVAS_H)     // Right

        var top_of_map = CANVAS_H - (2 * BORDER)  - (TILES_H * VIEW_TILES)
        g.fillRect(0, top_of_map, CANVAS_W, BORDER)       // Middle

    }

    private drawPressSpace() {
        const text       = '\x10PRESS  <SPACE>\x11'
        const mapCentreX = MAP_X + Math.floor(MAP_PX / 2)
        const startX     = mapCentreX - Math.floor(text.length * CHAR_W / 2)
        this.writeText(text, startX, CANVAS_H - CHAR_H, EGA_CYAN)
    }



    // ── Text helper ───────────────────────────────────────────

    private writeTextCentered(text: string, y: number, tint: number, scale = 1) {
        const w = CHAR_W * scale
        const h = CHAR_H * scale
        const startX = Math.floor((CANVAS_W - text.length * w) / 2)

        for (let i = 0; i < text.length; i++) {
            const ch    = text[i]
            const frame = charFrame(ch)
            const gimg = this.add.image(startX + i * w, y, 'chars', frame)
            gimg.setOrigin(0, 0)
            gimg.setDisplaySize(w, h)
            gimg.setTint(tint)
        }
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