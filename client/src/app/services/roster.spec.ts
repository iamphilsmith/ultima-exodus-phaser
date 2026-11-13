import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CreateHeroRequest, RosterService, RosterSnapshot } from './roster';

const ROSTER: RosterSnapshot = {
    entries: Array.from({ length: 20 }, (_, i) => ({ entry: i + 1, hero: null, partyPosition: null })),
    partyFormed: false,
};

const REQUEST: CreateHeroRequest = {
    name: 'Phil', sex: 'Male', race: 'Human', class: 'Fighter',
    strength: 10, dexterity: 10, intelligence: 15, wisdom: 15,
};

describe('RosterService', () => {
    let service: RosterService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(RosterService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('getRoster GETs /api/roster', async () => {
        const result = service.getRoster();
        const req = http.expectOne((r) => r.url.endsWith('/api/roster'));
        expect(req.request.method).toBe('GET');
        req.flush(ROSTER);

        expect(await result).toEqual(ROSTER);
    });

    it('createHero POSTs the request and returns the result', async () => {
        const result = service.createHero(REQUEST);
        const req = http.expectOne((r) => r.url.endsWith('/api/roster/create'));
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(REQUEST);
        req.flush({ status: 'Created', entry: 1, roster: ROSTER });

        expect((await result).status).toBe('Created');
    });

    it('createHero rejects when the server answers 400', async () => {
        const result = service.createHero(REQUEST);
        http.expectOne((r) => r.url.endsWith('/api/roster/create'))
            .flush('Invalid hero: StatTotalWrong', { status: 400, statusText: 'Bad Request' });

        await expect(result).rejects.toBeTruthy();
    });

    it('terminateHero POSTs the entry number', async () => {
        const result = service.terminateHero(7);
        const req = http.expectOne((r) => r.url.endsWith('/api/roster/terminate'));
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ entry: 7 });
        req.flush({ status: 'Terminated', roster: ROSTER });

        expect((await result).status).toBe('Terminated');
    });

    it('formParty POSTs the entries in party order', async () => {
        const result = service.formParty([3, 1, 4, 2]);
        const req = http.expectOne((r) => r.url.endsWith('/api/party/form'));
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ entries: [3, 1, 4, 2] });
        req.flush({ status: 'Formed', roster: ROSTER });

        expect((await result).status).toBe('Formed');
    });

    it('disperse POSTs to /api/party/disperse and returns the roster', async () => {
        const result = service.disperse();
        const req = http.expectOne((r) => r.url.endsWith('/api/party/disperse'));
        expect(req.request.method).toBe('POST');
        req.flush(ROSTER);

        expect((await result).partyFormed).toBe(false);
    });
});