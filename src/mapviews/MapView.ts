import Phaser from 'phaser'
import { InputDirection } from '../services/InputDirection'
import type { LocationDef } from '../data/world-locations'

export interface MapView {
    load(
        scene: Phaser.Scene,
        addLogMessage: (msg: string) => void,
        onExit?: (destination?: LocationDef) => void,
    ): Promise<void>
    handleMove(dir: InputDirection): Promise<void>
    handleInteract(): void
    teardown(): void
}
