import Phaser from 'phaser'

// ── EGA colours (matches WorldScene) ──────────────────────────
const EGA_CYAN  = 0x54fcfc
const EGA_WHITE = 0xfcfcfc

const CANVAS_W = 320
const CANVAS_H = 192
const CHAR_W   = 8
const CHAR_H   = 8

function charFrame(ch: string): number {
    return ch.charCodeAt(0)
}

export default class MainMenuScene extends Phaser.Scene {

    constructor() { super('main-menu') }

    preload() {
        this.load.spritesheet('chars', 'assets/sprites/charset.png', { frameWidth: 16, frameHeight: 16 })
    }

    create() {
        // charset ships as 16x16 frames but is meant to display at 8x8 —
        // same quirk WorldScene works around.
        const src = this.textures.get('chars').source[0]
        const img = src.image as HTMLImageElement
        this.textures.addSpriteSheet('chars', img, { frameWidth: 16, frameHeight: 16 })

        this.cameras.main.setBackgroundColor('#000000')

        this.writeTextCentered('EXODUS', 12, EGA_WHITE, 3)

        this.writeTextCentered('From the depths of hell...', 56, EGA_CYAN)
        this.writeTextCentered('...he comes for VENGEANCE!', 66, EGA_CYAN)

        this.writeTextCentered('Option:\x1e', 92, EGA_WHITE)
        this.writeTextCentered('Return to the View', 106, EGA_CYAN)
        this.writeTextCentered('Organize a Party',   116, EGA_CYAN)
        this.writeTextCentered('Journey Onward',      126, EGA_CYAN)

        this.writeTextCentered('(C)-1983 By James R. Van Artsdalen', 160, EGA_WHITE)
        this.writeTextCentered('and Lord British',                   170, EGA_WHITE)

        this.input.keyboard!.on('keydown-R', () => this.selectReturn())
        this.input.keyboard!.on('keydown-O', () => this.selectOrganize())
        this.input.keyboard!.on('keydown-J', () => this.selectJourney())
    }

    // ── Option handlers ────────────────────────────────────────

    private selectReturn() {
        // TODO: implement "Return to the View" in a future step
    }

    private selectOrganize() {
        // TODO: implement "Organize a Party" in a future step
    }

    private selectJourney() {
        this.scene.start('world')
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
}