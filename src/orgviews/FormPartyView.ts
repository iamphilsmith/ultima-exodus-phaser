// src/orgviews/FormPartyView.ts
import Phaser from 'phaser'
import type { OrgView } from './OrgView'
import { writeText, writeTextCentered } from '../ui/BitmapText'
import { NumericLineInput } from './input/NumericLineInput'
import { OptionsMenuView } from './OptionsMenuView'
import { trpc } from '../lib/trpc'

const EGA_GREEN = 0x54fc54
const EGA_CYAN  = 0x54fcfc
const EGA_RED   = 0xfc5454
const EGA_WHITE = 0xfcfcfc

const LABEL_X = 24

export class FormPartyView implements OrgView {

    private scene!: Phaser.Scene
    private onExit!: () => void
    private switchView!: (view: OrgView) => void

    private images: Phaser.GameObjects.Image[] = []

    private positions: (number | null)[] = [null, null, null, null]
    private currentIndex = 0
    private statusMessage = ''
    private done = false

    private input = new NumericLineInput(2, (v) => this.confirmPosition(v))

    async load(scene: Phaser.Scene, onExit: () => void, switchView: (view: OrgView) => void): Promise<void> {
        this.scene = scene
        this.onExit = onExit
        this.switchView = switchView

        const active = await trpc.party.getActive.query()
        if (active.length > 0) {
            this.statusMessage = 'A party is already formed'
            this.done = true
            this.redraw()
            scene.input.keyboard!.on('keydown', this.handleAnyKeyExit)
            return
        }

        scene.input.keyboard!.on('keydown', this.handleKeyDown)
        this.redraw()
    }

    teardown(): void {
        this.scene.input.keyboard!.off('keydown', this.handleKeyDown)
        this.scene.input.keyboard!.off('keydown', this.handleAnyKeyExit)
        this.images.forEach(img => img.destroy())
        this.images = []
    }

    private handleAnyKeyExit = () => this.onExit()

    private handleKeyDown = (event: KeyboardEvent) => {
        if (this.done) {
            this.switchView(new OptionsMenuView())
            return
        }
        this.input.handleKey(event.key)
        this.redraw()
    }

    private confirmPosition(value: number): void {
        if (value < 1 || value > 20) {
            this.statusMessage = 'Must be 01-20'
            return
        }
        if (this.positions.includes(value)) {
            this.statusMessage = 'Already selected'
            return
        }

        this.positions[this.currentIndex] = value
        this.statusMessage = ''
        this.currentIndex++

        if (this.currentIndex === 4) {
            this.submit()
        }
    }

    private async submit(): Promise<void> {
        try {
            await trpc.party.form.mutate({ rosterSlots: this.positions as number[] })
            this.statusMessage = 'Party formed — press any key'
        } catch (err) {
            this.statusMessage = err instanceof Error ? err.message : 'Failed to form party'
            this.positions = [null, null, null, null]
            this.currentIndex = 0
        }
        this.done = true
        this.redraw()
    }

    private redraw(): void {
        this.images.forEach(img => img.destroy())
        this.images = []

        this.images.push(...writeTextCentered(this.scene, 'FORM A PARTY', 30, EGA_GREEN))

        for (let i = 0; i < 4; i++) {
            const y = 54 + i * 12
            const active = i === this.currentIndex && !this.done
            const value = this.positions[i] !== null
                ? String(this.positions[i]).padStart(2, '0')
                : active
                    ? this.input.display
                    : ''
            const marker = active ? ' \x1e' : ''
            this.images.push(...writeText(this.scene, `Position ${i + 1}: ${value}${marker}`, LABEL_X, y, active ? EGA_WHITE : EGA_CYAN))
        }

        if (this.statusMessage) {
            this.images.push(...writeTextCentered(this.scene, this.statusMessage, 120, EGA_RED))
        }
    }
}