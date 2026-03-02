// js/logic/graph.js
// -----------------------------------------------------------
// GRAPH UTILITIES FOR RULE RIFT
//
// PURPOSE:
//  - Convert board → Graph (white cells = nodes)
//  - Track adjacency between cells (movement structure)
//  - Extract inequality edges for logic (NOT used by greedy directly)
//  - Detect articulation points using Tarjan's Algorithm
//
// WHY GRAPH?
//  Each white tile is treated like a graph node.
//  Black tiles "remove" nodes from the graph, breaking connectivity.
//  Used by AI to check board structure health & penalize fragmentation.
// -----------------------------------------------------------


// -----------------------------------------------------------
// key(r,c)
// PURPOSE: Convert coordinates → unique ID for graph nodes
// WHY: Used as map keys (e.g., "2,3")
// -----------------------------------------------------------
export function key(r, c) { return `${r},${c}`; }


// -----------------------------------------------------------
// parseKey(k)
// PURPOSE: Reverse of key(). Converts "2,3" → [2,3]
// WHY: Used when we need coordinates back from graph node ID.
// -----------------------------------------------------------
export function parseKey(k) {
  const [r, c] = k.split(',').map(Number);
  return [r, c];
}


// -----------------------------------------------------------
// buildGridGraph(board)
// PURPOSE:
//   Build adjacency list for ALL white tiles (non-black cells).
//   Treats the board like a graph where each cell is a node and
//   edges exist if cells are adjacent (Up/Down/Left/Right).
//
// OUTPUT:
//   {
//      adj: Map of node -> [neighbors],
//      inequalityEdges: constraints between cells like < > etc.
//   }
//
// Importance for AI:
//   - Used to detect connectivity
//   - AI checks if move isolates regions (bad structure)
// -----------------------------------------------------------
export function buildGridGraph(board) {
  const n = board.length;
  const inBounds = (r, c) => r >= 0 && r < n && c >= 0 && c < n;

  // adj = nodes for **white** tiles only (black = removed)
  const adj = new Map();
  const inequalityEdges = []; // stores inequality symbols (future use)

  // -----------------------------------------------------------
  // STEP 1: Create nodes for ALL non-black cells
  // -----------------------------------------------------------
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c].isBlack) {
        adj.set(key(r, c), []); // each entry gets an empty neighbor list
      }
    }
  }

  // -----------------------------------------------------------
  // STEP 2: Connect nodes (4-direction adjacency)
  // If neighbor exists AND is not black → add edge
  // -----------------------------------------------------------
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]]; // Right, Left, Down, Up

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {

      if (board[r][c].isBlack) continue; // skip removed cells
      const u = key(r, c); // node id

      // CHECK 4 NEIGHBORS
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (board[nr][nc].isBlack) continue;
        adj.get(u).push(key(nr, nc)); // connect edge
      }

      // -----------------------------------------------------------
      // STEP 3: If inequality hints exist (>, <, ^, v)
      // Store them for rules (NOT graph edges)
      // Used for rule validation or future improvements.
      // -----------------------------------------------------------
      const cell = board[r][c];
      if (cell.inequalities) {
        if (cell.inequalities.right && inBounds(r, c+1))
          inequalityEdges.push({ from: u, to: key(r, c+1), type: cell.inequalities.right });
        if (cell.inequalities.left  && inBounds(r, c-1))
          inequalityEdges.push({ from: u, to: key(r, c-1), type: cell.inequalities.left });
        if (cell.inequalities.up    && inBounds(r-1, c))
          inequalityEdges.push({ from: u, to: key(r-1, c), type: cell.inequalities.up });
        if (cell.inequalities.down  && inBounds(r+1, c))
          inequalityEdges.push({ from: u, to: key(r+1, c), type: cell.inequalities.down });
      }
    }
  }

  // FINAL OUTPUT
  return { adj, inequalityEdges };
}


// -----------------------------------------------------------
// findArticulationPoints(adj)
// PURPOSE:
//   Detect nodes that, if removed, would break the graph
//   into more connected components.
//   These are CHOKEPOINTS and represent structural weakness.
//
// USED BY AI to:
//   ❌ Penalize moves that create new articulation points
//   ✅ Reward moves that remove them
//
// BASED ON:
//   Tarjan's Algorithm (DFS based low-link values)
// -----------------------------------------------------------
export function findArticulationPoints(adj) {

  const ids = new Map();      // Discovery order ID per node
  const low = new Map();      // Lowest reachable ID (back-edge concept)
  const visited = new Set();  // Track DFS visited nodes
  const isArt = new Map();    // Mark nodes which ARE articulation points
  let id = 0;                 // Global DFS time counter (incrementing)

  // -----------------------------------------------------------
  // dfs(at, parent)
  // CORE OF TARJAN’S ALGORITHM
  // - Assign ID
  // - DFS into neighbors
  // - Update low-link values
  // - Detect articulation via (low[child] >= id[parent])
  // -----------------------------------------------------------
  function dfs(at, parent = null) {

    visited.add(at);
    ids.set(at, id);
    low.set(at, id);
    id++;

    let children = 0; // track children of DFS tree root

    for (const to of (adj.get(at) || [])) {

      if (!visited.has(to)) {        // Tree Edge
        children++;
        dfs(to, at);                 // Recurse

        // Update low-link
        low.set(at, Math.min(low.get(at), low.get(to)));

        // Articulation condition (non-root)
        if (parent !== null && low.get(to) >= ids.get(at)) {
          isArt.set(at, true);       // removing 'at' will separate graph
        }

      } else if (to !== parent) {    // Back Edge (cycle)
        low.set(at, Math.min(low.get(at), ids.get(to)));
      }
    }

    // Root special case: if root has 2+ children → articulation
    if (parent === null && children > 1) {
      isArt.set(at, true);
    }
  }

  // -----------------------------------------------------------
  // RUN DFS for all unvisited nodes (covers disconnected graphs)
  // -----------------------------------------------------------
  for (const node of adj.keys()) {
    if (!visited.has(node)) dfs(node, null);
  }

  // Return a map where node -> true means articulation point
  return isArt;
}
