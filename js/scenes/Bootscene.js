export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.text(w/2, h/2, 'Rule Rift — Loading...', { fontSize: '22px', color:'#ddd' }).setOrigin(0.5);
  }
  create() {
    this.scene.start('MenuScene');
  }
}
