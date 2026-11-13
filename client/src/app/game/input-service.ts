import Phaser from 'phaser';
import { InputDirection } from './input-direction';

type MoveCallback = (direction: InputDirection) => void;
type ActionCallback = () => void;

/**
 * Owns all keyboard input for the game.Scenes register callbacks for named
 * actions instead of reading Phaser keys directly
 * 
 * Call update() from the scene's update() every frame.
 */

export class InputService {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyE: Phaser.Input.Keyboard.Key;
    private keyA: Phaser.Input.Keyboard.Key;
    private keyEscape: Phaser.Input.Keyboard.Key;

    private moveCallbacks: MoveCallback[] = [];
    private interactCallbacks: ActionCallback[] = [];
    private attackCallbacks: ActionCallback[] = [];
    private cancelCallbacks: ActionCallback[] = [];

    constructor(scene: Phaser.Scene) {
        const keyboard = scene.input.keyboard;
        if (!keyboard) {
            throw new Error('InputService requires keyboard input to be enabled.');
        }

        this.cursors = keyboard.createCursorKeys();
        this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    /** A directional key was pressed. */
    onMove(callback: MoveCallback) {
        this.moveCallbacks.push(callback);
    }

    /** The interact key was pressed. */
    onInteract(callback: ActionCallback) {
        this.interactCallbacks.push(callback);
    }

    /** The attack key was pressed. */
    onAttack(callback: ActionCallback) {
        this.attackCallbacks.push(callback);
    }

    /** The cancel key was pressed. */
    onCancel(callback: ActionCallback) {
        this.cancelCallbacks.push(callback);
    }

    update(): void {
        const kb = Phaser.Input.Keyboard
        if(kb.JustDown(this.cursors.up)) this.emitMove(InputDirection.Up);        
        else if(kb.JustDown(this.cursors.down)) this.emitMove(InputDirection.Down);
        else if(kb.JustDown(this.cursors.left)) this.emitMove(InputDirection.Left);
        else if(kb.JustDown(this.cursors.right)) this.emitMove(InputDirection.Right);

        if(kb.JustDown(this.keyE)) this.emit(this.interactCallbacks);
        if(kb.JustDown(this.keyA)) this.emit(this.attackCallbacks);
        if(kb.JustDown(this.keyEscape)) this.emit(this.cancelCallbacks);    
    }

    private emitMove(direction: InputDirection): void {
        this.moveCallbacks.forEach(cb => cb(direction));
    }

    private emit(cbs: ActionCallback[]): void {
        cbs.forEach(cb => cb());
    }
}
