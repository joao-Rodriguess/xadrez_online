/**
 * Secure Multiplayer Client:
 * Communicates with the backend proxy (/api/rooms) so NO Firebase keys,
 * API credentials, or project identifiers are ever exposed in client-side code.
 * Also supports automatic Multi-Tab Demo fallback via BroadcastChannel + localStorage,
 * and real-time player presence heartbeats.
 */

const DEMO_ROOMS_KEY = 'chess3d_demo_rooms_v1';
const PLAYER_ID_KEY = 'chess3d_player_uid_v1';
const DEMO_CHANNEL_NAME = 'chess3d_multiplayer_channel';
const FORCED_DEMO_KEY = 'chess3d_mp_forced_demo_v1';

function safeStorageGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeStorageSet(storage, key, val) {
  try {
    storage?.setItem(key, val);
  } catch {
    // ignore storage errors
  }
}

function safeStorageRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch {
    // ignore
  }
}

function getOrCreatePlayerId() {
  const session = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  let uid = safeStorageGet(session, PLAYER_ID_KEY);
  if (!uid) {
    uid = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    safeStorageSet(session, PLAYER_ID_KEY, uid);
  }
  return uid;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class MultiplayerManager {
  constructor() {
    this.playerId = getOrCreatePlayerId();
    this.mode = 'cloud'; // 'cloud' | 'demo'
    this.cloudReady = false;
    this.lastServerTime = Date.now();
    this.lastPingMs = null;

    this.currentRoomId = null;
    this.myColor = null; // 'w' | 'b' | 'spectator' | null
    this._unsubRoom = null;
    this._roomCallback = null;
    this._pollTimer = null;
    this._heartbeatTimer = null;

    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    if (safeStorageGet(local, FORCED_DEMO_KEY) === 'true') {
      this.mode = 'demo';
    }

    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(DEMO_CHANNEL_NAME) : null;
    if (this.channel) {
      this.channel.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (this.mode === 'demo' && msg.type === 'room_update' && msg.roomId === this.currentRoomId && this._roomCallback) {
          this.lastServerTime = Date.now();
          this._roomCallback(msg.room, this.lastServerTime);
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this._sendLeaveBeacon());
      window.addEventListener('beforeunload', () => this._sendLeaveBeacon());
    }
  }

  async _apiCall(action, payload = {}) {
    const t0 = performance.now();
    const resp = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await resp.json();
    this.lastPingMs = Math.round(performance.now() - t0);
    if (data.serverTime) {
      this.lastServerTime = data.serverTime;
    }
    if (!resp.ok || !data.ok) {
      throw new Error(data.error || 'Falha de comunicação com o servidor seguro.');
    }
    return data;
  }

  async checkCloudStatus() {
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    if (safeStorageGet(local, FORCED_DEMO_KEY) === 'true') {
      this.mode = 'demo';
      this.cloudReady = false;
      return { ok: false, mode: 'demo' };
    }
    try {
      const res = await this._apiCall('ping');
      this.mode = 'cloud';
      this.cloudReady = true;
      return { ok: true, mode: 'cloud', pingMs: this.lastPingMs, serverTime: res.serverTime };
    } catch {
      this.mode = 'demo';
      this.cloudReady = false;
      return { ok: false, mode: 'demo' };
    }
  }

  async enableCloudMode() {
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    safeStorageRemove(local, FORCED_DEMO_KEY);
    const status = await this.checkCloudStatus();
    if (!status.ok) {
      throw new Error('Servidor nuvem indisponível neste ambiente. Verifique a variável de servidor.');
    }
    return status;
  }

  async disconnectToDemo() {
    this.leaveRoom();
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    safeStorageSet(local, FORCED_DEMO_KEY, 'true');
    this.mode = 'demo';
    this.cloudReady = false;
  }

  getMode() {
    return this.mode;
  }

  _sendLeaveBeacon() {
    if (!this.currentRoomId || (this.myColor !== 'w' && this.myColor !== 'b')) return;
    if (this.mode === 'cloud' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const payload = JSON.stringify({
        action: 'leaveRoom',
        roomId: this.currentRoomId,
        playerId: this.playerId,
        color: this.myColor,
      });
      navigator.sendBeacon('/api/rooms', new Blob([payload], { type: 'application/json' }));
    } else if (this.mode === 'demo') {
      const room = this._readDemoRooms()[this.currentRoomId];
      const sideKey = this.myColor === 'w' ? 'white' : 'black';
      if (room && room[sideKey]?.uid === this.playerId) {
        room[sideKey].connected = false;
        room[sideKey].lastSeen = Date.now();
        this._writeDemoRoom(room);
      }
    }
  }

  // ---------- Demo Storage Helpers ----------
  _readDemoRooms() {
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    try {
      return JSON.parse(safeStorageGet(local, DEMO_ROOMS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  _writeDemoRoom(room) {
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    const all = this._readDemoRooms();
    all[room.roomId] = room;
    safeStorageSet(local, DEMO_ROOMS_KEY, JSON.stringify(all));
    this.lastServerTime = Date.now();
    if (this.channel) {
      this.channel.postMessage({ type: 'room_update', roomId: room.roomId, room });
    }
    if (this.currentRoomId === room.roomId && this._roomCallback) {
      this._roomCallback(room, this.lastServerTime);
    }
  }

  // ---------- Room Lifecycle ----------
  async createRoom({ playerName, timeControlSeconds = 600, incrementSeconds = 0, preferredColor = 'w', pieceCustomization = null }) {
    if (this.mode === 'cloud') {
      try {
        const res = await this._apiCall('createRoom', {
          playerId: this.playerId,
          playerName,
          timeControlSeconds,
          incrementSeconds,
          preferredColor,
          pieceCustomization,
        });
        this.cloudReady = true;
        this.currentRoomId = res.roomId;
        this.myColor = res.myColor;
        return { roomId: res.roomId, myColor: res.myColor, room: res.room };
      } catch (err) {
        if (err.message?.includes('FIREBASE_CONFIG_JSON')) {
          this.mode = 'demo';
        } else {
          throw err;
        }
      }
    }

    const roomId = generateRoomCode();
    const now = Date.now();
    const hostSide = preferredColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : preferredColor;
    const ms = timeControlSeconds > 0 ? timeControlSeconds * 1000 : 0;

    const hostPayload = {
      uid: this.playerId,
      name: playerName || 'Anfitrião',
      connected: true,
      lastSeen: now,
      timeLeftMs: ms,
      pieceCustomization: pieceCustomization || null,
    };

    const roomData = {
      roomId,
      status: 'waiting',
      createdAt: now,
      updatedAt: now,
      timeControl: { initialSeconds: timeControlSeconds, incrementSeconds },
      white: hostSide === 'w' ? hostPayload : null,
      black: hostSide === 'b' ? hostPayload : null,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
      lastMove: null,
      moves: [],
      result: null,
      drawOfferBy: null,
      rematchVotes: { white: false, black: false },
      chat: {
        sys_init: {
          sender: 'Sistema',
          text: `Sala ${roomId} criada. Aguardando oponente...`,
          timestamp: now,
        },
      },
    };

    this._writeDemoRoom(roomData);
    this.currentRoomId = roomId;
    this.myColor = hostSide;
    return { roomId, myColor: hostSide, room: roomData };
  }

  async joinRoom(roomId, { playerName, pieceCustomization = null }) {
    const code = (roomId || '').trim().toUpperCase();
    if (!code) throw new Error('Informe o código da sala.');

    if (this.mode === 'cloud') {
      try {
        const res = await this._apiCall('joinRoom', {
          roomId: code,
          playerId: this.playerId,
          playerName,
          pieceCustomization,
        });
        this.cloudReady = true;
        this.currentRoomId = res.roomId;
        this.myColor = res.myColor;
        return { roomId: res.roomId, myColor: res.myColor, room: res.room };
      } catch (err) {
        if (err.message?.includes('FIREBASE_CONFIG_JSON')) {
          this.mode = 'demo';
        } else {
          throw err;
        }
      }
    }

    const all = this._readDemoRooms();
    const room = all[code] || null;
    if (!room) throw new Error(`Sala "${code}" não encontrada.`);

    const now = Date.now();
    let assignedColor = 'spectator';
    if (room.white?.uid === this.playerId) assignedColor = 'w';
    else if (room.black?.uid === this.playerId) assignedColor = 'b';
    else if (!room.white) assignedColor = 'w';
    else if (!room.black) assignedColor = 'b';

    const ms = room.timeControl?.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;

    if (assignedColor === 'w' || assignedColor === 'b') {
      const sideKey = assignedColor === 'w' ? 'white' : 'black';
      room[sideKey] = {
        uid: this.playerId,
        name: playerName || (assignedColor === 'w' ? 'Brancas' : 'Pretas'),
        connected: true,
        lastSeen: now,
        timeLeftMs: room[sideKey]?.timeLeftMs ?? ms,
        pieceCustomization: pieceCustomization || null,
      };
      if (room.white && room.black && room.status === 'waiting') {
        room.status = 'playing';
      }
      room.updatedAt = now;
      this._writeDemoRoom(room);
    }

    this.currentRoomId = code;
    this.myColor = assignedColor;
    return { roomId: code, myColor: assignedColor, room };
  }

  async listPublicRooms() {
    if (this.mode === 'cloud') {
      try {
        const res = await this._apiCall('listRooms');
        this.cloudReady = true;
        return res.rooms || [];
      } catch (err) {
        if (err.message?.includes('FIREBASE_CONFIG_JSON')) {
          this.mode = 'demo';
        } else {
          throw err;
        }
      }
    }

    const cutoff = Date.now() - 1000 * 60 * 60 * 6;
    const all = this._readDemoRooms();
    return Object.values(all)
      .filter((r) => r && r.roomId && (!r.createdAt || r.createdAt > cutoff))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 12);
  }

  subscribeRoom(roomId, callback) {
    this.unsubscribeRoom();
    this.currentRoomId = roomId;
    this._roomCallback = callback;

    if (this.mode === 'cloud') {
      let active = true;
      let lastHash = '';

      const syncOnce = async (withHeartbeat = false) => {
        if (!active || this.currentRoomId !== roomId) return;
        try {
          const action = withHeartbeat ? 'heartbeat' : 'getRoom';
          const res = await this._apiCall(action, {
            roomId,
            playerId: this.playerId,
            color: this.myColor,
          });
          if (!active || !res.room) return;
          const nextHash = JSON.stringify(res.room);
          if (nextHash !== lastHash || withHeartbeat) {
            lastHash = nextHash;
            this._roomCallback?.(res.room, res.serverTime || Date.now());
          }
        } catch {
          // keep polling gently on transient network drop
        }
      };

      syncOnce(true);
      this._pollTimer = setInterval(() => syncOnce(false), 1200);
      this._heartbeatTimer = setInterval(() => syncOnce(true), 3200);

      this._unsubRoom = () => {
        active = false;
        if (this._pollTimer) clearInterval(this._pollTimer);
        if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
        this._pollTimer = null;
        this._heartbeatTimer = null;
      };
      return;
    }

    // Demo mode real-time presence + storage sync
    const onStorage = (ev) => {
      if (ev.key === DEMO_ROOMS_KEY && this._roomCallback) {
        const all = this._readDemoRooms();
        if (all[roomId]) this._roomCallback(all[roomId], Date.now());
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }

    const demoHeartbeat = () => {
      const all = this._readDemoRooms();
      const room = all[roomId];
      if (!room) return;
      const sideKey = this.myColor === 'w' ? 'white' : this.myColor === 'b' ? 'black' : null;
      if (sideKey && room[sideKey]?.uid === this.playerId) {
        room[sideKey].connected = true;
        room[sideKey].lastSeen = Date.now();
        this._writeDemoRoom(room);
      }
    };
    demoHeartbeat();
    this._heartbeatTimer = setInterval(demoHeartbeat, 3000);

    this._unsubRoom = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
      if (this._heartbeatTimer) {
        clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = null;
      }
    };

    const all = this._readDemoRooms();
    if (all[roomId]) callback(all[roomId], Date.now());
  }

  unsubscribeRoom() {
    if (this._unsubRoom) {
      this._unsubRoom();
      this._unsubRoom = null;
    }
    this._roomCallback = null;
  }

  leaveRoom() {
    this._sendLeaveBeacon();
    this.unsubscribeRoom();
    this.currentRoomId = null;
    this.myColor = null;
  }

  async sendMove({ fen, turn, lastMove, moves, whiteTimeLeftMs, blackTimeLeftMs, result = null }) {
    if (!this.currentRoomId) return;
    const roomId = this.currentRoomId;

    if (this.mode === 'cloud') {
      const res = await this._apiCall('sendMove', {
        roomId,
        playerId: this.playerId,
        color: this.myColor,
        fen,
        turn,
        lastMove,
        moves,
        whiteTimeLeftMs,
        blackTimeLeftMs,
        result,
      });
      if (res.room && this._roomCallback) {
        this._roomCallback(res.room, res.serverTime || Date.now());
      }
      return;
    }

    const room = this._readDemoRooms()[roomId];
    if (!room) return;
    room.fen = fen;
    room.turn = turn;
    room.lastMove = lastMove;
    room.moves = moves;
    room.drawOfferBy = null;
    room.updatedAt = Date.now();
    if (room.white && typeof whiteTimeLeftMs === 'number') room.white.timeLeftMs = whiteTimeLeftMs;
    if (room.black && typeof blackTimeLeftMs === 'number') room.black.timeLeftMs = blackTimeLeftMs;
    if (result) {
      room.result = result;
      room.status = 'finished';
    }
    this._writeDemoRoom(room);
  }

  async sendChat(senderName, text) {
    if (!this.currentRoomId || !text.trim()) return;
    const roomId = this.currentRoomId;

    if (this.mode === 'cloud') {
      await this._apiCall('sendChat', { roomId, senderName, text });
      return;
    }

    const room = this._readDemoRooms()[roomId];
    if (!room) return;
    const msgKey = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    room.chat = room.chat || {};
    room.chat[msgKey] = {
      sender: senderName || 'Jogador',
      text: text.trim().slice(0, 200),
      timestamp: Date.now(),
    };
    room.updatedAt = Date.now();
    this._writeDemoRoom(room);
  }

  async offerDraw() {
    if (!this.currentRoomId || (this.myColor !== 'w' && this.myColor !== 'b')) return;
    const roomId = this.currentRoomId;
    if (this.mode === 'cloud') {
      await this._apiCall('offerDraw', { roomId, color: this.myColor });
      return;
    }
    const room = this._readDemoRooms()[roomId];
    if (!room) return;
    room.drawOfferBy = this.myColor;
    room.updatedAt = Date.now();
    this._writeDemoRoom(room);
  }

  async respondDraw(accept) {
    if (!this.currentRoomId) return;
    const roomId = this.currentRoomId;
    if (this.mode === 'cloud') {
      await this._apiCall('respondDraw', { roomId, accept });
      return;
    }
    const room = this._readDemoRooms()[roomId];
    if (!room) return;
    room.drawOfferBy = null;
    room.updatedAt = Date.now();
    if (accept) {
      room.status = 'finished';
      room.result = { winner: 'draw', reason: 'Acordo de empate' };
    }
    this._writeDemoRoom(room);
  }

  async resign() {
    if (!this.currentRoomId || (this.myColor !== 'w' && this.myColor !== 'b')) return;
    const roomId = this.currentRoomId;
    if (this.mode === 'cloud') {
      await this._apiCall('resign', { roomId, color: this.myColor });
      return;
    }
    const room = this._readDemoRooms()[roomId];
    if (!room) return;
    room.status = 'finished';
    room.result = { winner: this.myColor === 'w' ? 'b' : 'w', reason: 'Desistência' };
    room.updatedAt = Date.now();
    this._writeDemoRoom(room);
  }

  async requestRematch() {
    if (!this.currentRoomId || (this.myColor !== 'w' && this.myColor !== 'b')) return;
    const roomId = this.currentRoomId;
    if (this.mode === 'cloud') {
      await this._apiCall('requestRematch', { roomId, color: this.myColor });
      return;
    }

    const room = this._readDemoRooms()[roomId];
    if (!room) return;
    const sideKey = this.myColor === 'w' ? 'white' : 'black';
    const votes = { ...(room.rematchVotes || {}), [sideKey]: true };
    if (votes.white && votes.black) {
      const ms = room.timeControl?.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;
      const oldWhite = room.white;
      const oldBlack = room.black;
      Object.assign(room, {
        white: oldBlack ? { ...oldBlack, timeLeftMs: ms } : null,
        black: oldWhite ? { ...oldWhite, timeLeftMs: ms } : null,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        lastMove: null,
        moves: [],
        status: 'playing',
        result: null,
        drawOfferBy: null,
        rematchVotes: { white: false, black: false },
        updatedAt: Date.now(),
      });
    } else {
      room.rematchVotes = votes;
      room.updatedAt = Date.now();
    }
    this._writeDemoRoom(room);
  }

  async syncPieceStyle(pieceCustomization) {
    if (!this.currentRoomId || (this.myColor !== 'w' && this.myColor !== 'b')) return;
    const roomId = this.currentRoomId;
    if (this.mode === 'cloud') {
      await this._apiCall('syncPieceStyle', { roomId, color: this.myColor, pieceCustomization });
      return;
    }
    const room = this._readDemoRooms()[roomId];
    const sideKey = this.myColor === 'w' ? 'white' : 'black';
    if (!room || !room[sideKey]) return;
    room[sideKey].pieceCustomization = pieceCustomization;
    this._writeDemoRoom(room);
  }
}
