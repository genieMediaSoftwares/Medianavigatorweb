import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { sha256 } from '../lib/crypto.js';

export const emailEnabled = () => Boolean(config.email);

let transport: Transporter | null = null;

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const cfg = config.email;
  if (!cfg) throw new Error('Email delivery is not configured');
  const link = `${config.server.webAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const message = {
    from: cfg.from, to,
    subject: 'Reset your Media Navigator password',
    text: `Use this link to reset your password. It expires in ${config.auth.resetTokenTtlMinutes} minutes and works once:\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
  };
  if (cfg.provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `password-reset/${sha256(token)}` },
      body: JSON.stringify({ ...message, to: [to] }),
      signal: AbortSignal.timeout(config.providers.timeoutMs),
    });
    // Never include provider response bodies: they may echo email addresses or message content.
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Reset email provider rejected delivery (${response.status})`); }
    const receipt = await response.json().catch(() => null) as { id?: unknown } | null;
    if (!receipt || typeof receipt.id !== 'string' || !receipt.id) throw new Error('Reset email provider returned no delivery receipt');
  } else {
    transport ??= nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.port === 465, requireTLS: true,
      auth: { user: cfg.user, pass: cfg.password },
      connectionTimeout: config.providers.timeoutMs, greetingTimeout: config.providers.timeoutMs, socketTimeout: config.providers.timeoutMs,
    });
    const receipt = await transport.sendMail(message);
    if (!receipt.accepted?.length) throw new Error('Reset email provider did not accept the recipient');
  }
  logger.info('password reset email accepted', { provider: cfg.provider });
}
