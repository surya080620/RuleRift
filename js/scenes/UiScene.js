// js/scenes/UIScene.js
// HUD and Overlay Manager.
// Handles turn indicators, inventory display, and Game Over states.

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    // 1. Create HUD Containers
    this.createTopBar();
    this.createControlButtons();

    // 2. Setup Event Listeners
    this.setupEvents();

    // 3. Initial State
    this.updateTurnIndicator(1); // Default to Player 1
    this.updateInventory(true, true);
  }

  // --- UI Sections ---

  createTopBar() {
    const w = this.cameras.main.width;
    
    // Background Panel for Top Bar
    this.add.rectangle(w / 2, 40, w, 80, 0x121318).setAlpha(0.9);
    this.add.line(0, 0, 0, 80, w, 80, 0x2b2b3a).setOrigin(0);

    // Turn Indicator
    this.turnText = this.add.text(40, 40, 'TURN: PLAYER', { 
      fontSize: '24px', 
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#66d3ff' 
    }).setOrigin(0, 0.5);

    // Black Tile Inventory Display
    // We visually represent whether the Black Tile is available
    this.add.text(w - 240, 40, 'BLACK TILES:', { 
      fontSize: '16px', 
      color: '#888' 
    }).setOrigin(1, 0.5);

    // Player Inventory Icon
    this.p1Badge = this.createBadge(w - 200, 40, 'P1');
    // Bot Inventory Icon
    this.p2Badge = this.createBadge(w - 140, 40, 'BOT');
  }

  createControlButtons() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Bottom-Right Controls
    const btnY = h - 50;
    
    // Restart Button
    this.createButton(w - 120, btnY, 'Restart', 0x777777, () => {
      this.gameScene.scene.restart();
      this.scene.restart(); // Restart UI to clear game over screens
    });

    // Menu Button
    this.createButton(w - 240, btnY, 'Menu', 0x444455, () => {
      this.gameScene.scene.stop();
      this.scene.start('MenuScene');
    });
  }

  createBadge(x, y, label) {
    const container = this.add.container(x, y);
    
    // The visual "Token"
    const bg = this.add.rectangle(0, 0, 40, 40, 0x22222a).setStrokeStyle(2, 0x444);
    const txt = this.add.text(0, 0, label, { fontSize: '10px', color: '#666' }).setOrigin(0.5);
    
    // "Available" Indicator (Green dot or similar, we'll toggle alpha/color)
    const status = this.add.circle(12, -12, 6, 0x00ff00).setStrokeStyle(1, 0x000);

    container.add([bg, txt, status]);
    container.bg = bg;
    container.status = status;
    
    return container;
  }

  createButton(x, y, label, color, callback) {
    const btn = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 100, 40, color)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callback)
      .on('pointerover', () => bg.setAlpha(0.8))
      .on('pointerout', () => bg.setAlpha(1));

    const txt = this.add.text(0, 0, label, { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
    
    btn.add([bg, txt]);
    return btn;
  }

  // --- Event Handling ---

  setupEvents() {
    // Clean up old listeners to prevent duplication on restart
    this.gameScene.events.off('updateUI');
    this.gameScene.events.off('gameEnd');

    this.gameScene.events.on('updateUI', (data) => {
      this.updateTurnIndicator(data.currentPlayer);
      this.updateInventory(data.playerHasBlack, data.botHasBlack);
    });

    this.gameScene.events.on('gameEnd', (data) => {
      this.showGameOver(data.title, data.message);
    });
  }

  updateTurnIndicator(currentPlayer) {
    const isPlayer = currentPlayer === 1;
    this.turnText.setText(isPlayer ? "TURN: PLAYER" : "TURN: BOT...");
    this.turnText.setColor(isPlayer ? '#66d3ff' : '#ffaa44'); // Blue for player, Orange for bot
  }

  updateInventory(p1Has, p2Has) {
    // Update P1 Badge
    this.p1Badge.status.setFillStyle(p1Has ? 0x00ff00 : 0x555555);
    this.p1Badge.bg.setStrokeStyle(2, p1Has ? 0x66d3ff : 0x333333);
    
    // Update Bot Badge
    this.p2Badge.status.setFillStyle(p2Has ? 0x00ff00 : 0x555555);
    this.p2Badge.bg.setStrokeStyle(2, p2Has ? 0xffaa44 : 0x333333);
  }

  // --- Game Over Modal ---

  showGameOver(title, message) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Darken background
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setInteractive(); // Block clicks

    // Container for popup
    const container = this.add.container(w / 2, h / 2);
    
    // Panel Background
    const bg = this.add.rectangle(0, 0, 400, 250, 0x1a1a20).setStrokeStyle(2, 0x444455);
    
    // Texts
    const titleText = this.add.text(0, -60, title.toUpperCase(), { 
      fontSize: '32px', 
      fontStyle: 'bold',
      color: '#fff' 
    }).setOrigin(0.5);

    const msgText = this.add.text(0, 0, message, { 
      fontSize: '16px', 
      color: '#ccc',
      align: 'center',
      wordWrap: { width: 360 }
    }).setOrigin(0.5);

    // "Play Again" Button
    const btn = this.add.rectangle(0, 80, 200, 50, 0x2f8ed9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.gameScene.scene.restart();
        this.scene.restart();
      });
      
    const btnText = this.add.text(0, 80, 'PLAY AGAIN', { fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5);

    container.add([bg, titleText, msgText, btn, btnText]);
    
    // Simple Pop-in Animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.out'
    });
  }
}