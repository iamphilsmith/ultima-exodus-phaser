import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiBaseUrl } from '../utils/api-base-url';

export interface HeroOption {
    name: string;
    initial: string;
}

export interface CreationLimits {
    maxNameLength: number;
    minStat: number;
    maxStat: number;
    statTotal: number;
    rosterSize: number;
    partySize: number;
}

export interface HeroOptionsData {
    sexes: HeroOption[];
    races: HeroOption[];
    classes: HeroOption[];
    limits: CreationLimits;
}

@Service()
export class HeroOptionsService {
    private http = inject(HttpClient);
    private data?: HeroOptionsData;
    private loading?: Promise<void>;

    /** Fetch the lists once. Safe to call repeatedly: callers share one request */
    load(): Promise<void> {
        this.loading ??= firstValueFrom(
            this.http.get<HeroOptionsData>(`${apiBaseUrl()}/api/hero-options`)
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

    /** Synchronous access for screens that cycle through the lists. Call load() first  */
    get options (): HeroOptionsData {
        if (!this.data) {
            throw new Error('HeroOptionsService.load() must complete before options is read');
        }
        return this.data;
    }
}