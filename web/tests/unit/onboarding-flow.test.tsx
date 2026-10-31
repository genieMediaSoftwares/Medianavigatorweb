// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/lib/hooks/useQueries', () => ({
  useMe: () => ({ data: { profile: { timezone: 'UTC', fullName: 'New user' } } }),
  useConnections: () => ({ data: [] }),
}));
vi.mock('@/lib/api/endpoints', () => ({ api: { updateProfile: vi.fn().mockResolvedValue({}) } }));
vi.mock('@/components/connections/connect-modal', () => ({ ConnectModal: () => null }));
it('shows one of three steps at a time without invented connections', async () => {
  render(<QueryClientProvider client={new QueryClient()}><OnboardingFlow /></QueryClientProvider>);
  expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Connect your first account' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Take tour' }));
  expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Quick product tour' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Connect your first account' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
});
