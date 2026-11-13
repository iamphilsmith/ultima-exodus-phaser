import { CreationLimits } from '../../services/hero-options';
import { TerminateCharacterForm, TerminateOutcome } from './terminate-character-form';

const LIMITS: CreationLimits = {
    maxNameLength: 12, minStat: 0, maxStat: 25, statTotal: 50, rosterSize: 20, partySize: 4,
};

/** Press the keys in order and return the outcome of each. */
function press(form: TerminateCharacterForm, ...keys: string[]): TerminateOutcome[] {
    return keys.map(key => form.handleKey(key));
}

describe('TerminateCharacterForm', () => {
    let form: TerminateCharacterForm;

    beforeEach(() => {
        form = new TerminateCharacterForm(LIMITS);
    });

    describe('entering an entry', () => {
        it('starts with an empty prompt and no message', () => {
            expect(form.prompt).toBe('Register #: \x1e');
            expect(form.messageLines).toEqual([]);
        });

        it('shows the digits being typed', () => {
            press(form, '1', '2');
            expect(form.prompt).toBe('Register #: 12\x1e');
        });

        it('ignores keys that are not digits, Backspace or Enter', () => {
            press(form, 'a', 'Shift', 'ArrowLeft');
            expect(form.prompt).toBe('Register #: \x1e');
        });

        it('Enter on an empty line does nothing', () => {
            expect(press(form, 'Enter')).toEqual(['none']);
            expect(form.messageLines).toEqual([]);
        });
    });

    describe('validation', () => {
        it.each([['0'], ['2', '1'], ['9', '9']])('rejects %s as out of range with a cyan hint', (...digits) => {
            const outcomes = press(form, ...digits, 'Enter');
            expect(outcomes[outcomes.length - 1]).toBe('none');
            expect(form.messageLines).toEqual(['Must be 01-20']);
            expect(form.messageKind).toBe('hint');
            expect(form.prompt).not.toBeNull();
        });

        it('takes the upper limit from the server', () => {
            const small = new TerminateCharacterForm({ ...LIMITS, rosterSize: 10 });
            press(small, '1', '1', 'Enter');
            expect(small.messageLines).toEqual(['Must be 01-10']);
        });

        it.each([['1'], ['2', '0']])('accepts %s and asks to submit', (...digits) => {
            const outcomes = press(form, ...digits, 'Enter');
            expect(outcomes[outcomes.length - 1]).toBe('submit');
        });

        it('remembers which entry to send', () => {
            press(form, '0', '7', 'Enter');
            expect(form.pendingEntry).toBe(7);
        });

        it('clears an earlier hint once a valid entry is submitted', () => {
            press(form, '0', 'Enter');
            press(form, 'Backspace', '5', 'Enter');
            expect(form.messageLines).toEqual([]);
        });

        it('ignores every key while the request is in flight', () => {
            press(form, '5', 'Enter');
            expect(press(form, 'Enter', 'x', '3')).toEqual(['none', 'none', 'none']);
        });
    });

    describe('after the server answers', () => {
        beforeEach(() => {
            press(form, '0', '7', 'Enter');
        });

        it('Terminated: red message with the padded entry, prompt gone, any key leaves', () => {
            form.applyResult('Terminated');
            expect(form.messageLines).toEqual(['07 Terminated']);
            expect(form.messageKind).toBe('result');
            expect(form.prompt).toBeNull();
            expect(form.handleKey('x')).toBe('menu');
        });

        it('Empty: says the slot is already empty', () => {
            form.applyResult('Empty');
            expect(form.messageLines).toEqual(['Register slot is already empty']);
            expect(form.handleKey('x')).toBe('menu');
        });

        it('InParty: refuses on two lines', () => {
            form.applyResult('InParty');
            expect(form.messageLines).toEqual(['Can not terminate a character', 'in the party']);
            expect(form.messageKind).toBe('result');
            expect(form.handleKey('x')).toBe('menu');
        });

        it('a failed request shows a message and any key leaves', () => {
            form.submitFailed();
            expect(form.messageLines).toEqual(['Failed to terminate']);
            expect(form.messageKind).toBe('result');
            expect(form.handleKey('x')).toBe('menu');
        });

        it('every message line fits between the screen borders', () => {
            const lines: string[] = [];
            (['Terminated', 'Empty', 'InParty'] as const).forEach(status => {
                const fresh = new TerminateCharacterForm(LIMITS);
                press(fresh, '1', '2', 'Enter');
                fresh.applyResult(status);
                lines.push(...fresh.messageLines);
            });
            const failed = new TerminateCharacterForm(LIMITS);
            press(failed, '1', 'Enter');
            failed.submitFailed();
            lines.push(...failed.messageLines);

            expect(lines.length).toBeGreaterThan(0);
            lines.forEach(line => expect(line.length).toBeLessThanOrEqual(38));
        });
    });
});