using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Engine.Tests;

public class RosterSnapshotTests
{
    private static Hero NewHero(int id, int entry, string name = "Test", bool terminated = false) => new()
    {
        Id = id,
        Name = name,
        Sex = Sex.Male,
        Race = Race.Human,
        Class = HeroClass.Fighter,
        RosterEntry = entry,
        Terminated = terminated
    };

    [Fact]
    public void Empty_roster_has_twenty_empty_entries_and_no_party()
    {
        var snapshot = RosterSnapshotBuilder.Build([], []);

        Assert.Equal(20, snapshot.Entries.Count);
        Assert.Equal(Enumerable.Range(1, 20), snapshot.Entries.Select(e => e.Entry));
        Assert.All(snapshot.Entries, e =>
        {
            Assert.Null(e.Hero);
            Assert.Null(e.PartyPosition);
        });
        Assert.False(snapshot.PartyFormed);
    }

    [Fact]
    public void Hero_appears_at_its_entry_with_initials_and_level()
    {
        var snapshot = RosterSnapshotBuilder.Build([NewHero(7, 3, "Phil")], []);

        var entry = snapshot.Entries[2];
        Assert.Equal(3, entry.Entry);
        Assert.Equal(new RosterHeroSnapshot("Phil", "MHF", 1), entry.Hero);
        Assert.Null(entry.PartyPosition);
        Assert.Null(snapshot.Entries[0].Hero);
    }

    [Fact]
    public void Party_positions_are_one_based()
    {
        var heroes = new[] { NewHero(10, 1), NewHero(11, 2), NewHero(12, 5), NewHero(13, 9) };
        var slots = new[]
        {
            new PartySlot { SlotIndex = 0, HeroId = 12 },
            new PartySlot { SlotIndex = 1, HeroId = 10 },
            new PartySlot { SlotIndex = 2, HeroId = 13 },
            new PartySlot { SlotIndex = 3, HeroId = 11 }
        };

        var snapshot = RosterSnapshotBuilder.Build(heroes, slots);

        Assert.True(snapshot.PartyFormed);
        Assert.Equal(2, snapshot.Entries[0].PartyPosition);   // entry 1 = hero 10 = slot 1
        Assert.Equal(4, snapshot.Entries[1].PartyPosition);   // entry 2 = hero 11 = slot 3
        Assert.Equal(1, snapshot.Entries[4].PartyPosition);   // entry 5 = hero 12 = slot 0
        Assert.Equal(3, snapshot.Entries[8].PartyPosition);   // entry 9 = hero 13 = slot 2
    }

    [Fact]
    public void Heroes_outside_the_party_have_no_position()
    {
        var heroes = new[] { NewHero(1, 1), NewHero(2, 2) };
        var slots = new[] { new PartySlot { SlotIndex = 0, HeroId = 1 } };

        var snapshot = RosterSnapshotBuilder.Build(heroes, slots);

        Assert.Equal(1, snapshot.Entries[0].PartyPosition);
        Assert.Null(snapshot.Entries[1].PartyPosition);
    }

    [Fact]
    public void Terminated_heroes_are_never_shown()
    {
        var snapshot = RosterSnapshotBuilder.Build([NewHero(1, 4, terminated: true)], []);
        Assert.Null(snapshot.Entries[3].Hero);
    }
}