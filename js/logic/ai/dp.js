// js/logic/ai/dp.js
import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { cloneBoard } from '../board.js';

/**
 * Lightweight serializer for memoization key.
 * Keeps inequalities in the key so identical-layout states are detected.
 */
function serializeCell(c) {
  const val = c.isBlack ? 'B' : (c.value ?? '.');
  const ineq = c.inequalities ? `${c.inequalities.up ?? '.'}${c.inequalities.down ?? '.'}${c.inequalities.left ?? '.'}${c.inequalities.right ?? '.'}` : '....';
  return val + ineq;
}

function getBoardHash(board, currentPlayer, botHasBlack, playerHasBlack) {
  // Note: building this string is somewhat expensive — but necessary for correct memoization.
  // We keep it simple and deterministic.
  const flat = board.map(row => row.map(c => serializeCell(c)).join('')).join('|');
  return `${flat}|P${currentPlayer}|b${botHasBlack?1:0}|p${playerHasBlack?1:0}`;
}

/**
 * Static evaluation from BOT perspective (positive = good for bot).
 * Lightweight and fast — avoids deep scans where possible.
 */
function staticEval(board, botHasBlack, playerHasBlack) {
  let score = 0;
  const n = board.length;

  // Progress: reward filled white tiles (small)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (!cell.isBlack && cell.value !== null) score += 2;
    }
  }

  // Mobility: estimate legal move counts (cheap-ish)
  const botLegal = moves.getLegalMoves(board, 2, { playerHasBlack: botHasBlack }).length;
  const humanLegal = moves.getLegalMoves(board, 1, { playerHasBlack: playerHasBlack }).length;
  score += (botLegal - humanLegal) * 3;

  score += (botHasBlack ? 5 : 0);
  score -= (playerHasBlack ? 5 : 0);

  return score;
}

/** Move ordering heuristic to improve alpha-beta pruning */
function rankMoves(move) {
  if (move.type === 'place') return 100 + (move.value || 0);
  return 10;
}

/**
 * Mutation-based apply/revert helpers.
 * These avoid heavy cloning on every node: mutate, recurse, then revert.
 */
function applyMoveMutate(board, move) {
  const cell = board[move.r][move.c];
  const prev = { r: move.r, c: move.c, prevValue: cell.value, prevBlack: cell.isBlack };

  if (move.type === 'place') cell.value = move.value;
  else if (move.type === 'black') cell.isBlack = true;

  return prev;
}

function revertMove(board, prev) {
  const cell = board[prev.r][prev.c];
  cell.value = prev.prevValue;
  cell.isBlack = prev.prevBlack;
}

/**
 * dpChoose: Depth-limited minimax with alpha-beta, memoization, mutation/backtracking,
 * deterministic move ordering and a branch limit.
 *
 * Improvements compared to naive version:
 * - Uses mutation & revert instead of cloning every node (reduces allocations).
 * - Uses moves.getSortedLegalMoves where appropriate for better ordering.
 * - Memoizes evaluated nodes with a stable board hash.
 */
export function dpChoose(board, opts = { botHasBlack: false, playerHasBlack: true }, maxDepth = 3) {
  const BOT_ID = 2;
  const HUMAN_ID = 1;

  // Local memoization map (cleared each decision)
  const memo = new Map();

  /**
   * minimax operates on the current (mutating) board.
   * It MUST compute the key before mutating the board for children.
   */
  function minimax(stateBoard, currentPlayer, botBlack, humanBlack, depth, alpha, beta) {
    const key = getBoardHash(stateBoard, currentPlayer, botBlack, humanBlack);
    if (memo.has(key)) return memo.get(key);

    const hasBlack = currentPlayer === BOT_ID ? botBlack : humanBlack;

    // Use sorted moves to improve ordering (place moves preferred)
    const legal = moves.getSortedLegalMoves(stateBoard, currentPlayer, { playerHasBlack: hasBlack }) || [];

    // Terminal: no legal moves => loss for currentPlayer
    if (legal.length === 0) {
      const score = currentPlayer === BOT_ID ? -10000 + depth : 10000 - depth;
      const res = { score, move: null };
      memo.set(key, res);
      return res;
    }

    // Depth 0 static eval (from BOT's perspective)
    if (depth === 0) {
      const score = staticEval(stateBoard, botBlack, humanBlack);
      const res = { score, move: null };
      memo.set(key, res);
      return res;
    }

    // Limit branching factor
    const BRANCH_LIMIT = 20;
    const branchList = legal.slice(0, BRANCH_LIMIT);

    let bestMove = null;

    if (currentPlayer === BOT_ID) {
      let maxEval = -Infinity;
      for (const m of branchList) {
        // Apply move in-place
        const prev = applyMoveMutate(stateBoard, m);

        // Update black-availability for next player
        const nextBotBlack = (m.type === 'black') ? false : botBlack;

        // Recurse: human's turn
        const child = minimax(stateBoard, HUMAN_ID, nextBotBlack, humanBlack, depth - 1, alpha, beta);

        // Revert mutation
        revertMove(stateBoard, prev);

        if (child.score > maxEval) {
          maxEval = child.score;
          bestMove = m;
        }
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) break; // Beta cutoff
      }
      const res = { score: maxEval, move: bestMove };
      memo.set(key, res);
      return res;
    } else {
      let minEval = Infinity;
      for (const m of branchList) {
        const prev = applyMoveMutate(stateBoard, m);

        const nextHumanBlack = (m.type === 'black') ? false : humanBlack;

        const child = minimax(stateBoard, BOT_ID, botBlack, nextHumanBlack, depth - 1, alpha, beta);

        revertMove(stateBoard, prev);

        if (child.score < minEval) {
          minEval = child.score;
          bestMove = m;
        }
        beta = Math.min(beta, minEval);
        if (beta <= alpha) break; // Alpha cutoff
      }
      const res = { score: minEval, move: bestMove };
      memo.set(key, res);
      return res;
    }
  }

  const root = minimax(board, BOT_ID, opts.botHasBlack, opts.playerHasBlack, maxDepth, -Infinity, Infinity);
  return root.move;
}
