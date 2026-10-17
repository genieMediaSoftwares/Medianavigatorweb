import { ConnectError } from '../../lib/errors.js';
import { LinkedInAuth } from '../linkedin/linkedinAuth.js';
import { LinkedInClient } from '../linkedin/linkedinClient.js';
import type { ProviderAdapter, ProviderCredentials, ResolvedAccount } from '../types.js';

const client = new LinkedInClient();
const token = (c: ProviderCredentials) => (c.accessToken || '').trim();

export const linkedinAdapter: ProviderAdapter = {
  platform: 'linkedin',
  capabilities: {
    platform: 'linkedin',
    unavailableMetrics: ['watchTimeMinutes', 'saves'],
    unsupportedContent: ['personal-profile-analytics'],
    supportsOAuth: true,
    supportsPkce: false,
    incrementalInsights: false,
    notes: ['Organization (Page) content only. Reading posts needs the Community Management permissions; without them the connection is marked permission_required.'],
  },

  async validate(creds) {
    const v = await LinkedInAuth.validateToken(token(creds));
    if (v.isValid) return { isValid: true };
    const raw = v.error || 'LinkedIn authorization failed.';
    const kind = /expired|revoked/i.test(raw) ? 'expired' : /permission|403/i.test(raw) ? 'permission' : 'invalid';
    const error = kind === 'expired' ? 'This LinkedIn access token has expired (they last 60 days). Generate a new one and connect again.'
      : kind === 'invalid' && /invalid access token|401/i.test(raw) ? 'LinkedIn didn’t accept this access token. Copy the whole token again from the LinkedIn Developer Portal’s token generator.'
        : raw;
    return { isValid: false, error, kind };
  },

  async resolveAccount(creds): Promise<ResolvedAccount> {
    const a = await client.resolveAccount(token(creds), creds.organizationId);
    return {
      providerAccountId: a.id,
      handle: a.name,
      displayName: a.name,
      accountInfo: { id: a.id, name: a.name },
      credentialsPatch: { organizationId: a.id },
    };
  },

  async fetchContent(creds, account) {
    try {
      const items = await client.fetchPosts(token(creds), account.providerAccountId);
      return { items };
    } catch (err) {
      // Only a missing permission is reported as such; an expired token or an outage is a real sync failure.
      if (err instanceof ConnectError && err.reason === 'permission_missing') {
        return { items: [], permissionError: { message: err.message, missing: ['r_organization_social'] } };
      }
      throw err;
    }
  },
};
