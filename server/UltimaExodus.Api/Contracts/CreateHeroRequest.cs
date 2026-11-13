using UltimaExodus.Engine.Heroes;

namespace UltimaExodus.Api.Contracts;

// Name is nullable because a caller can leave it out; CreationRules rejects that.
public record CreateHeroRequest(
    string? Name,
    Sex Sex,
    Race Race,
    HeroClass Class,
    int Strength,
    int Dexterity,
    int Intelligence,
    int Wisdom);