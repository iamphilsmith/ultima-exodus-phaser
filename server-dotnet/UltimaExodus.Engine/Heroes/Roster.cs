namespace UltimaExodus.Engine.Heroes;

public enum TerminateResult { Terminated, Empty, InParty }

public static class Roster
{
    /// <summary>Lowest unused entry (1-20), or null if the roster is full.</summary>
    public static int? NextFreeEntry(IEnumerable<int> usedEntries)
    {
        var used = usedEntries.ToHashSet();
        for (var entry = 1; entry <= HeroLimits.RosterSize; entry++)
            if (!used.Contains(entry)) return entry;
        return null;
    }

    public static TerminateResult CheckTerminate(bool occupied, bool inParty) =>
        !occupied ? TerminateResult.Empty
        : inParty ? TerminateResult.InParty
        : TerminateResult.Terminated;
}