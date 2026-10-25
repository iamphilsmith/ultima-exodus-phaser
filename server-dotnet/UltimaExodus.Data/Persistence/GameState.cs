namespace UltimaExodus.Data.Persistence;

public class GameState
{
    public int Id { get; set; }
    public int TileX { get; set; }
    public int TileY { get; set; }
    public string MapId { get; set; } = string.Empty;
}