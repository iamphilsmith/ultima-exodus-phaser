using System.Text.Json.Serialization;

namespace UltimaExodus.Engine.Heroes;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Race { Human, Elf, Dwarf, Bobbit, Fuzzy }