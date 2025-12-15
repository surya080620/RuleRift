import { cloneBoard } from './board.js';

export function canPlaceNumber(board, r, c, v){
  const n = board.length;
  const cell = board[r][c];
  if (cell.isBlack) return false;
  if (v < 1 || v > n) return false;

  for (let j=0;j<n;j++){ if (!board[r][j].isBlack && board[r][j].value === v) return false; }
  for (let i=0;i<n;i++){ if (!board[i][c].isBlack && board[i][c].value === v) return false; }

  const up = r>0 ? board[r-1][c] : null;
  const down = r<n-1 ? board[r+1][c] : null;
  const left = c>0 ? board[r][c-1] : null;
  const right = c<n-1 ? board[r][c+1] : null;

  const checkRel = (neighbor, relation, neighborVal) => {
    if (!relation) return true;
    if (neighborVal === null) return true;
    if (relation === '<') return neighborVal < v;
    if (relation === '>') return neighborVal > v;
    return true;
  };

  if (cell.inequalities.up && up && !up.isBlack){ if (!checkRel(up, cell.inequalities.up, up.value)) return false; }
  if (cell.inequalities.down && down && !down.isBlack){ if (!checkRel(down, cell.inequalities.down, down.value)) return false; }
  if (cell.inequalities.left && left && !left.isBlack){ if (!checkRel(left, cell.inequalities.left, left.value)) return false; }
  if (cell.inequalities.right && right && !right.isBlack){ if (!checkRel(right, cell.inequalities.right, right.value)) return false; }

  return true;
}

export function canPlaceBlack(board, r, c){
  if (board[r][c].isBlack) return false;
  const n = board.length;
  if (board[r][c].value !== null) return false;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr,dc] of dirs){
    const rr = r+dr, cc = c+dc;
    if (rr>=0 && rr<n && cc>=0 && cc<n && board[rr][cc].isBlack) return false;
  }
  const sim = cloneBoard(board);
  sim[r][c].isBlack = true;
  return whitesRemainConnected(sim);
}

export function whitesRemainConnected(board){
  const n = board.length;
  let start = null; let totalWhite = 0;
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) { if (!board[i][j].isBlack) { totalWhite++; if (!start) start=[i,j]; }}
  if (totalWhite===0) return true;
  const visited = Array.from({length:n}, ()=>Array(n).fill(false));
  const q = [start]; visited[start[0]][start[1]]=true; let count=0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while(q.length){ const [r,c]=q.shift(); count++; for (const [dr,dc] of dirs){ const rr=r+dr, cc=c+dc; if (rr>=0 && rr<n && cc>=0 && cc<n && !visited[rr][cc] && !board[rr][cc].isBlack){ visited[rr][cc]=true; q.push([rr,cc]); } }}
  return count === totalWhite;
}

export function isBoardComplete(board){
  const n = board.length;
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (!board[r][c].isBlack && board[r][c].value === null) return false;
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (!board[r][c].isBlack && board[r][c].value !== null){ if (!canPlaceNumber(board, r, c, board[r][c].value)) return false; }
  return true;
}

export function getValidNumbers(board, r, c){
  const n = board.length; const res = [];
  for (let v=1; v<=n; v++) if (canPlaceNumber(board, r, c, v)) res.push(v);
  return res;
}
