import Phaser from 'phaser';
import { OrgContext, OrgView } from './org-view';
import { CreateCharacterForm } from './create-character-form';
import { writeText, writeTextCentered } from '../bitmap-text';
import { EGA_CYAN, EGA_GREEN, EGA_RED, EGA_WHITE } from '../shell-layout';

const LABEL_X = 24;
const HEADER_Y = 20;
const LINE_Y = [34, 44, 54, 64, 78, 88, 98, 108];   // name, sex, race, type, then the four stats
const PROMPT_Y = 126;
const STATUS_Y = 150;
const STATUS_LINE_HEIGHT = 10;

export class CreateCharacterView implements OrgView {
    private context?: OrgContext;
    private form?: CreateCharacterForm;
    private images: Phaser.GameObjects.Image[] = [];
    private closed = false;

    async load(context: OrgContext): Promise<void> {
        this.context = context;

        try {
            await context.heroOptions.load();
            const roster = await context.roster.getRoster();
            if (this.closed) return;   // the player left before the answers arrived

            const options = context.heroOptions.options;
            const free = roster.entries.find(entry => !entry.hero);
            if (free) {
                this.form = new CreateCharacterForm(options, free.entry);
                this.redraw();
            } else {
                this.showMessage(`Roster is full (${options.limits.rosterSize}/${options.limits.rosterSize})`);
            }
        } catch (error) {
            console.error('Could not open Create Character:', error);
            if (this.closed) return;
            this.showMessage('Server unavailable');
        }

        // Listen only now: the keypress that opened this screen must not be typed into it.
        context.scene.input.keyboard?.on('keydown', this.handleKeyDown);
    }

    teardown(): void {
        this.closed = true;
        this.context?.scene.input.keyboard?.off('keydown', this.handleKeyDown);
        this.clear();
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        const context = this.context;
        if (!context) return;

        if (!this.form) {          // roster full or server unavailable: any key leaves
            context.showMenu();
            return;
        }

        const outcome = this.form.handleKey(event.key);
        if (outcome === 'menu') {
            context.showMenu();
            return;
        }
        if (outcome === 'submit') void this.submit();
        this.redraw();
    };

    private async submit(): Promise<void> {
        const form = this.form;
        const context = this.context;
        if (!form || !context) return;

        try {
            const result = await context.roster.createHero(form.toRequest());
            if (this.closed) return;
            if (result.status === 'Created') form.submitSucceeded();
            else form.submitRosterFull();
        } catch (error) {
            console.error('Could not create the character:', error);
            if (this.closed) return;
            form.submitFailed();
        }
        this.redraw();
    }

    private redraw(): void {
        const form = this.form;
        const scene = this.context?.scene;
        if (!form || !scene) return;

        this.clear();
        this.images.push(...writeTextCentered(scene, form.header, HEADER_Y, EGA_GREEN));

        form.lines().forEach((line, i) => {
            const marker = line.active ? ' \x1e' : '';
            this.images.push(...writeText(
                scene, `${line.label} ${line.value}${marker}`,
                LABEL_X, LINE_Y[i], line.active ? EGA_WHITE : EGA_CYAN));
        });

        if (form.prompt) {
            this.images.push(...writeTextCentered(scene, form.prompt, PROMPT_Y, EGA_WHITE));
        }

        form.statusLines.forEach((text, i) => {
            this.images.push(...writeTextCentered(scene, text, STATUS_Y + i * STATUS_LINE_HEIGHT, EGA_RED));
        });
    }

    private showMessage(text: string): void {
        const scene = this.context?.scene;
        if (!scene) return;
        this.clear();
        this.images.push(
            ...writeTextCentered(scene, text, 80, EGA_RED),
            ...writeTextCentered(scene, 'Press any key to return', 96, EGA_WHITE),
        );
    }

    private clear(): void {
        this.images.forEach(image => image.destroy());
        this.images = [];
    }
}