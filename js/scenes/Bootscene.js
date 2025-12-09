export default class BootScene extends Phaser.Scene {
  constructor(){ super({ key: 'BootScene' }); }
  preload() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.text(w/2, h/2 - 20, 'Rule Rift', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
    this.add.text(w/2, h/2 + 16, 'Loading...', { fontSize: '16px', color: '#ccc' }).setOrigin(0.5);
    // No external assets required for prototype (we draw shapes)
  }
  create(){ this.scene.start('MenuScene'); }
}
