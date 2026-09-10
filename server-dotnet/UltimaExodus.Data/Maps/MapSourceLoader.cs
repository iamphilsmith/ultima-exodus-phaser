using System.Text.Json;
using UltimaExodus.Engine.Maps;

namespace UltimaExodus.Data.Maps;

public static class MapSourceLoader
{
    private static readonly string SourceFolder = Path.Combine(AppContext.BaseDirectory, "MapSources");

    public static MapData LoadWorldMap(string mapId)
    {
        var filePath = Path.Combine(SourceFolder, $"{mapId}.json");
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Map source file not found: {filePath}");
        }

        var json = File.ReadAllText(filePath);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var tiledMap = JsonSerializer.Deserialize<TiledMapJson>(json, options)
            ?? throw new InvalidOperationException($"Failed to parse map source: {mapId}");

        // Overworld maps have a single tile layer holding all the terrain.
        var layer = tiledMap.Layers.First();

        // Tiled tile indices are 1-based; Phaser (and our tile catalogue) are 0-based.
        var tiles = layer.Data.Select(raw => raw - 1).ToArray();

        return new MapData(
            MapId: mapId,
            Category: MapCategory.World,
            Width: tiledMap.Width,
            Height: tiledMap.Height,
            Tiles: tiles
        );
    }
}