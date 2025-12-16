import { cloneBoard } from './board.js';

/** Check row/column uniqueness and inequality constraints when placing v at (r,c).
 * Returns true if allowed (does not permanently violate rules).
 */
export function canPlaceNumber(board, r, c, v) {
  const n = board.length;
  if (board[r][c].isBlack) return false;
  // duplicates row
  for (let j=0;j<n;j++){
    if (j===c) continue;
    const cell = board[r][j];
    if (!cell.isBlack && cell.value === v) return false;
  }
  // duplicates col
  for (let i=0;i<n;i++){
    if (i===r) continue;
    const cell = board[i][c];
    if (!cell.isBlack && cell.value === v) return false;
  }
  // inequalities with neighbors: compare if neighbor value exists; if neighbor is null, allow
  const cell = board[r][c];
  const up = (r>0) ? board[r-1][c] : null;
  const down = (r<n-1) ? board[r+1][c] : null;
  const left = (c>0) ? board[r][c-1] : null;
  const right = (c<n-1) ? board[r][c+1] : null;

  // helper check: if a relation exists between cell and neighbor, it must hold when both values present
  const checkRel = (rel, neighborVal) => {
    if (!rel) return true;
    if (neighborVal === null) return true;
    if (rel === '<') return v < neighborVal;
    if (rel === '>') return v > neighborVal;
    return true;
  };
  // relations stored on this cell relative to neighbor
  if (!checkRel(cell.inequalities.up, up ? up.value : null)) return false;
  if (!checkRel(cell.inequalities.down, down ? down.value : null)) return false;
  if (!checkRel(cell.inequalities.left, left ? left.value : null)) return false;
  if (!checkRel(cell.inequalities.right, right ? right.value : null)) return false;

  // Also must respect inequality relation from neighbor's side (neighbor might store relation)
  if (up && up.inequalities.down) {
    if (up.inequalities.down === '<' && !(up.value === null || up.value < v)) return false;
    if (up.inequalities.down === '>' && !(up.value === null || up.value > v)) return false;
  }
  if (left && left.inequalities.right) {
    if (left.inequalities.right === '<' && !(left.value === null || left.value < v)) return false;
    if (left.inequalities.right === '>' && !(left.value === null || left.value > v)) return false;
  }

  return true;
}

/** Check whether placing a black tile at (r,c) is allowed */
export function canPlaceBlack(board, r, c) {
  if (board[r][c].isBlack) return false;
  if (board[r][c].value !== null) return false; // disallow blacking a filled cell
  const n = board.length;
  // adjacency (horiz/vert)
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr,dc] of dirs) {
    const rr = r+dr, cc = c+dc;
    if (rr>=0 && rr<n && cc>=0 && cc<n) {
      if (board[rr][cc].isBlack) return false;
    }
  }
  // simulate placing black and check white connectivity
  const tmp = cloneBoard(board);
  tmp[r][c].isBlack = true;
  if (!whitesRemainConnected(tmp)) return false;
  return true;
}

/** Check white connectivity after hypothetical black placement or general board */
export function whitesRemainConnected(board) {
  const n = board.length;
  let start = null, totalWhite = 0;
  for (let i=0;i<n;i++){
    for (let j=0;j<n;j++){
      if (!board[i][j].isBlack) { totalWhite++; if (!start) start=[i,j]; }
    }
  }
  if (totalWhite === 0) return true;
  const visited = Array.from({length:n}, () => Array(n).fill(false));
  const q = [start];
  visited[start[0]][start[1]] = true;
  let count = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (q.length) {
    const [r,c] = q.shift();
    count++;
    for (const [dr,dc] of dirs){
      const rr = r+dr, cc = c+dc;
      if (rr>=0 && rr<n && cc>=0 && cc<n && !visited[rr][cc] && !board[rr][cc].isBlack){
        visited[rr][cc] = true; q.push([rr,cc]);
      }
    }
  }
  return count === totalWhite;
}

/** Validate entire board (used to detect win). Ensures no rule violations across board. */
export function isBoardValid(board) {
  const n = board.length;
  // check each placed number obey rules (canPlaceNumber requires neighbor values - handle partial)
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      const cell = board[r][c];
      if (!cell.isBlack && cell.value !== null) {
        if (!canPlaceNumber(board, r, c, cell.value)) return false;
      }
    }
  }
  // connectivity
  if (!whitesRemainConnected(board)) return false;
  return true;
}

export function getValidNumbers(board, r, c){
  const n = board.length; const res = [];
  for (let v=1; v<=n; v++) if (canPlaceNumber(board, r, c, v)) res.push(v);
  return res;
}
