import crypto from 'node:crypto';
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
const USER_DOC_PREFIX = 'chess3d_user_';
const CHALLENGE_DOC_PREFIX = 'chess3d_challenge_';

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

function generateAccessKey() {
  return crypto.randomBytes(9).toString('base64url');
}

function hashAccessKey(key) {
  return crypto.createHash('sha256').update(String(key || '')).digest('hex');
}

function stripRoomSecrets(room) {
  if (!room || typeof room !== 'object') return room;
  const { accessKeyHash, ...safe } = room;
  return safe;
}

function verifyRoomAccess(room, playerId, accessKey) {
  if (!room.isPrivate) return { ok: true };
  if (accessKey && hashAccessKey(accessKey) === room.accessKeyHash) {
    return { ok: true };
  }
  if (playerId && (room.white?.uid === playerId || room.black?.uid === playerId)) {
    return { ok: true };
  }
  return { ok: false, error: 'Sala privada: acesso permitido apenas pelo link com senha única.' };
}

function buildFriendTag(name, explicitTag) {
  if (explicitTag && /^[A-Za-zÀ-ÿ0-9_-]{2,16}#[A-Z0-9]{4}$/i.test(String(explicitTag).trim())) {
    return String(explicitTag).trim();
  }
  const cleanName = String(name || 'Jogador').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12) || 'Jogador';
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${cleanName}#${suffix}`;
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
    const userDoc = (uid) => doc(db, FIRESTORE_COLLECTION, `${USER_DOC_PREFIX}${uid}`);
    const challengeDoc = (cid) => doc(db, FIRESTORE_COLLECTION, `${CHALLENGE_DOC_PREFIX}${cid}`);

    if (action === 'ping') {
      return sendJson(res, 200, { ok: true, mode: 'cloud_secure', serverTime: Date.now() });
    }

    // ==================== SOCIAL: PROFILE, FRIENDS & CHALLENGES ====================
    if (action === 'registerProfile') {
      const { playerId, playerName, friendTag } = body;
      if (!playerId) return sendJson(res, 400, { ok: false, error: 'ID do jogador ausente.' });
      const now = Date.now();
      const ref = userDoc(playerId);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data() : null;
      const resolvedName = String(playerName || existing?.name || 'Jogador').slice(0, 20);
      const resolvedTag = existing?.friendTag || buildFriendTag(resolvedName, friendTag);
      const profileData = sanitizeData({
        app: 'chess3d_royale',
        docType: 'profile',
        uid: playerId,
        name: resolvedName,
        friendTag: resolvedTag,
        friendTagLower: resolvedTag.toLowerCase(),
        friends: Array.isArray(existing?.friends) ? existing.friends : [],
        incomingRequests: Array.isArray(existing?.incomingRequests) ? existing.incomingRequests : [],
        status: existing?.status || 'online',
        activityText: existing?.activityText || 'No menu / disponível',
        lastSeen: now,
        createdAt: existing?.createdAt || now,
      });
      await setDoc(ref, profileData, { merge: true });
      return sendJson(res, 200, { ok: true, profile: profileData, serverTime: now });
    }

    if (action === 'socialHeartbeat') {
      const { playerId, playerName, friendTag, status = 'online', activityText = '' } = body;
      if (!playerId) return sendJson(res, 400, { ok: false, error: 'ID ausente.' });
      const now = Date.now();
      const ref = userDoc(playerId);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data() : null;
      const resolvedName = String(playerName || existing?.name || 'Jogador').slice(0, 20);
      const resolvedTag = existing?.friendTag || buildFriendTag(resolvedName, friendTag);

      const patch = sanitizeData({
        app: 'chess3d_royale',
        docType: 'profile',
        uid: playerId,
        name: resolvedName,
        friendTag: resolvedTag,
        friendTagLower: resolvedTag.toLowerCase(),
        friends: Array.isArray(existing?.friends) ? existing.friends : [],
        incomingRequests: Array.isArray(existing?.incomingRequests) ? existing.incomingRequests : [],
        status: String(status || 'online').slice(0, 20),
        activityText: String(activityText || '').slice(0, 48),
        lastSeen: now,
        createdAt: existing?.createdAt || now,
      });
      await setDoc(ref, patch, { merge: true });

      // Resolve friends' live presence
      const friendIds = (patch.friends || []).slice(0, 30);
      const friendSnaps = await Promise.all(friendIds.map((fUid) => getDoc(userDoc(fUid))));
      const friends = friendSnaps
        .filter((s) => s.exists())
        .map((s) => {
          const f = s.data();
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

      // Fetch recent challenges involving this player
      const cutoff = now - 1000 * 60 * 3;
      const cq = query(
        collection(db, FIRESTORE_COLLECTION),
        where('app', '==', 'chess3d_royale'),
        where('docType', '==', 'challenge')
      );
      const cSnap = await getDocs(cq);
      const incomingChallenges = [];
      const acceptedChallenges = [];
      cSnap.forEach((d) => {
        const ch = d.data();
        if (!ch || (ch.createdAt && ch.createdAt < cutoff)) return;
        if (ch.targetUid === playerId && ch.status === 'pending') {
          incomingChallenges.push(ch);
        } else if (ch.fromUid === playerId && ch.status === 'accepted') {
          acceptedChallenges.push(ch);
        }
      });

      return sendJson(res, 200, {
        ok: true,
        profile: patch,
        friends,
        incomingRequests: patch.incomingRequests || [],
        incomingChallenges,
        acceptedChallenges,
        serverTime: now,
      });
    }

    if (action === 'sendFriendRequest') {
      const { playerId, playerName, targetTag } = body;
      const cleanTag = String(targetTag || '').trim().toLowerCase();
      if (!playerId || !cleanTag) {
        return sendJson(res, 400, { ok: false, error: 'Informe a Tag do amigo (ex: Nome#1A2B).' });
      }
      const senderSnap = await getDoc(userDoc(playerId));
      const sender = senderSnap.exists() ? senderSnap.data() : null;
      if (!sender) return sendJson(res, 400, { ok: false, error: 'Perfil não registrado.' });
      if (sender.friendTagLower === cleanTag) {
        return sendJson(res, 400, { ok: false, error: 'Você não pode adicionar a si mesmo.' });
      }

      const pq = query(
        collection(db, FIRESTORE_COLLECTION),
        where('app', '==', 'chess3d_royale'),
        where('docType', '==', 'profile'),
        where('friendTagLower', '==', cleanTag)
      );
      const pSnap = await getDocs(pq);
      if (pSnap.empty) {
        return sendJson(res, 404, { ok: false, error: `Nenhum jogador encontrado com a Tag "${targetTag}".` });
      }
      const targetDoc = pSnap.docs[0];
      const target = targetDoc.data();

      if (Array.isArray(target.friends) && target.friends.includes(playerId)) {
        return sendJson(res, 400, { ok: false, error: `${target.name} já está na sua lista de amigos.` });
      }

      const reqs = Array.isArray(target.incomingRequests) ? [...target.incomingRequests] : [];
      if (!reqs.some((r) => r.uid === playerId)) {
        reqs.push({
          uid: playerId,
          name: String(playerName || sender.name || 'Jogador').slice(0, 20),
          friendTag: sender.friendTag,
          createdAt: Date.now(),
        });
        await setDoc(userDoc(target.uid), { incomingRequests: reqs }, { merge: true });
      }

      return sendJson(res, 200, { ok: true, targetName: target.name, targetTag: target.friendTag });
    }

    if (action === 'respondFriendRequest') {
      const { playerId, fromUid, accept } = body;
      if (!playerId || !fromUid) return sendJson(res, 400, { ok: false, error: 'Dados inválidos.' });
      const myRef = userDoc(playerId);
      const mySnap = await getDoc(myRef);
      if (!mySnap.exists()) return sendJson(res, 404, { ok: false, error: 'Perfil não encontrado.' });

      const me = mySnap.data();
      const nextReqs = (me.incomingRequests || []).filter((r) => r.uid !== fromUid);
      const myFriends = Array.isArray(me.friends) ? [...me.friends] : [];

      if (accept) {
        if (!myFriends.includes(fromUid)) myFriends.push(fromUid);
        const otherRef = userDoc(fromUid);
        const otherSnap = await getDoc(otherRef);
        if (otherSnap.exists()) {
          const other = otherSnap.data();
          const otherFriends = Array.isArray(other.friends) ? [...other.friends] : [];
          if (!otherFriends.includes(playerId)) {
            otherFriends.push(playerId);
            await setDoc(otherRef, { friends: otherFriends }, { merge: true });
          }
        }
      }

      await setDoc(myRef, { incomingRequests: nextReqs, friends: myFriends }, { merge: true });
      return sendJson(res, 200, { ok: true, accepted: Boolean(accept) });
    }

    if (action === 'removeFriend') {
      const { playerId, friendUid } = body;
      if (!playerId || !friendUid) return sendJson(res, 400, { ok: false });
      const [mySnap, otherSnap] = await Promise.all([getDoc(userDoc(playerId)), getDoc(userDoc(friendUid))]);
      if (mySnap.exists()) {
        const me = mySnap.data();
        await setDoc(userDoc(playerId), { friends: (me.friends || []).filter((id) => id !== friendUid) }, { merge: true });
      }
      if (otherSnap.exists()) {
        const other = otherSnap.data();
        await setDoc(userDoc(friendUid), { friends: (other.friends || []).filter((id) => id !== playerId) }, { merge: true });
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'sendGameChallenge') {
      const { playerId, playerName, targetUid, timeControlSeconds = 600, incrementSeconds = 0, variant = 'standard' } = body;
      if (!playerId || !targetUid) return sendJson(res, 400, { ok: false, error: 'Destinatário ausente.' });
      const now = Date.now();
      const senderSnap = await getDoc(userDoc(playerId));
      const senderTag = senderSnap.exists() ? senderSnap.data().friendTag : '';
      const challengeId = 'ch_' + crypto.randomBytes(5).toString('hex');
      const challengeData = sanitizeData({
        app: 'chess3d_royale',
        docType: 'challenge',
        challengeId,
        fromUid: playerId,
        fromName: String(playerName || 'Jogador').slice(0, 20),
        fromTag: senderTag,
        targetUid,
        status: 'pending',
        timeControl: { initialSeconds: Number(timeControlSeconds), incrementSeconds: Number(incrementSeconds) },
        variant: variant || 'standard',
        createdAt: now,
      });
      await setDoc(challengeDoc(challengeId), challengeData);
      return sendJson(res, 200, { ok: true, challengeId, challenge: challengeData, serverTime: now });
    }

    if (action === 'respondGameChallenge') {
      const { playerId, playerName, challengeId, accept, pieceCustomization = null } = body;
      if (!playerId || !challengeId) return sendJson(res, 400, { ok: false, error: 'Desafio inválido.' });
      const chRef = challengeDoc(challengeId);
      const chSnap = await getDoc(chRef);
      if (!chSnap.exists()) return sendJson(res, 404, { ok: false, error: 'Convite expirado ou não encontrado.' });

      const ch = chSnap.data();
      if (ch.targetUid !== playerId) return sendJson(res, 403, { ok: false, error: 'Desafio não pertence a este jogador.' });

      if (!accept) {
        await setDoc(chRef, { status: 'declined' }, { merge: true });
        return sendJson(res, 200, { ok: true, accepted: false });
      }

      const roomId = generateRoomCode();
      const accessKey = generateAccessKey();
      const accessKeyHash = hashAccessKey(accessKey);
      const now = Date.now();
      const tc = ch.timeControl || { initialSeconds: 600, incrementSeconds: 0 };
      const ms = tc.initialSeconds > 0 ? tc.initialSeconds * 1000 : 0;

      const roomData = sanitizeData({
        app: 'chess3d_royale',
        roomId,
        isPrivate: true,
        allowSpectators: false,
        accessKeyHash,
        variant: ch.variant || 'standard',
        status: 'playing',
        createdAt: now,
        updatedAt: now,
        timeControl: tc,
        white: {
          uid: ch.fromUid,
          name: ch.fromName || 'Desafiante',
          connected: true,
          lastSeen: now,
          timeLeftMs: ms,
          pieceCustomization: null,
        },
        black: {
          uid: playerId,
          name: String(playerName || 'Convidado').slice(0, 20),
          connected: true,
          lastSeen: now,
          timeLeftMs: ms,
          pieceCustomization: pieceCustomization || null,
        },
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
            text: `Partida privada iniciada entre ${ch.fromName} e ${playerName || 'Amigo'}.`,
            timestamp: now,
          },
        },
      });

      await setDoc(roomDoc(roomId), roomData);
      await setDoc(chRef, { status: 'accepted', roomId, accessKey }, { merge: true });

      return sendJson(res, 200, {
        ok: true,
        accepted: true,
        roomId,
        accessKey,
        myColor: 'b',
        room: stripRoomSecrets(roomData),
        serverTime: now,
      });
    }

    if (action === 'ackChallenge') {
      const { challengeId } = body;
      if (challengeId) {
        await setDoc(challengeDoc(challengeId), { status: 'consumed' }, { merge: true });
      }
      return sendJson(res, 200, { ok: true });
    }

    // ==================== ROOMS: PUBLIC & PRIVATE (UNIQUE PASSWORD) ====================
    if (action === 'listRooms') {
      const cutoff = Date.now() - 1000 * 60 * 60 * 6;
      const q = query(collection(db, FIRESTORE_COLLECTION), where('app', '==', 'chess3d_royale'));
      const snap = await getDocs(q);
      const rooms = [];
      snap.forEach((d) => {
        const r = d.data();
        if (r && r.roomId && !r.isPrivate && !r.docType && (!r.createdAt || r.createdAt > cutoff)) {
          rooms.push(stripRoomSecrets(r));
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
      const room = snap.data();
      const auth = verifyRoomAccess(room, body.playerId, body.accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });
      return sendJson(res, 200, { ok: true, room: stripRoomSecrets(room), serverTime: Date.now() });
    }

    if (action === 'createRoom') {
      const {
        playerId,
        playerName,
        timeControlSeconds = 600,
        incrementSeconds = 0,
        preferredColor = 'w',
        pieceCustomization = null,
        isPrivate = true,
        allowSpectators = false,
      } = body;
      if (!playerId) return sendJson(res, 400, { ok: false, error: 'ID do jogador ausente.' });

      const roomId = generateRoomCode();
      const now = Date.now();
      const hostSide = preferredColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : preferredColor;
      const ms = timeControlSeconds > 0 ? timeControlSeconds * 1000 : 0;
      const privateFlag = Boolean(isPrivate);
      const accessKey = privateFlag ? generateAccessKey() : null;
      const accessKeyHash = accessKey ? hashAccessKey(accessKey) : null;

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
        isPrivate: privateFlag,
        allowSpectators: Boolean(allowSpectators),
        accessKeyHash,
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
            text: privateFlag
              ? `Sala privada ${roomId} criada (protegida por senha única). Aguardando convidado...`
              : `Sala ${roomId} criada. Aguardando oponente...`,
            timestamp: now,
          },
        },
      });

      await setDoc(roomDoc(roomId), roomData);
      return sendJson(res, 200, {
        ok: true,
        roomId,
        accessKey,
        myColor: hostSide,
        room: stripRoomSecrets(roomData),
        serverTime: now,
      });
    }

    if (action === 'joinRoom') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { playerId, playerName, pieceCustomization = null, accessKey = null } = body;
      if (!roomId || !playerId) return sendJson(res, 400, { ok: false, error: 'Dados da sala inválidos.' });

      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 404, { ok: false, error: `Sala "${roomId}" não encontrada.` });

      const room = snap.data();
      const auth = verifyRoomAccess(room, playerId, accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });

      const now = Date.now();
      let assignedColor = 'spectator';

      if (room.white?.uid === playerId) assignedColor = 'w';
      else if (room.black?.uid === playerId) assignedColor = 'b';
      else if (!room.white) assignedColor = 'w';
      else if (!room.black) assignedColor = 'b';

      if (assignedColor === 'spectator' && room.isPrivate && !room.allowSpectators) {
        return sendJson(res, 403, { ok: false, error: 'Esta sala privada já está completa e fechada (2/2 jogadores).' });
      }

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

      return sendJson(res, 200, {
        ok: true,
        roomId,
        myColor: assignedColor,
        room: stripRoomSecrets(room),
        serverTime: now,
      });
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
          !r.isPrivate &&
          !r.docType &&
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
        return sendJson(res, 200, {
          ok: true,
          matched: true,
          roomId: room.roomId,
          myColor: assignedColor,
          room: stripRoomSecrets(room),
          serverTime: now,
        });
      }

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
        isPrivate: false,
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
      return sendJson(res, 200, {
        ok: true,
        matched: false,
        roomId,
        myColor: 'w',
        room: stripRoomSecrets(roomData),
        serverTime: now,
      });
    }

    if (action === 'heartbeat') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { playerId, color, accessKey } = body;
      if (!roomId) return sendJson(res, 400, { ok: false, error: 'Sala ausente.' });
      const snap = await getDoc(roomDoc(roomId));
      if (!snap.exists()) return sendJson(res, 404, { ok: false, error: 'Sala não encontrada.' });

      const room = snap.data();
      const auth = verifyRoomAccess(room, playerId, accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });

      const now = Date.now();
      const sideKey = color === 'w' ? 'white' : color === 'b' ? 'black' : null;
      if (sideKey && room[sideKey]?.uid === playerId) {
        room[sideKey].connected = true;
        room[sideKey].lastSeen = now;
        await setDoc(roomDoc(roomId), { [sideKey]: { connected: true, lastSeen: now } }, { merge: true });
      }
      return sendJson(res, 200, { ok: true, room: stripRoomSecrets(room), serverTime: now });
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
      const { playerId, color, accessKey, fen, turn, lastMove, moves, whiteTimeLeftMs, blackTimeLeftMs, result } = body;
      if (!roomId) return sendJson(res, 400, { ok: false, error: 'Sala ausente.' });

      const preSnap = await getDoc(roomDoc(roomId));
      if (!preSnap.exists()) return sendJson(res, 404, { ok: false, error: 'Sala não encontrada.' });
      const auth = verifyRoomAccess(preSnap.data(), playerId, accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });

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
      return sendJson(res, 200, { ok: true, room: stripRoomSecrets(snap.data()), serverTime: now });
    }

    if (action === 'sendChat') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const { senderName, text, playerId, accessKey } = body;
      if (!roomId || !text) return sendJson(res, 400, { ok: false });
      const preSnap = await getDoc(roomDoc(roomId));
      if (!preSnap.exists()) return sendJson(res, 404, { ok: false });
      const auth = verifyRoomAccess(preSnap.data(), playerId, accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });

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
      const preSnap = await getDoc(roomDoc(roomId));
      if (!preSnap.exists()) return sendJson(res, 404, { ok: false });
      const auth = verifyRoomAccess(preSnap.data(), body.playerId, body.accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });
      await setDoc(roomDoc(roomId), { drawOfferBy: body.color, updatedAt: Date.now() }, { merge: true });
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'respondDraw') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const preSnap = await getDoc(roomDoc(roomId));
      if (!preSnap.exists()) return sendJson(res, 404, { ok: false });
      const auth = verifyRoomAccess(preSnap.data(), body.playerId, body.accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });
      const patch = body.accept
        ? { drawOfferBy: null, status: 'finished', result: { winner: 'draw', reason: 'Acordo de empate' }, updatedAt: Date.now() }
        : { drawOfferBy: null, updatedAt: Date.now() };
      await setDoc(roomDoc(roomId), patch, { merge: true });
      return sendJson(res, 200, { ok: true });
    }

    if (action === 'resign') {
      const roomId = String(body.roomId || '').trim().toUpperCase();
      const preSnap = await getDoc(roomDoc(roomId));
      if (!preSnap.exists()) return sendJson(res, 404, { ok: false });
      const auth = verifyRoomAccess(preSnap.data(), body.playerId, body.accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });
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
      const auth = verifyRoomAccess(room, body.playerId, body.accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });

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
      const preSnap = await getDoc(roomDoc(roomId));
      if (!preSnap.exists()) return sendJson(res, 404, { ok: false });
      const auth = verifyRoomAccess(preSnap.data(), body.playerId, body.accessKey);
      if (!auth.ok) return sendJson(res, 403, { ok: false, error: auth.error });
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
