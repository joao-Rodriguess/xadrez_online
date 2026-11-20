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

export function normalizeFenKey(fen) {
  const parts = String(fen || '').split(' ');
  return `${parts[0] || ''} ${parts[1] || 'w'} ${parts[2] || '-'} ${parts[3] || '-'}`;
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
  // Track closest enemy pawn row to check passed pawns in O(1) per pawn
  const whiteMaxRow = new Array(8).fill(-1);
  const blackMinRow = new Array(8).fill(8);
  let whiteKing = { r: 7, c: 4 };
  let blackKing = { r: 0, c: 4 };
  const piecesList = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      const val = PIECE_VALUES[sq.type] || 0;
      if (sq.type === 'k') {
        if (sq.color === 'w') whiteKing = { r, c };
        else blackKing = { r, c };
      } else {
        if (sq.color === 'w') whiteMaterial += val;
        else blackMaterial += val;
      }
      if (sq.type === 'b') {
        if (sq.color === 'w') whiteBishops++;
        else blackBishops++;
      }
      if (sq.type === 'p') {
        if (sq.color === 'w') {
          whitePawnFiles[c]++;
          if (r > whiteMaxRow[c]) whiteMaxRow[c] = r;
        } else {
          blackPawnFiles[c]++;
          if (r < blackMinRow[c]) blackMinRow[c] = r;
        }
      }
      piecesList.push({ r, c, type: sq.type, color: sq.color });
    }
  }

  const isEndgame = whiteMaterial < 1400 && blackMaterial < 1400;
  const PASSED_PAWN_BONUS = [0, 15, 28, 50, 90, 150, 240, 0];

  for (const p of piecesList) {
    const { r, c, type, color } = p;
    const baseVal = PIECE_VALUES[type] || 0;
    const tableKey = type === 'k' ? (isEndgame ? 'k_eg' : 'k_mg') : type;
    const table = PST[tableKey];
    const pstRow = color === 'w' ? r : 7 - r;
    const pstBonus = table ? table[pstRow][c] : 0;

    let positionalExtra = 0;

    // Passed pawn detection & advancement bonus
    if (type === 'p') {
      if (color === 'w') {
        let isPassed = true;
        for (let adj = Math.max(0, c - 1); adj <= Math.min(7, c + 1); adj++) {
          if (blackMinRow[adj] < r) {
            isPassed = false;
            break;
          }
        }
        if (isPassed) positionalExtra += PASSED_PAWN_BONUS[7 - r] || 0;
      } else {
        let isPassed = true;
        for (let adj = Math.max(0, c - 1); adj <= Math.min(7, c + 1); adj++) {
          if (whiteMaxRow[adj] > r) {
            isPassed = false;
            break;
          }
        }
        if (isPassed) positionalExtra += PASSED_PAWN_BONUS[r] || 0;
      }
      // Central pawn control
      if ((c === 3 || c === 4) && (r === 3 || r === 4)) positionalExtra += 18;
    }

    // Minor piece development bonus (encourage bringing Knights/Bishops off back rank in opening/midgame)
    if (!isEndgame && (type === 'n' || type === 'b')) {
      const homeRow = color === 'w' ? 7 : 0;
      if (r !== homeRow) positionalExtra += 16;
    }

    // Open & semi-open file bonus for Rooks (only reward forward/connected rooks, not shuffling on back rank corners)
    if (type === 'r') {
      const ownPawns = color === 'w' ? whitePawnFiles[c] : blackPawnFiles[c];
      const enemyPawns = color === 'w' ? blackPawnFiles[c] : whitePawnFiles[c];
      if (ownPawns === 0 && enemyPawns === 0) positionalExtra += 20;
      else if (ownPawns === 0) positionalExtra += 10;
      if ((color === 'w' && r === 1) || (color === 'b' && r === 6)) positionalExtra += 24;
    }

    // King tropism (encourage pieces to approach enemy King)
    if (type !== 'p' && type !== 'k') {
      const targetKing = color === 'w' ? blackKing : whiteKing;
      const dist = Math.abs(r - targetKing.r) + Math.abs(c - targetKing.c);
      const weight = type === 'q' ? 2.5 : type === 'r' ? 2.0 : type === 'n' ? 1.8 : 1.4;
      positionalExtra += Math.round((14 - dist) * weight);
    }

    if (color === 'w') {
      score += baseVal + pstBonus + positionalExtra;
    } else {
      score -= baseVal + pstBonus + positionalExtra;
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

  // Endgame / Winning Mop-Up Evaluation: drive losing King to corner & bring winning King close
  const matDiff = whiteMaterial - blackMaterial;
  const kingsDist = Math.abs(whiteKing.r - blackKing.r) + Math.abs(whiteKing.c - blackKing.c);
  if (matDiff >= 150 || (isEndgame && matDiff > 0)) {
    const blackCenterDist = Math.abs(blackKing.r - 3.5) + Math.abs(blackKing.c - 3.5);
    score += Math.round(blackCenterDist * 28 + (14 - kingsDist) * 26);
  } else if (matDiff <= -150 || (isEndgame && matDiff < 0)) {
    const whiteCenterDist = Math.abs(whiteKing.r - 3.5) + Math.abs(whiteKing.c - 3.5);
    score -= Math.round(whiteCenterDist * 28 + (14 - kingsDist) * 26);
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
  constructor(timeLimitMs, historyCounts = new Map()) {
    this.startTime = performance.now();
    this.timeLimitMs = timeLimitMs;
    this.allowTimeout = false;
    this.aborted = false;
    this.nodes = 0;
    this.tt = new Map();
    this.killers = new Map();
    this.historyCounts = historyCounts;
    this.pathCounts = new Map();
  }

  checkTime() {
    if (this.allowTimeout && (this.nodes & 511) === 0 && this.timeLimitMs > 0) {
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
    score += 400;
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

  const posKey = normalizeFenKey(chess.fen());
  const pathSeen = (ctx.pathCounts.get(posKey) || 0) + 1;
  const gameSeen = ctx.historyCounts.get(posKey) || 0;

  // True draw-by-repetition detection in tree with mild contempt (-25 cp, never worse than sacrificing material!)
  if (ply >= 2 && (pathSeen >= 2 || gameSeen >= 2 || (gameSeen >= 1 && pathSeen >= 2))) {
    const staticScore = colorSign * evaluatePositionWhite(chess);
    return staticScore > 80 ? -25 : 0;
  }

  if (isGameOver(chess)) {
    if (isGameCheckmate(chess)) {
      return -95000 + ply;
    }
    return 0;
  }

  const originalAlpha = alpha;
  const fenKey = chess.fen();
  const ttEntry = ctx.tt.get(fenKey);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'EXACT') return ttEntry.value;
    if (ttEntry.flag === 'LOWER') alpha = Math.max(alpha, ttEntry.value);
    else if (ttEntry.flag === 'UPPER') beta = Math.min(beta, ttEntry.value);
    if (alpha >= beta) return ttEntry.value;
  }

  if (depth <= 0) {
    if (useQuiescence) {
      return quiescence(chess, alpha, beta, colorSign, ctx, 0);
    }
    return colorSign * evaluatePositionWhite(chess);
  }

  ctx.pathCounts.set(posKey, pathSeen);

  const moves = chess.moves({ verbose: true });
  const killersAtPly = ctx.killers.get(ply) || [];
  const ordered = orderMoves(moves, ttEntry?.bestMove, killersAtPly);

  let bestValue = -Infinity;
  let bestMove = null;

  for (const move of ordered) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, ply + 1, -beta, -alpha, -colorSign, ctx, useQuiescence);
    chess.undo();

    if (ctx.aborted) break;

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

  ctx.pathCounts.set(posKey, pathSeen - 1);
  if (ctx.aborted) return 0;

  if (bestMove) {
    let flag = 'EXACT';
    if (bestValue <= originalAlpha) flag = 'UPPER';
    else if (bestValue >= beta) flag = 'LOWER';
    if (ctx.tt.size < 40000) {
      ctx.tt.set(fenKey, { depth, value: bestValue, flag, bestMove: moveKey(bestMove) });
    }
  }

  return bestValue;
}

function buildHistoryMap(recentFens = []) {
  const map = new Map();
  for (const f of recentFens) {
    const key = normalizeFenKey(f);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function computeRootAntiRepetitionPenalty(chess, move, historyCounts, recentMoves = []) {
  let penalty = 0;
  chess.move(move);
  const nextKey = normalizeFenKey(chess.fen());
  const nextIsMate = isGameCheckmate(chess);
  chess.undo();

  // Never penalize checkmate!
  if (nextIsMate) return 0;

  // Moderate tie-breaker penalty: breaks loops & oscillations without ever causing material blunders
  const repeatCount = historyCounts.get(nextKey) || 0;
  if (repeatCount >= 2) {
    penalty += 110;
  } else if (repeatCount === 1) {
    penalty += 45;
  }

  // Penalize immediate reversal of the side's own previous move (A->B then B->A without capture)
  const lastOwnMove = recentMoves.length >= 2 ? recentMoves[recentMoves.length - 2] : null;
  if (lastOwnMove && !move.captured && move.from === lastOwnMove.to && move.to === lastOwnMove.from) {
    penalty += 38;
  }
  const prevOwnMove = recentMoves.length >= 4 ? recentMoves[recentMoves.length - 4] : null;
  if (prevOwnMove && !move.captured && move.from === prevOwnMove.to && move.to === prevOwnMove.from) {
    penalty += 18;
  }

  return penalty;
}

function searchBestMoveSync(fen, level = 3, historyContext = {}) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const cfg = BOT_LEVELS[level] || BOT_LEVELS[3];
  const colorSign = chess.turn() === 'w' ? 1 : -1;
  const recentFens = historyContext?.recentFens || [];
  const recentMoves = historyContext?.recentMoves || [];
  const historyCounts = buildHistoryMap(recentFens);

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

  // Level 1: Novice - mix random moves with obvious capture checks + avoid silly loops
  if (level === 1) {
    const scored = moves.map((m) => {
      const penalty = computeRootAntiRepetitionPenalty(chess, m, historyCounts, recentMoves);
      chess.move(m);
      const evalScore = -colorSign * evaluatePositionWhite(chess);
      chess.undo();
      const noise = (Math.random() - 0.5) * 420;
      return { move: m, score: evalScore - penalty + noise };
    });
    scored.sort((a, b) => b.score - a.score);
    const topSlice = scored.slice(0, Math.min(4, scored.length));
    return topSlice[Math.floor(Math.random() * topSlice.length)].move;
  }

  const timeLimitMs = level === 5 ? 900 : level === 4 ? 650 : 400;
  const useQuiescence = level >= 4;
  const ctx = new SearchContext(timeLimitMs, historyCounts);

  // Precompute root penalties so search & iterative deepening avoid repetition lines
  const rootPenalties = new Map();
  for (const m of moves) {
    rootPenalties.set(moveKey(m), computeRootAntiRepetitionPenalty(chess, m, historyCounts, recentMoves));
  }

  let bestOverallMove = moves[0];
  let scoredCandidates = [];

  const maxDepth = cfg.depth;
  const startDepth = 1;

  for (let d = startDepth; d <= maxDepth; d++) {
    // Always complete depth 1 safely so we never fall back to an unsearched moves[0]
    ctx.allowTimeout = d >= 2;
    const currentCandidates = [];
    const ttEntry = ctx.tt.get(fen);
    const ordered = orderMoves(moves, ttEntry?.bestMove, null);

    let alpha = -Infinity;
    const beta = Infinity;
    let bestInIter = ordered[0];
    let bestIterScore = -Infinity;

    for (const move of ordered) {
      chess.move(move);
      const rawVal = -negamax(chess, d - 1, 1, -beta, -alpha, -colorSign, ctx, useQuiescence);
      chess.undo();

      if (ctx.aborted) break;

      const penalty = rootPenalties.get(moveKey(move)) || 0;
      const adjustedVal = rawVal - penalty;

      currentCandidates.push({ move, score: adjustedVal });
      if (adjustedVal > bestIterScore) {
        bestIterScore = adjustedVal;
        bestInIter = move;
      }
      if (adjustedVal > alpha) {
        alpha = adjustedVal;
      }
    }

    if (ctx.aborted) break;
    bestOverallMove = bestInIter;
    scoredCandidates = currentCandidates;
    if (bestInIter) {
      ctx.tt.set(fen, { depth: d, value: bestIterScore, flag: 'EXACT', bestMove: moveKey(bestInIter) });
    }
    if (bestIterScore > 90000) break; // Forced mate found, no need to search deeper
  }

  // Controlled slight variety at level 2 & 3 so games feel organic without repeating
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
export function getBestMove(fen, level = 3, minThinkTimeMs = 1200, historyContext = {}) {
  return new Promise((resolve) => {
    const startTick = performance.now();
    const initialYield = 40;
    setTimeout(() => {
      const move = searchBestMoveSync(fen, level, historyContext);
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
