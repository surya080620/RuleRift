import { canPlaceNumber, canPlaceBlack } from './rules.js';

/** Return all legal number moves */
export function getAllNumberMoves(board) {
  const n = board.length;
  const moves = [];
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      const cell = board[r][c];
      if (cell.isBlack) continue;
      if (cell.value !== null) continue;
      for (let v=1; v<=n; v++){
        if (canPlaceNumber(board, r, c, v)) moves.push({ type:'place', r, c, value: v });
      }
    }
  }
  return moves;
}

/** Return all legal black placement moves */
export function getAllBlackMoves(board) {
  const n = board.length;
  const moves = [];
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      const cell = board[r][c];
      if (cell.isBlack) continue;
      if (cell.value !== null) continue;
      if (canPlaceBlack(board, r, c)) moves.push({ type:'black', r, c });
    }
  }
  return moves;
}
