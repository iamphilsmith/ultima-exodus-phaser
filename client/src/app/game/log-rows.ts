import { LogEntry } from '../services/game';

/** 
 * The text for each row of the log panel, oldest first, so the newest entry
 * lands on the bottom row. A log shoerter than the panel is padded with blank
 * rows at the top.
 */

export function logRows(entries: LogEntry[], rows: number): string[] {
    const recent = entries.slice(-rows).map((entry) => entry.text);
    return [...Array<string>(rows - recent.length).fill(''), ...recent];
}