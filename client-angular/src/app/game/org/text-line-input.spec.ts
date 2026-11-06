import { TextLineInput } from './text-line-input';

describe('TextLineInput', () => {
    function make(maxLength: number) {
        const submitted: string[] = [];
        const input = new TextLineInput(maxLength, (value) => { submitted.push(value); });
        return { input, submitted };
    }

    it('accepts letters, digits, spaces and punctuation', () => {
        const { input } = make(12);
        ['A', 'b', ' ', '3', '-'].forEach(k => input.handleKey(k));
        expect(input.display).toBe('Ab 3-');
    });

    it('ignores special keys with long names', () => {
        const { input } = make(12);
        ['Shift', 'ArrowLeft', 'Escape', 'Tab', 'Control'].forEach(k => input.handleKey(k));
        expect(input.display).toBe('');
    });

    it('stops accepting characters at the maximum', () => {
        const { input } = make(3);
        ['a', 'b', 'c', 'd'].forEach(k => input.handleKey(k));
        expect(input.display).toBe('abc');
    });

    it('Backspace removes the last character and is harmless when empty', () => {
        const { input } = make(5);
        input.handleKey('a');
        input.handleKey('b');
        input.handleKey('Backspace');
        expect(input.display).toBe('a');
        input.handleKey('Backspace');
        input.handleKey('Backspace');
        expect(input.display).toBe('');
    });

    it('Enter submits the text and clears the line', () => {
        const { input, submitted } = make(12);
        ['P', 'h', 'i', 'l', 'Enter'].forEach(k => input.handleKey(k));
        expect(submitted).toEqual(['Phil']);
        expect(input.display).toBe('');
    });

    it('Enter on an empty line submits nothing', () => {
        const { input, submitted } = make(12);
        input.handleKey('Enter');
        expect(submitted).toEqual([]);
    });
});