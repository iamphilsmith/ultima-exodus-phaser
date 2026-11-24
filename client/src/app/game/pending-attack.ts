/**
 * The "A, then a direction" attack command: A starts it, the next direction key
 * completes it, and Esc cancels it. Pure state with no Phaser, so it can be
 * unit-tested.
 */
export class PendingAttack {
  private waiting = false;

  get isWaiting(): boolean {
    return this.waiting;
  }

  /** A was pressed. True if this started the prompt; false if it was already open. */
  start(): boolean {
    if (this.waiting) return false;
    this.waiting = true;
    return true;
  }

  /** Esc was pressed. True if there was an attack to cancel. */
  cancel(): boolean {
    if (!this.waiting) return false;
    this.waiting = false;
    return true;
  }

  /** A direction key was pressed. True if it answers the prompt, i.e. it is the attack direction. */
  take(): boolean {
    const wasWaiting = this.waiting;
    this.waiting = false;
    return wasWaiting;
  }
}