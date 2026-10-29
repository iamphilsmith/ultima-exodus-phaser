namespace UltimaExodus.Engine.Heroes;

public enum FormResult { Formed, AlreadyFormed, Invalid, Duplicate, EmptyEntry }

public static class PartyRules
{
    public static FormResult CheckForm(
        IReadOnlyList<int> entries,
        IReadOnlyCollection<int> occupiedEntries,
        bool partyAlreadyFormed)
    {
        if (partyAlreadyFormed) return FormResult.AlreadyFormed;

        if (entries.Count != HeroLimits.PartySize
            || entries.Any(e => e < 1 || e > HeroLimits.RosterSize))
            return FormResult.Invalid;

        if (entries.Distinct().Count() != entries.Count) return FormResult.Duplicate;
        if (entries.Any(e => !occupiedEntries.Contains(e))) return FormResult.EmptyEntry;

        return FormResult.Formed;
    }
}