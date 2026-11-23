using UltimaExodus.Data.Maps;
using UltimaExodus.Engine.Locations;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Terrain;

namespace UltimaExodus.Engine.Tests;

public class LocationCatalogueMapTests
{
    // One test case per location, named by map id so a failure says which one.
    public static IEnumerable<object[]> MapIds()
        => LocationCatalogue.All.Select(l => new object[] { l.MapId });

    private static MapData Load(LocationDef location)
        => MapSourceLoader.LoadMap(location.Category, location.MapId);

    [Theory]
    [MemberData(nameof(MapIds))]
    public void Map_file_loads_and_is_64_by_64(string mapId)
    {
        var map = Load(LocationCatalogue.FindByMapId(mapId)!);

        Assert.Equal(64, map.Width);
        Assert.Equal(64, map.Height);
        Assert.Equal(64 * 64, map.Tiles.Length);
    }

    [Theory]
    [MemberData(nameof(MapIds))]
    public void Entry_tile_is_in_bounds_and_walkable(string mapId)
    {
        var location = LocationCatalogue.FindByMapId(mapId)!;
        var map = Load(location);

        Assert.InRange(location.EntryX, 0, map.Width - 1);
        Assert.InRange(location.EntryY, 0, map.Height - 1);

        var tile = map.Tiles[location.EntryY * map.Width + location.EntryX];
        Assert.False(TileCatalogue.GetProperties(tile).Solid);
    }

    // Every entrance sits on tile 6 (town) or tile 7 (castle) on the overworld.
    [Theory]
    [MemberData(nameof(MapIds))]
    public void Overworld_tile_is_a_town_or_castle_tile(string mapId)
    {
        var location = LocationCatalogue.FindByMapId(mapId)!;
        var world = MapSourceLoader.LoadMap(MapCategory.World, location.WorldMapId);

        var tile = world.Tiles[location.WorldY * world.Width + location.WorldX];
        var expected = location.Category == MapCategory.Castle ? 7 : 6;

        Assert.Equal(expected, tile);
    }
}