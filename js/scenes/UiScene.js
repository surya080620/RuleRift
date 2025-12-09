export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: true }); }
  create() {
    // top bar using DOM-like text in Phaser
    this.turnText = this.add.text(12, 12, 'Turn: Player', { fontSize:'16px' });
    this.statusText = this.add.text(12, 36, '', { fontSize:'14px', color:'#aaf' });

    // Difficulty selector and AI button
    this.difficulty = 'greedy';
    const w = this.cameras.main.width;
    this.aiButton = this.add.text(w-140, 12, 'AI Move', { fontSize:'16px', backgroundColor:'#2f8ed9', padding:6 })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.get('GameScene').aiMove());
    this.modeText = this.add.text(w-140, 42, 'AI: Greedy', { fontSize:'12px' }).setInteractive({ useHandCursor: true });
    this.modeText.on('pointerdown', () => {
      const next = { greedy:'dp', dp:'dc', dc:'greedy' }[this.difficulty];
      this.difficulty = next;
      this.modeText.setText('AI: ' + (next === 'greedy' ? 'Greedy' : next === 'dp' ? 'DP' : 'D&C'));
      this.scene.get('GameScene').setAIMode(next);
    });
  }

  updateTurn(player) {
    this.turnText.setText('Turn: ' + player);
  }
  setStatus(msg) {
    this.statusText.setText(msg);
    this.time.delayedCall(2000, ()=> this.statusText.setText(''));
  }
}
