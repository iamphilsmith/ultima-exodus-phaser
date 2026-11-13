export type MenuKey = 'R' | 'O' | 'J';

/** What the main menu should do in response to a key. */
export type MenuOutcome = 'intro' | 'organize' | 'journey' | 'need-party';

/** Shown on the menu when the player tries to Journey Onward with no party. */
export const NEED_PARTY_MESSAGE = 'Form a party first';

export function menuOutcome(key: MenuKey, partyFormed: boolean): MenuOutcome {
    switch (key) {
        case 'R': return 'intro';
        case 'O': return 'organize';
        case 'J': return partyFormed ? 'journey' : 'need-party';
    }
}