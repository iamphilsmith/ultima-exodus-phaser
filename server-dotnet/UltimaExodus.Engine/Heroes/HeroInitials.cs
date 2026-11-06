namespace UltimaExodus.Engine.Heroes;

/// <summary>Single-letter initials used for compact displays, e.g. "MHF".</summary>
public static class HeroInitials
{
    private static readonly Dictionary<Sex, char> SexInitials = new()
    {
        [Sex.Male] = 'M',
        [Sex.Female] = 'F'
    };

    private static readonly Dictionary<Race, char> RaceInitials = new()
    {
        [Race.Human] = 'H',
        [Race.Elf] = 'E',
        [Race.Dwarf] = 'D',
        [Race.Bobbit] = 'B',
        [Race.Fuzzy] = 'F'
    };

    private static readonly Dictionary<HeroClass, char> ClassInitials = new()
    {
        [HeroClass.Fighter] = 'F',
        [HeroClass.Paladin] = 'P',
        [HeroClass.Barbarian] = 'B',
        [HeroClass.Thief] = 'T',
        [HeroClass.Cleric] = 'C',
        [HeroClass.Wizard] = 'W',
        [HeroClass.Druid] = 'D',
        [HeroClass.Illusionist] = 'I',
        [HeroClass.Alchemist] = 'A'
    };

    public static char Of(Sex sex) => SexInitials[sex];
    public static char Of(Race race) => RaceInitials[race];
    public static char Of(HeroClass heroClass) => ClassInitials[heroClass];

    /// <summary>Sex, race, class: e.g. Male Human Fighter is "MHF".</summary>
    public static string Of(Sex sex, Race race, HeroClass heroClass) =>
        $"{Of(sex)}{Of(race)}{Of(heroClass)}";
}