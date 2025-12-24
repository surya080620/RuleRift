// js/logic/moves.js
// Move Generation: Identifies all legal moves for a given board state.
// Improvements: Combined loop logic for efficiency, consistent return types.

import * as rules from './rules.js';

/**
 * Generates all legal moves for the current player.
 * @param {Array<Array<object>>} board - The current board state.
 * @param {number} player - The player ID (1: Human, 2: Bot).
 * @param {object} opts - Options object.
 * @param {boolean} opts.playerHasBlack - Whether the player has a black tile available.
 * @returns {Array<object>} List of move objects { type, r, c, value? }.
 */
export function getLegalMoves(board, player, opts = { playerHasBlack: false }) {
  const n = board.length;
  const moves = [];

  // Optimization: Single pass through the board (O(N^2)) to gather 
  // both number and black moves simultaneously.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];

      // Skip occupied cells (cannot place anything on top of existing value/black)
      if (cell.isBlack || cell.value !== null) continue;

      // 1. Check Number Placements
      const validNumbers = rules.getValidNumbers(board, r, c);
      // Using standard for-loop for slight perf gain over for..of in hot paths
      for (let i = 0; i < validNumbers.length; i++) {
        moves.push({ type: 'place', r, c, value: validNumbers[i] });
      }

      // 2. Check Black Tile Placement (if player has inventory)
      if (opts.playerHasBlack) {
        if (rules.canPlaceBlack(board, r, c)) {
          moves.push({ type: 'black', r, c });
        }
      }
    }
  }

  return moves;
}

/**
 * Returns legal moves sorted by a basic heuristic.
 * AI Optimization: Checking "Place Number" moves before "Place Black" 
 * usually leads to faster winning paths or faster cutoffs in search.
 */
export function getSortedLegalMoves(board, player, opts) {
  const moves = getLegalMoves(board, player, opts);
  
  return moves.sort((a, b) => {
    // 1. Prioritize 'place' (Number) over 'black' (Blocker)
    if (a.type !== b.type) {
        return a.type === 'place' ? -1 : 1;
    }
    // 2. (Optional) If both are numbers, could prioritize smaller values 
    // or specific cells, but type-sorting is the biggest win.
    return 0;
  });
}