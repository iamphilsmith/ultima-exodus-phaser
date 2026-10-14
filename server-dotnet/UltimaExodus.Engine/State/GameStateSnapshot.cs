using UltimaExodus.Engine.Maps;
using System.Collections.Generic;

namespace UltimaExodus.Engine.State;

public record PartyPosition(string MapId, int X, int Y);

public record LogEntry(string Text);

public record WorldClock(int Moon1Phase, int Moon2Phase, string Wind);

public record EffectSequence(string Type, string SourceId, string? TargetId, int DelayMs);

public record GameStateSnapshot(
    PartyPosition Position,
    List<LogEntry> Log,
    WorldClock Clock,
    List<MapEntity> Entities,
    List<EffectSequence> Effects,
    PartyStatus Party
);