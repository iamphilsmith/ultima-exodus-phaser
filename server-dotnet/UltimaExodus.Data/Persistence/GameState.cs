namespace UltimaExodus.Data.Persistence;

public class GameState
{
    public int Id { get; set; }
    public int TileX { get; set; }
    public int TileY { get; set; }
    public string MapId { get; set; } = string.Empty;

    // Set only while a conflict is in progress: the overworld position to return to.
    // All three are set together, or all three are null.
    public string? ReturnMapId { get; set; }
    public int? ReturnTileX { get; set; }
    public int? ReturnTileY { get; set; }
}