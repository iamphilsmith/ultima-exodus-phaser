import { Component, OnInit, signal } from '@angular/core';
//import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GameCanvas } from './game-canvas/game-canvas';

@Component({
//  imports: [RouterOutlet],
  selector: 'app-root',
  standalone: true,
  imports: [GameCanvas],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  healthStatus = signal<string>('checking...');

  constructor(private http: HttpClient) {}

  private apiBaseUrl(): string {
    const { hostname } = window.location;
    if (hostname.endsWith('.app.github.dev')) {
      // Codespaces: swap the Angular port (4200) for the API's port (5223)
      const apiHost = hostname.replace(/-4200\.app\.github\.dev$/, '-5223.app.github.dev');
      return `https://${apiHost}`;
    }
    return 'http://localhost:5223'; // local dev
  }

  ngOnInit(): void {
    this.http.get<{ status: string }>(`${this.apiBaseUrl()}/api/health`)
      .subscribe({
        next: (response) => this.healthStatus.set(response.status),
        error: (error) => this.healthStatus.set(`error: ${error.message}`),
      });
  }

}
