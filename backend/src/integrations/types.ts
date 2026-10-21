import type { NormalizedMedia, PlatformType } from '../../../shared/types.js';
import type { ConnectFailureReason } from '../lib/errors.js';

/** Decrypted provider credentials. Exists only in memory inside sync/connection services. */
export interface ProviderCredentials {
  accessToken?: string;
  instagramLogin?: boolean;
  apiKey?: string;
  refreshToken?: string;
  expiresAt?: string; // ISO
  accountId?: string;
  pageId?: string;
  pageAccessToken?: string;
  channelId?: string;
  channelQuery?: string;
  organizationId?: string;
  username?: string;
}

export interface ProviderCapabilities {
  platform: PlatformType;
  /** Metrics this provider cannot supply at all. They are reported as unavailable, never as zero. */
  unavailableMetrics: string[];
  /** Content kinds not reachable through the API / granted permissions. */
  unsupportedContent: string[];
  supportsOAuth: boolean;
  supportsPkce: boolean;
  /** true when fetchContent can skip already-known items' expensive per-item calls */
  incrementalInsights: boolean;
  notes: string[];
}

export interface ResolvedAccount {
  providerAccountId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  accountInfo: {
    id: string; name?: string; username?: string; followersCount?: number; followsCount?: number;
    /** Post count the platform reports for the profile. */
    mediaCount?: number;
    /** Posts the platform's API returned on the last sync; null when that listing was not read to the end. */
    accessibleMediaCount?: number | null;
    /** Whether the last sync read the platform's media listing to its last page, and when. */
    mediaListComplete?: boolean;
    mediaListCheckedAt?: string;
    insights?: { since: string; until: string; fetchedAt: string; metrics: Record<string, number>; unavailable: string[] } };
  credentialsPatch?: Partial<ProviderCredentials>;
}

export interface FetchContentResult {
  items: NormalizedMedia[];
  accountInfo?: ResolvedAccount['accountInfo'];
  /** Items the provider could not return because of missing permissions. */
  permissionError?: { message: string; missing: string[] };
  /** Set when the result is known to be incomplete (so the sync is recorded as partial, not succeeded). */
  partialReason?: string;
  /** Permissions the token lacks for some metrics (items were still read; those metrics are unavailable, not 0). */
  metricPermissionsMissing?: string[];
  /**
   * true when `items` is everything the account currently has, so stored items that are not in it are no longer on the
   * account (deleted, made private, or synced by mistake) and are removed. Only set when the provider proves completeness.
   */
  authoritative?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  kind?: 'expired' | 'permission' | 'invalid';
  /** Precise cause when the provider said it; otherwise derived from `kind`. */
  reason?: ConnectFailureReason;
}

export interface ProviderAdapter {
  readonly platform: PlatformType;
  readonly capabilities: ProviderCapabilities;
  validate(creds: ProviderCredentials): Promise<ValidationResult>;
  resolveAccount(creds: ProviderCredentials): Promise<ResolvedAccount>;
  fetchContent(creds: ProviderCredentials, account: ResolvedAccount, ctx: { existing: Map<string, NormalizedMedia> }): Promise<FetchContentResult>;
  /** Optional: exchange a refresh token for a new access token. */
  refreshCredentials?(creds: ProviderCredentials): Promise<ProviderCredentials>;
}
