import { getAllNumberMoves, getAllBlackMoves } from '../moves.js';

/**
 * Simple greedy: score each number move and black move, choose highest.
 * Additional heuristics can be added.
 */
function scoreNumberMove(board, move) {
  const n = board.length;
  let s = 0;
  // baseline: prefer moves that fill a cell
  s += 5;
  // prefer moves near center
  const center = (n-1)/2;
  s += (n - (Math.abs(move.r - center) + Math.abs(move.c - center))) * 0.3;
  // prefer numbers that satisfy some inequalities (small bonus)
  // (We cannot inspect inequality satisfaction easily here without simulating; keep simple)
  // slight tie-breaker prefer smaller numbers
  s += (n - move.value) * 0.05;
  return s;
}

function scoreBlackMove(board, move) {
  let s = 0;
  // treat black as lower priority; prefer edges
  const n = board.length;
  if (move.r === 0 || move.r === n-1 || move.c === 0 || move.c === n-1) s += 1.5;
  s += 0.5;
  return s;
}

export function greedyChoose(board, context = { blackAvailable: true, gridSize: 5 }) {
  const numberMoves = getAllNumberMoves(board);
  const blackMoves = context.blackAvailable ? getAllBlackMoves(board) : [];

  let best = null;
  let bestScore = -Infinity;

  for (const m of numberMoves) {
    const s = scoreNumberMove(board, m);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  for (const m of blackMoves) {
    const s = scoreBlackMove(board, m);
    // only choose black if score close to best number move (gives bot possible strategic block)
    if (s + 0.2 > bestScore) { bestScore = s; best = m; }
  }
  return best;
}
