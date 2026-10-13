using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;

namespace UltimaExodus.Engine.Tests;

public class OverworldMovementTests
{
    // 3x3 test map (0 = water, 1 = grass, 4 = mountain):
    //   1 1 1
    //   1 1 0
    //   4 1 1
    private static readonly MapData Map = new(
        MapId: "test",
        Category: MapCategory.World,
        Width: 3,
        Height: 3,
        Tiles: [1, 1, 1,
                1, 1, 0,
                4, 1, 1]);

    [Fact]
    public void Moves_onto_open_ground()
    {
        var result = OverworldMovement.TryMove(Map, 1, 1, Direction.North);
        Assert.Equal(new MoveResult(1, 0, false), result);
    }

    [Fact]
    public void Water_blocks_movement()
    {
        var result = OverworldMovement.TryMove(Map, 1, 1, Direction.East);
        Assert.Equal(new MoveResult(1, 1, true), result);
    }

    [Fact]
    public void Mountain_blocks_movement()
    {
        var result = OverworldMovement.TryMove(Map, 0, 1, Direction.South);
        Assert.Equal(new MoveResult(0, 1, true), result);
    }

    [Fact]
    public void Wraps_off_the_west_edge()
    {
        var result = OverworldMovement.TryMove(Map, 0, 0, Direction.West);
        Assert.Equal(new MoveResult(2, 0, false), result);
    }

    [Fact]
    public void Wraps_off_the_east_edge()
    {
        var result = OverworldMovement.TryMove(Map, 2, 0, Direction.East);
        Assert.Equal(new MoveResult(0, 0, false), result);
    }

    [Fact]
    public void Wraps_off_the_north_edge()
    {
        var result = OverworldMovement.TryMove(Map, 1, 0, Direction.North);
        Assert.Equal(new MoveResult(1, 2, false), result);
    }

    [Fact]
    public void Wrapping_into_a_solid_tile_is_blocked()
    {
        var result = OverworldMovement.TryMove(Map, 0, 0, Direction.North);
        Assert.Equal(new MoveResult(0, 0, true), result);
    }
}