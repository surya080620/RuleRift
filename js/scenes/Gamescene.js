import { createBoard, cloneBoard, hashBoard } from '../logic/board.js';
import { canPlaceNumber, canPlaceBlack, whitesRemainConnected, isBoardComplete } from '../logic/rules.js';
import { getAllNumberMoves, getAllBlackMoves } from '../logic/moves.js';
import { greedyChoose } from '../logic/ai/greedy.js';
import * as anim from '../utils/animations.js';

export default class GameScene extends Phaser.Scene {
  constructor(){ super({ key: 'GameScene' }); }

  init(data){
    this.gridSize = data.gridSize || 5;
    this.vsAI = (data.vsAI !== undefined) ? data.vsAI : true;
    this.cellSize = Math.floor(600 / this.gridSize);
    this.left = 80;
    this.top = 100;
    this.currentPlayer = 'human'; // 'human' or 'bot'
    this.playerBlackAvailable = true;
    this.botBlackAvailable = true;
  }

  preload(){ /* no external assets needed */ }

  create(){
    // board state
    this.board = createBoard(this.gridSize);
    // Example: add some preset black tiles and inequalities (editable)
    // Pre-set black positions (can be used to craft puzzles); these are fixed
    this.board[1][2].isBlack = true;
    // Add some sample inequalities: cell.inequalities.right = '<' means this cell < right neighbor
    this.board[0][0].inequalities.right = '<';
    this.board[0][0].inequalities.down = '<';
    this.board[2][3].inequalities.left = '>';
    // draw background
    this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 640, 640, 0x0f1220).setStrokeStyle(2, 0x2b2b3a);
    // draw grid visuals
    this.tileSprites = [];
    for (let r=0;r<this.gridSize;r++){
      this.tileSprites[r] = [];
      for (let c=0;c<this.gridSize;c++){
        const x = this.left + c * this.cellSize + this.cellSize/2;
        const y = this.top + r * this.cellSize + this.cellSize/2;
        const bg = this.add.rectangle(x, y, this.cellSize - 6, this.cellSize - 6, 0x22323a).setStrokeStyle(2, 0x2b3a44);
        const txt = this.add.text(x, y, '', { fontSize: `${Math.floor(this.cellSize/2.4)}px`, color: '#fff' }).setOrigin(0.5);
        bg.setInteractive();
        bg.on('pointerdown', (p) => this.onTileClick(r,c,p));
        // right-click to use black tile
        bg.on('pointerup', (pointer) => {
          if (pointer.rightButtonDown()) this.onRightClick(r,c);
        });
        this.tileSprites[r][c] = { bg, txt };
      }
    }

    // pointer keyboard
    this.selected = null;
    this.input.keyboard.on('keydown', (evt) => {
      if (!this.selected) return;
      const key = evt.key;
      const n = parseInt(key);
      if (!isNaN(n) && n >= 1 && n <= this.gridSize) {
        this.tryPlaceNumber(this.selected.r, this.selected.c, n);
      } else if (key === 'Backspace' || key === 'Delete') {
        this.tryRemoveNumber(this.selected.r, this.selected.c);
      }
    });

    // simple instructions
    this.add.text(14, 700, 'Left-click tile to select. Press number (1..N) to place. Right-click to place your black (1 use).', { fontSize:'14px', color:'#ddd' });

    this.refreshVisuals();
  }

  onTileClick(r,c,pointer){
    // selecting tile
    this.selected = { r, c };
    // highlight briefly
    const spr = this.tileSprites[r][c];
    spr.bg.setStrokeStyle(3, 0xffff88);
    this.time.delayedCall(220, ()=> spr.bg.setStrokeStyle(2, 0x2b3a44));
  }

  onRightClick(r,c){
    // Try to place player's black tile (human) if it's human's turn
    if (this.currentPlayer !== 'human') return;
    if (!this.playerBlackAvailable) { anim.flashInvalid(this); return; }
    if (this.board[r][c].isBlack) { anim.flashInvalid(this); return; }
    // make sure tile is empty (we disallow blacking a tile that already has number)
    if (this.board[r][c].value !== null) { anim.flashInvalid(this); return; }
    // ask rules if can place
    if (!canPlaceBlack(this.board, r, c)) { anim.flashInvalid(this); return; }
    // place black
    this.board[r][c].isBlack = true;
    this.playerBlackAvailable = false;
    anim.placeBlack(this, r, c, this.left, this.top, this.cellSize);
    this.refreshVisuals();
    // after valid action, switch turn
    this.endTurn();
  }

  tryPlaceNumber(r,c,v){
    if (this.board[r][c].isBlack) { anim.flashInvalid(this); return; }
    if (this.board[r][c].value === v) { /* unchanged */ return; }
    if (!canPlaceNumber(this.board, r, c, v)) { anim.flashInvalid(this); return; }
    // place
    this.board[r][c].value = v;
    anim.placeNumber(this, r, c, v, this.left, this.top, this.cellSize);
    this.refreshVisuals();
    this.endTurn();
  }

  tryRemoveNumber(r,c){
    if (this.board[r][c].isBlack) { anim.flashInvalid(this); return; }
    if (this.board[r][c].value === null) return;
    // allow undo removal (only human)
    if (this.currentPlayer !== 'human') return;
    this.board[r][c].value = null;
    this.refreshVisuals();
  }

  endTurn(){
    // Check end condition after move
    const end = this.checkGameEnd();
    if (end.ended) {
      this.showEnd(end.reason);
      return;
    }
    // switch player
    if (this.vsAI) {
      this.currentPlayer = (this.currentPlayer === 'human') ? 'bot' : 'human';
      if (this.currentPlayer === 'bot') {
        this.time.delayedCall(420, ()=> this.aiTurn());
      }
    } else {
      // two human players
      this.currentPlayer = (this.currentPlayer === 'human') ? 'other' : 'human';
    }
  }

  aiTurn(){
    // Bot uses greedy choose and may use its black tile
    const move = greedyChoose(this.board, { blackAvailable: this.botBlackAvailable, gridSize: this.gridSize });
    if (!move) {
      // no legal moves
      const end = this.checkGameEnd();
      this.showEnd(end.reason || 'No legal moves — Game over');
      return;
    }
    if (move.type === 'place') {
      this.board[move.r][move.c].value = move.value;
      anim.placeNumber(this, move.r, move.c, move.value, this.left, this.top, this.cellSize);
    } else if (move.type === 'black') {
      this.board[move.r][move.c].isBlack = true;
      this.botBlackAvailable = false;
      anim.placeBlack(this, move.r, move.c, this.left, this.top, this.cellSize);
    }
    this.refreshVisuals();
    this.endTurn();
  }

  refreshVisuals(){
    for (let r=0;r<this.gridSize;r++){
      for (let c=0;c<this.gridSize;c++){
        const cell = this.board[r][c];
        const spr = this.tileSprites[r][c];
        if (cell.isBlack) {
          spr.bg.setFillStyle(0x0b0b0d);
          spr.txt.setText('');
        } else {
          spr.bg.setFillStyle(0x22323a);
          spr.txt.setText(cell.value === null ? (cell.inequalities.right || cell.inequalities.down || '') : String(cell.value));
          // show inequality markers small above/beside if present
          let mark = '';
          if (cell.value === null) {
            if (cell.inequalities.right) mark = cell.inequalities.right;
            if (cell.inequalities.down) mark = mark || cell.inequalities.down;
          }
        }
      }
    }
  }

  checkGameEnd(){
    // 1) board full and valid => win
    if (isBoardComplete(this.board)) return { ended: true, reason: 'Board complete — You win!' };
    // 2) no legal moves for current player
    const numberMoves = getAllNumberMoves(this.board);
    const blackMoves = getAllBlackMoves(this.board);
    const humanCan = (this.currentPlayer==='human');
    const playerBlack = humanCan ? this.playerBlackAvailable : this.botBlackAvailable;
    const hasBlackLegal = blackMoves.length > 0 && playerBlack;
    if (numberMoves.length === 0 && !hasBlackLegal) {
      return { ended: true, reason: 'No legal moves left' };
    }
    return { ended: false };
  }

  showEnd(reason){
    // show an overlay text and stop input
    const w = this.cameras.main.width, h = this.cameras.main.height;
    const rect = this.add.rectangle(w/2, h/2, 420, 160, 0x000000, 0.85).setDepth(40);
    const txt = this.add.text(w/2, h/2 - 6, reason, { fontSize:'20px', color:'#fff' }).setOrigin(0.5).setDepth(41);
    const btn = this.add.text(w/2, h/2 + 36, 'Restart', { fontSize:'16px', backgroundColor:'#2f8ed9', padding:8, color:'#fff' }).setOrigin(0.5).setInteractive().setDepth(41);
    btn.on('pointerdown', ()=> { this.scene.restart(); });
    this.input.enabled = false;
  }

  restartGame(){
    this.scene.restart();
  }
}
