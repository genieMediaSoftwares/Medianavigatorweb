export class MetaClient {
  protected readonly baseUrl = 'https://graph.facebook.com/v20.0';

  protected async get<T>(endpoint: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\//, '')}`);
    url.searchParams.set('access_token', accessToken);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, val);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error?.message || `Meta Graph API request to ${endpoint} failed with HTTP ${response.status}`;
      const code = data.error?.code;
      const subcode = data.error?.error_subcode;

      if (code === 190) {
        throw new Error('Your Meta connection has expired. Reconnect to continue analyzing your media.');
      }
      if (code === 200 || code === 10) {
        throw new Error(`Additional platform permissions are required: ${msg}`);
      }

      throw new Error(msg);
    }

    return data as T;
  }
}
