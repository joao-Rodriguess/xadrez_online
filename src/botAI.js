import { Chess } from 'chess.js';

/**
 * Multi-level Chess AI Engine (5 levels: Apprentice ~600 to Grandmaster ~2100+).
 * Uses Opening Book, Piece-Square Tables (MG & EG), Alpha-Beta Pruning,
 * MVV-LVA move ordering, Killer Moves, Quiescence Search, Transposition Table,
 * and Iterative Deepening.
 */

export const BOT_LEVELS = {
  1: { name: 'Aprendiz', elo: '~600', depth: 1, randomness: 0.45, description: 'Ideal para iniciantes; comete erros ocasionais.' },
  2: { name: 'Casual', elo: '~1000', depth: 2, randomness: 0.18, description: 'Joga capturas básicas e desenvolve peças.' },
  3: { name: 'Clube', elo: '~1400', depth: 3, randomness: 0.05, description: 'Tático sólido com busca Alpha-Beta e aberturas.' },
  4: { name: 'Mestre', elo: '~1800', depth: 4, randomness: 0.0, description: 'Usa Quiescence Search e evita armadilhas táticas.' },
  5: { name: 'Grande Mestre', elo: '~2150', depth: 5, randomness: 0.0, description: 'Iterative Deepening + Transposition Table + Killer Moves.' },
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-Square Tables from White's perspective (rank 8 at index 0 .. rank 1 at index 7)
const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 27, 27, 10,  5,  5],
    [0,  0,  0, 24, 24,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-22,-22, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0],
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  r: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [6, 12, 12, 12, 12, 12, 12,  6],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  6,  6,  0,  0,  0],
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,   0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  k_mg: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20],
  ],
  k_eg: [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50],
  ],
};

// Lightweight curated opening book keyed by normalized FEN board + turn + castling
const OPENING_BOOK = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq': ['d7d5', 'g8f6', 'e7e6'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['g1f3', 'f1c4', 'b1c3'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': ['b8c6', 'g8f6'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['f1b5', 'f1c4', 'd2d4'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq': ['f8c5', 'g8f6'],
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq': ['a7a6', 'g8f6'],
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['g1f3', 'b1c3', 'c2c3'],
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': ['c2c4', 'g1f3', 'c1f4'],
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq': ['e7e6', 'c7c6', 'd5c4'],
};

function bookKeyFromFen(fen) {
  const parts = fen.split(' ');
  return `${parts[0]} ${parts[1]} ${parts[2]}`;
}

export function isGameCheck(chess) {
  return typeof chess.isCheck === 'function' ? chess.isCheck() : chess.inCheck();
}

export function isGameCheckmate(chess) {
  return typeof chess.isCheckmate === 'function' ? chess.isCheckmate() : chess.in_checkmate?.() ?? false;
}

export function isGameDraw(chess) {
  return typeof chess.isDraw === 'function' ? chess.isDraw() : chess.in_draw?.() ?? false;
}

export function isGameOver(chess) {
  return typeof chess.isGameOver === 'function' ? chess.isGameOver() : chess.game_over?.() ?? false;
}

/**
 * Evaluates a position statically from White's perspective in centipawns.
 * Positive = White advantage, Negative = Black advantage.
 */
export function evaluatePositionWhite(chess) {
  if (isGameCheckmate(chess)) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (isGameDraw(chess)) {
    return 0;
  }

  const board = chess.board();
  let whiteMaterial = 0;
  let blackMaterial = 0;
  let score = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  const whitePawnFiles = new Array(8).fill(0);
  const blackPawnFiles = new Array(8).fill(0);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      const val = PIECE_VALUES[sq.type] || 0;
      if (sq.type !== 'k') {
        if (sq.color === 'w') whiteMaterial += val;
        else blackMaterial += val;
      }
      if (sq.type === 'b') {
        if (sq.color === 'w') whiteBishops++;
        else blackBishops++;
      }
      if (sq.type === 'p') {
        if (sq.color === 'w') whitePawnFiles[c]++;
        else blackPawnFiles[c]++;
      }
    }
  }

  const isEndgame = whiteMaterial < 1400 && blackMaterial < 1400;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      const baseVal = PIECE_VALUES[sq.type] || 0;
      const tableKey = sq.type === 'k' ? (isEndgame ? 'k_eg' : 'k_mg') : sq.type;
      const table = PST[tableKey];
      const pstRow = sq.color === 'w' ? r : 7 - r;
      const pstBonus = table ? table[pstRow][c] : 0;

      if (sq.color === 'w') {
        score += baseVal + pstBonus;
      } else {
        score -= baseVal + pstBonus;
      }
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) score += 35;
  if (blackBishops >= 2) score -= 35;

  // Doubled & isolated pawn penalty
  for (let f = 0; f < 8; f++) {
    if (whitePawnFiles[f] > 1) score -= 14 * (whitePawnFiles[f] - 1);
    if (blackPawnFiles[f] > 1) score += 14 * (blackPawnFiles[f] - 1);

    if (whitePawnFiles[f] > 0) {
      const left = f > 0 ? whitePawnFiles[f - 1] : 0;
      const right = f < 7 ? whitePawnFiles[f + 1] : 0;
      if (left === 0 && right === 0) score -= 12;
    }
    if (blackPawnFiles[f] > 0) {
      const left = f > 0 ? blackPawnFiles[f - 1] : 0;
      const right = f < 7 ? blackPawnFiles[f + 1] : 0;
      if (left === 0 && right === 0) score += 12;
    }
  }

  // Slight tempo bonus for side to move
  score += chess.turn() === 'w' ? 10 : -10;

  return score;
}

/**
 * Public helper for Eval Bar in UI (returns score in pawns from White's POV, plus mate string if applicable).
 */
export function evaluateBoardScore(fen) {
  const chess = new Chess(fen);
  if (isGameCheckmate(chess)) {
    return { pawns: chess.turn() === 'w' ? -100 : 100, mateIn: 0, winner: chess.turn() === 'w' ? 'b' : 'w' };
  }
  if (isGameDraw(chess)) {
    return { pawns: 0, mateIn: null };
  }
  const cp = evaluatePositionWhite(chess);
  return { pawns: cp / 100, mateIn: null };
}

class SearchContext {
  constructor(timeLimitMs) {
    this.startTime = performance.now();
    this.timeLimitMs = timeLimitMs;
    this.aborted = false;
    this.nodes = 0;
    this.tt = new Map();
    this.killers = new Map();
  }

  checkTime() {
    if ((this.nodes & 1023) === 0 && this.timeLimitMs > 0) {
      if (performance.now() - this.startTime > this.timeLimitMs) {
        this.aborted = true;
      }
    }
    return this.aborted;
  }
}

function moveKey(m) {
  return `${m.from}${m.to}${m.promotion || ''}`;
}

function scoreMoveForOrdering(move, ttBestKey, killersAtPly) {
  const key = moveKey(move);
  if (ttBestKey && key === ttBestKey) return 1000000;
  let score = 0;
  if (move.captured) {
    const victim = PIECE_VALUES[move.captured] || 100;
    const attacker = PIECE_VALUES[move.piece] || 100;
    // MVV-LVA
    score += 100000 + victim * 10 - attacker;
  }
  if (move.promotion) {
    score += 90000 + (PIECE_VALUES[move.promotion] || 0);
  }
  if (killersAtPly && killersAtPly.includes(key)) {
    score += 50000;
  }
  if (move.san && move.san.includes('+')) {
    score += 5000;
  }
  return score;
}

function orderMoves(moves, ttBestKey, killersAtPly) {
  return moves
    .map((m) => ({ move: m, score: scoreMoveForOrdering(m, ttBestKey, killersAtPly) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.move);
}

function quiescence(chess, alpha, beta, colorSign, ctx, qDepth = 0) {
  ctx.nodes++;
  if (ctx.checkTime()) return 0;

  const standPat = colorSign * evaluatePositionWhite(chess);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  if (qDepth >= 4) return alpha;

  const captures = chess
    .moves({ verbose: true })
    .filter((m) => m.captured || m.promotion);

  const ordered = orderMoves(captures, null, null);
  for (const move of ordered) {
    chess.move(move);
    const score = -quiescence(chess, -beta, -alpha, -colorSign, ctx, qDepth + 1);
    chess.undo();

    if (ctx.aborted) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(chess, depth, ply, alpha, beta, colorSign, ctx, useQuiescence) {
  ctx.nodes++;
  if (ctx.checkTime()) return 0;

  const originalAlpha = alpha;
  const fenKey = chess.fen();
  const ttEntry = ctx.tt.get(fenKey);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'EXACT') return ttEntry.value;
    if (ttEntry.flag === 'LOWER') alpha = Math.max(alpha, ttEntry.value);
    else if (ttEntry.flag === 'UPPER') beta = Math.min(beta, ttEntry.value);
    if (alpha >= beta) return ttEntry.value;
  }

  if (isGameOver(chess)) {
    if (isGameCheckmate(chess)) {
      return -95000 + ply;
    }
    return 0;
  }

  if (depth <= 0) {
    if (useQuiescence) {
      return quiescence(chess, alpha, beta, colorSign, ctx, 0);
    }
    return colorSign * evaluatePositionWhite(chess);
  }

  const moves = chess.moves({ verbose: true });
  const killersAtPly = ctx.killers.get(ply) || [];
  const ordered = orderMoves(moves, ttEntry?.bestMove, killersAtPly);

  let bestValue = -Infinity;
  let bestMove = null;

  for (const move of ordered) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, ply + 1, -beta, -alpha, -colorSign, ctx, useQuiescence);
    chess.undo();

    if (ctx.aborted) return 0;

    if (score > bestValue) {
      bestValue = score;
      bestMove = move;
    }
    if (score > alpha) {
      alpha = score;
    }
    if (alpha >= beta) {
      if (!move.captured) {
        const key = moveKey(move);
        const list = ctx.killers.get(ply) || [];
        if (!list.includes(key)) {
          ctx.killers.set(ply, [key, list[0]].filter(Boolean));
        }
      }
      break;
    }
  }

  if (!ctx.aborted && bestMove) {
    let flag = 'EXACT';
    if (bestValue <= originalAlpha) flag = 'UPPER';
    else if (bestValue >= beta) flag = 'LOWER';
    if (ctx.tt.size < 40000) {
      ctx.tt.set(fenKey, { depth, value: bestValue, flag, bestMove: moveKey(bestMove) });
    }
  }

  return bestValue;
}

function searchBestMoveSync(fen, level = 3) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const cfg = BOT_LEVELS[level] || BOT_LEVELS[3];
  const colorSign = chess.turn() === 'w' ? 1 : -1;

  // Use opening book for level >= 3
  if (level >= 3) {
    const bKey = bookKeyFromFen(fen);
    const bookChoices = OPENING_BOOK[bKey];
    if (bookChoices && bookChoices.length > 0) {
      const candidateStr = bookChoices[Math.floor(Math.random() * bookChoices.length)];
      const found = moves.find((m) => moveKey(m) === candidateStr);
      if (found) return found;
    }
  }

  // Level 1: Novice - mix random moves with obvious capture checks
  if (level === 1) {
    const scored = moves.map((m) => {
      chess.move(m);
      const evalScore = -colorSign * evaluatePositionWhite(chess);
      chess.undo();
      const noise = (Math.random() - 0.5) * 420;
      return { move: m, score: evalScore + noise };
    });
    scored.sort((a, b) => b.score - a.score);
    const topSlice = scored.slice(0, Math.min(4, scored.length));
    return topSlice[Math.floor(Math.random() * topSlice.length)].move;
  }

  const timeLimitMs = level === 5 ? 900 : level === 4 ? 650 : 400;
  const useQuiescence = level >= 4;
  const ctx = new SearchContext(timeLimitMs);

  let bestOverallMove = moves[0];
  let scoredCandidates = [];

  const maxDepth = cfg.depth;
  const startDepth = level === 5 ? 1 : maxDepth;

  for (let d = startDepth; d <= maxDepth; d++) {
    const currentCandidates = [];
    const ttEntry = ctx.tt.get(fen);
    const ordered = orderMoves(moves, ttEntry?.bestMove, null);

    let alpha = -Infinity;
    const beta = Infinity;
    let bestInIter = ordered[0];
    let bestIterScore = -Infinity;

    for (const move of ordered) {
      chess.move(move);
      const val = -negamax(chess, d - 1, 1, -beta, -alpha, -colorSign, ctx, useQuiescence);
      chess.undo();

      if (ctx.aborted) break;

      currentCandidates.push({ move, score: val });
      if (val > bestIterScore) {
        bestIterScore = val;
        bestInIter = move;
      }
      if (val > alpha) {
        alpha = val;
      }
    }

    if (ctx.aborted) break;
    bestOverallMove = bestInIter;
    scoredCandidates = currentCandidates;
  }

  // Controlled slight variety at level 2 & 3 so games feel organic
  if (cfg.randomness > 0 && scoredCandidates.length > 1) {
    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestScore = scoredCandidates[0].score;
    const tolerance = level === 2 ? 90 : 25;
    const nearBest = scoredCandidates.filter((c) => bestScore - c.score <= tolerance);
    if (nearBest.length > 1 && Math.random() < cfg.randomness) {
      return nearBest[Math.floor(Math.random() * nearBest.length)].move;
    }
  }

  return bestOverallMove;
}

/**
 * Async wrapper with a consistent minimum think duration so bots at every
 * difficulty level (including Grandmaster) play at a readable, steady pace.
 */
export function getBestMove(fen, level = 3, minThinkTimeMs = 1200) {
  return new Promise((resolve) => {
    const startTick = performance.now();
    const initialYield = 40;
    setTimeout(() => {
      const move = searchBestMoveSync(fen, level);
      const elapsed = performance.now() - startTick;
      const remaining = Math.max(0, minThinkTimeMs - elapsed);
      if (remaining > 0) {
        setTimeout(() => resolve(move), remaining);
      } else {
        resolve(move);
      }
    }, initialYield);
  });
}
