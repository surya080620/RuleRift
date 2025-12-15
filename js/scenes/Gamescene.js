// js/scenes/GameScene.js

import { createBoard, cloneBoard } from '../logic/board.js';
import * as rules from '../logic/rules.js';
import * as moves from '../logic/moves.js';
import { greedyChoose } from '../logic/ai/greedy.js';
import { dcChoose } from '../logic/ai/dc.js';
import { dpChoose } from '../logic/ai/dp.js';
import { animatePlaceNumber, animatePlaceBlack, pulseTile, flashTile } from '../utils/animations.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.gridSize = data.gridSize || 5;
    this.cellSize = Math.floor(560 / this.gridSize);
    this.left = 80;
    this.top = 120;

    this.currentPlayer = 1; // 1 = human player, 2 = bot
    this.playerHasBlack = true;
    this.botHasBlack = true;

    this.aiMode = 'greedy'; // 'greedy' | 'dc' | 'dp'
    this.gameOver = false;
    this.selected = null;
    this.aiDepth = 4; // DP search depth (tweakable)
  }

  setAIMode(m) {
    this.aiMode = m;
  }

  preload() {
    // no external images required (we use canvas shapes)
  }

  create() {
    // create board and optionally add preset blacks/inequalities
    this.board = createBoard(this.gridSize);

    // example preset: you can modify or set up from puzzle generator
    this.board[1][2].isBlack = true;
    this.board[0][0].inequalities.right = '<';
    this.board[0][1].inequalities.left = '>';

    // draw background + grid
    this.add.rectangle(380, 380, 640, 640, 0x121318).setStrokeStyle(2, 0x2b2b3a);

    // create tile sprites and interactive callbacks
    this.tileSprites = [];
    for (let r = 0; r < this.gridSize; r++) {
      this.tileSprites[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.left + c * this.cellSize + this.cellSize / 2;
        const y = this.top + r * this.cellSize + this.cellSize / 2;
        const rect = this.add
          .rectangle(x, y, this.cellSize - 6, this.cellSize - 6, 0x22222a)
          .setStrokeStyle(2, 0x3a3a4a);
        const txt = this.add
          .text(x, y, '', { fontSize: `${Math.floor(this.cellSize / 2.6)}px`, color: '#fff' })
          .setOrigin(0.5);
        rect.setInteractive();
        rect.on('pointerdown', () => this.onTileClick(r, c));
        this.tileSprites[r][c] = { bg: rect, txt };
      }
    }

    this.drawInequalities();

    // keyboard input: pressing number when tile selected
    this.input.keyboard.on('keydown', (e) => {
      if (this.gameOver) return;
      if (!this.selected) return;
      const k = parseInt(e.key);
      if (!Number.isInteger(k)) return;
      this.tryPlaceNumber(this.selected.r, this.selected.c, k);
    });

    // right-click => attempt to place player black tile (if available)
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (p) => {
      if (this.gameOver) return;
      if (p.rightButtonDown() && this.selected) {
        this.tryPlacePlayerBlack(this.selected.r, this.selected.c);
      }
    });

    // initial visuals
    this.refreshVisuals();

    // At the very start of the game, check legal moves for first player
    this.emitUI();
    this.checkStartOfTurn(); // if no moves available at beginning, will end game
  }

  drawInequalities() {
    if (!this.ineqGroup) this.ineqGroup = this.add.group();
    this.ineqGroup.clear(true, true);
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.board[r][c];
        const cx = this.left + c * this.cellSize + this.cellSize / 2;
        const cy = this.top + r * this.cellSize + this.cellSize / 2;
        if (cell.inequalities.right) {
          const t = cell.inequalities.right;
          this.ineqGroup.add(
            this.add
              .text(cx + this.cellSize / 2 - 12, cy, t, { fontSize: '22px', color: '#ffb' })
              .setOrigin(0.5)
          );
        }
        if (cell.inequalities.down) {
          const t = cell.inequalities.down;
          this.ineqGroup.add(
            this.add
              .text(cx, cy + this.cellSize / 2 - 12, t, { fontSize: '22px', color: '#ffb' })
              .setOrigin(0.5)
          );
        }
      }
    }
  }

  onTileClick(r, c) {
    if (this.gameOver) return;
    const cell = this.board[r][c];
    if (cell.isBlack) {
      this.selected = null;
      return;
    }
    this.selected = { r, c };
    this.refreshVisuals();
    this.tileSprites[r][c].bg.setStrokeStyle(3, 0x66d3ff);
    pulseTile(this, r, c);
  }

  tryPlaceNumber(r, c, value) {
    if (this.gameOver) return;
    // only allow human when it's player's turn
    if (this.currentPlayer !== 1) return;
    if (!rules.canPlaceNumber(this.board, r, c, value)) {
      flashTile(this, r, c, 0xff4444);
      return;
    }

    // place
    this.board[r][c].value = value;
    animatePlaceNumber(this, r, c, value, this.left, this.top, this.cellSize);
    this.refreshVisuals();

    // finish player's move
    this.afterMove();
  }

  tryPlacePlayerBlack(r, c) {
    if (this.gameOver) return;
    if (this.currentPlayer !== 1) return;
    if (!this.playerHasBlack) {
      // no black left
      return;
    }
    if (!rules.canPlaceBlack(this.board, r, c)) {
      flashTile(this, r, c, 0xff4444);
      return;
    }
    // place black
    this.board[r][c].isBlack = true;
    animatePlaceBlack(this, r, c, true, this.left, this.top, this.cellSize);
    this.playerHasBlack = false;
    this.refreshVisuals();

    this.afterMove();
  }

  afterMove() {
    // After a move completes, we check board-complete first
    if (rules.isBoardComplete(this.board)) {
      this.endGame('Game Complete', 'All white tiles filled correctly.');
      return;
    }

    // Switch player
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.emitUI();

    // At the start of the next player's turn, check if that player has legal moves.
    // If no legal moves, game ends (proper ending)
    this.checkStartOfTurn();

    // If still not game over and it's bot's turn, schedule AI move
    if (!this.gameOver && this.currentPlayer === 2) {
      this.time.delayedCall(260, () => this.makeAIMove());
    }
  }

  checkStartOfTurn() {
    // Determine whether currentPlayer has any legal move; if none, end game.
    const hasBlack = this.currentPlayer === 1 ? this.playerHasBlack : this.botHasBlack;
    const legal = moves.getLegalMoves(this.board, this.currentPlayer, { playerHasBlack: hasBlack });

    if (!legal || legal.length === 0) {
      // no legal moves for current player => end game
      const who = this.currentPlayer === 1 ? 'Player' : 'Bot';
      // If board is complete we already ended earlier. Here it's "no moves".
      this.endGame('No moves', `${who} has no legal moves available. Game over.`);
      return;
    }
    // else game continues
  }

  makeAIMove() {
    if (this.gameOver) return;

    // Choose move according to selected aiMode
    let move = null;
    const botHasBlack = this.botHasBlack;
    const playerHasBlack = this.playerHasBlack;

    if (this.aiMode === 'greedy') {
      move = greedyChoose(this.board, { botHasBlack, playerHasBlack });
    } else if (this.aiMode === 'dc') {
      move = dcChoose(this.board, { botHasBlack, playerHasBlack });
    } else if (this.aiMode === 'dp') {
      // dpChoose may be more expensive; we pass depth (this.aiDepth)
      move = dpChoose(this.board, { botHasBlack, playerHasBlack }, this.aiDepth);
    } else {
      move = greedyChoose(this.board, { botHasBlack, playerHasBlack });
    }

    if (!move) {
      // No valid move for bot => end game
      this.endGame('No moves', 'Bot has no legal moves.');
      return;
    }

    if (move.type === 'place') {
      // apply placement
      this.board[move.r][move.c].value = move.value;
      animatePlaceNumber(this, move.r, move.c, move.value, this.left, this.top, this.cellSize);
    } else if (move.type === 'black') {
      // apply black placement and consume black token
      this.board[move.r][move.c].isBlack = true;
      this.botHasBlack = false;
      animatePlaceBlack(this, move.r, move.c, true, this.left, this.top, this.cellSize);
    }

    this.refreshVisuals();

    // After AI move, continue as with a normal move
    this.afterMove();
  }

  refreshVisuals() {
    // Update tiles visuals from board state
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.board[r][c];
        const spr = this.tileSprites[r][c];
        if (cell.isBlack) {
          spr.bg.setFillStyle(0x07070a);
          spr.txt.setText('');
        } else {
          spr.bg.setFillStyle(0x22222a);
          spr.txt.setText(cell.value === null ? '' : String(cell.value));
        }
        // reset stroke default
        spr.bg.setStrokeStyle(2, 0x3a3a4a);
      }
    }
    this.drawInequalities();
  }

  emitUI() {
    this.events.emit('updateUI', {
      currentPlayer: this.currentPlayer,
      playerHasBlack: this.playerHasBlack,
      botHasBlack: this.botHasBlack,
    });
  }

  // When game ends: emit event, prevent further input and optionally show highlight
  endGame(title, message) {
    if (this.gameOver) return;
    this.gameOver = true;

    // disable interactivity of tiles to prevent accidental clicks
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const spr = this.tileSprites[r][c];
        if (spr && spr.bg && spr.bg.input) spr.bg.disableInteractive();
      }
    }

    // emit event to UIScene to show overlay
    this.events.emit('gameEnd', { title, message });
  }
}
