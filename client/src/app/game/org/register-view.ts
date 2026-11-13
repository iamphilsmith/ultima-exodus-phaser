import Phaser from 'phaser';
import { OrgContext, OrgView } from './org-view';
import { registerRows } from './register-rows';
import { RosterSnapshot } from '../../services/roster';
import { writeText, writeTextCentered } from '../bitmap-text';
import { EGA_BRIGHT_BLUE, EGA_GREEN, EGA_RED, EGA_WHITE } from '../shell-layout';

const ROW_X = 20;
const ROW_START_Y = 22;
const ROW_HEIGHT = 8;

const TINT = { empty: EGA_WHITE, party: EGA_RED, reserve: EGA_BRIGHT_BLUE } as const;

export class RegisterView implements OrgView {
    private context?: OrgContext;
    private images: Phaser.GameObjects.Image[] = [];
    private closed = false;

    async load(context: OrgContext): Promise<void> {
        this.context = context;
        const scene = context.scene;

        this.images.push(...writeTextCentered(scene, 'REGISTER', 11, EGA_GREEN));

        try {
            const roster = await context.roster.getRoster();
            if (this.closed) return;
            this.renderRoster(roster);
        } catch (error) {
            console.error('Failed to load roster:', error);
            if (this.closed) return;
            this.images.push(...writeTextCentered(scene, 'Register unavailable', 100, EGA_RED));
        }

        // Listen only now: the keypress that opened this screen must not also close it.
        scene.input.keyboard?.on('keydown', this.handleAnyKey);
    }

    teardown(): void {
        this.closed = true;
        this.context?.scene.input.keyboard?.off('keydown', this.handleAnyKey);
        this.images.forEach(image => image.destroy());
        this.images = [];
    }

    private handleAnyKey = (): void => this.context?.showMenu();

    private renderRoster(roster: RosterSnapshot): void {
        registerRows(roster.entries).forEach((row,i) => {
            this.images.push(
                ...writeText(this.context!.scene, row.text, ROW_X, ROW_START_Y + i * ROW_HEIGHT, TINT[row.kind])
            );
        })
    }
}