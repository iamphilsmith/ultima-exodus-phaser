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
}