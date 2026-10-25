import { logRows } from './log-rows';

const entries = (... texts: string[]) => texts.map(text => ({ text }));

describe('logRows', () => {
    it('pads a short log with blank rows at the top', () => {
        expect(logRows(entries('North','East BLK'),4)).toEqual(['', '', 'North', 'East BLK']);
    });

    it('returns only blank rows for an empty log', () => {
        expect(logRows([], 3)).toEqual(['', '', '']);
    });

    it('keeps only the newest entries when the log is longer than the panel', () => {
        expect(logRows(entries('a', 'b', 'c', 'd','e'), 3)).toEqual(['c', 'd', 'e']);
    });
});