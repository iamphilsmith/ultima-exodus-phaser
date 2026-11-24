using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;

namespace UltimaExodus.Engine.Tests;

public class LocationMovementTests
{
    // 3x3 test map (1 = ground, 35 = wall, 0 = water):
    //   1  1  1
    //   1  35 0
    //   1  1  1
    private static readonly MapData Map = new(
        MapId: "test-town",
        Category: MapCategory.Town,
        Width: 3,
        Height: 3,
        Tiles: [1, 1, 1,
                1, 35, 0,
                1, 1, 1]);

    [Fact]
    public void Moves_onto_open_ground()
    {
        var result = LocationMovement.TryMove(Map, 0, 0, Direction.East);
        Assert.Equal(new LocationMoveResult(1, 0, false, false), result);
    }

    [Fact]
    public void Wall_blocks_movement()
    {
        var result = LocationMovement.TryMove(Map, 0, 1, Direction.East);
        Assert.Equal(new LocationMoveResult(0, 1, true, false), result);
    }

    [Fact]
    public void Water_blocks_movement()
    {
        var result = LocationMovement.TryMove(Map, 2, 0, Direction.South);
        Assert.Equal(new LocationMoveResult(2, 0, true, false), result);
    }

    [Theory]
    [InlineData(1, 0, Direction.North)]
    [InlineData(1, 2, Direction.South)]
    [InlineData(0, 0, Direction.West)]
    [InlineData(2, 2, Direction.East)]
    public void Walking_off_any_edge_exits_and_leaves_the_position_unchanged(int x, int y, Direction direction)
    {
        var result = LocationMovement.TryMove(Map, x, y, direction);
        Assert.Equal(new LocationMoveResult(x, y, false, true), result);
    }

    [Fact]
    public void Does_not_wrap_at_the_edge()
    {
        // The overworld would wrap (0,0) West to (2,0); a location exits instead.
        var result = LocationMovement.TryMove(Map, 0, 0, Direction.West);
        Assert.True(result.Exited);
        Assert.Equal(0, result.X);
    }

    [Fact]
    public void Moving_along_an_edge_does_not_exit()
    {
        var result = LocationMovement.TryMove(Map, 0, 0, Direction.South);
        Assert.Equal(new LocationMoveResult(0, 1, false, false), result);
    }

    [Fact]
    public void NoClip_walks_through_walls()
    {
        var result = LocationMovement.TryMove(Map, 0, 1, Direction.East, ignoreSolid: true);
        Assert.Equal(new LocationMoveResult(1, 1, false, false), result);
    }

    [Fact]
    public void NoClip_does_not_stop_an_edge_exit()
    {
        var result = LocationMovement.TryMove(Map, 1, 0, Direction.North, ignoreSolid: true);
        Assert.Equal(new LocationMoveResult(1, 0, false, true), result);
    }
}