import { NumericLineInput } from './numeric-line-input';

describe('NumericLineInput', () => {
    function make(maxDigits: number) {
        const submitted: number[] = [];
        const input = new NumericLineInput(maxDigits, (value) => { submitted.push(value); });
        return { input, submitted };
    }

    it('builds up digits', () => {
        const { input } = make(3);
        input.handleKey('1');
        input.handleKey('2');
        expect(input.display).toBe('12');
    });

    it('ignores anything that is not a digit', () => {
        const { input } = make(3);
        ['a', ' ', '-', 'Shift', 'ArrowLeft'].forEach(k => input.handleKey(k));
        expect(input.display).toBe('');
    });

    it('stops accepting digits at the maximum', () => {
        const { input } = make(2);
        ['1', '2', '3'].forEach(k => input.handleKey(k));
        expect(input.display).toBe('12');
    });

    it('Backspace removes the last digit and is harmless when empty', () => {
        const { input } = make(3);
        input.handleKey('1');
        input.handleKey('2');
        input.handleKey('Backspace');
        expect(input.display).toBe('1');
        input.handleKey('Backspace');
        input.handleKey('Backspace');
        expect(input.display).toBe('');
    });

    it('Enter submits the number and clears the line', () => {
        const { input, submitted } = make(3);
        ['0', '7', 'Enter'].forEach(k => input.handleKey(k));
        expect(submitted).toEqual([7]);
        expect(input.display).toBe('');
    });

    it('Enter on an empty line submits nothing', () => {
        const { input, submitted } = make(3);
        input.handleKey('Enter');
        expect(submitted).toEqual([]);
    });
});