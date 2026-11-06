using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Engine.Tests;

public class HeroRulesTests
{
    // --- CreationRules ---
    [Fact]
    public void Valid_hero_passes() =>
        Assert.Equal(CreationError.None, CreationRules.Validate("Phil", 10, 10, 15, 15));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Blank_name_is_rejected(string? name) =>
        Assert.Equal(CreationError.NameMissing, CreationRules.Validate(name, 10, 10, 15, 15));

    [Fact]
    public void Name_of_12_is_ok_and_13_is_too_long()
    {
        Assert.Equal(CreationError.None, CreationRules.Validate(new string('a', 12), 10, 10, 15, 15));
        Assert.Equal(CreationError.NameTooLong, CreationRules.Validate(new string('a', 13), 10, 10, 15, 15));
    }

    [Fact]
    public void Stat_of_25_is_ok_and_26_is_out_of_range()
    {
        Assert.Equal(CreationError.None, CreationRules.Validate("A", 25, 25, 0, 0));
        Assert.Equal(CreationError.StatOutOfRange, CreationRules.Validate("A", 26, 24, 0, 0));
    }

    [Fact]
    public void Negative_stat_is_out_of_range() =>
        Assert.Equal(CreationError.StatOutOfRange, CreationRules.Validate("A", -1, 25, 25, 1));

    [Theory]
    [InlineData(49)]
    [InlineData(51)]
    public void Wrong_total_is_rejected(int total) =>
        Assert.Equal(CreationError.StatTotalWrong,
            CreationRules.Validate("A", total - 30, 10, 10, 10));

    // --- Roster ---
    [Fact]
    public void Empty_roster_gives_entry_1() =>
        Assert.Equal(1, Roster.NextFreeEntry([]));

    [Fact]
    public void Lowest_gap_is_reused() =>
        Assert.Equal(2, Roster.NextFreeEntry([1, 3, 4]));

    [Fact]
    public void Full_roster_gives_null() =>
        Assert.Null(Roster.NextFreeEntry(Enumerable.Range(1, 20)));

    [Theory]
    [InlineData(false, false, TerminateResult.Empty)]
    [InlineData(false, true, TerminateResult.Empty)]
    [InlineData(true, true, TerminateResult.InParty)]
    [InlineData(true, false, TerminateResult.Terminated)]
    public void Terminate_check(bool occupied, bool inParty, TerminateResult expected) =>
        Assert.Equal(expected, Roster.CheckTerminate(occupied, inParty));

    // --- PartyRules ---
    private static readonly int[] Occupied = [1, 2, 3, 4, 20];

    [Fact]
    public void Four_distinct_occupied_entries_form() =>
        Assert.Equal(FormResult.Formed, PartyRules.CheckForm([1, 2, 3, 4], Occupied, false));

    [Fact]
    public void Entry_20_is_valid() =>
        Assert.Equal(FormResult.Formed, PartyRules.CheckForm([1, 2, 3, 20], Occupied, false));

    [Fact]
    public void Existing_party_blocks_forming() =>
        Assert.Equal(FormResult.AlreadyFormed, PartyRules.CheckForm([1, 2, 3, 4], Occupied, true));

    [Fact]
    public void Duplicate_entries_are_rejected() =>
        Assert.Equal(FormResult.Duplicate, PartyRules.CheckForm([1, 2, 2, 4], Occupied, false));

    [Fact]
    public void Empty_entry_is_rejected() =>
        Assert.Equal(FormResult.EmptyEntry, PartyRules.CheckForm([1, 2, 3, 5], Occupied, false));

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public void Out_of_range_entry_is_invalid(int bad) =>
        Assert.Equal(FormResult.Invalid, PartyRules.CheckForm([1, 2, 3, bad], Occupied, false));

    [Fact]
    public void Wrong_count_is_invalid() =>
        Assert.Equal(FormResult.Invalid, PartyRules.CheckForm([1, 2, 3], Occupied, false));
}