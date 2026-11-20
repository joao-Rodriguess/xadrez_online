import { Chess } from 'chess.js';
import { Scene3D, BOARD_THEMES } from './scene3D.js';
import {
  PIECE_TYPES,
  GEOMETRY_STYLES,
  MATERIAL_PRESETS,
  PiecePreviewStudio,
  createDefaultCustomization,
  createDefaultPieceConfig,
} from './pieceBuilder3D.js';
import {
  BOT_LEVELS,
  getBestMove,
  evaluateBoardScore,
  isGameCheck,
  isGameCheckmate,
  isGameDraw,
  isGameOver,
} from './botAI.js';
import { MultiplayerManager } from './firebaseMultiplayer.js';
import { audioFX } from './audioFX.js';

const CUSTOMIZATION_STORAGE_KEY = 'chess3d_piece_customization_v1';
const MATCH_SNAPSHOTS_KEY = 'chess3d_match_snapshots_v1';
const PIECE_UNICODE = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

class ChessRoyaleApp {
  constructor() {
    this.chess = new Chess();
    this.multiplayer = new MultiplayerManager();

    this.gameMode = 'bot'; // 'bot' | 'local' | 'bot_vs_bot' | 'online'
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
    this.hasActiveMatch = false;
    this.moveSnapshots = [];
    this.historyPreviewPly = null;
    this._lastOpponentStatusKey = null;
    this._serverClockOffsetMs = 0;
    this.lastGameConfig = {
      mode: 'bot',
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
    this._startClockLoop();
    this._renderAll();
    this._showMainMenu();
    this.multiplayer.checkCloudStatus().then(() => {
      this._updateConnectionBadge();
    });
    this._checkUrlInvite();
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
    this.scene3d.syncBoard(this.chess.board(), this.customization);

    const studioCanvas = document.getElementById('studio-preview-canvas');
    this.previewStudio = new PiecePreviewStudio(studioCanvas);
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
        themeSelectors.forEach((other) => {
          other.value = val;
        });
      });
    });

    // Camera presets
    document.querySelectorAll('.cam-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.scene3d.setCameraView(btn.dataset.cam);
      });
    });

    // Sound toggle & Settings sync
    const soundBtn = document.getElementById('btn-sound-toggle');
    const soundChk = document.getElementById('chk-settings-sound');
    const applySoundState = (enabled) => {
      audioFX.setEnabled(enabled);
      soundBtn.textContent = enabled ? '🔊 Som' : '🔇 Mudo';
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
    document.getElementById('btn-piece-studio').addEventListener('click', () => this._openPieceStudio());
    document.getElementById('btn-online-lobby').addEventListener('click', () => this._openOnlineLobby());
    document.getElementById('btn-firebase-config').addEventListener('click', () => this._openFirebaseModal());

    // Main Menu 6 Action Cards
    document.querySelectorAll('[data-menu-action]').forEach((card) => {
      card.addEventListener('click', () => {
        const act = card.dataset.menuAction;
        if (act === 'bot' || act === 'local' || act === 'bot_vs_bot') {
          this._openNewGameModal(act);
        } else if (act === 'online') {
          this._openOnlineLobby();
        } else if (act === 'studio') {
          this._openPieceStudio();
        } else if (act === 'settings') {
          this._openFirebaseModal();
        }
      });
    });

    // Game Over Overlay actions
    document.getElementById('btn-gameover-rematch').addEventListener('click', () => {
      if (this.gameMode === 'online') {
        this.multiplayer.requestRematch();
        this._toast('Pedido de revanche enviado!');
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

    document.getElementById('btn-start-match').addEventListener('click', () => {
      const lvl = Number(botSelect.value);
      const colorPref = document.getElementById('human-color-select').value;
      const [secStr, incStr] = document.getElementById('time-control-select').value.split('|');
      this._startLocalOrBotGame({
        mode: this.selectedNewGameMode,
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
      this._toast('Estilos misturados por peça! Clique em "Aplicar" para ver no tabuleiro.');
    });

    document.getElementById('btn-reset-pieces').addEventListener('click', () => {
      this.customization = createDefaultCustomization();
      this._populateStudioControls();
      this._refreshStudioPreview();
    });

    document.getElementById('btn-apply-studio').addEventListener('click', () => {
      this._saveCustomization();
      this.scene3d.rebuildAllPieces(this.chess.board(), this.customization);
      if (this.gameMode === 'online') {
        this.multiplayer.syncPieceStyle(this.customization);
      }
      this._closeModal('modal-piece-studio');
      this._toast('Personalização 3D aplicada ao tabuleiro!');
    });
  }

  _initOnlineAndFirebaseEvents() {
    document.getElementById('btn-create-room').addEventListener('click', async () => {
      try {
        const playerName = this._getLocalPlayerName();
        const colorPref = document.getElementById('online-color-select').value;
        const [sec, inc] = document.getElementById('online-time-select').value.split('|').map(Number);

        const res = await this.multiplayer.createRoom({
          playerName,
          timeControlSeconds: sec,
          incrementSeconds: inc,
          preferredColor: colorPref,
          pieceCustomization: this.customization,
        });
        this._enterOnlineRoom(res.roomId, res.myColor, res.room);
        this._closeModal('modal-online-lobby');
        this._toast(`Sala ${res.roomId} criada! Envie o link de convite.`);
      } catch (err) {
        this._toast(`Erro: ${err.message}`);
      }
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
      const code = document.getElementById('join-room-code').value;
      await this._joinOnlineRoomByCode(code);
    });

    document.getElementById('btn-refresh-rooms').addEventListener('click', () => this._refreshPublicRooms());

    document.getElementById('btn-save-firebase').addEventListener('click', async () => {
      const statusEl = document.getElementById('firebase-status-msg');
      statusEl.textContent = 'Testando conexão segura com o servidor...';
      try {
        const res = await this.multiplayer.enableCloudMode();
        statusEl.textContent = `🔒 Conectado à Nuvem Segura (Latência: ${res.pingMs ?? '-'} ms).`;
        this._updateConnectionBadge();
        this._toast('🔒 Nuvem Segura conectada!');
      } catch (err) {
        statusEl.textContent = `Aviso: ${err.message}`;
        this._updateConnectionBadge();
      }
    });

    document.getElementById('btn-disconnect-firebase').addEventListener('click', async () => {
      await this.multiplayer.disconnectToDemo();
      this._updateConnectionBadge();
      this._closeModal('modal-firebase');
      this._toast('Modo Demo Multi-Aba ativado.');
    });
  }

  _getLocalPlayerName() {
    const inp = document.getElementById('online-player-name');
    return inp?.value.trim() || 'Jogador';
  }

  async _checkUrlInvite() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      await this._joinOnlineRoomByCode(room);
    }
  }

  async _joinOnlineRoomByCode(code) {
    try {
      const res = await this.multiplayer.joinRoom(code, {
        playerName: this._getLocalPlayerName(),
        pieceCustomization: this.customization,
      });
      this._enterOnlineRoom(res.roomId, res.myColor, res.room);
      this._closeModal('modal-online-lobby');
      this._toast(`Conectado na sala ${res.roomId}!`);
    } catch (err) {
      this._toast(`Não foi possível entrar: ${err.message}`);
    }
  }

  _enterOnlineRoom(roomId, myColor, initialRoom) {
    this.gameMode = 'online';
    this.humanColor = myColor === 'b' ? 'b' : 'w';
    this.selectedSquare = null;
    this.legalMoves = [];
    this.hintMove = null;
    this.gameEnded = false;
    this.hasActiveMatch = true;
    this._hideGameOver();
    this._hideMainMenu();
    this._resetSnapshots();
    this._lastOpponentStatusKey = null;

    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.replaceState({}, '', url.toString());

    document.getElementById('online-panel').classList.remove('hidden');
    document.getElementById('room-code-display').textContent = roomId;
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

      this.scene3d.syncBoard(this.chess.board(), this.customization);
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
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.multiplayer.currentRoomId);
    navigator.clipboard?.writeText(url.toString()).then(
      () => this._toast('Link de convite copiado! Compartilhe com seu amigo ou abra em outra aba.'),
      () => this._toast(`Código da sala: ${this.multiplayer.currentRoomId}`)
    );
  }

  _startLocalOrBotGame({ mode, botLevel, humanColor, timeControl }) {
    this.multiplayer.leaveRoom();
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());

    document.getElementById('online-panel').classList.add('hidden');
    document.getElementById('btn-draw').classList.add('hidden');
    document.getElementById('btn-undo').classList.remove('hidden');

    this.gameMode = mode;
    this.botLevel = botLevel || 3;
    this.humanColor = humanColor || 'w';
    this.timeControl = timeControl || { initialSeconds: 600, incrementSeconds: 0 };
    this.lastGameConfig = {
      mode: this.gameMode,
      botLevel: this.botLevel,
      humanColor: this.humanColor,
      timeControl: this.timeControl,
    };
    this.hasActiveMatch = true;
    this._hideGameOver();
    this._hideMainMenu();

    const initMs = this.timeControl.initialSeconds * 1000;
    this.clocks = { w: initMs, b: initMs };
    this.lastClockTick = Date.now();

    this.chess.reset();
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
    this._maybeTriggerBotTurn();
  }

  _isTurnInteractive() {
    if (this.isInMenu || this.gameEnded || this.isBotThinking || this.pendingPromo) return false;
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
    const moverColor = this.chess.turn();
    const result = this.chess.move(moveObj);
    if (!result) return;

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

    // Sound FX & Game Over Card
    if (isGameOver(this.chess)) {
      this.gameEnded = true;
      const isMate = isGameCheckmate(this.chess);
      audioFX.playGameOver(isMate);
      if (this.gameMode !== 'online') {
        if (isMate) {
          const winner = moverColor === 'w' ? 'Brancas' : 'Pretas';
          this._showGameOver(`Vitória das ${winner}!`, 'Xeque-mate');
        } else {
          this._showGameOver('Empate!', 'Partida empatada pelas regras');
        }
      }
    } else if (isGameCheck(this.chess)) {
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

    this._renderAll();

    // Sync to Firebase / Demo channel if online
    if (this.gameMode === 'online') {
      const nextHistory = [...(this._onlineMovesList || []), result.san];
      let gameResult = null;
      if (isGameCheckmate(this.chess)) {
        gameResult = { winner: moverColor, reason: 'Xeque-mate' };
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
    const move = await getBestMove(fenSnapshot, this.botLevel, minThinkTimeMs);
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
    const best = await getBestMove(this.chess.fen(), 4, 220);
    if (best) {
      this.hintMove = { from: best.from, to: best.to };
      this._renderHighlights();
      this._toast(`Dica da IA: ${best.san} (${best.from.toUpperCase()} → ${best.to.toUpperCase()})`);
    }
  }

  _undoMove() {
    if (this.gameMode === 'online' || this.isBotThinking) return;
    if (this.chess.history().length === 0) return;

    this.chess.undo();
    if (this.gameMode === 'bot' && this.chess.turn() !== this.humanColor && this.chess.history().length > 0) {
      this.chess.undo();
    }
    this.moveSnapshots = this.moveSnapshots.slice(0, this.chess.history().length + 1);
    this._saveSnapshots();
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

      if (this.isInMenu || !this.hasActiveMatch || this.gameEnded || this.timeControl.initialSeconds <= 0) return;
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
    document.getElementById('clock-white').textContent = this._formatClock(this.clocks.w);
    document.getElementById('clock-black').textContent = this._formatClock(this.clocks.b);
  }

  _renderHighlights() {
    let checkSquare = null;
    if (isGameCheck(this.chess)) {
      const turn = this.chess.turn();
      const board = this.chess.board();
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const cell = board[r][f];
          if (cell && cell.type === 'k' && cell.color === turn) {
            checkSquare = `${files[f]}${8 - r}`;
          }
        }
      }
    }

    this.scene3d.updateHighlights({
      selectedSquare: this.selectedSquare,
      legalMoves: this.legalMoves,
      lastMove: this.lastMove,
      checkSquare,
      hintMove: this.hintMove,
    });
  }

  _renderAll() {
    this._renderHighlights();
    this._renderClocks();
    this._renderPlayerCards();
    this._renderMoveHistory();
    this._renderEvalBar();
    this._updateTurnBanner();
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
    } else if (this.gameMode === 'online' && this._onlineRoomSnapshot) {
      wNameEl.textContent = this._onlineRoomSnapshot.white?.name || 'Aguardando Brancas...';
      bNameEl.textContent = this._onlineRoomSnapshot.black?.name || 'Aguardando Pretas...';
    } else {
      wNameEl.textContent = 'Jogador Brancas';
      bNameEl.textContent = 'Jogador Pretas';
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

  _renderEvalBar() {
    const res = evaluateBoardScore(this.chess.fen());
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
      banner.textContent = `♔ XEQUE-MATE! Vitória das ${winner}!`;
      banner.classList.add('is-check');
      return;
    }
    if (isGameDraw(this.chess)) {
      banner.textContent = '½-½ Partida empatada!';
      return;
    }

    const sideText = this.chess.turn() === 'w' ? 'Brancas' : 'Pretas';
    if (this.isBotThinking) {
      banner.textContent = `🤖 Bot (${BOT_LEVELS[this.botLevel].name}) calculando lance...`;
      return;
    }

    if (isGameCheck(this.chess)) {
      banner.textContent = `⚠ XEQUE! Vez das ${sideText}`;
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
        badge.textContent = `🔒 Nuvem Segura • Sala ${this.multiplayer.currentRoomId}`;
      } else {
        badge.className = 'badge badge-demo';
        badge.textContent = `Demo Multi-Aba • Sala ${this.multiplayer.currentRoomId}`;
      }
    } else {
      badge.className = mpMode === 'cloud' ? 'badge badge-firebase' : 'badge badge-local';
      badge.textContent = mpMode === 'cloud' ? '🔒 Nuvem Segura Conectada' : 'Local / Bot IA';
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
    for (let i = 0; i < sanList.length; i++) {
      const mv = tmp.move(sanList[i]);
      if (!mv) break;
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
    });
    this._renderPlayerCards();
    this._renderMoveHistory();
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
      return { key: 'waiting', label: '⚪ Aguardando', cls: 'presence-pill presence-waiting' };
    }
    const age = nowMs - (playerObj.lastSeen || 0);
    if (playerObj.connected === false || age > 20000) {
      return { key: 'offline', label: '🔴 Desconectado', cls: 'presence-pill presence-offline' };
    }
    if (age > 9000) {
      return { key: 'away', label: '🟡 Reconectando...', cls: 'presence-pill presence-away' };
    }
    return { key: 'online', label: '🟢 Conectado', cls: 'presence-pill presence-online' };
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
      bannerEl.textContent = '⚪ Aguardando o outro jogador entrar na sala...';
    } else if (oppInfo.key === 'online') {
      bannerEl.textContent = `🟢 ${oppName} está conectado em tempo real`;
    } else if (oppInfo.key === 'away') {
      bannerEl.textContent = `🟡 ${oppName} está com conexão instável...`;
    } else {
      bannerEl.textContent = `🔴 ${oppName} desconectou da partida`;
    }

    if (this._lastOpponentStatusKey && this._lastOpponentStatusKey !== oppInfo.key) {
      if (oppInfo.key === 'online') this._toast(`🟢 ${oppName} está conectado!`);
      else if (oppInfo.key === 'offline') this._toast(`🔴 ${oppName} desconectou da sala.`);
      else if (oppInfo.key === 'away') this._toast(`🟡 ${oppName} está reconectando...`);
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
    this.scene3d.setCameraView(this.gameMode === 'bot' || this.gameMode === 'online' ? this.humanColor : 'w');
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
  }

  _openOnlineLobby() {
    const banner = document.getElementById('lobby-mode-banner');
    if (this.multiplayer.getMode() === 'cloud') {
      banner.innerHTML =
        '<strong>🔒 Nuvem Segura Conectada:</strong> Suas salas são sincronizadas em tempo real pelo servidor seguro com detecção ao vivo de presença dos jogadores.';
    } else {
      banner.innerHTML =
        '<strong>Modo Demo Multi-Aba Ativo:</strong> Você pode criar uma sala agora e testar entre duas abas do navegador, ou clicar em <strong>⚙ Config / Nuvem</strong> para ativar o modo nuvem.';
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
    statusEl.textContent = 'Verificando conexão segura...';
    const st = await this.multiplayer.checkCloudStatus();
    if (st.ok) {
      statusEl.textContent = `🔒 Status: Nuvem Segura Conectada (Latência: ${st.pingMs ?? '-'} ms).`;
    } else {
      statusEl.textContent = '🟡 Status: Modo Demo Multi-Aba Local ativo.';
    }
    this._updateConnectionBadge();
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
