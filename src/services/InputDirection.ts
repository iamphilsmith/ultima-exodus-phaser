/**
 * InputDirection
 *
 * Named after the physical keys, not compass points or game actions.
 * Each MapView interprets these however it likes:
 *
 *   OverworldView / TownView:
 *     Up=North  Down=South  Left=West  Right=East
 *
 *   DungeonView:
 *     Up=Step forward  Down=Step back  Left=Turn left  Right=Turn right
 *
 *   CombatView:
 *     Up/Down/Left/Right = move selected party member or cursor
 */
export enum InputDirection {
    Up,
    Down,
    Left,
    Right,
}

/** Overworld/town offset lookup — not meaningful in dungeon or combat. */
export const DIRECTION_OFFSETS: Record<InputDirection, { dx: number; dy: number }> = {
    [InputDirection.Up]:    { dx:  0, dy: -1 },
    [InputDirection.Down]:  { dx:  0, dy:  1 },
    [InputDirection.Left]:  { dx: -1, dy:  0 },
    [InputDirection.Right]: { dx:  1, dy:  0 },
}

/** Human-readable compass name — for overworld action log messages. */
export const DIRECTION_NAME: Record<InputDirection, string> = {
    [InputDirection.Up]:    'North',
    [InputDirection.Down]:  'South',
    [InputDirection.Left]:  'West',
    [InputDirection.Right]: 'East',
}
