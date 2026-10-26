using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Terrain;

namespace UltimaExodus.Engine.Movement;

public static class OverworldMovement
{
    public static MoveResult TryMove(MapData map, int x, int y, Direction direction, bool ignoreSolid = false)
    {
        var (dx, dy) = direction.ToOffset();

        var targetX = Wrap(x + dx, map.Width);
        var targetY = Wrap(y + dy, map.Height);

        // Tiles is a flat, row-major array: index = row * width + column.
        var tileIndex = map.Tiles[targetY * map.Width + targetX];
        var blocked = !ignoreSolid && TileCatalogue.GetProperties(tileIndex).Solid;

        return blocked
            ? new MoveResult(x, y, Blocked: true)
            : new MoveResult(targetX, targetY, Blocked: false);
    }

    // C#'s % can return negative values, so add the size back before the final %.
    private static int Wrap(int value, int size) => ((value % size) + size) % size;
}