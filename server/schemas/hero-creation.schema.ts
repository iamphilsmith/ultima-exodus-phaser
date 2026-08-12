import { z } from 'zod';
import { RACES, CLASSES, SEXES } from '../../src/data/hero-options.ts';
import { CREATION_STAT_TOTAL, CREATION_STAT_MIN, CREATION_STAT_MAX, NAME_MAX_LENGTH } from '../../src/entities/hero.ts';

export const HeroCreationSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  sex: z.enum(SEXES),
  race: z.enum(RACES),
  class: z.enum(CLASSES),
  strength: z.number().int().min(CREATION_STAT_MIN).max(CREATION_STAT_MAX),
  dexterity: z.number().int().min(CREATION_STAT_MIN).max(CREATION_STAT_MAX),
  intelligence: z.number().int().min(CREATION_STAT_MIN).max(CREATION_STAT_MAX),
  wisdom: z.number().int().min(CREATION_STAT_MIN).max(CREATION_STAT_MAX),
}).refine(
  (h) => h.strength + h.dexterity + h.intelligence + h.wisdom === CREATION_STAT_TOTAL,
  { message: `Stats must total exactly ${CREATION_STAT_TOTAL}`, path: ['strength'] }
);

export type HeroCreationInput = z.infer<typeof HeroCreationSchema>;