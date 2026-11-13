import { InputService } from './input-service'
import { InputDirection } from './input-direction'
import { CompassDirection, GameStateSnapshot, LogEntry, GameService, PartyStatus } from '../services/game';
import { MapView } from './map-view';
import { OverworldView } from './overworld-view';
import { ConflictView } from './conflict-view';
import { TileCatalogueService } from '../services/tile-catalogue';
import { logRows } from './log-rows';
import { partyRows } from './party-rows';
import { loadSpritesheetOnce } from './assets';
import { PendingAttack } from './pending-attack';
import { MapCategory, MapData, MapService } from '../services/map';

import Phaser from 'phaser';
import {
  BORDER,
  CANVAS_W,
  CANVAS_H,
  CHAR_H,
  CHAR_W,
  MAP_X,
  MAP_PX,
  PANEL_X,
  PARTY_H,
  LOG_Y,
  LOG_ROWS,
  EGA_BLUE,
  EGA_CYAN,
  EGA_WHITE,
  CHAR_ARROW_RIGHT,
  PANEL_W_CHARS
} from './shell-layout';
import { charFrame, writeText } from './bitmap-text';

// Overworld interpretation of the keys. Moves into the overworld view in step 18
const OVERWORLD_COMPASS: Record<InputDirection, CompassDirection> = {
  [InputDirection.Up]: 'North',
  [InputDirection.Right]: 'East',
  [InputDirection.Down]: 'South',
  [InputDirection.Left]: 'West'
};

export class WorldScene extends Phaser.Scene {
  private logLines: Phaser.GameObjects.Image[][] = [];
  private logMessages: string[] = ['', '', '', '', '', '', ''];
  private partyObjects: Phaser.GameObjects.GameObject[] = [];
  private inputService!: InputService;
  private requestInFlight = false;
  private mapView?: MapView;
  private pendingAttack = new PendingAttack();
  private serverLog: LogEntry[] = [];
  private localLog: LogEntry[] = []; // client-only prompts, dropped at the next snapshot

  constructor(
    private readonly gameService: GameService,
    private readonly mapService: MapService,
    private readonly tileCatalogue: TileCatalogueService

  ) {
    super('world');
  }



  preload(): void {
    loadSpritesheetOnce(this, 'chars', 'assets/sprites/charset.png');
    loadSpritesheetOnce(this, 'tiles', 'assets/sprites/shapes.png');
  }

  create(): void {
    // This scene is restarted when the player returns from party organisation, and a
    // restart reuses this same object: drop anything left over from last time.
    this.mapView = undefined;
    this.requestInFlight = false;
    this.partyObjects = [];

    this.drawBorder();
    this.drawMoonPhase();
    this.drawWindDirection();
    this.drawPartyPanelFooter();
    this.drawLogPanel();
    this.refreshLog();
    this.pendingAttack = new PendingAttack();
    this.serverLog = [];
    this.localLog = [];

    this.inputService = new InputService(this);
    this.inputService.onMove((direction) => void this.handleMove(direction));
    this.inputService.onInteract(() => void this.handleInteract());
    this.inputService.onAttack(() => this.handleAttackKey());
    this.inputService.onCancel(() => this.handleCancel());
    void this.restoreState();
  }

  override update(): void {
    this.inputService.update();
  }

  private async restoreState(): Promise<void> {
    // Ignore keys until the saved state is on screen.
    this.requestInFlight = true;
    try {
      await this.applySnapshot(await this.gameService.getState());
    } catch (error) {
      console.error('Could not restore savedstate:', error);
    } finally {
      this.requestInFlight = false;
    }
  }

  /** Run a server call and put its snapshot on screen. One request at a time:
   *  overlapping calls would race on the server. */
  private async request(action: () => Promise<GameStateSnapshot>, failureMessage: string): Promise<void> {
    if (this.requestInFlight) return;
    this.requestInFlight = true;
    try {
      await this.applySnapshot(await action());
    } catch (error) {
      console.error(failureMessage, error);
    } finally {
      this.requestInFlight = false;
    }
  }

    private async handleMove(direction: InputDirection): Promise<void> {
    // If an attack is waiting for a direction, this key answers it instead of moving.
    if (this.pendingAttack.take()) {
      return this.request(
        () => this.gameService.attack(OVERWORLD_COMPASS[direction]),
        'Attack failed:'
      );
    }
    return this.request(() => this.gameService.move(OVERWORLD_COMPASS[direction]), 'Move failed:');
  }

  private handleInteract(): Promise<void> {
    if (this.pendingAttack.isWaiting) return Promise.resolve();
    return this.request(() => this.gameService.interact(), 'Interact failed:');
  }

  private handleAttackKey(): void {
    if (this.requestInFlight) return;
    if (this.pendingAttack.start()) {
      this.showLocalLine('Direction?');
    }
  }

  private handleCancel(): void {
    if (this.pendingAttack.cancel()) {
      this.showLocalLine('Attack cancelled');
    }
  }

  /** Show a client-only line after the server's log. The next snapshot replaces it. */
  private showLocalLine(text: string): void {
    this.localLog.push({ text });
    this.showLog([...this.serverLog, ...this.localLog]);
  }

  /** Put a snapshot on screen: the viewport with fog, and the log panel. */
  private async applySnapshot(snapshot: GameStateSnapshot): Promise<void> {
    const [map] = await Promise.all([
      this.mapService.getMap(snapshot.position.category, snapshot.position.mapId),
      this.tileCatalogue.load(), // no-op after the first call
    ]);

    let view = this.mapView;
    if (view?.mapId !== map.mapId) {
      view?.destroy();
      view = this.createView(map);
      this.mapView = view;
    }
    view.render(snapshot.position);

    this.serverLog = snapshot.log;
    this.localLog = [];
    this.showLog(snapshot.log);
    this.showParty(snapshot.party);
  }

  /** A conflict map is a fixed grid; every other map scrolls around the party. */
  private createView(map: MapData): MapView {
    return map.category === MapCategory.Conflict
      ? new ConflictView(this, map)
      : new OverworldView(this, map, this.tileCatalogue);
  }

  private drawBorder(): void {
    const g = this.add.graphics();
    g.setDepth(2);
    g.fillStyle(EGA_BLUE);
    g.fillRect(0, 0, BORDER, CANVAS_H);
    g.fillRect(CANVAS_W - BORDER, 0, BORDER, (CHAR_H * 4) * 4 + BORDER);
    g.fillRect(0, 0, MAP_X + MAP_PX + BORDER, BORDER);
    g.fillRect(0, CANVAS_H - BORDER, MAP_X + MAP_PX + BORDER, BORDER);
    g.fillRect(MAP_X + MAP_PX, 0, BORDER, CANVAS_H);
  }

  private drawMoonPhase(): void {
    const text = '\x10(0)(1)\x11';
    const mapCentreX = MAP_X + Math.floor(MAP_PX / 2);
    const startX = mapCentreX - Math.floor(text.length * CHAR_W) / 2;
    writeText(this, text, startX, 0, EGA_CYAN);
  }

  drawWindDirection(): void {
    const text = '\x10South Wind\x11';
    const mapCentreX = MAP_X + Math.floor(MAP_PX / 2);
    const startX = mapCentreX - Math.floor(text.length * CHAR_W) / 2;
    writeText(this, text, startX, CANVAS_H - CHAR_H, EGA_CYAN);
  }

  /** The fixed blue bar under the party panel. The members are drawn by showParty(). */
  private drawPartyPanelFooter(): void {
    const g = this.add.graphics().setDepth(30);
    g.fillStyle(EGA_BLUE);
    g.fillRect(PANEL_X, PARTY_H, CHAR_W * PANEL_W_CHARS, BORDER);
  }

  /** Draw the party panel from the server's snapshot, replacing whatever was there. */
  private showParty(party: PartyStatus): void {
    this.partyObjects.forEach(object => object.destroy());
    this.partyObjects = [];

    const sectionH = CHAR_H * 4;
    party.members.slice(0, PARTY_H / sectionH).forEach((member, i) => {
      const baseY = i * sectionH;
      const rows = partyRows(member);

      const bar = this.add.graphics().setDepth(30);
      bar.fillStyle(EGA_BLUE);
      bar.fillRect(PANEL_X, baseY, CHAR_W * PANEL_W_CHARS, CHAR_H);
      this.partyObjects.push(bar);

      this.partyObjects.push(
        ...writeText(this, rows.header, PANEL_X + rows.headerColumn * CHAR_W, baseY, EGA_CYAN),
        ...writeText(this, rows.name, PANEL_X, baseY + CHAR_H, EGA_WHITE),
        ...writeText(this, rows.stats, PANEL_X, baseY + CHAR_H * 2, EGA_CYAN),
        ...writeText(this, rows.vitals, PANEL_X, baseY + CHAR_H * 3, EGA_CYAN),
      );
    });
  }

  private drawLogPanel(): void {
    for (let row = 0; row < LOG_ROWS; row++) {
      this.logLines[row] = [];
      for (let col = 0; col < PANEL_W_CHARS; col++) {
        const img = this.add.image(
          PANEL_X + col * CHAR_W,
          LOG_Y + row * CHAR_H,
          'chars',
          0
        );
        img.setOrigin(0, 0);
        img.setDisplaySize(CHAR_W, CHAR_H);
        img.setDepth(31);
        img.setTint(EGA_CYAN);
        img.setVisible(false);
        this.logLines[row][col] = img;
      }
    }
  }

  /** Show the server's log: the newest LOG_ROWS entries, newest on the bottom row. */
  private showLog(entries: LogEntry[]): void {
    this.logMessages = logRows(entries, LOG_ROWS);
    this.refreshLog();
  }

  private refreshLog(): void {
    this.logMessages.forEach((msg, row) => {
      const line = this.logLines[row];
      if (!line) return;
      line[0].setFrame(CHAR_ARROW_RIGHT);
      line[0].setVisible(true);
      for (let col = 1; col < PANEL_W_CHARS; col++) {
        const ch = msg[col - 1];
        if (ch) {
          line[col].setFrame(charFrame(ch));
          line[col].setVisible(true);
        } else {
          line[col].setVisible(false);
        }
      }
    });
  }
}