import { greedyChoose } from './greedy.js';
import * as moves from '../moves.js';

// Divide & Conquer: split board into regions and run greedy inside each region
export function dcChoose(board, opts = { botHasBlack: false }){
  const n = board.length;
  const midR = Math.floor(n/2);
  const midC = Math.floor(n/2);
  const regions = [
    r => r.row < midR && r.col < midC,
    r => r.row < midR && r.col >= midC,
    r => r.row >= midR && r.col < midC,
    r => r.row >= midR && r.col >= midC
  ];

  function regionFilterFactory(pred){
    return (rr, cc) => pred({ row: rr, col: cc });
  }

  let bestMove = null; let bestScore = -Infinity;
  for (const pred of regions){
    const filter = regionFilterFactory(pred);
    const candidate = greedyChoose(board, { botHasBlack: opts.botHasBlack, regionFilter: filter });
    if (!candidate) continue;
    const centerBias = - (Math.abs((candidate.r - (n-1)/2)) + Math.abs((candidate.c - (n-1)/2))) * 0.01;
    const score = (candidate.type === 'place' ? 10 : 3) + centerBias;
    if (score > bestScore){ bestScore = score; bestMove = candidate; }
  }

  if (!bestMove) return greedyChoose(board, { botHasBlack: opts.botHasBlack });
  return bestMove;
}
