import Phaser from 'phaser';
import { RosterService } from '../services/roster';
import { HeroOptionsService } from '../services/hero-options';
import { OrgView } from './org/org-view';
import { OptionsMenuView } from './org/options-menu-view';
import { loadSpritesheetOnce } from './assets';
import { BORDER, CANVAS_H, CANVAS_W, EGA_BLUE } from './shell-layout';

interface PartyOrganizationData {
  /** Scene key to return to when the player leaves. Defaults to 'world'. */
  exitTo?: string;
}

export class PartyOrganizationScene extends Phaser.Scene {
  private currentView?: OrgView;
  private exitTo = 'world';

  constructor(
    private readonly rosterService: RosterService,
    private readonly heroOptions: HeroOptionsService,
  ) {
    super('organize-party');
  }

  init(data: PartyOrganizationData): void {
    this.exitTo = data?.exitTo ?? 'world';
    this.currentView = undefined;
  }

  preload(): void {
    loadSpritesheetOnce(this, 'chars', 'assets/sprites/charset.png');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');
    this.drawBorder();

    // Whatever way the scene ends, make sure the current screen lets go of its keys.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.currentView?.teardown());

    this.switchView(new OptionsMenuView());
  }

  /** Screens call this (through the context) to replace themselves with another. */
  private switchView = (view: OrgView): void => {
    this.currentView?.teardown();
    this.currentView = view;
    void view.load({
      scene: this,
      roster: this.rosterService,
      heroOptions: this.heroOptions,
      exit: () => this.scene.start(this.exitTo),
      switchView: this.switchView,
    });
  };

  private drawBorder(): void {
    const g = this.add.graphics();
    g.setDepth(2);
    g.fillStyle(EGA_BLUE);
    g.fillRect(0, 0, BORDER, CANVAS_H);                      // left
    g.fillRect(0, 0, CANVAS_W, BORDER);                      // top
    g.fillRect(0, CANVAS_H - BORDER, CANVAS_W, BORDER);      // bottom
    g.fillRect(CANVAS_W - BORDER, 0, BORDER, CANVAS_H);      // right
  }
}