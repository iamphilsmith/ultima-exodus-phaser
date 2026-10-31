import Phaser from 'phaser';
import { RosterService } from '../../services/roster';
import { HeroOptionsService } from '../../services/hero-options';

/** Everything a party-organisation screen needs, supplied by the scene. */
export interface OrgContext {
    scene: Phaser.Scene;
    roster: RosterService;
    heroOptions: HeroOptionsService;
    /** Leave party organisation (back to wherever the scene was opened from). */
    exit: () => void;
    /** Replace the current screen with another. */
    switchView: (view: OrgView) => void;
}

export interface OrgView {
    load(context: OrgContext): void | Promise<void>;
    /** Remove everything the view drew and every key listener it added. Safe to call twice. */
    teardown(): void;
}