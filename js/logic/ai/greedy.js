// js/logic/ai/greedy.js
// Greedy Strategy: Evaluates moves by their immediate impact on board possibilities (Entropy).
// Optimization: Uses mutation/backtracking instead of deep cloning for significant speedup.

import * as moves from '../moves.js';
import * as rules from '../rules.js';

/**
 * Temporarily applies a move to the board, evaluates the state, 
 * and then reverts the move (Backtracking pattern).
 */
function evaluateMoveQuality(board, move) {
  const { r, c, type, value } = move;
  const cell = board[r][c];

  // 1. MUTATE: Apply move directly to the live board
  // (Saving state for reversion)
  const prevValue = cell.value;
  const prevBlack = cell.isBlack;

  if (type === 'place') cell.value = value;
  else if (type === 'black') cell.isBlack = true;

  // 2. EVALUATE: Scan board for impact
  let score = 0;
  let deadEnds = 0;
  const n = board.length;

  // We scan all empty cells to see how the move affected them
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Skip filled cells (including the one we just placed)
      const current = board[i][j];
      if (current.isBlack || current.value !== null) continue;

      // Get valid numbers for this empty cell
      const validCount = rules.getValidNumbers(board, i, j).length;

      if (validCount === 0) {
        deadEnds++;
        // Optimization: If we created a dead end (impossible cell), 
        // this move is fatal. Stop calculating immediately.
        break;
      }

      // Heuristic: "Least Options Left" (Minimizing Entropy)
      // We subtract validCount. Lower validCount = Higher Score (closer to 0).
      // This forces the AI to pick moves that constrain the board towards a solution.
      score -= validCount;
    }
    if (deadEnds > 0) break;
  }

  // 3. REVERT: Restore the board exactly as it was
  cell.value = prevValue;
  cell.isBlack = prevBlack;

  // 4. FINAL SCORE
  if (deadEnds > 0) return -Infinity;

  // Strategic Bias:
  // Prefer 'place' (value 20) over 'black' (value 0) to conserve black tiles.
  const typeBonus = (type === 'place' ? 20 : 0);
  
  return score + typeBonus;
}

export function greedyChoose(board, opts = { botHasBlack: false, regionFilter: null }) {
  // 1. Gather Legal Moves
  let candidates = moves.getLegalMoves(board, 2, { playerHasBlack: opts.botHasBlack });

  // 2. Apply Filters (e.g., for Divide & Conquer)
  if (opts.regionFilter) {
    candidates = candidates.filter(m => opts.regionFilter(m.r, m.c));
  }

  if (!candidates || candidates.length === 0) return null;

  // 3. Select Best Move
  let bestMove = null;
  let bestScore = -Infinity;

  // Shuffle candidates slightly to prevent predictable patterns in ties
  candidates.sort(() => Math.random() - 0.5);

  for (const move of candidates) {
    // Add small random jitter (0-1) to break perfect ties non-deterministically
    const quality = evaluateMoveQuality(board, move);
    const jitter = Math.random(); 
    const finalScore = quality + jitter;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMove = move;
    }
  }

  return bestMove;
}