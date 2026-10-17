import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { OverworldService } from '../services/overworld';
import { WorldScene } from '../game/world-scene';
import { MapService } from '../services/map';
import Phaser from 'phaser';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  templateUrl: './game-canvas.html',
  styleUrl: './game-canvas.css'
})
export class GameCanvas implements AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef<HTMLDivElement>;

  private game?: Phaser.Game;
  private overworld = inject(OverworldService);
  private mapService = inject(MapService);

  ngAfterViewInit(): void {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 320,
      height: 192,
      zoom: 3,
      parent: this.gameContainer.nativeElement,
      backgroundColor: '#000000',
      pixelArt: true,
      scene: [new WorldScene(this.overworld, this.mapService)]
    });
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
  }
}