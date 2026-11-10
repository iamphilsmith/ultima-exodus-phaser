import { menuOutcome, NEED_PARTY_MESSAGE } from './main-menu-actions';

describe('menuOutcome', () => {
    it('R returns to the intro whether or not a party exists', () => {
        expect(menuOutcome('R', false)).toBe('intro');
        expect(menuOutcome('R', true)).toBe('intro');
    });

    it('O opens party organisation whether or not a party exists', () => {
        expect(menuOutcome('O', false)).toBe('organize');
        expect(menuOutcome('O', true)).toBe('organize');
    });

    it('J journeys onward when a party is formed', () => {
        expect(menuOutcome('J', true)).toBe('journey');
    });

    it('J is refused when no party is formed', () => {
        expect(menuOutcome('J', false)).toBe('need-party');
    });

    it('the refusal message fits between the borders (38 characters)', () => {
        expect(NEED_PARTY_MESSAGE.length).toBeLessThanOrEqual(38);
    });
});