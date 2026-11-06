import { PartyMemberStatus } from '../services/game';
import { PANEL_W_CHARS } from './shell-layout';

export interface PartyPanelRows {
    /** The slot number between the arrow glyphs, e.g. "<1>". Drawn on a blue bar. */
    header: string;
    /** Columns from the panel's left edge at which the header starts (it is centred). */
    headerColumn: number;
    /** The name centred in the first 14 columns, then the condition letter. */
    name: string;
    /** Sex/race/class initials, magic points and level. */
    stats: string;
    /** Hit points and food. */
    vitals: string;
}

const NAME_COLUMNS = PANEL_W_CHARS - 1;   // the last column holds the condition letter

const pad2 = (n: number) => String(n).padStart(2, '0');
const pad4 = (n: number) => String(n).padStart(4, '0');

/** The four rows of text for one party member's section of the panel. */
export function partyRows(member: PartyMemberStatus): PartyPanelRows {
    const header = `\x10${member.slot}\x11`;
    const pad = Math.ceil((NAME_COLUMNS - member.name.length) / 2);

    return {
        header,
        headerColumn: Math.floor((PANEL_W_CHARS - header.length) / 2),
        name: member.name.padStart(member.name.length + pad).padEnd(NAME_COLUMNS) + member.condition,
        stats: ` ${member.type} M:${pad2(member.magic)} L:${pad2(member.level)}`,
        vitals: ` H:${pad4(member.hits)} F:${pad4(member.food)}`,
    };
}