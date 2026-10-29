using Microsoft.EntityFrameworkCore;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Api.Services;

public class RosterService(UltimaExodusDbContext db)
{
    public async Task<RosterSnapshot> GetRosterAsync()
    {
        // AsNoTracking: we only read these rows, so EF doesn't need to watch them.
        var heroes = await db.Heroes
            .AsNoTracking()
            .Where(h => !h.Terminated)
            .ToListAsync();

        var slots = await db.PartySlots
            .AsNoTracking()
            .ToListAsync();

        return RosterSnapshotBuilder.Build(heroes, slots);
    }
}