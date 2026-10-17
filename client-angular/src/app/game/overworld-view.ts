import Phaser from 'phaser';
import { MapData } from '../services/map';
import { PartyPosition } from '../services/overworld';
import { MAP_X, MAP_Y, TILE, VIEW_TILES } from './shell-layout';

const VIEW_RADIUS = Math.floor(VIEW_TILES / 2); // 5 tiles either side of the center
const AVATAR_FRAME = 20; // party avatar frame in the tiles sheet

/** Wrap a coordinate onto the map. (C#'s and JS's modulo can both go negative.) */
export function wrap(value: number, size: number): number {
    return ((value % size) + size) % size;
}

/** 
 * Draws the 11x11 window of the overworld around the party. The 121 tile
 * images never move: render() just changes which frame each one shows.
 */
export class OverworldView {
    private tileSprites: Phaser.GameObjects.Image[][] = [];
    private avatar: Phaser.GameObjects.Image;

    constructor(scene: Phaser.Scene, private readonly map: MapData) {
        for (let row = 0; row < VIEW_TILES; row++) {
            this.tileSprites[row] = [];
            for (let col = 0; col < VIEW_TILES; col++) {
                const img = scene.add.image(MAP_X + col * TILE, MAP_Y + row * TILE, 'tiles', 0);
                img.setOrigin(0,0);
                img.setDepth(1);
                img.setVisible(false);
                this.tileSprites[row][col] = img;
            }
        }

        this.avatar = scene.add.image(
            MAP_X + VIEW_RADIUS * TILE + TILE / 2,
            MAP_Y + VIEW_RADIUS * TILE + TILE / 2,
            'tiles',
            AVATAR_FRAME
        );
        this.avatar.setDepth(10);
        this.avatar.setVisible(false);
    }

    render(position: PartyPosition): void {
        for (let row = 0; row < VIEW_TILES; row++) {
            for (let col = 0; col < VIEW_TILES; col++) {
                const mapX = wrap(position.x - VIEW_RADIUS + col, this.map.width);
                const mapY = wrap(position.y - VIEW_RADIUS + row, this.map.height);

                // The server's tile numbers are already 0-based, so they are the 
                // sheet frame numbers (the old client needed 'tile.indes -1').
                const frame = this.map.tiles[mapY * this.map.width + mapX];

                this.tileSprites[row][col].setFrame(frame).setVisible(true);
            }
        }
        this.avatar.setVisible(true);
    }
    
}