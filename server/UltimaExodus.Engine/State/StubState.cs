namespace UltimaExodus.Engine.State;

/// <summary>
/// The hardcoded world clock (moon phase and wind), until the dynamic world
/// clock is implemented.
/// </summary>
public static class StubState
{
    public static WorldClock Clock => new(0,1,"South");
}
