import nodemailer from 'nodemailer';
import axios from 'axios';

export function createTransporter() {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;
  if (!user || !pass) {
    throw new Error('SMTP credentials not configured. Set BREVO_SMTP_USER and BREVO_SMTP_PASS');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail({ to, subject, html, text, fromEmail, fromName, replyTo }) {
  const defaultFromEmail = process.env.FROM_EMAIL || 'no-reply@example.com';
  const defaultFromName = process.env.FROM_NAME || 'Agenda';

  // Optional: enforce that custom fromEmail matches a verified domain
  const enforceDomain = (process.env.BREVO_ENFORCE_DOMAIN || 'false').toLowerCase() === 'true';
  const verifiedDomain = (process.env.BREVO_VERIFIED_DOMAIN || '').toLowerCase().trim();

  let effectiveFromEmail = fromEmail || defaultFromEmail;
  if (fromEmail && enforceDomain && verifiedDomain) {
    const domain = String(fromEmail.split('@')[1] || '').toLowerCase();
    if (domain !== verifiedDomain) {
      // Fallback to default if domain not allowed
      effectiveFromEmail = defaultFromEmail;
      // Keep replyTo so replies go to the intended professional
      replyTo = replyTo || fromEmail;
    }
  }

  const from = `${fromName || defaultFromName} <${effectiveFromEmail}>`;

  // Optional Brevo API fallback (useful on platforms that block SMTP)
  const useApi = (process.env.USE_BREVO_API || 'false').toLowerCase() === 'true';
  const apiKey = process.env.BREVO_API_KEY;
  if (useApi && apiKey) {
    const sender = { email: effectiveFromEmail, name: fromName || defaultFromName };
    const payload = {
      sender,
      to: Array.isArray(to) ? to.map((e) => ({ email: e })) : [{ email: to }],
      subject,
      htmlContent: html || undefined,
      textContent: text || undefined,
      replyTo: replyTo ? { email: replyTo } : undefined,
    };
    const resp = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      timeout: 15000,
    });
    return { messageId: resp?.data?.messageId || resp?.data?.messageId || 'brevo-api' };
  }

  // Default: SMTP
  const transporter = createTransporter();
  const info = await transporter.sendMail({ from, to, subject, html, text, replyTo });
  return info;
}
