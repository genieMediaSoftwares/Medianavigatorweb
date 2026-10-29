import type { AppConfig } from '../config/env.js';

/** Configuration checks only. A configured provider is never described as successfully tested. */
export function releaseConfigurationChecks(config: AppConfig) {
  return [
    { id: 'production', label: 'Production server environment', ready: config.server.isProduction },
    { id: 'https', label: 'HTTPS API and password-reset website', ready: config.server.apiBaseUrl.startsWith('https://') && config.server.webAppUrl.startsWith('https://') },
    { id: 'email', label: 'Password-reset email provider configured', ready: Boolean(config.email) },
    { id: 'ai', label: 'AI provider configured', ready: config.ai.enabled },
    { id: 'storage', label: 'Private file storage configured', ready: Boolean(config.storage.r2) },
    { id: 'staff-mfa', label: 'Staff two-step authentication enforced', ready: config.auth.staffMfaRequired },
  ];
}
