// js/logic/ai/dp.js
// HARD MODE – Optimized (No Lag Version)
// Strong AI + Tactical Black Usage + Alpha-Beta + DP

import * as moves from '../moves.js';

const BOT = 2;
const HUMAN = 1;
const INF = 1e9;

const MAX_DEPTH = 4;      // Safe strong depth
const BASE_BRANCH = 10;   // Prevents explosion

/* ============================================================
   MEMBER 1 – Transposition Table (DP Memoization)
============================================================ */

class TT {
  constructor() {
    this.map = new Map();
  }

  hash(board, player, botBlack, humanBlack) {
    let h = 19;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board.length; c++) {
        const cell = board[r][c];
        const v = cell.isBlack ? 9 : (cell.value ?? 0);
        h = (h * 37 + v) % 1000000007;
      }
    }
    h = h * 3 + player;
    h = h * 5 + (botBlack ? 1 : 0);
    h = h * 7 + (humanBlack ? 1 : 0);
    return h;
  }

  get(key, depth) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.depth >= depth) return entry.score;
    return null;
  }

  set(key, score, depth) {
    this.map.set(key, { score, depth });
  }
}

/* ============================================================
   MEMBER 2 – Strong Evaluation (Mobility Dominance)
============================================================ */

function evaluate(board, botBlack, humanBlack) {

  const botMoves = moves.getLegalMoves(board, BOT, {
    playerHasBlack: botBlack
  }).length;

  const humanMoves = moves.getLegalMoves(board, HUMAN, {
    playerHasBlack: humanBlack
  }).length;

  if (humanMoves === 0) return 1000000;
  if (botMoves === 0) return -1000000;

  let score = 0;

  score += botMoves * 14;
  score -= humanMoves * 20;

  if (botBlack) score += 25;
  if (humanBlack) score -= 25;

  return score;
}

/* ============================================================
   MEMBER 3 – Tactical Move Ordering (Lightweight)
============================================================ */

function orderMoves(list, board) {

  const total = board.length * board.length;
  let filled = 0;

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      if (board[r][c].isBlack || board[r][c].value !== null)
        filled++;
    }
  }

  const phase = filled / total;

  return list.sort((a, b) => {

    function score(move) {
      let s = 0;

      if (move.type === 'place') {
        s += 60 + (move.value || 0);
      }

      if (move.type === 'black') {
        if (phase < 0.4)
          s -= 100; // avoid early black
        else
          s += 60;  // allow later
      }

      return s;
    }

    return score(b) - score(a);
  });
}

function apply(board, move) {
  const cell = board[move.r][move.c];
  const prev = { r: move.r, c: move.c, v: cell.value, b: cell.isBlack };

  if (move.type === 'place') cell.value = move.value;
  if (move.type === 'black') cell.isBlack = true;

  return prev;
}

function undo(board, prev) {
  const cell = board[prev.r][prev.c];
  cell.value = prev.v;
  cell.isBlack = prev.b;
}

/* ============================================================
   MEMBER 4 – Minimax + Alpha-Beta + Threat Detection
============================================================ */

export function dpChoose(board, opts = { botHasBlack: false, playerHasBlack: true }) {

  const tt = new TT();

  // ---------- Immediate Win ----------
  const botMovesNow = moves.getLegalMoves(board, BOT, {
    playerHasBlack: opts.botHasBlack
  }) || [];

  for (const mv of botMovesNow) {
    const prev = apply(board, mv);
    const humanMoves = moves.getLegalMoves(board, HUMAN, {
      playerHasBlack: opts.playerHasBlack
    }).length;
    undo(board, prev);
    if (humanMoves === 0) return mv;
  }

  // ---------- Block Human Immediate Win ----------
  const humanMovesNow = moves.getLegalMoves(board, HUMAN, {
    playerHasBlack: opts.playerHasBlack
  }) || [];

  for (const hm of humanMovesNow) {
    const prev = apply(board, hm);
    const botAfter = moves.getLegalMoves(board, BOT, {
      playerHasBlack: opts.botHasBlack
    }).length;
    undo(board, prev);
    if (botAfter === 0) {
      const block = botMovesNow.find(m => m.r === hm.r && m.c === hm.c);
      if (block) return block;
    }
  }

  function minimax(state, player, botBlack, humanBlack, depth, alpha, beta) {

    if (depth <= 0)
      return evaluate(state, botBlack, humanBlack);

    const key = tt.hash(state, player, botBlack, humanBlack);
    const cached = tt.get(key, depth);
    if (cached !== null) return cached;

    let legal = moves.getLegalMoves(state, player, {
      playerHasBlack: player === BOT ? botBlack : humanBlack
    }) || [];

    if (legal.length === 0)
      return evaluate(state, botBlack, humanBlack);

    const branchLimit = depth >= 3 ? BASE_BRANCH : BASE_BRANCH + 3;

    legal = orderMoves(legal, state).slice(0, branchLimit);

    let best = (player === BOT) ? -INF : INF;

    for (const move of legal) {

      const prev = apply(state, move);

      const val = minimax(
        state,
        player === BOT ? HUMAN : BOT,
        move.type === 'black' && player === BOT ? false : botBlack,
        move.type === 'black' && player === HUMAN ? false : humanBlack,
        depth - 1,
        alpha,
        beta
      );

      undo(state, prev);

      if (player === BOT) {
        best = Math.max(best, val);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, val);
        beta = Math.min(beta, best);
      }

      if (beta <= alpha) break;
    }

    tt.set(key, best, depth);
    return best;
  }

  let bestMove = null;
  let bestVal = -INF;

  let rootMoves = orderMoves(botMovesNow, board)
    .slice(0, BASE_BRANCH + 3);

  for (const mv of rootMoves) {

    const prev = apply(board, mv);

    const val = minimax(
      board,
      HUMAN,
      mv.type === 'black' ? false : opts.botHasBlack,
      opts.playerHasBlack,
      MAX_DEPTH - 1,
      -INF,
      INF
    );

    undo(board, prev);

    if (val > bestVal) {
      bestVal = val;
      bestMove = mv;
    }
  }

  return bestMove;
}