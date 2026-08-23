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

  ngOnInit(): void {
    this.http.get<{ status: string }>('https://localhost:7107/api/health')
      .subscribe({
        next: (response) => this.healthStatus.set(response.status),
        error: (error) => this.healthStatus.set(`error: ${error.message}`),
      });
  }

}
