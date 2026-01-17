import WhatsAppPlatformConfig from '../models/whatsappPlatformConfig.model.js';

const maskToken = (token) => {
  const t = String(token || '');
  if (!t) return '';
  if (t.length <= 8) return '********';
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
};

export const getWhatsAppPlatformCredentials = async (_req, res) => {
  const doc = await WhatsAppPlatformConfig.findOne({ key: 'default' }).lean();
  const configured = Boolean(doc?.idInstance && doc?.apiTokenInstance);
  return res.json({
    ok: true,
    configured,
    idInstance: doc?.idInstance || '',
    apiTokenInstanceMasked: maskToken(doc?.apiTokenInstance || ''),
    updatedAt: doc?.updatedAt || null,
  });
};

export const setWhatsAppPlatformCredentials = async (req, res) => {
  const idInstance = String(req.body?.idInstance || '').trim();
  const apiTokenInstance = String(req.body?.apiTokenInstance || '').trim();
  if (!idInstance || !apiTokenInstance) {
    return res.status(400).json({ ok: false, message: 'Debes enviar { idInstance, apiTokenInstance }' });
  }

  const updated = await WhatsAppPlatformConfig.findOneAndUpdate(
    { key: 'default' },
    { key: 'default', idInstance, apiTokenInstance, updatedBy: req.user?.id },
    { upsert: true, new: true }
  ).lean();

  return res.json({
    ok: true,
    configured: true,
    idInstance: updated?.idInstance || idInstance,
    apiTokenInstanceMasked: maskToken(updated?.apiTokenInstance || apiTokenInstance),
    updatedAt: updated?.updatedAt || null,
  });
};
