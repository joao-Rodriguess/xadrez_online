import { searchBestMoveSync } from './botAI.js';

self.onmessage = (event) => {
  const { id, fen, level = 3, historyContext = {} } = event.data || {};
  try {
    const move = searchBestMoveSync(fen, level, historyContext);
    self.postMessage({ id, move });
  } catch (err) {
    self.postMessage({
      id,
      move: null,
      error: err?.message || 'Bot worker search failed',
    });
  }
};
