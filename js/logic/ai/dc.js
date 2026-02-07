// js/logic/ai/dc.js
// Tactical Divide & Conquer AI (improvised & robust)
// Uses regional greedy choices and a compact tactical scoring function.
// Compatible with existing greedyChoose signature.

import { greedyChoose } from './greedy.js';

/* --------------------------
   Member 1: Board Partitioning
   -------------------------- */
function createQuadrantFilter(n, qIndex) {
  const mid = Math.floor(n / 2);

  const rMin = (qIndex & 2) ? mid : 0;
  const rMax = (qIndex & 2) ? n : mid;

  const cMin = (qIndex & 1) ? mid : 0;
  const cMax = (qIndex & 1) ? n : mid;

  return (r, c) =>
    r >= rMin && r < rMax &&
    c >= cMin && c < cMax;
}

/* --------------------------
   Helpers: coordinate extraction & center distance
   -------------------------- */
function getRC(move) {
  if (!move) return { r: null, c: null };
  const r = (move.r !== undefined) ? move.r
          : (move.y !== undefined) ? move.y
          : (move.row !== undefined) ? move.row
          : null;
  const c = (move.c !== undefined) ? move.c
          : (move.x !== undefined) ? move.x
          : (move.col !== undefined) ? move.col
          : null;
  return { r, c };
}

function centerDistance(move, n) {
  const { r, c } = getRC(move);
  if (r == null || c == null) return Infinity;
  const center = (n - 1) / 2;
  return Math.abs(r - center) + Math.abs(c - center);
}

/* --------------------------
   Member 3: Move Scoring (compact tactical heuristic)
   -------------------------- */
function scoreMove(move, n, opts = {}) {
  const { botHasBlack = false } = opts;
  let score = 0;

  // prefer placing numbers
  score += (move.type === 'place') ? 14 : 4;

  // central control (stronger weight)
  const dist = centerDistance(move, n);
  if (isFinite(dist)) score -= dist * 0.36;

  // interior bonus (reduces opponent mobility generally)
  const { r, c } = getRC(move);
  if (r != null && c != null) {
    if (r > 0 && r < n - 1 && c > 0 && c < n - 1) {
      score += 1.6;
    }
    // small penalty for corners (locking)
    if ((r === 0 || r === n - 1) && (c === 0 || c === n - 1)) {
      score -= 1.2;
    }
    // edge penalty (except interior-adjacent)
    if ((r === 0 || r === n - 1 || c === 0 || c === n - 1) && !(r === 0 && c === 0)) {
      score -= 0.4;
    }
  }

  // black-tile conservation: penalize using black if bot has none (or to discourage waste)
  if (move.type === 'black') {
    if (!botHasBlack) score -= 2.0;
    else score -= 0.6; // slightly discourage using blacks unless necessary
  }

  return score;
}

/* --------------------------
   Member 2 + Member 4: Tactical DC (main)
   -------------------------- */
/**
 * dcChoose(board, opts)
 * - board: 2D array board
 * - opts: { botHasBlack: boolean, verbose: boolean }
 */
export function dcChoose(board, opts = { botHasBlack: false, verbose: false }) {
  const n = (board && board.length) ? board.length : 0;

  // sanity: if board shape unexpected, fallback
  if (!n || !Array.isArray(board)) {
    if (opts.verbose) console.warn('[DC] invalid board -> fallback to greedy');
    try { return greedyChoose(board, opts); } catch (e) { return null; }
  }

  // small boards: greedy is fine
  if (n < 4) {
    if (opts.verbose) console.log('[DC] small board fallback to greedy');
    return greedyChoose(board, opts);
  }

  let bestMove = null;
  let bestScore = -Infinity;

  // evaluate each quadrant
  for (let q = 0; q < 4; q++) {
    const regionFilter = createQuadrantFilter(n, q);

    // ask greedy for the best regional move (greedyChoose must support regionFilter)
    let mv;
    try {
      mv = greedyChoose(board, { ...opts, regionFilter });
    } catch (e) {
      if (opts.verbose) console.warn('[DC] greedyChoose threw in region', q, e);
      mv = null;
    }

    if (!mv) continue;

    // ensure coordinate extraction is possible; if not, skip
    const { r, c } = getRC(mv);
    if (r == null || c == null) {
      if (opts.verbose) console.warn('[DC] move without coordinates returned by greedy; skipping', mv);
      continue;
    }

    // score the candidate
    const sc = scoreMove(mv, n, opts);

    if (opts.verbose) {
      console.log(`[DC] q=${q} move=${JSON.stringify(mv)} score=${sc.toFixed(2)}`);
    }

    if (sc > bestScore) {
      bestScore = sc;
      bestMove = mv;
    }
  }

  // also include a global greedy candidate (safety / global opportunity)
  try {
    const global = greedyChoose(board, opts);
    if (global) {
      const gscore = scoreMove(global, n, opts) - 0.1; // slight bias to prefer regional picks, but keep global option
      if (opts.verbose) console.log('[DC] global greedy', global, 'score', gscore.toFixed(2));
      if (gscore > bestScore) {
        bestScore = gscore;
        bestMove = global;
      }
    }
  } catch (e) {
    if (opts.verbose) console.warn('[DC] global greedy threw', e);
  }

  // final fallback: greedy if nothing chosen
  if (!bestMove) {
    if (opts.verbose) console.log('[DC] no regional candidates -> fallback to greedy');
    try { return greedyChoose(board, opts); } catch (e) { return null; }
  }

  if (opts.verbose) console.log('[DC] chosen', bestMove, 'score', bestScore.toFixed(2));
  return bestMove;
}
