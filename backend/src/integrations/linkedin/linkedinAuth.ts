export interface LinkedInAuthValidation {
  isValid: boolean;
  memberId?: string;
  memberName?: string;
  error?: string;
  missingPermissions?: string[];
}

export class LinkedInAuth {
  private static readonly API_BASE = 'https://api.linkedin.com/v2';

  static async validateToken(accessToken: string): Promise<LinkedInAuthValidation> {
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      return {
        isValid: false,
        error: 'LinkedIn OAuth access token cannot be empty.',
      };
    }

    try {
      // First try OpenID userinfo
      const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        return {
          isValid: true,
          memberId: userInfo.sub,
          memberName: userInfo.name,
        };
      }

      // Fallback to /v2/me endpoint
      const meRes = await fetch(`${this.API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const meData = await meRes.json();

      if (!meRes.ok || meData.status >= 400) {
        const msg = meData.message || 'LinkedIn authorization failed. Access token is invalid or has expired.';
        return {
          isValid: false,
          error: msg,
        };
      }

      const firstName = meData.localizedFirstName || '';
      const lastName = meData.localizedLastName || '';
      return {
        isValid: true,
        memberId: meData.id,
        memberName: `${firstName} ${lastName}`.trim(),
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `LinkedIn network error: ${err.message}`,
      };
    }
  }
}
