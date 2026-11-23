import Phaser from 'phaser';
import { OrgContext, OrgView } from './org-view';
import { TerminateCharacterForm } from './terminate-character-form';
import { writeText, writeTextCentered } from '../bitmap-text';
import { EGA_CYAN, EGA_GREEN, EGA_RED, EGA_WHITE } from '../shell-layout';

const LABEL_X = 24;
const TITLE_Y = 30;
const PROMPT_Y = 54;
const MESSAGE_Y = 80;
const MESSAGE_LINE_HEIGHT = 10;

export class TerminateCharacterView implements OrgView {
    private context?: OrgContext;
    private form?: TerminateCharacterForm;
    private images: Phaser.GameObjects.Image[] = [];
    private closed = false;

    async load(context: OrgContext): Promise<void> {
        this.context = context;

        try {
            await context.heroOptions.load();
            if (this.closed) return; // the player left before the answer arrived

            this.form = new TerminateCharacterForm(context.heroOptions.options.limits);
            this.redraw();            
        } catch (error) {
            console.error('Could not open Terminate Character:', error);
            if (this.closed) return;
            this.showMessage('Server unavailable');
        }

        // Listen only now: the keypress that opened this screen must not be typed into the form
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

        if (!this.form) {
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
        if (!context || !form) return;

        try {
            const result = await context.roster.terminateHero(form.pendingEntry);            
            if (this.closed) return;
            form.applyResult(result.status);
        } catch (error) {
            console.error('Could not terminate the character:', error);
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
        this.images.push(...writeTextCentered(scene, 'TERMINATE A CHARACTER', TITLE_Y, EGA_GREEN));

        if (form.prompt) {
            this.images.push(...writeText(scene, form.prompt, LABEL_X, PROMPT_Y, EGA_WHITE));
        }

        const tint = form.messageKind === 'result' ? EGA_RED : EGA_CYAN;
        form.messageLines.forEach((text,i) => {
            this.images.push(...writeTextCentered(scene, text, MESSAGE_Y + i * MESSAGE_LINE_HEIGHT, tint));
        })
    }

    private showMessage(text: string): void {
        const scene = this.context?.scene;
        if (!scene) return;

        this.clear();
        this.images.push(
            ...writeTextCentered(scene, text, 80, EGA_RED),
            ...writeTextCentered(scene, 'Press any key to return', 96, EGA_WHITE)
        );
    }

    private clear(): void {
        this.images.forEach(image => image.destroy());
        this.images = [];
    }
}
