import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameCanvas } from './game-canvas/game-canvas';
import { apiBaseUrl } from './utils/api-base-url';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameCanvas],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  healthStatus = signal<string>('checking...');

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<{ status: string }>(`${apiBaseUrl()}/api/health`)
      .subscribe({
        next: (response) => this.healthStatus.set(response.status),
        error: (error) => this.healthStatus.set(`error: ${error.message}`),
      });
  }
}