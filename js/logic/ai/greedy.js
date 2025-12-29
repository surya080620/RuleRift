// js/logic/ai/greedy.js
// Greedy Strategy (graph-aware)
// Uses lightweight mutation/backtracking and your graph.js utilities.

import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { buildGridGraph, findArticulationPoints } from '../graph.js';

/** Helper: count connected components in adjacency (Map<string, string[]>). */
function countComponents(adj) {
  const seen = new Set();
  let comps = 0;
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    comps++;
    // BFS/stack
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const u = stack.pop();
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!seen.has(v)) {
          seen.add(v);
          stack.push(v);
        }
      }
    }
  }
  return comps;
}

/** Score domain: scan empty white cells for valid numbers. Return {score, dead}. */
function calcDomainScore(board) {
  const n = board.length;
  let score = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (cell.isBlack || cell.value !== null) continue;
      const vCount = rules.getValidNumbers(board, r, c).length;
      if (vCount === 0) return { score: -Infinity, dead: true };
      score -= vCount; // fewer options => higher (less negative) priority
    }
  }
  return { score, dead: false };
}

/** Evaluate a single move by applying it (mutate), analyzing, then reverting. */
function evaluateMoveQuality(board, move) {
  const { r, c, type, value } = move;
  const cell = board[r][c];

  // Save previous state
  const prevValue = cell.value;
  const prevBlack = cell.isBlack;

  // Pre-graph (before applying move)
  const pre = buildGridGraph(board);
  const preAdj = pre.adj;
  const preArtMap = findArticulationPoints(preAdj);
  const preArtCount = [...preArtMap.keys ? preArtMap.keys() : preArtMap].length || Array.from(preArtMap || []).length;
  // countComponents requires Map keys; if board all black/filled preAdj may be empty -> components 0
  const preCompCount = preAdj.size ? countComponents(preAdj) : 0;

  // Apply move (mutate)
  if (type === 'place') cell.value = value;
  else if (type === 'black') cell.isBlack = true;

  // Domain check (fast fail)
  const domain = calcDomainScore(board);
  if (domain.dead) {
    // revert and return fatal
    cell.value = prevValue;
    cell.isBlack = prevBlack;
    return -Infinity;
  }

  // Post-graph (after move)
  const post = buildGridGraph(board);
  const postAdj = post.adj;
  const postArtMap = findArticulationPoints(postAdj);
  // compute sizes
  let postArtCount = 0;
  if (postArtMap && typeof postArtMap.forEach === 'function') {
    postArtMap.forEach((v, k) => { if (v) postArtCount++; });
  } else {
    // If findArticulationPoints returns a Map-like object, handle gracefully
    postArtCount = postArtMap ? Array.from(postArtMap.keys()).length : 0;
  }
  const postCompCount = postAdj.size ? countComponents(postAdj) : 0;

  // Scoring heuristics
  let score = 0;

  // 1. Domain score (from calcDomainScore)
  score += domain.score;

  // 2. Fragmentation penalty: heavily penalize creating extra components
  if (postCompCount > preCompCount) {
    score -= (postCompCount - preCompCount) * 60; // strong penalty per extra fragment
  } else if (postCompCount < preCompCount) {
    score += (preCompCount - postCompCount) * 30; // bonus for merging components
  }

  // 3. Articulation (chokepoint) changes
  if (postArtCount > preArtCount) {
    score -= (postArtCount - preArtCount) * 6; // small penalty per new chokepoint
  } else if (postArtCount < preArtCount) {
    score += (preArtCount - postArtCount) * 8; // reward if we remove chokepoints
  }

  // 4. Absolute penalties/bonuses
  // Prefer boards with no articulation points
  if (postArtCount === 0) score += 6;

  // 5. Type bias: prefer placing numbers over blacks (conserve blacks)
  const typeBonus = (type === 'place') ? 20 : 2;
  score += typeBonus;

  // 6. Center control bias (small)
  const n = board.length;
  const center = (n - 1) / 2;
  const dist = Math.abs(r - center) + Math.abs(c - center);
  score += Math.max(0, 6 - dist);

  // 7. Minor tie-breaker: prefer moves that increase local degree (more neighbors)
  // Calculate degree at (r,c) in postAdj if white (if black, degree 0)
  const nodeKey = `${r},${c}`;
  const deg = postAdj.has(nodeKey) ? (postAdj.get(nodeKey) || []).length : 0;
  score += Math.min(deg, 4) * 0.7;

  // Revert
  cell.value = prevValue;
  cell.isBlack = prevBlack;

  return score;
}

export function greedyChoose(board, opts = { botHasBlack: false, regionFilter: null }) {
  // 1. Gather Legal Moves
  let candidates = moves.getLegalMoves(board, 2, { playerHasBlack: opts.botHasBlack });

  // 2. Apply region filter if provided
  if (opts.regionFilter) {
    candidates = candidates.filter(m => opts.regionFilter(m.r, m.c));
  }

  if (!candidates || candidates.length === 0) return null;

  // 3. Small optimization: if only a few candidates, evaluate all; otherwise limit to top-K by quick heuristic
  // Quick heuristic: prefer 'place' over 'black' and prefer center proximity (cheap to compute)
  const QUICK_LIMIT = 120; // large but safe; for small boards all candidates will be kept
  if (candidates.length > QUICK_LIMIT) {
    candidates.sort((a, b) => {
      // prefer place
      if (a.type !== b.type) return a.type === 'place' ? -1 : 1;
      // center proximity
      const n = board.length;
      const center = (n - 1) / 2;
      const da = Math.abs(a.r - center) + Math.abs(a.c - center);
      const db = Math.abs(b.r - center) + Math.abs(b.c - center);
      return da - db;
    });
    candidates = candidates.slice(0, QUICK_LIMIT);
  }

  // Slight shuffle to avoid absolute determinism in ties
  candidates.sort(() => Math.random() - 0.5);

  let best = null;
  let bestScore = -Infinity;

  for (const mv of candidates) {
    const sc = evaluateMoveQuality(board, mv);
    // tiny jitter to break ties but preserve ordering
    const jitter = Math.random() * 1e-6;
    const finalScore = sc + jitter;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = mv;
    }
  }

  return best;
}
