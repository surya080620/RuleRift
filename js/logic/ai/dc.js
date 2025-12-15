// js/logic/ai/dc.js
// Divide & Conquer: split board into regions and run greedy inside each region.
// This implementation examines quadrants and prefers the best local greedy choice.

import { greedyChoose } from './greedy.js';
import * as moves from '../moves.js';

function regionPredFactory(n, quadrantIndex){
  const midR = Math.floor(n/2);
  const midC = Math.floor(n/2);
  switch(quadrantIndex){
    case 0: return (r,c) => r < midR && c < midC; // top-left
    case 1: return (r,c) => r < midR && c >= midC; // top-right
    case 2: return (r,c) => r >= midR && c < midC; // bottom-left
    case 3: default: return (r,c) => r >= midR && c >= midC; // bottom-right
  }
}

export function dcChoose(board, opts = { botHasBlack:false }){
  const n = board.length;
  const regionCandidates = [];
  let anyCandidate = false;

  // For each quadrant, ask greedy to choose restricted to that region
  for (let qi = 0; qi < 4; qi++){
    const pred = regionPredFactory(n, qi);
    const candidate = greedyChoose(board, { botHasBlack: opts.botHasBlack, regionFilter: pred });
    if (candidate) {
      anyCandidate = true;
      // rate candidate: prefer placing numbers, prefer central positions lightly
      const centerBias = - (Math.abs(candidate.r - (n-1)/2) + Math.abs(candidate.c - (n-1)/2)) * 0.02;
      const score = (candidate.type === 'place' ? 10 : 3) + centerBias;
      regionCandidates.push({ move: candidate, score });
    }
  }

  if (regionCandidates.length > 0) {
    regionCandidates.sort((a,b) => b.score - a.score);
    return regionCandidates[0].move;
  }

  // fallback: if no regional candidate found, try global moves (greedy)
  const fallback = greedyChoose(board, { botHasBlack: opts.botHasBlack });
  return fallback;
}
