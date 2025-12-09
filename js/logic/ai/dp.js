import { getAllNumberMoves } from '../moves.js';
import { greedyChoose } from './greedy.js';
import { deepClone } from '../../utils/helpers.js';

const memo = new Map();

function hashBoard(board) {
  return board.map(row => row.map(c => (c.isBlack ? 'B' : (c.value === null ? '.' : c.value))).join('|')).join('/');
}

/** shallow lookahead DP: choose move with best immediate + best response using greedy */
export function dpChoose(board) {
  const key = hashBoard(board);
  if (memo.has(key)) return memo.get(key);
  const moves = getAllNumberMoves(board);
  if (!moves.length) return null;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    // simulate
    const sim = deepClone(board);
    sim[m.r][m.c].value = m.value;
    // opponent best reply (greedy)
    const opp = greedyChoose(sim);
    let score = 1; // baseline
    if (!opp) score += 0.5;
    // small heuristic: prefer moves that don't create many new legal moves for opponent
    const oppMovesAfter = getAllNumberMoves(sim).length;
    score -= oppMovesAfter * 0.02;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  memo.set(key, best);
  return best;
}
