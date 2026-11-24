using UltimaExodus.Engine.Conflicts;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;

namespace UltimaExodus.Engine.Tests;

public class AttackResolverTests
{
    // A 4x4 overworld of ground (tile 1), with the given tiles placed on it.
    private static MapData World(params (int x, int y, int tile)[] placed)
    {
        var tiles = Enumerable.Repeat(1, 16).ToArray();
        foreach (var (x, y, tile) in placed)
        {
            tiles[y * 4 + x] = tile;
        }
        return new MapData("test-world", MapCategory.World, 4, 4, tiles);
    }

    // The party stands at (1,1); the monster is on the tile next to it.
    [Theory]
    [InlineData(Direction.North, 1, 0)]
    [InlineData(Direction.South, 1, 2)]
    [InlineData(Direction.East, 2, 1)]
    [InlineData(Direction.West, 0, 1)]
    public void A_land_monster_in_any_direction_starts_a_grass_conflict(Direction direction, int mx, int my)
    {
        var map = World((mx, my, 24));

        Assert.Equal("conflict-grass", AttackResolver.FindConflictMap(map, 1, 1, direction));
    }

    [Fact]
    public void A_sea_creature_starts_a_shore_conflict()
    {
        var map = World((2, 1, 13));

        Assert.Equal("conflict-shore", AttackResolver.FindConflictMap(map, 1, 1, Direction.East));
    }

    [Fact]
    public void An_empty_tile_is_nothing_to_attack()
    {
        Assert.Null(AttackResolver.FindConflictMap(World(), 1, 1, Direction.East));
    }

    [Fact]
    public void A_monster_in_a_different_direction_is_not_attacked()
    {
        var map = World((2, 1, 24)); // east of the party

        Assert.Null(AttackResolver.FindConflictMap(map, 1, 1, Direction.North));
    }

    [Fact]
    public void Only_the_adjacent_tile_counts()
    {
        var map = World((3, 1, 24)); // two tiles east of the party

        Assert.Null(AttackResolver.FindConflictMap(map, 1, 1, Direction.East));
    }

    [Fact]
    public void Attacking_wraps_across_the_map_edge()
    {
        // Party at the right edge attacks east: the target is column 0.
        Assert.Equal("conflict-grass",
            AttackResolver.FindConflictMap(World((0, 1, 24)), 3, 1, Direction.East));

        // Party on the top row attacks north: the target is the bottom row.
        Assert.Equal("conflict-grass",
            AttackResolver.FindConflictMap(World((1, 3, 24)), 1, 0, Direction.North));
    }

    [Fact]
    public void The_party_avatar_tile_is_not_a_monster()
    {
        var map = World((2, 1, 20));

        Assert.Null(AttackResolver.FindConflictMap(map, 1, 1, Direction.East));
    }
}