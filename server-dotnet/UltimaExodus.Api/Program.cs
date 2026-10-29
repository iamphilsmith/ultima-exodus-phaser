using Microsoft.EntityFrameworkCore;
using UltimaExodus.Api.Contracts;
using UltimaExodus.Api.Services;
using UltimaExodus.Data.Persistence;
using UltimaExodus.Data.Maps;
using UltimaExodus.Engine.Maps;
using UltimaExodus.Engine.Movement;
using UltimaExodus.Engine.State;
using UltimaExodus.Engine.Terrain;
using UltimaExodus.Engine.Heroes;
using UltimaExodus.Api.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<UltimaExodusDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder.Services.AddSingleton<ActionLog>();
builder.Services.AddScoped<GameService>();
builder.Services.AddScoped<RosterService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularDev", policy =>
    {
       policy.SetIsOriginAllowed(origin =>
            {
                var host = new Uri(origin).Host;
                return host == "localhost" || host.EndsWith(".app.github.dev");
            })
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// The Debug section is only read in Development, so setting Debug__NoClip in a
// production environment will have no effect.
if (builder.Environment.IsDevelopment())
{
    builder.Services.Configure<DebugOptions>(builder.Configuration.GetSection("Debug"));
}

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<UltimaExodusDbContext>();
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AngularDev");

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("api/maps/{category}/{mapId}", (string category, string mapId) =>
{
    if (!Enum.TryParse<MapCategory>(category, ignoreCase: true, out var parsedCategory))
    {
        return Results.BadRequest($"Unknown map category: {category}");
    }

    try
    {
        var mapData = MapSourceLoader.LoadMap(parsedCategory, mapId);
        return Results.Ok(mapData);
    }
    catch (FileNotFoundException)
    {
        return Results.NotFound($"Map not found: {mapId}");
    }
});

app.MapGet("api/tiles", () => TileCatalogue.GetSnapshot());

app.MapGet("api/hero-options", () => HeroOptions.GetSnapshot());

app.MapGet("api/roster", async (RosterService roster) =>
    Results.Ok(await roster.GetRosterAsync()));

app.MapPost("api/roster/create", async (CreateHeroRequest request, RosterService roster) =>
{
    // JSON accepts a raw number for an enum, so check the values are real ones.
    if (!Enum.IsDefined(request.Sex)) return Results.BadRequest($"Unknown sex: {request.Sex}");
    if (!Enum.IsDefined(request.Race)) return Results.BadRequest($"Unknown race: {request.Race}");
    if (!Enum.IsDefined(request.Class)) return Results.BadRequest($"Unknown class: {request.Class}");

    var error = CreationRules.Validate(
        request.Name, request.Strength, request.Dexterity, request.Intelligence, request.Wisdom);
    if (error != CreationError.None)
    {
        return Results.BadRequest($"Invalid hero: {error}");
    }

    return Results.Ok(await roster.CreateHeroAsync(request));
});

app.MapPost("api/roster/terminate", async (TerminateHeroRequest request, RosterService roster) =>
{
    if (request.Entry < 1 || request.Entry > HeroLimits.RosterSize)
    {
        return Results.BadRequest($"Entry must be between 1 and {HeroLimits.RosterSize}");
    }

    return Results.Ok(await roster.TerminateHeroAsync(request.Entry));
});

app.MapPost("api/party/form", async (FormPartyRequest request, RosterService roster) =>
{
    var result = await roster.FormPartyAsync(request.Entries ?? []);

    // A wrong count or out-of-range entry is a malformed request, not a game outcome.
    return result.Status == FormResult.Invalid
        ? Results.BadRequest(
            $"A party needs {HeroLimits.PartySize} roster entries between 1 and {HeroLimits.RosterSize}")
        : Results.Ok(result);
});

app.MapPost("api/party/disperse", async (RosterService roster) =>
    Results.Ok(await roster.DisperseAsync()));

app.MapPost("api/move", async (MoveRequest request, GameService game) =>
{
    if (!Enum.IsDefined(request.Direction))
    {
        return Results.BadRequest($"Unknown direction: {request.Direction}");
    }

    var snapshot = await game.MoveAsync(request.Direction);
    return Results.Ok(snapshot);
});

app.MapGet("api/state", async (GameService game) =>
    Results.Ok(await game.GetStateAsync()));

app.MapPost("api/interact", async (GameService game) =>
    Results.Ok(await game.InteractAsync()));

app.Run();


