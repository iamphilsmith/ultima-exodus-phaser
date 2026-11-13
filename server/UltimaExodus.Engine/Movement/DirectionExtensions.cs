namespace UltimaExodus.Engine.Movement;

public static class DirectionExtensions
{
    public static (int dx, int dy) ToOffset(this Direction direction) => direction switch
    {
        Direction.North => (0, -1),
        Direction.South => (0, 1),
        Direction.West => (-1, 0),
        Direction.East => (1, 0),
        _ => throw new ArgumentOutOfRangeException(nameof(direction), direction, null)
    };
}