import { config } from '../../config/env.js';
import { httpFetch } from '../../lib/http.js';
import { describeMetaError } from './metaErrors.js';

export class MetaClient {
  protected readonly baseUrl = `https://graph.facebook.com/${config.providers.metaApiVersion}`;

  constructor(protected readonly platform: 'instagram' | 'facebook') {}

  protected async get<T>(endpoint: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\//, '')}`);
    url.searchParams.set('access_token', accessToken);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, val);
      }
    }

    const response = await httpFetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.error) {
      // Translated to a reason and a next step; sync classifies it by `reason`, connect turns it into a ConnectError.
      throw describeMetaError(this.platform, data, response.status);
    }

    return data as T;
  }
}
