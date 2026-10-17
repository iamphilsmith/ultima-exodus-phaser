import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiBaseUrl } from '../utils/api-base-url';

export interface TileProperties {
    solid: boolean;
    visionBlocking: boolean;
}

export interface TileCatalogueData {
    default: TileProperties;
    overrides: Record<string, TileProperties>;
}

@Service()
export class TileCatalogueService {
    private http = inject(HttpClient);
    private data?: TileCatalogueData;
    private loading?: Promise<void>;

    /** Fetch the catalogue once. Safe to call repeatedly: callers share one request. */
    load(): Promise<void> {
        this.loading ??= firstValueFrom(
            this.http.get<TileCatalogueData>(`${apiBaseUrl}/api/tiles`)
        )
        .then(data => {
            this.data = data;
        })
        .catch(error => {
            this.loading = undefined;
            throw error;
        });
        return this.loading;
    }

    /** Synchronous lookup, for per-move fog-of-war checks. Call load() first. */
    getProperties(tileIndex: number): TileProperties {
        if (!this.data) {
            throw new Error('TileCatalogueService.load() must complete before getProperties() is called');
        }
        return this.data.overrides[tileIndex] ?? this.data.default;
    }

}