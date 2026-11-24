using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using UltimaExodus.Api.Contracts;
using UltimaExodus.Api.Services;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Engine.Tests;

public class RosterServiceTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public RosterServiceTests()
    {
        _connection.Open();
        using var db = NewContext();
        db.Database.Migrate();
    }

    public void Dispose() => _connection.Dispose();

    private UltimaExodusDbContext NewContext() => new(
        new DbContextOptionsBuilder<UltimaExodusDbContext>()
            .UseSqlite(_connection)
            .Options);

    private static CreateHeroRequest Request(string name) =>
        new(name, Sex.Male, Race.Human, HeroClass.Fighter, 10, 10, 15, 15);

    [Fact]
    public async Task Create_gives_each_hero_the_lowest_free_entry()
    {
        using var db = NewContext();
        var service = new RosterService(db);

        var first = await service.CreateHeroAsync(Request("A"));
        var second = await service.CreateHeroAsync(Request("B"));

        Assert.Equal(1, first.Entry);
        Assert.Equal(2, second.Entry);
        Assert.Equal("B", second.Roster.Entries[1].Hero!.Name);
    }

    [Fact]
    public async Task Create_on_a_full_roster_reports_RosterFull()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        for (var i = 0; i < HeroLimits.RosterSize; i++)
        {
            await service.CreateHeroAsync(Request($"H{i}"));
        }

        var result = await service.CreateHeroAsync(Request("Extra"));

        Assert.Equal(CreateHeroStatus.RosterFull, result.Status);
        Assert.Null(result.Entry);
        Assert.Equal(HeroLimits.RosterSize, db.Heroes.Count());
    }

    [Fact]
    public async Task Terminate_removes_the_hero_from_the_roster()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await service.CreateHeroAsync(Request("A"));

        var result = await service.TerminateHeroAsync(1);

        Assert.Equal(TerminateResult.Terminated, result.Status);
        Assert.Null(result.Roster.Entries[0].Hero);
        Assert.True(db.Heroes.Single().Terminated);   // soft delete: the row is kept
    }

    [Fact]
    public async Task Terminate_on_an_empty_entry_reports_Empty()
    {
        using var db = NewContext();
        var service = new RosterService(db);

        var result = await service.TerminateHeroAsync(5);

        Assert.Equal(TerminateResult.Empty, result.Status);
    }

    [Fact]
    public async Task Terminate_refuses_a_party_member()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await service.CreateHeroAsync(Request("A"));
        db.PartySlots.Add(new PartySlot { SlotIndex = 0, HeroId = db.Heroes.Single().Id });
        await db.SaveChangesAsync();

        var result = await service.TerminateHeroAsync(1);

        Assert.Equal(TerminateResult.InParty, result.Status);
        Assert.NotNull(result.Roster.Entries[0].Hero);
        Assert.False(db.Heroes.Single().Terminated);
    }

    // The old build's bug: a terminated hero kept its slot, so reusing the slot
    // left two rows with the same entry. Now the entry is simply free again.
    [Fact]
    public async Task A_terminated_heros_entry_is_reused_by_the_next_hero()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await service.CreateHeroAsync(Request("A"));
        await service.CreateHeroAsync(Request("B"));
        await service.TerminateHeroAsync(1);

        var third = await service.CreateHeroAsync(Request("C"));

        Assert.Equal(1, third.Entry);
        Assert.Equal("C", third.Roster.Entries[0].Hero!.Name);
        Assert.Equal("B", third.Roster.Entries[1].Hero!.Name);
        Assert.Equal(3, db.Heroes.Count());   // A's row is still there, terminated
    }

        private static async Task CreateHeroes(RosterService service, int count)
    {
        for (var i = 1; i <= count; i++)
        {
            await service.CreateHeroAsync(Request($"H{i}"));
        }
    }

    [Fact]
    public async Task Form_puts_heroes_in_the_order_given()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 5);

        var result = await service.FormPartyAsync([3, 1, 4, 2]);

        Assert.Equal(FormResult.Formed, result.Status);
        Assert.True(result.Roster.PartyFormed);
        Assert.Equal(2, result.Roster.Entries[0].PartyPosition);   // entry 1 -> position 2
        Assert.Equal(4, result.Roster.Entries[1].PartyPosition);   // entry 2 -> position 4
        Assert.Equal(1, result.Roster.Entries[2].PartyPosition);   // entry 3 -> position 1
        Assert.Equal(3, result.Roster.Entries[3].PartyPosition);   // entry 4 -> position 3
        Assert.Null(result.Roster.Entries[4].PartyPosition);       // entry 5 stays out
    }

    [Fact]
    public async Task Form_is_refused_when_a_party_already_exists()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 5);
        await service.FormPartyAsync([1, 2, 3, 4]);

        var result = await service.FormPartyAsync([2, 3, 4, 5]);

        Assert.Equal(FormResult.AlreadyFormed, result.Status);
        Assert.Equal(1, result.Roster.Entries[0].PartyPosition);   // unchanged
        Assert.Equal(4, db.PartySlots.Count());
    }

    [Fact]
    public async Task Form_with_a_duplicate_entry_saves_nothing()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 4);

        var result = await service.FormPartyAsync([1, 2, 2, 4]);

        Assert.Equal(FormResult.Duplicate, result.Status);
        Assert.Equal(0, db.PartySlots.Count());
    }

    [Fact]
    public async Task Form_with_an_empty_entry_is_refused()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 3);

        var result = await service.FormPartyAsync([1, 2, 3, 4]);

        Assert.Equal(FormResult.EmptyEntry, result.Status);
        Assert.Equal(0, db.PartySlots.Count());
    }

    // The old build's bug: a terminated hero could be pulled into a party.
    [Fact]
    public async Task Form_treats_a_terminated_heros_entry_as_empty()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 4);
        await service.TerminateHeroAsync(2);

        var result = await service.FormPartyAsync([1, 2, 3, 4]);

        Assert.Equal(FormResult.EmptyEntry, result.Status);
        Assert.Equal(0, db.PartySlots.Count());
    }

    [Fact]
    public async Task Form_with_the_wrong_shape_is_Invalid()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 4);

        Assert.Equal(FormResult.Invalid, (await service.FormPartyAsync([1, 2, 3])).Status);
        Assert.Equal(FormResult.Invalid, (await service.FormPartyAsync([1, 2, 3, 21])).Status);
    }

    [Fact]
    public async Task Disperse_clears_the_party_but_keeps_the_heroes()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 4);
        await service.FormPartyAsync([1, 2, 3, 4]);

        var roster = await service.DisperseAsync();

        Assert.False(roster.PartyFormed);
        Assert.All(roster.Entries.Take(4), e =>
        {
            Assert.NotNull(e.Hero);
            Assert.Null(e.PartyPosition);
        });
    }

    [Fact]
    public async Task Disperse_with_no_party_still_succeeds()
    {
        using var db = NewContext();
        var service = new RosterService(db);

        var roster = await service.DisperseAsync();

        Assert.False(roster.PartyFormed);
    }

    [Fact]
    public async Task A_dispersed_hero_can_then_be_terminated_and_a_new_party_formed()
    {
        using var db = NewContext();
        var service = new RosterService(db);
        await CreateHeroes(service, 5);
        await service.FormPartyAsync([1, 2, 3, 4]);

        Assert.Equal(TerminateResult.InParty, (await service.TerminateHeroAsync(1)).Status);

        await service.DisperseAsync();
        Assert.Equal(TerminateResult.Terminated, (await service.TerminateHeroAsync(1)).Status);

        // Entry 1 is free again, so a replacement takes it and a new party can form.
        await service.CreateHeroAsync(Request("Replacement"));
        var result = await service.FormPartyAsync([1, 2, 3, 5]);

        Assert.Equal(FormResult.Formed, result.Status);
        Assert.Equal("Replacement", result.Roster.Entries[0].Hero!.Name);
        Assert.Equal(1, result.Roster.Entries[0].PartyPosition);
    }
}