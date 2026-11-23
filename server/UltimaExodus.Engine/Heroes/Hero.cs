namespace UltimaExodus.Engine.Heroes;

public class Hero
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public Sex Sex { get; set; }
    public Race Race { get; set; }
    public HeroClass Class { get; set; }

    public int Strength { get; set; }
    public int Dexterity { get; set; }
    public int Intelligence { get; set; }
    public int Wisdom { get; set; }

    public int HitPoints { get; set; } = HeroDefaults.HitPoints;
    public int MaxHitPoints { get; set; } = HeroDefaults.HitPoints;
    public int MagicPoints { get; set; } = HeroDefaults.MagicPoints;
    public int MaxMagicPoints { get; set; } = HeroDefaults.MagicPoints;
    public int Food { get; set; } = HeroDefaults.Food;
    public int Gold { get; set; } = HeroDefaults.Gold;
    public int Experience { get; set; } = HeroDefaults.Experience;
    public int Level { get; set; } = HeroDefaults.Level;
    public HeroStatus Status { get; set; } = HeroDefaults.Status;

    /// <summary>1-20. Unique among heroes that are not terminated.</summary>
    public int RosterEntry { get; set; }
    public bool Terminated { get; set; }
}