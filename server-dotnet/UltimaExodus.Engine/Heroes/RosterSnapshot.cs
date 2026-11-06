namespace UltimaExodus.Engine.Heroes;

public record RosterHeroSnapshot(string Name, string Initials, int Level);

/// <summary>
/// One of the 20 roster entries. Hero is null for an empty entry;
/// PartyPosition is 1-4 when the hero is in the party, otherwise null.
/// </summary>
public record RosterEntrySnapshot(int Entry, RosterHeroSnapshot? Hero, int? PartyPosition);

public record RosterSnapshot(IReadOnlyList<RosterEntrySnapshot> Entries, bool PartyFormed);

public static class RosterSnapshotBuilder
{
    public static RosterSnapshot Build(
        IEnumerable<Hero> heroes,
        IReadOnlyCollection<PartySlot> partySlots)
    {
        // Terminated heroes never appear, even if a caller forgets to filter them.
        var heroByEntry = heroes
            .Where(h => !h.Terminated)
            .ToDictionary(h => h.RosterEntry);

        var positionByHeroId = partySlots
            .ToDictionary(p => p.HeroId, p => p.SlotIndex + 1);

        var entries = Enumerable.Range(1, HeroLimits.RosterSize)
            .Select(entry =>
            {
                if (!heroByEntry.TryGetValue(entry, out var hero))
                {
                    return new RosterEntrySnapshot(entry, null, null);
                }

                int? position = positionByHeroId.TryGetValue(hero.Id, out var pos) ? pos : null;
                var summary = new RosterHeroSnapshot(
                    hero.Name,
                    HeroInitials.Of(hero.Sex, hero.Race, hero.Class),
                    hero.Level);

                return new RosterEntrySnapshot(entry, summary, position);
            })
            .ToList();

        return new RosterSnapshot(entries, PartyFormed: partySlots.Count > 0);
    }
}