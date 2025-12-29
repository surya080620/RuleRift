// js/logic/board.js
export function createBoard(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => createCell()));
}

function createCell() {
  return {
    value: null,
    isBlack: false,
    inequalities: { up: null, down: null, left: null, right: null }
  };
}

export function cloneBoard(board) {
  const size = board.length;
  const newBoard = new Array(size);
  for (let r = 0; r < size; r++) {
    newBoard[r] = new Array(size);
    for (let c = 0; c < size; c++) {
      const src = board[r][c];
      newBoard[r][c] = {
        value: src.value,
        isBlack: src.isBlack,
        inequalities: {
          up: src.inequalities.up,
          down: src.inequalities.down,
          left: src.inequalities.left,
          right: src.inequalities.right
        }
      };
    }
  }
  return newBoard;
}

export function resetBoard(board) {
  const size = board.length;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) { board[r][c].value = null; board[r][c].isBlack = false; }
}
