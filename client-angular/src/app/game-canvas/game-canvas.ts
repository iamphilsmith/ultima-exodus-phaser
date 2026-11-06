import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { GameService } from '../services/game';
import { WorldScene } from '../game/world-scene';
import { MapService } from '../services/map';
import { TileCatalogueService } from '../services/tile-catalogue';
import Phaser from 'phaser';
import { PartyOrganizationScene } from '../game/party-organization-scene';
import { RosterService } from '../services/roster';
import { HeroOptionsService } from '../services/hero-options';

@Component({
  selector: 'app-game-canvas',
  standalone: true,
  templateUrl: './game-canvas.html',
  styleUrl: './game-canvas.css'
})
export class GameCanvas implements AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef<HTMLDivElement>;

  private game?: Phaser.Game;
  private overworld = inject(GameService);
  private mapService = inject(MapService);
  private tileCatalogue = inject(TileCatalogueService);
  private rosterService = inject(RosterService);
  private heroOptions = inject(HeroOptionsService);

  ngAfterViewInit(): void {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 320,
      height: 192,
      zoom: 3,
      parent: this.gameContainer.nativeElement,
      backgroundColor: '#000000',
      pixelArt: true,
      scene: [
        new WorldScene(this.overworld, this.mapService, this.tileCatalogue), 
        new PartyOrganizationScene(this.rosterService, this.heroOptions)
      ]
    });
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
  }
}