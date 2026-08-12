// src/orgviews/OrgView.ts
import Phaser from 'phaser'

export interface OrgView {
    load(
        scene: Phaser.Scene,
        onExit: () => void,
        switchView: (view: OrgView) => void,
    ): void | Promise<void>

    teardown(): void
}