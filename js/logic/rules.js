import { cloneBoard } from './board.js';

/** Check number placement legality */
export function canPlaceNumber(board, r, c, v) {
  const n = board.length;
  const cell = board[r][c];
  if (!cell || cell.isBlack) return false;
  // uniqueness in row
  for (let j=0;j<n;j++){
    if (j===c) continue;
    const other = board[r][j];
    if (!other.isBlack && other.value === v) return false;
  }
  // uniqueness in col
  for (let i=0;i<n;i++){
    if (i===r) continue;
    const other = board[i][c];
    if (!other.isBlack && other.value === v) return false;
  }
  // inequality checks with neighbors (only if neighbor has value)
  const up = r>0 ? board[r-1][c] : null;
  const down = r<n-1 ? board[r+1][c] : null;
  const left = c>0 ? board[r][c-1] : null;
  const right = c<n-1 ? board[r][c+1] : null;
  // For each direction recorded in cell.inequalities, check
  if (cell.inequalities.left && left && !left.isBlack && left.value !== null) {
    if (cell.inequalities.left === '<') {
      if (!(left.value < v)) return false;
    } else {
      if (!(left.value > v)) return false;
    }
  }
  if (cell.inequalities.right && right && !right.isBlack && right.value !== null) {
    if (cell.inequalities.right === '<') {
      if (!(right.value < v)) return false;
    } else {
      if (!(right.value > v)) return false;
    }
  }
  if (cell.inequalities.up && up && !up.isBlack && up.value !== null) {
    if (cell.inequalities.up === '<') {
      if (!(up.value < v)) return false;
    } else {
      if (!(up.value > v)) return false;
    }
  }
  if (cell.inequalities.down && down && !down.isBlack && down.value !== null) {
    if (cell.inequalities.down === '<') {
      if (!(down.value < v)) return false;
    } else {
      if (!(down.value > v)) return false;
    }
  }
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
