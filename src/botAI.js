import { Chess } from 'chess.js';

/**
 * Multi-level Chess AI Engine (5 levels: Apprentice ~600 to Grandmaster ~2100+).
 * Uses Opening Book, Piece-Square Tables (MG & EG), Alpha-Beta Pruning,
 * MVV-LVA move ordering, Killer Moves, Quiescence Search, Transposition Table,
 * and Iterative Deepening.
 */

export const BOT_LEVELS = {
  1: {
    name: 'Sofia • Aprendiz',
    shortName: 'Sofia',
    elo: '~600',
    depth: 1,
    randomness: 0.45,
    description: 'Sofia joga de forma descontraída; ideal para iniciantes.',
    chatLines: {
      start: 'Oi! Vamos jogar uma partida leve e divertida!',
      capture: 'Opa, peguei essa peça!',
      check: 'Olha o xeque!',
      blunder: 'Boa jogada! Não vi essa!',
    },
  },
  2: {
    name: 'Lucas • Casual',
    shortName: 'Lucas',
    elo: '~1000',
    depth: 2,
    randomness: 0.18,
    description: 'Lucas faz capturas básicas e desenvolve suas peças.',
    chatLines: {
      start: 'Preparado? Prometo pensar antes de mexer!',
      capture: 'Boa troca para mim!',
      check: 'Xeque no Rei!',
      blunder: 'Eita, essa doeu...',
    },
  },
  3: {
    name: 'Viktor • Clube',
    shortName: 'Viktor',
    elo: '~1400',
    depth: 3,
    randomness: 0.05,
    description: 'Viktor joga táticas sólidas de clube e aberturas clássicas.',
    chatLines: {
      start: 'Vamos testar suas aberturas hoje.',
      capture: 'Material garantido na conta!',
      check: 'Pressão direta sobre seu Rei!',
      blunder: 'Excelente combinação tática sua!',
    },
  },
  4: {
    name: 'Mikhail • Mago',
    shortName: 'Mikhail',
    elo: '~1850',
    depth: 4,
    randomness: 0.0,
    description: 'Estilo agressivo com Quiescence Search; adora atacar o Rei.',
    chatLines: {
      start: 'Sem piedade no ataque hoje. Mostre sua defesa!',
      capture: 'Mais uma peça cai no tabuleiro!',
      check: 'Seu Rei está cercado!',
      blunder: 'Sacrifício ou golpe brilhante da sua parte!',
    },
  },
  5: {
    name: 'Aegis GM • Supremo',
    shortName: 'Aegis GM',
    elo: '~2250',
    depth: 6,
    randomness: 0.0,
    description: 'Busca profunda PVS + LMR + Transposition Table e livro estendido.',
    chatLines: {
      start: 'Modo Grande Mestre ativado. Cada casa conta.',
      capture: 'Vantagem material convertida.',
      check: 'Xeque calculado com precisão.',
      blunder: 'Lance cirúrgico! Impressionante.',
    },
  },
  6: {
    name: 'Omega Engine • Implacável',
    shortName: 'Omega',
    elo: '~2600+',
    depth: 8,
    randomness: 0.0,
    description: 'Modo Extremo para evolução máxima: Null-Move + LMR + PVS + Check Extensions + Segurança do Rei.',
    chatLines: {
      start: 'Motor Omega em força máxima. Qualquer erro será punido.',
      capture: 'Erro tático convertido em vantagem decisiva.',
      check: 'Pressão implacável sobre o Rei.',
      blunder: 'Precisão extraordinária. Você encontrou o melhor lance!',
    },
  },
};

export const TACTICAL_PUZZLES = [
  {
    id: 'mate_back_rank',
    title: 'Mate do Corredor',
    theme: 'Mate em 1',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    playerColor: 'w',
    hint: 'A 8ª fileira está totalmente desprotegida.',
    solution: ['Rd8#'],
  },
  {
    id: 'queen_mate_h7',
    title: 'Golpe na Casa h7',
    theme: 'Mate em 1',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    playerColor: 'w',
    hint: 'A Dama e o Bispo apontam juntos para f7!',
    solution: ['Qxf7#'],
  },
  {
    id: 'knight_royal_fork',
    title: 'Garfo Real de Cavalo',
    theme: 'Tática em 1 lance',
    fen: 'r2qk2r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 7',
    playerColor: 'w',
    hint: 'Sacrifique ou ataque f7 com o Bispo? Não, olhe o Cavalo ou Bispo atacando o ponto fraco!',
    solution: ['Bxd5'],
  },
  {
    id: 'mate_in_2_arabian',
    title: 'Ataque Mortal com Torre e Dama',
    theme: 'Mate em 2',
    fen: '6k1/5p1p/6p1/8/8/2Q5/5PPP/4R1K1 w - - 0 1',
    playerColor: 'w',
    hint: 'Dê um xeque decisivo invadindo a oitava fileira com a Torre ou Dama.',
    solution: ['Re8+'],
  },
  {
    id: 'smothered_setup',
    title: 'Mate na Diagonal Fatal',
    theme: 'Mate em 1',
    fen: 'r4rk1/ppp2ppp/8/8/2B5/1Q6/PPP2PPP/4R1K1 w - - 0 1',
    playerColor: 'w',
    hint: 'O ponto f7 está sob fogo cruzado da Dama e do Bispo.',
    solution: ['Bxf7+'],
  },
  {
    id: 'black_back_rank',
    title: 'Contra-Ataque das Pretas',
    theme: 'Mate em 1',
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
    playerColor: 'b',
    hint: 'As Brancas deixaram a primeira fileira sem escapatória.',
    solution: ['Re1#'],
  },
];

/**
 * Classifies human/player move tactical quality by comparing board eval before & after the move.
 */
export function classifyMoveQuality(prevEvalPawns, nextEvalPawns, moverColor, isMate = false, wasCapture = false) {
  if (isMate) {
    return { symbol: '!!', label: 'Xeque-Mate Brilhante!', cssClass: 'q-brilliant', delta: 0 };
  }
  const sign = moverColor === 'w' ? 1 : -1;
  const before = prevEvalPawns * sign;
  const after = nextEvalPawns * sign;
  const loss = before - after;

  if (loss <= -1.2 && wasCapture) {
    return { symbol: '!!', label: 'Lance Brilhante', cssClass: 'q-brilliant', delta: -loss };
  }
  if (loss <= 0.25) {
    return { symbol: '!', label: 'Excelente Lance', cssClass: 'q-best', delta: -loss };
  }
  if (loss <= 0.75) {
    return { symbol: '✓', label: 'Bom Lance', cssClass: 'q-good', delta: -loss };
  }
  if (loss <= 1.8) {
    return { symbol: '?!', label: 'Imprecisão', cssClass: 'q-inaccuracy', delta: -loss };
  }
  return { symbol: '??', label: 'Erro Grave', cssClass: 'q-blunder', delta: -loss };
}

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

// Expanded curated opening book (65+ theoretical lines) keyed by normalized FEN board + turn + castling
const OPENING_BOOK = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq': ['d7d5', 'g8f6', 'e7e6'],
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq': ['e7e5', 'g8f6', 'c7c5', 'e7e6'],
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq': ['d7d5', 'g8f6', 'c7c5'],

  // 1.e4 e5 complexes (Italian, Ruy Lopez, Scotch, Petroff)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['g1f3', 'f1c4', 'b1c3'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': ['b8c6', 'g8f6'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['f1b5', 'f1c4', 'd2d4'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq': ['f8c5', 'g8f6'],
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq': ['c2c3', 'd2d3', 'e1g1'],
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq': ['g8f6', 'd7d6'],
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq': ['d2d4', 'd2d3', 'e1g1'],
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq': ['d2d3', 'f3g5', 'b1c3'],
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq': ['a7a6', 'g8f6'],
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq': ['b5a4', 'b5c6'],
  'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq': ['g8f6', 'd7d6'],
  'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq': ['e1g1', 'd2d3'],
  'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq': ['f8e7', 'b7b5'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq': ['e5d4'],
  'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq': ['f3d4'],
  'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['f3e5', 'b1c3'],
  'rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq': ['d7d6'],

  // Sicilian Defense (Najdorf, Classical, Dragon, Alapin)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['g1f3', 'b1c3', 'c2c3'],
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': ['d7d6', 'b8c6', 'e7e6'],
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['d2d4', 'f1b5'],
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq': ['c5d4'],
  'rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq': ['f3d4'],
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq': ['g8f6'],
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq': ['b1c3'],
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq': ['a7a6', 'g7g6', 'e7e5'],
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': ['d2d4', 'f1b5'],

  // French & Caro-Kann & Scandinavian
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['d2d4', 'd2d3'],
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq': ['b1c3', 'b1d2', 'e4e5'],
  'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq': ['c7c5'],
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['d2d4', 'b1c3'],
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq': ['b1c3', 'e4e5', 'e4d5'],
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq': ['d5e4'],
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': ['e4d5'],

  // 1.d4 openings (Queen's Gambit, Slav, London, King's Indian, Nimzo-Indian)
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': ['c2c4', 'g1f3', 'c1f4'],
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq': ['e7e6', 'c7c6', 'd5c4'],
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': ['b1c3', 'g1f3'],
  'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': ['g1f3', 'b1c3', 'c4d5'],
  'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq': ['g8f6', 'c7c5', 'e7e6'],
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': ['c2c4', 'g1f3', 'c1f4'],
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq': ['e7e6', 'g7g6', 'c7c5'],
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': ['b1c3', 'g1f3'],
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq': ['f8g7', 'd7d5'],
  'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq': ['e2e4', 'g1f3'],
  'rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq': ['d7d6', 'e8g8'],
  'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq': ['g1f3', 'f1e2'],
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': ['b1c3', 'g1f3'],
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq': ['f8b4', 'd7d5'],
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
  const whiteRookFiles = new Array(8).fill(0);
  const blackRookFiles = new Array(8).fill(0);
  // Track closest enemy pawn row to check passed pawns in O(1) per pawn
  const whiteMaxRow = new Array(8).fill(-1);
  const blackMinRow = new Array(8).fill(8);
  const pawnGridW = new Array(64).fill(false);
  const pawnGridB = new Array(64).fill(false);
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
      } else if (sq.type === 'r') {
        if (sq.color === 'w') whiteRookFiles[c]++;
        else blackRookFiles[c]++;
      } else if (sq.type === 'p') {
        if (sq.color === 'w') {
          whitePawnFiles[c]++;
          pawnGridW[r * 8 + c] = true;
          if (r > whiteMaxRow[c]) whiteMaxRow[c] = r;
        } else {
          blackPawnFiles[c]++;
          pawnGridB[r * 8 + c] = true;
          if (r < blackMinRow[c]) blackMinRow[c] = r;
        }
      }
      piecesList.push({ r, c, type: sq.type, color: sq.color });
    }
  }

  const isEndgame = whiteMaterial < 1400 && blackMaterial < 1400;
  const PASSED_PAWN_BONUS = [0, 15, 28, 52, 95, 160, 255, 0];

  for (const p of piecesList) {
    const { r, c, type, color } = p;
    const baseVal = PIECE_VALUES[type] || 0;
    const tableKey = type === 'k' ? (isEndgame ? 'k_eg' : 'k_mg') : type;
    const table = PST[tableKey];
    const pstRow = color === 'w' ? r : 7 - r;
    const pstBonus = table ? table[pstRow][c] : 0;

    let positionalExtra = 0;

    // Passed pawn detection, advancement & protected passed pawn bonus
    if (type === 'p') {
      if (color === 'w') {
        let isPassed = true;
        for (let adj = Math.max(0, c - 1); adj <= Math.min(7, c + 1); adj++) {
          if (blackMinRow[adj] < r) {
            isPassed = false;
            break;
          }
        }
        if (isPassed) {
          positionalExtra += PASSED_PAWN_BONUS[7 - r] || 0;
          const hasSupport =
            (r < 7 && c > 0 && pawnGridW[(r + 1) * 8 + (c - 1)]) ||
            (r < 7 && c < 7 && pawnGridW[(r + 1) * 8 + (c + 1)]);
          if (hasSupport) positionalExtra += 24;
        }
      } else {
        let isPassed = true;
        for (let adj = Math.max(0, c - 1); adj <= Math.min(7, c + 1); adj++) {
          if (whiteMaxRow[adj] > r) {
            isPassed = false;
            break;
          }
        }
        if (isPassed) {
          positionalExtra += PASSED_PAWN_BONUS[r] || 0;
          const hasSupport =
            (r > 0 && c > 0 && pawnGridB[(r - 1) * 8 + (c - 1)]) ||
            (r > 0 && c < 7 && pawnGridB[(r - 1) * 8 + (c + 1)]);
          if (hasSupport) positionalExtra += 24;
        }
      }
      if ((c === 3 || c === 4) && (r === 3 || r === 4)) positionalExtra += 18;
    }

    // Minor piece development & Knight Outpost bonus
    if (type === 'n' || type === 'b') {
      if (!isEndgame) {
        const homeRow = color === 'w' ? 7 : 0;
        if (r !== homeRow) positionalExtra += 16;
      }
      if (type === 'n') {
        if (color === 'w' && r >= 2 && r <= 4) {
          const defendedByPawn =
            (c > 0 && pawnGridW[(r + 1) * 8 + (c - 1)]) || (c < 7 && pawnGridW[(r + 1) * 8 + (c + 1)]);
          const attackableByEnemyPawn =
            (c > 0 && blackMinRow[c - 1] < r) || (c < 7 && blackMinRow[c + 1] < r);
          if (defendedByPawn && !attackableByEnemyPawn) positionalExtra += 28;
        } else if (color === 'b' && r >= 3 && r <= 5) {
          const defendedByPawn =
            (c > 0 && pawnGridB[(r - 1) * 8 + (c - 1)]) || (c < 7 && pawnGridB[(r - 1) * 8 + (c + 1)]);
          const attackableByEnemyPawn =
            (c > 0 && whiteMaxRow[c - 1] > r) || (c < 7 && whiteMaxRow[c + 1] > r);
          if (defendedByPawn && !attackableByEnemyPawn) positionalExtra += 28;
        }
      }
    }

    // Open, semi-open, doubled Rooks & 7th rank bonus
    if (type === 'r') {
      const ownPawns = color === 'w' ? whitePawnFiles[c] : blackPawnFiles[c];
      const enemyPawns = color === 'w' ? blackPawnFiles[c] : whitePawnFiles[c];
      if (ownPawns === 0 && enemyPawns === 0) positionalExtra += 22;
      else if (ownPawns === 0) positionalExtra += 12;
      if ((color === 'w' && r === 1) || (color === 'b' && r === 6)) positionalExtra += 26;
    }

    // King tropism
    if (type !== 'p' && type !== 'k') {
      const targetKing = color === 'w' ? blackKing : whiteKing;
      const dist = Math.abs(r - targetKing.r) + Math.abs(c - targetKing.c);
      const weight = type === 'q' ? 2.6 : type === 'r' ? 2.0 : type === 'n' ? 1.8 : 1.4;
      positionalExtra += Math.round((14 - dist) * weight);
    }

    if (color === 'w') {
      score += baseVal + pstBonus + positionalExtra;
    } else {
      score -= baseVal + pstBonus + positionalExtra;
    }
  }

  // Bishop pair & Doubled Rooks bonuses
  if (whiteBishops >= 2) score += 38;
  if (blackBishops >= 2) score -= 38;
  for (let f = 0; f < 8; f++) {
    if (whiteRookFiles[f] >= 2) score += 18;
    if (blackRookFiles[f] >= 2) score -= 18;
  }

  // Middlegame King Pawn Shield & open files near castled King
  if (!isEndgame) {
    if (whiteKing.r >= 6 && (whiteKing.c >= 5 || whiteKing.c <= 2)) {
      for (let df = -1; df <= 1; df++) {
        const file = whiteKing.c + df;
        if (file < 0 || file > 7) continue;
        if (pawnGridW[6 * 8 + file]) score += 16;
        else if (pawnGridW[5 * 8 + file]) score += 8;
        else score -= 20;
      }
    }
    if (blackKing.r <= 1 && (blackKing.c >= 5 || blackKing.c <= 2)) {
      for (let df = -1; df <= 1; df++) {
        const file = blackKing.c + df;
        if (file < 0 || file > 7) continue;
        if (pawnGridB[1 * 8 + file]) score -= 16;
        else if (pawnGridB[2 * 8 + file]) score -= 8;
        else score += 20;
      }
    }
  }

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

  // Endgame / Winning Mop-Up Evaluation
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
    this.historyTable = new Map();
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

function scoreMoveForOrdering(move, ttBestKey, killersAtPly, historyTable = null) {
  const key = moveKey(move);
  if (ttBestKey && key === ttBestKey) return 2000000;
  let score = 0;
  if (move.captured) {
    const victim = PIECE_VALUES[move.captured] || 100;
    const attacker = PIECE_VALUES[move.piece] || 100;
    // MVV-LVA
    score += 1000000 + victim * 10 - attacker;
  }
  if (move.promotion) {
    score += 900000 + (PIECE_VALUES[move.promotion] || 0);
  }
  if (killersAtPly && killersAtPly.includes(key)) {
    score += 500000;
  }
  if (move.san && move.san.includes('+')) {
    score += 45000;
  }
  if (historyTable) {
    score += Math.min(40000, historyTable.get(`${move.color}${move.from}${move.to}`) || 0);
  }
  return score;
}

function orderMoves(moves, ttBestKey, killersAtPly, historyTable = null) {
  return moves
    .map((m) => ({ move: m, score: scoreMoveForOrdering(m, ttBestKey, killersAtPly, historyTable) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.move);
}

function hasNonPawnMaterial(chess, turn) {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell && cell.color === turn && cell.type !== 'k' && cell.type !== 'p') {
        return true;
      }
    }
  }
  return false;
}

function makeNullMoveFen(fen) {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  return parts.join(' ');
}

function quiescence(chess, alpha, beta, colorSign, ctx, qDepth = 0) {
  ctx.nodes++;
  if (ctx.checkTime()) return 0;

  const standPat = colorSign * evaluatePositionWhite(chess);
  if (standPat >= beta) return beta;
  // Delta pruning safety margin (Queen + margin)
  if (standPat + 1050 < alpha && qDepth >= 1) return alpha;
  if (alpha < standPat) alpha = standPat;

  if (qDepth >= 6) return alpha;

  const captures = chess
    .moves({ verbose: true })
    .filter((m) => m.captured || m.promotion);

  const ordered = orderMoves(captures, null, null, null);
  for (const move of ordered) {
    const captureVal = (PIECE_VALUES[move.captured] || 0) + (move.promotion ? 800 : 0);
    if (standPat + captureVal + 200 < alpha && !move.san?.includes('+')) continue;

    chess.move(move);
    const score = -quiescence(chess, -beta, -alpha, -colorSign, ctx, qDepth + 1);
    chess.undo();

    if (ctx.aborted) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(chess, depth, ply, alpha, beta, colorSign, ctx, useQuiescence, extLeft = 2) {
  ctx.nodes++;
  if (ctx.checkTime()) return 0;

  const posKey = normalizeFenKey(chess.fen());
  const pathSeen = (ctx.pathCounts.get(posKey) || 0) + 1;
  const gameSeen = ctx.historyCounts.get(posKey) || 0;

  // Draw-by-repetition detection with mild contempt
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
  const ttEntry = ctx.tt.get(posKey);
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

  const inCheck = isGameCheck(chess);

  // Null-Move Pruning (skip in check or pawn/king endgames)
  if (useQuiescence && depth >= 3 && ply >= 1 && !inCheck && hasNonPawnMaterial(chess, chess.turn())) {
    const R = depth >= 6 ? 3 : 2;
    try {
      const nullChess = new Chess(makeNullMoveFen(chess.fen()));
      ctx.pathCounts.set(posKey, pathSeen);
      const nullScore = -negamax(
        nullChess,
        depth - 1 - R,
        ply + 1,
        -beta,
        -beta + 1,
        -colorSign,
        ctx,
        useQuiescence,
        0
      );
      ctx.pathCounts.set(posKey, pathSeen - 1);
      if (ctx.aborted) return 0;
      if (nullScore >= beta) {
        return beta;
      }
    } catch {
      ctx.pathCounts.set(posKey, pathSeen - 1);
    }
  }

  ctx.pathCounts.set(posKey, pathSeen);

  const moves = chess.moves({ verbose: true });
  const killersAtPly = ctx.killers.get(ply) || [];
  const ordered = orderMoves(moves, ttEntry?.bestMove, killersAtPly, ctx.historyTable);

  let bestValue = -Infinity;
  let bestMove = null;

  for (let i = 0; i < ordered.length; i++) {
    const move = ordered[i];
    const isQuiet = !move.captured && !move.promotion;
    const givesCheck = move.san?.includes('+') || move.san?.includes('#');
    const ext = givesCheck && extLeft > 0 ? 1 : 0;

    chess.move(move);

    let score;
    // Principal Variation Search (PVS) + Late Move Reductions (LMR)
    if (i === 0) {
      score = -negamax(
        chess,
        depth - 1 + ext,
        ply + 1,
        -beta,
        -alpha,
        -colorSign,
        ctx,
        useQuiescence,
        extLeft - ext
      );
    } else {
      let reduction = 0;
      if (useQuiescence && depth >= 3 && i >= 4 && isQuiet && !inCheck && !givesCheck) {
        reduction = i >= 9 && depth >= 5 ? 2 : 1;
      }
      score = -negamax(
        chess,
        Math.max(0, depth - 1 - reduction + ext),
        ply + 1,
        -alpha - 1,
        -alpha,
        -colorSign,
        ctx,
        useQuiescence,
        extLeft - ext
      );
      if (!ctx.aborted && score > alpha && reduction > 0) {
        score = -negamax(
          chess,
          depth - 1 + ext,
          ply + 1,
          -alpha - 1,
          -alpha,
          -colorSign,
          ctx,
          useQuiescence,
          extLeft - ext
        );
      }
      if (!ctx.aborted && score > alpha && score < beta) {
        score = -negamax(
          chess,
          depth - 1 + ext,
          ply + 1,
          -beta,
          -alpha,
          -colorSign,
          ctx,
          useQuiescence,
          extLeft - ext
        );
      }
    }

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
      if (isQuiet) {
        const key = moveKey(move);
        const list = ctx.killers.get(ply) || [];
        if (!list.includes(key)) {
          ctx.killers.set(ply, [key, list[0]].filter(Boolean));
        }
        const hKey = `${move.color}${move.from}${move.to}`;
        ctx.historyTable.set(hKey, (ctx.historyTable.get(hKey) || 0) + depth * depth);
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
    if (ctx.tt.size < 120000) {
      ctx.tt.set(posKey, { depth, value: bestValue, flag, bestMove: moveKey(bestMove) });
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

  const repeatCount = historyCounts.get(nextKey) || 0;
  if (repeatCount >= 2) {
    penalty += 110;
  } else if (repeatCount === 1) {
    penalty += 45;
  }

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

export function searchBestMoveSync(fen, level = 3, historyContext = {}) {
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

  const timeLimitMs = level >= 6 ? 2600 : level === 5 ? 1400 : level === 4 ? 750 : 450;
  const useQuiescence = level >= 4;
  const ctx = new SearchContext(timeLimitMs, historyCounts);

  const rootPenalties = new Map();
  for (const m of moves) {
    rootPenalties.set(moveKey(m), computeRootAntiRepetitionPenalty(chess, m, historyCounts, recentMoves));
  }

  let bestOverallMove = moves[0];
  let scoredCandidates = [];
  const posKey = normalizeFenKey(fen);

  const maxDepth = cfg.depth;

  for (let d = 1; d <= maxDepth; d++) {
    ctx.allowTimeout = d >= 2;
    const currentCandidates = [];
    const ttEntry = ctx.tt.get(posKey);
    const ordered = orderMoves(moves, ttEntry?.bestMove, null, ctx.historyTable);

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
      ctx.tt.set(posKey, { depth: d, value: bestIterScore, flag: 'EXACT', bestMove: moveKey(bestInIter) });
    }
    if (bestIterScore > 90000) break;
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
 * Lightweight Coach analysis helper for pointing out best reply/refutation in training.
 */
export function analyzePositionBestMove(fen, depth = 3) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const bKey = bookKeyFromFen(fen);
  const bookChoices = OPENING_BOOK[bKey];
  if (bookChoices && bookChoices.length > 0) {
    const found = moves.find((m) => moveKey(m) === bookChoices[0]);
    if (found) {
      return { san: found.san, from: found.from, to: found.to, promotion: found.promotion };
    }
  }

  const colorSign = chess.turn() === 'w' ? 1 : -1;
  const ctx = new SearchContext(280);
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (let d = 1; d <= depth; d++) {
    ctx.allowTimeout = d >= 2;
    const ordered = orderMoves(moves, ctx.tt.get(normalizeFenKey(fen))?.bestMove, null, ctx.historyTable);
    let alpha = -Infinity;
    let iterBest = ordered[0];
    let iterScore = -Infinity;
    for (const move of ordered) {
      chess.move(move);
      const val = -negamax(chess, d - 1, 1, -Infinity, -alpha, -colorSign, ctx, true);
      chess.undo();
      if (ctx.aborted) break;
      if (val > iterScore) {
        iterScore = val;
        iterBest = move;
      }
      if (val > alpha) alpha = val;
    }
    if (ctx.aborted) break;
    bestMove = iterBest;
    bestScore = iterScore;
  }

  return bestMove
    ? { san: bestMove.san, from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion, scoreCp: bestScore }
    : null;
}

let _botWorker = null;
let _workerRequestId = 0;
const _pendingWorkerRequests = new Map();

function _getBotWorker() {
  if (typeof Worker === 'undefined') return null;
  if (_botWorker) return _botWorker;
  try {
    const worker = new Worker(new URL('./botWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const { id, move, error } = event.data || {};
      const entry = _pendingWorkerRequests.get(id);
      if (!entry) return;
      _pendingWorkerRequests.delete(id);
      if (error) entry.reject(new Error(error));
      else entry.resolve(move ?? null);
    };
    worker.onerror = () => {
      for (const [id, entry] of _pendingWorkerRequests.entries()) {
        _pendingWorkerRequests.delete(id);
        entry.reject(new Error('Bot worker crashed'));
      }
      try {
        worker.terminate();
      } catch {
        // Ignore terminate errors
      }
      _botWorker = null;
    };
    _botWorker = worker;
    return _botWorker;
  } catch {
    return null;
  }
}

function _runWorkerSearch(fen, level, historyContext) {
  const worker = _getBotWorker();
  if (!worker) return null;
  return new Promise((resolve, reject) => {
    const id = ++_workerRequestId;
    _pendingWorkerRequests.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, fen, level, historyContext });
    } catch (err) {
      _pendingWorkerRequests.delete(id);
      reject(err);
    }
  });
}

/**
 * Async wrapper with a consistent minimum think duration so bots at every
 * difficulty level (including Grandmaster) play at a readable, steady pace.
 * Uses a dedicated Web Worker in browser environments to keep 3D animations at 60+ FPS.
 */
export function getBestMove(fen, level = 3, minThinkTimeMs = 1200, historyContext = {}) {
  return new Promise((resolve) => {
    const startTick = performance.now();
    const initialYield = minThinkTimeMs >= 900 ? 480 : 40;

    const finishWithCadence = (move) => {
      const elapsed = performance.now() - startTick;
      const remaining = Math.max(0, minThinkTimeMs - elapsed);
      if (remaining > 0) {
        setTimeout(() => resolve(move), remaining);
      } else {
        resolve(move);
      }
    };

    setTimeout(async () => {
      try {
        const workerPromise = _runWorkerSearch(fen, level, historyContext);
        if (workerPromise) {
          const move = await workerPromise;
          finishWithCadence(move);
          return;
        }
      } catch {
        // Fall through to synchronous fallback
      }
      const move = searchBestMoveSync(fen, level, historyContext);
      finishWithCadence(move);
    }, initialYield);
  });
}
