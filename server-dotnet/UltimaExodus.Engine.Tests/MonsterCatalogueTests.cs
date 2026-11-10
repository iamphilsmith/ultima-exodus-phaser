using UltimaExodus.Engine.Conflicts;

namespace UltimaExodus.Engine.Tests;

public class MonsterCatalogueTests
{
    [Theory]
    [InlineData(24, OpponentMovement.Land)]
    [InlineData(13, OpponentMovement.Sea)]
    public void Known_monster_tiles_have_an_opponent_type(int tile, OpponentMovement expected)
    {
        Assert.Equal((OpponentMovement?)expected, MonsterCatalogue.FindByTile(tile));
    }

    // 0 water, 1 ground, 20 party avatar, and 14 and 25 are the old build's
    // 1-based indexes for the monsters, which must not match here.
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(14)]
    [InlineData(20)]
    [InlineData(25)]
    public void Other_tiles_are_not_monsters(int tile)
    {
        Assert.Null(MonsterCatalogue.FindByTile(tile));
    }
}