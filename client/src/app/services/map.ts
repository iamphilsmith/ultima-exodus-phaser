import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiBaseUrl } from '../utils/api-base-url'; // adjust to wherever your helper actually lives

export enum MapCategory {
  World = 0,
  Town = 1,
  Castle = 2,
  Dungeon = 3,
  Conflict = 4,
}

export interface MapData {
  mapId: string;
  category: MapCategory;
  width: number;
  height: number;
  tiles: number[];
}

@Service()
export class MapService {
  private http = inject(HttpClient);
  private cache = new Map<string, MapData>();
  private pending = new Map<string, Promise<MapData>>();

  async getMap(category: MapCategory, mapId: string): Promise<MapData> {
    const key = `${category}:${mapId}`;

    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const inFlight = this.pending.get(key);
    if (inFlight) {
      return inFlight;
    }

    const request = firstValueFrom(this.http.get<MapData>(
      `${apiBaseUrl()}/api/maps/${MapCategory[category].toLowerCase()}/${mapId}`
    )).then(mapData => {
      this.cache.set(key, mapData);
      this.pending.delete(key);
      return mapData;
    });

    this.pending.set(key, request);
    return request;
  }
}