import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 760,
  width: 760,
  height: 760,
  backgroundColor: 0x0f0f14,
  scene: [BootScene, MenuScene, GameScene, UIScene]
};

window.game = new Phaser.Game(config);
