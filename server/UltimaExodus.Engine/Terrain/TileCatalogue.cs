namespace UltimaExodus.Engine.Terrain;

public static class TileCatalogue
{
    // NOTE: static fields initialise in the order they are written, and BuildOverrides
    // uses Blocking, so Blocking must stay above Overrides.
    private static readonly TileProperties Blocking = new(Solid: true, VisionBlocking: false);

    // Keys are 0-based tile indices (already offset from Tiled's 1-based format,
    // i.e. tile.index -1, matching what the client renders)
    private static readonly Dictionary<int, TileProperties> Overrides = BuildOverrides();

    private static readonly TileProperties Default = new (Solid: false, VisionBlocking: false);

    private static Dictionary<int, TileProperties> BuildOverrides()
    {
        var overrides = new Dictionary<int, TileProperties>
        {
            [0] = new TileProperties(Solid: true, VisionBlocking: false),   // Water
            [3] = new TileProperties(Solid: false, VisionBlocking: true),   // Forest
            [4] = new TileProperties(Solid: true, VisionBlocking: true),    // Mountain
            [35] = new TileProperties(Solid: true, VisionBlocking: true),   // White block: building
        };

        foreach (var index in SolidTiles())
        {
            overrides[index] = Blocking;
        }

        return overrides;
    }

    private static IEnumerable<int> SolidTiles() =>
        new[] { 31,32 }                     // 31 Exodus machine block, 32 yellow barred doors
        .Concat(Enumerable.Range(37,21))    // 37 - 57 sign frame, letters, counters, tables, cell bars
        .Concat(new[] { 10,11,13,14,15})    // horse, ships, sea creatures
        .Concat(Enumerable.Range(16,15))    // 16 - 30 NPC's and monsters
        .Concat(Enumerable.Range(63,17));   // 63 - 79 second animation frames of the

    public static TileProperties GetProperties(int tileIndex)
        => Overrides.GetValueOrDefault(tileIndex, Default);

    public static TileCatalogueSnapshot GetSnapshot() => new (Default, Overrides);
}