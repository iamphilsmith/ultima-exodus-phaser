import Phaser from 'phaser';
import { OrgContext, OrgView } from './org-view';
import { FormPartyForm } from './form-party-form';
import { writeText, writeTextCentered } from '../bitmap-text';
import { EGA_CYAN, EGA_GREEN, EGA_RED, EGA_WHITE } from '../shell-layout';

const LABEL_X = 24;
const TITLE_Y = 30;
const ROW_Y = 54;
const ROW_HEIGHT = 12;
const MESSAGE_Y = 120;

export class FormPartyView implements OrgView {
    private context?: OrgContext;
    private form?: FormPartyForm;
    private images: Phaser.GameObjects.Image[] = [];
    private closed = false;

    async load(context: OrgContext): Promise<void> {
        this.context = context;

        try {
            await context.heroOptions.load();
            const roster = await context.roster.getRoster();
            if (this.closed) return;   // the player left before the answers arrived

            this.form = new FormPartyForm(context.heroOptions.options.limits);
            if (roster.partyFormed) this.form.applyResult('AlreadyFormed');
            this.redraw();
        } catch (error) {
            console.error('Could not open Form Party:', error);
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

        if (!this.form) {          // server unavailable: any key leaves
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
            const result = await context.roster.formParty(form.toEntries());
            if (this.closed) return;
            form.applyResult(result.status);
        } catch (error) {
            console.error('Could not form the party:', error);
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
        this.images.push(...writeTextCentered(scene, 'FORM A PARTY', TITLE_Y, EGA_GREEN));

        form.rows().forEach((row, i) => {
            const marker = row.active ? ' \x1e' : '';
            this.images.push(...writeText(
                scene, `${row.label} ${row.value}${marker}`,
                LABEL_X, ROW_Y + i * ROW_HEIGHT, row.active ? EGA_WHITE : EGA_CYAN));
        });

        if (form.message) {
            this.images.push(...writeTextCentered(scene, form.message, MESSAGE_Y, EGA_RED));
        }
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