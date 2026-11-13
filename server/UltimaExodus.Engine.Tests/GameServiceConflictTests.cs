using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using UltimaExodus.Api.Configuration;
using UltimaExodus.Api.Services;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Data.Maps;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;
using UltimaExodus.Engine.State;
using UltimaExodus.Engine.Terrain;

namespace UltimaExodus.Engine.Tests;

public class GameServiceConflictTests : IDisposable
{
    private const string Sosaria = "world-sosaria";

    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public GameServiceConflictTests()
    {
        _connection.Open();
        using var db = NewContext();
        db.Database.Migrate();
    }

    public void Dispose() => _connection.Dispose();

    private UltimaExodusDbContext NewContext() => new(
        new DbContextOptionsBuilder<UltimaExodusDbContext>()
            .UseSqlite(_connection)
            .Options);

    private static GameService NewService(UltimaExodusDbContext db)
        => new(db, new ActionLog(), Options.Create(new DebugOptions()));

    private void Seed(string mapId, int x, int y,
        string? returnMapId = null, int? returnX = null, int? returnY = null)
    {
        using var db = NewContext();
        db.GameStates.Add(new GameState
        {
            Id = 1,
            MapId = mapId,
            TileX = x,
            TileY = y,
            ReturnMapId = returnMapId,
            ReturnTileX = returnX,
            ReturnTileY = returnY
        });
        db.SaveChanges();
    }

    [Fact]
    public async Task Attacking_the_land_monster_enters_conflict_grass()
    {
        Seed(Sosaria, 41, 17);
        using var db = NewContext();

        var snapshot = await NewService(db).AttackAsync(Direction.South);

        Assert.Equal("conflict-grass", snapshot.Position.MapId);
        Assert.Equal(MapCategory.Conflict, snapshot.Position.Category);
        Assert.Equal(5, snapshot.Position.X);
        Assert.Equal(6, snapshot.Position.Y);
        Assert.Equal("Conflict", snapshot.Log.Last().Text);

        using var check = NewContext();
        var saved = check.GameStates.Single();
        Assert.Equal(Sosaria, saved.ReturnMapId);
        Assert.Equal(41, saved.ReturnTileX);
        Assert.Equal(17, saved.ReturnTileY);
    }

    [Fact]
    public async Task Attacking_the_sea_creature_enters_conflict_shore()
    {
        Seed(Sosaria, 49, 20);
        using var db = NewContext();

        var snapshot = await NewService(db).AttackAsync(Direction.North);

        Assert.Equal("conflict-shore", snapshot.Position.MapId);
        Assert.Equal(MapCategory.Conflict, snapshot.Position.Category);
    }

    [Fact]
    public async Task Attacking_nothing_changes_nothing()
    {
        Seed(Sosaria, 5, 5);
        using var db = NewContext();

        var snapshot = await NewService(db).AttackAsync(Direction.North);

        Assert.Equal(Sosaria, snapshot.Position.MapId);
        Assert.Equal(5, snapshot.Position.X);
        Assert.Equal(5, snapshot.Position.Y);
        Assert.Equal("Nothing to attack", snapshot.Log.Last().Text);

        using var check = NewContext();
        Assert.Null(check.GameStates.Single().ReturnMapId);
    }

    [Fact]
    public async Task A_refresh_during_a_conflict_resumes_in_the_conflict()
    {
        Seed(Sosaria, 41, 17);
        using (var db = NewContext())
        {
            await NewService(db).AttackAsync(Direction.South);
        }

        using var fresh = NewContext();
        var snapshot = await NewService(fresh).GetStateAsync();

        Assert.Equal("conflict-grass", snapshot.Position.MapId);
        Assert.Equal(MapCategory.Conflict, snapshot.Position.Category);
    }

    [Fact]
    public async Task The_party_walks_in_a_conflict_and_bumps_into_creatures()
    {
        Seed(Sosaria, 41, 17);
        using var db = NewContext();
        var service = NewService(db);
        await service.AttackAsync(Direction.South); // starts at (5,6)

        await service.MoveAsync(Direction.South);   // (5,7)
        await service.MoveAsync(Direction.South);   // (5,8)
        var snapshot = await service.MoveAsync(Direction.West); // (4,8) is a party figure

        Assert.Equal(5, snapshot.Position.X);
        Assert.Equal(8, snapshot.Position.Y);
        Assert.Equal("West BLK", snapshot.Log.Last().Text);
        Assert.Equal("conflict-grass", snapshot.Position.MapId);
    }

    [Fact]
    public async Task Walking_off_the_edge_returns_to_the_saved_overworld_tile()
    {
        Seed("conflict-grass", 0, 6, Sosaria, 41, 17);
        using var db = NewContext();

        var snapshot = await NewService(db).MoveAsync(Direction.West);

        Assert.Equal(Sosaria, snapshot.Position.MapId);
        Assert.Equal(MapCategory.World, snapshot.Position.Category);
        Assert.Equal(41, snapshot.Position.X);
        Assert.Equal(17, snapshot.Position.Y);
        Assert.Equal("Leaving...", snapshot.Log.Last().Text);

        using var check = NewContext();
        var saved = check.GameStates.Single();
        Assert.Null(saved.ReturnMapId);
        Assert.Null(saved.ReturnTileX);
        Assert.Null(saved.ReturnTileY);
    }

    [Fact]
    public async Task A_missing_return_position_falls_back_to_the_default_start()
    {
        Seed("conflict-grass", 0, 6);
        using var db = NewContext();

        var snapshot = await NewService(db).MoveAsync(Direction.West);

        Assert.Equal(Sosaria, snapshot.Position.MapId);
        Assert.Equal(MapCategory.World, snapshot.Position.Category);
    }

    [Fact]
    public async Task Interact_inside_a_conflict_finds_nothing()
    {
        Seed("conflict-grass", 5, 6, Sosaria, 41, 17);
        using var db = NewContext();

        var snapshot = await NewService(db).InteractAsync();

        Assert.Equal("Nothing here", snapshot.Log.Last().Text);
        Assert.Equal("conflict-grass", snapshot.Position.MapId);
    }

    [Fact]
    public async Task Attacking_inside_a_conflict_finds_nothing()
    {
        Seed("conflict-grass", 5, 6, Sosaria, 41, 17);
        using var db = NewContext();

        var snapshot = await NewService(db).AttackAsync(Direction.North);

        Assert.Equal("Nothing to attack", snapshot.Log.Last().Text);
        Assert.Equal("conflict-grass", snapshot.Position.MapId);
    }

        [Fact]
    public async Task A_new_game_starts_two_squares_south_west_of_lord_british()
    {
        using var db = NewContext();

        var snapshot = await NewService(db).GetStateAsync();

        Assert.Equal(Sosaria, snapshot.Position.MapId);
        Assert.Equal(MapCategory.World, snapshot.Position.Category);
        Assert.Equal(43, snapshot.Position.X);
        Assert.Equal(20, snapshot.Position.Y);
    }

        [Fact]
    public void The_new_game_start_tile_is_walkable()
    {
        var map = MapSourceLoader.LoadMap(MapCategory.World, Sosaria);

        var tile = map.Tiles[20 * map.Width + 43];

        Assert.False(TileCatalogue.GetProperties(tile).Solid);
    }
}