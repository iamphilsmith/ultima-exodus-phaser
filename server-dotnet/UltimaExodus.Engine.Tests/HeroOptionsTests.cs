using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Engine.Tests;

public class HeroOptionsTests
{
    [Fact]
    public void Every_enum_value_has_an_initial()
    {
        foreach (var s in Enum.GetValues<Sex>()) Assert.NotEqual('\0', HeroInitials.Of(s));
        foreach (var r in Enum.GetValues<Race>()) Assert.NotEqual('\0', HeroInitials.Of(r));
        foreach (var c in Enum.GetValues<HeroClass>()) Assert.NotEqual('\0', HeroInitials.Of(c));
    }

    [Fact]
    public void Initials_are_unique_within_races_and_within_classes()
    {
        var snapshot = HeroOptions.GetSnapshot();
        Assert.Equal(snapshot.Races.Count, snapshot.Races.Select(r => r.Initial).Distinct().Count());
        Assert.Equal(snapshot.Classes.Count, snapshot.Classes.Select(c => c.Initial).Distinct().Count());
    }

    [Fact]
    public void Combined_initials_are_sex_then_race_then_class()
    {
        Assert.Equal("MHF", HeroInitials.Of(Sex.Male, Race.Human, HeroClass.Fighter));
        Assert.Equal("FFA", HeroInitials.Of(Sex.Female, Race.Fuzzy, HeroClass.Alchemist));
    }

    [Fact]
    public void Snapshot_lists_options_in_the_old_builds_order()
    {
        var snapshot = HeroOptions.GetSnapshot();

        Assert.Equal(["Male", "Female"], snapshot.Sexes.Select(s => s.Name));
        Assert.Equal(["Human", "Elf", "Dwarf", "Bobbit", "Fuzzy"], snapshot.Races.Select(r => r.Name));
        Assert.Equal(
            ["Fighter", "Paladin", "Barbarian", "Thief", "Cleric",
             "Wizard", "Druid", "Illusionist", "Alchemist"],
            snapshot.Classes.Select(c => c.Name));
    }

    [Fact]
    public void Snapshot_limits_match_the_constants()
    {
        var limits = HeroOptions.GetSnapshot().Limits;
        Assert.Equal(new CreationLimits(12, 0, 25, 50, 20, 4), limits);
    }
}