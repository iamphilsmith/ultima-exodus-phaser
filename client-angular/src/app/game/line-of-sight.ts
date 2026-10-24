/**
 * Can the party see the tile as (endX, endY), measured in tiles from the party?
 * 
 * Walks a straight line from the party to the target. Any vision-blocking tile on the way hides the target.
 * The target itself may be blocking: you can see 
 * a mountain, just not what is behind it.
 * 
 * 'blocksVisionAt(dx, dy)' reports whether the tile at that offset from the party blocks the vision.
 * 
 * Ported unchanged from the old OverworldView.canSeeTile, including the Math.floor behaviour for negative offsets.
 */

export function canSee(
    endX: number,
    endY: number,
    blocksVisionAt: (dx: number, dy: number) => boolean
): boolean {
    const steps = Math.max(Math.abs(endX), Math.abs(endY));
    if (steps === 0) return true;

    const stepX = endX / steps;
    const stepY = endY / steps;
    let cx = 0;
    let cy = 0;
    for (let i = 1; i < steps; i++) {
        cx += stepX;
        cy += stepY;
        const dx = Math.floor(cx);
        const dy = Math.floor(cy);
        const isDestination = dx === endX && dy === endY;
        if (blocksVisionAt(dx, dy) && !isDestination) return false;        
    }
    return true;
}
