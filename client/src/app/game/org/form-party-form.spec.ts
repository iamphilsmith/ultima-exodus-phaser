import { CreationLimits } from '../../services/hero-options';
import { FormPartyForm, FormPartyOutcome } from './form-party-form';

const LIMITS: CreationLimits = {
    maxNameLength: 12, minStat: 0, maxStat: 25, statTotal: 50, rosterSize: 20, partySize: 4,
};

/** Press the keys in order and return the outcome of each. */
function press(form: FormPartyForm, ...keys: string[]): FormPartyOutcome[] {
    return keys.map(key => form.handleKey(key));
}

function values(form: FormPartyForm): string[] {
    return form.rows().map(row => row.value);
}

describe('FormPartyForm', () => {
    let form: FormPartyForm;

    beforeEach(() => {
        form = new FormPartyForm(LIMITS);
    });

    describe('entering positions', () => {
        it('starts with four empty rows and the first one active', () => {
            expect(form.rows().map(r => r.label)).toEqual(
                ['Position 1:', 'Position 2:', 'Position 3:', 'Position 4:']);
            expect(values(form)).toEqual(['', '', '', '']);
            expect(form.rows().map(r => r.active)).toEqual([true, false, false, false]);
            expect(form.message).toBe('');
        });

        it('shows the digits being typed in the active row', () => {
            press(form, '3');
            expect(values(form)[0]).toBe('3');
        });

        it('pads a confirmed position to two digits and moves to the next row', () => {
            press(form, '3', 'Enter');
            expect(values(form)).toEqual(['03', '', '', '']);
            expect(form.rows().map(r => r.active)).toEqual([false, true, false, false]);
        });

        it('ignores keys that are not digits, Backspace or Enter', () => {
            press(form, 'a', 'Shift', 'ArrowLeft');
            expect(values(form)[0]).toBe('');
        });

        it('Enter on an empty line does nothing', () => {
            press(form, 'Enter');
            expect(form.rows()[0].active).toBe(true);
            expect(form.message).toBe('');
        });
    });

    describe('validation', () => {
        it.each([['0'], ['2', '1'], ['9', '9']])('rejects %s as out of range', (...digits) => {
            press(form, ...digits, 'Enter');
            expect(form.message).toBe('Must be 01-20');
            expect(form.rows()[0].active).toBe(true);
        });

        it('accepts 1 and 20', () => {
            press(form, '1', 'Enter', '2', '0', 'Enter');
            expect(values(form).slice(0, 2)).toEqual(['01', '20']);
        });

        it('takes the upper limit from the server', () => {
            const small = new FormPartyForm({ ...LIMITS, rosterSize: 10 });
            press(small, '1', '1', 'Enter');
            expect(small.message).toBe('Must be 01-10');
        });

        it('rejects a repeated position and stays on the same row', () => {
            press(form, '3', 'Enter', '3', 'Enter');
            expect(form.message).toBe('Already selected');
            expect(form.rows()[1].active).toBe(true);
            expect(values(form)).toEqual(['03', '', '', '']);
        });

        it('clears the message once a position is accepted', () => {
            press(form, '0', 'Enter');
            press(form, 'Backspace', '5', 'Enter');
            expect(form.message).toBe('');
        });
    });

    describe('submitting', () => {
        it('asks to submit when the fourth position is confirmed, and not before', () => {
            const outcomes = press(form,
                '3', 'Enter', '1', 'Enter', '4', 'Enter', '2', 'Enter');
            expect(outcomes.slice(0, 7).every(o => o === 'none')).toBe(true);
            expect(outcomes[7]).toBe('submit');
            expect(form.toEntries()).toEqual([3, 1, 4, 2]);
        });

        it('ignores every key while the request is in flight', () => {
            press(form, '1', 'Enter', '2', 'Enter', '3', 'Enter', '4', 'Enter');
            expect(press(form, 'Enter', 'x', '5')).toEqual(['none', 'none', 'none']);
        });

        function submitAll(): void {
            press(form, '1', 'Enter', '2', 'Enter', '3', 'Enter', '4', 'Enter');
        }

        it('Formed: keeps the positions on screen and any key leaves', () => {
            submitAll();
            form.applyResult('Formed');
            expect(form.message).toBe('Party formed - press any key');
            expect(values(form)).toEqual(['01', '02', '03', '04']);
            expect(form.rows().some(r => r.active)).toBe(false);
            expect(form.handleKey('x')).toBe('menu');
        });

        it.each([
            ['AlreadyFormed', 'A party is already formed'],
            ['Duplicate', 'Each roster position must be different'],
            ['EmptyEntry', 'One or more roster positions are empty'],
        ] as const)('%s: shows its message, clears the positions, any key leaves', (status, message) => {
            submitAll();
            form.applyResult(status);
            expect(form.message).toBe(message);
            expect(values(form)).toEqual(['', '', '', '']);
            expect(form.handleKey('x')).toBe('menu');
        });

        it('a failed request shows a message and clears the positions', () => {
            submitAll();
            form.submitFailed();
            expect(form.message).toBe('Failed to form party');
            expect(values(form)).toEqual(['', '', '', '']);
            expect(form.handleKey('x')).toBe('menu');
        });

        it('can show "already formed" straight away, before anything is typed', () => {
            form.applyResult('AlreadyFormed');
            expect(form.message).toBe('A party is already formed');
            expect(form.rows().some(r => r.active)).toBe(false);
            expect(form.handleKey('x')).toBe('menu');
        });

        it('every message fits between the screen borders', () => {
            const messages: string[] = [];
            (['Formed', 'AlreadyFormed', 'Duplicate', 'EmptyEntry'] as const).forEach(status => {
                const fresh = new FormPartyForm(LIMITS);
                fresh.applyResult(status);
                messages.push(fresh.message);
            });
            const failed = new FormPartyForm(LIMITS);
            failed.submitFailed();
            messages.push(failed.message);

            messages.forEach(m => expect(m.length).toBeLessThanOrEqual(38));
        });
    });
});