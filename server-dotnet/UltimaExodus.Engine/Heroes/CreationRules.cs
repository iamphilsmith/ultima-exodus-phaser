namespace UltimaExodus.Engine.Heroes;

public enum CreationError
{
    None, NameMissing, NameTooLong, StatOutOfRange, StatTotalWrong
}

public static class CreationRules
{
    public static CreationError Validate(
        string? name, int strength, int dexterity, int intelligence, int wisdom)
    {
        if (string.IsNullOrWhiteSpace(name)) return CreationError.NameMissing;
        if (name.Trim().Length > HeroLimits.MaxNameLength) return CreationError.NameTooLong;

        int[] stats = [strength, dexterity, intelligence, wisdom];
        if (stats.Any(s => s < HeroLimits.MinStat || s > HeroLimits.MaxStat))
            return CreationError.StatOutOfRange;
        if (stats.Sum() != HeroLimits.StatTotal) return CreationError.StatTotalWrong;

        return CreationError.None;
    }
}