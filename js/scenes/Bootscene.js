export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.text(w/2, h/2 - 20, 'RULE RIFT', { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
    this.add.text(w/2, h/2 + 10, 'Loading...', { fontSize: '14px', color: '#ccc' }).setOrigin(0.5);
  }
  create() { this.scene.start('MenuScene'); }
}
