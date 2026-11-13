import { HeroOptionsData } from '../../services/hero-options';
import { CreateCharacterForm } from './create-character-form';

const OPTIONS: HeroOptionsData = {
    sexes: [{ name: 'Male', initial: 'M' }, { name: 'Female', initial: 'F' }],
    races: [
        { name: 'Human', initial: 'H' }, { name: 'Elf', initial: 'E' },
        { name: 'Dwarf', initial: 'D' }, { name: 'Bobbit', initial: 'B' },
        { name: 'Fuzzy', initial: 'F' },
    ],
    classes: [
        { name: 'Fighter', initial: 'F' }, { name: 'Paladin', initial: 'P' },
        { name: 'Barbarian', initial: 'B' }, { name: 'Thief', initial: 'T' },
        { name: 'Cleric', initial: 'C' }, { name: 'Wizard', initial: 'W' },
        { name: 'Druid', initial: 'D' }, { name: 'Illusionist', initial: 'I' },
        { name: 'Alchemist', initial: 'A' },
    ],
    limits: { maxNameLength: 12, minStat: 0, maxStat: 25, statTotal: 50, rosterSize: 20, partySize: 4 },
};

function press(form: CreateCharacterForm, ...keys: string[]): void {
    keys.forEach(key => form.handleKey(key));
}

/** Name "Phil", defaults for sex/race/class, stats 10/10/15/15: ends on the confirm step. */
function fillToConfirm(form: CreateCharacterForm): void {
    press(form, 'P', 'h', 'i', 'l', 'Enter', 'Enter', 'Enter', 'Enter');
    press(form, '1', '0', 'Enter', '1', '0', 'Enter', '1', '5', 'Enter', '1', '5', 'Enter');
}

describe('CreateCharacterForm', () => {
    let form: CreateCharacterForm;

    beforeEach(() => {
        form = new CreateCharacterForm(OPTIONS, 1);
    });

    describe('header and start', () => {
        it('starts on the name step with all 50 points free', () => {
            expect(form.step).toBe('name');
            expect(form.header).toBe('Entry#01   Points:50');
        });

        it('shows the entry number it was given', () => {
            expect(new CreateCharacterForm(OPTIONS, 7).header).toBe('Entry#07   Points:50');
        });
    });

    describe('name', () => {
        it('shows what is being typed and moves on at Enter', () => {
            press(form, 'P', 'h', 'i', 'l');
            expect(form.lines()[0].value).toBe('Phil');
            expect(form.step).toBe('name');

            press(form, 'Enter');
            expect(form.step).toBe('sex');
            expect(form.lines()[0].value).toBe('Phil');
        });

        it('refuses a name that is only spaces', () => {
            press(form, ' ', ' ', 'Enter');
            expect(form.step).toBe('name');
            expect(form.statusLines).toEqual(['Name cannot be blank']);
        });

        it('stops accepting characters at the maximum length', () => {
            press(form, ...'ABCDEFGHIJKLMNO'.split(''));
            expect(form.lines()[0].value).toBe('ABCDEFGHIJKL');
        });

        it('trims the name it keeps', () => {
            press(form, ' ', 'A', ' ', 'Enter');
            expect(form.lines()[0].value).toBe('A');
        });
    });

    describe('sex, race and class', () => {
        beforeEach(() => press(form, 'A', 'Enter'));

        it('cycles right and wraps around', () => {
            press(form, 'ArrowRight');
            expect(form.lines()[1].value).toBe('Female');
            press(form, 'ArrowRight');
            expect(form.lines()[1].value).toBe('Male');
        });

        it('cycles left and wraps around', () => {
            press(form, 'ArrowLeft');
            expect(form.lines()[1].value).toBe('Female');
        });

        it('keeps the choice and moves on at Enter', () => {
            press(form, 'ArrowRight', 'Enter');
            expect(form.step).toBe('race');
            press(form, 'ArrowRight', 'ArrowRight', 'Enter');
            expect(form.lines()[2].value).toBe('Dwarf');
            expect(form.step).toBe('class');
            press(form, 'ArrowLeft', 'Enter');
            expect(form.lines()[3].value).toBe('Alchemist');
            expect(form.step).toBe('strength');
        });

        it('ignores keys that are not arrows or Enter', () => {
            press(form, 'x', 'Shift');
            expect(form.step).toBe('sex');
            expect(form.lines()[1].value).toBe('Male');
        });
    });

    describe('stats', () => {
        beforeEach(() => press(form, 'A', 'Enter', 'Enter', 'Enter', 'Enter'));

        it('starts on strength', () => {
            expect(form.step).toBe('strength');
        });

        it('updates the points left as each stat is confirmed', () => {
            press(form, '1', '0', 'Enter');
            expect(form.header).toBe('Entry#01   Points:40');
            expect(form.step).toBe('dexterity');
        });

        it('shows the digits being typed', () => {
            press(form, '1', '2');
            expect(form.lines()[4].value).toBe('12');
        });

        it('rejects a stat above the maximum', () => {
            press(form, '3', '0', 'Enter');
            expect(form.step).toBe('strength');
            expect(form.statusLines).toEqual(['Must be 0-25']);
        });

        it('takes its range from the server limits', () => {
            const tight = { ...OPTIONS, limits: { ...OPTIONS.limits, maxStat: 10 } };
            const small = new CreateCharacterForm(tight, 1);
            press(small, 'A', 'Enter', 'Enter', 'Enter', 'Enter', '1', '1', 'Enter');
            expect(small.statusLines).toEqual(['Must be 0-10']);
        });

        it('accepts 0 and the maximum', () => {
            press(form, '0', 'Enter', '2', '5', 'Enter');
            expect(form.step).toBe('intelligence');
        });

        it('clears the message once a stat is accepted', () => {
            press(form, '3', '0', 'Enter');
            press(form, 'Backspace', 'Backspace', '1', '0', 'Enter');
            expect(form.statusLines).toEqual([]);
        });

        it('wrong total: shows the total, clears the stats and restarts at strength', () => {
            press(form, '1', '0', 'Enter', '1', '0', 'Enter', '1', '0', 'Enter', '1', '0', 'Enter');
            expect(form.step).toBe('strength');
            expect(form.statusLines).toEqual(['Total must be 50 (currently 40)', 'Re-enter stats']);
            expect(form.header).toBe('Entry#01   Points:50');
            expect(form.lines().slice(4).map(l => l.value)).toEqual(['0', '0', '0', '0']);
        });

        it('every status line fits between the screen borders', () => {
            press(form, '9', '9', 'Enter');
            const lines = [...form.statusLines];
            press(form, '1', '0', 'Enter', '1', '0', 'Enter', '1', '0', 'Enter', '1', '0', 'Enter');
            lines.push(...form.statusLines);
            form.submitFailed();
            lines.push(...form.statusLines);
            form.submitSucceeded();
            lines.push(...form.statusLines);

            expect(lines.length).toBeGreaterThan(0);
            lines.forEach(line => expect(line.length).toBeLessThanOrEqual(38));
        });
    });

    describe('confirm', () => {
        beforeEach(() => fillToConfirm(form));

        it('asks to confirm with no points left', () => {
            expect(form.step).toBe('confirm');
            expect(form.prompt).toBe('O.K.? (Y/N)\x1e');
            expect(form.header).toBe('Entry#01   Points:00');
        });

        it.each(['y', 'Y', 'Enter'])('%s submits', (key) => {
            expect(form.handleKey(key)).toBe('submit');
        });

        it.each(['n', 'N', 'Escape'])('%s goes back to the menu', (key) => {
            expect(form.handleKey(key)).toBe('menu');
        });

        it('ignores other keys', () => {
            expect(form.handleKey('q')).toBe('none');
            expect(form.step).toBe('confirm');
        });

        it('ignores every key while a submit is in flight', () => {
            expect(form.handleKey('y')).toBe('submit');
            expect(form.handleKey('y')).toBe('none');
            expect(form.handleKey('Enter')).toBe('none');
            expect(form.handleKey('n')).toBe('none');
        });

        it('builds the request from what was entered', () => {
            expect(form.toRequest()).toEqual({
                name: 'Phil', sex: 'Male', race: 'Human', class: 'Fighter',
                strength: 10, dexterity: 10, intelligence: 15, wisdom: 15,
            });
        });
    });

    describe('after the server answers', () => {
        beforeEach(() => {
            fillToConfirm(form);
            form.handleKey('y');
        });

        it('success: shows the message and any key leaves', () => {
            form.submitSucceeded();
            expect(form.step).toBe('done');
            expect(form.statusLines).toEqual(['Character created - press any key']);
            expect(form.handleKey('x')).toBe('menu');
        });

        it('roster full: any key leaves', () => {
            form.submitRosterFull();
            expect(form.step).toBe('done');
            expect(form.statusLines).toEqual(['Roster is full']);
            expect(form.handleKey('x')).toBe('menu');
        });

        it('failure: back to strength with a message, and keys work again', () => {
            form.submitFailed();
            expect(form.step).toBe('strength');
            expect(form.statusLines).toEqual(['Creation failed', 'Check stats and try again']);

            press(form, '7');
            expect(form.lines()[4].value).toBe('7');
        });
    });
});