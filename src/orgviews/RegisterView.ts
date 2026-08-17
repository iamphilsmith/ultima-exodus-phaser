// src/orgviews/RegisterView.ts
import Phaser from 'phaser'
import type { OrgView } from './OrgView'
import { writeText, writeTextCentered } from '../ui/BitmapText'
import { ROSTER_MAX_SIZE } from '../entities/hero'
import { RACE_INITIAL, CLASS_INITIAL, SEX_INITIAL } from '../data/hero-options'
import type { Race, HeroClass, Sex } from '../data/hero-options'
import { trpc } from '../lib/trpc'
import { OptionsMenuView } from './OptionsMenuView'

const EGA_GREEN       = 0x54fc54
const EGA_RED         = 0xfc5454
const EGA_BRIGHT_BLUE = 0x5454fc
const EGA_WHITE       = 0xfcfcfc

const ROW_X = 20
const ROW_START_Y = 22
const ROW_HEIGHT = 8

interface RosterHero {
    id: string
    name: string
    sex: Sex
    race: Race
    class: HeroClass
    level: number
}

export class RegisterView implements OrgView {

    private scene!: Phaser.Scene
    private onExit!: () => void
    private switchView!: (view: OrgView) => void

    private images: Phaser.GameObjects.Image[] = []

    async load(scene: Phaser.Scene, onExit: () => void, switchView: (view: OrgView) => void): Promise<void> {
        this.scene = scene
        this.onExit = onExit
        this.switchView = switchView

        this.images.push(...writeTextCentered(scene, 'REGISTER', 11, EGA_GREEN))

        const [roster, activeParty] = await Promise.all([
            trpc.hero.list.query(),
            trpc.party.getActive.query(),
        ])

        // heroId -> party position (1-4), for heroes currently in the party
        const partyPosition = new Map(activeParty.map(slot => [slot.heroId as string, slot.slotIndex + 1]))

        this.renderRoster(roster, partyPosition)

        scene.input.keyboard!.on('keydown', this.handleAnyKey)
    }

    teardown(): void {
        this.scene.input.keyboard!.off('keydown', this.handleAnyKey)
        this.images.forEach(img => img.destroy())
        this.images = []
    }

    //private handleAnyKey = () => this.onExit()
    private handleAnyKey = () => this.switchView(new OptionsMenuView())

    private renderRoster(
        roster: { slotIndex: number; hero: RosterHero | null }[],
        partyPosition: Map<string, number>,
    ): void {
        for (let i = 0; i < ROSTER_MAX_SIZE; i++) {
            const entry = roster.find(r => r.slotIndex === i)
            const slotNum = String(i + 1).padStart(2, '0')
            const y = ROW_START_Y + i * ROW_HEIGHT

            if (!entry?.hero) {
                this.images.push(...writeText(this.scene, `${slotNum}   -- Empty --`, ROW_X, y, EGA_WHITE))
                continue
            }

            const hero = entry.hero
            const partyNum = partyPosition.get(hero.id)
            const partyCol = partyNum ? String(partyNum) : ' '
            const initials = `${SEX_INITIAL[hero.sex]}${RACE_INITIAL[hero.race]}${CLASS_INITIAL[hero.class]}`

            const line = `${slotNum} ${partyCol} ${hero.name.padEnd(12)} ${initials}  L${hero.level.toString().padStart(2, '0')}`
            const tint = partyNum ? EGA_RED : EGA_BRIGHT_BLUE

            this.images.push(...writeText(this.scene, line, ROW_X, y, tint))
        }
    }
}