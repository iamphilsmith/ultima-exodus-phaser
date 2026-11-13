namespace UltimaExodus.Engine.Conflicts;

/// <summary>
/// What kind of opponent a monster tile is. Only the two monsters baked into the
/// Sosaria overworld exist for now; monsters become dynamic in a later phase.
/// Keys are 0-based tile indices, like TileCatalogue.
/// </summary>
public static class MonsterCatalogue
{
    private static readonly Dictionary<int, OpponentMovement> Opponents = new()
    {
        [13] = OpponentMovement.Sea,   // sea creature
        [24] = OpponentMovement.Land,  // land monster
    };

    /// <summary>The opponent type for this tile, or null if the tile is not a monster.</summary>
    public static OpponentMovement? FindByTile(int tileIndex)
        => Opponents.TryGetValue(tileIndex, out var movement) ? movement : null;
}