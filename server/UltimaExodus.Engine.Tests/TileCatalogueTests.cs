using UltimaExodus.Engine.Terrain;

namespace UltimaExodus.Engine.Tests;

public class TileCatalogueTests
{
    // The tile sheet has 80 tiles (indicies 0-79)
    [Fact]
    public void Snapshot_agrees_with_GetProperties_for_every_tile()
    {
        var snapshot = TileCatalogue.GetSnapshot();

        for (int index = 0; index < 80; index++)
        {
            var fromSnapshot = snapshot.Overrides.GetValueOrDefault(index, snapshot.Default);
            Assert.Equal(TileCatalogue.GetProperties(index), fromSnapshot);
        }
    }

    [Fact]
    public void Walls_block_movement_and_sight()
    {
        var wall = TileCatalogue.GetProperties(35);
        Assert.True(wall.Solid);
        Assert.True(wall.VisionBlocking);
    }

    [Fact]
    public void Original_overworld_rules_are_unchanged()
    {
        Assert.Equal(new TileProperties(Solid: true, VisionBlocking: false), TileCatalogue.GetProperties(0));  // water
        Assert.Equal(new TileProperties(Solid: false, VisionBlocking: true), TileCatalogue.GetProperties(3));  // forest
        Assert.Equal(new TileProperties(Solid: true, VisionBlocking: true), TileCatalogue.GetProperties(4));   // mountains
    }

    // Both ends of every range, plus one in the middle.
    [Theory]
    [InlineData(10)]
    [InlineData(11)]
    [InlineData(13)]
    [InlineData(14)]
    [InlineData(15)]  // horse, ships, sea creatures
    [InlineData(16)]
    [InlineData(24)]
    [InlineData(30)]                                    // NPCs and monsters
    [InlineData(31)]                                                                      // Exodus machine
    [InlineData(32)]                                                                      // yellow doors
    [InlineData(37)]
    [InlineData(46)]
    [InlineData(57)]                                    // signs, counters
    [InlineData(63)]
    [InlineData(70)]
    [InlineData(79)]                                    // second animation frames
    public void Blocking_tiles_are_solid_but_do_not_block_sight(int tile)
    {
        var properties = TileCatalogue.GetProperties(tile);
        Assert.True(properties.Solid);
        Assert.False(properties.VisionBlocking);
    }

    // Includes the tiles just outside each range, to catch off-by-one errors.
    [Theory]
    [InlineData(1)]
    [InlineData(2)]            // ground, brush
    [InlineData(5)]
    [InlineData(6)]
    [InlineData(7)]  // dungeon, town, castle entrances on the overworld
    [InlineData(8)]
    [InlineData(9)]            // brick floor, chests
    [InlineData(12)]                           // just below the creature tiles
    [InlineData(33)]
    [InlineData(34)]          // lava-like floor, blue star tile
    [InlineData(36)]                           // between the walls and the signs
    [InlineData(58)]
    [InlineData(62)]          // just after the signs, just before the second frames
    public void Walkable_tiles_stay_walkable(int tile)
    {
        var properties = TileCatalogue.GetProperties(tile);
        Assert.False(properties.Solid);
        Assert.False(properties.VisionBlocking);
    }
}