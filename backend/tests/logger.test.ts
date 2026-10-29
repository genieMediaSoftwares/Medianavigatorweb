import { describe, expect, it, vi } from 'vitest';
import { logger, redact } from '../src/lib/logger.js';

describe('production log privacy', () => {
  it('scrubs serialized provider credentials, signed URLs and nested personal data', () => {
    const output = JSON.stringify(redact({
      error: new Error('provider {"refresh_token":"refresh-value","client_secret":"secret-value"} password=pw-value https://user:pw@host.example/file?X-Amz-Signature=signed-value&ok=true bearer bearer-value contact=person@example.com'),
      nested: { email: 'private@example.com', fullName: 'Private Person', ip: '192.0.2.1', userAgent: 'private-device', status: 503 },
    }));
    for (const value of ['refresh-value', 'secret-value', 'pw-value', 'user:pw', 'signed-value', 'bearer-value', 'person@example.com', 'private@example.com', 'Private Person', '192.0.2.1', 'private-device']) expect(output).not.toContain(value);
    expect(output).toContain('503');
    expect(output).toContain('ok=true');
  });

  it('scrubs the top-level log message as well as structured fields', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      logger.error('delivery failed for person@example.com with token=private-value');
      expect(write).toHaveBeenCalledOnce();
      const line = String(write.mock.calls[0][0]);
      expect(line).not.toContain('person@example.com');
      expect(line).not.toContain('private-value');
      expect(JSON.parse(line)).toMatchObject({ level: 'error' });
    } finally { write.mockRestore(); }
  });
});
