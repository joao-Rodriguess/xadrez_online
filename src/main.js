import { Chess } from 'chess.js';
import { Scene3D, BOARD_THEMES, LIGHTING_MODES } from './scene3D.js';
import {
  PIECE_TYPES,
  GEOMETRY_STYLES,
  MATERIAL_PRESETS,
  PiecePreviewStudio,
  createDefaultCustomization,
  createDefaultPieceConfig,
  createHeroSetCustomization,
  getHeroStyleBadgeText,
} from './pieceBuilder3D.js';

const QUICK_PIECE_SETS = [
  { id: 'staunton', label: 'Peças: Clássico Staunton' },
  { id: 'marvel_heroes', label: 'Peças: Marvel (Vingadores)' },
  { id: 'dc_heroes', label: 'Peças: DC (Liga da Justiça)' },
  { id: 'marvel_vs_dc', label: 'Peças: Marvel vs DC' },
  { id: 'futuristic', label: 'Peças: Futurista' },
  { id: 'medieval', label: 'Peças: Medieval' },
  { id: 'minimalist', label: 'Peças: Minimalista' },
  { id: 'custom', label: 'Peças: Personalizado', disabled: true },
];
import {
  BOT_LEVELS,
  TACTICAL_PUZZLES,
  classifyMoveQuality,
  getBestMove,
  analyzePositionBestMove,
  evaluateBoardScore,
  isGameCheck,
  isGameCheckmate,
  isGameDraw,
  isGameOver,
} from './botAI.js';
import {
  LEARNING_TRACKS,
  LEARNING_LESSONS,
  CHESS_ENCYCLOPEDIA,
  detectOpeningFromHistory,
} from './learningBase.js';
import { MultiplayerManager } from './firebaseMultiplayer.js';
import { audioFX, MUSIC_TRACKS } from './audioFX.js';

const CUSTOMIZATION_STORAGE_KEY = 'chess3d_piece_customization_v1';
const MATCH_SNAPSHOTS_KEY = 'chess3d_match_snapshots_v1';
const BOARD_THEME_STORAGE_KEY = 'chess3d_board_theme_v1';
const LIGHTING_MODE_STORAGE_KEY = 'chess3d_lighting_mode_v1';
const MUSIC_TRACK_STORAGE_KEY = 'chess3d_music_track_v1';
const MUSIC_VOLUME_STORAGE_KEY = 'chess3d_music_volume_v1';
const MOVE_LIGHT_GUIDES_STORAGE_KEY = 'chess3d_move_light_guides_v1';
const ACADEMY_PROGRESS_KEY = 'chess3d_academy_done_v1';
const PLAYER_NAME_STORAGE_KEY = 'chess3d_player_name_v1';
const COACH_MODE_STORAGE_KEY = 'chess3d_coach_mode_v1';
const PIECE_UNICODE = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

class ChessRoyaleApp {
  constructor() {
    this.chess = new Chess();
    this.multiplayer = new MultiplayerManager();

    this.gameMode = 'bot'; // 'bot' | 'local' | 'bot_vs_bot' | 'online' | 'puzzle' | 'academy'
    this.variant = 'standard'; // 'standard' | 'koth' | 'three_check'
    this.checksCount = { w: 0, b: 0 };
    this.showThreatMap = false;
    this.puzzleIndex = 0;
    this.currentPuzzle = null;
    this.academyCompleted = this._loadAcademyProgress();
    this.academyTrackId = 'fundamentals';
    this.currentLesson = null;
    this.academyStepIndex = 0;
    this.coachMode = this._loadSavedCoachMode();
    this.lastCoachMistake = null;
    this.humanMoveQualities = [];
    this.socialData = { friends: [], friendRequests: [], incomingChallenges: [], acceptedChallenges: [] };
    this.activeIncomingChallenge = null;
    this._handledAcceptedChallenges = new Set();
    this.evalHistory = [0.1];
    this.lastClockAlertSec = { w: -1, b: -1 };
    this.botLevel = 3;
    this.humanColor = 'w';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.hintMove = null;
    this.isBotThinking = false;
    this.pendingPromo = null;

    this.timeControl = { initialSeconds: 600, incrementSeconds: 0 };
    this.clocks = { w: 600000, b: 600000 };
    this.clockInterval = null;
    this.lastClockTick = Date.now();
    this.gameEnded = false;
    this.isInMenu = true;
    this.isOrientationBlocked = false;
    this.isHudCollapsed = false;
    this.hasActiveMatch = false;
    this.moveSnapshots = [];
    this.historyPreviewPly = null;
    this._lastOpponentStatusKey = null;
    this._serverClockOffsetMs = 0;
    this.lightingMode = this._loadSavedLightingMode();
    this.musicTrack = this._loadSavedMusicTrack();
    this.musicVolume = this._loadSavedMusicVolume();
    this.moveLightGuides = this._loadSavedLightGuides();
    this.lastGameConfig = {
      mode: 'bot',
      variant: 'standard',
      botLevel: 3,
      humanColor: 'w',
      timeControl: { initialSeconds: 600, incrementSeconds: 0 },
    };

    this.customization = this._loadCustomization();
    this.studioTarget = 'all'; // 'all' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p'
    this.studioPreviewSide = 'w';

    this._resetSnapshots();
    this._initScene();
    this._initUI();
    this._applyLightingMode(this.lightingMode, false);
    this._applyMusicVolume(this.musicVolume, false);
    this._applyMusicTrack(this.musicTrack, false);
    this._applyMoveLightGuides(this.moveLightGuides, false);
    this._startClockLoop();
    this._renderAll();
    this._showMainMenu();
    this.multiplayer.checkCloudStatus().then(() => {
      this._updateConnectionBadge();
      this.multiplayer.startSocialSync(
        () => this._getSocialPresenceState(),
        (data) => this._onSocialUpdate(data)
      );
    });
    this._checkUrlInvite();
  }

  _loadAcademyProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(ACADEMY_PROGRESS_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch {
      return new Set();
    }
  }

  _saveAcademyProgress() {
    try {
      localStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify([...this.academyCompleted]));
    } catch {
      // ignore storage errors
    }
  }

  _loadSavedCoachMode() {
    try {
      const saved = localStorage.getItem(COACH_MODE_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  }

  _loadSavedMusicTrack() {
    try {
      const saved = localStorage.getItem(MUSIC_TRACK_STORAGE_KEY);
      if (saved && MUSIC_TRACKS[saved]) return saved;
    } catch {
      // ignore storage errors
    }
    return 'grandmaster_nocturne';
  }

  _loadSavedMusicVolume() {
    try {
      const saved = Number(localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY));
      if (Number.isFinite(saved) && saved >= 0 && saved <= 1) return saved;
    } catch {
      // ignore storage errors
    }
    return 0.45;
  }

  _loadSavedLightGuides() {
    try {
      const saved = localStorage.getItem(MOVE_LIGHT_GUIDES_STORAGE_KEY);
      if (saved === 'false') return false;
    } catch {
      // ignore storage errors
    }
    return true;
  }

  _loadSavedBoardTheme() {
    try {
      const saved = localStorage.getItem(BOARD_THEME_STORAGE_KEY);
      if (saved && BOARD_THEMES[saved]) return saved;
    } catch {
      // ignore storage errors
    }
    return 'dark_obsidian';
  }

  _loadSavedLightingMode() {
    try {
      const saved = localStorage.getItem(LIGHTING_MODE_STORAGE_KEY);
      if (saved && LIGHTING_MODES[saved]) return saved;
    } catch {
      // ignore storage errors
    }
    return 'dim';
  }

  _loadCustomization() {
    try {
      const saved = localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.pieces) return parsed;
      }
    } catch {
      // ignore corrupted storage
    }
    return createDefaultCustomization();
  }

  _saveCustomization() {
    localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(this.customization));
  }

  _initScene() {
    const container = document.getElementById('canvas-container');
    this.scene3d = new Scene3D(container, {
      onSquareClick: (sq) => this.handleSquareClick(sq),
      canDragSquare: (sq) => this.canPlayerDragSquare(sq),
      onPieceSelect: (sq) => this.selectPieceAtSquare(sq),
      onPieceDrop: (fromSq, toSq) => this.handlePieceDrop(fromSq, toSq),
    });
    const savedTheme = this._loadSavedBoardTheme();
    if (savedTheme !== this.scene3d.themeId) {
      this.scene3d.setBoardTheme(savedTheme);
    }
    this.scene3d.syncBoard(this.chess.board(), this.customization);

    const studioCanvas = document.getElementById('studio-preview-canvas');
    this.previewStudio = new PiecePreviewStudio(studioCanvas);
  }

  _applyLightingMode(modeId, save = true) {
    const cfg = LIGHTING_MODES[modeId] || LIGHTING_MODES.dim;
    this.lightingMode = cfg.id;
    if (save) {
      try {
        localStorage.setItem(LIGHTING_MODE_STORAGE_KEY, cfg.id);
      } catch {
        // ignore storage errors
      }
    }
    this.scene3d?.setLightingMode(cfg.id);

    document.body.classList.remove('theme-dark-nolight', 'theme-dim', 'theme-lit');
    if (cfg.id === 'dark') document.body.classList.add('theme-dark-nolight');
    else if (cfg.id === 'lit') document.body.classList.add('theme-lit');
    else document.body.classList.add('theme-dim');

    const lightingSelectors = [
      document.getElementById('lighting-mode-select'),
      document.getElementById('menu-lighting-select'),
      document.getElementById('settings-lighting-select'),
    ].filter(Boolean);
    lightingSelectors.forEach((sel) => {
      sel.value = cfg.id;
    });

    const toggleBtn = document.getElementById('btn-lighting-toggle');
    if (toggleBtn) {
      if (cfg.id === 'dark') toggleBtn.textContent = '○ Sem Luz';
      else if (cfg.id === 'lit') toggleBtn.textContent = '☀ Com Luz';
      else toggleBtn.textContent = '◐ Luz: Penumbra';
    }
  }

  _applyMusicTrack(trackId, save = true) {
    const cfg = MUSIC_TRACKS[trackId] || MUSIC_TRACKS.off;
    this.musicTrack = cfg.id;
    if (save) {
      try {
        localStorage.setItem(MUSIC_TRACK_STORAGE_KEY, cfg.id);
      } catch {
        // ignore storage errors
      }
    }
    audioFX.setMusicTrack(cfg.id);

    const musicSelectors = [
      document.getElementById('music-track-select'),
      document.getElementById('menu-music-select'),
      document.getElementById('settings-music-select'),
    ].filter(Boolean);
    musicSelectors.forEach((sel) => {
      sel.value = cfg.id;
    });

    const toggleBtn = document.getElementById('btn-music-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = cfg.id === 'off' ? '♪ Música: Off' : `♪ ${cfg.shortLabel}`;
    }
  }

  _applyMusicVolume(vol, save = true) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    this.musicVolume = Number.isFinite(clamped) ? clamped : 0.45;
    if (save) {
      try {
        localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(this.musicVolume));
      } catch {
        // ignore storage errors
      }
    }
    audioFX.setMusicVolume(this.musicVolume);

    const pct = Math.round(this.musicVolume * 100);
    const slider = document.getElementById('settings-music-volume');
    if (slider) slider.value = String(pct);
    const lbl = document.getElementById('val-music-volume');
    if (lbl) lbl.textContent = `${pct}%`;
  }

  _applyMoveLightGuides(enabled, save = true) {
    this.moveLightGuides = Boolean(enabled);
    if (save) {
      try {
        localStorage.setItem(MOVE_LIGHT_GUIDES_STORAGE_KEY, String(this.moveLightGuides));
      } catch {
        // ignore storage errors
      }
    }
    this.scene3d?.setMoveLightGuides(this.moveLightGuides);

    const checkboxes = [
      document.getElementById('chk-light-guides'),
      document.getElementById('chk-menu-light-guides'),
      document.getElementById('chk-settings-light-guides'),
    ].filter(Boolean);
    checkboxes.forEach((chk) => {
      chk.checked = this.moveLightGuides;
    });
  }

  _initUI() {
    // Board themes dropdowns (HUD, Main Menu, Settings Modal)
    const themeSelectors = [
      document.getElementById('board-theme-select'),
      document.getElementById('menu-board-theme-select'),
      document.getElementById('settings-board-theme-select'),
    ].filter(Boolean);

    themeSelectors.forEach((sel) => {
      Object.values(BOARD_THEMES).forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.label;
        sel.appendChild(opt);
      });
      sel.value = this.scene3d.themeId;
      sel.addEventListener('change', (e) => {
        const val = e.target.value;
        this.scene3d.setBoardTheme(val);
        try {
          localStorage.setItem(BOARD_THEME_STORAGE_KEY, val);
        } catch {
          // ignore storage errors
        }
        themeSelectors.forEach((other) => {
          other.value = val;
        });
      });
    });

    // Lighting mode selectors (HUD, Main Menu, Settings Modal) & quick topbar cycle button
    const lightingSelectors = [
      document.getElementById('lighting-mode-select'),
      document.getElementById('menu-lighting-select'),
      document.getElementById('settings-lighting-select'),
    ].filter(Boolean);

    lightingSelectors.forEach((sel) => {
      Object.values(LIGHTING_MODES).forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        sel.appendChild(opt);
      });
      sel.value = this.lightingMode;
      sel.addEventListener('change', (e) => {
        this._applyLightingMode(e.target.value, true);
      });
    });

    const lightingToggleBtn = document.getElementById('btn-lighting-toggle');
    if (lightingToggleBtn) {
      lightingToggleBtn.addEventListener('click', () => {
        const order = ['dark', 'dim', 'lit'];
        const next = order[(order.indexOf(this.lightingMode) + 1) % order.length];
        this._applyLightingMode(next, true);
        const cfg = LIGHTING_MODES[next];
        this._toast(`Iluminação: ${cfg.label}`);
      });
    }

    // Background Music Track selectors, volume slider & quick topbar cycle button
    const musicSelectors = [
      document.getElementById('music-track-select'),
      document.getElementById('menu-music-select'),
      document.getElementById('settings-music-select'),
    ].filter(Boolean);

    musicSelectors.forEach((sel) => {
      Object.values(MUSIC_TRACKS).forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.label;
        sel.appendChild(opt);
      });
      sel.value = this.musicTrack;
      sel.addEventListener('change', (e) => {
        this._applyMusicTrack(e.target.value, true);
        const cfg = MUSIC_TRACKS[this.musicTrack];
        this._toast(cfg ? cfg.label : 'Música atualizada');
      });
    });

    const musicToggleBtn = document.getElementById('btn-music-toggle');
    if (musicToggleBtn) {
      musicToggleBtn.addEventListener('click', () => {
        const keys = Object.keys(MUSIC_TRACKS);
        const next = keys[(keys.indexOf(this.musicTrack) + 1) % keys.length];
        this._applyMusicTrack(next, true);
        const cfg = MUSIC_TRACKS[next];
        this._toast(cfg.id === 'off' ? 'Música de fundo desligada.' : `Tocando: ${cfg.label}`);
      });
    }

    const musicVolSlider = document.getElementById('settings-music-volume');
    if (musicVolSlider) {
      musicVolSlider.addEventListener('input', (e) => {
        this._applyMusicVolume(Number(e.target.value) / 100, true);
      });
    }

    // Optional light-guide animations for legal destination squares
    const lightGuideCheckboxes = [
      document.getElementById('chk-light-guides'),
      document.getElementById('chk-menu-light-guides'),
      document.getElementById('chk-settings-light-guides'),
    ].filter(Boolean);

    lightGuideCheckboxes.forEach((chk) => {
      chk.checked = this.moveLightGuides;
      chk.addEventListener('change', (e) => {
        this._applyMoveLightGuides(e.target.checked, true);
        this._toast(
          e.target.checked
            ? 'Animações de luz nos destinos ativadas.'
            : 'Animações de luz desativadas (marcadores discretos).'
        );
      });
    });

    // Quick piece set selectors (HUD, Main Menu, Settings Modal)
    const pieceSetSelectors = [
      document.getElementById('piece-set-select'),
      document.getElementById('menu-piece-set-select'),
      document.getElementById('settings-piece-set-select'),
    ].filter(Boolean);

    pieceSetSelectors.forEach((sel) => {
      QUICK_PIECE_SETS.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.label;
        if (s.disabled) opt.disabled = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', (e) => {
        this._applyQuickPieceSet(e.target.value, true);
      });
    });
    this._syncPieceSetSelectors();

    // Camera presets
    document.querySelectorAll('.cam-btn[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.scene3d.setCameraView(btn.dataset.cam);
      });
    });

    // Sound toggle & Settings sync
    const soundBtn = document.getElementById('btn-sound-toggle');
    const soundChk = document.getElementById('chk-settings-sound');
    const applySoundState = (enabled) => {
      audioFX.setEnabled(enabled);
      soundBtn.textContent = enabled ? 'Som' : 'Mudo';
      if (soundChk) soundChk.checked = enabled;
    };
    soundBtn.addEventListener('click', () => applySoundState(!audioFX.isEnabled()));
    if (soundChk) soundChk.addEventListener('change', (e) => applySoundState(e.target.checked));

    // Auto-flip camera sync
    const flipHud = document.getElementById('chk-auto-flip');
    const flipSettings = document.getElementById('chk-settings-auto-flip');
    if (flipHud && flipSettings) {
      flipHud.addEventListener('change', (e) => { flipSettings.checked = e.target.checked; });
      flipSettings.addEventListener('change', (e) => { flipHud.checked = e.target.checked; });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, [data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.close;
        if (id) this._closeModal(id);
      });
    });

    // Topbar & Main Menu buttons
    document.getElementById('btn-open-menu').addEventListener('click', () => this._showMainMenu());
    document.getElementById('btn-resume-game').addEventListener('click', () => this._hideMainMenu());
    document.getElementById('btn-new-game').addEventListener('click', () => this._openNewGameModal());
    document.getElementById('btn-open-academy').addEventListener('click', () => this._openAcademyModal());
    document.getElementById('btn-open-friends').addEventListener('click', () => this._openFriendsModal());
    document.getElementById('btn-piece-studio').addEventListener('click', () => this._openPieceStudio());
    document.getElementById('btn-online-lobby').addEventListener('click', () => this._openOnlineLobby());
    document.getElementById('btn-firebase-config').addEventListener('click', () => this._openFirebaseModal());

    // Main Menu Action Cards
    document.querySelectorAll('[data-menu-action]').forEach((card) => {
      card.addEventListener('click', () => {
        const act = card.dataset.menuAction;
        if (act === 'bot' || act === 'local' || act === 'bot_vs_bot') {
          this._openNewGameModal(act);
        } else if (act === 'academy') {
          this._openAcademyModal();
        } else if (act === 'friends') {
          this._openFriendsModal();
        } else if (act === 'quick_online') {
          this._startQuickMatch();
        } else if (act === 'online') {
          this._openOnlineLobby();
        } else if (act === 'puzzles') {
          this._startPuzzleMode(this.puzzleIndex);
        } else if (act === 'studio') {
          this._openPieceStudio();
        } else if (act === 'settings') {
          this._openFirebaseModal();
        }
      });
    });

    // Academy HUD Controls
    document.getElementById('btn-academy-hint').addEventListener('click', () => this._showAcademyHint());
    document.getElementById('btn-academy-demo').addEventListener('click', () => this._demoAcademyStep());
    document.getElementById('btn-academy-retry').addEventListener('click', () => {
      if (this.currentLesson) this._startAcademyLesson(this.currentLesson.id);
    });
    document.getElementById('btn-academy-next').addEventListener('click', () => this._startNextAcademyLesson());
    document.getElementById('btn-academy-catalog').addEventListener('click', () => {
      this._openAcademyModal(this.currentLesson?.trackId);
    });

    // Evolution Coach Live Alert Controls
    document.getElementById('btn-coach-show-best').addEventListener('click', () => {
      if (!this.lastCoachMistake) return;
      const { bestFrom, bestTo, bestSan } = this.lastCoachMistake;
      this.hintMove = { from: bestFrom, to: bestTo };
      this._renderHighlights();
      this._toast(`Melhor lance era ${bestSan} (${bestFrom.toUpperCase()}→${bestTo.toUpperCase()}).`);
    });
    document.getElementById('btn-coach-retry-move').addEventListener('click', () => {
      if (!this.lastCoachMistake || this.gameMode === 'online' || this.isBotThinking) return;
      this._restartFromHistoryPly(this.lastCoachMistake.plyBefore);
    });

    // Threat Map 3D toggle, Copy PGN, Puzzle Controls, Quick Match & Eval Chart Navigation
    document.getElementById('btn-threat-map').addEventListener('click', () => {
      this.showThreatMap = !this.showThreatMap;
      document.getElementById('btn-threat-map').classList.toggle('active', this.showThreatMap);
      this._renderHighlights();
      this._toast(this.showThreatMap ? 'Mapa de Ameaças 3D ativado.' : 'Mapa de Ameaças desativado.');
    });
    document.getElementById('btn-copy-pgn').addEventListener('click', () => this._copyPgnAndFen());
    document.getElementById('btn-puzzle-hint').addEventListener('click', () => this._showPuzzleHint());
    document.getElementById('btn-puzzle-next').addEventListener('click', () => {
      this._startPuzzleMode((this.puzzleIndex + 1) % TACTICAL_PUZZLES.length);
    });
    document.getElementById('btn-quick-match').addEventListener('click', () => this._startQuickMatch());

    document.getElementById('eval-chart-canvas').addEventListener('click', (e) => {
      if (this.moveSnapshots.length <= 1) return;
      const rect = e.target.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetPly = Math.round(ratio * (this.moveSnapshots.length - 1));
      if (targetPly === this.moveSnapshots.length - 1) {
        this._cancelHistoryPreview();
      } else {
        this._previewHistoryPly(targetPly);
      }
    });

    // Game Over Overlay actions
    document.getElementById('btn-gameover-rematch').addEventListener('click', () => {
      if (this.gameMode === 'online') {
        this.multiplayer.requestRematch();
        this._toast('Pedido de revanche enviado!');
      } else if (this.gameMode === 'puzzle') {
        this._startPuzzleMode((this.puzzleIndex + 1) % TACTICAL_PUZZLES.length);
      } else {
        this._startLocalOrBotGame(this.lastGameConfig);
      }
    });
    document.getElementById('btn-gameover-studio').addEventListener('click', () => this._openPieceStudio());
    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      this._hideGameOver();
      this._showMainMenu();
    });

    // Match controls & History restart controls
    document.getElementById('btn-hint').addEventListener('click', () => this._requestHint());
    document.getElementById('btn-undo').addEventListener('click', () => this._undoMove());
    document.getElementById('btn-resign').addEventListener('click', () => this._resignGame());
    document.getElementById('btn-draw').addEventListener('click', () => this.multiplayer.offerDraw());
    document.getElementById('btn-accept-draw').addEventListener('click', () => this.multiplayer.respondDraw(true));
    document.getElementById('btn-decline-draw').addEventListener('click', () => this.multiplayer.respondDraw(false));
    document.getElementById('btn-rematch').addEventListener('click', () => this.multiplayer.requestRematch());
    document.getElementById('btn-restart-from-point').addEventListener('click', () => {
      if (this.historyPreviewPly !== null) {
        this._restartFromHistoryPly(this.historyPreviewPly);
      }
    });
    document.getElementById('btn-cancel-history-preview').addEventListener('click', () => this._cancelHistoryPreview());

    // Online Copy Link & Chat
    document.getElementById('btn-copy-link').addEventListener('click', () => this._copyInviteLink());
    document.getElementById('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      if (input.value.trim()) {
        this.multiplayer.sendChat(this._getLocalPlayerName(), input.value);
        input.value = '';
      }
    });
    document.querySelectorAll('.react-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.multiplayer.sendChat(this._getLocalPlayerName(), btn.dataset.react);
      });
    });

    // New Game Modal logic
    this.selectedNewGameMode = 'bot';
    document.querySelectorAll('.mode-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        this._selectNewGameMode(opt.dataset.mode);
      });
    });

    const botSelect = document.getElementById('bot-level-select');
    const updateBotDesc = () => {
      const cfg = BOT_LEVELS[Number(botSelect.value)];
      document.getElementById('bot-level-desc').textContent = cfg ? cfg.description : '';
    };
    botSelect.addEventListener('change', updateBotDesc);
    updateBotDesc();

    const coachChk = document.getElementById('chk-coach-mode');
    if (coachChk) {
      coachChk.checked = this.coachMode;
      coachChk.addEventListener('change', (e) => {
        this.coachMode = e.target.checked;
        try {
          localStorage.setItem(COACH_MODE_STORAGE_KEY, String(this.coachMode));
        } catch {
          // ignore storage errors
        }
      });
    }

    document.getElementById('btn-start-match').addEventListener('click', () => {
      const lvl = Number(botSelect.value);
      const colorPref = document.getElementById('human-color-select').value;
      const variant = document.getElementById('variant-select')?.value || 'standard';
      const [secStr, incStr] = document.getElementById('time-control-select').value.split('|');
      this._startLocalOrBotGame({
        mode: this.selectedNewGameMode,
        variant,
        botLevel: lvl,
        humanColor: colorPref === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorPref,
        timeControl: { initialSeconds: Number(secStr), incrementSeconds: Number(incStr) },
      });
      this._closeModal('modal-new-game');
    });

    // Promotion modal
    document.querySelectorAll('.promo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.pendingPromo) return;
        const { from, to } = this.pendingPromo;
        this.pendingPromo = null;
        this._closeModal('modal-promotion');
        this._commitMove({ from, to, promotion: btn.dataset.promo });
      });
    });

    this._initPieceStudioEvents();
    this._initOnlineAndFirebaseEvents();
    this._initMobileExperience();
    this._updateConnectionBadge();
  }

  _initPieceStudioEvents() {
    const styleSel = document.getElementById('studio-style-select');
    Object.values(GEOMETRY_STYLES).forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      styleSel.appendChild(opt);
    });

    const presetSel = document.getElementById('studio-preset-select');
    Object.values(MATERIAL_PRESETS).forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      presetSel.appendChild(opt);
    });

    document.querySelectorAll('.piece-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.piece-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.studioTarget = tab.dataset.piece;
        this._populateStudioControls();
        this._refreshStudioPreview();
      });
    });

    document.getElementById('preview-white-btn').addEventListener('click', () => {
      this.studioPreviewSide = 'w';
      this._refreshStudioPreview();
    });
    document.getElementById('preview-black-btn').addEventListener('click', () => {
      this.studioPreviewSide = 'b';
      this._refreshStudioPreview();
    });

    const updateProp = (key, value) => {
      const targets = this.studioTarget === 'all' ? PIECE_TYPES : [this.studioTarget];
      for (const t of targets) {
        this.customization.pieces[t][key] = value;
      }
      this._refreshStudioPreview();
    };

    styleSel.addEventListener('change', (e) => updateProp('style', e.target.value));
    presetSel.addEventListener('change', (e) => {
      const preset = MATERIAL_PRESETS[e.target.value];
      if (!preset) return;
      const targets = this.studioTarget === 'all' ? PIECE_TYPES : [this.studioTarget];
      for (const t of targets) {
        Object.assign(this.customization.pieces[t], {
          preset: preset.id,
          whiteColor: preset.whiteColor,
          blackColor: preset.blackColor,
          accentColor: preset.accentColor,
          metalness: preset.metalness,
          roughness: preset.roughness,
          emissiveIntensity: preset.emissiveIntensity,
          transmission: preset.transmission,
          clearcoat: preset.clearcoat,
        });
      }
      this._populateStudioControls();
      this._refreshStudioPreview();
    });

    document.getElementById('studio-white-color').addEventListener('input', (e) => updateProp('whiteColor', e.target.value));
    document.getElementById('studio-black-color').addEventListener('input', (e) => updateProp('blackColor', e.target.value));
    document.getElementById('studio-accent-color').addEventListener('input', (e) => updateProp('accentColor', e.target.value));

    const bindSlider = (inputId, labelId, prop, fmt = (v) => Number(v).toFixed(2)) => {
      const inp = document.getElementById(inputId);
      inp.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        document.getElementById(labelId).textContent = fmt(val);
        updateProp(prop, val);
      });
    };

    bindSlider('studio-metalness', 'val-metalness', 'metalness');
    bindSlider('studio-roughness', 'val-roughness', 'roughness');
    bindSlider('studio-emissive', 'val-emissive', 'emissiveIntensity');
    bindSlider('studio-transmission', 'val-transmission', 'transmission');
    bindSlider('studio-height', 'val-height', 'heightScale', (v) => `${Number(v).toFixed(2)}x`);

    const bindStudioQuickPreset = (btnId, setId) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', () => {
        this.customization = createHeroSetCustomization(setId);
        this._populateStudioControls();
        this._refreshStudioPreview();
      });
    };
    bindStudioQuickPreset('btn-preset-marvel', 'marvel_heroes');
    bindStudioQuickPreset('btn-preset-dc', 'dc_heroes');
    bindStudioQuickPreset('btn-preset-marvel-dc', 'marvel_vs_dc');
    bindStudioQuickPreset('btn-preset-classic', 'staunton');

    document.getElementById('btn-mix-styles').addEventListener('click', () => {
      const styles = Object.keys(GEOMETRY_STYLES);
      const presets = Object.keys(MATERIAL_PRESETS);
      for (const t of PIECE_TYPES) {
        const st = styles[Math.floor(Math.random() * styles.length)];
        const pr = presets[Math.floor(Math.random() * presets.length)];
        this.customization.pieces[t] = createDefaultPieceConfig(st, pr);
      }
      this._populateStudioControls();
      this._refreshStudioPreview();
      this._toast('Estilos misturados por peça! Clique em "Aplicar no Tabuleiro".');
    });

    document.getElementById('btn-reset-pieces').addEventListener('click', () => {
      this.customization = createDefaultCustomization();
      this._populateStudioControls();
      this._refreshStudioPreview();
    });

    document.getElementById('btn-apply-studio').addEventListener('click', () => {
      this._saveCustomization();
      this._syncPieceSetSelectors();
      this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
      if (this.gameMode === 'online') {
        this.multiplayer.syncPieceStyle(this.customization);
      }
      this._closeModal('modal-piece-studio');
      this._toast('Personalização 3D aplicada ao tabuleiro.');
    });
  }

  _detectPieceSetId() {
    const styles = PIECE_TYPES.map((t) => this.customization?.pieces?.[t]?.style || 'staunton');
    const first = styles[0];
    if (styles.every((s) => s === first) && QUICK_PIECE_SETS.some((q) => q.id === first && !q.disabled)) {
      return first;
    }
    return 'custom';
  }

  _syncPieceSetSelectors() {
    const activeId = this._detectPieceSetId();
    const selectors = [
      document.getElementById('piece-set-select'),
      document.getElementById('menu-piece-set-select'),
      document.getElementById('settings-piece-set-select'),
    ].filter(Boolean);
    selectors.forEach((sel) => {
      sel.value = activeId;
    });
  }

  _applyQuickPieceSet(setId, applyToBoard = true) {
    if (!setId || setId === 'custom') return;
    this.customization = createHeroSetCustomization(setId);
    this._saveCustomization();
    this._syncPieceSetSelectors();
    if (applyToBoard) {
      this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
      if (this.gameMode === 'online') {
        this.multiplayer.syncPieceStyle(this.customization);
      }
      const label = QUICK_PIECE_SETS.find((s) => s.id === setId)?.label || setId;
      this._toast(`${label} aplicada ao tabuleiro.`);
    }
  }

  _initOnlineAndFirebaseEvents() {
    try {
      const savedName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
      if (savedName) {
        const onlineInp = document.getElementById('online-player-name');
        const friendInp = document.getElementById('friends-player-name-input');
        if (onlineInp && !onlineInp.value) onlineInp.value = savedName;
        if (friendInp && !friendInp.value) friendInp.value = savedName;
      }
    } catch {
      // ignore storage errors
    }

    document.getElementById('btn-create-room').addEventListener('click', async () => {
      try {
        const playerName = this._getLocalPlayerName();
        const colorPref = document.getElementById('online-color-select').value;
        const [sec, inc] = document.getElementById('online-time-select').value.split('|').map(Number);
        const isPrivate = document.getElementById('online-private-chk')?.checked !== false;

        const res = await this.multiplayer.createRoom({
          playerName,
          timeControlSeconds: sec,
          incrementSeconds: inc,
          preferredColor: colorPref,
          pieceCustomization: this.customization,
          isPrivate,
        });
        this._enterOnlineRoom(res.roomId, res.myColor, res.room);
        this._closeModal('modal-online-lobby');
        this._toast(
          isPrivate
            ? `Sala privada ${res.roomId} criada (Senha: ${res.accessKey})! Copie o link para convidar.`
            : `Sala pública ${res.roomId} criada! Envie o link de convite.`
        );
      } catch (err) {
        this._toast(`Erro: ${err.message}`);
      }
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
      const code = document.getElementById('join-room-code').value;
      const key = document.getElementById('join-room-key')?.value?.trim() || '';
      await this._joinOnlineRoomByCode(code, key);
    });

    document.getElementById('btn-refresh-rooms').addEventListener('click', () => this._refreshPublicRooms());

    // Friends & Direct Challenge events
    document.getElementById('btn-save-profile-name')?.addEventListener('click', async () => {
      const inp = document.getElementById('friends-player-name-input');
      const name = inp?.value.trim() || 'Jogador';
      try {
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
      } catch {
        // ignore storage errors
      }
      const onlineInp = document.getElementById('online-player-name');
      if (onlineInp) onlineInp.value = name;
      await this.multiplayer.refreshSocial?.();
      this._toast(`Nome atualizado para "${name}".`);
    });

    document.getElementById('btn-copy-friend-tag')?.addEventListener('click', () => {
      const tag = this.multiplayer.friendTag;
      navigator.clipboard?.writeText(tag).then(
        () => this._toast(`Sua tag ${tag} foi copiada!`),
        () => this._toast(`Sua tag: ${tag}`)
      );
    });

    document.getElementById('btn-add-friend')?.addEventListener('click', async () => {
      const inp = document.getElementById('friend-tag-input');
      const tag = inp?.value.trim();
      if (!tag) return;
      try {
        await this.multiplayer.sendFriendRequest(tag, this._getLocalPlayerName());
        if (inp) inp.value = '';
        this._toast(`Solicitação enviada para ${tag}!`);
        await this.multiplayer.refreshSocial?.();
      } catch (err) {
        this._toast(`Erro ao adicionar amigo: ${err.message}`);
      }
    });

    document.getElementById('btn-refresh-friends')?.addEventListener('click', async () => {
      await this.multiplayer.refreshSocial?.();
      this._renderFriendsModal();
      this._toast('Lista de amigos atualizada.');
    });

    document.getElementById('btn-accept-challenge')?.addEventListener('click', async () => {
      const ch = this.activeIncomingChallenge;
      if (!ch) return;
      const cid = ch.challengeId || ch.id;
      try {
        const res = await this.multiplayer.respondGameChallenge(cid, {
          playerName: this._getLocalPlayerName(),
          accept: true,
          pieceCustomization: this.customization,
        });
        document.getElementById('challenge-banner').classList.add('hidden');
        this.activeIncomingChallenge = null;
        if (res?.roomId && res?.room) {
          this._enterOnlineRoom(res.roomId, res.myColor || 'b', res.room);
          this._closeModal('modal-friends');
          this._closeModal('modal-online-lobby');
          this._toast(`Conectado na sala privada ${res.roomId}!`);
        } else if (res?.roomId) {
          await this._joinOnlineRoomByCode(res.roomId, res.accessKey || '');
        }
      } catch (err) {
        this._toast(`Erro ao aceitar desafio: ${err.message}`);
      }
    });

    document.getElementById('btn-decline-challenge')?.addEventListener('click', async () => {
      const ch = this.activeIncomingChallenge;
      if (!ch) return;
      const cid = ch.challengeId || ch.id;
      try {
        await this.multiplayer.respondGameChallenge(cid, { accept: false });
      } catch {
        // ignore decline error
      }
      document.getElementById('challenge-banner').classList.add('hidden');
      this.activeIncomingChallenge = null;
    });

    document.getElementById('btn-save-firebase').addEventListener('click', async () => {
      const statusEl = document.getElementById('firebase-status-msg');
      statusEl.textContent = 'Testando conexão com o servidor...';
      try {
        const res = await this.multiplayer.enableCloudMode();
        statusEl.textContent = `Nuvem conectada (Latência: ${res.pingMs ?? '-'} ms).`;
        this._updateConnectionBadge();
        await this.multiplayer.refreshSocial?.();
        this._toast('Conexão na nuvem ativada.');
      } catch (err) {
        statusEl.textContent = `Aviso: ${err.message}`;
        this._updateConnectionBadge();
      }
    });

    document.getElementById('btn-disconnect-firebase').addEventListener('click', async () => {
      await this.multiplayer.disconnectToDemo();
      this._updateConnectionBadge();
      await this.multiplayer.refreshSocial?.();
      this._closeModal('modal-firebase');
      this._toast('Modo Demo Multi-Aba ativado.');
    });
  }

  _getLocalPlayerName() {
    const inp = document.getElementById('online-player-name');
    const friendInp = document.getElementById('friends-player-name-input');
    const typed = inp?.value.trim() || friendInp?.value.trim();
    if (typed) return typed;
    try {
      return localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || 'Jogador';
    } catch {
      return 'Jogador';
    }
  }

  async _checkUrlInvite() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const key = params.get('key') || '';
    if (room) {
      const codeInp = document.getElementById('join-room-code');
      const keyInp = document.getElementById('join-room-key');
      if (codeInp) codeInp.value = room;
      if (keyInp && key) keyInp.value = key;
      await this._joinOnlineRoomByCode(room, key);
    }
  }

  async _joinOnlineRoomByCode(code, accessKey = '') {
    try {
      const res = await this.multiplayer.joinRoom(code, {
        playerName: this._getLocalPlayerName(),
        pieceCustomization: this.customization,
        accessKey,
      });
      this._enterOnlineRoom(res.roomId, res.myColor, res.room);
      this._closeModal('modal-online-lobby');
      this._closeModal('modal-friends');
      this._toast(`Conectado na sala ${res.roomId}!`);
    } catch (err) {
      this._toast(`Não foi possível entrar: ${err.message}`);
    }
  }

  _enterOnlineRoom(roomId, myColor, initialRoom) {
    this.gameMode = 'online';
    this.variant = 'standard';
    this.checksCount = { w: 0, b: 0 };
    this.currentPuzzle = null;
    this.currentLesson = null;
    this.lastCoachMistake = null;
    this.humanMoveQualities = [];
    this.humanColor = myColor === 'b' ? 'b' : 'w';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.hintMove = null;
    this.gameEnded = false;
    this.hasActiveMatch = true;
    this.evalHistory = [0.1];
    this._hideGameOver();
    this._hideMainMenu();
    this._resetSnapshots();
    this._lastOpponentStatusKey = null;

    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    if (this.multiplayer.currentAccessKey) {
      url.searchParams.set('key', this.multiplayer.currentAccessKey);
    } else {
      url.searchParams.delete('key');
    }
    window.history.replaceState({}, '', url.toString());

    document.getElementById('puzzle-banner').classList.add('hidden');
    document.getElementById('academy-panel').classList.add('hidden');
    document.getElementById('coach-alert-banner').classList.add('hidden');
    document.getElementById('move-quality-badge').classList.add('hidden');
    document.getElementById('online-panel').classList.remove('hidden');
    document.getElementById('room-code-display').textContent = roomId;

    const privacyBadge = document.getElementById('room-privacy-badge');
    const keyWrap = document.getElementById('room-key-wrap');
    const keyDisplay = document.getElementById('room-key-display');
    const isPriv = Boolean(initialRoom?.isPrivate || this.multiplayer.currentAccessKey);
    if (privacyBadge) {
      privacyBadge.classList.remove('hidden');
      privacyBadge.className = `badge ${isPriv ? 'badge-private' : 'badge-public'}`;
      privacyBadge.textContent = isPriv ? 'Sala Privada 🔒' : 'Sala Pública';
    }
    if (keyWrap && keyDisplay) {
      if (this.multiplayer.currentAccessKey) {
        keyWrap.classList.remove('hidden');
        keyDisplay.textContent = this.multiplayer.currentAccessKey;
      } else {
        keyWrap.classList.add('hidden');
        keyDisplay.textContent = '';
      }
    }

    document.getElementById('btn-draw').classList.remove('hidden');
    document.getElementById('btn-undo').classList.add('hidden');

    this.scene3d.setCameraView(this.humanColor);
    this._applyOnlineRoomState(initialRoom, this.multiplayer.lastServerTime);

    this.multiplayer.subscribeRoom(roomId, (room, serverTime) => {
      this._applyOnlineRoomState(room, serverTime);
    });
    this._updateConnectionBadge();
  }

  _applyOnlineRoomState(room, serverTime = Date.now()) {
    if (!room) return;
    if (serverTime) {
      this._serverClockOffsetMs = Date.now() - serverTime;
    }
    if (room.white?.uid === this.multiplayer.playerId) this.multiplayer.myColor = 'w';
    else if (room.black?.uid === this.multiplayer.playerId) this.multiplayer.myColor = 'b';

    this.humanColor = this.multiplayer.myColor === 'b' ? 'b' : 'w';

    if (room.timeControl) {
      this.timeControl = room.timeControl;
    }
    if (room.white && typeof room.white.timeLeftMs === 'number') this.clocks.w = room.white.timeLeftMs;
    if (room.black && typeof room.black.timeLeftMs === 'number') this.clocks.b = room.black.timeLeftMs;

    const currentFen = this.chess.fen();
    if (room.fen && room.fen !== currentFen) {
      this.chess.load(room.fen);
      this.lastMove = room.lastMove || null;
      this.selectedSquare = null;
      this.legalMoves = [];
      this.hintMove = null;
      this.historyPreviewPly = null;

      let onlineMoveAnim = null;
      const lm = room.lastMove;
      const pieceAtFrom = lm?.from ? this.scene3d.pieceMeshes.get(lm.from) : null;
      const pieceAfter = lm?.to ? this.chess.get(lm.to) : null;
      const prevMoveCount = this._onlineMovesList?.length || 0;
      const nextMoveCount = Array.isArray(room.moves)
        ? room.moves.length
        : Object.keys(room.moves || {}).length;
      const isSingleStepAdvance = Math.abs(nextMoveCount - prevMoveCount) <= 1;
      const wasPawnDiagEmpty =
        pieceAtFrom?.userData?.type === 'p' &&
        lm.from[0] !== lm.to[0] &&
        !this.scene3d.pieceMeshes.has(lm.to);
      const isKingCastle =
        pieceAtFrom?.userData?.type === 'k' &&
        Math.abs(lm.from.charCodeAt(0) - lm.to.charCodeAt(0)) > 1;
      const isPromotion =
        pieceAtFrom && pieceAfter && pieceAtFrom.userData.type !== pieceAfter.type;

      if (
        isSingleStepAdvance &&
        pieceAtFrom &&
        pieceAfter &&
        pieceAtFrom.userData.color === pieceAfter.color &&
        !wasPawnDiagEmpty &&
        !isKingCastle &&
        !isPromotion
      ) {
        onlineMoveAnim = { from: lm.from, to: lm.to };
      }

      this.scene3d.syncBoard(this.chess.board(), this.customization, onlineMoveAnim);
      if (isGameCheck(this.chess)) audioFX.playCheck();
      else audioFX.playMove();
    }

    // Update move history and rebuild full per-ply snapshots so player can inspect or restart from any point
    this._onlineMovesList = Array.isArray(room.moves) ? room.moves : Object.values(room.moves || {});
    this._rebuildSnapshotsFromSanList(this._onlineMovesList);
    this._onlineRoomSnapshot = room;

    // Update real-time presence indicators
    this._updatePresenceUI(room, serverTime || Date.now());

    // Draw offer banner
    const drawBanner = document.getElementById('draw-offer-banner');
    const isOfferedToMe = room.drawOfferBy && room.drawOfferBy !== this.multiplayer.myColor;
    drawBanner.classList.toggle('hidden', !isOfferedToMe);

    // Rematch banner
    const rematchBanner = document.getElementById('rematch-banner');
    rematchBanner.classList.toggle('hidden', room.status !== 'finished');

    if (room.status === 'finished' && !this.gameEnded) {
      this.gameEnded = true;
      audioFX.playGameOver(room.result?.winner === this.multiplayer.myColor);
      const winText =
        room.result?.winner === 'draw'
          ? 'Empate!'
          : `${room.result?.winner === 'w' ? 'Brancas' : 'Pretas'} Venceram!`;
      this._showGameOver(winText, room.result?.reason || 'Partida encerrada');
    } else if (room.status === 'playing') {
      this.gameEnded = false;
      this._hideGameOver();
    }

    // Chat render
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML = '';
    const msgs = room.chat ? Object.values(room.chat).sort((a, b) => a.timestamp - b.timestamp) : [];
    msgs.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'chat-line';
      div.innerHTML = `<strong>${this._escapeHtml(m.sender)}:</strong> ${this._escapeHtml(m.text)}`;
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;

    this._renderAll();
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _copyInviteLink() {
    if (!this.multiplayer.currentRoomId) return;
    const link = this.multiplayer.getInviteUrl() || window.location.href;
    navigator.clipboard?.writeText(link).then(
      () =>
        this._toast(
          this.multiplayer.currentAccessKey
            ? 'Link fechado com senha única copiado! Somente quem tem este link entra na sala.'
            : 'Link de convite copiado!'
        ),
      () => this._toast(`Código: ${this.multiplayer.currentRoomId}`)
    );
  }

  _startLocalOrBotGame({ mode, variant = 'standard', botLevel, humanColor, timeControl }) {
    this.multiplayer.leaveRoom();
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('key');
    window.history.replaceState({}, '', url.toString());

    document.getElementById('online-panel').classList.add('hidden');
    document.getElementById('puzzle-banner').classList.add('hidden');
    document.getElementById('academy-panel').classList.add('hidden');
    document.getElementById('coach-alert-banner').classList.add('hidden');
    document.getElementById('btn-draw').classList.add('hidden');
    document.getElementById('btn-undo').classList.remove('hidden');

    this.gameMode = mode;
    this.variant = variant || 'standard';
    this.checksCount = { w: 0, b: 0 };
    this.currentPuzzle = null;
    this.currentLesson = null;
    this.lastCoachMistake = null;
    this.humanMoveQualities = [];
    this.botLevel = botLevel || 3;
    this.humanColor = humanColor || 'w';
    this.timeControl = timeControl || { initialSeconds: 600, incrementSeconds: 0 };
    this.lastGameConfig = {
      mode: this.gameMode,
      variant: this.variant,
      botLevel: this.botLevel,
      humanColor: this.humanColor,
      timeControl: this.timeControl,
    };
    this.hasActiveMatch = true;
    this._hideGameOver();
    this._hideMainMenu();

    const initMs = this.timeControl.initialSeconds * 1000;
    this.clocks = { w: initMs, b: initMs };
    this.lastClockAlertSec = { w: -1, b: -1 };
    this.lastClockTick = Date.now();

    this.chess.reset();
    this.evalHistory = [evaluateBoardScore(this.chess.fen()).pawns || 0];
    document.getElementById('move-quality-badge').classList.add('hidden');
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.hintMove = null;
    this.isBotThinking = false;
    this.gameEnded = false;
    this.historyPreviewPly = null;
    this._onlineMovesList = null;
    this._onlineRoomSnapshot = null;
    this._lastOpponentStatusKey = null;
    this._resetSnapshots();
    this._hidePresencePills();

    this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
    this.scene3d.setCameraView(mode === 'bot' ? this.humanColor : 'w');
    this._updateConnectionBadge();
    this._renderAll();

    if (mode === 'bot' && BOT_LEVELS[this.botLevel]?.chatLines?.start) {
      const bot = BOT_LEVELS[this.botLevel];
      this._toast(`${bot.shortName}: "${bot.chatLines.start}"`);
    }
    this._maybeTriggerBotTurn();
  }

  _isTurnInteractive() {
    if (this.isOrientationBlocked || this.isInMenu || this.gameEnded || this.isBotThinking || this.pendingPromo) return false;
    if (this.gameMode === 'bot_vs_bot') return false;
    if (this.gameMode === 'bot' && this.chess.turn() !== this.humanColor) return false;
    if (this.gameMode === 'online') {
      if (this._onlineRoomSnapshot?.status === 'waiting') return false;
      if (this.multiplayer.myColor !== this.chess.turn()) return false;
    }
    return true;
  }

  canPlayerDragSquare(square) {
    if (!this._isTurnInteractive()) return false;
    const piece = this.chess.get(square);
    return Boolean(piece && piece.color === this.chess.turn());
  }

  selectPieceAtSquare(square) {
    if (!this._isTurnInteractive()) return;
    const piece = this.chess.get(square);
    if (piece && piece.color === this.chess.turn()) {
      this.selectedSquare = square;
      this.legalMoves = this.chess.moves({ square, verbose: true });
      audioFX.playSelect();
      this._renderHighlights();
    }
  }

  handlePieceDrop(fromSquare, toSquare) {
    if (!this._isTurnInteractive()) return;
    if (this.selectedSquare !== fromSquare) {
      this.selectPieceAtSquare(fromSquare);
    }
    const matchingMoves = this.legalMoves.filter((m) => m.to === toSquare);
    if (matchingMoves.length > 0) {
      const promoMoves = matchingMoves.filter((m) => m.promotion);
      if (promoMoves.length > 0) {
        this.pendingPromo = { from: fromSquare, to: toSquare };
        this._openModal('modal-promotion');
        return;
      }
      this._commitMove({ from: fromSquare, to: toSquare });
    }
  }

  handleSquareClick(square) {
    if (this.gameMode === 'online' && this._onlineRoomSnapshot?.status === 'waiting') {
      this._toast('Aguardando o segundo jogador entrar na sala...');
      return;
    }
    if (!this._isTurnInteractive()) return;

    // Check if clicked square is a valid destination for selected piece
    const matchingMoves = this.legalMoves.filter((m) => m.to === square);
    if (matchingMoves.length > 0) {
      const promoMoves = matchingMoves.filter((m) => m.promotion);
      if (promoMoves.length > 0) {
        this.pendingPromo = { from: this.selectedSquare, to: square };
        this._openModal('modal-promotion');
        return;
      }
      this._commitMove({ from: matchingMoves[0].from, to: matchingMoves[0].to });
      return;
    }

    // Select own piece on clicked square (or toggle off if tapping same square)
    const piece = this.chess.get(square);
    if (piece && piece.color === this.chess.turn() && square !== this.selectedSquare) {
      this.selectPieceAtSquare(square);
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
      this._renderHighlights();
    }
  }

  async _commitMove(moveObj) {
    const fenBeforeMove = this.chess.fen();
    const prevEvalPawns = this.evalHistory[this.evalHistory.length - 1] ?? 0;
    const moverColor = this.chess.turn();
    const result = this.chess.move(moveObj);
    if (!result) return;

    this.lastCoachMistake = null;
    document.getElementById('coach-alert-banner').classList.add('hidden');

    // Apply time increment
    if (this.timeControl.initialSeconds > 0 && this.timeControl.incrementSeconds > 0) {
      this.clocks[moverColor] += this.timeControl.incrementSeconds * 1000;
    }

    this.selectedSquare = null;
    this.legalMoves = [];
    this.hintMove = null;
    this.historyPreviewPly = null;
    this.lastMove = { from: result.from, to: result.to, san: result.san };
    this._pushMoveSnapshot(result);

    const nextEvalScore = evaluateBoardScore(this.chess.fen());
    const nextEvalPawns = nextEvalScore.mateIn === 0 ? (nextEvalScore.winner === 'w' ? 15 : -15) : nextEvalScore.pawns;
    this.evalHistory.push(nextEvalPawns);

    // Tactical move quality badge for human moves (and bot personality reactions + Coach Mode)
    const isHumanMove =
      this.gameMode === 'local' ||
      this.gameMode === 'puzzle' ||
      this.gameMode === 'academy' ||
      (this.gameMode === 'bot' && moverColor === this.humanColor) ||
      (this.gameMode === 'online' && moverColor === this.multiplayer.myColor);

    const qualityEl = document.getElementById('move-quality-badge');
    if (isHumanMove && this.gameMode !== 'puzzle' && this.gameMode !== 'academy') {
      const q = classifyMoveQuality(
        prevEvalPawns,
        nextEvalPawns,
        moverColor,
        isGameCheckmate(this.chess),
        Boolean(result.captured)
      );
      this.humanMoveQualities.push({ symbol: q.symbol, label: q.label });
      qualityEl.textContent = `${q.symbol} ${q.label}`;
      qualityEl.className = `quality-badge ${q.cssClass}`;
      if (this.gameMode === 'bot' && (q.symbol === '!!' || q.symbol === '??')) {
        const bot = BOT_LEVELS[this.botLevel];
        if (q.symbol === '!!' && bot?.chatLines?.blunder) {
          this._toast(`${bot.shortName}: "${bot.chatLines.blunder}"`);
        }
      }
      if (this.coachMode && (q.symbol === '?!' || q.symbol === '??') && !isGameOver(this.chess)) {
        const plyBefore = this.moveSnapshots.length - 2;
        const modeAtMove = this.gameMode;
        const sanPlayed = result.san;
        setTimeout(() => {
          if (this.gameEnded || this.gameMode !== modeAtMove) return;
          const best = analyzePositionBestMove(fenBeforeMove, 3);
          if (best && best.san !== sanPlayed) {
            this.lastCoachMistake = {
              fenBefore: fenBeforeMove,
              plyBefore,
              moveSan: sanPlayed,
              bestSan: best.san,
              bestFrom: best.from,
              bestTo: best.to,
            };
            const alertText = document.getElementById('coach-alert-text');
            if (alertText) {
              alertText.textContent = `${q.symbol === '??' ? 'Erro Grave (??)' : 'Imprecisão (?!)'}: ${sanPlayed} perdeu vantagem. Melhor lance era ${best.san} (${best.from.toUpperCase()}→${best.to.toUpperCase()}).`;
            }
            const retryBtn = document.getElementById('btn-coach-retry-move');
            if (retryBtn) retryBtn.classList.toggle('hidden', this.gameMode === 'online');
            document.getElementById('coach-alert-banner').classList.remove('hidden');
          }
        }, 25);
      }
    } else if (this.gameMode === 'bot' && moverColor !== this.humanColor) {
      const bot = BOT_LEVELS[this.botLevel];
      if (isGameCheck(this.chess) && bot?.chatLines?.check) {
        this._toast(`${bot.shortName}: "${bot.chatLines.check}"`);
      } else if (result.captured && Math.random() < 0.45 && bot?.chatLines?.capture) {
        this._toast(`${bot.shortName}: "${bot.chatLines.capture}"`);
      }
    }

    // Determine special 3D animation hints (castling rook / en passant)
    const animInfo = {
      from: result.from,
      to: result.to,
      promotion: result.promotion,
    };
    if (result.flags.includes('k')) {
      animInfo.rookFrom = moverColor === 'w' ? 'h1' : 'h8';
      animInfo.rookTo = moverColor === 'w' ? 'f1' : 'f8';
    } else if (result.flags.includes('q')) {
      animInfo.rookFrom = moverColor === 'w' ? 'a1' : 'a8';
      animInfo.rookTo = moverColor === 'w' ? 'd1' : 'd8';
    }
    if (result.flags.includes('e')) {
      const epRank = moverColor === 'w' ? '5' : '4';
      animInfo.enPassantSquare = `${result.to[0]}${epRank}`;
    }

    this.scene3d.syncBoard(this.chess.board(), this.customization, animInfo);

    // Check variant win conditions (King of the Hill & Three-Check)
    const inCheckNow = isGameCheck(this.chess);
    if (inCheckNow && this.variant === 'three_check') {
      this.checksCount[moverColor]++;
    }
    const isKothWin =
      this.variant === 'koth' &&
      result.piece === 'k' &&
      ['d4', 'e4', 'd5', 'e5'].includes(result.to);
    const isThreeCheckWin = this.variant === 'three_check' && this.checksCount[moverColor] >= 3;

    // Academy Mode interactive lesson validation
    if (this.gameMode === 'academy' && this.currentLesson) {
      this._handleAcademyMove(result, nextEvalScore);
      return;
    }

    // Puzzle mode evaluation
    if (this.gameMode === 'puzzle' && this.currentPuzzle) {
      const expected = this.currentPuzzle.solution[0];
      const solved = result.san === expected || isGameCheckmate(this.chess);
      if (solved) {
        this.gameEnded = true;
        audioFX.playPromote();
        this._updateTurnBanner(`Desafio resolvido! Lance exato: ${result.san}`);
        this._toast(`Excelente: "${this.currentPuzzle.title}" resolvido.`);
        this._renderAll(nextEvalScore);
        setTimeout(() => {
          if (this.gameMode === 'puzzle' && !this.isInMenu) {
            this._startPuzzleMode((this.puzzleIndex + 1) % TACTICAL_PUZZLES.length);
          }
        }, 1800);
        return;
      }
      audioFX.playCheck();
      this._toast(`Quase: "${result.san}" não é o lance ideal. Tente novamente.`);
      this._renderAll(nextEvalScore);
      setTimeout(() => {
        if (this.gameMode === 'puzzle') {
          this.chess.undo();
          this.moveSnapshots.pop();
          this.evalHistory.pop();
          this.lastMove = null;
          this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
          this._renderAll();
        }
      }, 750);
      return;
    }

    // Sound FX, Fallen King Animation & Game Over Card
    if (isGameOver(this.chess) || isKothWin || isThreeCheckWin) {
      this.gameEnded = true;
      const isMate = isGameCheckmate(this.chess);
      audioFX.playGameOver(isMate || isKothWin || isThreeCheckWin);
      if (isMate) {
        const defeatedKingSq = this._findKingSquare(this.chess.turn());
        setTimeout(() => this.scene3d.triggerCheckmateFall(defeatedKingSq), 380);
      }
      if (this.gameMode !== 'online') {
        const winner = moverColor === 'w' ? 'Brancas' : 'Pretas';
        if (isKothWin) {
          this._showGameOver(`Vitória das ${winner}!`, 'Rei da Colina (Centro dominado!)');
        } else if (isThreeCheckWin) {
          this._showGameOver(`Vitória das ${winner}!`, '3-Xeques aplicados!');
        } else if (isMate) {
          this._showGameOver(`Vitória das ${winner}!`, 'Xeque-mate');
        } else {
          this._showGameOver('Empate!', 'Partida empatada pelas regras');
        }
      }
    } else if (inCheckNow) {
      audioFX.playCheck();
    } else if (result.promotion) {
      audioFX.playPromote();
    } else if (result.flags.includes('k') || result.flags.includes('q')) {
      audioFX.playCastle();
    } else if (result.captured) {
      audioFX.playCapture();
    } else {
      audioFX.playMove();
    }

    // Auto-flip camera in local 2-player mode
    if (this.gameMode === 'local' && document.getElementById('chk-auto-flip').checked && !this.gameEnded) {
      this.scene3d.setCameraView(this.chess.turn());
    }

    this._renderAll(nextEvalScore);

    // Sync to server / Demo channel if online
    if (this.gameMode === 'online') {
      const nextHistory = [...(this._onlineMovesList || []), result.san];
      let gameResult = null;
      if (isGameCheckmate(this.chess)) {
        gameResult = { winner: moverColor, reason: 'Xeque-mate' };
      } else if (isKothWin) {
        gameResult = { winner: moverColor, reason: 'Rei da Colina' };
      } else if (isThreeCheckWin) {
        gameResult = { winner: moverColor, reason: '3-Xeques' };
      } else if (isGameDraw(this.chess)) {
        gameResult = { winner: 'draw', reason: 'Empate' };
      }
      await this.multiplayer.sendMove({
        fen: this.chess.fen(),
        turn: this.chess.turn(),
        lastMove: this.lastMove,
        moves: nextHistory,
        whiteTimeLeftMs: this.clocks.w,
        blackTimeLeftMs: this.clocks.b,
        result: gameResult,
      });
    } else {
      this._maybeTriggerBotTurn();
    }
  }

  async _maybeTriggerBotTurn() {
    if (this.gameEnded) return;
    const turn = this.chess.turn();
    const shouldBotPlay =
      this.gameMode === 'bot_vs_bot' || (this.gameMode === 'bot' && turn !== this.humanColor);

    if (!shouldBotPlay) return;

    this.isBotThinking = true;
    this._updateTurnBanner();

    const fenSnapshot = this.chess.fen();
    const minThinkTimeMs = this.gameMode === 'bot_vs_bot' ? 1500 : 1150;
    const historyContext = {
      recentFens: this.moveSnapshots.map((s) => s.fen),
      recentMoves: this.moveSnapshots.slice(1).map((s) => ({ from: s.from, to: s.to, san: s.san })),
    };
    const move = await getBestMove(fenSnapshot, this.botLevel, minThinkTimeMs, historyContext);
    this.isBotThinking = false;

    if (!this.gameEnded && this.chess.fen() === fenSnapshot && move) {
      await this._commitMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
    }
  }

  async _requestHint() {
    if (this.gameEnded || this.isBotThinking) return;
    this._toast('Calculando melhor lance...');
    const historyContext = {
      recentFens: this.moveSnapshots.map((s) => s.fen),
      recentMoves: this.moveSnapshots.slice(1).map((s) => ({ from: s.from, to: s.to, san: s.san })),
    };
    const best = await getBestMove(this.chess.fen(), 4, 220, historyContext);
    if (best) {
      this.hintMove = { from: best.from, to: best.to };
      this._renderHighlights();
      this._toast(`Dica da IA: ${best.san} (${best.from.toUpperCase()} → ${best.to.toUpperCase()})`);
    }
  }

  _undoMove() {
    if (this.gameMode === 'online' || this.gameMode === 'academy' || this.isBotThinking) return;
    if (this.chess.history().length === 0) return;

    this.chess.undo();
    if (this.gameMode === 'bot' && this.chess.turn() !== this.humanColor && this.chess.history().length > 0) {
      this.chess.undo();
    }
    this.moveSnapshots = this.moveSnapshots.slice(0, this.chess.history().length + 1);
    this._saveSnapshots();
    if (this.humanMoveQualities.length > 0) {
      this.humanMoveQualities.pop();
    }
    this.lastCoachMistake = null;
    document.getElementById('coach-alert-banner').classList.add('hidden');
    const latestSnap = this.moveSnapshots[this.moveSnapshots.length - 1];
    this.historyPreviewPly = null;
    this.gameEnded = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.hintMove = null;
    this.lastMove = latestSnap?.lastMove || null;
    this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
    this._renderAll();
  }

  _resignGame() {
    if (this.gameEnded) return;
    if (this.gameMode === 'online') {
      this.multiplayer.resign();
      return;
    }
    this.gameEnded = true;
    audioFX.playGameOver(false);
    const loser = this.gameMode === 'bot' ? this.humanColor : this.chess.turn();
    const winnerLabel = loser === 'w' ? 'Pretas vencem por desistência!' : 'Brancas vencem por desistência!';
    this._updateTurnBanner(winnerLabel);
    this._showGameOver(loser === 'w' ? 'Pretas Venceram!' : 'Brancas Venceram!', 'Por desistência');
    this._toast(winnerLabel);
  }

  _startClockLoop() {
    let presenceTick = 0;
    this.clockInterval = setInterval(() => {
      const now = Date.now();
      const dt = now - this.lastClockTick;
      this.lastClockTick = now;

      presenceTick++;
      if (presenceTick % 5 === 0 && this.gameMode === 'online' && this._onlineRoomSnapshot) {
        const approxServerTime = now - (this._serverClockOffsetMs || 0);
        this._updatePresenceUI(this._onlineRoomSnapshot, approxServerTime);
      }

      if (this.isOrientationBlocked || this.isInMenu || !this.hasActiveMatch || this.gameEnded || this.timeControl.initialSeconds <= 0) return;
      if (this.gameMode === 'online' && this._onlineRoomSnapshot?.status !== 'playing') return;

      const turn = this.chess.turn();
      this.clocks[turn] = Math.max(0, this.clocks[turn] - dt);

      if (this.clocks[turn] <= 0) {
        this.gameEnded = true;
        audioFX.playGameOver(false);
        const msg = turn === 'w' ? 'Tempo esgotado! Pretas vencem.' : 'Tempo esgotado! Brancas vencem.';
        this._updateTurnBanner(msg);
        this._showGameOver(turn === 'w' ? 'Pretas Venceram!' : 'Brancas Venceram!', 'Tempo esgotado');
        this._toast(msg);
      }
      this._renderClocks();
    }, 200);
  }

  _formatClock(ms) {
    if (this.timeControl.initialSeconds <= 0) return '∞';
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  _renderClocks() {
    const wEl = document.getElementById('clock-white');
    const bEl = document.getElementById('clock-black');
    wEl.textContent = this._formatClock(this.clocks.w);
    bEl.textContent = this._formatClock(this.clocks.b);

    const hasTimer = this.timeControl.initialSeconds > 0 && !this.gameEnded && this.hasActiveMatch && !this.isInMenu;
    const wUrgent = hasTimer && this.clocks.w > 0 && this.clocks.w <= 20000;
    const bUrgent = hasTimer && this.clocks.b > 0 && this.clocks.b <= 20000;
    wEl.classList.toggle('clock-urgent', wUrgent);
    bEl.classList.toggle('clock-urgent', bUrgent);

    const turn = this.chess.turn();
    if (hasTimer && this.clocks[turn] <= 20000 && this.clocks[turn] > 0) {
      const secLeft = Math.ceil(this.clocks[turn] / 1000);
      if (this.lastClockAlertSec[turn] !== secLeft) {
        this.lastClockAlertSec[turn] = secLeft;
        audioFX.playClockTick(secLeft <= 10);
      }
    }
  }

  _findKingSquare(color) {
    const board = this.chess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (cell && cell.type === 'k' && cell.color === color) {
          return `${files[f]}${8 - r}`;
        }
      }
    }
    return null;
  }

  _computeThreatMap() {
    if (!this.showThreatMap) return null;
    const perspective = this.gameMode === 'bot' || this.gameMode === 'online' ? this.humanColor : this.chess.turn();
    const opponent = perspective === 'w' ? 'b' : 'w';
    const fenParts = this.chess.fen().split(' ');

    const getControlled = (side) => {
      const set = new Set();
      try {
        const f = `${fenParts[0]} ${side} - - 0 1`;
        const tmp = new Chess(f);
        for (const m of tmp.moves({ verbose: true })) {
          set.add(m.to);
        }
      } catch {
        // fallback if side in check prevents full move gen
      }
      return set;
    };

    const mine = getControlled(perspective);
    const enemy = getControlled(opponent);
    const map = {};
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (const file of files) {
      for (let rank = 1; rank <= 8; rank++) {
        const sq = `${file}${rank}`;
        const hasMine = mine.has(sq);
        const hasEnemy = enemy.has(sq);
        if (hasMine && hasEnemy) map[sq] = 'contested';
        else if (hasEnemy) map[sq] = 'danger';
        else if (hasMine) map[sq] = 'safe';
      }
    }
    return map;
  }

  _renderHighlights() {
    const checkSquare = isGameCheck(this.chess) ? this._findKingSquare(this.chess.turn()) : null;

    this.scene3d.updateHighlights({
      selectedSquare: this.selectedSquare,
      legalMoves: this.legalMoves,
      lastMove: this.lastMove,
      checkSquare,
      hintMove: this.hintMove,
      kothMode: this.variant === 'koth',
      threatMap: this._computeThreatMap(),
    });
  }

  _renderAll(precomputedEval = null) {
    this._renderHighlights();
    this._renderClocks();
    this._renderPlayerCards();
    this._renderMoveHistory();
    this._renderEvalBar(precomputedEval);
    this._renderEvalChart();
    this._updateTurnBanner();
  }

  _renderEvalChart() {
    const canvas = document.getElementById('eval-chart-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0c0c0f';
    ctx.fillRect(0, 0, w, h);

    // Midline (0.0)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const data = this.evalHistory.length > 0 ? this.evalHistory : [0];
    if (data.length === 1) return;

    const toY = (val) => {
      const clamped = Math.max(-8, Math.min(8, val));
      return h / 2 - (clamped / 8) * (h * 0.44);
    };

    // Area fill under curve
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    data.forEach((v, idx) => {
      const x = (idx / (data.length - 1)) * w;
      ctx.lineTo(x, toY(v));
    });
    ctx.lineTo(w, h / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(194, 155, 97, 0.20)';
    ctx.fill();

    // Advantage curve line
    ctx.beginPath();
    data.forEach((v, idx) => {
      const x = (idx / (data.length - 1)) * w;
      const y = toY(v);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#c29b61';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Preview cursor if browsing history
    if (this.historyPreviewPly !== null && this.historyPreviewPly < data.length) {
      const px = (this.historyPreviewPly / (data.length - 1)) * w;
      const py = toY(data[this.historyPreviewPly]);
      ctx.fillStyle = '#e6d7be';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async _startQuickMatch() {
    try {
      this._toast('Procurando partida rápida na nuvem...');
      const res = await this.multiplayer.quickMatch({
        playerName: this._getLocalPlayerName(),
        timeControlSeconds: 600,
        incrementSeconds: 0,
        pieceCustomization: this.customization,
      });
      this._enterOnlineRoom(res.roomId, res.myColor, res.room);
      this._closeModal('modal-online-lobby');
      this._toast(
        res.matched
          ? `Oponente encontrado na sala ${res.roomId}.`
          : `Sala rápida ${res.roomId} criada. Aguardando oponente.`
      );
    } catch (err) {
      this._toast(`Erro no matchmaking: ${err.message}`);
    }
  }

  _startPuzzleMode(idx = 0) {
    this.multiplayer.leaveRoom();
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('key');
    window.history.replaceState({}, '', url.toString());

    this.puzzleIndex = idx % TACTICAL_PUZZLES.length;
    const puz = TACTICAL_PUZZLES[this.puzzleIndex];
    this.currentPuzzle = puz;
    this.currentLesson = null;
    this.lastCoachMistake = null;
    this.humanMoveQualities = [];
    this.gameMode = 'puzzle';
    this.variant = 'standard';
    this.humanColor = puz.playerColor;
    this.timeControl = { initialSeconds: 0, incrementSeconds: 0 };
    this.hasActiveMatch = true;
    this.gameEnded = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.hintMove = null;
    this.historyPreviewPly = null;
    this._onlineMovesList = null;
    this._onlineRoomSnapshot = null;

    this.chess.load(puz.fen);
    this.evalHistory = [evaluateBoardScore(this.chess.fen()).pawns || 0];
    this._resetSnapshots();
    this.moveSnapshots[0].fen = puz.fen;

    document.getElementById('online-panel').classList.add('hidden');
    document.getElementById('academy-panel').classList.add('hidden');
    document.getElementById('coach-alert-banner').classList.add('hidden');
    document.getElementById('btn-draw').classList.add('hidden');
    document.getElementById('btn-undo').classList.add('hidden');
    document.getElementById('move-quality-badge').classList.add('hidden');
    document.getElementById('puzzle-banner').classList.remove('hidden');
    document.getElementById('puzzle-title').textContent = `${this.puzzleIndex + 1}/${TACTICAL_PUZZLES.length}: ${puz.title}`;
    document.getElementById('puzzle-theme').textContent = puz.theme;

    this._hideGameOver();
    this._hideMainMenu();
    this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
    this.scene3d.setCameraView(puz.playerColor);
    this._updateConnectionBadge();
    this._renderAll();
    this._toast(`${puz.title} (${puz.theme}) — Sua vez.`);
  }

  _showPuzzleHint() {
    if (!this.currentPuzzle) return;
    this._toast(`Dica: ${this.currentPuzzle.hint}`);
    this._requestHint();
  }

  _copyPgnAndFen() {
    const pgn = this.chess.pgn() || '(Sem lances ainda)';
    const fen = this.chess.fen();
    const text = `PGN:\n${pgn}\n\nFEN:\n${fen}`;
    navigator.clipboard?.writeText(text).then(
      () => this._toast('PGN e FEN copiados para a área de transferência.'),
      () => this._toast(`FEN: ${fen}`)
    );
  }

  _renderPlayerCards() {
    const activeBoardObj =
      this.historyPreviewPly !== null && this.moveSnapshots[this.historyPreviewPly]
        ? new Chess(this.moveSnapshots[this.historyPreviewPly].fen)
        : this.chess;
    const turn = activeBoardObj.turn();
    document.getElementById('card-white').classList.toggle('active-turn', turn === 'w' && !this.gameEnded);
    document.getElementById('card-black').classList.toggle('active-turn', turn === 'b' && !this.gameEnded);

    const wNameEl = document.getElementById('name-white');
    const bNameEl = document.getElementById('name-black');

    if (this.gameMode === 'bot') {
      const lvl = BOT_LEVELS[this.botLevel];
      const botLabel = `Bot ${lvl.name} (${lvl.elo})`;
      wNameEl.textContent = this.humanColor === 'w' ? 'Você (Brancas)' : botLabel;
      bNameEl.textContent = this.humanColor === 'b' ? 'Você (Pretas)' : botLabel;
    } else if (this.gameMode === 'bot_vs_bot') {
      const lvl = BOT_LEVELS[this.botLevel];
      wNameEl.textContent = `IA Brancas (${lvl.name})`;
      bNameEl.textContent = `IA Pretas (${lvl.name})`;
    } else if (this.gameMode === 'puzzle' && this.currentPuzzle) {
      wNameEl.textContent = this.humanColor === 'w' ? 'Você (Desafio Tático)' : 'Posição do Desafio';
      bNameEl.textContent = this.humanColor === 'b' ? 'Você (Desafio Tático)' : 'Posição do Desafio';
    } else if (this.gameMode === 'academy' && this.currentLesson) {
      wNameEl.textContent = this.humanColor === 'w' ? 'Você (Aluno)' : 'Academia de Xadrez';
      bNameEl.textContent = this.humanColor === 'b' ? 'Você (Aluno)' : 'Academia de Xadrez';
    } else if (this.gameMode === 'online' && this._onlineRoomSnapshot) {
      wNameEl.textContent = this._onlineRoomSnapshot.white?.name || 'Aguardando Brancas...';
      bNameEl.textContent = this._onlineRoomSnapshot.black?.name || 'Aguardando Pretas...';
    } else {
      wNameEl.textContent = 'Jogador Brancas';
      bNameEl.textContent = 'Jogador Pretas';
    }

    const wChecksEl = document.getElementById('checks-white');
    const bChecksEl = document.getElementById('checks-black');
    if (this.variant === 'three_check') {
      wChecksEl.classList.remove('hidden');
      bChecksEl.classList.remove('hidden');
      wChecksEl.textContent = `${this.checksCount.w}/3 ♔`;
      bChecksEl.textContent = `${this.checksCount.b}/3 ♚`;
    } else {
      wChecksEl.classList.add('hidden');
      bChecksEl.classList.add('hidden');
    }

    // Captured & Lost pieces calculation from starting counts
    const startCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const current = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    for (const row of activeBoardObj.board()) {
      for (const cell of row) {
        if (cell && cell.type !== 'k') {
          current[cell.color][cell.type]++;
        }
      }
    }

    const order = ['q', 'r', 'b', 'n', 'p'];
    const capByWhite = [];
    const capByBlack = [];
    let whiteMat = 0;
    let blackMat = 0;
    const vals = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    for (const t of order) {
      const missingBlack = Math.max(0, startCounts[t] - current.b[t]);
      for (let i = 0; i < missingBlack; i++) capByWhite.push(PIECE_UNICODE.b[t]);

      const missingWhite = Math.max(0, startCounts[t] - current.w[t]);
      for (let i = 0; i < missingWhite; i++) capByBlack.push(PIECE_UNICODE.w[t]);

      whiteMat += current.w[t] * vals[t];
      blackMat += current.b[t] * vals[t];
    }

    const lostWhiteCount = capByBlack.length;
    const lostBlackCount = capByWhite.length;
    document.getElementById('lost-by-white').textContent =
      `Perdeu: ${lostWhiteCount} ${lostWhiteCount === 1 ? 'peça' : 'peças'}` +
      (lostWhiteCount > 0 ? ` (${capByBlack.join('')})` : '');
    document.getElementById('lost-by-black').textContent =
      `Perdeu: ${lostBlackCount} ${lostBlackCount === 1 ? 'peça' : 'peças'}` +
      (lostBlackCount > 0 ? ` (${capByWhite.join('')})` : '');

    const diff = whiteMat - blackMat;
    document.getElementById('captured-by-white').textContent =
      (capByWhite.length > 0 ? `Capturou: ${capByWhite.join('')}` : '') + (diff > 0 ? ` (+${diff})` : '');
    document.getElementById('captured-by-black').textContent =
      (capByBlack.length > 0 ? `Capturou: ${capByBlack.join('')}` : '') + (diff < 0 ? ` (+${Math.abs(diff)})` : '');
  }

  _renderMoveHistory() {
    const moves = this._onlineMovesList || this.chess.history();
    const listEl = document.getElementById('move-history-list');
    listEl.innerHTML = '';
    document.getElementById('move-count-badge').textContent = `${moves.length} lances`;

    const openingEl = document.getElementById('opening-name-banner');
    if (openingEl) {
      if (this.gameMode === 'academy' && this.currentLesson) {
        openingEl.textContent = `Estudo: ${this.currentLesson.title}`;
      } else if (this.gameMode === 'puzzle' && this.currentPuzzle) {
        openingEl.textContent = `Desafio: ${this.currentPuzzle.theme}`;
      } else {
        openingEl.textContent = detectOpeningFromHistory(moves);
      }
    }

    const restartBar = document.getElementById('history-restart-bar');
    if (this.historyPreviewPly !== null && this.moveSnapshots[this.historyPreviewPly]) {
      const snap = this.moveSnapshots[this.historyPreviewPly];
      restartBar.classList.remove('hidden');
      document.getElementById('history-restart-label').textContent =
        `Lance #${snap.ply} (${snap.san || 'Início'})`;
    } else {
      restartBar.classList.add('hidden');
    }

    const makeMoveCell = (sanText, plyIdx) => {
      const cell = document.createElement('div');
      let cls = 'move-cell';
      if (sanText) {
        cls += ' clickable';
        if (plyIdx === moves.length) cls += ' latest';
        if (this.historyPreviewPly === plyIdx) cls += ' previewing';
        cell.textContent = sanText;
        cell.title = `Clique para ver e reiniciar a partir do lance #${plyIdx}`;
        cell.addEventListener('click', () => this._previewHistoryPly(plyIdx));
      }
      cell.className = cls;
      return cell;
    };

    for (let i = 0; i < moves.length; i += 2) {
      const numEl = document.createElement('div');
      numEl.className = 'move-num';
      numEl.textContent = `${i / 2 + 1}.`;
      listEl.appendChild(numEl);

      listEl.appendChild(makeMoveCell(moves[i] || '', i + 1));
      listEl.appendChild(makeMoveCell(moves[i + 1] || '', i + 2));
    }
    if (this.historyPreviewPly === null) {
      listEl.scrollTop = listEl.scrollHeight;
    }
  }

  _renderEvalBar(precomputedEval = null) {
    const res = precomputedEval || evaluateBoardScore(this.chess.fen());
    const fill = document.getElementById('eval-bar-fill');
    const lbl = document.getElementById('eval-score-label');

    if (res.mateIn === 0) {
      fill.style.height = res.winner === 'w' ? '100%' : '0%';
      lbl.textContent = 'MATE';
      return;
    }

    const clamped = Math.max(-10, Math.min(10, res.pawns));
    const pct = 50 + (clamped / 10) * 46;
    fill.style.height = `${pct}%`;
    lbl.textContent = `${res.pawns > 0 ? '+' : ''}${res.pawns.toFixed(1)}`;
  }

  _updateTurnBanner(overrideText = null) {
    const banner = document.getElementById('turn-banner');
    banner.classList.remove('is-check');

    if (overrideText) {
      banner.textContent = overrideText;
      return;
    }

    if (this.gameMode === 'online' && this._onlineRoomSnapshot?.status === 'waiting') {
      banner.textContent = `Sala ${this.multiplayer.currentRoomId} — Aguardando oponente entrar...`;
      return;
    }

    if (this.gameMode === 'online' && this._onlineRoomSnapshot?.result) {
      const r = this._onlineRoomSnapshot.result;
      banner.textContent =
        r.winner === 'draw'
          ? `Empate (${r.reason})`
          : `${r.winner === 'w' ? 'Brancas' : 'Pretas'} venceram (${r.reason})!`;
      return;
    }

    if (isGameCheckmate(this.chess)) {
      const winner = this.chess.turn() === 'w' ? 'Pretas' : 'Brancas';
      banner.textContent = `♔ XEQUE-MATE — Vitória das ${winner}`;
      banner.classList.add('is-check');
      return;
    }
    if (isGameDraw(this.chess)) {
      banner.textContent = '½-½ Partida empatada';
      return;
    }

    const sideText = this.chess.turn() === 'w' ? 'Brancas' : 'Pretas';
    if (this.isBotThinking) {
      banner.textContent = `Bot (${BOT_LEVELS[this.botLevel].name}) calculando lance...`;
      return;
    }

    if (isGameCheck(this.chess)) {
      banner.textContent = `XEQUE — Vez das ${sideText}`;
      banner.classList.add('is-check');
    } else {
      banner.textContent = `Vez das ${sideText}`;
    }
  }

  _updateConnectionBadge() {
    const badge = document.getElementById('connection-badge');
    const menuPill = document.getElementById('menu-status-pill');
    const mpMode = this.multiplayer.getMode();
    if (this.gameMode === 'online') {
      if (mpMode === 'cloud') {
        badge.className = 'badge badge-firebase';
        badge.textContent = `Nuvem Online • Sala ${this.multiplayer.currentRoomId}`;
      } else {
        badge.className = 'badge badge-demo';
        badge.textContent = `Demo Local • Sala ${this.multiplayer.currentRoomId}`;
      }
    } else {
      badge.className = mpMode === 'cloud' ? 'badge badge-firebase' : 'badge badge-local';
      badge.textContent = mpMode === 'cloud' ? 'Nuvem Conectada' : 'Local / Bot';
    }
    if (menuPill) {
      menuPill.className = badge.className;
      menuPill.textContent = badge.textContent;
    }
  }

  // ---------- History Snapshots, Point Restart & Real-Time Presence ----------
  _resetSnapshots() {
    this.moveSnapshots = [
      {
        ply: 0,
        san: 'Início',
        fen: new Chess().fen(),
        lastMove: null,
        clocks: { ...this.clocks },
      },
    ];
    this._saveSnapshots();
  }

  _pushMoveSnapshot(moveResult) {
    this.moveSnapshots.push({
      ply: this.moveSnapshots.length,
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      fen: this.chess.fen(),
      lastMove: { from: moveResult.from, to: moveResult.to, san: moveResult.san },
      clocks: { ...this.clocks },
    });
    this._saveSnapshots();
  }

  _saveSnapshots() {
    try {
      localStorage.setItem(MATCH_SNAPSHOTS_KEY, JSON.stringify(this.moveSnapshots));
    } catch {
      // ignore quota errors
    }
  }

  _rebuildSnapshotsFromSanList(sanList) {
    const tmp = new Chess();
    const list = [{ ply: 0, san: 'Início', fen: tmp.fen(), lastMove: null, clocks: { ...this.clocks } }];
    const evals = [0.1];
    for (let i = 0; i < sanList.length; i++) {
      const mv = tmp.move(sanList[i]);
      if (!mv) break;
      const sc = evaluateBoardScore(tmp.fen());
      evals.push(sc.mateIn === 0 ? (sc.winner === 'w' ? 15 : -15) : sc.pawns);
      list.push({
        ply: i + 1,
        san: mv.san,
        from: mv.from,
        to: mv.to,
        fen: tmp.fen(),
        lastMove: { from: mv.from, to: mv.to, san: mv.san },
        clocks: { ...this.clocks },
      });
    }
    this.moveSnapshots = list;
    this.evalHistory = evals;
  }

  _previewHistoryPly(ply) {
    const snap = this.moveSnapshots[ply];
    if (!snap) return;
    this.historyPreviewPly = ply;
    const tmp = new Chess(snap.fen);
    this.scene3d.rebuildAllPieces(tmp.board(), this.customization);
    this.scene3d.updateHighlights({
      selectedSquare: null,
      legalMoves: [],
      lastMove: snap.lastMove,
      checkSquare: null,
      hintMove: null,
      kothMode: this.variant === 'koth',
    });
    this._renderPlayerCards();
    this._renderMoveHistory();
    this._renderEvalChart();
    this._updateTurnBanner(`Visualizando Lance #${ply} (${snap.san}) — clique em "Reiniciar daqui" para jogar deste ponto`);
  }

  _cancelHistoryPreview() {
    this.historyPreviewPly = null;
    this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
    this._renderAll();
  }

  async _restartFromHistoryPly(ply) {
    const snap = this.moveSnapshots[ply];
    if (!snap) return;

    const targetMoves = this.moveSnapshots.slice(1, ply + 1).map((s) => s.san);
    this.chess.reset();
    for (const san of targetMoves) {
      this.chess.move(san);
    }
    this.moveSnapshots = this.moveSnapshots.slice(0, ply + 1);
    this._saveSnapshots();

    this.historyPreviewPly = null;
    this.gameEnded = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.hintMove = null;
    this.lastCoachMistake = null;
    document.getElementById('coach-alert-banner').classList.add('hidden');
    this.lastMove = snap.lastMove || null;
    if (snap.clocks) {
      this.clocks = { ...snap.clocks };
    }
    this._hideGameOver();
    this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
    this._renderAll();

    if (this.gameMode === 'online') {
      await this.multiplayer.sendMove({
        fen: this.chess.fen(),
        turn: this.chess.turn(),
        lastMove: this.lastMove,
        moves: targetMoves,
        whiteTimeLeftMs: this.clocks.w,
        blackTimeLeftMs: this.clocks.b,
        result: null,
      });
      this._toast(`Partida reiniciada a partir do lance #${ply} (${snap.san})!`);
    } else {
      this._toast(`Partida reiniciada do lance #${ply} (${snap.san})!`);
      this._maybeTriggerBotTurn();
    }
  }

  _hidePresencePills() {
    document.getElementById('presence-white').classList.add('hidden');
    document.getElementById('presence-black').classList.add('hidden');
  }

  _getPlayerPresenceInfo(playerObj, nowMs) {
    if (!playerObj) {
      return { key: 'waiting', label: '○ Aguardando', cls: 'presence-pill presence-waiting' };
    }
    const age = nowMs - (playerObj.lastSeen || 0);
    if (playerObj.connected === false || age > 20000) {
      return { key: 'offline', label: '● Desconectado', cls: 'presence-pill presence-offline' };
    }
    if (age > 9000) {
      return { key: 'away', label: '◐ Reconectando...', cls: 'presence-pill presence-away' };
    }
    return { key: 'online', label: '● Conectado', cls: 'presence-pill presence-online' };
  }

  _updatePresenceUI(room, nowMs) {
    const wInfo = this._getPlayerPresenceInfo(room.white, nowMs);
    const bInfo = this._getPlayerPresenceInfo(room.black, nowMs);

    const wEl = document.getElementById('presence-white');
    wEl.textContent = wInfo.label;
    wEl.className = wInfo.cls;

    const bEl = document.getElementById('presence-black');
    bEl.textContent = bInfo.label;
    bEl.className = bInfo.cls;

    const oppInfo = this.multiplayer.myColor === 'b' ? wInfo : bInfo;
    const oppObj = this.multiplayer.myColor === 'b' ? room.white : room.black;
    const oppName = oppObj?.name || 'Oponente';
    const bannerEl = document.getElementById('opponent-presence-banner');

    if (!oppObj) {
      bannerEl.textContent = 'Aguardando o outro jogador entrar na sala...';
    } else if (oppInfo.key === 'online') {
      bannerEl.textContent = `● ${oppName} está conectado em tempo real`;
    } else if (oppInfo.key === 'away') {
      bannerEl.textContent = `◐ ${oppName} com conexão instável...`;
    } else {
      bannerEl.textContent = `● ${oppName} desconectou da partida`;
    }

    if (this._lastOpponentStatusKey && this._lastOpponentStatusKey !== oppInfo.key) {
      if (oppInfo.key === 'online') this._toast(`${oppName} conectou.`);
      else if (oppInfo.key === 'offline') this._toast(`${oppName} desconectou da sala.`);
      else if (oppInfo.key === 'away') this._toast(`${oppName} está reconectando...`);
    }
    this._lastOpponentStatusKey = oppInfo.key;
  }

  // ---------- Main Menu & Game Over Controls ----------
  _showMainMenu() {
    this.isInMenu = true;
    const screen = document.getElementById('main-menu-screen');
    screen.classList.remove('hidden');

    const resumeBtn = document.getElementById('btn-resume-game');
    const summaryEl = document.getElementById('resume-match-summary');
    resumeBtn.classList.toggle('hidden', !this.hasActiveMatch);
    if (this.hasActiveMatch && summaryEl) {
      const moveCount = (this._onlineMovesList || this.chess.history()).length;
      const modeNames = {
        bot: `Vs Bot (${BOT_LEVELS[this.botLevel]?.name || 'Clube'})`,
        local: 'Local 2 Jogadores',
        bot_vs_bot: 'Bot vs Bot',
        academy: `Academia • ${this.currentLesson?.title || 'Estudo'}`,
        puzzle: 'Desafio Tático',
        online: `Online • Sala ${this.multiplayer.currentRoomId}`,
      };
      summaryEl.textContent = `${modeNames[this.gameMode] || 'Partida'} • ${moveCount} lances`;
    }

    this.scene3d.setMenuOrbit(true);
    this._updateConnectionBadge();
  }

  _hideMainMenu() {
    this.isInMenu = false;
    this.lastClockTick = Date.now();
    document.getElementById('main-menu-screen').classList.add('hidden');
    this.scene3d.setMenuOrbit(false);
    this.scene3d.setCameraView(
      this.gameMode === 'bot' || this.gameMode === 'online' || this.gameMode === 'academy' || this.gameMode === 'puzzle'
        ? this.humanColor
        : 'w'
    );
  }

  _selectNewGameMode(mode) {
    this.selectedNewGameMode = mode;
    document.querySelectorAll('.mode-option').forEach((o) => {
      o.classList.toggle('active', o.dataset.mode === mode);
    });
    document.getElementById('bot-options-group').classList.toggle('hidden', mode === 'local');
  }

  _openNewGameModal(presetMode = null) {
    if (presetMode) {
      this._selectNewGameMode(presetMode);
    }
    this._openModal('modal-new-game');
  }

  _showGameOver(title, reason) {
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('gameover-reason').textContent = reason;

    const accEl = document.getElementById('gameover-accuracy');
    if (accEl) {
      if (this.humanMoveQualities.length >= 2 && this.gameMode !== 'puzzle' && this.gameMode !== 'academy') {
        const scoreMap = { '!!': 100, '!': 98, '✓': 92, '?!': 65, '??': 22 };
        const total = this.humanMoveQualities.reduce((sum, item) => sum + (scoreMap[item.symbol] ?? 85), 0);
        const pct = Math.round(total / this.humanMoveQualities.length);
        const blunders = this.humanMoveQualities.filter((i) => i.symbol === '??').length;
        const inaccuracies = this.humanMoveQualities.filter((i) => i.symbol === '?!').length;
        accEl.textContent = `Precisão Estimada: ${pct}% (${this.humanMoveQualities.length} lances • ${blunders} erros graves • ${inaccuracies} imprecisões)`;
        accEl.classList.remove('hidden');
      } else {
        accEl.classList.add('hidden');
      }
    }

    document.getElementById('gameover-card').classList.remove('hidden');
  }

  _hideGameOver() {
    document.getElementById('gameover-card').classList.add('hidden');
  }

  // ---------- Modals ----------
  _openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  _closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    if (id === 'modal-piece-studio') {
      this.previewStudio.stop();
    }
  }

  _openPieceStudio() {
    this._openModal('modal-piece-studio');
    this._populateStudioControls();
    this.previewStudio.resize();
    this._refreshStudioPreview();
    this.previewStudio.start();
  }

  _populateStudioControls() {
    const sampleType = this.studioTarget === 'all' ? 'k' : this.studioTarget;
    const cfg = this.customization.pieces[sampleType];

    document.getElementById('studio-style-select').value = cfg.style;
    document.getElementById('studio-preset-select').value = cfg.preset || 'marble_imperial';
    document.getElementById('studio-white-color').value = cfg.whiteColor;
    document.getElementById('studio-black-color').value = cfg.blackColor;
    document.getElementById('studio-accent-color').value = cfg.accentColor;

    document.getElementById('studio-metalness').value = cfg.metalness;
    document.getElementById('val-metalness').textContent = Number(cfg.metalness).toFixed(2);

    document.getElementById('studio-roughness').value = cfg.roughness;
    document.getElementById('val-roughness').textContent = Number(cfg.roughness).toFixed(2);

    document.getElementById('studio-emissive').value = cfg.emissiveIntensity;
    document.getElementById('val-emissive').textContent = Number(cfg.emissiveIntensity).toFixed(2);

    document.getElementById('studio-transmission').value = cfg.transmission || 0;
    document.getElementById('val-transmission').textContent = Number(cfg.transmission || 0).toFixed(2);

    document.getElementById('studio-height').value = cfg.heightScale || 1.0;
    document.getElementById('val-height').textContent = `${Number(cfg.heightScale || 1.0).toFixed(2)}x`;
  }

  _refreshStudioPreview() {
    const sampleType = this.studioTarget === 'all' ? 'k' : this.studioTarget;
    const cfg = this.customization.pieces[sampleType];
    this.previewStudio.updatePiece(sampleType, this.studioPreviewSide, cfg);
    const badge = document.getElementById('studio-hero-badge');
    if (badge) {
      badge.textContent = getHeroStyleBadgeText(cfg.style, sampleType, this.studioPreviewSide);
    }
  }

  _openOnlineLobby() {
    const banner = document.getElementById('lobby-mode-banner');
    if (this.multiplayer.getMode() === 'cloud') {
      banner.innerHTML =
        '<strong>Nuvem Conectada:</strong> Suas salas são sincronizadas em tempo real pelo servidor com detecção de presença dos jogadores.';
    } else {
      banner.innerHTML =
        '<strong>Modo Demo Multi-Aba Ativo:</strong> Você pode criar uma sala agora e testar entre duas abas do navegador, ou clicar em <strong>Ajustes</strong> para ativar o modo nuvem.';
    }
    this._openModal('modal-online-lobby');
    this._refreshPublicRooms();
  }

  async _refreshPublicRooms() {
    const listEl = document.getElementById('public-rooms-list');
    listEl.innerHTML = '<small class="hint-text">Buscando salas...</small>';
    try {
      const rooms = await this.multiplayer.listPublicRooms();
      listEl.innerHTML = '';
      if (rooms.length === 0) {
        listEl.innerHTML = '<small class="hint-text">Nenhuma sala aberta no momento. Crie uma nova!</small>';
        return;
      }
      rooms.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'room-item';
        const hostName = r.white?.name || r.black?.name || 'Anfitrião';
        const statusLabel = r.status === 'waiting' ? 'Aguardando' : r.status === 'playing' ? 'Em jogo' : 'Finalizada';
        div.innerHTML = `
          <div>
            <strong class="mono">${r.roomId}</strong> • ${this._escapeHtml(hostName)}
            <small class="hint-text">(${statusLabel})</small>
          </div>
          <button class="btn btn-xs btn-accent">Entrar</button>
        `;
        div.querySelector('button').addEventListener('click', () => this._joinOnlineRoomByCode(r.roomId));
        listEl.appendChild(div);
      });
    } catch (err) {
      listEl.innerHTML = `<small class="hint-text">Erro ao listar salas: ${this._escapeHtml(err.message)}</small>`;
    }
  }

  async _openFirebaseModal() {
    const statusEl = document.getElementById('firebase-status-msg');
    this._openModal('modal-firebase');
    statusEl.textContent = 'Verificando conexão com o servidor...';
    const st = await this.multiplayer.checkCloudStatus();
    if (st.ok) {
      statusEl.textContent = `Status: Nuvem Conectada (Latência: ${st.pingMs ?? '-'} ms).`;
    } else {
      statusEl.textContent = 'Status: Modo Demo Multi-Aba Local ativo.';
    }
    this._updateConnectionBadge();
  }

  // ---------- Chess Learning Academy ----------
  _openAcademyModal(trackId = null) {
    if (trackId) this.academyTrackId = trackId;
    this._renderAcademyCatalog();
    this._openModal('modal-academy');
  }

  _renderAcademyCatalog() {
    const progressEl = document.getElementById('academy-overall-progress');
    if (progressEl) {
      progressEl.textContent = `${this.academyCompleted.size}/${LEARNING_LESSONS.length} lições concluídas`;
    }

    const tabsEl = document.getElementById('academy-track-tabs');
    const lessonsEl = document.getElementById('academy-lessons-list');
    const encycEl = document.getElementById('academy-encyclopedia-view');
    if (!tabsEl || !lessonsEl || !encycEl) return;

    tabsEl.innerHTML = '';
    const tracksWithEncyc = [
      ...LEARNING_TRACKS,
      { id: 'encyclopedia', title: 'Enciclopédia & Guias', icon: '§', description: 'Teoria essencial' },
    ];

    tracksWithEncyc.forEach((tr) => {
      const btn = document.createElement('button');
      btn.className = `academy-tab-btn ${this.academyTrackId === tr.id ? 'active' : ''}`;
      if (tr.id === 'encyclopedia') {
        btn.textContent = `${tr.icon} ${tr.title}`;
      } else {
        const trackLessons = LEARNING_LESSONS.filter((l) => l.trackId === tr.id);
        const doneCount = trackLessons.filter((l) => this.academyCompleted.has(l.id)).length;
        btn.textContent = `${tr.icon} ${tr.title} (${doneCount}/${trackLessons.length})`;
      }
      btn.addEventListener('click', () => {
        this.academyTrackId = tr.id;
        this._renderAcademyCatalog();
      });
      tabsEl.appendChild(btn);
    });

    if (this.academyTrackId === 'encyclopedia') {
      lessonsEl.classList.add('hidden');
      encycEl.classList.remove('hidden');
      encycEl.innerHTML = '';
      CHESS_ENCYCLOPEDIA.forEach((entry) => {
        const card = document.createElement('div');
        card.className = 'encyc-card';
        const itemsHtml = entry.bullets.map((b) => `<li>${this._escapeHtml(b)}</li>`).join('');
        card.innerHTML = `
          <h4>${this._escapeHtml(entry.title)}</h4>
          <p>${this._escapeHtml(entry.summary)}</p>
          <ul>${itemsHtml}</ul>
        `;
        encycEl.appendChild(card);
      });
      return;
    }

    encycEl.classList.add('hidden');
    lessonsEl.classList.remove('hidden');
    lessonsEl.innerHTML = '';

    const filtered = LEARNING_LESSONS.filter((l) => l.trackId === this.academyTrackId);
    filtered.forEach((lesson) => {
      const isDone = this.academyCompleted.has(lesson.id);
      const card = document.createElement('button');
      card.className = `academy-lesson-card ${isDone ? 'completed' : ''}`;
      card.innerHTML = `
        <div class="academy-lesson-top">
          <strong>${this._escapeHtml(lesson.title)}</strong>
          <span class="badge ${isDone ? 'badge-cloud' : 'badge-demo'}">${isDone ? '✓ Feita' : lesson.difficulty}</span>
        </div>
        <div class="academy-lesson-meta">
          <span>Jogar com: ${lesson.playerColor === 'b' ? 'Pretas ♚' : 'Brancas ♔'}</span>
          <span>${lesson.steps.length} ${lesson.steps.length === 1 ? 'passo' : 'passos'}</span>
        </div>
        <p class="academy-lesson-concept">${this._escapeHtml(lesson.keyConcept)}</p>
      `;
      card.addEventListener('click', () => {
        this._closeModal('modal-academy');
        this._startAcademyLesson(lesson.id);
      });
      lessonsEl.appendChild(card);
    });
  }

  _startAcademyLesson(lessonId) {
    const lesson = LEARNING_LESSONS.find((l) => l.id === lessonId) || LEARNING_LESSONS[0];
    if (!lesson) return;

    this.multiplayer.leaveRoom();
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('key');
    window.history.replaceState({}, '', url.toString());

    this.gameMode = 'academy';
    this.variant = 'standard';
    this.checksCount = { w: 0, b: 0 };
    this.currentPuzzle = null;
    this.currentLesson = lesson;
    this.academyTrackId = lesson.trackId;
    this.academyStepIndex = 0;
    this.lastCoachMistake = null;
    this.humanMoveQualities = [];
    this.humanColor = lesson.playerColor || 'w';
    this.timeControl = { initialSeconds: 0, incrementSeconds: 0 };
    this.hasActiveMatch = true;
    this.gameEnded = false;
    this.isBotThinking = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.hintMove = null;
    this.historyPreviewPly = null;
    this._onlineMovesList = null;
    this._onlineRoomSnapshot = null;

    this.chess.load(lesson.fen);
    this.evalHistory = [evaluateBoardScore(this.chess.fen()).pawns || 0];
    this._resetSnapshots();
    this.moveSnapshots[0].fen = lesson.fen;

    document.getElementById('online-panel').classList.add('hidden');
    document.getElementById('puzzle-banner').classList.add('hidden');
    document.getElementById('coach-alert-banner').classList.add('hidden');
    document.getElementById('btn-draw').classList.add('hidden');
    document.getElementById('btn-undo').classList.add('hidden');
    document.getElementById('move-quality-badge').classList.add('hidden');

    document.getElementById('academy-panel').classList.remove('hidden');
    document.getElementById('academy-title').textContent = lesson.title;
    document.getElementById('academy-progress-badge').textContent = `Passo 1/${lesson.steps.length}`;
    document.getElementById('academy-step-text').textContent = lesson.intro;

    this._hideGameOver();
    this._hideMainMenu();
    this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
    this.scene3d.setCameraView(this.humanColor);
    this._updateConnectionBadge();
    this._renderAll();
    this._toast(`${lesson.title} — ${lesson.difficulty}`);
  }

  _handleAcademyMove(result, nextEvalScore) {
    const lesson = this.currentLesson;
    const step = lesson?.steps[this.academyStepIndex];
    if (!lesson || !step) return;

    const stripCheck = (s) => String(s || '').replace(/[+#]$/, '');
    const expectedList = step.expected || [];
    const matched =
      expectedList.includes(result.san) ||
      expectedList.some((exp) => stripCheck(exp) === stripCheck(result.san)) ||
      (expectedList.some((exp) => exp.endsWith('#')) && isGameCheckmate(this.chess));

    const badgeEl = document.getElementById('academy-progress-badge');
    const textEl = document.getElementById('academy-step-text');

    if (!matched) {
      audioFX.playCheck();
      if (textEl) textEl.textContent = `Quase! "${result.san}" não segue o plano desta lição. Dica: ${step.hint}`;
      this._renderAll(nextEvalScore);
      setTimeout(() => {
        if (this.gameMode === 'academy' && this.currentLesson?.id === lesson.id) {
          this.chess.undo();
          this.moveSnapshots.pop();
          this.evalHistory.pop();
          this.lastMove = this.moveSnapshots[this.moveSnapshots.length - 1]?.lastMove || null;
          this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
          this._renderAll();
        }
      }, 750);
      return;
    }

    const advanceStepOrFinish = () => {
      this.academyStepIndex++;
      if (this.academyStepIndex >= lesson.steps.length) {
        this.gameEnded = true;
        this.academyCompleted.add(lesson.id);
        this._saveAcademyProgress();
        audioFX.playPromote();
        if (badgeEl) badgeEl.textContent = '✓ Concluída';
        if (textEl) textEl.textContent = `✓ ${step.explain} — Lição concluída! Clique em "Próxima →" para continuar.`;
        this._renderAll(nextEvalScore);
        this._updateTurnBanner(`Lição Concluída: ${lesson.title}`);
        this._toast(`Lição "${lesson.title}" concluída e salva!`);
      } else {
        if (badgeEl) badgeEl.textContent = `Passo ${this.academyStepIndex + 1}/${lesson.steps.length}`;
        if (textEl) textEl.textContent = `✓ ${step.explain} → Encontre agora o passo ${this.academyStepIndex + 1}.`;
        this._renderAll();
      }
    };

    if (step.reply) {
      if (textEl) textEl.textContent = `✓ ${step.explain}`;
      this._renderAll(nextEvalScore);
      this.isBotThinking = true;
      setTimeout(() => {
        this.isBotThinking = false;
        if (this.gameMode !== 'academy' || this.currentLesson?.id !== lesson.id) return;
        const replyRes = this.chess.move(step.reply);
        if (replyRes) {
          this.lastMove = { from: replyRes.from, to: replyRes.to, san: replyRes.san };
          this._pushMoveSnapshot(replyRes);
          const replyEval = evaluateBoardScore(this.chess.fen());
          const replyPawns = replyEval.mateIn === 0 ? (replyEval.winner === 'w' ? 15 : -15) : replyEval.pawns;
          this.evalHistory.push(replyPawns);
          this.scene3d.syncBoard(this.chess.board(), this.customization, { from: replyRes.from, to: replyRes.to });
          if (isGameCheck(this.chess)) audioFX.playCheck();
          else if (replyRes.captured) audioFX.playCapture();
          else audioFX.playMove();
        }
        advanceStepOrFinish();
      }, 520);
    } else {
      advanceStepOrFinish();
    }
  }

  _showAcademyHint() {
    const step = this.currentLesson?.steps[this.academyStepIndex];
    if (!step) return;
    const textEl = document.getElementById('academy-step-text');
    if (textEl) textEl.textContent = `Dica: ${step.hint}`;

    const copy = new Chess(this.chess.fen());
    const mv = copy.move(step.expected[0]);
    if (mv) {
      this.hintMove = { from: mv.from, to: mv.to };
      this._renderHighlights();
    }
  }

  _demoAcademyStep() {
    if (this.gameMode !== 'academy' || this.gameEnded || this.isBotThinking) return;
    const step = this.currentLesson?.steps[this.academyStepIndex];
    if (!step?.expected?.[0]) return;
    const copy = new Chess(this.chess.fen());
    const mv = copy.move(step.expected[0]);
    if (mv) {
      this._commitMove({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
    }
  }

  _startNextAcademyLesson() {
    if (!this.currentLesson) {
      this._startAcademyLesson(LEARNING_LESSONS[0].id);
      return;
    }
    const idx = LEARNING_LESSONS.findIndex((l) => l.id === this.currentLesson.id);
    const nextLesson = LEARNING_LESSONS[(idx + 1) % LEARNING_LESSONS.length];
    this._startAcademyLesson(nextLesson.id);
  }

  // ---------- Friends & Real-Time Direct Challenge System ----------
  _getSocialPresenceState() {
    const modeLabel =
      this.gameMode === 'online'
        ? `Sala ${this.multiplayer.currentRoomId || ''}`
        : this.gameMode === 'academy'
        ? 'Estudando na Academia'
        : this.gameMode === 'puzzle'
        ? 'Desafios Táticos'
        : 'Em partida';
    return {
      playerName: this._getLocalPlayerName(),
      status: this.isInMenu ? 'online' : 'in_game',
      activityText: this.isInMenu ? 'No menu / disponível' : modeLabel,
    };
  }

  async _onSocialUpdate(data) {
    if (!data) return;
    this.socialData = data;

    const myTagEl = document.getElementById('my-friend-tag');
    if (myTagEl) myTagEl.textContent = data.profile?.friendTag || this.multiplayer.friendTag;

    const pendingCount = (data.incomingRequests?.length || 0) + (data.incomingChallenges?.length || 0);
    const badgeEl = document.getElementById('friends-notif-badge');
    if (badgeEl) {
      badgeEl.textContent = String(pendingCount);
      badgeEl.classList.toggle('hidden', pendingCount === 0);
    }

    const challengeBanner = document.getElementById('challenge-banner');
    const incoming = data.incomingChallenges || [];
    if (incoming.length > 0 && challengeBanner) {
      const ch = incoming[0];
      const cid = ch.challengeId || ch.id;
      const activeCid = this.activeIncomingChallenge?.challengeId || this.activeIncomingChallenge?.id;
      if (!this.activeIncomingChallenge || activeCid !== cid) {
        this.activeIncomingChallenge = ch;
        const initSec = ch.timeControl?.initialSeconds ?? ch.timeControlSeconds ?? 600;
        const incSec = ch.timeControl?.incrementSeconds ?? ch.incrementSeconds ?? 0;
        const mins = initSec > 0 ? `${Math.round(initSec / 60)}+${incSec}` : 'Sem relógio';
        document.getElementById('challenge-banner-text').textContent =
          `${ch.fromName} (${ch.fromTag || ''}) convidou você para jogar (${mins}) em sala privada!`;
        challengeBanner.classList.remove('hidden');
        this._toast(`Novo desafio de ${ch.fromName}!`);
      }
    } else if (challengeBanner && this.activeIncomingChallenge) {
      challengeBanner.classList.add('hidden');
      this.activeIncomingChallenge = null;
    }

    const accepted = data.acceptedChallenges || [];
    for (const acc of accepted) {
      const acid = acc.challengeId || acc.id;
      if (this._handledAcceptedChallenges.has(acid)) continue;
      this._handledAcceptedChallenges.add(acid);
      try {
        await this.multiplayer.ackChallenge(acid);
        this._toast(`${acc.toName || 'Seu amigo'} aceitou seu desafio! Abrindo sala privada ${acc.roomId}...`);
        await this._joinOnlineRoomByCode(acc.roomId, acc.accessKey || '');
      } catch (err) {
        this._toast(`Erro ao conectar na sala do desafio: ${err.message}`);
      }
      break;
    }

    const modalEl = document.getElementById('modal-friends');
    if (modalEl && !modalEl.classList.contains('hidden')) {
      this._renderFriendsModal();
    }
  }

  _openFriendsModal() {
    const friendInp = document.getElementById('friends-player-name-input');
    if (friendInp) friendInp.value = this._getLocalPlayerName();
    const myTagEl = document.getElementById('my-friend-tag');
    if (myTagEl) myTagEl.textContent = this.multiplayer.friendTag;

    this._renderFriendsModal();
    this._openModal('modal-friends');
    this.multiplayer.refreshSocial?.();
  }

  _renderFriendsModal() {
    const reqListEl = document.getElementById('friend-requests-list');
    const friendsListEl = document.getElementById('friends-list');
    if (!reqListEl || !friendsListEl) return;

    const reqs = this.socialData?.incomingRequests || [];
    reqListEl.innerHTML = '';
    if (reqs.length === 0) {
      reqListEl.innerHTML = '<small class="hint-text">Nenhuma solicitação pendente.</small>';
    } else {
      reqs.forEach((r) => {
        const uid = r.uid || r.fromUid;
        const name = r.name || r.fromName || 'Jogador';
        const tag = r.friendTag || r.fromTag || uid;
        const row = document.createElement('div');
        row.className = 'friend-row';
        row.innerHTML = `
          <div class="friend-row-info">
            <span class="friend-row-name">${this._escapeHtml(name)}</span>
            <span class="friend-row-sub mono">${this._escapeHtml(tag)}</span>
          </div>
          <div class="friend-row-actions">
            <button class="btn btn-xs btn-primary" data-act="accept">Aceitar</button>
            <button class="btn btn-xs btn-ghost" data-act="reject">Recusar</button>
          </div>
        `;
        row.querySelector('[data-act="accept"]').addEventListener('click', async () => {
          await this.multiplayer.respondFriendRequest(uid, true);
          this._toast(`Agora vocês são amigos!`);
          await this.multiplayer.refreshSocial?.();
        });
        row.querySelector('[data-act="reject"]').addEventListener('click', async () => {
          await this.multiplayer.respondFriendRequest(uid, false);
          await this.multiplayer.refreshSocial?.();
        });
        reqListEl.appendChild(row);
      });
    }

    const friends = this.socialData?.friends || [];
    friendsListEl.innerHTML = '';
    if (friends.length === 0) {
      friendsListEl.innerHTML = '<small class="hint-text">Adicione amigos informando a Tag (#) deles.</small>';
      return;
    }

    friends.forEach((f) => {
      const state = f.onlineState || 'offline';
      const statusText =
        state === 'online'
          ? '● Online agora'
          : state === 'in_game'
          ? `◐ ${f.activityText || 'Em partida'}`
          : '○ Offline';
      const row = document.createElement('div');
      row.className = 'friend-row';
      row.innerHTML = `
        <div class="friend-row-info">
          <div class="friend-row-name">
            <span class="friend-status-dot ${this._escapeHtml(state)}"></span>
            <span>${this._escapeHtml(f.name || 'Amigo')}</span>
          </div>
          <span class="friend-row-sub mono">${this._escapeHtml(f.friendTag || '')} • ${this._escapeHtml(statusText)}</span>
        </div>
        <div class="friend-row-actions">
          <button class="btn btn-xs btn-primary" data-act="challenge" ${state === 'offline' ? 'disabled' : ''}>Desafiar</button>
          <button class="btn btn-xs btn-ghost" data-act="remove" title="Remover amigo">✕</button>
        </div>
      `;
      row.querySelector('[data-act="challenge"]').addEventListener('click', async () => {
        try {
          const [sec, inc] = (document.getElementById('friends-challenge-time')?.value || '600|0')
            .split('|')
            .map(Number);
          await this.multiplayer.sendGameChallenge(f.uid, {
            playerName: this._getLocalPlayerName(),
            timeControlSeconds: sec,
            incrementSeconds: inc,
          });
          this._toast(`Desafio enviado para ${f.name}! Quando aceitar, a sala privada abrirá automaticamente.`);
        } catch (err) {
          this._toast(`Erro ao desafiar: ${err.message}`);
        }
      });
      row.querySelector('[data-act="remove"]').addEventListener('click', async () => {
        await this.multiplayer.removeFriend(f.uid);
        await this.multiplayer.refreshSocial?.();
        this._toast(`${f.name} removido da lista.`);
      });
      friendsListEl.appendChild(row);
    });
  }

  // ---------- Mobile Mandatory Landscape & Touch Fullscreen UX ----------
  _initMobileExperience() {
    const lockBtn = document.getElementById('btn-lock-landscape-fullscreen');
    const fsBtn = document.getElementById('btn-fullscreen-toggle');
    const hudToggleBtn = document.getElementById('btn-toggle-hud');

    lockBtn?.addEventListener('click', () => this._enterLandscapeFullscreen());
    fsBtn?.addEventListener('click', () => this._toggleFullscreen());

    hudToggleBtn?.addEventListener('click', () => {
      this.isHudCollapsed = !this.isHudCollapsed;
      document.body.classList.toggle('hud-collapsed', this.isHudCollapsed);
      hudToggleBtn.textContent = this.isHudCollapsed ? '◂ Painel' : 'Painel ▸';
      this.scene3d.resize();
      setTimeout(() => this.scene3d.resize(), 120);
    });

    const updateFsLabel = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (fsBtn) {
        fsBtn.textContent = isFs ? '✕ Sair Tela Cheia' : '⛶ Tela Cheia';
      }
      this.scene3d.resize();
      setTimeout(() => this.scene3d.resize(), 180);
    };

    document.addEventListener('fullscreenchange', updateFsLabel);
    document.addEventListener('webkitfullscreenchange', updateFsLabel);

    const onViewportChange = () => this._updateOrientationLock();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', () => {
      setTimeout(onViewportChange, 150);
      setTimeout(onViewportChange, 380);
    });
    window.visualViewport?.addEventListener('resize', onViewportChange);
    if (screen.orientation?.addEventListener) {
      screen.orientation.addEventListener('change', onViewportChange);
    }

    this._updateOrientationLock();
  }

  _updateOrientationLock() {
    const isCoarse = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
    const isMobileUa = /Android|iPhone|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || '');
    const isPhoneSize = Math.min(window.innerWidth, window.innerHeight) <= 760;
    const isPortrait = window.innerHeight > window.innerWidth;
    const blocked = (isCoarse || isMobileUa) && isPhoneSize && isPortrait;

    const wasBlocked = this.isOrientationBlocked;
    this.isOrientationBlocked = blocked;
    document.body.classList.toggle('force-landscape-block', blocked);

    if (wasBlocked && !blocked) {
      this.lastClockTick = Date.now();
      this.scene3d.resize();
      setTimeout(() => this.scene3d.resize(), 220);
      setTimeout(() => this.scene3d.resize(), 450);
    }
  }

  async _enterLandscapeFullscreen() {
    const hintEl = document.getElementById('rotate-device-hint');
    try {
      const root = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (root.requestFullscreen) {
          await root.requestFullscreen({ navigationUI: 'hide' });
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        }
      }
    } catch {
      // ignore fullscreen rejection
    }

    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock('landscape');
        this._updateOrientationLock();
        return;
      }
    } catch {
      // iOS / browsers that block programmatic lock require manual device rotation
    }

    if (hintEl) {
      hintEl.textContent =
        'No iPhone/iOS ou caso não gire automaticamente, desbloqueie a rotação da tela no aparelho e vire-o de lado.';
    }
    this._updateOrientationLock();
  }

  async _toggleFullscreen() {
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    try {
      if (isFs) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } else {
        await this._enterLandscapeFullscreen();
      }
    } catch {
      this._toast('Use o botão de rotação do celular ou adicione à Tela Inicial.');
    }
  }

  _toast(message) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3600);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__chessApp = new ChessRoyaleApp();
});
