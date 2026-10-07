import type { NormalizedMedia, PlatformType } from '../../../shared/types.js';

/** Decrypted provider credentials. Exists only in memory inside sync/connection services. */
export interface ProviderCredentials {
  accessToken?: string;
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
  accountInfo: { id: string; name?: string; username?: string; followersCount?: number; mediaCount?: number };
  credentialsPatch?: Partial<ProviderCredentials>;
}

export interface FetchContentResult {
  items: NormalizedMedia[];
  /** Items the provider could not return because of missing permissions. */
  permissionError?: { message: string; missing: string[] };
  /** Set when the result is known to be incomplete (so the sync is recorded as partial, not succeeded). */
  partialReason?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  kind?: 'expired' | 'permission' | 'invalid';
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
