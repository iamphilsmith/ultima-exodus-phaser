/** Collects up to maxLength printable characters; Enter submits (ignored while empty). */
export class TextLineInput {
  private buffer = '';

  constructor(
    private readonly maxLength: number,
    private readonly onSubmit: (value: string) => void,
  ) {}

  handleKey(key: string): void {
    if (key === 'Backspace') {
      this.buffer = this.buffer.slice(0, -1);
    } else if (key === 'Enter') {
      if (this.buffer.length === 0) return;
      this.onSubmit(this.buffer);
      this.buffer = '';
    } else if (key.length === 1 && this.buffer.length < this.maxLength) {
      // A single-character key name is a printable character (letter, digit, space,
      // punctuation). Special keys like "Shift" or "ArrowLeft" have longer names.
      this.buffer += key;
    }
  }

  get display(): string {
    return this.buffer;
  }
}