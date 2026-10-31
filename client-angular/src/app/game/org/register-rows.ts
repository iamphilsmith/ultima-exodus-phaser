import { RosterEntrySnapshot } from '../../services/roster';

export type RegisterRowKind = 'empty' | 'party' | 'reserve';

export interface RegisterRow {
    text: string;
    kind: RegisterRowKind;
}

/**
 * One line of the Regiser: "NN P NAME(12) INI Lnn", or "NN   -- Empty --".
 * P is the party position (1-4) or a blank for heroes not in the party.
 */
export function registerRow(entry: RosterEntrySnapshot): RegisterRow {
    const number = String(entry.entry).padStart(2, '0');

    if (!entry.hero) {
        return {
            text: `${number}   -- Empty --`,
            kind: 'empty',
        };
    }
    
    const position = entry.partyPosition === null ? ' ' : String(entry.partyPosition);
    const level = String(entry.hero.level).padStart(2, '0');
    const text = 
    `${number} ${position} ${entry.hero.name.padEnd(12)} ${entry.hero.initials}  L${level}`;

    return {
        text,
        kind: entry.partyPosition === null ? 'reserve' : 'party',
    };
}

export function registerRows(entries: RosterEntrySnapshot[]): RegisterRow[] {
    return entries.map(registerRow);
}
