// js/logic/graph.js
// Graph utilities for RuleRift
// - buildGridGraph(board): builds adjacency for white tiles and returns inequality edges
// - findArticulationPoints(adj): Tarjan-based articulation point finder

export function key(r, c) { return `${r},${c}`; }

export function parseKey(k) { const [r, c] = k.split(',').map(Number); return [r, c]; }

export function buildGridGraph(board) {
  const n = board.length;
  const inBounds = (r, c) => r >= 0 && r < n && c >= 0 && c < n;

  // adjacency map for **white** tiles only (non-black)
  const adj = new Map();
  const inequalityEdges = []; // { from, to, type }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c].isBlack) {
        adj.set(key(r, c), []);
      }
    }
  }

  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c].isBlack) continue;
      const u = key(r, c);

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (board[nr][nc].isBlack) continue;
        adj.get(u).push(key(nr, nc));
      }

      const cell = board[r][c];
      if (cell.inequalities) {
        if (cell.inequalities.right && inBounds(r, c+1)) inequalityEdges.push({ from: u, to: key(r, c+1), type: cell.inequalities.right });
        if (cell.inequalities.left  && inBounds(r, c-1)) inequalityEdges.push({ from: u, to: key(r, c-1), type: cell.inequalities.left });
        if (cell.inequalities.up    && inBounds(r-1, c)) inequalityEdges.push({ from: u, to: key(r-1, c), type: cell.inequalities.up });
        if (cell.inequalities.down  && inBounds(r+1, c)) inequalityEdges.push({ from: u, to: key(r+1, c), type: cell.inequalities.down });
      }
    }
  }

  return { adj, inequalityEdges };
}

// Tarjan-like articulation point detection
export function findArticulationPoints(adj) {
  const ids = new Map();
  const low = new Map();
  const visited = new Set();
  const isArt = new Map();
  let id = 0;

  function dfs(at, parent = null) {
    visited.add(at);
    ids.set(at, id);
    low.set(at, id);
    id++;
    let children = 0;

    for (const to of (adj.get(at) || [])) {
      if (!visited.has(to)) {
        children++;
        dfs(to, at);
        low.set(at, Math.min(low.get(at), low.get(to)));
        if (parent !== null && low.get(to) >= ids.get(at)) {
          isArt.set(at, true);
        }
      } else if (to !== parent) {
        low.set(at, Math.min(low.get(at), ids.get(to)));
      }
    }

    if (parent === null && children > 1) isArt.set(at, true);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) dfs(node, null);
  }

  return isArt; // Map node -> true
}
