using System.Text.Json.Serialization;

namespace UltimaExodus.Engine.Heroes;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CreateHeroStatus { Created, RosterFull }

/// <summary>Entry is the roster entry (1-20) the hero was given, or null if none was.</summary>
public record CreateHeroResult(CreateHeroStatus Status, int? Entry, RosterSnapshot Roster);