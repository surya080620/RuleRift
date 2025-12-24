// js/logic/ai/dc.js
// Divide & Conquer Strategy:
// Splits the board into quadrants and identifies the best local "greedy" move in each.
// This prevents the AI from having "tunnel vision" (bias toward top-left) and
// encourages play across the entire board surface.

import { greedyChoose } from './greedy.js';

/**
 * Creates a filter function for a specific quadrant of the board.
 * @param {number} n - The board size (e.g., 5)
 * @param {number} qIndex - Quadrant index (0: TL, 1: TR, 2: BL, 3: BR)
 * @returns {function(number, number): boolean} A filter function returning true if (r, c) is in the quadrant.
 */
function createQuadrantFilter(n, qIndex) {
  const mid = Math.floor(n / 2);

  // Bitwise check: If qIndex is 2 or 3 (binary 10, 11), it's the bottom half.
  const rMin = (qIndex & 2) ? mid : 0;
  const rMax = (qIndex & 2) ? n : mid;

  // Bitwise check: If qIndex is 1 or 3 (binary 01, 11), it's the right half.
  const cMin = (qIndex & 1) ? mid : 0;
  const cMax = (qIndex & 1) ? n : mid;

  return (r, c) => r >= rMin && r < rMax && c >= cMin && c < cMax;
}

/**
 * Chooses a move using a Divide & Conquer approach.
 * @param {Array<Array<object>>} board - The game board state.
 * @param {object} opts - Options, including { botHasBlack: boolean }.
 * @param {number} [depth=1] - (Reserved for future recursive depth).
 * @returns {object|null} The chosen move {type, r, c, value} or null if none found.
 */
export function dcChoose(board, opts = { botHasBlack: false }) {
  const n = board.length;

  // Optimization: For very small boards (e.g., 3x3), partitioning is overhead.
  // Just run global greedy immediately.
  if (n < 4) {
    return greedyChoose(board, opts);
  }

  const regionCandidates = [];

  // Iterate through 4 quadrants (0 to 3)
  for (let i = 0; i < 4; i++) {
    const filter = createQuadrantFilter(n, i);
    
    // Ask greedy logic to find the best move *strictly* within this quadrant
    const move = greedyChoose(board, { 
      ...opts, 
      regionFilter: filter 
    });

    if (move) {
      // Base score: High priority for placing numbers (10), lower for black tiles (3)
      let score = move.type === 'place' ? 10 : 3;

      // Heuristic: Center Bias
      // We prefer moves closer to the center of the board to control space.
      // Dist calculates Manhattan distance from center.
      const center = (n - 1) / 2;
      const dist = Math.abs(move.r - center) + Math.abs(move.c - center);
      
      // Subtract small penalty based on distance (closer = higher score)
      score -= (dist * 0.05);

      regionCandidates.push({ move, score });
    }
  }

  // If we found candidates in the regions, pick the one with the highest score
  if (regionCandidates.length > 0) {
    // Sort descending by score
    regionCandidates.sort((a, b) => b.score - a.score);
    return regionCandidates[0].move;
  }

  // Fallback: If no moves were found in strict quadrants (unlikely, but possible 
  // if board is very full or constrained), try a global search.
  return greedyChoose(board, opts);
}