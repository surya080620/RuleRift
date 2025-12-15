import * as moves from '../moves.js';
import * as rules from '../rules.js';

const memo = new Map();

function boardHash(board, player, hasBlack){
  const parts = [];
  for (let r=0;r<board.length;r++){
    for (let c=0;c<board.length;c++){
      const cell = board[r][c];
      parts.push(cell.isBlack ? 'B' : (cell.value === null ? '.' : String(cell.value)));
    }
  }
  parts.push('|P'+player+'|B'+(hasBlack?1:0));
  return parts.join('');
}

function evaluateStatic(board){
  let empties = 0;
  for (let r=0;r<board.length;r++){
    for (let c=0;c<board.length;c++){
      if (!board[r][c].isBlack && board[r][c].value === null) empties++;
    }
  }
  return -empties;
}

function cloneBoardState(board){
  return board.map(row => row.map(cell => ({ value: cell.value, isBlack: cell.isBlack, inequalities: Object.assign({}, cell.inequalities) })));
}

export function dpChoose(board, opts = { botHasBlack: false }, depth = 3){
  const player = 2;
  const hasBlack = opts.botHasBlack;

  function minimax(stateBoard, currentPlayer, botHasBlack, alpha, beta, d){
    const key = boardHash(stateBoard, currentPlayer, botHasBlack);
    if (memo.has(key)) return memo.get(key);
    if (d === 0) return { score: evaluateStatic(stateBoard), move: null };

    const legal = moves.getLegalMoves(stateBoard, currentPlayer, { playerHasBlack: currentPlayer===2?botHasBlack:false });
    if (!legal || legal.length === 0){
      const sc = evaluateStatic(stateBoard);
      return { score: sc, move: null };
    }

    let bestMove = null;
    if (currentPlayer === player){
      let value = -Infinity;
      for (const m of legal){
        const sim = cloneBoardState(stateBoard);
        if (m.type === 'place') sim[m.r][m.c].value = m.value;
        else if (m.type === 'black') sim[m.r][m.c].isBlack = true;
        const nextHasBlack = (currentPlayer===2 && m.type==='black') ? false : botHasBlack;
        const res = minimax(sim, 1, nextHasBlack, alpha, beta, d-1);
        if (res.score > value){ value = res.score; bestMove = m; }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      memo.set(key, { score: value, move: bestMove });
      return { score: value, move: bestMove };
    } else {
      let value = Infinity;
      for (const m of legal){
        const sim = cloneBoardState(stateBoard);
        if (m.type === 'place') sim[m.r][m.c].value = m.value;
        else if (m.type === 'black') sim[m.r][m.c].isBlack = true;
        const res = minimax(sim, 2, botHasBlack, alpha, beta, d-1);
        if (res.score < value){ value = res.score; bestMove = m; }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      memo.set(key, { score: value, move: bestMove });
      return { score: value, move: bestMove };
    }
  }

  const root = minimax(board, 2, hasBlack, -Infinity, Infinity, depth);
  return root.move;
}
