import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiBaseUrl } from '../utils/api-base-url';

export interface RosterHeroSnapshot {
    name: string;
    initials: string;
    level: number;
}

/** One of the 20 roster entries. 
 * hero is null when empty; 
 * partyPosition is 1-4 or null 
 * */
export interface RosterEntrySnapshot {
    entry: number;
    hero: RosterHeroSnapshot | null;
    partyPosition: number | null;
}

export interface RosterSnapshot {
    entries: RosterEntrySnapshot[];
    partyFormed: boolean;
}

/** sex, race and class are plain strings: the server owns the list and rejects unknown values */
export interface CreateHeroRequest {
    name: string;
    sex: string;
    race: string;
    class: string;
    strength: number;
    dexterity: number;
    intelligence: number;
    wisdom: number;
}

export type CreateHeroStatus = 'Created' | 'RosterFull';
export interface CreateHeroResult {
    status: CreateHeroStatus;
    entry: number | null;
    roster: RosterSnapshot;
}

export type TerminateStatus = 'Terminated' | 'Empty' | 'InParty';
export interface TerminateHeroResult {
    status: TerminateStatus;
    roster: RosterSnapshot;
}

// The server also has an 'Invalid' form result, but that is a 400, so it never
// arrives in a normal response.
export type FormStatus = 'Formed' | 'AlreadyFormed' | 'Duplicate' | 'EmptyEntry';
export interface FormPartyResult {
    status: FormStatus;
    roster: RosterSnapshot;
}

/** One method per roster endpoint. Statless: every mutation returns the full
 * updated roster, so a screen just redraws from the result. A 400 rejects the 
 * promise with an HttpErrorResponse; the calling screen decides what to show.
 */
@Service()
export class RosterService {
    private http = inject(HttpClient);

    getRoster(): Promise<RosterSnapshot> {
        return firstValueFrom(
            this.http.get<RosterSnapshot>(`${apiBaseUrl()}/api/roster`)
        );
    }

    createHero(request: CreateHeroRequest): Promise<CreateHeroResult> {
        return firstValueFrom(
            this.http.post<CreateHeroResult>(`${apiBaseUrl()}/api/roster/create`, request)
        );
    }

    /** entry is the 1-20 number the player sees. */
    terminateHero(entry: number): Promise<TerminateHeroResult> {
        return firstValueFrom(
            this.http.post<TerminateHeroResult>(`${apiBaseUrl()}/api/roster/terminate`, { entry })
        );
    }

    /** entries are four roster entries (1-20) in party order. */
    formParty(entries: number[]): Promise<FormPartyResult> {
        return firstValueFrom(
            this.http.post<FormPartyResult>(`${apiBaseUrl()}/api/party/form`, { entries })
        );
    }

    disperse(): Promise<RosterSnapshot> {
        return firstValueFrom(
            this.http.post<RosterSnapshot>(`${apiBaseUrl()}/api/party/disperse`, {})
        );
    }
}