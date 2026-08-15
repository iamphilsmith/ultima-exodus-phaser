// src/orgviews/OptionsMenuView.ts
import Phaser from 'phaser'
import type { OrgView } from './OrgView'
import { CreateCharacterView } from './CreateCharacterView'
import { RegisterView } from './RegisterView'
import { writeTextCentered } from '../ui/BitmapText'
import { FormPartyView } from './FormPartyView'

const EGA_GREEN = 0x54fc54
const EGA_RED   = 0xfc5454
const EGA_CYAN  = 0x54fcfc
const EGA_WHITE = 0xfcfcfc

export class OptionsMenuView implements OrgView {

    private scene!: Phaser.Scene
    private onExit!: () => void
    private switchView!: (view: OrgView) => void

    private staticImages: Phaser.GameObjects.Image[] = []
    private statusImages: Phaser.GameObjects.Image[] = []

    load(scene: Phaser.Scene, onExit: () => void, switchView: (view: OrgView) => void): void {
        this.scene  = scene
        this.onExit = onExit
        this.switchView = switchView

        this.staticImages.push(
            ...writeTextCentered(scene, 'PARTY ORGANIZATION',      34, EGA_GREEN),
            ...writeTextCentered(scene, 'OPTIONS:',                 48, EGA_RED),
            ...writeTextCentered(scene, 'Examine the register',     66, EGA_CYAN),
            ...writeTextCentered(scene, 'Create a character',       76, EGA_CYAN),
            ...writeTextCentered(scene, 'Form a party',             86, EGA_CYAN),
            ...writeTextCentered(scene, 'Disperse a Party',         96, EGA_CYAN),
            ...writeTextCentered(scene, 'Terminate a character',   106, EGA_CYAN),
            ...writeTextCentered(scene, 'Main  menu',               122, EGA_WHITE),
        )

        scene.input.keyboard!.on('keydown-E', this.handleExamine)
        scene.input.keyboard!.on('keydown-C', this.handleCreate)
        scene.input.keyboard!.on('keydown-F', this.handleForm)
        scene.input.keyboard!.on('keydown-D', this.handleDisperse)
        scene.input.keyboard!.on('keydown-T', this.handleTerminate)
        scene.input.keyboard!.on('keydown-M', this.handleMainMenu)
    }

    teardown(): void {
        this.scene.input.keyboard!.off('keydown-E', this.handleExamine)
        this.scene.input.keyboard!.off('keydown-C', this.handleCreate)
        this.scene.input.keyboard!.off('keydown-F', this.handleForm)
        this.scene.input.keyboard!.off('keydown-D', this.handleDisperse)
        this.scene.input.keyboard!.off('keydown-T', this.handleTerminate)
        this.scene.input.keyboard!.off('keydown-M', this.handleMainMenu)

        this.staticImages.forEach(img => img.destroy())
        this.staticImages = []
        this.clearStatus()
    }

    private handleExamine   = () => this.switchView(new RegisterView())
    private handleCreate    = () => this.switchView(new CreateCharacterView())
    private handleForm      = () => this.switchView(new FormPartyView())
    private handleDisperse  = () => this.showStub()
    private handleTerminate = () => this.showStub()
    private handleMainMenu  = () => this.onExit()

    private showStub(): void {
        this.clearStatus()
        this.statusImages = writeTextCentered(this.scene, 'Not yet implemented', 150, EGA_WHITE)
    }

    private clearStatus(): void {
        this.statusImages.forEach(img => img.destroy())
        this.statusImages = []
    }
}