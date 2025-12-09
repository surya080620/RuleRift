// Board representation and helpers

export function createBoard(size) {
  // cell: { value: null|int, isBlack: bool, inequalities: {up,down,left,right} }
  const board = [];
  for (let r = 0; r < size; r++) {
    board[r] = [];
    for (let c = 0; c < size; c++) {
      board[r][c] = {
        value: null,
        isBlack: false,
        inequalities: { up: null, down: null, left: null, right: null }
      };
    }
  }
  return board;
}

export function cloneBoard(board) {
  return board.map(row => row.map(cell => ({
    value: cell.value,
    isBlack: cell.isBlack,
    inequalities: Object.assign({}, cell.inequalities)
  })));
}

export function hashBoard(board) {
  // simple deterministic string
  return board.map(row => row.map(cell => (cell.isBlack ? 'B' : (cell.value===null ? '.' : String(cell.value)) )).join('')).join('|');
}
