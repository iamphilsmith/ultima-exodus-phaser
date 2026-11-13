import { PartyPosition } from '../services/game';

/** What WorldScene needs from whichever view is showing the current map. */
export interface MapView {
  readonly mapId: string;
  render(position: PartyPosition): void;
  /** Remove everything this view added to the scene, so a new map can take its place. */
  destroy(): void;
}