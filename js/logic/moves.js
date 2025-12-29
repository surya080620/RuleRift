// js/logic/moves.js
import * as rules from './rules.js';

/**
 * Generates all legal moves for the current player.
 */
export function getLegalMoves(board, player, opts = { playerHasBlack: false }) {
  const n = board.length;
  const moves = [];

  // If black moves might be considered, build white graph once for efficient checks
  const precomp = opts.playerHasBlack ? rules.precomputeWhiteGraph(board) : null;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (cell.isBlack || cell.value !== null) continue;

      const validNumbers = rules.getValidNumbers(board, r, c);
      for (let i = 0; i < validNumbers.length; i++) {
        moves.push({ type: 'place', r, c, value: validNumbers[i] });
      }

      if (opts.playerHasBlack) {
        if (rules.canPlaceBlack(board, r, c, precomp)) moves.push({ type: 'black', r, c });
      }
    }
  }

  return moves;
}

export function getSortedLegalMoves(board, player, opts) {
  const ms = getLegalMoves(board, player, opts);
  return ms.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'place' ? -1 : 1;
    return 0;
  });
}
