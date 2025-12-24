// js/scenes/GameScene.js

import { createBoard } from '../logic/board.js';
import * as rules from '../logic/rules.js';
import * as moves from '../logic/moves.js';
import { greedyChoose } from '../logic/ai/greedy.js';
import { dcChoose } from '../logic/ai/dc.js';
import { dpChoose } from '../logic/ai/dp.js';
import { animatePlaceNumber, animatePlaceBlack, pulseTile, flashTile } from '../utils/animations.js';

// Centralized configuration for easy theming and tweaking
const CONSTANTS = {
  colors: {
    bg: 0x121318,
    gridStroke: 0x2b2b3a,
    tileBg: 0x22222a,
    tileStroke: 0x3a3a4a,
    tileBlack: 0x07070a,
    text: '#ffffff',
    textIneq: '#f6f3c7', // pale warm for contrast
    highlight: 0x66d3ff,
    error: 0xff4444,
    ineqAlpha: 0.85
  },
  dims: {
    boardSize: 560,
    centerX: 380,
    centerY: 380,
    offsetX: 80,
    offsetY: 120
  },
  // sensible asset base size to scale from (48 px assumed)
  assetBaseSize: 48
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.gridSize = data.gridSize || 5;

    // precise sizing based on constants
    this.cellSize = Math.floor(CONSTANTS.dims.boardSize / this.gridSize);
    this.left = CONSTANTS.dims.offsetX;
    this.top = CONSTANTS.dims.offsetY;

    this.currentPlayer = 1; // 1 = human, 2 = bot
    this.playerHasBlack = true;
    this.botHasBlack = true;

    this.aiMode = data.aiMode || 'greedy';
    this.aiDepth = data.aiDepth || 4;

    this.gameOver = false;
    this.selected = null;

    // Store sprites for easy access
    this.tileSprites = [];

    // inequality group handle
    this.ineqGroup = null;
  }

  setAIMode(m) {
    this.aiMode = m;
  }

  create() {
    // 1. Setup Logic
    this.board = createBoard(this.gridSize);
    this.applyPresetLevel(); // Separated level setup or external level loader

    // 2. Setup Visuals
    this.createBackground();
    this.createGrid();
    this.drawInequalities(); // draw after grid so positions exist

    // 3. Setup Inputs
    this.setupInputs();

    // 4. Initial Game State Check
    this.emitUI();
    this.checkStartOfTurn();
  }

  /**
   * Helper to set an inequality on a cell and auto-mirror to neighbor.
   * dir: 'up' | 'down' | 'left' | 'right'
   * char: '<' or '>'
   */
  setInequality(r, c, dir, char) {
    // basic validation
    if (char !== '<' && char !== '>') return;
    if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) return;
    if (!this.board[r] || !this.board[r][c]) return;

    this.board[r][c].inequalities = this.board[r][c].inequalities || {};
    this.board[r][c].inequalities[dir] = char;

    // Mirror on neighbor
    let nr = r, nc = c, opposite = null, mirrorChar = null;
    if (dir === 'right') { nr = r; nc = c + 1; opposite = 'left'; mirrorChar = (char === '<') ? '>' : '<'; }
    else if (dir === 'left') { nr = r; nc = c - 1; opposite = 'right'; mirrorChar = (char === '<') ? '>' : '<'; }
    else if (dir === 'down') { nr = r + 1; nc = c; opposite = 'up'; mirrorChar = (char === '<') ? '>' : '<'; }
    else if (dir === 'up') { nr = r - 1; nc = c; opposite = 'down'; mirrorChar = (char === '<') ? '>' : '<'; }

    if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
      this.board[nr][nc].inequalities = this.board[nr][nc].inequalities || {};
      this.board[nr][nc].inequalities[opposite] = mirrorChar;
    }
  }

  createBackground() {
    const { centerX, centerY } = CONSTANTS.dims;
    // Draw background panel
    this.add.rectangle(centerX, centerY, 640, 640, CONSTANTS.colors.bg)
      .setStrokeStyle(2, CONSTANTS.colors.gridStroke);
  }

  createGrid() {
    this.tileSprites = [];

    for (let r = 0; r < this.gridSize; r++) {
      this.tileSprites[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        const { x, y } = this.getCellCenter(r, c);

        // Tile Background
        const rect = this.add.rectangle(
          x, y,
          this.cellSize - 6,
          this.cellSize - 6,
          CONSTANTS.colors.tileBg
        ).setStrokeStyle(2, CONSTANTS.colors.tileStroke);

        // Tile Text
        const fontSize = Math.floor(this.cellSize / 2.6);
        const txt = this.add.text(x, y, '', {
          fontSize: `${fontSize}px`,
          color: CONSTANTS.colors.text,
          fontFamily: 'monospace',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        // Interaction
        rect.setInteractive();
        rect.on('pointerdown', () => this.onTileClick(r, c));

        this.tileSprites[r][c] = { bg: rect, txt };

        // Initial render for pre-set black tiles or values
        this.updateTileVisual(r, c);
      }
    }
  }

  /**
   * Draws inequality constraints between adjacent tiles.
   * Uses sprite assets if available (ineq_lt / ineq_gt), otherwise falls back to text.
   * Sprites auto-rotate for vertical placement.
   */
  drawInequalities() {
    if (this.ineqGroup) {
      // clear previous visual elements
      this.ineqGroup.clear(true);
      this.ineqGroup.destroy(true);
    }
    this.ineqGroup = this.add.group();

    // Determine whether sprite assets are available
    const hasLt = this.textures.exists('ineq_lt');
    const hasGt = this.textures.exists('ineq_gt');
    const useSprites = hasLt && hasGt;

    const scale = Math.max(0.24, this.cellSize / CONSTANTS.assetBaseSize); // relative scale
    const spriteScale = scale * 0.75;
    const textFontSize = Math.max(12, Math.floor(this.cellSize * 0.2));
    const alpha = CONSTANTS.colors.ineqAlpha;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.board[r][c];
        if (!cell || !cell.inequalities) continue;

        const { x, y } = this.getCellCenter(r, c);
        const half = this.cellSize / 2;

        // RIGHT inequality (placed at midpoint between (r,c) and (r,c+1))
        if (cell.inequalities.right) {
          const ch = cell.inequalities.right;
          if (useSprites) {
            const key = ch === '<' ? 'ineq_lt' : 'ineq_gt';
            const spr = this.add.image(x + half, y, key)
              .setScale(spriteScale)
              .setAlpha(alpha)
              .setDepth(3);
            this.ineqGroup.add(spr);
          } else {
            const txt = this.add.text(x + half, y, ch, {
              fontSize: `${textFontSize}px`,
              color: CONSTANTS.colors.textIneq,
              fontFamily: 'monospace',
              fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(alpha).setDepth(3);
            this.ineqGroup.add(txt);
          }
        }

        // DOWN inequality (between (r,c) and (r+1,c))
        if (cell.inequalities.down) {
          const ch = cell.inequalities.down;
          if (useSprites) {
            const key = ch === '<' ? 'ineq_lt' : 'ineq_gt';
            const spr = this.add.image(x, y + half, key)
              .setRotation(Math.PI / 2)
              .setScale(spriteScale)
              .setAlpha(alpha)
              .setDepth(3);
            this.ineqGroup.add(spr);
          } else {
            const txt = this.add.text(x, y + half, ch, {
              fontSize: `${textFontSize}px`,
              color: CONSTANTS.colors.textIneq,
              fontFamily: 'monospace',
              fontStyle: 'bold'
            }).setOrigin(0.5).setAlpha(alpha).setDepth(3);
            this.ineqGroup.add(txt);
          }
        }
      }
    }
  }

  setupInputs() {
    // Keyboard: Number placement
    this.input.keyboard.on('keydown', (e) => {
      if (this.gameOver || !this.selected) return;

      const key = e.key;
      // Regex check ensures we only capture actual single digits 0-9
      if (/^\d$/.test(key)) {
        this.tryPlaceNumber(this.selected.r, this.selected.c, parseInt(key));
      }
    });

    // Mouse: Right click for black tile
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (p) => {
      if (this.gameOver || !this.selected) return;

      if (p.rightButtonDown()) {
        this.tryPlacePlayerBlack(this.selected.r, this.selected.c);
      }
    });
  }

  // Helper to get pixel coordinates
  getCellCenter(r, c) {
    return {
      x: this.left + c * this.cellSize + this.cellSize / 2,
      y: this.top + r * this.cellSize + this.cellSize / 2
    };
  }

  onTileClick(r, c) {
    if (this.gameOver) return;
    const cell = this.board[r][c];

    // Cannot select black tiles
    if (cell.isBlack) {
      this.deselect();
      return;
    }

    // Deselect previous
    if (this.selected) {
      const prev = this.tileSprites[this.selected.r][this.selected.c];
      prev.bg.setStrokeStyle(2, CONSTANTS.colors.tileStroke);
    }

    this.selected = { r, c };

    // Highlight new
    const spr = this.tileSprites[r][c];
    spr.bg.setStrokeStyle(3, CONSTANTS.colors.highlight);
    pulseTile(this, r, c);
  }

  deselect() {
    if (this.selected) {
      const prev = this.tileSprites[this.selected.r][this.selected.c];
      prev.bg.setStrokeStyle(2, CONSTANTS.colors.tileStroke);
      this.selected = null;
    }
  }

  tryPlaceNumber(r, c, value) {
    if (this.gameOver || this.currentPlayer !== 1) return;

    if (!rules.canPlaceNumber(this.board, r, c, value)) {
      flashTile(this, r, c, CONSTANTS.colors.error);
      return;
    }

    this.executeMove({ type: 'place', r, c, value });
  }

  tryPlacePlayerBlack(r, c) {
    if (this.gameOver || this.currentPlayer !== 1) return;
    if (!this.playerHasBlack) return; // no blacks left

    if (!rules.canPlaceBlack(this.board, r, c)) {
      flashTile(this, r, c, CONSTANTS.colors.error);
      return;
    }

    this.executeMove({ type: 'black', r, c });
  }

  /**
   * Unified move execution to handle state updates and animations
   * for both Human and AI.
   */
  executeMove(move) {
    const { r, c } = move;

    if (move.type === 'place') {
      this.board[r][c].value = move.value;
      animatePlaceNumber(this, r, c, move.value, this.left, this.top, this.cellSize);
    }
    else if (move.type === 'black') {
      this.board[r][c].isBlack = true;
      if (this.currentPlayer === 1) this.playerHasBlack = false;
      else this.botHasBlack = false;

      animatePlaceBlack(this, r, c, true, this.left, this.top, this.cellSize);
    }

    // Update the visual of the specific tile (more efficient than full refresh)
    this.updateTileVisual(r, c);

    // Remove selection if human played
    if (this.currentPlayer === 1) this.deselect();

    // Redraw inequalities only if level changes (but safe to redraw)
    // If you have dynamic constraint changes later, call drawInequalities()
    this.afterMove();
  }

  afterMove() {
    if (rules.isBoardComplete(this.board)) {
      this.endGame('Game Complete', 'All white tiles filled correctly.');
      return;
    }

    // Switch Turn
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.emitUI();

    // Check legality for NEXT player
    this.checkStartOfTurn();

    // Trigger AI if needed
    if (!this.gameOver && this.currentPlayer === 2) {
      this.time.delayedCall(260, () => this.makeAIMove());
    }
  }

  checkStartOfTurn() {
    const hasBlack = this.currentPlayer === 1 ? this.playerHasBlack : this.botHasBlack;
    const legal = moves.getLegalMoves(this.board, this.currentPlayer, { playerHasBlack: hasBlack });

    if (!legal || legal.length === 0) {
      const who = this.currentPlayer === 1 ? 'Player' : 'Bot';
      this.endGame('No Moves', `${who} has no legal moves. Game Over.`);
    }
  }

  makeAIMove() {
    if (this.gameOver) return;

    const context = {
      botHasBlack: this.botHasBlack,
      playerHasBlack: this.playerHasBlack
    };

    let move = null;

    // Switch for cleaner logic extension
    switch (this.aiMode) {
      case 'dc':
        move = dcChoose(this.board, context);
        break;
      case 'dp':
        move = dpChoose(this.board, context, this.aiDepth);
        break;
      case 'greedy':
      default:
        move = greedyChoose(this.board, context);
        break;
    }

    if (!move) {
      this.endGame('No moves', 'Bot has no legal moves.');
      return;
    }

    this.executeMove(move);
  }

  /**
   * Efficiently updates a single tile's visual state.
   */
  updateTileVisual(r, c) {
    const cell = this.board[r][c];
    const spr = this.tileSprites[r][c];

    if (cell.isBlack) {
      spr.bg.setFillStyle(CONSTANTS.colors.tileBlack);
      spr.txt.setText('');
    } else {
      spr.bg.setFillStyle(CONSTANTS.colors.tileBg);
      spr.txt.setText(cell.value === null ? '' : String(cell.value));
    }
  }

  emitUI() {
    this.events.emit('updateUI', {
      currentPlayer: this.currentPlayer,
      playerHasBlack: this.playerHasBlack,
      botHasBlack: this.botHasBlack,
    });
  }

  endGame(title, message) {
    if (this.gameOver) return;
    this.gameOver = true;

    // Clean up input listeners to prevent "ghost" clicks after game ends
    this.input.keyboard.removeAllListeners('keydown');
    this.input.off('pointerdown');

    // Disable grid interactivity
    this.tileSprites.forEach(row => {
      row.forEach(spr => spr.bg.disableInteractive());
    });

    this.events.emit('gameEnd', { title, message });
  }

  /**
   * Applies initial board state (Inequalities/Black tiles).
   * In a real game, this might load from a JSON level file.
   */
  applyPresetLevel() {
    // Safety check for grid size
    if (this.gridSize < 5) return;

    // --- 1. SET BLACK TILES ---
    // Example: Place a black tile at Row 1, Column 2
    this.board[1][2].isBlack = true;

    // --- 2. SET INEQUALITIES ---
    // Use the new setInequality helper which mirrors the neighbor and bounds-checks.

    // Existing ones:
    this.setInequality(0, 0, 'right', '<'); // (0,0) < (0,1)

    // --- ADD NEW ONES HERE ---

    // Example: Row 2, Col 3 must be greater than Row 3, Col 3 (Downwards relation)
    // Here '>' on (2,3).down means (2,3) > (3,3)
    this.setInequality(2, 3, 'down', '>');

    // Example: Row 4, Col 0 must be less than Row 4, Col 1
    this.setInequality(4, 0, 'right', '<');

    // Example: Row 3, Col 3 must be less than Row 3, Col 2 (Leftwards relation)
    this.setInequality(3, 3, 'left', '<');
  }
}
