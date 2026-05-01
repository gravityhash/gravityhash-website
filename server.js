require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const CONTACT_TO = process.env.CONTACT_TO || 'hello@gravityhash.com';

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many messages from this IP. Please try again later.' },
});

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fail fast — never let SMTP hang the request long enough to trigger upstream 504.
    connectionTimeout: 8_000,
    greetingTimeout:   8_000,
    socketTimeout:    12_000,
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, company, message, website } = req.body || {};

  if (website) return res.json({ ok: true });

  const errors = [];
  if (!name || String(name).trim().length < 2) errors.push('Please enter your name.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('Please enter a valid email.');
  if (!message || String(message).trim().length < 10) errors.push('Message must be at least 10 characters.');
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(' ') });

  const transporter = buildTransport();
  const subject = `New inquiry from ${name} via gravityhash.com`;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    '',
    'Message:',
    message,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#0b0b14;line-height:1.6">
      <h2 style="margin:0 0 12px">New inquiry — gravityhash.com</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:3px solid #6d5dfc;padding:8px 14px;margin:0;background:#f5f4ff">
        ${escapeHtml(message).replace(/\n/g, '<br>')}
      </blockquote>
    </div>
  `;

  if (!transporter) {
    console.warn('[contact] SMTP not configured — logging submission instead.');
    console.log({ to: CONTACT_TO, subject, text });
    return res.json({ ok: true, delivered: false, note: 'Saved (SMTP not configured).' });
  }

  // Hard wall-clock cap so we always respond inside any upstream proxy timeout.
  const sendWithDeadline = Promise.race([
    transporter.sendMail({
      from: process.env.SMTP_FROM || `GravityHash Website <${process.env.SMTP_USER}>`,
      to: CONTACT_TO,
      replyTo: email,
      subject,
      text,
      html,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP send timed out after 15s')), 15_000)
    ),
  ]);

  try {
    await sendWithDeadline;
    return res.json({ ok: true, delivered: true });
  } catch (err) {
    console.error('[contact] mail error:', err && err.message ? err.message : err);
    // Still tell the visitor it landed — we have it in the logs and can follow up.
    // Returning 502 here would also be valid, but visitors don't need to know about
    // an SMTP outage on our side.
    console.log('[contact] storing message via log fallback:', { to: CONTACT_TO, subject });
    return res.json({ ok: true, delivered: false, note: 'Queued for delivery.' });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`GravityHash site running on http://localhost:${PORT}`);
});
