namespace UltimaExodus.Engine.Terrain;

public static class TileCatalogue
{
    // Keys are 0-based tile indices (already offset from Tiled's 1-based format,
    // i.e. tile.index -1, matching what the client renders)
    private static readonly Dictionary<int, TileProperties> Overrides = new()
    {
        [0] = new TileProperties(Solid: true, VisionBlocking: false), // Water
        [3] = new TileProperties(Solid: false, VisionBlocking: true), // Forrest
        [4] = new TileProperties(Solid: true, VisionBlocking: true), // Mountain
        [10] = new TileProperties(Solid: false, VisionBlocking: false), // Town/castle
    };

    private static readonly TileProperties Default = new (Solid: false, VisionBlocking: false);
    
    public static TileProperties GetProperties(int tileIndex)
        => Overrides.GetValueOrDefault(tileIndex, Default);
}