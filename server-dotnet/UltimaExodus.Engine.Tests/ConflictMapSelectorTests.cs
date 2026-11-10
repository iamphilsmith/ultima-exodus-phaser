using UltimaExodus.Engine.Conflicts;

namespace UltimaExodus.Engine.Tests;

public class ConflictMapSelectorTests
{
    [Theory]
    [InlineData(PartySurface.Land, OpponentMovement.Land, "conflict-grass")]
    [InlineData(PartySurface.Land, OpponentMovement.Sea, "conflict-shore")]
    public void Supported_combinations_pick_their_map(
        PartySurface party, OpponentMovement opponent, string expected)
    {
        Assert.Equal(expected, ConflictMapSelector.Select(party, opponent));
    }

    [Theory]
    [InlineData(PartySurface.Land, OpponentMovement.Pirate)]
    [InlineData(PartySurface.Boat, OpponentMovement.Land)]
    [InlineData(PartySurface.Boat, OpponentMovement.Sea)]
    [InlineData(PartySurface.Boat, OpponentMovement.Pirate)]
    public void Combinations_without_a_map_return_null(PartySurface party, OpponentMovement opponent)
    {
        Assert.Null(ConflictMapSelector.Select(party, opponent));
    }
}