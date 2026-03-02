import BootScene from './scenes/Bootscene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/Gamescene.js';
import UIScene from './scenes/UiScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 760,
  height: 760,
  backgroundColor: '#0f0f12',
  scene: [BootScene, MenuScene, GameScene, UIScene]
};

window.game = new Phaser.Game(config);
