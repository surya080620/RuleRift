import * as rules from './rules.js';

export function getAllNumberMoves(board){
  const n = board.length; const moves = [];
  for (let r=0;r<n;r++) for (let c=0;c<n;c++){
    if (board[r][c].isBlack || board[r][c].value !== null) continue;
    const vals = rules.getValidNumbers(board, r, c);
    for (const v of vals) moves.push({ type: 'place', r, c, value: v });
  }
  return moves;
}

export function getAllBlackMoves(board){
  const n = board.length; const moves = [];
  for (let r=0;r<n;r++) for (let c=0;c<n;c++){
    if (board[r][c].isBlack || board[r][c].value !== null) continue;
    if (rules.canPlaceBlack(board, r, c)) moves.push({ type: 'black', r, c });
  }
  return moves;
}

export function getLegalMoves(board, player, opts = { playerHasBlack: false }){
  const m = getAllNumberMoves(board);
  if (opts.playerHasBlack){
    const blacks = getAllBlackMoves(board);
    m.push(...blacks);
  }
  return m;
}
