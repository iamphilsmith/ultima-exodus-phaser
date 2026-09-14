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

  async getMap(category: MapCategory, mapId: string): Promise<MapData> {
    const key = `${category}:${mapId}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const categoryName = MapCategory[category].toLowerCase();
    const url = `${apiBaseUrl()}/api/maps/${categoryName}/${mapId}`;
    const mapData = await firstValueFrom(this.http.get<MapData>(url));

    this.cache.set(key, mapData);
    return mapData;
  }
}