export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }
  create() {
    const w = this.cameras.main.width;
    this.add.text(w/2, 100, 'RULE RIFT', { fontSize:'44px', fontStyle:'700', color:'#fff' }).setOrigin(0.5);
    this.add.text(w/2, 160, 'A turn-based inequalities + tile puzzle', { fontSize:'14px', color:'#ccc' }).setOrigin(0.5);

    const start = this.add.text(w/2, 300, 'Start Game', { fontSize:'20px', backgroundColor:'#2f8ed9', padding:8, color:'#fff' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    start.on('pointerdown', () => {
      this.scene.start('GameScene', { gridSize: 5 });
    });

    const help = this.add.text(w/2, 360, 'Click a cell, type 1..N to place. Right-click toggles pencil mark.', { fontSize:'12px', color:'#bbb' }).setOrigin(0.5);
  }
}
