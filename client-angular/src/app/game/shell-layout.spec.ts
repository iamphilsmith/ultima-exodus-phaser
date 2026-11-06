import { centredStartX } from './shell-layout';

describe('centredStartX', () => {
    it('centres normal-size text', () => {
        expect(centredStartX(18)).toBe(88);    // 'PARTY ORGANIZATION'
    });

    it('accounts for the scale of double-size text', () => {
        expect(centredStartX(6, 2)).toBe(112); // 'EXODUS'
    });

    it('rounds down when the leftover space is odd', () => {
        expect(centredStartX(3)).toBe(148);
        expect(centredStartX(5)).toBe(140);
    });

    it('starts at 0 for a full-width line', () => {
        expect(centredStartX(40)).toBe(0);
    });
});