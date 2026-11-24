import { RosterEntrySnapshot } from '../../services/roster';
import { registerRow, registerRows } from './register-rows';

describe('registerRow', () => {
    it('shows an empty entry', () => {
        const row = registerRow({ entry: 3, hero: null, partyPosition: null });
        expect(row).toEqual({ text: '03   -- Empty --', kind: 'empty' });
    });

    it('shows a hero who is not in the party with a blank position', () => {
        const row = registerRow({
            entry: 1,
            hero: { name: 'Phil', initials: 'MHF', level: 1 },
            partyPosition: null,
        });
        expect(row.text).toBe('01   Phil' + ' '.repeat(9) + 'MHF  L01');
        expect(row.kind).toBe('reserve');
    });

    it('shows the party position of a party member', () => {
        const row = registerRow({
            entry: 12,
            hero: { name: 'Isolde', initials: 'FEW', level: 12 },
            partyPosition: 3,
        });
        expect(row.text).toBe('12 3 Isolde' + ' '.repeat(7) + 'FEW  L12');
        expect(row.kind).toBe('party');
    });

    it('does not pad a name that is already 12 characters', () => {
        const row = registerRow({
            entry: 20,
            hero: { name: 'Abcdefghijkl', initials: 'MHF', level: 1 },
            partyPosition: null,
        });
        expect(row.text).toBe('20   Abcdefghijkl MHF  L01');
    });

    it('gives every row the same width, empty rows aside', () => {
        const hero = { name: 'X', initials: 'MHF', level: 1 };
        const widths = [1, 5, 20].map(n =>
            registerRow({ entry: n, hero, partyPosition: null }).text.length);
        expect(new Set(widths).size).toBe(1);
    });
});

describe('registerRows', () => {
    it('turns all 20 entries into 20 rows in order', () => {
        const entries: RosterEntrySnapshot[] = Array.from({ length: 20 }, (_, i) => ({
            entry: i + 1, hero: null, partyPosition: null,
        }));
        const rows = registerRows(entries);

        expect(rows).toHaveLength(20);
        expect(rows[0].text.startsWith('01')).toBe(true);
        expect(rows[19].text.startsWith('20')).toBe(true);
    });
});