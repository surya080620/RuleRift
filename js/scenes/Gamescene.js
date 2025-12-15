import { createBoard } from '../logic/board.js';
import * as rules from '../logic/rules.js';
import * as moves from '../logic/moves.js';
import { greedyChoose } from '../logic/ai/greedy.js';
import { dcChoose } from '../logic/ai/dc.js';
import { dpChoose } from '../logic/ai/dp.js';
import { animatePlaceNumber, animatePlaceBlack, pulseTile, flashTile } from '../utils/animations.js';

export default class GameScene extends Phaser.Scene {
  constructor(){ super({ key: 'GameScene' }); }

  init(data){
    this.gridSize = data.gridSize || 5;
    this.cellSize = Math.floor(560 / this.gridSize);
    this.left = 80; this.top = 120;

    this.currentPlayer = 1; // 1 = human, 2 = bot
    this.playerHasBlack = true; this.botHasBlack = true;
    this.aiMode = 'greedy';
  }

  setAIMode(m){ this.aiMode = m; }

  create(){
    this.board = createBoard(this.gridSize);
    // example preset black and inequality (demo). You can change board initial state here
    this.board[1][2].isBlack = true;
    this.board[0][0].inequalities.right = '<';
    this.board[0][1].inequalities.left = '>';

    // draw grid
    this.tileSprites = [];
    for (let r=0;r<this.gridSize;r++){
      this.tileSprites[r]=[];
      for (let c=0;c<this.gridSize;c++){
        const x = this.left + c*this.cellSize + this.cellSize/2;
        const y = this.top + r*this.cellSize + this.cellSize/2;
        const rect = this.add.rectangle(x,y,this.cellSize-6,this.cellSize-6,0x22222a).setStrokeStyle(2,0x3a3a4a);
        const txt = this.add.text(x,y,'',{ fontSize:`${Math.floor(this.cellSize/2.6)}px`, color:'#fff' }).setOrigin(0.5);
        rect.setInteractive(); rect.on('pointerdown',()=>this.onTileClick(r,c));
        this.tileSprites[r][c] = { bg:rect, txt };
      }
    }

    this.drawInequalities();

    // keyboard numbers
    this.input.keyboard.on('keydown', (e)=>{ if (!this.selected) return; const k=parseInt(e.key); if (!Number.isInteger(k)) return; this.tryPlaceNumber(this.selected.r,this.selected.c,k); });

    // right-click to place black (player)
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (p)=>{ if (p.rightButtonDown() && this.selected) this.tryPlacePlayerBlack(this.selected.r,this.selected.c); });

    this.refreshVisuals(); this.emitUI();
  }

  drawInequalities(){
    if (!this.ineqGroup) this.ineqGroup = this.add.group();
    this.ineqGroup.clear(true,true);
    for (let r=0;r<this.gridSize;r++){
      for (let c=0;c<this.gridSize;c++){
        const cell=this.board[r][c];
        const cx=this.left+c*this.cellSize+this.cellSize/2;
        const cy=this.top+r*this.cellSize+this.cellSize/2;
        if (cell.inequalities.right){ const t = cell.inequalities.right; this.ineqGroup.add(this.add.text(cx+this.cellSize/2-12, cy, t, { fontSize:'22px', color:'#ffb' }).setOrigin(0.5)); }
        if (cell.inequalities.down){ const t = cell.inequalities.down; this.ineqGroup.add(this.add.text(cx, cy+this.cellSize/2-12, t, { fontSize:'22px', color:'#ffb' }).setOrigin(0.5)); }
      }
    }
  }

  onTileClick(r,c){
    const cell=this.board[r][c];
    if (cell.isBlack) { this.selected=null; return; }
    this.selected={r,c};
    this.refreshVisuals();
    this.tileSprites[r][c].bg.setStrokeStyle(3,0x66d3ff);
    pulseTile(this, r, c);
  }

  tryPlaceNumber(r,c,value){
    if (!rules.canPlaceNumber(this.board,r,c,value)){ flashTile(this,r,c,0xff4444); return; }
    this.board[r][c].value = value;
    animatePlaceNumber(this,r,c,value,this.left,this.top,this.cellSize);
    this.refreshVisuals();
    this.afterMove();
  }

  tryPlacePlayerBlack(r,c){
    if (!this.playerHasBlack) return;
    if (!rules.canPlaceBlack(this.board,r,c)){ flashTile(this,r,c,0xff4444); return; }
    this.board[r][c].isBlack = true;
    animatePlaceBlack(this,r,c,true,this.left,this.top,this.cellSize);
    this.playerHasBlack = false;
    this.refreshVisuals();
    this.afterMove();
  }

  afterMove(){
    if (rules.isBoardComplete(this.board)){
      this.endGame('Game Complete','All white tiles filled correctly.');
      return;
    }

    // switch player
    this.currentPlayer = this.currentPlayer===1?2:1;
    this.emitUI();

    // check legal moves for the new current player
    const legal = moves.getLegalMoves(this.board, this.currentPlayer, { playerHasBlack: this.currentPlayer===1?this.playerHasBlack:this.botHasBlack });
    if (!legal || legal.length===0){
      this.endGame('No moves','No legal moves available.');
      return;
    }

    if (this.currentPlayer === 2){
      this.time.delayedCall(260, ()=> this.makeAIMove());
    }
  }

  makeAIMove(){
    let move = null;
    if (this.aiMode === 'greedy') move = greedyChoose(this.board, { botHasBlack: this.botHasBlack });
    else if (this.aiMode === 'dc') move = dcChoose(this.board, { botHasBlack: this.botHasBlack });
    else if (this.aiMode === 'dp') move = dpChoose(this.board, { botHasBlack: this.botHasBlack }, 3);

    if (!move){ this.endGame('No moves','Bot has no legal moves.'); return; }

    if (move.type === 'place'){
      this.board[move.r][move.c].value = move.value;
      animatePlaceNumber(this, move.r, move.c, move.value, this.left, this.top, this.cellSize);
    } else if (move.type === 'black'){
      this.board[move.r][move.c].isBlack = true;
      this.botHasBlack = false;
      animatePlaceBlack(this, move.r, move.c, true, this.left, this.top, this.cellSize);
    }
    this.refreshVisuals();
    this.afterMove();
  }

  refreshVisuals(){
    for (let r=0;r<this.gridSize;r++){
      for (let c=0;c<this.gridSize;c++){
        const cell=this.board[r][c];
        const spr=this.tileSprites[r][c];
        if (cell.isBlack){ spr.bg.setFillStyle(0x07070a); spr.txt.setText(''); }
        else { spr.bg.setFillStyle(0x22222a); spr.txt.setText(cell.value===null?'':String(cell.value)); }
      }
    }
    this.drawInequalities();
  }

  emitUI(){ this.events.emit('updateUI', { currentPlayer: this.currentPlayer, playerHasBlack: this.playerHasBlack, botHasBlack: this.botHasBlack }); }

  endGame(title,message){ this.events.emit('gameEnd', { title, message }); }
}
