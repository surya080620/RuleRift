// js/logic/ai/dc.js
// Tactical Divide & Conquer AI (refactored for clarity)

import { greedyChoose } from './greedy.js';
import { buildGridGraph, findArticulationPoints } from '../graph.js';

// ------------------------------------------------------------
// Utilities: quadrant filter factory
// ------------------------------------------------------------
function quadrantFilterFactory(n, quadrantIndex) {
  const mid = Math.floor(n / 2);

  const rMin = (quadrantIndex & 2) ? mid : 0;
  const rMax = (quadrantIndex & 2) ? n : mid;
  const cMin = (quadrantIndex & 1) ? mid : 0;
  const cMax = (quadrantIndex & 1) ? n : mid;

  return (r, c) => (r >= rMin && r < rMax && c >= cMin && c < cMax);
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function getRC(move) {
  if (!move) return { r: null, c: null };
  return {
    r: move.r ?? move.y ?? move.row ?? null,
    c: move.c ?? move.x ?? move.col ?? null
  };
}

function centerDistance(move, n) {
  const { r, c } = getRC(move);
  if (r == null || c == null) return Infinity;
  const center = (n - 1) / 2;
  return Math.abs(r - center) + Math.abs(c - center);
}

// ------------------------------------------------------------
// Tactical scoring (unchanged)
// ------------------------------------------------------------
function scoreMove(move, n, opts = {}) {
  const { botHasBlack = false } = opts;

  const PLACE_BASE = 14;
  const OTHER_BASE = 4;
  const CENTER_DIST_WEIGHT = 0.36;
  const INTERIOR_BONUS = 1.6;
  const CORNER_PENALTY = 1.2;
  const EDGE_PENALTY = 0.4;
  const BLACK_NO_STOCK_PENALTY = 2.0;
  const BLACK_USUAL_PENALTY = 0.6;

  let score = (move.type === 'place') ? PLACE_BASE : OTHER_BASE;

  const dist = centerDistance(move, n);
  if (isFinite(dist)) score -= dist * CENTER_DIST_WEIGHT;

  const { r, c } = getRC(move);
  if (r != null && c != null) {
    const isInterior = (r > 0 && r < n - 1 && c > 0 && c < n - 1);
    const isCorner = (r === 0 || r === n - 1) && (c === 0 || c === n - 1);
    const isEdge = (r === 0 || r === n - 1 || c === 0 || c === n - 1);

    if (isInterior) score += INTERIOR_BONUS;
    if (isCorner) score -= CORNER_PENALTY;
    else if (isEdge) score -= EDGE_PENALTY;
  }

  if (move.type === 'black') {
    score -= botHasBlack ? BLACK_USUAL_PENALTY : BLACK_NO_STOCK_PENALTY;
  }

  return score;
}

// ------------------------------------------------------------
// Main: dcChoose()
// ------------------------------------------------------------
export function dcChoose(board, opts = { botHasBlack: false, verbose: false }) {
  const { botHasBlack = false, verbose = false } = opts;
  const n = board?.length ?? 0;

  if (!n || n < 4) return greedyChoose(board, opts);

  // -------- SHARED PRECOMPUTATION (ONCE) --------
  const graphInfo = buildGridGraph(board);
  const preAdj = graphInfo.adj;

  const artMap = findArticulationPoints(preAdj);
  let preArtCount = 0;
  artMap.forEach(v => { if (v) preArtCount++; });

  const preCompCount = preAdj.size ? preAdj.size : 0;

  const cache = {
    preAdj,
    preArtCount,
    preCompCount,
    preValidCounts: null,
    preDomainScore: null
  };

  let bestMove = null;
  let bestScore = -Infinity;

  for (let q = 0; q < 4; q++) {
    const regionFilter = quadrantFilterFactory(n, q);

    // ---------- Regional greedy call with safe error handling ----------
    let mv = null;
    try {
      mv = greedyChoose(
        board,
        { ...opts, regionFilter, quickLimit: 60 },
        cache
      );
    } catch (e) {
      if (verbose) console.warn('[DC] greedyChoose threw for region', q, e);
      mv = null;
    }

    // If greedy returned nothing, skip this region
    if (!mv) {
      if (verbose) console.log('[DC] region', q, 'returned no move; skipping');
      continue;
    }

    // Validate coordinates — skip malformed moves
    const { r, c } = getRC(mv);
    if (r == null || c == null) {
      if (verbose) console.warn('[DC] region', q, 'move lacks coordinates; skipping', mv);
      continue;
    }

    // Score the candidate (unchanged)
    const sc = scoreMove(mv, n, { botHasBlack });
    if (sc > bestScore) {
      bestScore = sc;
      bestMove = mv;
    }
  }

  // ---------- Global greedy safety candidate (safe) ----------
  let global = null;
  try {
    global = greedyChoose(board, opts, cache);
  } catch (e) {
    if (verbose) console.warn('[DC] global greedy threw', e);
    global = null;
  }

  if (global) {
    const gscore = scoreMove(global, n, { botHasBlack }) - 0.1;
    if (gscore > bestScore) bestMove = global;
  }

  // ---------- Final fallback: attempt a safe greedy before returning ----------
  if (bestMove) return bestMove;

  try {
    // final attempt with cache passed through; if this throws, return null to fail safely
    return greedyChoose(board, opts, cache);
  } catch (e) {
    if (verbose) console.warn('[DC] final fallback greedyChoose threw', e);
    return null;
  }
}
