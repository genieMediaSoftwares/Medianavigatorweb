// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectModal } from '@/components/connections/connect-modal';
import type { Connection } from '@/types/api';
vi.mock('@/lib/hooks/useSync', () => ({ useSync: () => ({ start: vi.fn() }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
describe('Meta manual connections', () => {
  for (const platform of ['instagram', 'facebook'] as const) {
    for (const available of [true, false]) {
      it(`shows the token form for ${platform} with OAuth available=${available}`, () => {
        render(<QueryClientProvider client={new QueryClient()}><ConnectModal platform={platform} connection={{ oauthAvailable: available } as Connection} open onOpenChange={vi.fn()} /></QueryClientProvider>);
        expect(screen.getByLabelText('Access token')).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: 'Connect with token' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: /Continue with/ })).not.toBeInTheDocument();
      });
    }
  }
});
