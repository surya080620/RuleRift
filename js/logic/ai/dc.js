import { getAllNumberMoves } from '../moves.js';
import { greedyChoose } from './greedy.js';

/** simple divide & conquer: choose quadrant with most empty cells, then greedy inside */
export function dcChoose(board) {
  const n = board.length;
  const mid = Math.floor(n/2);
  const quads = [
    { r0:0, r1:mid-1, c0:0, c1:mid-1 },
    { r0:0, r1:mid-1, c0:mid, c1:n-1 },
    { r0:mid, r1:n-1, c0:0, c1:mid-1 },
    { r0:mid, r1:n-1, c0:mid, c1:n-1 }
  ];
  let bestQuad = null, bestEmpty = -1;
  for (const q of quads) {
    let empty = 0;
    for (let r=q.r0;r<=q.r1;r++) for (let c=q.c0;c<=q.c1;c++) {
      if (!board[r][c].isBlack && board[r][c].value === null) empty++;
    }
    if (empty > bestEmpty) { bestEmpty = empty; bestQuad = q; }
  }
  // generate moves in that quad only
  const moves = [];
  for (let r=bestQuad.r0;r<=bestQuad.r1;r++) for (let c=bestQuad.c0;c<=bestQuad.c1;c++) {
    if (!board[r][c].isBlack && board[r][c].value === null) {
      for (let v=1; v<=board.length; v++) {
        // we'll use getAllNumberMoves for legality; cheap approach: gather all legal and filter
      }
    }
  }
  // fallback to greedy on whole board
  return greedyChoose(board);
}
