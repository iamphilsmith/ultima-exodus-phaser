using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using UltimaExodus.Data.Persistence;

namespace UltimaExodus.Engine.Tests;

public class GameStatePersistenceTests : IDisposable
{
    // An in-memory SQLite database lives only as long as its connection,
    // so we hold one open for the whole test.
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public GameStatePersistenceTests()
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

    private static GameState NewState() => new()
    {
        Id = 1,
        MapId = "world-sosaria",
        TileX = 43,
        TileY = 20
    };

    [Fact]
    public void A_new_game_state_has_no_return_position()
    {
        using (var db = NewContext())
        {
            db.GameStates.Add(NewState());
            db.SaveChanges();
        }

        using var check = NewContext();
        var state = check.GameStates.Single();
        Assert.Null(state.ReturnMapId);
        Assert.Null(state.ReturnTileX);
        Assert.Null(state.ReturnTileY);
    }

    [Fact]
    public void The_return_position_round_trips()
    {
        using (var db = NewContext())
        {
            var state = NewState();
            state.MapId = "conflict-grass";
            state.TileX = 5;
            state.TileY = 5;
            state.ReturnMapId = "world-sosaria";
            state.ReturnTileX = 41;
            state.ReturnTileY = 18;
            db.GameStates.Add(state);
            db.SaveChanges();
        }

        using var check = NewContext();
        var saved = check.GameStates.Single();
        Assert.Equal("conflict-grass", saved.MapId);
        Assert.Equal("world-sosaria", saved.ReturnMapId);
        Assert.Equal(41, saved.ReturnTileX);
        Assert.Equal(18, saved.ReturnTileY);
    }

    [Fact]
    public void The_return_position_can_be_cleared_again()
    {
        using (var db = NewContext())
        {
            var state = NewState();
            state.ReturnMapId = "world-sosaria";
            state.ReturnTileX = 41;
            state.ReturnTileY = 18;
            db.GameStates.Add(state);
            db.SaveChanges();
        }

        using (var db = NewContext())
        {
            var state = db.GameStates.Single();
            state.ReturnMapId = null;
            state.ReturnTileX = null;
            state.ReturnTileY = null;
            db.SaveChanges();
        }

        using var check = NewContext();
        var saved = check.GameStates.Single();
        Assert.Null(saved.ReturnMapId);
        Assert.Null(saved.ReturnTileX);
        Assert.Null(saved.ReturnTileY);
    }
}