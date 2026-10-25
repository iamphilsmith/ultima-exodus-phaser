namespace UltimaExodus.Engine.State;

/// <summary>
/// Hardcoded values matching the phase 2 shell. Replaced by real data later
/// (party: phase 5; clock: when the world clock is implemented)
/// </summary>

public static class StubState
{
    public static WorldClock Clock => new(0,1,"South");

    public static PartyStatus Party => new(
        [
            new PartyMemberStatus(1, "Gregory", "G", "MHF", 0, 1, 150, 149),
            new PartyMemberStatus(2, "Bodur", "G", "MDF", 0, 1, 150, 149),
            new PartyMemberStatus(3, "Idris", "G", "MBW", 0, 1, 150, 149),
            new PartyMemberStatus(4, "Telmar", "G", "MBW", 0, 1, 150, 149),
        ]);
}
