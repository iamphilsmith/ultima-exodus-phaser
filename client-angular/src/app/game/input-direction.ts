/**
 * Named after the physical keys, no compass points or game actions.
 * Each map view interprets these however it likes:
 * 
 * Overworld / town: Up=North, Down=South, Left=West, Right=East
 * Dungeons: Up=Forward, Down=Backward, Left=Turn Left, Right=Turn Right
 * Conflict: move the selected party member
 */

export enum InputDirection {
    Up,
    Down,
    Left,
    Right
}