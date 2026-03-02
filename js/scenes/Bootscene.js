// js/scenes/BootScene.js
// Handles initial asset loading and setup with a visual progress indicator.

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
  this.load.image('ineq_lt', 'assets/icons/ineq_lt.png');
  this.load.image('ineq_gt', 'assets/icons/ineq_gt.png');
    // 1. Setup Background (consistent with game theme)
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x121318);

    // 2. Setup Loading UI
    this.createLoadingUI(width, height);

    // 3. (Optional) Load Assets
    // Since we use procedural graphics, we don't have images/sprites to load yet.
    // If you add sound effects or a custom font later, put them here:
    // this.load.audio('place', 'assets/place.wav');
    // this.load.image('logo', 'assets/logo.png');
    
    // Artificial delay to show off the loading bar (Remove this in production if you have real assets)
    // for (let i = 0; i < 50; i++) {
    //   this.load.image('test' + i, 'https://labs.phaser.io/assets/sprites/phaser3-logo.png');
    // }
  }

  create() {
    // Transition to the Main Menu
    this.scene.start('MenuScene');
  }

  createLoadingUI(w, h) {
    // Title
    this.add.text(w / 2, h / 2 - 50, 'RULE RIFT', { 
      fontSize: '32px', 
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff' 
    }).setOrigin(0.5);

    // Progress Text
    const percentText = this.add.text(w / 2, h / 2 + 40, '0%', {
      fontSize: '14px',
      color: '#8888aa'
    }).setOrigin(0.5);

    // Progress Bar Graphics
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    
    const barW = 300;
    const barH = 10;
    const barX = w / 2 - barW / 2;
    const barY = h / 2 + 10;

    // Draw the container (background of the bar)
    progressBox.fillStyle(0x22222a, 1);
    progressBox.fillRect(barX, barY, barW, barH);

    // Hook into Loader Events
    this.load.on('progress', (value) => {
      // Update Bar Width
      progressBar.clear();
      progressBar.fillStyle(0x2f8ed9, 1);
      progressBar.fillRect(barX, barY, barW * value, barH);
      
      // Update Percentage Text
      percentText.setText(parseInt(value * 100) + '%');
    });

    this.load.on('complete', () => {
      // Cleanup UI before switching scenes
      progressBar.destroy();
      progressBox.destroy();
      percentText.destroy();
    });
  }
}