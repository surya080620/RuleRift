// js/logic/ai/dc.js
import { greedyChoose } from './greedy.js';

function createQuadrantFilter(n, qIndex) {
  const mid = Math.floor(n/2);
  const rMin = (qIndex & 2) ? mid : 0;
  const rMax = (qIndex & 2) ? n : mid;
  const cMin = (qIndex & 1) ? mid : 0;
  const cMax = (qIndex & 1) ? n : mid;
  return (r, c) => r >= rMin && r < rMax && c >= cMin && c < cMax;
}

export function dcChoose(board, opts = { botHasBlack: false }) {
  const n = board.length;
  if (n < 4) return greedyChoose(board, opts);
  const regionCandidates = [];
  for (let i = 0; i < 4; i++) {
    const filter = createQuadrantFilter(n, i);
    const move = greedyChoose(board, { ...opts, regionFilter: filter });
    if (move) {
      let score = move.type === 'place' ? 10 : 3;
      const center = (n - 1) / 2;
      const dist = Math.abs(move.r - center) + Math.abs(move.c - center);
      score -= (dist * 0.05);
      regionCandidates.push({ move, score });
    }
  }
  if (regionCandidates.length > 0) { regionCandidates.sort((a,b) => b.score - a.score); return regionCandidates[0].move; }
  return greedyChoose(board, opts);
}
