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
}