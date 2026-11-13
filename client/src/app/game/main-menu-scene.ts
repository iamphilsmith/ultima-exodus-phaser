import Phaser from 'phaser';
import { RosterService } from '../services/roster';
import { loadSpritesheetOnce } from './assets';
import { writeTextCentered } from './bitmap-text';
import { MenuKey, MenuOutcome, menuOutcome, NEED_PARTY_MESSAGE } from './menu/main-menu-actions';
import { EGA_CYAN, EGA_RED, EGA_WHITE } from './shell-layout';

const MESSAGE_Y = 140;
const MENU_KEYS: readonly MenuKey[] = ['R', 'O', 'J'];

export class MainMenuScene extends Phaser.Scene {
  private messageImages: Phaser.GameObjects.Image[] = [];
  /** True while a key is being handled, so a second press can't start a second transition. */
  private busy = false;

  private readonly handlers: Record<MenuKey, () => void> = {
    R: () => void this.handleKey('R'),
    O: () => void this.handleKey('O'),
    J: () => void this.handleKey('J'),
  };

  constructor(private readonly rosterService: RosterService) {
    super('main-menu');
  }

  /** Runs on every visit. Field initialisers only run once, so reset here. */
  init(): void {
    this.messageImages = [];
    this.busy = false;
  }

  preload(): void {
    loadSpritesheetOnce(this, 'chars', 'assets/sprites/charset.png');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');

    writeTextCentered(this, 'EXODUS', 12, EGA_WHITE, 3);
    writeTextCentered(this, 'From the depths of hell...', 56, EGA_CYAN);
    writeTextCentered(this, '...he comes for VENGEANCE!', 66, EGA_CYAN);

    writeTextCentered(this, 'Option:\x1e', 92, EGA_WHITE);
    writeTextCentered(this, 'Return to the View', 106, EGA_CYAN);
    writeTextCentered(this, 'Organize a Party', 116, EGA_CYAN);
    writeTextCentered(this, 'Journey Onward', 126, EGA_CYAN);

    writeTextCentered(this, '(C)-1983 By James R. Van Artsdalen', 160, EGA_WHITE);
    writeTextCentered(this, 'and Lord British', 170, EGA_WHITE);

    for (const key of MENU_KEYS) {
      this.input.keyboard?.on(`keydown-${key}`, this.handlers[key]);
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const key of MENU_KEYS) {
        this.input.keyboard?.off(`keydown-${key}`, this.handlers[key]);
      }
    });
  }

  private async handleKey(key: MenuKey): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.clearMessage();

    try {
      // Only Journey Onward depends on the party, so only it asks the server.
      const partyFormed = key === 'J' && (await this.rosterService.getRoster()).partyFormed;
      const outcome = menuOutcome(key, partyFormed);

      if (outcome !== 'need-party') {
        this.leave(outcome);
        return; // busy stays true: this scene is on its way out
      }
      this.showMessage(NEED_PARTY_MESSAGE);
    } catch (error) {
      console.error('Main menu could not reach the server:', error);
      this.showMessage('Server unavailable');
    }

    this.busy = false;
  }

  private leave(outcome: Exclude<MenuOutcome, 'need-party'>): void {
    switch (outcome) {
      case 'intro':
        this.scene.start('intro');
        break;
      case 'organize':
        this.scene.start('organize-party', { exitTo: 'main-menu' });
        break;
      case 'journey':
        this.scene.start('world');
        break;
    }
  }

  private showMessage(text: string): void {
    this.clearMessage();
    this.messageImages = writeTextCentered(this, text, MESSAGE_Y, EGA_RED);
  }

  private clearMessage(): void {
    this.messageImages.forEach(image => image.destroy());
    this.messageImages = [];
  }
}