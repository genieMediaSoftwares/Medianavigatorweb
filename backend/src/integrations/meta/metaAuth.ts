export interface MetaAuthValidation {
  isValid: boolean;
  userId?: string;
  userName?: string;
  scopes: string[];
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
  private static readonly GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

  /**
   * Validates Meta User/Page Access Token or Instagram Access Token
   */
  static async validateToken(accessToken: string): Promise<MetaAuthValidation> {
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      return {
        isValid: false,
        scopes: [],
        error: 'Access token cannot be empty.',
      };
    }

    const cleanToken = accessToken.trim();

    try {
      // 1. First, test with /me endpoint on Graph API
      let meData: any = null;
      try {
        const meRes = await fetch(`${this.GRAPH_API_BASE}/me?fields=id,name,permissions&access_token=${encodeURIComponent(cleanToken)}`);
        meData = await meRes.json();
      } catch {
        // network error, continue to fallback
      }

      // If /me succeeded with valid id
      if (meData && meData.id && !meData.error) {
        const grantedScopes: string[] = [];
        if (meData.permissions?.data && Array.isArray(meData.permissions.data)) {
          for (const perm of meData.permissions.data) {
            if (perm.status === 'granted') {
              grantedScopes.push(perm.permission);
            }
          }
        }

        // Query connected Pages and Instagram Business Accounts
        let accountsList: any[] = [];
        try {
          const accountsRes = await fetch(
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
          accounts: accountsList,
        };
      }

      // 2. If standard /me failed, check if this is an Instagram User Token on graph.instagram.com
      try {
        const igMeRes = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${encodeURIComponent(cleanToken)}`);
        const igMeData = await igMeRes.json();

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

      // 3. Check graph.facebook.com with minimal fields (works for Instagram scoped tokens)
      try {
        const fbMeRes = await fetch(`${this.GRAPH_API_BASE}/me?fields=id,username,name&access_token=${encodeURIComponent(cleanToken)}`);
        const fbMeData = await fbMeRes.json();

        if (fbMeRes.ok && fbMeData && fbMeData.id && !fbMeData.error) {
          return {
            isValid: true,
            userId: fbMeData.id,
            userName: fbMeData.username || fbMeData.name,
            scopes: ['instagram_basic'],
            accounts: [],
          };
        }
      } catch {
        // Fall through
      }

      // If token failed all endpoints, extract the error message
      const errMsg = meData?.error?.message || 'Instagram authorization failed. Please check your Access Token or API Key and try again.';
      return {
        isValid: false,
        scopes: [],
        error: errMsg,
      };
    } catch (err: any) {
      return {
        isValid: false,
        scopes: [],
        error: `Meta connection network error: ${err.message || 'Unable to connect to Meta Graph API'}`,
      };
    }
  }
}
