// js/logic/ai/dp.js
// Minimax-like DP search with memoization + alpha-beta pruning.
// Depth-limited. We also limit branching by sorting moves by a heuristic and keeping top K.

import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { cloneBoard } from '../board.js';

const memo = new Map();

function boardHash(board, currentPlayer, botHasBlack, playerHasBlack){
  const parts = [];
  for (let r=0;r<board.length;r++){
    for (let c=0;c<board.length;c++){
      const cell = board[r][c];
      parts.push(cell.isBlack ? 'B' : (cell.value === null ? '.' : String(cell.value)));
    }
  }
  parts.push(`|P${currentPlayer}|b${botHasBlack?1:0}|p${playerHasBlack?1:0}`);
  return parts.join('');
}

function staticEval(board){
  // heuristic: fewer empty white cells is better for the player to finish; prefer more constraints satisfied
  let empties = 0;
  for (let r=0;r<board.length;r++){
    for (let c=0;c<board.length;c++){
      if (!board[r][c].isBlack && board[r][c].value === null) empties++;
    }
  }
  return -empties;
}

// rank moves by quick heuristic: prefer number placements, fewer resulting possibilities
function quickRank(board, move){
  if (move.type === 'place') return 100 + (Math.random()*10);
  return 20 + Math.random()*5;
}

// simulate applying move onto a cloned board
function applyMove(board, move){
  const sim = cloneBoard(board);
  if (move.type === 'place') sim[move.r][move.c].value = move.value;
  else if (move.type === 'black') sim[move.r][move.c].isBlack = true;
  return sim;
}

export function dpChoose(board, opts = { botHasBlack:false }, maxDepth = 3){
  // main minimax with memoization
  const botPlayer = 2;

  function minimax(stateBoard, currentPlayer, botHasBlack, playerHasBlack, depth, alpha, beta){
    const key = boardHash(stateBoard, currentPlayer, botHasBlack, playerHasBlack) + '|d' + depth;
    if (memo.has(key)) return memo.get(key);

    // terminal or depth 0
    const legal = moves.getLegalMoves(stateBoard, currentPlayer, { playerHasBlack: currentPlayer===1?playerHasBlack:botHasBlack }) || [];
    if (depth === 0 || !legal || legal.length === 0){
      const evalScore = staticEval(stateBoard);
      const res = { score: evalScore, move: null };
      memo.set(key, res);
      return res;
    }

    // limit branching: rank and keep top K
    legal.sort((a,b) => quickRank(stateBoard,b) - quickRank(stateBoard,a));
    const BRANCH_LIMIT = 28; // tuneable
    const branchList = legal.slice(0, BRANCH_LIMIT);

    let bestMove = null;

    if (currentPlayer === botPlayer){
      let value = -Infinity;
      for (const m of branchList){
        const sim = applyMove(stateBoard, m);
        const nextBotHasBlack = (currentPlayer === 2 && m.type === 'black') ? false : botHasBlack;
        const nextPlayerHasBlack = (currentPlayer === 1 && m.type === 'black') ? false : playerHasBlack;
        const child = minimax(sim, currentPlayer === 1 ? 2 : 1, nextBotHasBlack, nextPlayerHasBlack, depth-1, alpha, beta);
        if (child.score > value){ value = child.score; bestMove = m; }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      const res = { score: value, move: bestMove };
      memo.set(key, res);
      return res;
    } else {
      // opponent: minimize
      let value = Infinity;
      for (const m of branchList){
        const sim = applyMove(stateBoard, m);
        const nextBotHasBlack = (currentPlayer === 2 && m.type === 'black') ? false : botHasBlack;
        const nextPlayerHasBlack = (currentPlayer === 1 && m.type === 'black') ? false : playerHasBlack;
        const child = minimax(sim, currentPlayer === 1 ? 2 : 1, nextBotHasBlack, nextPlayerHasBlack, depth-1, alpha, beta);
        if (child.score < value){ value = child.score; bestMove = m; }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      const res = { score: value, move: bestMove };
      memo.set(key, res);
      return res;
    }
  }

  // root call: currentPlayer = bot (2)
  const root = minimax(board, 2, opts.botHasBlack, opts.playerHasBlack || false, maxDepth, -Infinity, Infinity);
  return root.move;
}
