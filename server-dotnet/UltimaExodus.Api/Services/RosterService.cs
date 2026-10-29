using Microsoft.EntityFrameworkCore;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Engine.Heroes;
using UltimaExodus.Api.Contracts;

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

    // Assumes the request has already passed CreationRules.Validate.
    public async Task<CreateHeroResult> CreateHeroAsync(CreateHeroRequest request)
    {
        var usedEntries = await db.Heroes
            .Where(h => !h.Terminated)
            .Select(h => h.RosterEntry)
            .ToListAsync();

        var entry = Roster.NextFreeEntry(usedEntries);
        if (entry is null)
        {
            return new CreateHeroResult(CreateHeroStatus.RosterFull, null, await GetRosterAsync());
        }

        db.Heroes.Add(new Hero
        {
            Name = request.Name!.Trim(),
            Sex = request.Sex,
            Race = request.Race,
            Class = request.Class,
            Strength = request.Strength,
            Dexterity = request.Dexterity,
            Intelligence = request.Intelligence,
            Wisdom = request.Wisdom,
            RosterEntry = entry.Value
            // Hit points, food, gold, level and status come from the defaults on Hero.
        });
        await db.SaveChangesAsync();

        return new CreateHeroResult(CreateHeroStatus.Created, entry, await GetRosterAsync());
    }
}