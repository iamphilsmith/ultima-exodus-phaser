import { CreateHeroRequest } from '../../services/roster';
import { HeroOption, HeroOptionsData } from '../../services/hero-options';
import { NumericLineInput } from './numeric-line-input';
import { TextLineInput } from './text-line-input';

export type CreateStep =
    'name' | 'sex' | 'race' | 'class' |
    'strength' | 'dexterity' | 'intelligence' | 'wisdom' |
    'confirm' | 'done';

export type StatField = 'strength' | 'dexterity' | 'intelligence' | 'wisdom';
type CycleField = 'sex' | 'race' | 'class';

/** What the view must do after a key: nothing more, call the server, or go back to the menu. */
export type FormOutcome = 'none' | 'submit' | 'menu';

export interface FormLine {
    label: string;
    value: string;
    active: boolean;
}

interface FormData extends Record<StatField, number> {
    name: string;
    sex: string;
    race: string;
    class: string;
}

const STEP_ORDER: CreateStep[] = [
    'name', 'sex', 'race', 'class',
    'strength', 'dexterity', 'intelligence', 'wisdom',
    'confirm',
];

const STAT_FIELDS: StatField[] = ['strength', 'dexterity', 'intelligence', 'wisdom'];

function isStat(step: CreateStep): step is StatField {
    return (STAT_FIELDS as string[]).includes(step);
}

/** The Create Character rules and key handling, with no drawing. */
export class CreateCharacterForm {
    private _step: CreateStep = 'name';
    private _statusLines: string[] = [];
    private submitting = false;
    private data: FormData;
    private readonly nameInput: TextLineInput;
    private readonly statInputs: Record<StatField, NumericLineInput>;

    /** entry is the 1-20 roster entry the new hero will take. */
    constructor(
        private readonly options: HeroOptionsData,
        private readonly entry: number,
    ) {
        this.data = {
            name: '',
            sex: options.sexes[0].name,
            race: options.races[0].name,
            class: options.classes[0].name,
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            wisdom: 0,
        };
        this.nameInput = new TextLineInput(options.limits.maxNameLength, (v) => this.confirmName(v));
        this.statInputs = {
            strength: new NumericLineInput(2, (v) => this.confirmStat('strength', v)),
            dexterity: new NumericLineInput(2, (v) => this.confirmStat('dexterity', v)),
            intelligence: new NumericLineInput(2, (v) => this.confirmStat('intelligence', v)),
            wisdom: new NumericLineInput(2, (v) => this.confirmStat('wisdom', v)),
        };
    }

    get step(): CreateStep {
        return this._step;
    }

    /** Red message lines under the form (may be empty). */
    get statusLines(): readonly string[] {
        return this._statusLines;
    }

    get header(): string {
        const entry = String(this.entry).padStart(2, '0');
        const points = String(Math.max(this.pointsRemaining, 0)).padStart(2, '0');
        return `Entry#${entry}   Points:${points}`;
    }

    get prompt(): string | null {
        return this._step === 'confirm' ? 'O.K.? (Y/N)\x1e' : null;
    }

    private get pointsRemaining(): number {
        const { strength, dexterity, intelligence, wisdom } = this.data;
        return this.options.limits.statTotal - (strength + dexterity + intelligence + wisdom);
    }

    /** The eight data lines, top to bottom. */
    lines(): FormLine[] {
        const typedName = this._step === 'name' && this.nameInput.display.length > 0
            ? this.nameInput.display
            : this.data.name;

        const stat = (field: StatField) => {
            const input = this.statInputs[field];
            return this._step === field && input.display.length > 0
                ? input.display
                : String(this.data[field]);
        };

        return [
            { label: 'Name:', value: typedName, active: this._step === 'name' },
            { label: 'Sex:', value: this.data.sex, active: this._step === 'sex' },
            { label: 'Race:', value: this.data.race, active: this._step === 'race' },
            { label: 'Type:', value: this.data.class, active: this._step === 'class' },
            { label: 'Strength:', value: stat('strength'), active: this._step === 'strength' },
            { label: 'Dexterity:', value: stat('dexterity'), active: this._step === 'dexterity' },
            { label: 'Intelligence:', value: stat('intelligence'), active: this._step === 'intelligence' },
            { label: 'Wisdom:', value: stat('wisdom'), active: this._step === 'wisdom' },
        ];
    }

    handleKey(key: string): FormOutcome {
        if (this.submitting) return 'none';   // a request is in flight: ignore everything

        const step = this._step;
        if (step === 'name') {
            this.nameInput.handleKey(key);
        } else if (step === 'sex') {
            this.cycle(key, this.options.sexes, 'sex');
        } else if (step === 'race') {
            this.cycle(key, this.options.races, 'race');
        } else if (step === 'class') {
            this.cycle(key, this.options.classes, 'class');
        } else if (isStat(step)) {
            this.statInputs[step].handleKey(key);
        } else if (step === 'confirm') {
            if (key === 'y' || key === 'Y' || key === 'Enter') {
                this.submitting = true;
                return 'submit';
            }
            if (key === 'n' || key === 'N' || key === 'Escape') return 'menu';
        } else {
            return 'menu';   // 'done': any key leaves
        }
        return 'none';
    }

    toRequest(): CreateHeroRequest {
        return { ...this.data };
    }

    submitSucceeded(): void {
        this.submitting = false;
        this._statusLines = ['Character created - press any key'];
        this._step = 'done';
    }

    /** The server answered that the roster filled up in the meantime. */
    submitRosterFull(): void {
        this.submitting = false;
        this._statusLines = ['Roster is full'];
        this._step = 'done';
    }

    submitFailed(): void {
        this.submitting = false;
        this._statusLines = ['Creation failed', 'Check stats and try again'];
        this._step = 'strength';
    }

    private cycle(key: string, list: HeroOption[], field: CycleField): void {
        const names = list.map(option => option.name);
        const current = names.indexOf(this.data[field]);

        if (key === 'ArrowLeft') {
            this.data[field] = names[(current - 1 + names.length) % names.length];
        } else if (key === 'ArrowRight') {
            this.data[field] = names[(current + 1) % names.length];
        } else if (key === 'Enter') {
            this.advance();
        }
    }

    private confirmName(value: string): void {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            this._statusLines = ['Name cannot be blank'];
            return;
        }
        this.data.name = trimmed;
        this._statusLines = [];
        this.advance();
    }

    private confirmStat(field: StatField, value: number): void {
        const { minStat, maxStat, statTotal } = this.options.limits;
        if (value < minStat || value > maxStat) {
            this._statusLines = [`Must be ${minStat}-${maxStat}`];
            return;
        }
        this.data[field] = value;

        if (field === 'wisdom') {
            const total = STAT_FIELDS.reduce((sum, f) => sum + this.data[f], 0);
            if (total !== statTotal) {
                this._statusLines = [
                    `Total must be ${statTotal} (currently ${total})`,
                    'Re-enter stats',
                ];
                STAT_FIELDS.forEach(f => (this.data[f] = 0));
                this._step = 'strength';
                return;
            }
        }

        this._statusLines = [];
        this.advance();
    }

    private advance(): void {
        this._step = STEP_ORDER[STEP_ORDER.indexOf(this._step) + 1];
    }
}