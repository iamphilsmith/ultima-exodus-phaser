import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiBaseUrl } from '../utils/api-base-url';
import { MapCategory } from './map';

export type CompassDirection = 'North' | 'East' | 'South' | 'West';

export interface PartyPosition {
    mapId: string;
    category: MapCategory;
    x: number;
    y: number;
}

export interface LogEntry {
    text: string;
}

export interface WorldClock {
    moon1Phase: number;
    moon2Phase: number;
    wind: string;
}

export interface MapEntity {
    id: string;
    type: string;
    x: number;
    y: number;
}

export interface EffectSequence {
    type: string;
    sourceId: string;
    targetId: string | null;
    delayMs: number;
}

export interface PartyMemberStatus {
    slot: number;
    name: string;
    condition: string;
    type: string;
    magic: number;
    level: number;
    hits: number;
    food: number;
}

export interface PartyStatus {
    members: PartyMemberStatus[];
}

export interface GameStateSnapshot {
    position: PartyPosition;
    log: LogEntry[];
    clock: WorldClock;
    entities: MapEntity[];
    effects: EffectSequence[];
    party: PartyStatus;
}

@Service()
export class GameService {
    private http = inject(HttpClient);

    move(direction: CompassDirection): Promise<GameStateSnapshot> {
        return firstValueFrom(
            this.http.post<GameStateSnapshot>(`${apiBaseUrl()}/api/move`, { direction })
        );
    }

    getState(): Promise<GameStateSnapshot> {
        return firstValueFrom(
            this.http.get<GameStateSnapshot>(`${apiBaseUrl()}/api/state`)
        );
    }
}
