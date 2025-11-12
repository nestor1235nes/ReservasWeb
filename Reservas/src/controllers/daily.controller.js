import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import TeleSession from '../models/teleSession.model.js';
import User from '../models/user.model.js';
import { DAILY_API_KEY, FRONTEND_URL } from '../config.js';

// Base Daily REST API
const DAILY_API_BASE = 'https://api.daily.co/v1';

// Helper to call Daily API with server-side key
const dailyRequest = (method, path, data) => {
  return axios({
    method,
    url: `${DAILY_API_BASE}${path}`,
    data,
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
};

// Create or get room by name
const ensureRoom = async (roomName) => {
  try {
    // Try to get room
    const res = await dailyRequest('get', `/rooms/${roomName}`);
    return res.data;
  } catch (error) {
    // If not found, create it
    if (error.response && error.response.status === 404) {
      const res = await dailyRequest('post', '/rooms', {
        name: roomName,
        privacy: 'private', // require tokens
        properties: {
          enable_prejoin_ui: true,
          enable_people_ui: true,
          // Optional: try to limit participants to 2 (if supported by plan)
          // max_participants: 2,
        },
      });
      return res.data;
    }
    throw error;
  }
};

// helpers
const genShareId = () => crypto.randomBytes(9).toString('base64url'); // 12-char URL-safe id
const genPassword = (len = 6) => crypto.randomInt(10 ** (len - 1), 10 ** len).toString(); // 6-digit code
const nowSec = () => Math.floor(Date.now() / 1000);

const extractMinutes = (value) => {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.round(value));
  const str = String(value);
  const m = str.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
};

// Determine session duration based on professional settings
async function resolveSessionDurationMinutes(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return 30;
  // Prefer a servicio virtual with a numeric duration
  if (Array.isArray(user.servicios)) {
    const virtual = user.servicios.find(s => (s?.modalidad || '').toLowerCase().includes('virtual')) || user.servicios[0];
    const mins = extractMinutes(virtual?.duracion);
    if (mins) return Math.min(180, Math.max(5, mins));
  }
  // Fallback to timetable interval
  if (Array.isArray(user.timetable) && user.timetable.length > 0) {
    const any = user.timetable.find(t => typeof t?.interval === 'number') || user.timetable[0];
    if (typeof any?.interval === 'number' && any.interval > 0) {
      return Math.min(180, Math.max(5, Math.round(any.interval)));
    }
  }
  return 30;
}

export const createMeetingToken = async (req, res) => {
  try {
    const { roomName, ttlSeconds = 1800, is_owner = false } = req.body; // default 30 minutes

    if (!DAILY_API_KEY) {
      return res.status(500).json({ message: 'Daily API key not configured on server.' });
    }

    if (!roomName) {
      return res.status(400).json({ message: 'roomName is required' });
    }

    // Ensure the room exists (create if missing)
    const room = await ensureRoom(roomName);

    // Create meeting token (do not send unsupported 'ttl' parameter)
    const tokenResp = await dailyRequest('post', '/meeting-tokens', {
      properties: {
        room_name: room.name || room.room_name || (room.url && room.url.split('/').pop()),
        is_owner,
        enable_recording: false,
      }
    });

    // token may appear in different fields depending on API response shape
    const meetingToken = tokenResp.data && (tokenResp.data.value || tokenResp.data.token || tokenResp.data.id || tokenResp.data?.token?.value);

    // Build a room URL usable by the client. Daily rooms typically are https://<domain>/<roomName>
    const roomUrl = room.url || `https://${room.domain || 'daily.co'}/${room.name}`;

    return res.json({ token: meetingToken, room: { ...room, url: roomUrl } });
  } catch (error) {
    console.error('Daily error', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to create daily meeting token', details: error.message });
  }
};

export const createShareLink = async (req, res) => {
  try {
    // Auth middleware ensures req.user
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

  const roomName = `user_${userId}`;

    if (!DAILY_API_KEY) {
      return res.status(500).json({ message: 'Daily API key not configured on server.' });
    }

  const room = await ensureRoom(roomName);

    // Create patient token (non-owner)
    // Create owner token (for professional) so they can join with owner privileges
    // Determine session duration from professional settings
    const durationMinutes = await resolveSessionDurationMinutes(userId);

    const ownerTokenResp = await dailyRequest('post', '/meeting-tokens', {
      properties: {
        room_name: room.name || room.room_name || (room.url && room.url.split('/').pop()),
        is_owner: true,
      }
    });
    const ownerToken = ownerTokenResp.data && (ownerTokenResp.data.value || ownerTokenResp.data.token || ownerTokenResp.data.id || ownerTokenResp.data?.token?.value);

    const roomUrl = room.url || `https://${room.domain || 'daily.co'}/${room.name}`;

    // Create secure share session (no Daily token in URL)
    const shareId = genShareId();
    const passwordPlain = genPassword(6);
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    await TeleSession.create({
      shareId,
      roomName: room.name || room.room_name || (room.url && room.url.split('/').pop()),
      roomUrl,
      professional: userId,
      passwordHash,
      durationMinutes,
      expiresAt,
      maxPatientJoins: 1,
      patientJoins: 0,
      revoked: false,
    });

    const professionalName = req.user?.username || req.user?.name || 'Profesional';
    const shareUrl = `${(process.env.FRONTEND_URL || FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/telemedicina/join?sid=${encodeURIComponent(shareId)}&name=${encodeURIComponent(professionalName)}`;

    return res.json({ shareUrl, room: { ...room, url: roomUrl }, ownerToken, password: passwordPlain, expiresAt, durationMinutes });
  } catch (error) {
    console.error('Daily share error', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to create share link', details: error.response?.data || error.message });
  }
};

export const joinPublic = async (req, res) => {
  try {
    const { shareId, password } = req.body;
    if (!shareId || !password) return res.status(400).json({ message: 'shareId and password are required' });

    const session = await TeleSession.findOne({ shareId });
    if (!session) return res.status(404).json({ message: 'Invalid or expired link' });
    if (session.revoked) return res.status(403).json({ message: 'Link revoked' });
    if (new Date() > session.expiresAt) return res.status(410).json({ message: 'Link expired' });
    if (session.patientJoins >= session.maxPatientJoins) return res.status(403).json({ message: 'Máximo de usos de enlace alcanzado' });

    const ok = await bcrypt.compare(password, session.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid password' });

    // issue short-lived meeting token for the patient
    // Remaining minutes until link expiration + 5 min grace (1..120)
    const remainingMs = session.expiresAt.getTime() - Date.now();
    const remainingMinutes = Math.max(1, Math.floor(remainingMs / 60000));
    const tokenTtlMinutes = Math.min(120, remainingMinutes + 5);

    const tokenResp = await dailyRequest('post', '/meeting-tokens', {
      properties: {
        room_name: session.roomName,
        is_owner: false,
      }
    });
    const token = tokenResp.data && (tokenResp.data.value || tokenResp.data.token || tokenResp.data.id || tokenResp.data?.token?.value);

    // increment usage count
    session.patientJoins += 1;
    await session.save();

    return res.json({ token, room: { url: session.roomUrl, name: session.roomName } });
  } catch (error) {
    console.error('Daily join-public error', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to join session', details: error.response?.data || error.message });
  }
};

export const revokeShare = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { shareId } = req.params;
    const session = await TeleSession.findOne({ shareId, professional: userId });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.revoked = true;
    await session.save();
    return res.json({ revoked: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
