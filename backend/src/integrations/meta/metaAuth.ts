import { config } from '../../config/env.js';
import { httpFetch } from '../../lib/http.js';
import type { ConnectFailureReason } from '../../lib/errors.js';
import { describeMetaError, logMetaError, type MetaErrorBody } from './metaErrors.js';

export interface MetaAuthValidation {
  isValid: boolean;
  /** Why the token was refused (set when isValid is false). */
  reason?: ConnectFailureReason;
  userId?: string;
  userName?: string;
  scopes: string[];
  /** true only when `scopes` came from Meta's own list of granted permissions (a Facebook user token). */
  scopesVerified?: boolean;
  expiresAt?: string;
  error?: string;
  accounts?: Array<{
    id: string;
    name: string;
    accessToken: string;
    category?: string;
    instagramBusinessAccount?: {
      id: string;
      username?: string;
    };
  }>;
}

export class MetaAuth {
  private static readonly GRAPH_API_BASE = `https://graph.facebook.com/${config.providers.metaApiVersion}`;

  /** Granted User permissions, or null for a Page token / unreadable permissions edge. */
  static async grantedPermissions(accessToken: string): Promise<string[] | null> {
    try {
      const res = await httpFetch(`${this.GRAPH_API_BASE}/me/permissions?access_token=${encodeURIComponent(accessToken.trim())}`);
      const body: any = await res.json();
      if (!res.ok || body.error || !Array.isArray(body.data) || !body.data.every((p: any) => typeof p?.permission === 'string' && typeof p?.status === 'string')) return null;
      return body.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
    } catch {
      return null;
    }
  }

  /**
   * Which Meta app issued a token, via the documented debug_token endpoint. Only possible when this server has its own
   * Meta app configured (META_APP_ID / META_APP_SECRET); otherwise null. Never throws.
   */
  static async issuingApp(token: string): Promise<{ appId: string; wrongApp: boolean; note: string } | null> {
    const meta = config.providers.meta;
    if (!meta) return null;
    try {
      const url = new URL(`${this.GRAPH_API_BASE}/debug_token`);
      url.searchParams.set('input_token', token);
      url.searchParams.set('access_token', `${meta.appId}|${meta.appSecret}`);
      const res = await httpFetch(url);
      const data: any = (await res.json().catch(() => null))?.data;
      if (!res.ok || !data?.app_id) return null;
      const appId = String(data.app_id);
      const name = data.application ? `“${data.application}” (${appId})` : appId;
      const wrongApp = appId !== meta.appId;
      return {
        appId,
        wrongApp,
        note: wrongApp
          ? `This token was issued by the Meta app ${name}, not by the app this server is set up for (${meta.appId}). In Graph API Explorer, choose app ${meta.appId} in the Meta App menu and generate a new token.`
          : `This token was issued by this server’s Meta app (${appId}); the restriction applies to that app or to the signed-in account.`,
      };
    } catch {
      return null;
    }
  }

  /**
   * Validates Meta User/Page Access Token or Instagram Access Token
   */
  static async validateToken(accessToken: string, platform: 'instagram' | 'facebook' = 'instagram'): Promise<MetaAuthValidation> {
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      return {
        isValid: false,
        reason: 'token_invalid',
        scopes: [],
        error: 'Access token cannot be empty.',
      };
    }

    const cleanToken = accessToken.trim();
    const wrongType = credentialProblem(cleanToken);
    if (wrongType) return { isValid: false, reason: 'token_invalid', scopes: [], error: wrongType };

    try {
      // 1. First, test with /me endpoint on Graph API
      let meData: any = null;
      let meStatus = 0;
      try {
        // Identity fields work for both User and Page tokens. Asking for `permissions` on
        // a Page rejects an otherwise valid Page token before account discovery can run.
        const meRes = await httpFetch(`${this.GRAPH_API_BASE}/me?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
        meStatus = meRes.status;
        meData = await meRes.json();
      } catch {
        // Meta unreachable (timeout/network) or a non-JSON answer: meData stays null and is reported as such below.
      }

      // If /me succeeded with valid id
      if (meStatus >= 200 && meStatus < 300 && meData && meData.id && !meData.error) {
        const permissions = await this.grantedPermissions(cleanToken);
        const grantedScopes = permissions ?? [];
        const scopesVerified = permissions !== null;

        // Query connected Pages and Instagram Business Accounts
        let accountsList: any[] = [];
        try {
          const accountsRes = await httpFetch(
            `${this.GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,instagram_business_account{id,username}&access_token=${encodeURIComponent(cleanToken)}`
          );
          const accountsData = await accountsRes.json();
          if (accountsData.data && Array.isArray(accountsData.data)) {
            accountsList = accountsData.data.map((acc: any) => ({
              id: acc.id,
              name: acc.name,
              accessToken: acc.access_token || cleanToken,
              category: acc.category,
              instagramBusinessAccount: acc.instagram_business_account ? {
                id: acc.instagram_business_account.id,
                username: acc.instagram_business_account.username,
              } : undefined,
            }));
          }
        } catch {
          // Accounts fetch is optional
        }

        return {
          isValid: true,
          userId: meData.id,
          userName: meData.name,
          scopes: grantedScopes,
          scopesVerified,
          accounts: accountsList,
        };
      }

      // 2. If standard /me failed, check if this is an Instagram User Token on graph.instagram.com
      let igError: MetaErrorBody | undefined;
      let igStatus = 0;
      if (platform === 'instagram') try {
        const igMeRes = await httpFetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${encodeURIComponent(cleanToken)}`);
        igStatus = igMeRes.status;
        const igMeData = await igMeRes.json();
        igError = igMeData?.error;

        if (igMeRes.ok && igMeData && igMeData.id && !igMeData.error) {
          return {
            isValid: true,
            userId: igMeData.id,
            userName: igMeData.username,
            scopes: ['instagram_basic', 'instagram_manage_insights'],
            accounts: [
              {
                id: igMeData.id,
                name: igMeData.username,
                accessToken: cleanToken,
                instagramBusinessAccount: {
                  id: igMeData.id,
                  username: igMeData.username,
                },
              },
            ],
          };
        }
      } catch {
        // Continue to third check
      }

      // No answer from Meta at all is an outage on the path to Meta, not a refusal of the token.
      if (!meData && !igStatus) {
        return {
          isValid: false,
          reason: 'provider_unavailable',
          scopes: [],
          error: 'Media Navigator couldn’t reach Meta to check this token (timeout or network error). Check the API server’s internet connection and try again in a minute.',
        };
      }

      // If token failed all endpoints, explain Meta's actual refusal.
      // Instagram Login tokens (IGAA…) fail on graph.facebook.com with a parse error, so prefer graph.instagram.com's reason for them.
      const useIg = cleanToken.startsWith('IG') ? Boolean(igError) : !meData?.error && Boolean(igError);
      const described = describeMetaError(platform, { error: useIg ? igError : meData?.error }, useIg ? igStatus : meStatus || 400);
      logMetaError('validate-token', described);
      // Instagram Login tokens belong to the app's Instagram app ID and can't be inspected with the Facebook app token.
      const origin = cleanToken.startsWith('IG') ? null : await this.issuingApp(cleanToken);
      return {
        isValid: false,
        reason: origin?.wrongApp ? 'token_invalid' : described.reason,
        scopes: [],
        error: origin ? `${described.message} ${origin.note}` : described.message,
      };
    } catch (err: any) {
      return {
        isValid: false,
        scopes: [],
        reason: 'provider_unavailable',
        error: `Meta couldn’t be reached (${err.message || 'network error'}). Please try again in a few minutes.`,
      };
    }
  }
}

/**
 * A plain-language reason when the value can't be a Meta user, Page or Instagram access token. Only formats that are
 * certainly something else are refused; the token's characters are never changed.
 */
export function credentialProblem(token: string): string | null {
  if (/\s/.test(token)) return 'The access token contains a space or line break, so part of it was probably cut or wrapped while copying. Copy it again in one piece.';
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(token)) return 'That is a Google API key, not a Meta access token. Generate a User access token in Meta’s Graph API Explorer.';
  if (/^ya29\./.test(token)) return 'That is a Google sign-in token, not a Meta access token. Generate a User access token in Meta’s Graph API Explorer.';
  if (/^\d+\|/.test(token)) return 'That is a Meta app or client token, which can’t read an Instagram account. Generate a User access token in Graph API Explorer (or an Instagram User token in your app’s Instagram API setup).';
  return null;
}
