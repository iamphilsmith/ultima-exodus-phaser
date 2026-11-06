import { CreationLimits } from '../../services/hero-options';
import { FormStatus } from '../../services/roster';
import { NumericLineInput } from './numeric-line-input';

/** What the view must do after a key: nothing more, call the server, or go back to the menu. */
export type FormPartyOutcome = 'none' | 'submit' | 'menu';

export interface PositionRow {
    label: string;
    value: string;
    active: boolean;
}

const REFUSAL_MESSAGES: Record<Exclude<FormStatus, 'Formed'>, string> = {
    AlreadyFormed: 'A party is already formed',
    Duplicate: 'Each roster position must be different',
    EmptyEntry: 'One or more roster positions are empty',
};

/** The Form Party rules and key handling, with no drawing. */
export class FormPartyForm {
    private entries: (number | null)[];
    private currentIndex = 0;
    private _message = '';
    private done = false;
    private submitting = false;
    private submitRequested = false;
    private readonly input: NumericLineInput;

    constructor(private readonly limits: CreationLimits) {
        this.entries = new Array<number | null>(limits.partySize).fill(null);
        this.input = new NumericLineInput(2, (value) => this.confirmPosition(value));
    }

    /** The red message under the form (empty when there is none) */
    get message(): string {
        return this._message;
    }

    rows(): PositionRow[] {
        return this.entries.map((entry,i) => {
            const active = i === this.currentIndex && !this.done;
            const value = entry !== null 
                ? String(entry).padStart(2, '0')
                : active ? this.input.display : '';
            return { label: `Position ${i + 1}:`, value, active};
        });
    }

    /** The chosen roster entries in party order. Call only once all are chosen */
    toEntries(): number[] {
        return this.entries.filter((entry): entry is number => entry !== null);
    }

    handleKey(key: string): FormPartyOutcome {
        if (this.submitting) return 'none';     // a request is in flight: ignore everything
        if (this.done) return 'menu';           // any key leaves

        this.input.handleKey(key);

        if (this.submitRequested) {
            this.submitRequested = false;
            this.submitting = true;
            return 'submit';    
        }
        return 'none';
    }

    /** Show the server's answer. Also used on load when a party already exists */
    applyResult(status: FormStatus): void {
        this.submitting = false;
        this.done = true;

        if (status === 'Formed') {
            this._message = 'Party formed - press any key';
            return
        }
        this._message = REFUSAL_MESSAGES[status];
        this.reset();
    }

    submitFailed(): void {
        this.submitting = false;
        this.done = true;
        this._message = 'Failed to form party';
        this.reset();
    }

    private confirmPosition(value: number): void {
        const size = this.limits.rosterSize;
        if (value < 1 || value > size) {
            this._message = `Must be 01-${String(size).padStart(2, '0')}`;
            return;
        }
        if (this.entries.includes(value)) {
            this._message = 'Already selected';
            return;
        }
        this.entries[this.currentIndex] = value;
        this._message = '';
        this.currentIndex++;

        if (this.currentIndex === this.entries.length) {
            this.submitRequested = true;
        }
    }

    private reset(): void {
        this.entries = this.entries.map(() => null);
        this.currentIndex = 0;
    }
}
