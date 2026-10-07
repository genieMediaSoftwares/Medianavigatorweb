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
    const error = v.error || 'LinkedIn authorization failed.';
    return { isValid: false, error, kind: /expired|revoked|401/i.test(error) ? 'expired' : /permission|403/i.test(error) ? 'permission' : 'invalid' };
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
    } catch (err: any) {
      return { items: [], permissionError: { message: err?.message || 'Additional LinkedIn Community Management permissions required.', missing: ['r_organization_social'] } };
    }
  },
};
