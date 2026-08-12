// src/entities/hero.ts
import type { Race, HeroClass, Sex } from '../data/hero-options.ts';

export const CREATION_STAT_TOTAL = 50;
export const CREATION_STAT_MIN = 0;
export const CREATION_STAT_MAX = 25;
export const STARTING_HIT_POINTS = 100;
export const NAME_MAX_LENGTH = 12;
export const ROSTER_MAX_SIZE = 20;

export interface HeroAttributes {
  name: string;
  sex: Sex;
  race: Race;
  class: HeroClass;
  strength: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
}

export interface HeroDerived {
  maxHitPoints: number;
  maxMagicPoints: number;
}

export interface HeroRuntimeState {
  hitPoints: number;
  magicPoints: number;
  experience: number;
  level: number;
  status: 'good' | 'poisoned' | 'sleeping' | 'unconscious' | 'dead';
  gold: number;
  food: number;
}

export interface HeroEquipmentRef {
  equippedWeaponId: string | null;
  equippedArmorId: string | null;
}

export interface Hero extends HeroAttributes, HeroDerived, HeroRuntimeState, HeroEquipmentRef {
  id: string;
  rosterSlot: number; // 0–19, stable until terminated
  createdAt: number;
}