// src/entities/hero.ts
import type { Race, HeroClass, Sex } from '@/data/hero-options';

// --- Creation-time constants ---
export const CREATION_STAT_TOTAL = 50;
export const CREATION_STAT_MIN = 0;
export const CREATION_STAT_MAX = 25;
export const STARTING_HIT_POINTS = 100;
export const NAME_MAX_LENGTH = 12;

// --- Attributes chosen during "create a new hero" ---
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

// --- Values computed once at creation, then grow over time ---
export interface HeroDerived {
  maxHitPoints: number;
  maxMagicPoints: number;
}

// --- Values that change constantly during play ---
export interface HeroRuntimeState {
  hitPoints: number;      // current HP — decreases in combat, restored by rest/spells
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

// --- The full hero, as used app-wide ---
export interface Hero extends HeroAttributes, HeroDerived, HeroRuntimeState, HeroEquipmentRef {
  id: string;
  createdAt: number;
}