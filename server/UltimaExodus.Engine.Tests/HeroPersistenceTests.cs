using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Engine.Tests;

public class HeroPersistenceTests : IDisposable
{
    // An in-memory SQLite database lives only as long as its connection,
    // so we hold one open for the whole test.
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public HeroPersistenceTests()
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

    private static Hero NewHero(int entry, bool terminated = false) => new()
    {
        Name = "Test",
        Race = Race.Dwarf,
        Class = HeroClass.Paladin,
        Sex = Sex.Female,
        Strength = 10, Dexterity = 10, Intelligence = 15, Wisdom = 15,
        RosterEntry = entry,
        Terminated = terminated
    };

    [Fact]
    public void Hero_round_trips_with_enums_and_defaults()
    {
        using (var db = NewContext())
        {
            db.Heroes.Add(NewHero(1));
            db.SaveChanges();
        }

        using var check = NewContext();
        var hero = check.Heroes.Single();
        Assert.Equal(Race.Dwarf, hero.Race);
        Assert.Equal(HeroClass.Paladin, hero.Class);
        Assert.Equal(Sex.Female, hero.Sex);
        Assert.Equal(HeroDefaults.HitPoints, hero.HitPoints);
        Assert.Equal(HeroStatus.Good, hero.Status);
    }

    [Fact]
    public void Two_active_heroes_cannot_share_a_roster_entry()
    {
        using var db = NewContext();
        db.Heroes.AddRange(NewHero(3), NewHero(3));
        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void A_terminated_heros_entry_can_be_reused()
    {
        using var db = NewContext();
        db.Heroes.Add(NewHero(3, terminated: true));
        db.SaveChanges();

        db.Heroes.Add(NewHero(3));
        db.SaveChanges();

        Assert.Equal(2, db.Heroes.Count());
    }

    [Fact]
    public void A_hero_cannot_hold_two_party_positions()
    {
        using var db = NewContext();
        var hero = NewHero(1);
        db.Heroes.Add(hero);
        db.SaveChanges();

        db.PartySlots.AddRange(
            new PartySlot { SlotIndex = 0, HeroId = hero.Id },
            new PartySlot { SlotIndex = 1, HeroId = hero.Id });
        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void A_party_slot_must_point_at_a_real_hero()
    {
        using var db = NewContext();
        db.PartySlots.Add(new PartySlot { SlotIndex = 0, HeroId = 999 });
        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }
}