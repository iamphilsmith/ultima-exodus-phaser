using UltimaExodus.Engine.Heroes;
using UltimaExodus.Engine.State;

namespace UltimaExodus.Engine.Tests;

public class PartyStatusBuilderTests
{
    private static Hero NewHero(int id, string name, HeroStatus status = HeroStatus.Good) => new()
    {
        Id = id,
        Name = name,
        Sex = Sex.Female,
        Race = Race.Elf,
        Class = HeroClass.Wizard,
        Level = 3,
        HitPoints = 120,
        MagicPoints = 8,
        Food = 40,
        Status = status
    };

    [Fact]
    public void No_slots_gives_an_empty_party()
    {
        var party = PartyStatusBuilder.Build([], []);
        Assert.Empty(party.Members);
    }

    [Fact]
    public void Members_follow_party_order_with_one_based_slots()
    {
        var heroes = new[] { NewHero(10, "A"), NewHero(11, "B"), NewHero(12, "C") };
        var slots = new[]
        {
            new PartySlot { SlotIndex = 2, HeroId = 10 },
            new PartySlot { SlotIndex = 0, HeroId = 11 },
            new PartySlot { SlotIndex = 1, HeroId = 12 }
        };

        var party = PartyStatusBuilder.Build(slots, heroes);

        Assert.Equal(["B", "C", "A"], party.Members.Select(m => m.Name));
        Assert.Equal([1, 2, 3], party.Members.Select(m => m.Slot));
    }

    [Fact]
    public void Hero_fields_are_mapped_onto_the_panel_row()
    {
        var slots = new[] { new PartySlot { SlotIndex = 0, HeroId = 1 } };

        var member = PartyStatusBuilder.Build(slots, [NewHero(1, "Isolde")]).Members.Single();

        Assert.Equal(new PartyMemberStatus(1, "Isolde", "G", "FEW", 8, 3, 120, 40), member);
    }

    [Theory]
    [InlineData(HeroStatus.Good, "G")]
    [InlineData(HeroStatus.Poisoned, "P")]
    [InlineData(HeroStatus.Sleeping, "S")]
    [InlineData(HeroStatus.Unconscious, "U")]
    [InlineData(HeroStatus.Dead, "D")]
    public void Status_becomes_a_single_condition_letter(HeroStatus status, string letter)
    {
        var slots = new[] { new PartySlot { SlotIndex = 0, HeroId = 1 } };

        var member = PartyStatusBuilder.Build(slots, [NewHero(1, "X", status)]).Members.Single();

        Assert.Equal(letter, member.Condition);
    }
}