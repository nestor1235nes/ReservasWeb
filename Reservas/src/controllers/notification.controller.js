import { sendMail } from '../libs/mailer.js';

export const sendEmail = async (req, res) => {
  try {
  const { to, subject, html, text, fromEmail, fromName, replyTo } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ message: 'Parámetros insuficientes (to, subject y html o text requeridos)' });
    }

  const info = await sendMail({ to, subject, html, text, fromEmail, fromName, replyTo });

    return res.status(200).json({ ok: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error enviando email:', error);
    return res.status(500).json({ message: 'Error enviando email', error: error.message });
  }
};

export const verifyEmailTransport = async (_req, res) => {
  try {
    const mode = (process.env.USE_BREVO_API || 'false').toLowerCase() === 'true' ? 'api' : 'smtp';
    const summary = {
      mode,
      host: process.env.BREVO_SMTP_HOST,
      port: process.env.BREVO_SMTP_PORT,
      fromEmail: process.env.FROM_EMAIL,
      fromName: process.env.FROM_NAME,
      hasUser: Boolean(process.env.BREVO_SMTP_USER),
      hasPass: Boolean(process.env.BREVO_SMTP_PASS),
      hasApiKey: Boolean(process.env.BREVO_API_KEY),
    };
    if (mode === 'smtp') {
      // Attempt a real SMTP verify
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.BREVO_SMTP_PORT || 587),
        secure: Number(process.env.BREVO_SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.BREVO_SMTP_USER,
          pass: process.env.BREVO_SMTP_PASS,
        },
      });
      await transporter.verify();
      return res.json({ ok: true, ...summary });
    }
    // API mode: we can't truly verify without sending, but report readiness
    if (!process.env.BREVO_API_KEY) {
      return res.status(400).json({ ok: false, ...summary, message: 'Falta BREVO_API_KEY' });
    }
    return res.json({ ok: true, ...summary });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
};
