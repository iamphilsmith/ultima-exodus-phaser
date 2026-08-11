import Phaser from 'phaser'

export default class PartyAvatar {
    public sprite: Phaser.GameObjects.Sprite

    public tileX: number
    public tileY: number

    public moving = false

    private tileSize = 16

    constructor(scene: Phaser.Scene, tileX: number, tileY: number)
    {
        this.tileX = tileX
        this.tileY = tileY
        this.sprite = scene.add.sprite(this.worldX, this.worldY, 'tiles', 20)
        this.sprite.setOrigin(0.5, 0.5)
    }

    get worldX(): number{
        return this.tileX * this.tileSize + this.tileSize / 2
    }

    get worldY(): number{
        return this.tileY * this.tileSize + this.tileSize / 2
    }
}