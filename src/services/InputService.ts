import Phaser from 'phaser'
import { InputDirection } from './InputDirection'

// ── Action callback types ─────────────────────────────────────
type MoveCallback   = (direction: InputDirection) => void
type ActionCallback = () => void

/**
 * InputService
 *
 * Owns all keyboard input for the game. Scenes register callbacks
 * for named actions rather than reading Phaser cursor keys directly.
 *
 * Usage:
 *   // In WorldScene.create():
 *   this.input = new InputService(this)
 *   this.input.onMove(dir => this.activeView.handleMove(dir))
 *   this.input.onInteract(() => this.handleInteract())
 *
 *   // In WorldScene.update():
 *   this.input.update()
 */
export class InputService {

    private cursors:   Phaser.Types.Input.Keyboard.CursorKeys
    private keyE:      Phaser.Input.Keyboard.Key
    private keyA:      Phaser.Input.Keyboard.Key
    private keyEscape: Phaser.Input.Keyboard.Key

    private moveCallbacks:     MoveCallback[]   = []
    private interactCallbacks: ActionCallback[] = []
    private attackCallbacks:   ActionCallback[] = []
    private cancelCallbacks:   ActionCallback[] = []

    constructor(scene: Phaser.Scene) {
        this.cursors   = scene.input.keyboard!.createCursorKeys()
        this.keyE      = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
        this.keyA      = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.keyEscape = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    }

    // ── Registration ─────────────────────────────────────────────

    /** Called when a directional key is pressed. */
    onMove(cb: MoveCallback): this {
        this.moveCallbacks.push(cb)
        return this
    }

    /** Called when the 'E' key is pressed (enter / examine). */
    onInteract(cb: ActionCallback): this {
        this.interactCallbacks.push(cb)
        return this
    }

    /** Called when the 'A' key is pressed (attack). */
    onAttack(cb: ActionCallback): this {
        this.attackCallbacks.push(cb)
        return this
    }

    /** Called when Escape is pressed (cancel / close). */
    onCancel(cb: ActionCallback): this {
        this.cancelCallbacks.push(cb)
        return this
    }

    // ── Per-frame poll ────────────────────────────────────────────

    /** Call this from the scene's update() every frame. */
    update() {
        const kb = Phaser.Input.Keyboard

        if      (kb.JustDown(this.cursors.up!))    this.emitMove(InputDirection.Up)
        else if (kb.JustDown(this.cursors.down!))  this.emitMove(InputDirection.Down)
        else if (kb.JustDown(this.cursors.left!))  this.emitMove(InputDirection.Left)
        else if (kb.JustDown(this.cursors.right!)) this.emitMove(InputDirection.Right)

        if (kb.JustDown(this.keyE))      this.emit(this.interactCallbacks)
        if (kb.JustDown(this.keyA))      this.emit(this.attackCallbacks)
        if (kb.JustDown(this.keyEscape)) this.emit(this.cancelCallbacks)
    }

    // ── Helpers ───────────────────────────────────────────────────

    private emitMove(direction: InputDirection) {
        this.moveCallbacks.forEach(cb => cb(direction))
    }

    private emit(cbs: ActionCallback[]) {
        cbs.forEach(cb => cb())
    }
}
