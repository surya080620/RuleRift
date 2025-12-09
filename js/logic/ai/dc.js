import { greedyChoose } from './greedy.js';

/**
 * Divide & Conquer wrapper: choose a quadrant with most empty cells,
 * then run greedy inside that quadrant (filter moves).
 */
export async function dcChoose(board, context = {}) {
  const n = board.length;
  const regions = [
    { r0:0, r1: Math.floor(n/2)-1, c0:0, c1: Math.floor(n/2)-1 },
    { r0:0, r1: Math.floor(n/2)-1, c0:Math.floor(n/2), c1: n-1 },
    { r0:Math.floor(n/2), r1:n-1, c0:0, c1:Math.floor(n/2)-1 },
    { r0:Math.floor(n/2), r1:n-1, c0:Math.floor(n/2), c1:n-1 }
  ];
  // pick region with most empty (non-black, null) cells
  let bestReg = regions[0], bestCount = -1;
  for (const reg of regions) {
    let count = 0;
    for (let r=reg.r0;r<=reg.r1;r++) for (let c=reg.c0;c<=reg.c1;c++){
      if (!board[r][c].isBlack && board[r][c].value === null) count++;
    }
    if (count > bestCount) { bestCount = count; bestReg = reg; }
  }
  // Now call greedy but prefer moves in that region by providing context (greedy chooses globally)
  // Simpler: ask greedy; if its move in region, use it; else call greedy filtered for region
  const global = greedyChoose(board, context);
  if (!global) return null;
  if (global.r >= bestReg.r0 && global.r <= bestReg.r1 && global.c >= bestReg.c0 && global.c <= bestReg.c1) return global;
  // otherwise try to pick a greedy move inside region; fallback to global
  // naive attempt: iterate all moves and pick best inside region
  const { getAllNumberMoves, getAllBlackMoves } = await import('../moves.js');
  const numMoves = getAllNumberMoves(board);
  let best = null, bestScore=-Infinity;
  for (const m of numMoves) {
    if (m.r>=bestReg.r0 && m.r<=bestReg.r1 && m.c>=bestReg.c0 && m.c<=bestReg.c1) {
      const s = 5; // simple positive weighting
      if (s > bestScore) { bestScore = s; best = m; }
    }
  }
  return best || global;
}
