using System.Text.Json.Serialization;

namespace UltimaExodus.Engine.Heroes;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum HeroClass
{
    Fighter, Paladin, Barbarian, Thief, Cleric,
    Wizard, Druid, Illusionist, Alchemist
}