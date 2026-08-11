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