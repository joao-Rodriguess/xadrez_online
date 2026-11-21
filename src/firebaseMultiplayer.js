/**
 * Secure Multiplayer Client:
 * Communicates with the backend proxy (/api/rooms) so NO Firebase keys,
 * API credentials, or project identifiers are ever exposed in client-side code.
 * Supports Private Rooms closed with a unique server-generated password key,
 * Friend system with global online presence & direct match challenges,
 * plus Multi-Tab Demo fallback via BroadcastChannel + localStorage.
 */

const DEMO_ROOMS_KEY = 'chess3d_demo_rooms_v1';
const DEMO_PROFILES_KEY = 'chess3d_demo_profiles_v1';
const DEMO_CHALLENGES_KEY = 'chess3d_demo_challenges_v1';
const PLAYER_ID_KEY = 'chess3d_player_uid_v1';
const FRIEND_SUFFIX_KEY = 'chess3d_friend_suffix_v1';
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

function getOrCreateFriendSuffix() {
  const session = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  let suf = safeStorageGet(session, FRIEND_SUFFIX_KEY);
  if (!suf) {
    suf = Math.floor(0x1000 + Math.random() * 0xefff)
      .toString(16)
      .toUpperCase();
    safeStorageSet(session, FRIEND_SUFFIX_KEY, suf);
  }
  return suf;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateClientAccessKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let key = '';
  for (let i = 0; i < 12; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export class MultiplayerManager {
  constructor() {
    this.playerId = getOrCreatePlayerId();
    this.friendSuffix = getOrCreateFriendSuffix();
    this.friendTag = `Jogador#${this.friendSuffix}`;
    this.mode = 'cloud'; // 'cloud' | 'demo'
    this.cloudReady = false;
    this.lastServerTime = Date.now();
    this.lastPingMs = null;

    this.currentRoomId = null;
    this.currentAccessKey = null;
    this.currentIsPrivate = false;
    this.myColor = null; // 'w' | 'b' | 'spectator' | null
    this._unsubRoom = null;
    this._roomCallback = null;
    this._pollTimer = null;
    this._heartbeatTimer = null;
    this._socialTimer = null;

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

  buildLocalFriendTag(playerName) {
    const clean = String(playerName || 'Jogador').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12) || 'Jogador';
    return `${clean}#${this.friendSuffix}`;
  }

  getInviteUrl(baseHref) {
    if (!this.currentRoomId) return '';
    const href = baseHref || (typeof window !== 'undefined' ? window.location.href : 'https://xadrezonline-blond.vercel.app/');
    const url = new URL(href);
    url.searchParams.set('room', this.currentRoomId);
    if (this.currentAccessKey) {
      url.searchParams.set('key', this.currentAccessKey);
    } else {
      url.searchParams.delete('key');
    }
    return url.toString();
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
        accessKey: this.currentAccessKey,
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
  _readDemoJson(key, fallback) {
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    try {
      const val = safeStorageGet(local, key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  _writeDemoJson(key, data) {
    const local = typeof localStorage !== 'undefined' ? localStorage : null;
    safeStorageSet(local, key, JSON.stringify(data));
  }

  _readDemoRooms() {
    return this._readDemoJson(DEMO_ROOMS_KEY, {});
  }

  _writeDemoRoom(room) {
    const all = this._readDemoRooms();
    all[room.roomId] = room;
    this._writeDemoJson(DEMO_ROOMS_KEY, all);
    this.lastServerTime = Date.now();
    if (this.channel) {
      this.channel.postMessage({ type: 'room_update', roomId: room.roomId, room });
    }
    if (this.currentRoomId === room.roomId && this._roomCallback) {
      this._roomCallback(room, this.lastServerTime);
    }
  }

  // ---------- Room Lifecycle (Public & Private Password-Gated) ----------
  async createRoom({
    playerName,
    timeControlSeconds = 600,
    incrementSeconds = 0,
    preferredColor = 'w',
    pieceCustomization = null,
    isPrivate = true,
    allowSpectators = false,
  }) {
    if (this.mode === 'cloud') {
      try {
        const res = await this._apiCall('createRoom', {
          playerId: this.playerId,
          playerName,
          timeControlSeconds,
          incrementSeconds,
          preferredColor,
          pieceCustomization,
          isPrivate,
          allowSpectators,
        });
        this.cloudReady = true;
        this.currentRoomId = res.roomId;
        this.currentAccessKey = res.accessKey || null;
        this.currentIsPrivate = Boolean(res.room?.isPrivate ?? isPrivate);
        this.myColor = res.myColor;
        return {
          roomId: res.roomId,
          accessKey: this.currentAccessKey,
          isPrivate: this.currentIsPrivate,
          myColor: res.myColor,
          room: res.room,
        };
      } catch (err) {
        if (err.message?.includes('FIREBASE_CONFIG_JSON')) {
          this.mode = 'demo';
        } else {
          throw err;
        }
      }
    }

    const roomId = generateRoomCode();
    const accessKey = isPrivate ? generateClientAccessKey() : null;
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
      isPrivate: Boolean(isPrivate),
      allowSpectators: Boolean(allowSpectators),
      accessKey,
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
          text: isPrivate
            ? `Sala privada ${roomId} criada (fechada com senha única).`
            : `Sala ${roomId} criada. Aguardando oponente...`,
          timestamp: now,
        },
      },
    };

    this._writeDemoRoom(roomData);
    this.currentRoomId = roomId;
    this.currentAccessKey = accessKey;
    this.currentIsPrivate = Boolean(isPrivate);
    this.myColor = hostSide;
    return {
      roomId,
      accessKey,
      isPrivate: Boolean(isPrivate),
      myColor: hostSide,
      room: roomData,
    };
  }

  async joinRoom(roomId, { playerName, pieceCustomization = null, accessKey = null }) {
    const code = (roomId || '').trim().toUpperCase();
    const cleanKey = accessKey ? String(accessKey).trim() : null;
    if (!code) throw new Error('Informe o código da sala.');

    if (this.mode === 'cloud') {
      try {
        const res = await this._apiCall('joinRoom', {
          roomId: code,
          playerId: this.playerId,
          playerName,
          pieceCustomization,
          accessKey: cleanKey,
        });
        this.cloudReady = true;
        this.currentRoomId = res.roomId;
        this.currentAccessKey = cleanKey;
        this.currentIsPrivate = Boolean(res.room?.isPrivate);
        this.myColor = res.myColor;
        return { roomId: res.roomId, myColor: res.myColor, room: res.room, accessKey: cleanKey };
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

    if (room.isPrivate) {
      const isExistingSeat = room.white?.uid === this.playerId || room.black?.uid === this.playerId;
      if (!isExistingSeat && (!cleanKey || cleanKey !== room.accessKey)) {
        throw new Error('Sala privada: acesso permitido apenas pelo link com senha única.');
      }
    }

    const now = Date.now();
    let assignedColor = 'spectator';
    if (room.white?.uid === this.playerId) assignedColor = 'w';
    else if (room.black?.uid === this.playerId) assignedColor = 'b';
    else if (!room.white) assignedColor = 'w';
    else if (!room.black) assignedColor = 'b';

    if (assignedColor === 'spectator' && room.isPrivate && !room.allowSpectators) {
      throw new Error('Esta sala privada já está completa e fechada (2/2 jogadores).');
    }

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
    this.currentAccessKey = cleanKey;
    this.currentIsPrivate = Boolean(room.isPrivate);
    this.myColor = assignedColor;
    return { roomId: code, myColor: assignedColor, room, accessKey: cleanKey };
  }

  async quickMatch({ playerName, timeControlSeconds = 600, incrementSeconds = 0, pieceCustomization = null }) {
    if (this.mode === 'cloud') {
      try {
        const res = await this._apiCall('quickMatch', {
          playerId: this.playerId,
          playerName,
          timeControlSeconds,
          incrementSeconds,
          pieceCustomization,
        });
        this.cloudReady = true;
        this.currentRoomId = res.roomId;
        this.currentAccessKey = null;
        this.currentIsPrivate = false;
        this.myColor = res.myColor;
        return { matched: Boolean(res.matched), roomId: res.roomId, myColor: res.myColor, room: res.room };
      } catch (err) {
        if (err.message?.includes('FIREBASE_CONFIG_JSON')) {
          this.mode = 'demo';
        } else {
          throw err;
        }
      }
    }

    const cutoff = Date.now() - 1000 * 60 * 30;
    const waiting = Object.values(this._readDemoRooms()).filter(
      (r) =>
        r &&
        r.roomId &&
        !r.isPrivate &&
        r.status === 'waiting' &&
        (!r.createdAt || r.createdAt > cutoff) &&
        r.white?.uid !== this.playerId &&
        r.black?.uid !== this.playerId &&
        (!r.white || !r.black)
    );
    if (waiting.length > 0) {
      const joined = await this.joinRoom(waiting[0].roomId, { playerName, pieceCustomization });
      return { matched: true, ...joined };
    }
    const created = await this.createRoom({
      playerName,
      timeControlSeconds,
      incrementSeconds,
      preferredColor: 'w',
      pieceCustomization,
      isPrivate: false,
    });
    return { matched: false, ...created };
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
      .filter((r) => r && r.roomId && !r.isPrivate && (!r.createdAt || r.createdAt > cutoff))
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
            accessKey: this.currentAccessKey,
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
    this.currentAccessKey = null;
    this.currentIsPrivate = false;
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
        accessKey: this.currentAccessKey,
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
      await this._apiCall('sendChat', {
        roomId,
        playerId: this.playerId,
        accessKey: this.currentAccessKey,
        senderName,
        text,
      });
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
      await this._apiCall('offerDraw', { roomId, playerId: this.playerId, accessKey: this.currentAccessKey, color: this.myColor });
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
      await this._apiCall('respondDraw', { roomId, playerId: this.playerId, accessKey: this.currentAccessKey, accept });
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
      await this._apiCall('resign', { roomId, playerId: this.playerId, accessKey: this.currentAccessKey, color: this.myColor });
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
      await this._apiCall('requestRematch', { roomId, playerId: this.playerId, accessKey: this.currentAccessKey, color: this.myColor });
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
      await this._apiCall('syncPieceStyle', {
        roomId,
        playerId: this.playerId,
        accessKey: this.currentAccessKey,
        color: this.myColor,
        pieceCustomization,
      });
      return;
    }
    const room = this._readDemoRooms()[roomId];
    const sideKey = this.myColor === 'w' ? 'white' : 'black';
    if (!room || !room[sideKey]) return;
    room[sideKey].pieceCustomization = pieceCustomization;
    this._writeDemoRoom(room);
  }

  // ==================== SOCIAL: FRIENDS, LIVE PRESENCE & CHALLENGES ====================
  async refreshSocial() {
    if (this._socialTickFn) {
      await this._socialTickFn();
    }
  }

  startSocialSync(getStateFn, onUpdate) {
    this.stopSocialSync();

    const tick = async () => {
      const st = getStateFn?.() || {};
      const playerName = st.playerName || 'Jogador';
      const status = st.status || 'online';
      const activityText = st.activityText || 'No menu / disponível';
      const friendTag = this.buildLocalFriendTag(playerName);

      if (this.mode === 'cloud') {
        try {
          const res = await this._apiCall('socialHeartbeat', {
            playerId: this.playerId,
            playerName,
            friendTag,
            status,
            activityText,
          });
          if (res.profile?.friendTag) this.friendTag = res.profile.friendTag;
          onUpdate?.(res);
          return;
        } catch (err) {
          if (!err.message?.includes('FIREBASE_CONFIG_JSON')) {
            return;
          }
        }
      }

      // Demo fallback using shared localStorage across browser tabs
      const now = Date.now();
      const profiles = this._readDemoJson(DEMO_PROFILES_KEY, {});
      const existing = profiles[this.playerId] || { friends: [], incomingRequests: [] };
      const tag = existing.friendTag || friendTag;
      this.friendTag = tag;

      profiles[this.playerId] = {
        uid: this.playerId,
        name: playerName,
        friendTag: tag,
        friendTagLower: tag.toLowerCase(),
        friends: existing.friends || [],
        incomingRequests: existing.incomingRequests || [],
        status,
        activityText,
        lastSeen: now,
      };
      this._writeDemoJson(DEMO_PROFILES_KEY, profiles);

      const friends = (profiles[this.playerId].friends || [])
        .map((fUid) => profiles[fUid])
        .filter(Boolean)
        .map((f) => {
          const age = now - (f.lastSeen || 0);
          const onlineState = age < 25000 ? (f.status === 'in_game' ? 'in_game' : 'online') : 'offline';
          return {
            uid: f.uid,
            name: f.name,
            friendTag: f.friendTag,
            onlineState,
            activityText: onlineState === 'offline' ? 'Offline' : f.activityText || 'Online',
            lastSeen: f.lastSeen || 0,
          };
        });

      const challenges = this._readDemoJson(DEMO_CHALLENGES_KEY, {});
      const cutoff = now - 1000 * 60 * 3;
      const incomingChallenges = [];
      const acceptedChallenges = [];
      Object.values(challenges).forEach((ch) => {
        if (!ch || (ch.createdAt && ch.createdAt < cutoff)) return;
        if (ch.targetUid === this.playerId && ch.status === 'pending') incomingChallenges.push(ch);
        if (ch.fromUid === this.playerId && ch.status === 'accepted') acceptedChallenges.push(ch);
      });

      onUpdate?.({
        ok: true,
        profile: profiles[this.playerId],
        friends,
        incomingRequests: profiles[this.playerId].incomingRequests || [],
        incomingChallenges,
        acceptedChallenges,
        serverTime: now,
      });
    };

    this._socialTickFn = tick;
    const onSocialStorage = (ev) => {
      if (this.mode !== 'cloud' && (ev.key === DEMO_PROFILES_KEY || ev.key === DEMO_CHALLENGES_KEY)) {
        tick();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onSocialStorage);
    }
    this._socialStorageHandler = onSocialStorage;

    tick();
    this._socialTimer = setInterval(tick, 3500);
  }

  stopSocialSync() {
    this._socialTickFn = null;
    if (typeof window !== 'undefined' && this._socialStorageHandler) {
      window.removeEventListener('storage', this._socialStorageHandler);
      this._socialStorageHandler = null;
    }
    if (this._socialTimer) {
      clearInterval(this._socialTimer);
      this._socialTimer = null;
    }
  }

  async sendFriendRequest(targetTag, playerName) {
    const clean = String(targetTag || '').trim();
    if (!clean) throw new Error('Informe a Tag do amigo (ex: Jogador#1A2B).');

    if (this.mode === 'cloud') {
      return await this._apiCall('sendFriendRequest', {
        playerId: this.playerId,
        playerName,
        targetTag: clean,
      });
    }

    const profiles = this._readDemoJson(DEMO_PROFILES_KEY, {});
    const target = Object.values(profiles).find((p) => p.friendTagLower === clean.toLowerCase());
    if (!target) throw new Error(`Tag "${clean}" não encontrada.`);
    if (target.uid === this.playerId) throw new Error('Você não pode adicionar a si mesmo.');
    if ((target.friends || []).includes(this.playerId)) throw new Error(`${target.name} já é seu amigo.`);
    target.incomingRequests = target.incomingRequests || [];
    if (!target.incomingRequests.some((r) => r.uid === this.playerId)) {
      target.incomingRequests.push({
        uid: this.playerId,
        name: playerName || 'Jogador',
        friendTag: this.friendTag,
        createdAt: Date.now(),
      });
    }
    profiles[target.uid] = target;
    this._writeDemoJson(DEMO_PROFILES_KEY, profiles);
    return { ok: true, targetName: target.name, targetTag: target.friendTag };
  }

  async respondFriendRequest(fromUid, accept) {
    if (this.mode === 'cloud') {
      return await this._apiCall('respondFriendRequest', {
        playerId: this.playerId,
        fromUid,
        accept,
      });
    }

    const profiles = this._readDemoJson(DEMO_PROFILES_KEY, {});
    const me = profiles[this.playerId];
    if (!me) return { ok: false };
    me.incomingRequests = (me.incomingRequests || []).filter((r) => r.uid !== fromUid);
    me.friends = me.friends || [];
    if (accept && !me.friends.includes(fromUid)) {
      me.friends.push(fromUid);
      if (profiles[fromUid]) {
        profiles[fromUid].friends = profiles[fromUid].friends || [];
        if (!profiles[fromUid].friends.includes(this.playerId)) {
          profiles[fromUid].friends.push(this.playerId);
        }
      }
    }
    this._writeDemoJson(DEMO_PROFILES_KEY, profiles);
    return { ok: true, accepted: Boolean(accept) };
  }

  async removeFriend(friendUid) {
    if (this.mode === 'cloud') {
      return await this._apiCall('removeFriend', { playerId: this.playerId, friendUid });
    }
    const profiles = this._readDemoJson(DEMO_PROFILES_KEY, {});
    if (profiles[this.playerId]) {
      profiles[this.playerId].friends = (profiles[this.playerId].friends || []).filter((id) => id !== friendUid);
    }
    if (profiles[friendUid]) {
      profiles[friendUid].friends = (profiles[friendUid].friends || []).filter((id) => id !== this.playerId);
    }
    this._writeDemoJson(DEMO_PROFILES_KEY, profiles);
    return { ok: true };
  }

  async sendGameChallenge(targetUid, { playerName, timeControlSeconds = 600, incrementSeconds = 0, variant = 'standard' }) {
    if (this.mode === 'cloud') {
      return await this._apiCall('sendGameChallenge', {
        playerId: this.playerId,
        playerName,
        targetUid,
        timeControlSeconds,
        incrementSeconds,
        variant,
      });
    }

    const challengeId = 'ch_' + Math.random().toString(36).slice(2, 9);
    const ch = {
      challengeId,
      fromUid: this.playerId,
      fromName: playerName || 'Jogador',
      fromTag: this.friendTag,
      targetUid,
      status: 'pending',
      timeControl: { initialSeconds: Number(timeControlSeconds), incrementSeconds: Number(incrementSeconds) },
      variant,
      createdAt: Date.now(),
    };
    const challenges = this._readDemoJson(DEMO_CHALLENGES_KEY, {});
    challenges[challengeId] = ch;
    this._writeDemoJson(DEMO_CHALLENGES_KEY, challenges);
    return { ok: true, challengeId, challenge: ch };
  }

  async respondGameChallenge(challengeId, { playerName, accept, pieceCustomization = null }) {
    if (this.mode === 'cloud') {
      const res = await this._apiCall('respondGameChallenge', {
        playerId: this.playerId,
        playerName,
        challengeId,
        accept,
        pieceCustomization,
      });
      if (res.accepted) {
        this.currentRoomId = res.roomId;
        this.currentAccessKey = res.accessKey;
        this.currentIsPrivate = true;
        this.myColor = res.myColor || 'b';
      }
      return res;
    }

    const challenges = this._readDemoJson(DEMO_CHALLENGES_KEY, {});
    const ch = challenges[challengeId];
    if (!ch) throw new Error('Convite expirado.');
    if (!accept) {
      ch.status = 'declined';
      this._writeDemoJson(DEMO_CHALLENGES_KEY, challenges);
      return { ok: true, accepted: false };
    }

    const created = await this.createRoom({
      playerName: ch.fromName,
      timeControlSeconds: ch.timeControl?.initialSeconds ?? 600,
      incrementSeconds: ch.timeControl?.incrementSeconds ?? 0,
      preferredColor: 'w',
      isPrivate: true,
    });
    // Seat challenger as white and responder (self) as black in demo room
    const room = created.room;
    room.white.uid = ch.fromUid;
    room.white.name = ch.fromName;
    room.black = {
      uid: this.playerId,
      name: playerName || 'Amigo',
      connected: true,
      lastSeen: Date.now(),
      timeLeftMs: room.white.timeLeftMs,
      pieceCustomization,
    };
    room.status = 'playing';
    this._writeDemoRoom(room);

    this.currentRoomId = room.roomId;
    this.currentAccessKey = room.accessKey;
    this.currentIsPrivate = true;
    this.myColor = 'b';

    ch.status = 'accepted';
    ch.roomId = room.roomId;
    ch.accessKey = room.accessKey;
    this._writeDemoJson(DEMO_CHALLENGES_KEY, challenges);

    return { ok: true, accepted: true, roomId: room.roomId, accessKey: room.accessKey, myColor: 'b', room };
  }

  async ackChallenge(challengeId) {
    if (this.mode === 'cloud') {
      await this._apiCall('ackChallenge', { challengeId });
      return;
    }
    const challenges = this._readDemoJson(DEMO_CHALLENGES_KEY, {});
    if (challenges[challengeId]) {
      challenges[challengeId].status = 'consumed';
      this._writeDemoJson(DEMO_CHALLENGES_KEY, challenges);
    }
  }
}
