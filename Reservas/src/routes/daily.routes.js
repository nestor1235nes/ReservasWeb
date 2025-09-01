import { Router } from 'express';
import { createMeetingToken, createShareLink } from '../controllers/daily.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import axios from 'axios';
import { DAILY_API_KEY } from '../config.js';

const DAILY_API_BASE = 'https://api.daily.co/v1';

// Temporary test route (no auth) to check Daily connectivity. Remove in production.
async function testDaily(req, res) {
	try {
		if (!DAILY_API_KEY) return res.status(500).json({ message: 'Daily API key not configured' });
		const r = await axios.get(`${DAILY_API_BASE}/ping`, { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } });
		return res.json({ ok: true, data: r.data });
	} catch (error) {
		return res.status(500).json({ message: error.response?.data || error.message });
	}
}

const router = Router();

// Protected endpoint to get a temporary meeting token for a room
router.post('/token', auth, createMeetingToken);
router.post('/share', auth, createShareLink);
router.get('/test', testDaily);

export default router;
