import { canSee } from './line-of-sight';

/** Build a vision-blocker lookup from a list of [dx, dy] offsets  */
const blockersAt =
(...cells: [number, number][]) => 
(dx: number, dy: number) => 
    cells.some(([x, y]) => x === dx && y === dy)

describe('canSee', () => {
    it('always sees its own tile', () => {
        expect(canSee(0, 0, blockersAt())).toBe(true);
    });
    
    it('sees open ground in every direction', () => {
        const open = blockersAt();
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                expect(canSee(dx, dy, open)).toBe(true);
            }
        }
    });
    
    it('sees a blocking tile itself, but not what is behind it', () => {
        const forest = blockersAt([1,0]);       
        expect(canSee(1, 0, forest)).toBe(true);
        expect(canSee(2, 0, forest)).toBe(false);
        expect(canSee(5, 0, forest)).toBe(false);
    });
    
    it('is not blocked by a tile beside the line of sight', () => {
        expect(canSee(3, 0, blockersAt([1, 1]))).toBe(true);
    });

    it('blocks along a diagonal', () => {
        const forest = blockersAt([1, 1]);
        expect(canSee(1,1, forest)).toBe(true);
        expect(canSee(3,3, forest)).toBe(false);
    });

    it('blocks to the west and north as well', () => {
        expect(canSee(-3, 0, blockersAt([-1, 0]))).toBe(false);
        expect(canSee(0, -3, blockersAt([0, -1]))).toBe(false);
    });
});