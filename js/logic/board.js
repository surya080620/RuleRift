// js/logic/board.js

/**
 * Creates a fresh N x N board.
 * @param {number} size - The dimension of the grid (e.g., 5).
 * @returns {Array<Array<object>>} The initialized board structure.
 */
export function createBoard(size) {
  // Array.from is cleaner for initialization
  return Array.from({ length: size }, () => 
    Array.from({ length: size }, () => createCell())
  );
}

/**
 * Helper to create a single empty cell object.
 * Centralizing this ensures consistency if the data structure changes later.
 */
function createCell() {
  return {
    value: null,
    isBlack: false,
    inequalities: { 
      up: null, 
      down: null, 
      left: null, 
      right: null 
    }
  };
}

/**
 * Deeply clones the board state.
 * OPTIMIZED: Uses explicit loops and property assignment instead of .map/Object.assign.
 * This is critical for AI performance (Minimax/Greedy simulations).
 * * @param {Array<Array<object>>} board - The source board.
 * @returns {Array<Array<object>>} A deep copy of the board.
 */
export function cloneBoard(board) {
  const size = board.length;
  const newBoard = new Array(size);

  for (let r = 0; r < size; r++) {
    newBoard[r] = new Array(size);
    for (let c = 0; c < size; c++) {
      const src = board[r][c];
      
      // Manual construction is faster than Object.assign or spread {...}
      newBoard[r][c] = {
        value: src.value,
        isBlack: src.isBlack,
        inequalities: {
          up: src.inequalities.up,
          down: src.inequalities.down,
          left: src.inequalities.left,
          right: src.inequalities.right
        }
      };
    }
  }
  return newBoard;
}

/**
 * Resets the board state (clears values/blacks) but PRESERVES inequalities.
 * Useful for a "Restart Level" feature.
 */
export function resetBoard(board) {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      board[r][c].value = null;
      board[r][c].isBlack = false;
    }
  }
}