// src/orgviews/RegisterView.ts
import Phaser from 'phaser'
import type { OrgView } from './OrgView'
import { writeText, writeTextCentered } from '../ui/BitmapText'
import { ROSTER_MAX_SIZE } from '../entities/hero'
import { trpc } from '../lib/trpc'

const EGA_GREEN = 0x54fc54
const EGA_CYAN  = 0x54fcfc
const EGA_WHITE = 0xfcfcfc

const ROW_X = 20
const ROW_START_Y = 30
const ROW_HEIGHT = 8

export class RegisterView implements OrgView {

    private scene!: Phaser.Scene
    private onExit!: () => void

    private images: Phaser.GameObjects.Image[] = []

    async load(scene: Phaser.Scene, onExit: () => void): Promise<void> {
        this.scene = scene
        this.onExit = onExit

        this.images.push(...writeTextCentered(scene, 'REGISTER', 18, EGA_GREEN))

        const roster = await trpc.hero.list.query()
        this.renderRoster(roster)

        scene.input.keyboard!.on('keydown', this.handleAnyKey)

    }

    teardown(): void {
        this.scene.input.keyboard!.off('keydown', this.handleAnyKey)
        this.images.forEach(img => img.destroy())
        this.images = []
    }

    private handleAnyKey = () => this.onExit()

    private renderRoster(roster: { slotIndex: number; hero: { name: string; race: string; class: string; level: number } | null }[]): void {
        for (let i = 0; i < ROSTER_MAX_SIZE; i++) {
            const entry = roster.find(r => r.slotIndex === i)
            const slotNum = String(i + 1).padStart(2, '0')
            const y = ROW_START_Y + i * ROW_HEIGHT

            const line = entry?.hero
                ? `${slotNum}  ${entry.hero.name.padEnd(12)} ${entry.hero.race.padEnd(8)} ${entry.hero.class.padEnd(10)} Lv${entry.hero.level}`
                : `${slotNum}  -- Empty --`

            const tint = entry?.hero ? EGA_CYAN : EGA_WHITE
            this.images.push(...writeText(this.scene, line, ROW_X, y, tint))
        }
    }
}