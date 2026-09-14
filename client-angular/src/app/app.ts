import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameCanvas } from './game-canvas/game-canvas';
import { apiBaseUrl } from './utils/api-base-url';
import { MapCategory, MapService } from './services/map';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameCanvas],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  healthStatus = signal<string>('checking...');

  constructor(private http: HttpClient, private mapService: MapService) {}

  async ngOnInit(): Promise<void> {
    this.http.get<{ status: string }>(`${apiBaseUrl()}/api/health`)
      .subscribe({
        next: (response) => this.healthStatus.set(response.status),
        error: (error) => this.healthStatus.set(`error: ${error.message}`),
      });

    const first = await this.mapService.getMap(MapCategory.World, 'world-sosaria');
    console.log('Map loaded:', first);

    const second = await this.mapService.getMap(MapCategory.World, 'world-sosaria');
    console.log('Map loaded (should be cached):', second);
  }
}