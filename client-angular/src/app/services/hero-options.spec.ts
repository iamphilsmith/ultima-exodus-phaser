import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HeroOptionsData, HeroOptionsService } from './hero-options';

const DATA: HeroOptionsData = {
    sexes: [{ name: 'Male', initial: 'M' }, { name: 'Female', initial: 'F' }],
    races: [{ name: 'Human', initial: 'H' }],
    classes: [{ name: 'Fighter', initial: 'F' }],
    limits: { maxNameLength: 12, minStat: 0, maxStat: 25, statTotal: 50, rosterSize: 20, partySize: 4 },
};

describe('HeroOptionsService', () => {
    let service: HeroOptionsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(HeroOptionsService);
        http = TestBed.inject(HttpTestingController);
    });

    it('exposes the loaded options', async () => {
        const loading = service.load();
        http.expectOne((req) => req.url.endsWith('/api/hero-options')).flush(DATA);
        await loading;

        expect(service.options).toEqual(DATA);
        expect(service.options.limits.statTotal).toBe(50);
    });

    it('makes only one request however many times load() is called', async () => {
        const first = service.load();
        const second = service.load();
        http.expectOne((req) => req.url.endsWith('/api/hero-options')).flush(DATA);
        await Promise.all([first, second]);
        http.verify();
    });

    it('throws if read before it has loaded', () => {
        expect(() => service.options).toThrow();
    });

    it('allows a retry after a failed load', async () => {
        const failed = service.load();
        http.expectOne((req) => req.url.endsWith('/api/hero-options'))
            .flush('boom', { status: 500, statusText: 'Server Error' });
        await expect(failed).rejects.toBeTruthy();

        const retry = service.load();
        http.expectOne((req) => req.url.endsWith('/api/hero-options')).flush(DATA);
        await retry;
        expect(service.options).toEqual(DATA);
    });
});