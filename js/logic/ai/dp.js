import { cloneBoard, hashBoard } from '../board.js';
import { getAllNumberMoves, getAllBlackMoves } from '../moves.js';

/**
 * Shallow DP: examine immediate moves and one-step lookahead using memoization.
 * Returns the best move found.
 */
const memo = {};

export function dpChoose(board, context = { blackAvailable: true }) {
  const key = JSON.stringify(board.map(r => r.map(c => ({v:c.value,b:c.isBlack}))));
  if (memo[key]) return memo[key];

  const numMoves = getAllNumberMoves(board);
  const blackMoves = context.blackAvailable ? getAllBlackMoves(board) : [];

  // if no moves, return null
  if (numMoves.length === 0 && blackMoves.length === 0) { memo[key] = null; return null; }

  // evaluate moves heuristically, with 1-step lookahead scoring
  let best = null, bestScore = -Infinity;
  const scoreMove = (move) => {
    // baseline
    let s = (move.type === 'place') ? 5 : 1;
    // shallow lookahead: simulate and count number of moves remaining (more is better)
    const b = cloneBoard(board);
    if (move.type === 'place') b[move.r][move.c].value = move.value;
    else if (move.type === 'black') b[move.r][move.c].isBlack = true;
    const nm = getAllNumberMoves(b).length + (context.blackAvailable && move.type!=='black' ? getAllBlackMoves(b).length : 0);
    s += nm * 0.1;
    return s;
  };

  for (const m of [...numMoves, ...blackMoves]) {
    const s = scoreMove(m);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  memo[key] = best;
  return best;
}
