// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionRequired } from '@/components/layout/connection-required';
const state = vi.hoisted(() => ({ data: [] as { connected: boolean }[], isPending: false, isError: false }));
vi.mock('@/lib/hooks/useQueries', () => ({ useConnections: () => state }));
describe('new account analytics', () => {
  it('asks to connect and does not mount analytics for an empty account', () => {
    state.data = [];
    const analytics = vi.fn(() => <p>Private analysis</p>);
    const Analytics = analytics;
    render(<ConnectionRequired><Analytics /></ConnectionRequired>);
    expect(screen.getByRole('link', { name: 'Connect an account' })).toHaveAttribute('href', '/connections');
    expect(analytics).not.toHaveBeenCalled();
    expect(screen.queryByText('Private analysis')).not.toBeInTheDocument();
  });
  it('renders analytics after a channel is connected', () => {
    state.data = [{ connected: true }];
    render(<ConnectionRequired><p>Connected account analysis</p></ConnectionRequired>);
    expect(screen.getByText('Connected account analysis')).toBeInTheDocument();
  });
});
