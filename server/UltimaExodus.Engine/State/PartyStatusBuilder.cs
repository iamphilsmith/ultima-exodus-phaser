using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Engine.State;

public static class PartyStatusBuilder
{
    /// <summary>Members come out in party order; Slot is 1-4 like everywhere the player sees it.</summary>
    public static PartyStatus Build(IEnumerable<PartySlot> slots, IEnumerable<Hero> heroes)
    {
        var heroById = heroes.ToDictionary(h => h.Id);

        var members = slots
            .OrderBy(s => s.SlotIndex)
            .Select(s => ToMember(s.SlotIndex + 1, heroById[s.HeroId]))
            .ToList();

        return new PartyStatus(members);
    }

    private static PartyMemberStatus ToMember(int slot, Hero hero) => new(
        Slot: slot,
        Name: hero.Name,
        Condition: ConditionLetter(hero.Status),
        Type: HeroInitials.Of(hero.Sex, hero.Race, hero.Class),
        Magic: hero.MagicPoints,
        Level: hero.Level,
        Hits: hero.HitPoints,
        Food: hero.Food);

    // The panel shows one letter per hero: the first letter of the status.
    private static string ConditionLetter(HeroStatus status) => status switch
    {
        HeroStatus.Good => "G",
        HeroStatus.Poisoned => "P",
        HeroStatus.Sleeping => "S",
        HeroStatus.Unconscious => "U",
        HeroStatus.Dead => "D",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null)
    };
}