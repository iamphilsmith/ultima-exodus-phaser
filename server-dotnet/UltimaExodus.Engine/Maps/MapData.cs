namespace UltimaExodus.Engine.Maps;

public record MapData
(
    string MapId,
    MapCategory Category,
    int Width,
    int Height,
    int[] Tiles
);