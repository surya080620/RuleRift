import { createBoard, cloneBoard } from '../logic/board.js';
import { canPlaceNumber, isBoardValid, whitesRemainConnected } from '../logic/rules.js';
import { getAllNumberMoves } from '../logic/moves.js';
import { greedyChoose } from '../logic/ai/greedy.js';
import { dcChoose } from '../logic/ai/dc.js';
import { dpChoose } from '../logic/ai/dp.js';
import { animatePlaceNumber, animateInvalid, animatePlaceBlack } from '../utils/animations.js';
import { deepClone } from '../utils/helpers.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }
  init(data) {
    this.gridSize = data.gridSize || 5;
    this.cellSize = Math.floor(560 / this.gridSize);
    this.left = 80;
    this.top = 120;
    this.selected = null;
    this.turn = 'Player'; // Player vs Computer (Computer acts as Player 2)
    this.aiMode = 'greedy';
    this.aiThinking = false;
  }

  preload() {
    // no external images required
  }

  create() {
    // create board and default sample state (some black tiles + inequalities)
    this.board = createBoard(this.gridSize);
    // sample pre-set black tiles (these are fixed per original rules)
    if (this.gridSize >= 5) {
      this.board[1][2].isBlack = true;
      this.board[3][1].isBlack = true;
    }
    // sample inequalities: store as arrows relative to cell: left/right/up/down with '<' or '>'
    // Example: cell (0,1) has left '<' meaning left < this cell -> board[0][1].inequalities.left = '<'
    this.board[0][1].inequalities.left = '<';
    this.board[2][3].inequalities.up = '>';
    // draw grid UI
    this.tileSprites = [];
    this.graphics = this.add.graphics();
    this.drawGrid();
    // input handling
    this.input.on('pointerdown', (pointer) => {
      if (this.aiThinking) return;
      const pos = this.screenToCell(pointer.x, pointer.y);
      if (!pos) return;
      const { r, c } = pos;
      // right click toggle pencil mark (right mouse button)
      if (pointer.rightButtonDown()) {
        this.togglePencil(r, c);
        return;
      }
      // if tile is black -> reject
      if (this.board[r][c].isBlack) {
        animateInvalid(this, r, c, this.left, this.top, this.cellSize);
        this.scene.get('UIScene').setStatus('Cannot play on black tile.');
        return;
      }
      // select tile
      this.selected = { r, c };
      this.refreshVisuals();
    });
    // keyboard input for numbers 1..N and backspace to clear
    this.input.keyboard.on('keydown', (ev) => {
      if (!this.selected || this.aiThinking) return;
      const key = ev.key;
      const N = this.gridSize;
      if (key === 'Backspace' || key === '0') {
        this.setTileValue(this.selected.r, this.selected.c, null);
        return;
      }
      const v = parseInt(key);
      if (!isNaN(v) && v >= 1 && v <= N) {
        this.playerPlaceNumber(this.selected.r, this.selected.c, v);
      }
    });

    // show hints and initial visuals
    this.refreshVisuals();
    // update UIScene
    this.scene.get('UIScene').updateTurn(this.turn);
  }

  setAIMode(mode) { this.aiMode = mode; }

  drawGrid() {
    // create children for each tile: bg rect and text
    for (let r = 0; r < this.gridSize; r++) {
      this.tileSprites[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.left + c * this.cellSize + this.cellSize/2;
        const y = this.top + r * this.cellSize + this.cellSize/2;
        const bg = this.add.rectangle(x, y, this.cellSize - 6, this.cellSize - 6, 0x2b2b3a)
          .setStrokeStyle(2, 0x444455);
        const txt = this.add.text(x, y, '', { fontSize: `${Math.floor(this.cellSize/2.6)}px`, color:'#fff' }).setOrigin(0.5);
        const pencil = this.add.text(x - this.cellSize/2 + 8, y - this.cellSize/2 + 8, '', { fontSize:'12px', color:'#ddd' } ).setOrigin(0);
        this.tileSprites[r][c] = { bg, txt, pencil, x, y };
      }
    }
  }

  screenToCell(px, py) {
    const lx = px - this.left;
    const ty = py - this.top;
    if (lx < 0 || ty < 0) return null;
    const c = Math.floor(lx / this.cellSize), r = Math.floor(ty / this.cellSize);
    if (r < 0 || r >= this.gridSize || c < 0 || c >= this.gridSize) return null;
    return { r, c };
  }

  togglePencil(r, c) {
    const cell = this.board[r][c];
    if (cell.isBlack) return;
    cell.pencil = !cell.pencil;
    this.refreshVisuals();
  }

  setTileValue(r, c, value) {
    this.board[r][c].value = value;
    this.refreshVisuals();
  }

  playerPlaceNumber(r, c, value) {
    // validate via rules.js
    if (!canPlaceNumber(this.board, r, c, value)) {
      animateInvalid(this, r, c, this.left, this.top, this.cellSize);
      this.scene.get('UIScene').setStatus('Invalid move.');
      return;
    }
    // place number
    this.board[r][c].value = value;
    animatePlaceNumber(this, r, c, value, this.left, this.top, this.cellSize);
    this.refreshVisuals();
    // check win
    if (isBoardValid(this.board) && this.isBoardComplete()) {
      this.scene.get('UIScene').setStatus('You win!');
      return;
    }
    // pass to AI
    this.time.delayedCall(300, () => this.aiTurn());
  }

  aiMove() { // manual AI trigger
    if (this.aiThinking) return;
    this.time.delayedCall(50, ()=> this.aiTurn());
  }

  aiTurn() {
    this.aiThinking = true;
    this.scene.get('UIScene').setStatus('AI thinking...');
    const boardCopy = deepClone(this.board);
    let move = null;
    if (this.aiMode === 'greedy') move = greedyChoose(boardCopy);
    else if (this.aiMode === 'dc') move = dcChoose(boardCopy);
    else move = dpChoose(boardCopy);
    if (!move) {
      this.scene.get('UIScene').setStatus('AI has no move. You win?');
      this.aiThinking = false;
      return;
    }
    // apply move
    if (move.type === 'place') {
      // verify again on real board
      if (canPlaceNumber(this.board, move.r, move.c, move.value)) {
        this.board[move.r][move.c].value = move.value;
        animatePlaceNumber(this, move.r, move.c, move.value, this.left, this.top, this.cellSize);
      }
    } else if (move.type === 'black') {
      // pre-set black tiles are fixed; AI won't place blacks in this original variant
    }
    this.time.delayedCall(250, () => {
      this.refreshVisuals();
      this.aiThinking = false;
      if (isBoardValid(this.board) && this.isBoardComplete()) {
        this.scene.get('UIScene').setStatus('AI completed board!');
      }
    });
  }

  isBoardComplete() {
    for (let r=0;r<this.gridSize;r++) for (let c=0;c<this.gridSize;c++) {
      if (!this.board[r][c].isBlack && this.board[r][c].value === null) return false;
    }
    return true;
  }

  refreshVisuals() {
    // update each tile visual from this.board
    for (let r=0;r<this.gridSize;r++) {
      for (let c=0;c<this.gridSize;c++) {
        const cell = this.board[r][c];
        const spr = this.tileSprites[r][c];
        // background color
        if (cell.isBlack) spr.bg.setFillStyle(0x0a0a0a);
        else if (this.selected && this.selected.r === r && this.selected.c === c) spr.bg.setFillStyle(0x3b5f8a);
        else spr.bg.setFillStyle(0x2b2b3a);
        // text
        spr.txt.setText(cell.value === null ? '' : String(cell.value));
        // pencil
        spr.pencil.setText(cell.pencil ? '•' : '');
        // arrows (inequalities) - draw small glyphs using graphics
      }
    }
    // draw inequalities arrows overlay
    this.graphics.clear();
    for (let r=0;r<this.gridSize;r++) {
      for (let c=0;c<this.gridSize;c++) {
        const cell = this.board[r][c];
        const spr = this.tileSprites[r][c];
        const x = spr.x, y = spr.y;
        this.graphics.lineStyle(2, 0x9999ff, 1);
        // check left arrow
        if (cell.inequalities.left) {
          const t = cell.inequalities.left === '<' ? '<' : '>';
          this.add.text(x - this.cellSize/2 + 6, y, t, { fontSize:'18px', color:'#aaf' }).setDepth(50).setOrigin(0.5).setAlpha(0.9).setScrollFactor(0);
        }
        if (cell.inequalities.right) {
          const t = cell.inequalities.right === '<' ? '<' : '>';
          this.add.text(x + this.cellSize/2 - 6, y, t, { fontSize:'18px', color:'#aaf' }).setDepth(50).setOrigin(0.5).setAlpha(0.9).setScrollFactor(0);
        }
        if (cell.inequalities.up) {
          const t = cell.inequalities.up === '<' ? '<' : '>';
          this.add.text(x, y - this.cellSize/2 + 6, t, { fontSize:'18px', color:'#aaf' }).setDepth(50).setOrigin(0.5).setAlpha(0.9).setScrollFactor(0);
        }
        if (cell.inequalities.down) {
          const t = cell.inequalities.down === '<' ? '<' : '>';
          this.add.text(x, y + this.cellSize/2 - 6, t, { fontSize:'18px', color:'#aaf' }).setDepth(50).setOrigin(0.5).setAlpha(0.9).setScrollFactor(0);
        }
      }
    }
    // update UI turn
    this.scene.get('UIScene').updateTurn(this.turn);
  }
}
