import { PartyMemberStatus } from '../services/game';
import { PANEL_W_CHARS } from './shell-layout';
import { partyRows } from './party-rows';

const member = (overrides: Partial<PartyMemberStatus> = {}): PartyMemberStatus => ({
    slot: 1, name: 'Gregory', condition: 'G', type: 'MHF',
    magic: 0, level: 1, hits: 150, food: 149,
    ...overrides,
});

describe('partyRows', () => {
    it('lays out a member exactly as the old hardcoded panel did', () => {
        expect(partyRows(member())).toEqual({
            header: '\x101\x11',
            headerColumn: 6,
            name: '    Gregory   G',
            stats: ' MHF M:00 L:01',
            vitals: ' H:0150 F:0149',
        });
    });

    it('centres names of different lengths, with the condition in the last column', () => {
        expect(partyRows(member({ name: 'Bodur' })).name).toBe('     Bodur    G');
        expect(partyRows(member({ name: 'Telmar' })).name).toBe('    Telmar    G');
    });

    it('fits the longest allowed name', () => {
        const name = partyRows(member({ name: 'Abcdefghijkl' })).name;
        expect(name).toBe(' Abcdefghijkl G');
        expect(name).toHaveLength(PANEL_W_CHARS);
    });

    it('shows whichever condition letter the server sends', () => {
        expect(partyRows(member({ condition: 'D' })).name.endsWith('D')).toBe(true);
    });

    it('pads the numbers to two and four digits', () => {
        const rows = partyRows(member({ magic: 3, level: 12, hits: 100, food: 0 }));
        expect(rows.stats).toBe(' MHF M:03 L:12');
        expect(rows.vitals).toBe(' H:0100 F:0000');
    });

    it('uses the slot number in the header', () => {
        expect(partyRows(member({ slot: 4 })).header).toBe('\x104\x11');
    });

    it('no row is wider than the panel', () => {
        const rows = partyRows(member({ name: 'Abcdefghijkl', hits: 9999, food: 9999, level: 99, magic: 99 }));
        expect(rows.name.length).toBeLessThanOrEqual(PANEL_W_CHARS);
        expect(rows.stats.length).toBeLessThanOrEqual(PANEL_W_CHARS);
        expect(rows.vitals.length).toBeLessThanOrEqual(PANEL_W_CHARS);
    });
});