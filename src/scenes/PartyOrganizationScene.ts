// src/scenes/PartyOrganizationScene.ts
import Phaser from 'phaser'
import type { OrgView } from '../orgviews/OrgView'
import { OptionsMenuView } from '../orgviews/OptionsMenuView'
import { writeTextCentered } from '../ui/BitmapText'

const EGA_BLUE  = 0x0000a8
const EGA_WHITE = 0xfcfcfc

const CANVAS_W = 320
const CANVAS_H = 192
const BORDER   = 8

export default class PartyOrganizationScene extends Phaser.Scene {

    private currentView!: OrgView

    constructor() { super('organize-party') }

    preload() {
        this.load.spritesheet('chars', 'assets/sprites/charset.png', { frameWidth: 16, frameHeight: 16 })
    }

    create() {
        // charset ships as 16x16 frames but is meant to display at 8x8 —
        // same quirk WorldScene/MainMenuScene work around.
        const src = this.textures.get('chars').source[0]
        const img = src.image as HTMLImageElement
        this.textures.addSpriteSheet('chars', img, { frameWidth: 16, frameHeight: 16 })

        this.cameras.main.setBackgroundColor('#000000')

        this.drawBorder()
//        writeTextCentered(this, 'EXODUS', 10, EGA_WHITE, 2)

        this.switchView(new OptionsMenuView())
    }

    /** Sub-screens call this (via the callback passed to load()) to move between org views. */
    private switchView = (view: OrgView): void => {
        this.currentView?.teardown()
        this.currentView = view
        this.currentView.load(this, () => this.exitToMainMenu(), this.switchView)
    }

    private exitToMainMenu(): void {
        this.currentView.teardown()
        this.scene.start('main-menu')
    }

    private drawBorder(): void {
        const g = this.add.graphics()
        g.setDepth(2)
        g.fillStyle(EGA_BLUE)
        g.fillRect(0, 0, BORDER, CANVAS_H)                       // Left
        g.fillRect(0, 0, CANVAS_W, BORDER)                       // Top
        g.fillRect(0, CANVAS_H - BORDER, CANVAS_W, CANVAS_H)     // Bottom
        g.fillRect(CANVAS_W - BORDER, 0, CANVAS_W, CANVAS_H)     // Right
    }
}