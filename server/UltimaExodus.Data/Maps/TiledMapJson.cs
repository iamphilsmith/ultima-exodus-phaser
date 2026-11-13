using System.Text.Json.Serialization;

namespace UltimaExodus.Data.Maps;

internal class TiledMapJson
{
    public int Width { get; set; }
    public int Height { get; set; }
    public List<TiledLayerJson> Layers { get; set; } = [];
}

internal class TiledLayerJson
{
    public string Name { get; set; }
    public int[] Data { get; set; } = [];
}