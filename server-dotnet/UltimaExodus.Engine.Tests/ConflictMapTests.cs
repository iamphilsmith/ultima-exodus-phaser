using UltimaExodus.Data.Maps;
using UltimaExodus.Engine.Conflicts;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Terrain;

namespace UltimaExodus.Engine.Tests;

public class ConflictMapTests
{
    // One test case per map the selector can return, so a failure names the map.
    public static IEnumerable<object[]> MapIds() =>
    [
        [ConflictMapSelector.Grass],
        [ConflictMapSelector.Shore],
    ];

    private static MapData Load(string mapId)
        => MapSourceLoader.LoadMap(MapCategory.Conflict, mapId);

    [Theory]
    [MemberData(nameof(MapIds))]
    public void Map_file_loads_and_is_11_by_11(string mapId)
    {
        var map = Load(mapId);

        Assert.Equal(MapCategory.Conflict, map.Category);
        Assert.Equal(11, map.Width);
        Assert.Equal(11, map.Height);
        Assert.Equal(11 * 11, map.Tiles.Length);
    }

    [Theory]
    [MemberData(nameof(MapIds))]
    public void Start_tile_is_in_bounds_and_walkable(string mapId)
    {
        var map = Load(mapId);

        Assert.InRange(ConflictDefaults.StartX, 0, map.Width - 1);
        Assert.InRange(ConflictDefaults.StartY, 0, map.Height - 1);

        var tile = map.Tiles[ConflictDefaults.StartY * map.Width + ConflictDefaults.StartX];
        Assert.False(TileCatalogue.GetProperties(tile).Solid);
    }

    // Tiles 0 water, 1 ground, 2 brush, 13 sea creature, 20 party, 24 land monster.
    // If a map starts using anything else, decide that tile's rules in TileCatalogue
    // first, then add it here.
    [Theory]
    [MemberData(nameof(MapIds))]
    public void Map_only_uses_tiles_the_catalogue_has_been_checked_for(string mapId)
    {
        var known = new HashSet<int> { 0, 1, 2, 13, 20, 24 };

        var unexpected = Load(mapId).Tiles.Distinct().Where(t => !known.Contains(t)).ToList();

        Assert.Empty(unexpected);
    }
}