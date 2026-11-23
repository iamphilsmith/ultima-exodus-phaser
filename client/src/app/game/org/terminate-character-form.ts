import { CreationLimits } from '../../services/hero-options';
import { TerminateStatus } from '../../services/roster';
import { NumericLineInput } from './numeric-line-input';

/** What the view must do after a key: nothing more, call the server, or go back to the menu */
export type TerminateOutcome = 'none' | 'submit' | 'menu';

/** A hint ("Must be 01-20") is shown in cyan; a result from the server in red. */
export type MessageKind = 'hint' | 'result';

/** The Terminate Character rules and key handling, with no drawing */
export class TerminateCharacterForm {
    private _messageLines: string[] = [];
    private _messageKind: MessageKind = 'hint';
    private done: boolean = false;
    private submitting = false;
    private submitRequested = false;
    private pending = 0;
    private readonly input: NumericLineInput;

    constructor(private readonly limits: CreationLimits) {
        this.input = new NumericLineInput(2, (value) => this.confirmEntry(value));
    }

    get messageLines(): string[] {
        return this._messageLines;
    }
    
    get messageKind(): MessageKind {
        return this._messageKind;
    }

    /** The input line, or null once the anser is showing. */
    get prompt(): string | null {
        return this.done ? null : `Register #: ${this.input.display}\x1e`;
    }

    /** The roster entry (1-20) to send to the server after a 'submit' outcome. */
    get pendingEntry(): number {
        return this.pending;
    }

    handleKey(key: string): TerminateOutcome {
        if (this.submitting) return 'none';     // a request is in flight: ignore input
        if (this.done) return 'menu';           // any key leaves

        this.input.handleKey(key);
        
        if (this.submitRequested) {
            this.submitting = true;
            this.submitRequested = false;
            return 'submit';
        }
        return 'none';
    }

    applyResult(status: TerminateStatus): void {
        this.submitting = false;
        this.done = true;
        this._messageKind = 'result';

        if (status === 'Empty') {
            this._messageLines = ['Register slot is already empty'];
        } else if (status === 'InParty') {
            this._messageLines = ['Can not terminate a character', 'in the party'];
        } else {
            this._messageLines = [`${String(this.pending).padStart(2, '0')} Terminated`];
        }
    }

    submitFailed(): void {
        this.submitting = false;
        this.done = true;
        this._messageKind = 'result';
        this._messageLines = ['Failed to terminate'];
    }

    private confirmEntry(value: number): void {
        const size = this.limits.rosterSize;
        if (value < 1 || value > size) {
            this._messageKind = 'hint';
            this._messageLines = [`Must be 01-${String(size).padStart(2, '0')}`];
            return;
        }

        this._messageLines = [];
        this.pending = value;
        this.submitRequested = true;
    }
}
