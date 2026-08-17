// src/orgviews/TerminateCharacterView.ts
import Phaser from 'phaser'
import type { OrgView } from './OrgView'
import { writeText, writeTextCentered } from '../ui/BitmapText'
import { NumericLineInput } from './input/NumericLineInput'
import { ROSTER_MAX_SIZE } from '../entities/hero'
import { OptionsMenuView } from './OptionsMenuView'
import { trpc } from '../lib/trpc'

const EGA_GREEN = 0x54fc54
const EGA_CYAN  = 0x54fcfc
const EGA_RED   = 0xfc5454
const EGA_WHITE = 0xfcfcfc

const LABEL_X = 24

export class TerminateCharacterView implements OrgView {

    private scene!: Phaser.Scene
    private switchView!: (view: OrgView) => void

    private images: Phaser.GameObjects.Image[] = []
    private statusMessage = ''
    private done = false

    private input = new NumericLineInput(2, (v) => this.confirmPosition(v))

    load(scene: Phaser.Scene, onExit: () => void, switchView: (view: OrgView) => void): void {
        this.scene = scene
        this.switchView = switchView

        scene.input.keyboard!.on('keydown', this.handleKeyDown)
        this.redraw()
    }

    teardown(): void {
        this.scene.input.keyboard!.off('keydown', this.handleKeyDown)
        this.images.forEach(img => img.destroy())
        this.images = []
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        if (this.done) {
            this.switchView(new OptionsMenuView())
            return
        }
        this.input.handleKey(event.key)
        this.redraw()
    }

    private async confirmPosition(value: number): Promise<void> {
        if (value < 1 || value > ROSTER_MAX_SIZE) {
            this.statusMessage = `Must be 01-${ROSTER_MAX_SIZE}`
            this.redraw()
            return
        }

        const result = await trpc.hero.terminate.mutate({ rosterSlot: value })
        const slotStr = String(value).padStart(2, '0')

        if (result.status === 'empty') {
            this.statusMessage = 'Register slot is already empty'
        } else if (result.status === 'in_party') {
            this.statusMessage = 'Can not terminate a character in the party'
        } else {
            this.statusMessage = `${slotStr} Terminated`
        }

        this.done = true
        this.redraw()
    }

    private redraw(): void {
        this.images.forEach(img => img.destroy())
        this.images = []

        this.images.push(...writeTextCentered(this.scene, 'TERMINATE A CHARACTER', 30, EGA_GREEN))

        if (!this.done) {
            this.images.push(...writeText(this.scene, `Register #: ${this.input.display}\x1e`, LABEL_X, 54, EGA_WHITE))
        }

        if (this.statusMessage) {
            this.images.push(...writeTextCentered(this.scene, this.statusMessage, 80, this.done ? EGA_RED : EGA_CYAN))
        }
    }
}