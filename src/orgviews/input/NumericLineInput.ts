// src/orgviews/input/NumericLineInput.ts
export class NumericLineInput {
  private buffer = '';

  constructor(
    private readonly maxDigits: number,
    private readonly onSubmit: (value: number) => void,
  ) {}

  handleKey(key: string): void {
    if (key === 'Backspace') {
      this.buffer = this.buffer.slice(0, -1);
    } else if (key === 'Enter') {
      if (this.buffer.length === 0) return;
      this.onSubmit(Number(this.buffer));
      this.buffer = '';
    } else if (/^[0-9]$/.test(key) && this.buffer.length < this.maxDigits) {
      this.buffer += key;
    }
  }

  get display(): string {
    return this.buffer;
  }
}