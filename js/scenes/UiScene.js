export default class UIScene extends Phaser.Scene {
  constructor(){ super({ key: 'UIScene', active: true }); }
  create(){
    this.gameScene = null;
    // simple overlay elements
    this.turnText = this.add.text(14, 8, 'Turn: ', { fontSize: '18px', color:'#fff' });
    this.infoText = this.add.text(14, 32, '', { fontSize: '14px', color:'#ccc' });
    // Restart button
    const restart = this.add.text(640, 8, 'Restart', { fontSize:'16px', backgroundColor:'#ff6b6b', padding:6, color:'#fff' }).setInteractive();
    restart.on('pointerdown', ()=> {
      this.scene.get('GameScene').restartGame();
    });
  }
  update(){
    const gs = this.scene.get('GameScene');
    if (!gs) return;
    this.turnText.setText('Turn: ' + (gs.currentPlayer === 'human' ? 'You' : (gs.vsAI ? 'Bot' : 'Player 2')));
    this.infoText.setText(`Black left: You=${gs.playerBlackAvailable?1:0} Bot=${gs.botBlackAvailable?1:0}`);
  }
}
