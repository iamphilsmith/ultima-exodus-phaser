using System.Text.Json.Serialization;

namespace UltimaExodus.Engine.Heroes;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum HeroStatus { Good, Poisoned, Sleeping, Unconscious, Dead }