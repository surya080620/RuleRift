// js/logic/ai/greedy.js
// Greedy Strategy (graph-aware) — optimized
// Core idea: Analyze each move's IMMEDIATE impact using graph + domain changes
// No deep search, but fast structural evaluation.

import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { buildGridGraph, findArticulationPoints } from '../graph.js';

// ------------------------------------------------------------
// FUNCTION: countComponents(adj)
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
// ------------------------------------------------------------
function sumDomainScoreFromCounts(validCounts) {
  let score = 0;
  for (let r = 0; r < validCounts.length; r++) {
    for (let c = 0; c < validCounts.length; c++) {
      const v = validCounts[r][c] || 0;
      score -= v;
    }
  }
  return score;
}

// ------------------------------------------------------------
// FUNCTION: getAffectedPositions(board, r, c)
// ------------------------------------------------------------
function getAffectedPositions(board, r, c) {
  const n = board.length;

  // Use a Set to avoid duplicate positions
  const positions = new Set();

  // 1️⃣ All cells in the same row and column
  for (let i = 0; i < n; i++) {
    positions.add(`${r},${i}`); // same row
    positions.add(`${i},${c}`); // same column
  }

  // 2️⃣ Direct neighbors (up, down, left, right)
  const directions = [
    [0, 1],   // right
    [0, -1],  // left
    [1, 0],   // down
    [-1, 0]   // up
  ];

  for (const [dr, dc] of directions) {
    const newRow = r + dr;
    const newCol = c + dc;

    // Boundary check
    if (newRow >= 0 && newRow < n && newCol >= 0 && newCol < n) {
      positions.add(`${newRow},${newCol}`);
    }
  }

  // Convert "r,c" strings back into numeric [r, c] pairs
  return Array.from(positions).map(pos =>
    pos.split(',').map(Number)
  );
}

// ------------------------------------------------------------
// FUNCTION: simulateAdjRemoval(preAdj, nodeKey)
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
// ------------------------------------------------------------
function evaluateMoveQuality(
  board,
  move,
  preAdj,
  preArtCount,
  preCompCount,
  preValidCounts,
  preDomainScore
) {
  const { r, c, type, value } = move;
  const cell = board[r][c];

  const prevValue = cell.value;
  const prevBlack = cell.isBlack;
  const nodeKey = `${r},${c}`;

  if (type === 'place') cell.value = value;
  else if (type === 'black') cell.isBlack = true;

  let domainScore = preDomainScore;
  const affected = getAffectedPositions(board, r, c);

  for (const [ar, ac] of affected) {
    const oldCount = preValidCounts[ar]?.[ac] ?? 0;
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
// ------------------------------------------------------------
export function greedyChoose(
  board,
  opts = { botHasBlack: false, regionFilter: null, quickLimit: null },
  cache = null
) {
  let candidates = moves.getLegalMoves(board, 2, {
    playerHasBlack: opts.botHasBlack
  });

  if (opts.regionFilter) {
    candidates = candidates.filter(m => opts.regionFilter(m.r, m.c));
  }
  if (!candidates || candidates.length === 0) return null;

  // -------- SHARED PRECOMPUTATION (cached if provided) --------
  const preAdj = cache?.preAdj ?? buildGridGraph(board).adj;

  const preArtCount = cache?.preArtCount ?? (() => {
    const map = findArticulationPoints(preAdj);
    let c = 0;
    map.forEach(v => { if (v) c++; });
    return c;
  })();

  const preCompCount = cache?.preCompCount ??
    (preAdj.size ? countComponents(preAdj) : 0);

  const preValidCounts = cache?.preValidCounts ?? buildValidCounts(board);
  const preDomainScore = cache?.preDomainScore ??
    sumDomainScoreFromCounts(preValidCounts);

  // -------- CANDIDATE LIMITING --------
  const QUICK_LIMIT = opts.quickLimit ?? 120;

  if (candidates.length > QUICK_LIMIT) {
    const n = board.length;
    const center = (n - 1) / 2;
    const maxDist = 2 * (n - 1);

    const placeBuckets = Array.from({ length: maxDist + 1 }, () => []);
    const blackBuckets = Array.from({ length: maxDist + 1 }, () => []);

    for (const c of candidates) {
      const dist = Math.abs(c.r - center) + Math.abs(c.c - center);
      const d = Math.max(0, Math.min(maxDist, Math.floor(dist)));
      if (c.type === 'place') placeBuckets[d].push(c);
      else blackBuckets[d].push(c);
    }

    const prioritized = [];
    for (let d = 0; d <= maxDist && prioritized.length < QUICK_LIMIT; d++) {
      for (const m of placeBuckets[d]) {
        prioritized.push(m);
        if (prioritized.length >= QUICK_LIMIT) break;
      }
    }
    for (let d = 0; d <= maxDist && prioritized.length < QUICK_LIMIT; d++) {
      for (const m of blackBuckets[d]) {
        prioritized.push(m);
        if (prioritized.length >= QUICK_LIMIT) break;
      }
    }

    candidates = prioritized.slice(0, QUICK_LIMIT);
  }

  candidates.sort(() => Math.random() - 0.5);

  let best = null;
  let bestScore = -Infinity;

  for (const mv of candidates) {
    const sc = evaluateMoveQuality(
      board,
      mv,
      preAdj,
      preArtCount,
      preCompCount,
      preValidCounts,
      preDomainScore
    );
    const finalScore = sc + Math.random() * 1e-6;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = mv;
    }
  }

  return best;
}
