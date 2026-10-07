import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const emailEnabled = () => Boolean(config.email);

let transport: Transporter | null = null;

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const cfg = config.email;
  if (!cfg) throw new Error('Email delivery is not configured');
  transport ??= nodemailer.createTransport({
    host: cfg.host, port: cfg.port, secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.password },
    connectionTimeout: config.providers.timeoutMs, socketTimeout: config.providers.timeoutMs,
  });
  const link = `${config.server.webAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await transport.sendMail({
    from: cfg.from, to,
    subject: 'Reset your Media Navigator password',
    text: `Use this link to reset your password. It expires in ${config.auth.resetTokenTtlMinutes} minutes and works once:\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
  });
  logger.info('password reset email sent');
}
