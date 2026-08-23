import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
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

  ngAfterViewInit(): void {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 320,
      height: 192,
      zoom: 3,
      parent: this.gameContainer.nativeElement,
      backgroundColor: '#000000',
      scene: {
        create() {
          // intentionally empty — Step 5 verifies mount/unmount only
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
  }
}