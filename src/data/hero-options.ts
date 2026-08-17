// src/data/hero-options.ts

export const RACES = ['Human', 'Elf', 'Dwarf', 'Bobbit', 'Fuzzy'] as const;
export type Race = typeof RACES[number];

export const CLASSES = [
  'Fighter', 
  'Paladin', 
  'Barbarian', 
  'Thief',
  'Cleric', 
  'Wizard', 
  'Druid', 
  'Illusionist', 
  'Alchemist',
] as const;
export type HeroClass = typeof CLASSES[number];

export const SEXES = ['Male', 'Female'] as const;
export type Sex = typeof SEXES[number];

// --- Single-letter initials for compact displays (register, combat, etc.) ---
export const RACE_INITIAL: Record<Race, string> = {
  Human: 'H', Elf: 'E', Dwarf: 'D', Bobbit: 'B', Fuzzy: 'F',
};

export const CLASS_INITIAL: Record<HeroClass, string> = {
  Fighter: 'F', Paladin: 'P', Barbarian: 'B', Thief: 'T',
  Cleric: 'C', Wizard: 'W', Druid: 'D', Illusionist: 'I', Alchemist: 'A',
};

export const SEX_INITIAL: Record<Sex, string> = {
  Male: 'M', Female: 'F',
};

// --- Sprite frame per class, for on-map/combat icons — placeholder until sprite sheet is finalized ---
export const CLASS_SPRITE_FRAME: Record<HeroClass, number> = {
  Fighter: 0, Paladin: 0, Barbarian: 0, Thief: 0,
  Cleric: 0, Wizard: 0, Druid: 0, Illusionist: 0, Alchemist: 0,
};