export default class UIScene extends Phaser.Scene {
  constructor(){ super({ key: 'UIScene', active: true }); }
  create(){
    this.turnText = this.add.text(24, 16, 'Turn: -', { fontSize: '20px', color: '#fff' });
    this.blackInfo = this.add.text(24, 44, 'Black: P1[✓] P2[✓]', { fontSize: '14px', color: '#ddd' });

    // AI mode buttons
    this.mode = 'greedy';
    const modes = ['greedy','dc','dp'];
    this.modeTexts = {};
    let x = 520;
    modes.forEach((m, i) => {
      const t = this.add.text(x, 16 + i*36, m.toUpperCase(), { fontSize: '14px', backgroundColor: m==='greedy'?'#2f8ed9':'#444', padding:8, color:'#fff' })
        .setInteractive({ useHandCursor:true })
        .on('pointerdown', () => { this.setMode(m); });
      this.modeTexts[m] = t;
    });

    const aiBtn = this.add.text(640, 16, 'AI Move', { fontSize: '16px', backgroundColor: '#2f8ed9', padding: 8, color: '#fff' })
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { const game = this.scene.get('GameScene'); if (game) game.makeAIMove(); });

    const restartBtn = this.add.text(640, 56, 'Restart', { fontSize: '14px', backgroundColor: '#777', padding: 8, color: '#fff' })
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.scene.get('GameScene').scene.restart(); });

    // events
    const gs = this.scene.get('GameScene');
    gs.events.on('updateUI', data => {
      this.turnText.setText(`Turn: ${data.currentPlayer===1?'Player':'Bot'}`);
      this.blackInfo.setText(`Black: P1[${data.playerHasBlack?'✓':'✗'}] Bot[${data.botHasBlack?'✓':'✗'}]`);
    });
    gs.events.on('gameEnd', payload => {
      const w=this.cameras.main.width;
      this.add.rectangle(w/2, 380, 520, 220, 0x000000, 0.85).setDepth(20);
      this.add.text(w/2, 340, payload.title, { fontSize:'26px', color:'#fff' }).setOrigin(0.5).setDepth(21);
      this.add.text(w/2, 380, payload.message, { fontSize:'16px', color:'#ddd' }).setOrigin(0.5).setDepth(21);
    });
  }

  setMode(m){
    this.mode = m;
    Object.keys(this.modeTexts).forEach(k=>{ this.modeTexts[k].setStyle({ backgroundColor: k===m? '#2f8ed9':'#444' }); });
    const gs = this.scene.get('GameScene'); if (gs) gs.setAIMode(m);
  }
}
