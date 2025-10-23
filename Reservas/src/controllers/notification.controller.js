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
