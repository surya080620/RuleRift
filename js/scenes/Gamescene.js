import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'gameScene' });
    }

    preload() {
        this.load.image('tile', 'assets/tiles/tile.png');
    }

    create() {
        this.add.image(320, 320, 'tile');
    }
}
