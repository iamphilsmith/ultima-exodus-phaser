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
      // key.length === 1 admits any single printable character
      // (letters, digits, space, punctuation) while excluding
      // special keys like "Shift" or "ArrowLeft".
      this.buffer += key;
    }
  }

  get display(): string {
    return this.buffer;
  }
}