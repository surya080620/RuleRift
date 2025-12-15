export default class MenuScene extends Phaser.Scene {
  constructor(){ super({ key: 'MenuScene' }); }
  create(){
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.text(w/2, 120, 'RULE RIFT', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
    this.add.text(w/2, 180, 'A competitive puzzle: Unequal + Singles', { fontSize: '16px', color: '#ccc' }).setOrigin(0.5);

    const start = this.add.text(w/2, 300, 'Start Game', { fontSize: '22px', backgroundColor: '#2f8ed9', padding: 10, color: '#fff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('GameScene', { gridSize: 5 });
      });

    this.add.text(w/2, 360, 'Click tiles, type numbers (1..N). Right-click to place black (player only).', { fontSize: '12px', color: '#aaa' }).setOrigin(0.5);
  }
}
