using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;

namespace UltimaExodus.Engine.Conflicts;

public static class AttackResolver
{
    /// <summary>
    /// The conflict map to enter when the party on this overworld map attacks in the
    /// given direction, or null if there is nothing to attack there. The overworld
    /// wraps at its edges, so the target tile can be on the far side of the map.
    /// The party is assumed to be on land: there are no boats yet.
    /// </summary>
    public static string? FindConflictMap(MapData map, int x, int y, Direction direction)
    {
        var (dx, dy) = direction.ToOffset();
        var targetX = Wrap(x + dx, map.Width);
        var targetY = Wrap(y + dy, map.Height);

        var tile = map.Tiles[targetY * map.Width + targetX];
        var opponent = MonsterCatalogue.FindByTile(tile);

        return opponent is null
            ? null
            : ConflictMapSelector.Select(PartySurface.Land, opponent.Value);
    }

    // % can return a negative number, so add the size back before the second %.
    private static int Wrap(int value, int size) => ((value % size) + size) % size;
}