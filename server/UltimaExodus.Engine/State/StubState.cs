namespace UltimaExodus.Engine.State;

/// <summary>
/// Hardcoded values matching the phase 2 shell. Replaced by real data later
/// (clock: when the world clock is implemented). The party is real as of phase 5.
/// </summary>

public static class StubState
{
    public static WorldClock Clock => new(0,1,"South");
}
