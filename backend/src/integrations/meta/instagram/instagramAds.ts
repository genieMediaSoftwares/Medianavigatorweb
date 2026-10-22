import { config } from '../../../config/env.js';
import { httpFetch } from '../../../lib/http.js';
import type { ProviderCredentials } from '../../types.js';
import type { InstagramAd, InstagramAdsBatch } from '../../../../../shared/instagramAds.js';

type Row = Record<string, any>;
const ACCESS = 'Ads need a Facebook Graph API token with ads_read and access to the advertising account. Update your Instagram connection with that token, then sync again.';
class AdsError extends Error { constructor(public permission: boolean) { super('Paid data unavailable'); } }
const number = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Read-only Marketing API. Never sends the token to pagination URLs returned by Meta. */
export async function fetchInstagramAds(creds: ProviderCredentials, instagramId: string, mediaIds: Set<string>, budgetMs = 45_000): Promise<InstagramAdsBatch> {
  const checkedAt = new Date().toISOString();
  const items = new Map<string, InstagramAd>();
  const result = (status: InstagramAdsBatch['sync']['status'], message: string): InstagramAdsBatch => ({ items: [...items.values()], sync: { status, message, checkedAt } });
  if (creds.instagramLogin) return result('permission_required', `Instagram Login does not provide advertising access. ${ACCESS}`);
  const deadline = Date.now() + budgetMs;
  let incomplete = false;
  let permission = false;
  let readAccounts = false;
  let accountCount = 0;
  let unmatched = 0;
  /**
   * Instagram media ids are stored here as `ig_17983539268493900`, while Meta's ad creatives reference the
   * bare number. Both forms are accepted, so a boosted post is matched to the post it promotes.
   */
  const mediaKeys = new Set<string>();
  for (const id of mediaIds) {
    mediaKeys.add(id);
    const bare = id.replace(/^[a-z]+_/i, '');
    if (bare) mediaKeys.add(bare);
  }
  const isOurMedia = (id: unknown): boolean => typeof id === 'string' && id !== '' && mediaKeys.has(id);

  async function pages(path: string, params: Record<string, string>, visit: (rows: Row[]) => void, limit?: () => number) {
    let after = '';
    const seen = new Set<string>();
    for (let page = 0; page < 1000; page++) {
      const remaining = Math.min(limit?.() ?? deadline, deadline) - Date.now();
      if (remaining <= 0) throw new AdsError(false);
      const url = new URL(`https://graph.facebook.com/${config.providers.metaApiVersion}/${path}`);
      for (const [key, value] of Object.entries({ ...params, limit: '100', ...(after ? { after } : {}) })) url.searchParams.set(key, value);
      const response = await httpFetch(url, { headers: { Authorization: `Bearer ${creds.accessToken || creds.apiKey || ''}` }, timeoutMs: Math.min(remaining, 10_000), maxRetries: 0 });
      const body = await response.json();
      if (!response.ok || body.error) throw new AdsError([10, 190, 200, 294].includes(body.error?.code) || [401, 403].includes(response.status));
      if (!Array.isArray(body.data)) throw new AdsError(false);
      visit(body.data);
      if (!body.paging?.next) return;
      const cursor = body.paging?.cursors?.after;
      if (typeof cursor !== 'string' || !cursor || seen.has(cursor)) throw new AdsError(false);
      seen.add(cursor); after = cursor;
    }
    throw new AdsError(false);
  }
  const failed = (error: unknown) => { incomplete = true; permission ||= error instanceof AdsError && error.permission; };
  const accounts: Row[] = [];
  try { await pages('me/adaccounts', { fields: 'id,currency' }, rows => accounts.push(...rows)); readAccounts = true; }
  catch (error) { failed(error); }
  for (const [index, account] of accounts.entries()) {
    if (!/^act_\d+$/.test(account.id)) { incomplete = true; continue; }
    accountCount++;
    // Each ad account gets a fair share of what is left, so a large account belonging to another
    // client cannot use up the whole budget before our own accounts are read.
    const accountsLeft = Math.max(1, accounts.length - index);
    const sliceUntil = Date.now() + Math.max(6_000, Math.floor((deadline - Date.now()) / accountsLeft));
    const accountItems = new Map<string, InstagramAd>();
    let belongsToUs = false;
    try {
      await pages(`${account.id}/ads`, {
        fields: 'id,name,effective_status,campaign{name},adset{name},creative{instagram_user_id,source_instagram_media_id,effective_instagram_media_id}',
        // 'DELETED' is not accepted by this endpoint: including it makes Meta reject the whole request.
        effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES']),
      }, rows => {
        for (const ad of rows) {
          const c = ad.creative ?? {};
          const source = c.source_instagram_media_id ? String(c.source_instagram_media_id) : null;
          const effective = c.effective_instagram_media_id ? String(c.effective_instagram_media_id) : null;
          const matched = [source, effective].find(id => isOurMedia(id)) ?? null;
          // A token can span several clients. Only import creatives tied to this Instagram profile.
          if (String(c.instagram_user_id ?? '') !== instagramId && !matched) {
            if (!c.instagram_user_id && !source && !effective) unmatched++;
            continue;
          }
          belongsToUs = true;
          if (typeof ad.id !== 'string') { incomplete = true; continue; }
          const item: InstagramAd = {
            id: ad.id, adAccountId: account.id, name: ad.name || 'Untitled ad', campaign: ad.campaign?.name || '', adSet: ad.adset?.name || '', status: ad.effective_status || 'UNKNOWN',
            // A creative that points at an Instagram post is a boosted post, whether or not that post is
            // in this account's library; `matched` says whether it is one of ours.
            category: source || effective ? 'boosted_post' : 'ad', sourceMediaId: source || effective || null,
            currency: typeof account.currency === 'string' ? account.currency : null,
            impressions: null, reach: null, clicks: null, spend: null, dateStart: null, dateStop: null, syncedAt: checkedAt,
          };
          accountItems.set(ad.id, item); items.set(`${account.id}:${ad.id}`, item);
        }
      // Once an ad account shows our own creative it belongs to this client, so it is worth
      // reading to the end with whatever time is left.
      }, () => (belongsToUs ? deadline : sliceUntil));
    } catch (error) { failed(error); }
    if (!accountItems.size) continue;
    try {
      await pages(`${account.id}/insights`, { level: 'ad', date_preset: 'maximum', breakdowns: 'publisher_platform', fields: 'ad_id,impressions,reach,clicks,spend,date_start,date_stop' }, rows => {
        for (const row of rows) {
          if (row.publisher_platform !== 'instagram') continue;
          const item = accountItems.get(row.ad_id);
          if (!item) continue;
          Object.assign(item, { impressions: number(row.impressions), reach: number(row.reach), clicks: number(row.clicks), spend: number(row.spend), dateStart: row.date_start || null, dateStop: row.date_stop || null });
        }
      }, () => (belongsToUs ? deadline : sliceUntil));
    } catch (error) { failed(error); }
  }
  if (!accountCount && readAccounts && !incomplete) return result('permission_required', `No advertising accounts are accessible with this token. ${ACCESS}`);
  if (incomplete) return result(items.size ? 'partial' : permission ? 'permission_required' : 'unavailable', permission ? ACCESS : 'Meta could not finish returning paid data. Any records received were saved; sync again. Previously saved records may be older.');
  return result('ready', `Synced ads attributable to this Instagram profile across ${accountCount} accessible ad account(s). Metrics cover Instagram placements over Meta’s available reporting period.${unmatched ? ' Some creatives did not expose an Instagram identity and could not be attributed.' : ''}`);
}
