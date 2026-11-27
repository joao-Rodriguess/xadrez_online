const PLAYER_STATS_STORAGE_KEY = 'chess3d_player_stats_v1';

export const ACHIEVEMENTS = [
  {
    id: 'first_win',
    title: 'Primeira Vitória',
    desc: 'Vencer sua primeira partida no Chess 3D Royale.',
    badge: 'I',
  },
  {
    id: 'streak_3',
    title: 'Em Chamas',
    desc: 'Conquistar 3 vitórias consecutivas.',
    badge: '3×',
  },
  {
    id: 'sharp_90',
    title: 'Precisão Cirúrgica',
    desc: 'Concluir uma partida com precisão estimada ≥ 90%.',
    badge: '90%',
  },
  {
    id: 'master_slayer',
    title: 'Caçador de Mestres',
    desc: 'Derrotar o Bot Nível 4 (Mikhail) ou superior.',
    badge: 'M4+',
  },
  {
    id: 'omega_challenger',
    title: 'Coragem Omega',
    desc: 'Enfrentar ou vencer o temido Nível 6 Omega Engine.',
    badge: 'Ω',
  },
  {
    id: 'quick_mate',
    title: 'Mate Relâmpago',
    desc: 'Vencer uma partida em até 15 lances (≤ 30 meios-lances).',
    badge: '⚡',
  },
  {
    id: 'academy_10',
    title: 'Estudante Dedicado',
    desc: 'Concluir pelo menos 10 lições na Academia de Xadrez.',
    badge: '10',
  },
  {
    id: 'academy_all',
    title: 'Mestre da Academia',
    desc: 'Completar todas as 46 lições da Academia.',
    badge: '46',
  },
  {
    id: 'tactician_5',
    title: 'Tático Afiado',
    desc: 'Resolver 5 Desafios Táticos no tabuleiro 3D.',
    badge: 'T5',
  },
  {
    id: 'online_duelist',
    title: 'Duelista Online',
    desc: 'Completar uma partida multiplayer online.',
    badge: '★',
  },
];

export function getRankFromElo(elo = 1000) {
  if (elo < 900) return 'Aprendiz';
  if (elo < 1150) return 'Amador';
  if (elo < 1400) return 'Jogador de Clube';
  if (elo < 1700) return 'Candidato a Mestre';
  if (elo < 2000) return 'Mestre';
  if (elo < 2300) return 'Grande Mestre';
  return 'Lenda Omega';
}

function createDefaultStats() {
  return {
    elo: 1000,
    peakElo: 1000,
    eloHistory: [1000],
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    puzzlesSolved: 0,
    avgAccuracySum: 0,
    avgAccuracyCount: 0,
    unlockedAchievements: [],
    matchHistory: [],
  };
}

export function loadPlayerStats() {
  try {
    const raw = localStorage.getItem(PLAYER_STATS_STORAGE_KEY);
    if (!raw) return createDefaultStats();
    const parsed = JSON.parse(raw);
    const def = createDefaultStats();
    return {
      ...def,
      ...parsed,
      eloHistory: Array.isArray(parsed.eloHistory) && parsed.eloHistory.length > 0 ? parsed.eloHistory : [1000],
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
      matchHistory: Array.isArray(parsed.matchHistory) ? parsed.matchHistory : [],
    };
  } catch {
    return createDefaultStats();
  }
}

export function savePlayerStats(stats) {
  try {
    localStorage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage quota errors
  }
  return stats;
}

export function resetPlayerStats() {
  const fresh = createDefaultStats();
  savePlayerStats(fresh);
  return fresh;
}

function unlockAchievement(stats, id, newlyUnlocked) {
  if (!stats.unlockedAchievements.includes(id)) {
    stats.unlockedAchievements.push(id);
    const meta = ACHIEVEMENTS.find((a) => a.id === id);
    if (meta) newlyUnlocked.push(meta);
  }
}

function evaluateGeneralAchievements(stats, newlyUnlocked, { academyDoneCount = 0 } = {}) {
  if (stats.wins >= 1) unlockAchievement(stats, 'first_win', newlyUnlocked);
  if (stats.bestStreak >= 3) unlockAchievement(stats, 'streak_3', newlyUnlocked);
  if (stats.puzzlesSolved >= 5) unlockAchievement(stats, 'tactician_5', newlyUnlocked);
  if (academyDoneCount >= 10) unlockAchievement(stats, 'academy_10', newlyUnlocked);
  if (academyDoneCount >= 46) unlockAchievement(stats, 'academy_all', newlyUnlocked);
}

export function recordCompletedMatch({
  mode,
  opponent = 'Oponente',
  opponentElo = 1200,
  playerColor = 'w',
  result,
  reason = '',
  opening = '',
  accuracy = null,
  moves = [],
  fenFinal = '',
  botLevel = 0,
  academyDoneCount = 0,
}) {
  const stats = loadPlayerStats();
  const newlyUnlocked = [];

  stats.gamesPlayed += 1;
  if (result === 'win') {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else if (result === 'loss') {
    stats.losses += 1;
    stats.currentStreak = 0;
  } else {
    stats.draws += 1;
  }

  let eloDelta = 0;
  if (mode === 'bot' || mode === 'online') {
    const oppElo = Number(opponentElo) || 1200;
    const expected = 1 / (1 + Math.pow(10, (oppElo - stats.elo) / 400));
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const kFactor = stats.gamesPlayed <= 15 ? 32 : 20;
    eloDelta = Math.round(kFactor * (score - expected));
    stats.elo = Math.max(400, stats.elo + eloDelta);
    stats.peakElo = Math.max(stats.peakElo, stats.elo);
    stats.eloHistory.push(stats.elo);
    if (stats.eloHistory.length > 40) {
      stats.eloHistory = stats.eloHistory.slice(-40);
    }
  }

  if (typeof accuracy === 'number' && Number.isFinite(accuracy)) {
    stats.avgAccuracySum += accuracy;
    stats.avgAccuracyCount += 1;
    if (accuracy >= 90) {
      unlockAchievement(stats, 'sharp_90', newlyUnlocked);
    }
  }

  if (mode === 'bot') {
    if (result === 'win' && botLevel >= 4) unlockAchievement(stats, 'master_slayer', newlyUnlocked);
    if (botLevel >= 6) unlockAchievement(stats, 'omega_challenger', newlyUnlocked);
  }
  if (mode === 'online') {
    unlockAchievement(stats, 'online_duelist', newlyUnlocked);
  }
  if (result === 'win' && Array.isArray(moves) && moves.length > 0 && moves.length <= 30) {
    unlockAchievement(stats, 'quick_mate', newlyUnlocked);
  }

  evaluateGeneralAchievements(stats, newlyUnlocked, { academyDoneCount });

  stats.matchHistory.unshift({
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: Date.now(),
    mode,
    opponent: String(opponent || 'Oponente').slice(0, 32),
    opponentElo: Number(opponentElo) || 1200,
    playerColor,
    result,
    eloDelta,
    reason,
    opening: opening || 'Posição Inicial',
    accuracy,
    movesCount: Array.isArray(moves) ? moves.length : 0,
    moves: Array.isArray(moves) ? moves.slice(0, 220) : [],
    fenFinal,
  });
  if (stats.matchHistory.length > 25) {
    stats.matchHistory = stats.matchHistory.slice(0, 25);
  }

  savePlayerStats(stats);
  return { stats, eloDelta, newlyUnlocked };
}

export function recordPuzzleSolved() {
  const stats = loadPlayerStats();
  const newlyUnlocked = [];
  stats.puzzlesSolved += 1;
  evaluateGeneralAchievements(stats, newlyUnlocked);
  savePlayerStats(stats);
  return { stats, newlyUnlocked };
}

export function syncAcademyAchievements(doneCount) {
  const stats = loadPlayerStats();
  const newlyUnlocked = [];
  evaluateGeneralAchievements(stats, newlyUnlocked, { academyDoneCount: doneCount });
  savePlayerStats(stats);
  return { stats, newlyUnlocked };
}
