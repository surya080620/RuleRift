import { getAllNumberMoves } from '../moves.js';

function scoreNumberMove(board, move) {
  let score = 0;
  // prefer center cells a little
  const n = board.length;
  const center = (n-1)/2;
  score -= (Math.abs(move.r-center) + Math.abs(move.c-center)) * 0.1;
  // encourage moves that satisfy inequalities if neighbor exists and becomes valid
  const cell = board[move.r][move.c];
  if (cell.inequalities.left || cell.inequalities.right || cell.inequalities.up || cell.inequalities.down) score += 0.7;
  // prefer moves that reduce number of empty cells (progress)
  score += 0.2;
  // slight bias to smaller numbers to keep options open
  score += (n - move.value) * 0.01;
  return score;
}

export function greedyChoose(board) {
  const moves = getAllNumberMoves(board);
  if (!moves.length) return null;
  let best = null, bs = -Infinity;
  for (const m of moves) {
    const s = scoreNumberMove(board, m);
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}
