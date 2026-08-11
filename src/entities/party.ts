export interface PartySlot {
  slotIndex: 0 | 1 | 2 | 3;
  heroId: string | null; // null = empty slot
}

export type Party = PartySlot[]; // always length 4