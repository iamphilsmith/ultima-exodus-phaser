using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Terrain;

namespace UltimaExodus.Engine.Movement;

/// <summary>
/// Where the party ended up inside a town or castle. When exited is true the party
/// walked off the map edge; X and Y are then the old position and the caller decides
/// where the party goes next.
/// </summary>
/// <param name="X">The X coordinate of the party's position.</param>
/// <param name="Y">The Y coordinate of the party's position.</param>
/// <param name="Blocked">Whether the movement was blocked by a solid tile.</param>
/// <param name="Exited">Whether the party walked off the map edge.</param>
public record LocationMoveResult(int X, int Y, bool Blocked, bool Exited);

public static class LocationMovement
{
    public static LocationMoveResult TryMove(MapData map, int x, int y, Direction direction, bool ignoreSolid = false)
    {
        var (dx, dy) = direction.ToOffset();

        var targetX = x + dx;
        var targetY = y + dy;

        // Locations don't wrap. Stepping off any edge leaves. This is a rule, not
        // collision, so the no-clip flag doesn't affect it.
        if (targetX < 0 || targetX >= map.Width || targetY < 0 || targetY >= map.Height)
        {
            return new LocationMoveResult(x, y, Blocked: false, Exited: true);
        }

        var tileIndex = map.Tiles[targetY * map.Width + targetX];
        var blocked = !ignoreSolid && TileCatalogue.GetProperties(tileIndex).Solid;

        return blocked
            ? new LocationMoveResult(x, y, Blocked: true, Exited: false)
            : new LocationMoveResult(targetX, targetY, Blocked: false, Exited: false);
    }
}
