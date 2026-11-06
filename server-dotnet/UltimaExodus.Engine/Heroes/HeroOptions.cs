namespace UltimaExodus.Engine.Heroes;

public record HeroOption(string Name, string Initial);

public record CreationLimits(
    int MaxNameLength,
    int MinStat,
    int MaxStat,
    int StatTotal,
    int RosterSize,
    int PartySize);

public record HeroOptionsSnapshot(
    IReadOnlyList<HeroOption> Sexes,
    IReadOnlyList<HeroOption> Races,
    IReadOnlyList<HeroOption> Classes,
    CreationLimits Limits);

public static class HeroOptions
{
    // Lists follow the enum declaration order, which matches the old build's
    // order on the Create Character screen.
    public static HeroOptionsSnapshot GetSnapshot() => new(
        Sexes: Enum.GetValues<Sex>()
            .Select(s => new HeroOption(s.ToString(), HeroInitials.Of(s).ToString()))
            .ToList(),
        Races: Enum.GetValues<Race>()
            .Select(r => new HeroOption(r.ToString(), HeroInitials.Of(r).ToString()))
            .ToList(),
        Classes: Enum.GetValues<HeroClass>()
            .Select(c => new HeroOption(c.ToString(), HeroInitials.Of(c).ToString()))
            .ToList(),
        Limits: new CreationLimits(
            HeroLimits.MaxNameLength,
            HeroLimits.MinStat,
            HeroLimits.MaxStat,
            HeroLimits.StatTotal,
            HeroLimits.RosterSize,
            HeroLimits.PartySize));
}