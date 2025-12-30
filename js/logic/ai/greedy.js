// js/logic/ai/greedy.js
// Greedy Strategy (graph-aware) — optimized
// Core idea: Analyze each move's IMMEDIATE impact using graph + domain changes
// No deep search, but fast structural evaluation.

// ------------------------------------------------------------
// IMPORTS
// moves.js  -> provides legal move generation
// rules.js  -> validity checks for numbers
// graph.js  -> adjacency & articulation detection
// ------------------------------------------------------------

import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { buildGridGraph, findArticulationPoints } from '../graph.js';

// ------------------------------------------------------------
// FUNCTION: countComponents(adj)
// PURPOSE: Count how many connected clusters exist in the board graph.
// Meaning: More components = board is fragmented (bad structure)
// Optimized: Uses DFS/Stack, no recursion to avoid overhead
// ------------------------------------------------------------
function countComponents(adj) {
  const seen = new Set();
  let comps = 0;
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    comps++;
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

// ------------------------------------------------------------
// FUNCTION: buildValidCounts(board)
// PURPOSE: Pre-calculate valid number options for each cell ONCE.
// Used for domain scoring.
// Benefit: Prevents recalculating full board on every move.
// ------------------------------------------------------------
function buildValidCounts(board) {
  const n = board.length;
  const validCounts = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (cell.isBlack || cell.value !== null) continue;
      validCounts[r][c] = rules.getValidNumbers(board, r, c).length;
    }
  }
  return validCounts;
}

// ------------------------------------------------------------
// FUNCTION: sumDomainScoreFromCounts(validCounts)
// PURPOSE: Convert cached validity numbers into score.
// Logic: More options = worse (score goes negative)
// ------------------------------------------------------------
function sumDomainScoreFromCounts(validCounts) {
  let score = 0;
  for (let r = 0; r < validCounts.length; r++) {
    for (let c = 0; c < validCounts.length; c++) {
      const v = validCounts[r][c] || 0;
      if (v > 0 || v === 0) score -= v;
    }
  }
  return score;
}

// ------------------------------------------------------------
// FUNCTION: getAffectedPositions(r,c)
// PURPOSE: When a move happens at (r,c) only NEARBY cells matter.
// We only recompute domain around: row, column, neighbors
// Major Optimization: Avoids full board recalculation.
// ------------------------------------------------------------
function getAffectedPositions(board, r, c) {
  const n = board.length;
  const positions = new Set();

  for (let i = 0; i < n; i++) {
    positions.add(`${r},${i}`);
    positions.add(`${i},${c}`);
  }
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n) positions.add(`${nr},${nc}`);
  }

  return Array.from(positions).map(k => k.split(',').map(Number));
}

// ------------------------------------------------------------
// FUNCTION: simulateAdjRemoval(preAdj,nodeKey)
// PURPOSE: When black tile placed, remove the cell from graph.
// Does NOT rebuild full graph → LOCAL simulation only.
// Saves performance.
// ------------------------------------------------------------
function simulateAdjRemoval(preAdj, nodeKey) {
  const newAdj = new Map();
  for (const [k, arr] of preAdj.entries()) {
    if (k === nodeKey) continue;
    newAdj.set(k, arr.filter(x => x !== nodeKey));
  }
  return newAdj;
}

// ------------------------------------------------------------
// FUNCTION: evaluateMoveQuality()
// PURPOSE: Core evaluation for EACH move.
// This does:
//  1. Mutate cell (apply move)
//  2. Local domain recalculation (row/col/neighbors only)
//  3. Graph impact check (only for black tiles)
//  4. Apply scoring rules
//  5. Undo mutation (revert)
//
// Returns: Score (Number)  — higher = better move
// ------------------------------------------------------------
function evaluateMoveQuality(board, move, preAdj, preArtCount, preCompCount, preValidCounts, preDomainScore) {
  const { r, c, type, value } = move;
  const cell = board[r][c];

  const prevValue = cell.value;
  const prevBlack = cell.isBlack;

  const nodeKey = `${r},${c}`;

  // Apply mutation
  if (type === 'place') cell.value = value;
  else if (type === 'black') cell.isBlack = true;

  // ------------------------------------------------------------
  // LOCAL DOMAIN CHECK — MAIN OPTIMIZATION
  // Only check affected cells, not full grid
  // ------------------------------------------------------------
  let domainScore = preDomainScore;
  const affected = getAffectedPositions(board, r, c);

  for (const [ar, ac] of affected) {
    const oldCount = (preValidCounts[ar] && preValidCounts[ar][ac]) ? preValidCounts[ar][ac] : 0;
    const aCell = board[ar][ac];

    let newCount = 0;
    if (!aCell.isBlack && aCell.value === null) {
      newCount = rules.getValidNumbers(board, ar, ac).length;
    }

    if (!aCell.isBlack && aCell.value === null && newCount === 0) {
      cell.value = prevValue;
      cell.isBlack = prevBlack;
      return -Infinity;
    }

    domainScore += (oldCount - newCount);
  }

  // ------------------------------------------------------------
  // GRAPH IMPACT — ONLY for black tiles
  // Number placements keep graph SAME (big boost for speed)
  // ------------------------------------------------------------
  let postAdj = preAdj;
  let postArtCount = preArtCount;
  let postCompCount = preCompCount;

  if (type === 'black') {
    postAdj = simulateAdjRemoval(preAdj, nodeKey);
    postCompCount = postAdj.size ? countComponents(postAdj) : 0;

    const postArtMap = findArticulationPoints(postAdj);
    let artCount = 0;
    postArtMap.forEach(v => { if (v) artCount++; });
    postArtCount = artCount;
  }

  // ------------------------------------------------------------
  // SCORING MODEL
  // Domain + Structure + Heuristics
  // ------------------------------------------------------------
  let score = 0;

  score += domainScore;

  if (postCompCount > preCompCount) score -= (postCompCount - preCompCount) * 60;
  else if (postCompCount < preCompCount) score += (preCompCount - postCompCount) * 30;

  if (postArtCount > preArtCount) score -= (postArtCount - preArtCount) * 6;
  else if (postArtCount < preArtCount) score += (preArtCount - postArtCount) * 8;

  if (postArtCount === 0) score += 6;

  score += (type === 'place') ? 20 : 2;

  const n = board.length;
  const center = (n - 1) / 2;
  const dist = Math.abs(r - center) + Math.abs(c - center);
  score += Math.max(0, 6 - dist);

  const deg = postAdj.has(nodeKey) ? (postAdj.get(nodeKey) || []).length : 0;
  score += Math.min(deg, 4) * 0.7;

  cell.value = prevValue;
  cell.isBlack = prevBlack;

  return score;
}

// ------------------------------------------------------------
// FUNCTION: greedyChoose()
// PURPOSE: Main AI entry point — returns BEST move.
// Flow:
//  1. Get legal moves
//  2. Precompute graph + domain ONCE
//  3. Score each move (evaluateMoveQuality)
//  4. Pick highest score
// ------------------------------------------------------------
export function greedyChoose(board, opts = { botHasBlack: false, regionFilter: null }) {

  let candidates = moves.getLegalMoves(board, 2, { playerHasBlack: opts.botHasBlack });

  if (opts.regionFilter) {
    candidates = candidates.filter(m => opts.regionFilter(m.r, m.c));
  }
  if (!candidates || candidates.length === 0) return null;

  // PRECOMPUTATION: Done ONCE (major optimization)
  const graphInfo = buildGridGraph(board);
  const preAdj = graphInfo.adj;
  const preArtMap = findArticulationPoints(preAdj);

  let preArtCount = 0;
  preArtMap.forEach(v => { if (v) preArtCount++; });

  const preCompCount = preAdj.size ? countComponents(preAdj) : 0;

  const preValidCounts = buildValidCounts(board);
  const preDomainScore = sumDomainScoreFromCounts(preValidCounts);
//Sorting is done here
  // Candidate LIMIT — optimization for large branching
  const QUICK_LIMIT = 120;
  if (candidates.length > QUICK_LIMIT) {
    candidates.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'place' ? -1 : 1;
      const n = board.length;
      const center = (n - 1) / 2;
      return (Math.abs(a.r - center) + Math.abs(a.c - center)) - (Math.abs(b.r - center) + Math.abs(b.c - center));
    });
    candidates = candidates.slice(0, QUICK_LIMIT);
  }

  candidates.sort(() => Math.random() - 0.5);

  let best = null;
  let bestScore = -Infinity;

  for (const mv of candidates) {
    const sc = evaluateMoveQuality(board, mv, preAdj, preArtCount, preCompCount, preValidCounts, preDomainScore);
    const finalScore = sc + Math.random() * 1e-6;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = mv;
    }
  }

  return best;
}
