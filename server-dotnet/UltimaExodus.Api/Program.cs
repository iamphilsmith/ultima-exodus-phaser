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


