// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectModal } from '@/components/connections/connect-modal';
import type { Connection } from '@/types/api';
vi.mock('@/lib/hooks/useSync', () => ({ useSync: () => ({ start: vi.fn() }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
function show(available: boolean, platform: 'instagram' | 'facebook' = 'instagram') {
  return render(<QueryClientProvider client={new QueryClient()}><ConnectModal platform={platform} connection={{ oauthAvailable: available } as Connection} open onOpenChange={vi.fn()} /></QueryClientProvider>);
}
describe('Instagram connection', () => {
  it('offers Instagram sign-in without a token or password field', () => {
    show(true);
    expect(screen.getByRole('button', { name: 'Continue with Instagram' })).toBeEnabled();
    expect(screen.queryByLabelText(/access token/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Graph API Explorer/)).not.toBeInTheDocument();
  });
  it('shows setup status and prevents a broken redirect when the app is unconfigured', () => {
    show(false);
    expect(screen.getByRole('button', { name: 'Continue with Instagram' })).toBeDisabled();
    expect(screen.getByText(/Instagram sign-in is being set up/)).toBeInTheDocument();
  });
});

describe('Facebook connection', () => {
  it('offers official sign-in without manual credentials', () => {
    show(true, 'facebook');
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeEnabled();
    expect(screen.queryByLabelText(/access token/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Facebook Page ID/i)).not.toBeInTheDocument();
  });
  it('explains missing configuration instead of asking the user for a key', () => {
    show(false, 'facebook');
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeDisabled();
    expect(screen.getByText(/Facebook sign-in is being set up/)).toBeInTheDocument();
  });
});
