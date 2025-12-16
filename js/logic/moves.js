import { canPlaceNumber } from './rules.js';
/** generate all legal number placement moves */
export function getAllNumberMoves(board) {
  const n = board.length, moves = [];
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      const cell = board[r][c];
      if (cell.isBlack || cell.value !== null) continue;
      for (let v=1; v<=n; v++) {
        if (canPlaceNumber(board, r, c, v)) moves.push({ type:'place', r, c, value: v });
      }
    }
  }
  return moves;
}
