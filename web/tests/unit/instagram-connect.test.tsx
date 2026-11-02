// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectModal } from '@/components/connections/connect-modal';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { Connection } from '@/types/api';

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/hooks/useSync', () => ({ useSync: () => ({ start: vi.fn().mockResolvedValue({}) }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => mockToast }));

describe('Meta manual connections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const platform of ['instagram', 'facebook'] as const) {
    for (const available of [true, false]) {
      it(`shows the token form for ${platform} with OAuth available=${available}`, () => {
        render(
          <QueryClientProvider client={new QueryClient()}>
            <ConnectModal platform={platform} connection={{ oauthAvailable: available } as Connection} open onOpenChange={vi.fn()} />
          </QueryClientProvider>
        );
        expect(screen.getByLabelText('Access token')).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: 'Connect with token' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: /Continue with/ })).not.toBeInTheDocument();
      });
    }
  }

  it('shows friendly notification when social account is already connected to another account (HTTP 409)', async () => {
    const friendlyMessage =
      'Account already connected. This social account is already connected to another Media Navigator account or session. Please sign in to the account where it is connected, or disconnect it there before trying again.';

    vi.spyOn(api, 'connect').mockRejectedValueOnce(
      new ApiError('This social account is already connected to another Media Navigator account.', 409, 'CONFLICT')
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConnectModal platform="instagram" connection={{ oauthAvailable: false } as Connection} open onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'TOKEN_ATTEMPT_123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect with token' }));

    await waitFor(() => {
      expect(screen.getByText(friendlyMessage)).toBeInTheDocument();
    });

    expect(mockToast.error).toHaveBeenCalledWith(friendlyMessage);
    // Technical codes and details must NOT be exposed in the UI
    expect(screen.queryByText(/409/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CONFLICT/)).not.toBeInTheDocument();
    expect(screen.queryByText(/TOKEN_ATTEMPT_123/)).not.toBeInTheDocument();
  });

  it('displays user-friendly messages for standard provider validation errors', async () => {
    vi.spyOn(api, 'connect').mockRejectedValueOnce(
      new ApiError('Invalid access token provided. Please check the permissions in Meta.', 400, 'BAD_REQUEST')
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConnectModal platform="instagram" connection={{ oauthAvailable: false } as Connection} open onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'INVALID_TOKEN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect with token' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid access token provided. Please check the permissions in Meta.')).toBeInTheDocument();
    });
  });

  it('connects successfully for the first owner without error notification', async () => {
    vi.spyOn(api, 'connect').mockResolvedValueOnce({
      connection: { platform: 'instagram', connected: true } as any,
      syncRun: { id: 'run-1' } as any,
    });

    const onConnected = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConnectModal platform="instagram" connection={{ oauthAvailable: false } as Connection} open onOpenChange={onOpenChange} onConnected={onConnected} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'VALID_NEW_TOKEN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect with token' }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Instagram is connected. We’re importing your posts now.');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onConnected).toHaveBeenCalled();
    });
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
