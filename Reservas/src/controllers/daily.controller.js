import axios from 'axios';
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
      const res = await dailyRequest('post', '/rooms', { name: roomName });
      return res.data;
    }
    throw error;
  }
};

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
    const patientTokenResp = await dailyRequest('post', '/meeting-tokens', {
      properties: {
        room_name: room.name || room.room_name || (room.url && room.url.split('/').pop()),
        is_owner: false,
      }
    });
    const patientToken = patientTokenResp.data && (patientTokenResp.data.value || patientTokenResp.data.token || patientTokenResp.data.id || patientTokenResp.data?.token?.value);

    // Create owner token (for professional) so they can join with owner privileges
    const ownerTokenResp = await dailyRequest('post', '/meeting-tokens', {
      properties: {
        room_name: room.name || room.room_name || (room.url && room.url.split('/').pop()),
        is_owner: true,
      }
    });
    const ownerToken = ownerTokenResp.data && (ownerTokenResp.data.value || ownerTokenResp.data.token || ownerTokenResp.data.id || ownerTokenResp.data?.token?.value);

  const roomUrl = room.url || `https://${room.domain || 'daily.co'}/${room.name}`;

  // Include professional name in the share link for display on patient view
  const professionalName = req.user?.username || req.user?.name || 'Profesional';
  const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/telemedicina/join?url=${encodeURIComponent(roomUrl)}&token=${encodeURIComponent(patientToken)}&name=${encodeURIComponent(professionalName)}`;

    return res.json({ shareUrl, room: { ...room, url: roomUrl }, patientToken, ownerToken });
  } catch (error) {
    console.error('Daily share error', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to create share link', details: error.message });
  }
};
