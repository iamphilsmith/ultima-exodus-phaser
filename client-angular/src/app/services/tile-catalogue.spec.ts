import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TileCatalogueData, TileCatalogueService } from './tile-catalogue';

const DATA: TileCatalogueData = {
    default: { solid: false, visionBlocking: false },
    overrides: {
        '0': { solid: true, visionBlocking: false },
        '3': { solid: false, visionBlocking: true },
        },
    }

describe('TileCatalogueService', () => {
    let service: TileCatalogueService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(TileCatalogueService);
        http = TestBed.inject(HttpTestingController);
    });

    it('returns overrides and falls back to the default', async () => {
        const loading = service.load();
        http.expectOne((req) => req.url.endsWith('/api/tiles')).flush(DATA);
        await loading;

        expect(service.getProperties(0).solid).toBe(true);
        expect(service.getProperties(3).visionBlocking).toBe(true);
        expect(service.getProperties(7)).toEqual(DATA.default);
    });

    it('makes only one request however many times load() is called', async () => {
        const first = service.load();
        const second = service.load();
        http.expectOne((req) => req.url.endsWith('/api/tiles')).flush(DATA);
        await Promise.all([first, second]);
        http.verify();
    });

    it('throws if used before it has loaded', () => {
        expect(() => service.getProperties(0)).toThrow();
    });
});