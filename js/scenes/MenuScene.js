// js/scenes/MenuScene.js

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    // --- 0. CLEANUP (Fix for "Unrelated Stuff") ---
    // Ensure GameScene and any HUD scenes are stopped
    this.scene.stop('GameScene');
    if (this.scene.get('HudScene')) this.scene.stop('HudScene');

    // If you use HTML buttons (DOM elements), hide them here
    this.toggleDOMUI(false);

    // --- 1. Background & Atmosphere ---
    this.createBackground(width, height);

    // --- 2. Title Section (Animated) ---
    const titleY = height * 0.18;
    
    // Main Title
    const title = this.add.text(centerX, titleY, 'RULE RIFT', {
      fontSize: '84px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0).setScale(0.9);

    // Glow Shadow
    const titleShadow = this.add.text(centerX, titleY + 4, 'RULE RIFT', {
      fontSize: '84px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      fontStyle: 'bold',
      color: '#00eaff',
    }).setOrigin(0.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    // Subtitle
    const subtitle = this.add.text(centerX, titleY + 60, 'COMPETITIVE LATIN SQUARE PUZZLE', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#8888aa',
      letterSpacing: 6
    }).setOrigin(0.5).setAlpha(0);

    // --- 3. Menu Container (For sliding animation) ---
    // We group all interactive elements to animate them in together
    const menuContainer = this.add.container(0, 50).setAlpha(0);

    // --- 4. Grid Size Config ---
    this.selectedSize = 5;
    const section1Y = height * 0.42;
    
    const labelSize = this.add.text(centerX, section1Y, 'GRID MATRIX', { 
        fontSize: '12px', color: '#00eaff', fontFamily: 'monospace', letterSpacing: 2
    }).setOrigin(0.5);
    menuContainer.add(labelSize);

    this.sizeButtons = [];
    const sizes = [4, 5, 6];
    const btnW = 80;
    const pad = 20;
    const startX_Size = centerX - ((sizes.length * btnW) + (sizes.length - 1) * pad) / 2 + btnW / 2;

    sizes.forEach((size, i) => {
      const btn = this.createOptionButton(startX_Size + i * (btnW + pad), section1Y + 35, btnW, 40, `${size}x${size}`, () => this.selectSize(size, i));
      this.sizeButtons.push(btn);
      menuContainer.add(btn);
    });
    this.highlightButton(this.sizeButtons, 1); // Default 5x5

    // --- 5. AI Difficulty Config ---
    this.selectedAI = 'greedy';
    const section2Y = height * 0.58;

    const labelAI = this.add.text(centerX, section2Y, 'OPPONENT PROTOCOL', { 
        fontSize: '12px', color: '#00eaff', fontFamily: 'monospace', letterSpacing: 2
    }).setOrigin(0.5);
    menuContainer.add(labelAI);

    this.aiButtons = [];
    const aiModes = [
      { id: 'greedy', label: 'Standard' },
      { id: 'dc', label: 'Tactical' }, // Renamed for flavor
      { id: 'dp', label: 'Master' }
    ];
    const aiBtnW = 110;
    const startX_AI = centerX - ((aiModes.length * aiBtnW) + (aiModes.length - 1) * pad) / 2 + aiBtnW / 2;

    aiModes.forEach((mode, i) => {
      const btn = this.createOptionButton(startX_AI + i * (aiBtnW + pad), section2Y + 35, aiBtnW, 40, mode.label, () => this.selectAI(mode.id, i));
      this.aiButtons.push(btn);
      menuContainer.add(btn);
    });
    this.highlightButton(this.aiButtons, 0);

    // --- 6. Start Button ---
    const startBtn = this.createStartButton(centerX, height * 0.82);
    menuContainer.add(startBtn);

    // --- 7. Footer ---
    const footer = this.add.text(centerX, height - 30, 'Left Click: Select • Numbers: Place • Right Click: Block', { 
        fontSize: '12px', color: '#444455', fontFamily: 'monospace' 
    }).setOrigin(0.5);
    menuContainer.add(footer);


    // --- 8. ENTRANCE ANIMATIONS ---
    
    // Animate Title
    this.tweens.add({
        targets: [title, titleShadow],
        alpha: { from: 0, to: 1 },
        scale: { from: 0.9, to: 1 },
        y: titleY,
        duration: 1000,
        ease: 'Cubic.out'
    });
    
    this.tweens.add({
        targets: subtitle,
        alpha: 1,
        y: titleY + 55, // Slide up slightly
        delay: 300,
        duration: 800,
        ease: 'Cubic.out'
    });

    // Animate Menu Content Sliding Up
    this.tweens.add({
        targets: menuContainer,
        alpha: 1,
        y: 0, // Slide from 50 to 0
        delay: 500,
        duration: 800,
        ease: 'Back.out(0.8)'
    });
  }

  /**
   * Hides or Shows HTML elements that might be floating over the canvas.
   * You must ensure your GameScene buttons (Restart/Menu) have class="game-ui" 
   * or a specific ID in your index.html/GameScene creation.
   */
  toggleDOMUI(isVisible) {
    const displayStyle = isVisible ? 'block' : 'none';
    
    // Method 1: If they are HTML elements with a class 'game-ui'
    const uiElements = document.querySelectorAll('.game-ui');
    uiElements.forEach(el => el.style.display = displayStyle);

    // Method 2: If they are specific IDs (Update these IDs to match yours)
    const ids = ['restart-btn', 'menu-btn', 'player-turn-display', 'score-board'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = displayStyle;
    });
  }

  createBackground(width, height) {
    this.add.rectangle(width/2, height/2, width, height, 0x0b0c10);
    
    // Animated Grid Lines
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1f2833, 0.5);
    for(let i = 0; i < width; i+=50) { grid.moveTo(i, 0); grid.lineTo(i, height); }
    for(let i = 0; i < height; i+=50) { grid.moveTo(0, i); grid.lineTo(width, i); }
    grid.strokePath();

    // Vignette
    this.add.graphics()
        .fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0)
        .fillRect(0, 0, width, height);
  }

  createOptionButton(x, y, w, h, label, callback) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const txt = this.add.text(0, 0, label, { fontSize: '14px', fontFamily: 'sans-serif', color: '#aaa' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    
    container.add([bg, txt, hit]);
    container.bg = bg; container.txt = txt; container.w = w; container.h = h;

    hit.on('pointerdown', callback);
    hit.on('pointerover', () => { if(!container.active) txt.setColor('#fff'); });
    hit.on('pointerout', () => { if(!container.active) txt.setColor('#aaa'); });

    return container;
  }

  createStartButton(x, y) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    
    // "Cyber" Button Shape
    bg.fillStyle(0x45a29e, 1);
    bg.fillRoundedRect(-100, -25, 200, 50, 4);
    
    const txt = this.add.text(0, 0, 'INITIATE LINK', {
      fontSize: '18px', fontStyle: 'bold', color: '#0b0c10', letterSpacing: 1
    }).setOrigin(0.5);

    const hit = this.add.rectangle(0, 0, 200, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
    
    container.add([bg, txt, hit]);

    this.tweens.add({
        targets: container, scaleX: 1.05, scaleY: 1.05, yoyo: true, repeat: -1, duration: 900
    });

    hit.on('pointerdown', () => this.startGame());
    // Hover effects
    hit.on('pointerover', () => bg.clear().fillStyle(0x66fcf1, 1).fillRoundedRect(-100, -25, 200, 50, 4));
    hit.on('pointerout', () => bg.clear().fillStyle(0x45a29e, 1).fillRoundedRect(-100, -25, 200, 50, 4));

    return container;
  }

  highlightButton(group, idx) {
    group.forEach((btn, i) => {
      btn.active = (i === idx);
      btn.bg.clear();
      if (btn.active) {
        btn.bg.lineStyle(2, 0x66fcf1);
        btn.bg.fillStyle(0x1f2833);
        btn.bg.fillRoundedRect(-btn.w/2, -btn.h/2, btn.w, btn.h, 6);
        btn.bg.strokeRoundedRect(-btn.w/2, -btn.h/2, btn.w, btn.h, 6);
        btn.txt.setColor('#fff').setFontStyle('bold');
      } else {
        btn.bg.lineStyle(1, 0x45a29e, 0.3);
        btn.bg.strokeRoundedRect(-btn.w/2, -btn.h/2, btn.w, btn.h, 6);
        btn.txt.setColor('#888').setFontStyle('normal');
      }
    });
  }

  selectSize(size, i) { this.selectedSize = size; this.highlightButton(this.sizeButtons, i); }
  selectAI(mode, i) { this.selectedAI = mode; this.highlightButton(this.aiButtons, i); }

  startGame() {
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
        // IMPORTANT: When starting GameScene, tell it to show the UI
        this.scene.start('GameScene', { 
            gridSize: this.selectedSize,
            aiMode: this.selectedAI,
            showUI: true // Pass a flag we can use in GameScene
        });
    });
  }
}