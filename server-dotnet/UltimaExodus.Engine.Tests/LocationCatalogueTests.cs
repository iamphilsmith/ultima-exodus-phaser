using UltimaExodus.Engine.Locations;
using UltimaExodus.Engine.Maps;

namespace UltimaExodus.Engine.Tests;

public class LocationCatalogueTests
{
    private const string Sosaria = "world-sosaria";

    [Fact]
    public void Has_ten_towns_and_two_castles()
    {
        var towns = LocationCatalogue.All.Count(l => l.Category == MapCategory.Town);
        var castles = LocationCatalogue.All.Count(l => l.Category == MapCategory.Castle);

        Assert.Equal(10, towns);
        Assert.Equal(2, castles);
    }

    [Fact]
    public void Map_ids_are_unique()
    {
        var ids = LocationCatalogue.All.Select(l => l.MapId).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Fact]
    public void World_tiles_are_unique()
    {
        var tiles = LocationCatalogue.All.Select(l => (l.WorldMapId, l.WorldX, l.WorldY)).ToList();
        Assert.Equal(tiles.Count, tiles.Distinct().Count());
    }

    [Fact]
    public void Every_location_round_trips_through_both_lookups()
    {
        foreach (var location in LocationCatalogue.All)
        {
           Assert.Same(location, LocationCatalogue.FindByWorldTile(location.WorldMapId, location.WorldX, location.WorldY));
           Assert.Same(location, LocationCatalogue.FindByMapId(location.MapId));
        }
    }

    [Fact]
    public void FindByWorldTile_returns_null_for_a_tile_with_no_location()
        => Assert.Null(LocationCatalogue.FindByWorldTile(Sosaria, 0, 0));

    [Fact]
    public void FindByWorldTile_returns_null_for_the_wrong_world_map()
        => Assert.Null(LocationCatalogue.FindByWorldTile("world-ambrosia", 46, 19));

    [Fact]
    public void FindByMapId_returns_null_for_a_map_that_is_not_a_location()
    {
        Assert.Null(LocationCatalogue.FindByMapId(Sosaria));
        Assert.Null(LocationCatalogue.FindByMapId("town-nowhere"));
    }

    // Britain's town and castles are diagonal neighbours; the two Montors are two tiles apart
    [Theory]
    [InlineData(46, 19, "town-lcb")]
    [InlineData(45, 18, "castle-british")]
    [InlineData(49, 58, "town-montor_e")]
    [InlineData(47, 58, "town-montor_w")]
    public void Neighbouring_entrances_resolve_to_the_right_location(int x, int y, string expectedMapId)
        => Assert.Equal(expectedMapId, LocationCatalogue.FindByWorldTile(Sosaria, x, y)?.MapId);

    [Fact]
    public void Towns_spawn_on_the_left_edge_and_castles_on_the_south_edge()
    {
        foreach (var location in LocationCatalogue.All)
        {
            var expected = location.Category == MapCategory.Castle ? (32, 63) : (0, 32);
            Assert.Equal(expected, (location.EntryX, location.EntryY));
        }
    }
}