// js/logic/ai/dp.js
// Depth-Limited Minimax with Alpha-Beta Pruning.
// Improvements: Local memoization, Mobility heuristic, Deterministic move ordering.

import * as moves from '../moves.js';
import * as rules from '../rules.js';
import { cloneBoard } from '../board.js';

/**
 * Generates a unique string key for the current game state.
 * Optimized to be slightly faster than nested loops with string concatenation.
 */
function getBoardHash(board, currentPlayer, botHasBlack, playerHasBlack) {
  // Using JSON.stringify is often faster in V8 than manual loop concatenation for complex objects
  // provided the board structure is consistent. If not, we map to a simplified structure.
  const flat = board.map(row => 
    row.map(c => c.isBlack ? 'B' : (c.value ?? '.')).join('')
  ).join('');
  
  return `${flat}|P${currentPlayer}|b${botHasBlack ? 1 : 0}|p${playerHasBlack ? 1 : 0}`;
}

/**
 * Static Evaluation Heuristic.
 * Evaluates the board from the perspective of the *current* player.
 * Positive = Good for current player. Negative = Bad.
 */
function staticEval(board, currentPlayer, botHasBlack, playerHasBlack) {
  let score = 0;
  const n = board.length;

  // 1. Material & Progress: Credit for filled cells
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = board[r][c];
      if (!cell.isBlack && cell.value !== null) {
        score += 5; 
        
        // Bonus for satisfying local inequalities (if checkable)
        // We assume valid moves were made, so existing numbers are "good".
      }
    }
  }

  // 2. Mobility: How many moves does the CURRENT player have vs OPPONENT?
  // (This is expensive, so we might skip it at deep levels, but it's crucial for tactics)
  // We estimate mobility by checking remaining black tiles.
  const myBlacks = currentPlayer === 2 ? botHasBlack : playerHasBlack;
  const oppBlacks = currentPlayer === 2 ? playerHasBlack : botHasBlack;
  
  score += (myBlacks ? 10 : 0);
  score -= (oppBlacks ? 10 : 0);

  return score;
}

/**
 * Rank moves to improve Alpha-Beta pruning cutoff rates.
 * Deterministic: Places > Black Tiles. Higher numbers > Lower numbers (often clears inequalities).
 */
function rankMoves(move) {
  // 1. Prefer placing numbers (progress)
  if (move.type === 'place') {
    // Heuristic: Prefer placing larger numbers as they are often harder to fit later?
    // Or prefer middle numbers? Let's just prefer placing over black tiles.
    return 100 + move.value; 
  }
  // 2. Black tiles are defensive
  return 10; 
}

function applyMove(board, move) {
  const sim = cloneBoard(board);
  if (move.type === 'place') {
    sim[move.r][move.c].value = move.value;
  } else if (move.type === 'black') {
    sim[move.r][move.c].isBlack = true;
  }
  return sim;
}

export function dpChoose(board, opts = { botHasBlack: false, playerHasBlack: true }, maxDepth = 3) {
  const BOT_ID = 2;
  const HUMAN_ID = 1;
  
  // Local memoization map (cleared every turn) prevents memory leaks
  const memo = new Map();

  function minimax(stateBoard, currentPlayer, botBlack, humanBlack, depth, alpha, beta) {
    const key = getBoardHash(stateBoard, currentPlayer, botBlack, humanBlack);
    if (memo.has(key)) return memo.get(key);

    // 1. Generate Legal Moves
    const hasBlack = currentPlayer === BOT_ID ? botBlack : humanBlack;
    const legal = moves.getLegalMoves(stateBoard, currentPlayer, { playerHasBlack: hasBlack }) || [];

    // 2. Terminal State Check
    if (legal.length === 0) {
        // If I have no moves, I lose. (Large negative score).
        // If depth is just 0, we use static eval.
        if (depth > 0) {
            // "I have no moves" => Loss for 'currentPlayer'
            const res = { score: -10000 + depth, move: null }; // +depth prefers losing later
            memo.set(key, res);
            return res;
        }
    }

    // 3. Max Depth Reached
    if (depth === 0) {
        // Evaluate from perspective of the BOT
        // Note: staticEval is relative. We need absolute score for Minimax.
        // Let's standardise: Score is always "How good is this for the MAX player (Bot)?"
        let score = staticEval(stateBoard, currentPlayer, botBlack, humanBlack);
        
        // If current node is Minimizer (Human), flip score if heuristic is relative
        // But simplified: High Score = Good for Bot.
        if (currentPlayer === HUMAN_ID) score = -score;
        
        const res = { score: score, move: null };
        memo.set(key, res);
        return res;
    }

    // 4. Move Ordering (Crucial for Pruning)
    legal.sort((a, b) => rankMoves(b) - rankMoves(a));

    // Limit branching factor to keep performance sane
    const BRANCH_LIMIT = 20;
    const branchList = legal.slice(0, BRANCH_LIMIT);

    let bestMove = null;

    if (currentPlayer === BOT_ID) {
      // Maximizing Player (Bot)
      let maxEval = -Infinity;
      for (const m of branchList) {
        const sim = applyMove(stateBoard, m);
        const nextBotBlack = (m.type === 'black') ? false : botBlack;
        
        const child = minimax(sim, HUMAN_ID, nextBotBlack, humanBlack, depth - 1, alpha, beta);
        
        if (child.score > maxEval) {
          maxEval = child.score;
          bestMove = m;
        }
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) break; // Beta Cutoff
      }
      const res = { score: maxEval, move: bestMove };
      memo.set(key, res);
      return res;

    } else {
      // Minimizing Player (Human)
      let minEval = Infinity;
      for (const m of branchList) {
        const sim = applyMove(stateBoard, m);
        const nextHumanBlack = (m.type === 'black') ? false : humanBlack;

        const child = minimax(sim, BOT_ID, botBlack, nextHumanBlack, depth - 1, alpha, beta);
        
        if (child.score < minEval) {
          minEval = child.score;
          bestMove = m;
        }
        beta = Math.min(beta, minEval);
        if (beta <= alpha) break; // Alpha Cutoff
      }
      const res = { score: minEval, move: bestMove };
      memo.set(key, res);
      return res;
    }
  }

  // Initial call
  const root = minimax(
      board, 
      BOT_ID, 
      opts.botHasBlack, 
      opts.playerHasBlack, 
      maxDepth, 
      -Infinity, 
      Infinity
  );

  return root.move;
}