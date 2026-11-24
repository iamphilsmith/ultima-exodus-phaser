namespace UltimaExodus.Engine.Terrain;

/// <summary>
/// The tile catalogue in a form that can be sent to the client: the few tiles
/// with special rules, plus the default that applies to every other tile.
/// </summary>

public record TileCatalogueSnapshot(
    TileProperties Default,
    IReadOnlyDictionary<int, TileProperties> Overrides
);

