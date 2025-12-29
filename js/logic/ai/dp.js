// js/logic/ai/dp.js
import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { cloneBoard } from '../board.js';

function serializeCell(c) {
  const val = c.isBlack ? 'B' : (c.value ?? '.');
  const ineq = c.inequalities ? `${c.inequalities.up ?? '.'}${c.inequalities.down ?? '.'}${c.inequalities.left ?? '.'}${c.inequalities.right ?? '.'}` : '....';
  return val + ineq;
}

function getBoardHash(board, currentPlayer, botHasBlack, playerHasBlack) {
  const flat = board.map(row => row.map(c => serializeCell(c)).join('')).join('|');
  return `${flat}|P${currentPlayer}|b${botHasBlack?1:0}|p${playerHasBlack?1:0}`;
}

// staticEval from BOT's perspective (positive = good for bot)
function staticEval(board, botHasBlack, playerHasBlack) {
  let score = 0;
  const n = board.length;

  // progress: reward filled white tiles (small)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (!cell.isBlack && cell.value !== null) score += 2;
    }
  }

  // Mobility: (#bot moves - #human moves)
  const botLegal = moves.getLegalMoves(board, 2, { playerHasBlack: botHasBlack }).length;
  const humanLegal = moves.getLegalMoves(board, 1, { playerHasBlack: playerHasBlack }).length;
  score += (botLegal - humanLegal) * 3;

  score += (botHasBlack ? 5 : 0);
  score -= (playerHasBlack ? 5 : 0);

  return score;
}

function rankMoves(move) {
  if (move.type === 'place') return 100 + (move.value || 0);
  return 10;
}

function applyMove(board, move) {
  const sim = cloneBoard(board);
  if (move.type === 'place') sim[move.r][move.c].value = move.value;
  else if (move.type === 'black') sim[move.r][move.c].isBlack = true;
  return sim;
}

export function dpChoose(board, opts = { botHasBlack: false, playerHasBlack: true }, maxDepth = 3) {
  const BOT_ID = 2; const HUMAN_ID = 1;
  const memo = new Map();

  function minimax(stateBoard, currentPlayer, botBlack, humanBlack, depth, alpha, beta) {
    const key = getBoardHash(stateBoard, currentPlayer, botBlack, humanBlack);
    if (memo.has(key)) return memo.get(key);

    const hasBlack = currentPlayer === BOT_ID ? botBlack : humanBlack;
    const legal = moves.getLegalMoves(stateBoard, currentPlayer, { playerHasBlack: hasBlack }) || [];

    if (legal.length === 0) {
      // No moves = loss for current player
      const score = currentPlayer === BOT_ID ? -10000 + depth : 10000 - depth;
      const res = { score, move: null };
      memo.set(key, res);
      return res;
    }

    if (depth === 0) {
      const score = staticEval(stateBoard, botBlack, humanBlack);
      const res = { score, move: null };
      memo.set(key, res);
      return res;
    }

    legal.sort((a, b) => rankMoves(b) - rankMoves(a));
    const BRANCH_LIMIT = 20;
    const branchList = legal.slice(0, BRANCH_LIMIT);

    let bestMove = null;

    if (currentPlayer === BOT_ID) {
      let maxEval = -Infinity;
      for (const m of branchList) {
        const sim = applyMove(stateBoard, m);
        const nextBotBlack = (m.type === 'black') ? false : botBlack;
        const child = minimax(sim, HUMAN_ID, nextBotBlack, humanBlack, depth - 1, alpha, beta);
        if (child.score > maxEval) { maxEval = child.score; bestMove = m; }
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) break;
      }
      const res = { score: maxEval, move: bestMove };
      memo.set(key, res);
      return res;
    } else {
      let minEval = Infinity;
      for (const m of branchList) {
        const sim = applyMove(stateBoard, m);
        const nextHumanBlack = (m.type === 'black') ? false : humanBlack;
        const child = minimax(sim, BOT_ID, botBlack, nextHumanBlack, depth - 1, alpha, beta);
        if (child.score < minEval) { minEval = child.score; bestMove = m; }
        beta = Math.min(beta, minEval);
        if (beta <= alpha) break;
      }
      const res = { score: minEval, move: bestMove };
      memo.set(key, res);
      return res;
    }
  }

  const root = minimax(board, BOT_ID, opts.botHasBlack, opts.playerHasBlack, maxDepth, -Infinity, Infinity);
  return root.move;
}
