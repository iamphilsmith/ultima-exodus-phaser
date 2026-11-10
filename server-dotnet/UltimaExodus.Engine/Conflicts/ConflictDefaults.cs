namespace UltimaExodus.Engine.Conflicts;

public static class ConflictDefaults
{
    // Where the party starts on every conflict map. Temporary: (5,5) is open water
    // on conflict-shore, so this is the nearest tile that is ground on both maps.
    // Real start positions come when the party and monsters are placed as entities.
    public const int StartX = 5;
    public const int StartY = 6;
}