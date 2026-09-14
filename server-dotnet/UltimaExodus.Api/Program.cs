using UltimaExodus.Data.Maps;
using UltimaExodus.Engine.Maps;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

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

var app = builder.Build();

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

app.Run();


