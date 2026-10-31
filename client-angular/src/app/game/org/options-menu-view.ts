import Phaser from 'phaser';
import { OrgContext, OrgView } from './org-view';
import { writeTextCentered } from '../bitmap-text';
import { EGA_CYAN, EGA_GREEN, EGA_RED, EGA_WHITE } from '../shell-layout';

export class OptionsMenuView implements OrgView {
    private context?: OrgContext;
    private images: Phaser.GameObjects.Image[] = [];

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

        scene.input.keyboard?.on('keydown-M', this.handleMainMenu);
    }

    teardown(): void {
        this.context?.scene.input.keyboard?.off('keydown-M', this.handleMainMenu);
        this.images.forEach(image => image.destroy());
        this.images = [];
    }

    private handleMainMenu = (): void => this.context?.exit();
}