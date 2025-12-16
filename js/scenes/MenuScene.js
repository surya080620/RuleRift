export default class MenuScene extends Phaser.Scene {
  constructor(){ super({ key: 'MenuScene' }); }
  create() {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.text(w/2, 120, 'Rule Rift', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
    this.add.text(w/2, 180, 'Unequal + Singles — Me vs Computer', { fontSize:'16px', color:'#ddd' }).setOrigin(0.5);

    const start = this.add.text(w/2, 300, 'Start Game', { fontSize:'22px', backgroundColor:'#2f8ed9', padding:8, color:'#fff' }).setOrigin(0.5).setInteractive();
    start.on('pointerdown', () => {
      this.scene.start('GameScene', { gridSize: 5, vsAI: true });
    });

    const help = this.add.text(w/2, 360, 'Left-click a white tile → press number 1..N. Right-click to place your one black tile.', { fontSize:'14px', color:'#bbb' }).setOrigin(0.5);
    this.input.on('pointerdown', () => {}); // keep scene active
  }
}
