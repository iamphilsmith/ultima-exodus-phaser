using UltimaExodus.Data.Maps;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;
using UltimaExodus.Engine.State;

namespace UltimaExodus.Api.Services;

// Primary constructor: db and log are supplied by dependency injection
public class OverworldService(UltimaExodusDbContext db, ActionLog log)
{
    private const int SaveSlotId = 1;
    private const string DefaultMapId = "world-sosaria";
    private const int DefaultTileX = 5;
    private const int DefaultTileY = 5;

    public async Task<GameStateSnapshot> MoveAsync(Direction direction)
    {
        var state = await GetOrCreateStateAsync();
        var map = MapSourceLoader.LoadMap(MapCategory.World, state.MapId);

        var result = OverworldMovement.TryMove(map, state.TileX, state.TileY, direction);

        state.TileX = result.X;
        state.TileY = result.Y;

        await db.SaveChangesAsync();

        log.Add(result.Blocked ? $"{direction} BLK" : direction.ToString());

        return BuildSnapshot(state);
    }

    private async Task<GameState> GetOrCreateStateAsync()
    {
        var state = await db.GameStates.FindAsync(SaveSlotId);
        if (state is not null)
        {
            return state;
        } 

        state = new GameState
        {
            Id = SaveSlotId,
            TileX = DefaultTileX,
            TileY = DefaultTileY,
            MapId = DefaultMapId
        };

        db.GameStates.Add(state);
        await db.SaveChangesAsync();
        return state;
    }

    private GameStateSnapshot BuildSnapshot(GameState state) => new(
        Position: new PartyPosition(state.MapId, state.TileX, state.TileY),
        Log: log.GetAll(),
        Clock: StubState.Clock,
        Entities: [],
        Effects: [],
        Party: StubState.Party);

 
}