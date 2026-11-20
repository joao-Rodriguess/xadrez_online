import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

const FIRESTORE_COLLECTION = 'players';
const ROOM_DOC_PREFIX = 'chess3d_room_';

let cachedFirestore = null;

function getServerFirestore() {
  if (cachedFirestore) return cachedFirestore;
  const raw = process.env.FIREBASE_CONFIG_JSON;
  if (!raw) {
    throw new Error('Servidor em modo local (variável FIREBASE_CONFIG_JSON não definida no ambiente).');
  }
  const cfg = JSON.parse(raw);
  const appName = 'chess3d_server_proxy';
  const existing = getApps().find((a) => a.name === appName);
  const app = existing || initializeApp(cfg, appName);
  cachedFirestore = getFirestore(app);
  return cachedFirestore;
}

function sanitizeData(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  try {
    const db = getServerFirestore();
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const body = req.method === 'POST' ? await readBody(req) : {};
    const action = body.action || urlObj.searchParams.get('action') || '';

    const roomDoc = (roomId) => doc(db, FIRESTORE_COLLECTION, `${ROOM_DOC_PREFIX}${roomId}`);

    if (action === 'ping') {
      return sendJson(res, 200, { ok: true, mode: 'cloud_secure', serverTime: Date.now() });
    }

    if (action === 'listRooms') {
      const cutoff = Date.now() - 1000 * 60 * 60 * 6;
      const q = query(collection(db, FIRESTORE_COLLECTION), where('app', '==', 'chess3d_royale'));
      const snap = await getDocs(q);
      const rooms = [];
      snap.forEach((d) => {
        const r = d.data();
        if (r && r.roomId && (!r.createdAt || r.createdAt > cutoff)) {
          rooms.push(r);
        }
      });
      rooms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return sendJson(res, 200, { ok: true, rooms: rooms.slice(0, 12), serverTime: Date.now() });
    }

    if (action === 'getRoom') {
      const roomId = (body.roomId || urlObj.searchParams.get('roomId') || '').trim().toUpperCase();
      if (!roomId) return sendJson(res, 400, { ok: false, error: 'Código da sala ausente.' });
      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 404, { ok: false, error: 'Sala não encontrada.' });
      return sendJson(res, 200, { ok: true, room: snap.data(), serverTime: Date.now() });
    }

    if (action === 'createRoom') {
      const { playerId, playerName, timeControlSeconds = 600, incrementSeconds = 0, preferredColor = 'w', pieceCustomization = null } = body;
      if (!playerId) return sendJson(res, 400, { ok: false, error: 'ID do jogador ausente.' });

      const roomId = generateRoomCode();
      const now = Date.now();
      const hostSide = preferredColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : preferredColor;
      const ms = timeControlSeconds > 0 ? timeControlSeconds * 1000 : 0;

      const hostPayload = {
        uid: playerId,
        name: String(playerName || 'Anfitrião').slice(0, 24),
        connected: true,
        lastSeen: now,
        timeLeftMs: ms,
        pieceCustomization: pieceCustomization || null,
      };

      const roomData = sanitizeData({
        app: 'chess3d_royale',
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
      });

      await setDoc(roomDoc(roomId), roomData);
      return sendJson(res, 200, { ok: true, roomId, myColor: hostSide, room: roomData, serverTime: now });
    }

    if (action === 'joinRoom') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { playerId, playerName, pieceCustomization = null } = body;
      if (!roomId || !playerId) return sendJson(res, 400, { ok: false, error: 'Dados da sala inválidos.' });

      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 404, { ok: false, error: `Sala "${roomId}" não encontrada.` });

      const room = snap.data();
      const now = Date.now();
      let assignedColor = 'spectator';

      if (room.white?.uid === playerId) assignedColor = 'w';
      else if (room.black?.uid === playerId) assignedColor = 'b';
      else if (!room.white) assignedColor = 'w';
      else if (!room.black) assignedColor = 'b';

      const ms = room.timeControl?.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;

      if (assignedColor === 'w' || assignedColor === 'b') {
        const sideKey = assignedColor === 'w' ? 'white' : 'black';
        const playerObj = sanitizeData({
          uid: playerId,
          name: String(playerName || (assignedColor === 'w' ? 'Brancas' : 'Pretas')).slice(0, 24),
          connected: true,
          lastSeen: now,
          timeLeftMs: room[sideKey]?.timeLeftMs ?? ms,
          pieceCustomization: pieceCustomization || room[sideKey]?.pieceCustomization || null,
        });
        room[sideKey] = playerObj;
        if (room.white && room.black && room.status === 'waiting') {
          room.status = 'playing';
        }
        room.updatedAt = now;

        await setDoc(
          roomDoc(roomId),
          { [sideKey]: playerObj, status: room.status, updatedAt: now },
          { merge: true }
        );
      }

      return sendJson(res, 200, { ok: true, roomId, myColor: assignedColor, room, serverTime: now });
    }

    if (action === 'quickMatch') {
      const { playerId, playerName, timeControlSeconds = 600, incrementSeconds = 0, pieceCustomization = null } = body;
      if (!playerId) return sendJson(res, 400, { ok: false, error: 'ID do jogador ausente.' });

      const cutoff = Date.now() - 1000 * 60 * 30;
      const q = query(collection(db, FIRESTORE_COLLECTION), where('app', '==', 'chess3d_royale'));
      const snap = await getDocs(q);
      const waitingRooms = [];
      snap.forEach((d) => {
        const r = d.data();
        if (
          r &&
          r.roomId &&
          r.status === 'waiting' &&
          (!r.createdAt || r.createdAt > cutoff) &&
          r.white?.uid !== playerId &&
          r.black?.uid !== playerId &&
          (!r.white || !r.black)
        ) {
          waitingRooms.push(r);
        }
      });
      waitingRooms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      if (waitingRooms.length > 0) {
        const room = waitingRooms[0];
        const now = Date.now();
        const assignedColor = !room.white ? 'w' : 'b';
        const sideKey = assignedColor === 'w' ? 'white' : 'black';
        const ms = room.timeControl?.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;
        const playerObj = sanitizeData({
          uid: playerId,
          name: String(playerName || (assignedColor === 'w' ? 'Brancas' : 'Pretas')).slice(0, 24),
          connected: true,
          lastSeen: now,
          timeLeftMs: ms,
          pieceCustomization: pieceCustomization || null,
        });
        room[sideKey] = playerObj;
        room.status = room.white && room.black ? 'playing' : 'waiting';
        room.updatedAt = now;
        await setDoc(
          roomDoc(room.roomId),
          { [sideKey]: playerObj, status: room.status, updatedAt: now },
          { merge: true }
        );
        return sendJson(res, 200, { ok: true, matched: true, roomId: room.roomId, myColor: assignedColor, room, serverTime: now });
      }

      // No waiting room found -> create a new open room automatically
      const roomId = generateRoomCode();
      const now = Date.now();
      const ms = timeControlSeconds > 0 ? timeControlSeconds * 1000 : 0;
      const hostPayload = {
        uid: playerId,
        name: String(playerName || 'Jogador').slice(0, 24),
        connected: true,
        lastSeen: now,
        timeLeftMs: ms,
        pieceCustomization: pieceCustomization || null,
      };
      const roomData = sanitizeData({
        app: 'chess3d_royale',
        roomId,
        status: 'waiting',
        createdAt: now,
        updatedAt: now,
        timeControl: { initialSeconds: timeControlSeconds, incrementSeconds },
        white: hostPayload,
        black: null,
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
            text: `Partida rápida ${roomId} aberta. Aguardando oponente...`,
            timestamp: now,
          },
        },
      });
      await setDoc(roomDoc(roomId), roomData);
      return sendJson(res, 200, { ok: true, matched: false, roomId, myColor: 'w', room: roomData, serverTime: now });
    }

    if (action === 'heartbeat') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { playerId, color } = body;
      if (!roomId) return sendJson(res, 400, { ok: false, error: 'Sala ausente.' });
      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 404, { ok: false, error: 'Sala não encontrada.' });

      const room = snap.data();
      const now = Date.now();
      const sideKey = color === 'w' ? 'white' : color === 'b' ? 'black' : null;
      if (sideKey && room[sideKey]?.uid === playerId) {
        room[sideKey].connected = true;
        room[sideKey].lastSeen = now;
        await setDoc(roomDoc(roomId), { [sideKey]: { connected: true, lastSeen: now } }, { merge: true });
      }
      return sendJson(res, 200, { ok: true, room, serverTime: now });
    }

    if (action === 'leaveRoom') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { playerId, color } = body;
      if (!roomId) return sendJson(res, 200, { ok: true });
      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 200, { ok: true });
      const room = snap.data();
      const sideKey = color === 'w' ? 'white' : color === 'b' ? 'black' : null;
      if (sideKey && room[sideKey]?.uid === playerId) {
        await setDoc(
          roomDoc(roomId),
          { [sideKey]: { connected: false, lastSeen: Date.now() }, updatedAt: Date.now() },
          { merge: true }
        );
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'sendMove') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { playerId, color, fen, turn, lastMove, moves, whiteTimeLeftMs, blackTimeLeftMs, result } = body;
      if (!roomId) return sendJson(res, 400, { ok: false, error: 'Sala ausente.' });

      const now = Date.now();
      const patch = {
        fen,
        turn,
        lastMove: lastMove || null,
        moves: Array.isArray(moves) ? moves : [],
        drawOfferBy: null,
        updatedAt: now,
      };
      if (typeof whiteTimeLeftMs === 'number') patch.white = { timeLeftMs: whiteTimeLeftMs };
      if (typeof blackTimeLeftMs === 'number') patch.black = { timeLeftMs: blackTimeLeftMs };
      if (color === 'w') patch.white = { ...(patch.white || {}), connected: true, lastSeen: now };
      if (color === 'b') patch.black = { ...(patch.black || {}), connected: true, lastSeen: now };
      if (result) {
        patch.result = result;
        patch.status = 'finished';
      }
      await setDoc(roomDoc(roomId), sanitizeData(patch), { merge: true });
      const snap = await getDoc(roomDoc(roomId));
      return sendJson(res, 200, { ok: true, room: snap.data(), serverTime: now });
    }

    if (action === 'sendChat') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { senderName, text } = body;
      if (!roomId || !text) return sendJson(res, 400, { ok: false });
      const now = Date.now();
      const msgKey = 'm_' + now + '_' + Math.random().toString(36).slice(2, 6);
      const msg = sanitizeData({
        sender: String(senderName || 'Jogador').slice(0, 24),
        text: String(text).trim().slice(0, 200),
        timestamp: now,
      });
      await setDoc(roomDoc(roomId), { chat: { [msgKey]: msg }, updatedAt: now }, { merge: true });
      return sendJson(res, 200, { ok: true, serverTime: now });
    }

    if (action === 'offerDraw') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      await setDoc(roomDoc(roomId), { drawOfferBy: body.color, updatedAt: Date.now() }, { merge: true });
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'respondDraw') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const patch = body.accept
        ? { drawOfferBy: null, status: 'finished', result: { winner: 'draw', reason: 'Acordo de empate' }, updatedAt: Date.now() }
        : { drawOfferBy: null, updatedAt: Date.now() };
      await setDoc(roomDoc(roomId), patch, { merge: true });
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'resign') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const winner = body.color === 'w' ? 'b' : 'w';
      await setDoc(
        roomDoc(roomId),
        { status: 'finished', result: { winner, reason: 'Desistência' }, updatedAt: Date.now() },
        { merge: true }
      );
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'requestRematch') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 404, { ok: false });
      const room = snap.data();
      const sideKey = body.color === 'w' ? 'white' : 'black';
      const votes = { ...(room.rematchVotes || {}), [sideKey]: true };
      const bothVoted = votes.white && votes.black;

      if (bothVoted) {
        const ms = room.timeControl?.initialSeconds > 0 ? room.timeControl.initialSeconds * 1000 : 0;
        const oldWhite = room.white;
        const oldBlack = room.black;
        const resetPatch = sanitizeData({
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
        await setDoc(roomDoc(roomId), resetPatch, { merge: true });
      } else {
        await setDoc(roomDoc(roomId), { rematchVotes: { [sideKey]: true }, updatedAt: Date.now() }, { merge: true });
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'syncPieceStyle') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const sideKey = body.color === 'w' ? 'white' : 'black';
      await setDoc(
        roomDoc(roomId),
        sanitizeData({ [sideKey]: { pieceCustomization: body.pieceCustomization }, updatedAt: Date.now() }),
        { merge: true }
      );
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'deleteRoom') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      if (roomId) await deleteDoc(roomDoc(roomId));
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 400, { ok: false, error: 'Ação desconhecida.' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err?.message || 'Erro interno no servidor.' });
  }
}
