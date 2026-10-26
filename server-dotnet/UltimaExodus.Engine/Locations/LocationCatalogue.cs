using UltimaExodus.Engine.Maps;

namespace UltimaExodus.Engine.Locations;

public record LocationDef(
    string MapId,             // map file name, e.g. "town-devil-guard"
    MapCategory Category,
    string WorldMapId,        // the overworld this location is entered from
    int WorldX, int WorldY,   // overworld tile: triggers entry, and is where leaving returns to
    int EntryX, int EntryY,   // spawn tile insde the location
    string EnterMessage);
    
public static class LocationCatalogue
{
    private const string Sosaria = "world-sosaria";

    // Towns spawn on the left edge, castles on the south edge (as in the old build).
    private static LocationDef Town(string mapId, int worldX, int worldY, string  message)
        => new(mapId, MapCategory.Town, Sosaria, worldX, worldY, 0, 32, message);
    private static LocationDef Castle(string mapId, int worldX, int worldY, string  message)
        => new(mapId, MapCategory.Castle, Sosaria, worldX, worldY, 32, 63, message);

    public static IReadOnlyList<LocationDef> All { get; } =
    [
        Castle("castle-british",  45, 18, "Lord British's Castle"),
        Castle("castle-exodus",   10, 53, "Castle Exodus"),
        Town("town-lcb",          46, 19, "Britain"),
        Town("town-moon",          6, 13, "Moon"),
        Town("town-dawn",         38, 54, "Dawn"),
        Town("town-death",        56, 31, "Death Gulch"),
        Town("town-devil-guard",  18, 31, "Devil Guard"),
        Town("town-fawn",         30,  2, "Fawn"),
        Town("town-grey",          7, 44, "Grey"),
        Town("town-montor_e",     49, 58, "Montor East"),
        Town("town-montor_w",     47, 58, "Montor West"),
        Town("town-yew",          34, 16, "Yew"),        
    ];

    /// <summary>
    ///  Entering: which location (if any) is at this overworld tile?
    /// </summary>
    /// <param name="worldMapId">The ID of the overworld map.</param>
    /// <param name="x">The X coordinate on the overworld map.</param>
    /// <param name="y">The Y coordinate on the overworld map.</param>
    /// <returns>The location at the specified overworld tile, or null if none exists.</returns>
    public static LocationDef? FindByWorldTile(string worldMapId, int x, int y)
        => All.FirstOrDefault(l => l.WorldMapId == worldMapId && l.WorldX == x && l.WorldY == y);

    /// <summary>
    /// Leaving: the location's definition holds the overworld tile to return to.
    /// </summary>
    /// <param name="mapId">The ID of the location map.</param>
    /// <returns>The location definition for the specified map ID, or null if none exists.</returns>
    public static LocationDef? FindByMapId(string mapId)
        => All.FirstOrDefault(l => l.MapId == mapId);
}