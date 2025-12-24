// js/logic/rules.js
import { cloneBoard } from './board.js';

/**
 * Checks if a specific number can be placed at (r, c).
 * Validates: Latin Square (Row/Col uniqueness) + Inequalities.
 */
export function canPlaceNumber(board, r, c, value) {
  const n = board.length;
  const cell = board[r][c];

  // 1. Basic Checks
  if (cell.isBlack) return false;
  if (value < 1 || value > n) return false;

  // 2. Latin Square Constraint (Row & Column Uniqueness)
  // We strictly ignore the current position (r,c) to allow re-validation of existing boards.
  for (let i = 0; i < n; i++) {
    // Check Row (ignoring self)
    if (i !== c) {
      const rowCell = board[r][i];
      if (!rowCell.isBlack && rowCell.value === value) return false;
    }
    // Check Column (ignoring self)
    if (i !== r) {
      const colCell = board[i][c];
      if (!colCell.isBlack && colCell.value === value) return false;
    }
  }

  // 3. Inequality Constraints
  // Helper to get neighbor safely
  const getCell = (rr, cc) => (rr >= 0 && rr < n && cc >= 0 && cc < n) ? board[rr][cc] : null;

  const neighbors = {
    up:    getCell(r - 1, c),
    down:  getCell(r + 1, c),
    left:  getCell(r, c - 1),
    right: getCell(r, c + 1)
  };

  // Helper: Validates "CurrentValue [Symbol] NeighborValue"
  // Example: symbol '<' means Current < Neighbor
  const checkConstraint = (dir, neighbor) => {
    const symbol = cell.inequalities[dir];
    if (!symbol) return true; // No constraint defined
    
    // If neighbor is invalid, black, or empty, the constraint is technically "satisfied" 
    // (or rather, not yet violated) until the neighbor is filled.
    if (!neighbor || neighbor.isBlack || neighbor.value === null) return true;

    if (symbol === '<') return value < neighbor.value;
    if (symbol === '>') return value > neighbor.value;
    
    return true;
  };

  if (!checkConstraint('up', neighbors.up)) return false;
  if (!checkConstraint('down', neighbors.down)) return false;
  if (!checkConstraint('left', neighbors.left)) return false;
  if (!checkConstraint('right', neighbors.right)) return false;

  return true;
}

/**
 * Checks if a Black Tile can be placed at (r, c).
 * Validates: Adjacency (No blacks touching) + Connectivity (Whites remain 1 group).
 */
export function canPlaceBlack(board, r, c) {
  const cell = board[r][c];
  
  // 1. Cannot replace existing black or existing number
  if (cell.isBlack || cell.value !== null) return false;

  const n = board.length;

  // 2. Adjacency Rule: Cannot touch another black tile orthogonally
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
      if (board[nr][nc].isBlack) return false;
    }
  }

  // 3. Connectivity Rule: Placing this black tile must not split the white tiles
  // We simulate the placement and run a flood fill (BFS).
  const sim = cloneBoard(board);
  sim[r][c].isBlack = true;

  return whitesRemainConnected(sim);
}

/**
 * Verifies that all White (non-black) tiles form a single connected component.
 * Uses BFS Flood Fill.
 */
export function whitesRemainConnected(board) {
  const n = board.length;
  let startNode = null;
  let whiteCount = 0;

  // 1. Count white tiles and find a start point
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c].isBlack) {
        whiteCount++;
        if (!startNode) startNode = [r, c];
      }
    }
  }

  // Edge Case: If no white tiles exist (impossible in this game, but good for safety)
  if (whiteCount === 0) return true;

  // 2. BFS Traversal
  const visited = new Set();
  const queue = [startNode];
  // Simple unique key for Set: "r,c"
  visited.add(`${startNode[0]},${startNode[1]}`);
  
  let connectedCount = 0;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (queue.length > 0) {
    const [currR, currC] = queue.shift();
    connectedCount++;

    for (const [dr, dc] of dirs) {
      const nr = currR + dr;
      const nc = currC + dc;

      // Boundary check
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        // Must be white and not visited
        if (!board[nr][nc].isBlack) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  // 3. Result: Did we find every white tile?
  return connectedCount === whiteCount;
}

/**
 * Checks if the board is 100% full and valid.
 * This is the Victory Condition.
 */
export function isBoardComplete(board) {
  const n = board.length;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];

      // If any white tile is empty, board is incomplete
      if (!cell.isBlack && cell.value === null) return false;

      // If filled, check validity again to ensure no rules were broken
      // (This re-uses the robust canPlaceNumber which handles self-exclusion)
      if (!cell.isBlack) {
        if (!canPlaceNumber(board, r, c, cell.value)) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Returns a list of all numbers (1..N) that are valid for a specific cell.
 * Used by AI and UI hints.
 */
export function getValidNumbers(board, r, c) {
  const n = board.length;
  const valid = [];
  
  // Optimization: If cell is black or already filled, no options (context dependent)
  // Usually this is called on an empty cell.
  if (board[r][c].isBlack) return [];

  for (let v = 1; v <= n; v++) {
    if (canPlaceNumber(board, r, c, v)) {
      valid.push(v);
    }
  }
  return valid;
}