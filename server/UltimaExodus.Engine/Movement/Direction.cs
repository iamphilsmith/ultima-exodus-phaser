using System.Text.Json.Serialization;

namespace UltimaExodus.Engine.Movement;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Direction
{
    North,
    South,
    East,
    West
}