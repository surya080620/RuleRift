// js/logic/rules.js
import { cloneBoard } from './board.js';
import { buildGridGraph, findArticulationPoints, key as _key } from './graph.js';

/**
 * Checks if a specific number can be placed at (r, c).
 * Validates: Latin Square (Row/Col uniqueness) + Inequalities.(greedy)
 */

export function canPlaceNumber(board, r, c, value) {
  const n = board.length;
  const cell = board[r][c];

  // 0. Quick rejection
  if (cell.isBlack) return false;
  if (cell.value !== null) return false; // already filled
  if (value < 1 || value > n) return false;

  // 1. Latin Square Constraint (Row & Column Uniqueness)
  for (let i = 0; i < n; i++) {
    if (i !== c) {
      const rowCell = board[r][i];
      if (!rowCell.isBlack && rowCell.value === value) return false;
    }
    if (i !== r) {
      const colCell = board[i][c];
      if (!colCell.isBlack && colCell.value === value) return false;
    }
  }

  // 2. Inequality Constraints
  const getCell = (rr, cc) => (rr >= 0 && rr < n && cc >= 0 && cc < n) ? board[rr][cc] : null;
  const neighbors = {
    up:    getCell(r - 1, c),
    down:  getCell(r + 1, c),
    left:  getCell(r, c - 1),
    right: getCell(r, c + 1)
  };

  const checkConstraint = (dir, neighbor) => {
    const symbol = cell.inequalities ? cell.inequalities[dir] : null;
    if (!symbol) return true;
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
 * Precompute the white adjacency and articulation points for the current board.
 * Returns { adj, aps } where adj is Map(node -> [neighbors]) and aps is Map(node -> true)
 */
export function precomputeWhiteGraph(board) {
  const { adj } = buildGridGraph(board);
  const aps = findArticulationPoints(adj);
  return { adj, aps };
}

/**
 * Checks if a Black Tile can be placed at (r, c).
 * Validates: Adjacency (No blacks touching) + Connectivity (Whites remain 1 group).
 * If `precomp` is passed (from precomputeWhiteGraph), it's used to avoid rebuilding the graph for each candidate.(GREEDY)
 */
export function canPlaceBlack(board, r, c, precomp = null) {
  const cell = board[r][c];
  if (cell.isBlack || cell.value !== null) return false;

  const n = board.length;

  // 1. Adjacency Rule
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
      if (board[nr][nc].isBlack) return false;
    }
  }

  // 2. Connectivity Rule: Use articulation points if available
  if (!precomp) {
    // fallback: naive simulation (safe but slower)
    const sim = cloneBoard(board);
    sim[r][c].isBlack = true;
    return whitesRemainConnected(sim);
  }

  const nodeKey = _key(r, c);
  // If the board already treats this node as a white node, check articulation
  if (!precomp.adj.has(nodeKey)) return true;

  // If node is an articulation point, removing it would split whites -> illegal
  if (precomp.aps.get(nodeKey)) return false;

  // Otherwise safe
  return true;
}

/**
 * Verifies that all White (non-black) tiles form a single connected component.
 * Uses BFS.
 */
export function whitesRemainConnected(board) {
  const n = board.length;
  let startNode = null;
  let whiteCount = 0;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c].isBlack) {
        whiteCount++;
        if (!startNode) startNode = [r, c];
      }
    }
  }

  if (whiteCount === 0) return true;

  const visited = new Set();
  const queue = [startNode];
  visited.add(`${startNode[0]},${startNode[1]}`);
  let connectedCount = 0;
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];

  // Use head pointer for efficient queue
  let head = 0;
  while (head < queue.length) {
    const [currR, currC] = queue[head++];
    connectedCount++;
    for (const [dr, dc] of dirs) {
      const nr = currR + dr, nc = currC + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        if (!board[nr][nc].isBlack) {
          const k = `${nr},${nc}`;
          if (!visited.has(k)) {
            visited.add(k);
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  return connectedCount === whiteCount;
}

/**
 * Checks if the board is complete and valid.
 */
export function isBoardComplete(board) {
  const n = board.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (!cell.isBlack && cell.value === null) return false;
      if (!cell.isBlack) {
        if (!canPlaceNumber(board, r, c, cell.value)) return false;
      }
    }
  }
  return true;
}

/**
 * Returns a list of all numbers (1..N) that are valid for a specific cell.(greedy)
 */
export function getValidNumbers(board, r, c) {
  const n = board.length;
  const valid = [];
  if (board[r][c].isBlack || board[r][c].value !== null) return valid;

  for (let v = 1; v <= n; v++) {
    if (canPlaceNumber(board, r, c, v)) valid.push(v);
  }
  return valid;
}

/**
 *used for dp not for greedy domain addressing.
 */
export function initDomains(board) {
  const n = board.length;
  const domains = Array.from({ length: n }, () => Array.from({ length: n }, () => new Set()));

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (cell.isBlack || cell.value !== null) continue;
      for (let v = 1; v <= n; v++) {
        if (canPlaceNumber(board, r, c, v)) domains[r][c].add(v);
      }
    }
  }

  return domains;
}
