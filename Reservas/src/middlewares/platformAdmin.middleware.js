import User from '../models/user.model.js';

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

export const platformAdminOnly = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const allowUserId = String(process.env.PLATFORM_ADMIN_USER_ID || '').trim();
    if (allowUserId && String(userId) === allowUserId) return next();

    const allowEmails = new Set([
      ...parseCsv(process.env.PLATFORM_ADMIN_EMAILS),
      ...parseCsv(process.env.PLATFORM_ADMIN_EMAIL),
    ]);

    // Compatibilidad: si no se configuró ninguna restricción, permitir (misma filosofía que /admin/planes).
    // Recomendado en producción: definir PLATFORM_ADMIN_EMAILS o PLATFORM_ADMIN_USER_ID.
    if (!allowUserId && allowEmails.size === 0) {
      return next();
    }

    const user = await User.findById(userId).select('email').lean();
    const email = String(user?.email || '').toLowerCase();
    if (!email || !allowEmails.has(email)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  } catch (e) {
    return res.status(500).json({ message: e?.message || String(e) });
  }
};
