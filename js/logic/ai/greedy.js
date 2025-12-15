import * as moves from '../moves.js';
import * as rules from '../rules.js';

// Greedy: evaluate moves by immediate board improvement
function evaluateBoardAfterMove(board, move) {
  const n = board.length;
  const sim = board.map(row => row.map(cell => ({ value: cell.value, isBlack: cell.isBlack, inequalities: Object.assign({}, cell.inequalities) })));

  if (move.type === 'place') sim[move.r][move.c].value = move.value;
  else if (move.type === 'black') sim[move.r][move.c].isBlack = true;

  let totalPoss = 0;
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      if (sim[r][c].isBlack || sim[r][c].value !== null) continue;
      const vals = rules.getValidNumbers(sim, r, c);
      totalPoss += vals.length;
    }
  }
  let placeBonus = move.type === 'place' ? 8 : 0;
  let blackBonus = move.type === 'black' ? 3 : 0;

  return -totalPoss + placeBonus + blackBonus;
}

export function greedyChoose(board, opts = { botHasBlack: false, playerHasBlack: false, regionFilter: null }){
  let candidates = moves.getLegalMoves(board, 2, { playerHasBlack: opts.botHasBlack });
  if (opts.regionFilter){
    candidates = candidates.filter(m => opts.regionFilter(m.r, m.c));
  }
  if (!candidates || candidates.length === 0) return null;

  let best = null, bestScore = -Infinity;
  for (const m of candidates){
    const s = evaluateBoardAfterMove(board, m);
    const final = s + (Math.random()*0.01);
    if (final > bestScore){ bestScore = final; best = m; }
  }
  return best;
}
