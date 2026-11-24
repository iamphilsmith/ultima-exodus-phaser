namespace UltimaExodus.Engine.Movement;

/// <summary>Where the party ended up, and whether the move was blocked.</summary>
public record MoveResult(int X, int Y, bool Blocked);