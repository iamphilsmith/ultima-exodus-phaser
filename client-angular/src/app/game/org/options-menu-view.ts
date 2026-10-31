import Phaser from 'phaser';
import { OrgContext, OrgView } from './org-view';
import { RegisterView } from './register-view';
import { writeTextCentered } from '../bitmap-text';
import { EGA_CYAN, EGA_GREEN, EGA_RED, EGA_WHITE } from '../shell-layout';
import { CreateCharacterView } from './create-character-view';

const STATUS_Y = 150;

export class OptionsMenuView implements OrgView {
    private context?: OrgContext;
    private images: Phaser.GameObjects.Image[] = [];
    private statusImages: Phaser.GameObjects.Image[] = [];
    private closed = false;

    load(context: OrgContext): void {
        this.context = context;
        const scene = context.scene;

        this.images.push(
            ...writeTextCentered(scene, 'EXODUS', 10, EGA_WHITE, 2),
            ...writeTextCentered(scene, 'PARTY ORGANIZATION', 34, EGA_GREEN),
            ...writeTextCentered(scene, 'OPTIONS:', 48, EGA_RED),
            ...writeTextCentered(scene, 'Examine the register', 66, EGA_CYAN),
            ...writeTextCentered(scene, 'Create a character', 76, EGA_CYAN),
            ...writeTextCentered(scene, 'Form a party', 86, EGA_CYAN),
            ...writeTextCentered(scene, 'Disperse a Party', 96, EGA_CYAN),
            ...writeTextCentered(scene, 'Terminate a character', 106, EGA_CYAN),
            ...writeTextCentered(scene, 'Main  menu', 122, EGA_WHITE),
        );

        const keyboard = scene.input.keyboard;
        keyboard?.on('keydown-E', this.handleExamine);
        keyboard?.on('keydown-C', this.handleCreate);
        keyboard?.on('keydown-D', this.handleDisperse);
        keyboard?.on('keydown-M', this.handleMainMenu);
    }

    teardown(): void {
        this.closed = true;
        const keyboard = this.context?.scene.input.keyboard;
        keyboard?.off('keydown-E', this.handleExamine);
        keyboard?.off('keydown-C', this.handleCreate);
        keyboard?.off('keydown-D', this.handleDisperse);
        keyboard?.off('keydown-M', this.handleMainMenu);

        this.images.forEach(image => image.destroy());
        this.images = [];
        this.clearStatus();
    }

    private handleExamine = (): void => this.context?.switchView(new RegisterView());
    private handleCreate = (): void => this.context?.switchView(new CreateCharacterView());

    private handleDisperse = async (): Promise<void> => {
        const context = this.context;
        if (!context) return;

        let message = 'Party dispersed';
        try {
            await context.roster.disperse();
        } catch (error) {
            console.error('Could not disperse the party:', error);
            message = 'Server unavailable';
        }

        if (this.closed) return;
        this.clearStatus();
        this.statusImages = writeTextCentered(context.scene, message, STATUS_Y, EGA_WHITE);
    };

    private handleMainMenu = (): void => this.context?.exit();

    private clearStatus(): void {
        this.statusImages.forEach(image => image.destroy());
        this.statusImages = [];
    }
}