namespace UltimaExodus.Engine.Conflicts;

/// <summary>
/// Picks the conflict map for an encounter. Only the maps that exist are covered;
/// every other combination returns null ("no map yet"). Choosing by terrain, and
/// the remaining maps in ARCHITECTURE.md, are future work.
/// </summary>
public static class ConflictMapSelector
{
    public const string Grass = "conflict-grass";
    public const string Shore = "conflict-shore";

    private static readonly string[] MapIds = [Grass, Shore];

    /// <summary>Whether this map id is one of the conflict maps.</summary>
    public static bool IsConflictMap(string mapId) => MapIds.Contains(mapId);

    public static string? Select(PartySurface party, OpponentMovement opponent)
        => (party, opponent) switch
        {
            (PartySurface.Land, OpponentMovement.Land) => Grass,
            (PartySurface.Land, OpponentMovement.Sea) => Shore,
            _ => null
        };
}