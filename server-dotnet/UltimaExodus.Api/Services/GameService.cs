using Microsoft.Extensions.Options;
using UltimaExodus.Api.Configuration;
using UltimaExodus.Data.Maps;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Engine.Locations;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;
using UltimaExodus.Engine.State;

namespace UltimaExodus.Api.Services;

// Primary constructor: db and log are supplied by dependency injection
public class GameService(UltimaExodusDbContext db, ActionLog log, IOptions<DebugOptions> debug)
{
    private const int SaveSlotId = 1;
    private const string DefaultMapId = "world-sosaria";
    private const int DefaultTileX = 5;
    private const int DefaultTileY = 5;

    public async Task<GameStateSnapshot> MoveAsync(Direction direction)
    {
        var state = await GetOrCreateStateAsync();
        var category = CategoryFor(state.MapId);

        if (category == MapCategory.World)
        {
            MoveOnWorld(state, direction);
        }
        else
        {
            MoveInLocation(state, category, direction);
        }

        await db.SaveChangesAsync();
        return BuildSnapshot(state);
    }

    public async Task<GameStateSnapshot> InteractAsync()
    {
        var state = await GetOrCreateStateAsync();

        // Only the overworld has anything to enter. Placeholder text for every
        // other case, until E does more than this.
        var location = CategoryFor(state.MapId) == MapCategory.World
            ? LocationCatalogue.FindByWorldTile(state.MapId, state.TileX, state.TileY)
            : null;

        if (location is null)
        {
            log.Add("Nothing here");
        }
        else
        {
            state.MapId = location.MapId;
            state.TileX = location.EntryX;
            state.TileY = location.EntryY;
            log.Add(location.EnterMessage);
        }

        await db.SaveChangesAsync();
        return BuildSnapshot(state);
    }

    private void MoveOnWorld(GameState state, Direction direction)
    {
        var map = MapSourceLoader.LoadMap(MapCategory.World, state.MapId);
        var result = OverworldMovement.TryMove(
            map, state.TileX, state.TileY, direction, ignoreSolid: debug.Value.NoClip);

        state.TileX = result.X;
        state.TileY = result.Y;
        log.Add(result.Blocked ? $"{direction} BLK" : direction.ToString());
    }

    private void MoveInLocation(GameState state, MapCategory category, Direction direction)
    {
        var map = MapSourceLoader.LoadMap(category, state.MapId);
        var result = LocationMovement.TryMove(
            map, state.TileX, state.TileY, direction, ignoreSolid: debug.Value.NoClip);

        if (result.Exited)
        {
            // Each location has exactly one overworld entrance, so leaving returns there.
            var location = LocationCatalogue.FindByMapId(state.MapId)!;
            state.MapId = location.WorldMapId;
            state.TileX = location.WorldX;
            state.TileY = location.WorldY;
            log.Add("Leaving...");
            return;
        }

        state.TileX = result.X;
        state.TileY = result.Y;
        log.Add(result.Blocked ? $"{direction} BLK" : direction.ToString());
    }

    // A map that isn't a location is the overworld. (Dungeons come in a later phase.)
    private static MapCategory CategoryFor(string mapId)
        => LocationCatalogue.FindByMapId(mapId)?.Category ?? MapCategory.World;

    public async Task<GameStateSnapshot> GetStateAsync()
    {
        var state = await GetOrCreateStateAsync();
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
        Position: new PartyPosition(state.MapId, CategoryFor(state.MapId), state.TileX, state.TileY),
        Log: log.GetAll(),
        Clock: StubState.Clock,
        Entities: [],
        Effects: [],
        Party: StubState.Party);
 
}