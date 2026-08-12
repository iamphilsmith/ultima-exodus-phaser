// src/orgviews/CreateCharacterView.ts
import Phaser from 'phaser'
import type { OrgView } from './OrgView'
import { writeText, writeTextCentered } from '../ui/BitmapText'
import { NumericLineInput } from './input/NumericLineInput'
import { TextLineInput } from './input/TextLineInput'
import { RACES, CLASSES, SEXES } from '../data/hero-options'
import type { Race, HeroClass, Sex } from '../data/hero-options'
import { CREATION_STAT_TOTAL, CREATION_STAT_MIN, CREATION_STAT_MAX, NAME_MAX_LENGTH, ROSTER_MAX_SIZE } from '../entities/hero'
import { OptionsMenuView } from './OptionsMenuView'
import { trpc } from '../lib/trpc'

const EGA_WHITE = 0xfcfcfc
const EGA_CYAN  = 0x54fcfc
const EGA_RED   = 0xfc5454
const EGA_GREEN = 0x54fc54

const LABEL_X = 24

enum Step {
    NAME, SEX, RACE, CLASS,
    STRENGTH, DEXTERITY, INTELLIGENCE, WISDOM,
    CONFIRM, DONE,
}

const STEP_ORDER: Step[] = [
    Step.NAME, Step.SEX, Step.RACE, Step.CLASS,
    Step.STRENGTH, Step.DEXTERITY, Step.INTELLIGENCE, Step.WISDOM,
    Step.CONFIRM,
]

type StatField = 'strength' | 'dexterity' | 'intelligence' | 'wisdom'

export class CreateCharacterView implements OrgView {

    private scene!: Phaser.Scene
    private onExit!: () => void
    private switchView!: (view: OrgView) => void

    private images: Phaser.GameObjects.Image[] = []

    private step = Step.NAME
    private rosterFull = false
    private nextSlot = 0
    private statusMessage = ''

    private nameInput         = new TextLineInput(NAME_MAX_LENGTH, (v) => this.confirmName(v))
    private strengthInput     = new NumericLineInput(2, (v) => this.confirmStat('strength', v))
    private dexterityInput    = new NumericLineInput(2, (v) => this.confirmStat('dexterity', v))
    private intelligenceInput = new NumericLineInput(2, (v) => this.confirmStat('intelligence', v))
    private wisdomInput       = new NumericLineInput(2, (v) => this.confirmStat('wisdom', v))

    private data = {
        name: '',
        sex: SEXES[0] as Sex,
        race: RACES[0] as Race,
        class: CLASSES[0] as HeroClass,
        strength: 0,
        dexterity: 0,
        intelligence: 0,
        wisdom: 0,
    }

    async load(scene: Phaser.Scene, onExit: () => void, switchView: (view: OrgView) => void): Promise<void> {
        this.scene = scene
        this.onExit = onExit
        this.switchView = switchView

        const roster = await trpc.hero.list.query()
        const usedSlots = new Set(roster.filter(r => r.hero).map(r => r.slotIndex))
        let slot = 0
        while (usedSlots.has(slot) && slot < ROSTER_MAX_SIZE) slot++
        this.rosterFull = slot >= ROSTER_MAX_SIZE
        this.nextSlot = slot

        scene.input.keyboard!.on('keydown', this.handleKeyDown)
        this.redraw()
    }

    teardown(): void {
        this.scene.input.keyboard!.off('keydown', this.handleKeyDown)
        this.clear()
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        if (this.rosterFull) {
            this.onExit()
            return
        }

        switch (this.step) {
            case Step.NAME:          this.nameInput.handleKey(event.key); break
            case Step.SEX:           this.handleCycle(event.key, SEXES, 'sex'); break
            case Step.RACE:          this.handleCycle(event.key, RACES, 'race'); break
            case Step.CLASS:         this.handleCycle(event.key, CLASSES, 'class'); break
            case Step.STRENGTH:      this.strengthInput.handleKey(event.key); break
            case Step.DEXTERITY:     this.dexterityInput.handleKey(event.key); break
            case Step.INTELLIGENCE:  this.intelligenceInput.handleKey(event.key); break
            case Step.WISDOM:        this.wisdomInput.handleKey(event.key); break
            case Step.CONFIRM:
                if (event.key === 'y' || event.key === 'Y' || event.key === 'Enter') { this.submit(); return }
                if (event.key === 'n' || event.key === 'N' || event.key === 'Escape') { this.switchView(new OptionsMenuView()); return }
                break
            case Step.DONE:
                this.switchView(new OptionsMenuView())
                return
        }

        this.redraw()
    }

    private handleCycle<T extends string>(key: string, options: readonly T[], field: 'sex' | 'race' | 'class'): void {
        const current = options.indexOf(this.data[field] as T)
        if (key === 'ArrowLeft') {
            this.data[field] = options[(current - 1 + options.length) % options.length] as never
        } else if (key === 'ArrowRight') {
            this.data[field] = options[(current + 1) % options.length] as never
        } else if (key === 'Enter') {
            this.advance()
        }
    }

    private confirmName(value: string): void {
        const trimmed = value.trim()
        if (trimmed.length === 0) {
            this.statusMessage = 'Name cannot be blank'
            return
        }
        this.data.name = trimmed
        this.statusMessage = ''
        this.advance()
    }

    private confirmStat(field: StatField, value: number): void {
        if (value < CREATION_STAT_MIN || value > CREATION_STAT_MAX) {
            this.statusMessage = `Must be ${CREATION_STAT_MIN}-${CREATION_STAT_MAX}`
            return
        }
        this.data[field] = value

        if (field === 'wisdom') {
            const total = this.data.strength + this.data.dexterity + this.data.intelligence + this.data.wisdom
            if (total !== CREATION_STAT_TOTAL) {
                this.statusMessage = `Total must be ${CREATION_STAT_TOTAL} (currently ${total}) — re-enter stats`
                this.data.strength = 0
                this.data.dexterity = 0
                this.data.intelligence = 0
                this.data.wisdom = 0
                this.step = Step.STRENGTH
                return
            }
        }

        this.statusMessage = ''
        this.advance()
    }

    private advance(): void {
        const idx = STEP_ORDER.indexOf(this.step)
        this.step = STEP_ORDER[idx + 1]
    }

    private async submit(): Promise<void> {
        try {
            await trpc.hero.create.mutate({ ...this.data })
            this.statusMessage = 'Character created — press any key'
            this.step = Step.DONE
        } catch (err) {
            this.statusMessage = 'Creation failed — check stats and try again'
            this.step = Step.STRENGTH
            console.error(err)
        }
        this.redraw()
    }

    private redraw(): void {
        this.clear()

        if (this.rosterFull) {
            this.images.push(...writeTextCentered(this.scene, 'Roster is full (20/20)', 80, EGA_RED))
            this.images.push(...writeTextCentered(this.scene, 'Press any key to return', 96, EGA_WHITE))
            return
        }

        const remaining = CREATION_STAT_TOTAL - (this.data.strength + this.data.dexterity + this.data.intelligence + this.data.wisdom)
        const entryNum = String(this.nextSlot + 1).padStart(2, '0')
        const pointsStr = String(Math.max(remaining, 0)).padStart(2, '0')

        this.images.push(...writeTextCentered(this.scene, `Entry#${entryNum}   Points:${pointsStr}`, 20, EGA_GREEN))

        const nameDisplay = this.step === Step.NAME && this.nameInput.display.length > 0
            ? this.nameInput.display
            : this.data.name

        this.images.push(...this.line('Name:',        nameDisplay,      Step.NAME, 34))
        this.images.push(...this.line('Sex:',         this.data.sex,    Step.SEX, 44))
        this.images.push(...this.line('Race:',        this.data.race,   Step.RACE, 54))
        this.images.push(...this.line('Type:',        this.data.class,  Step.CLASS, 64))
        this.images.push(...this.line('Strength:',     this.statDisplay('strength', this.strengthInput, Step.STRENGTH),         Step.STRENGTH, 78))
        this.images.push(...this.line('Dexterity:',    this.statDisplay('dexterity', this.dexterityInput, Step.DEXTERITY),       Step.DEXTERITY, 88))
        this.images.push(...this.line('Intelligence:', this.statDisplay('intelligence', this.intelligenceInput, Step.INTELLIGENCE), Step.INTELLIGENCE, 98))
        this.images.push(...this.line('Wisdom:',       this.statDisplay('wisdom', this.wisdomInput, Step.WISDOM),                Step.WISDOM, 108))

        if (this.step === Step.CONFIRM) {
            this.images.push(...writeTextCentered(this.scene, 'O.K.? (Y/N)\x1e', 126, EGA_WHITE))
        }

        if (this.statusMessage) {
            this.images.push(...writeTextCentered(this.scene, this.statusMessage, 150, EGA_RED))
        }
    }

    private statDisplay(field: StatField, input: NumericLineInput, forStep: Step): string {
        if (this.step === forStep && input.display.length > 0) return input.display
        return String(this.data[field])
    }

    private line(label: string, value: string, forStep: Step, y: number): Phaser.GameObjects.Image[] {
        const active = this.step === forStep
        const marker = active ? ' \x1e' : ''
        return writeText(this.scene, `${label} ${value}${marker}`, LABEL_X, y, active ? EGA_WHITE : EGA_CYAN)
    }

    private clear(): void {
        this.images.forEach(img => img.destroy())
        this.images = []
    }
}