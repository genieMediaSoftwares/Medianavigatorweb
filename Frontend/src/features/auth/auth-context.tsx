import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, clearTokens, hasStoredSession, setUnauthorizedHandler, storeTokens } from '@/lib/api/client';
import type { Me, Profile } from '@/types/api';

import { fetchMe, loginRequest, logoutRequest, registerRequest } from './api';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; me: Me }
  /** A stored session exists but could not be checked (e.g. offline). Nothing is assumed. */
  | { status: 'error'; message: string };

export interface SignOutResult {
  /** False when the server could not be reached to revoke the session. */
  serverRevoked: boolean;
}

interface AuthContextValue {
  state: AuthState;
  signIn(input: { email: string; password: string }): Promise<void>;
  signUp(input: { email: string; password: string; fullName: string; organization?: string }): Promise<void>;
  signOut(): Promise<SignOutResult>;
  /** Re-check the stored session with the server. */
  restoreSession(): Promise<void>;
  /** Replace the signed-in profile with the copy returned by the server (e.g. after an edit). */
  updateProfile(profile: Profile): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const restoreSession = useCallback(async () => {
    setState({ status: 'loading' });
    let stored = false;
    try {
      stored = await hasStoredSession();
    } catch {
      // Unreadable secure storage must not leave the app on the splash screen: treat it as signed out.
      stored = false;
    }
    if (!stored) {
      setState({ status: 'unauthenticated' });
      return;
    }
    try {
      // An expired access token is refreshed by the API client before this resolves.
      setState({ status: 'authenticated', me: await fetchMe() });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setState({ status: 'unauthenticated' });
      else setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to verify your session.' });
    }
  }, []);

  useEffect(() => {
    // Any authenticated request whose session cannot be refreshed lands the user back on the auth screens.
    setUnauthorizedHandler(() => setState({ status: 'unauthenticated' }));
    // Restoring the external session also resets loading state for explicit retries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restoreSession();
    return () => setUnauthorizedHandler(null);
  }, [restoreSession]);

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const { tokens } = await loginRequest(input);
    await storeTokens(tokens);
    // Login does not return the profile; /auth/me returns both.
    setState({ status: 'authenticated', me: await fetchMe() });
  }, []);

  const signUp = useCallback(async (input: { email: string; password: string; fullName: string; organization?: string }) => {
    const { user, profile, tokens } = await registerRequest(input);
    await storeTokens(tokens);
    setState({ status: 'authenticated', me: { user, profile } });
  }, []);

  const signOut = useCallback(async (): Promise<SignOutResult> => {
    let serverRevoked = true;
    try {
      await logoutRequest();
    } catch (error) {
      // A 401 means the session was already invalid on the server, which is the goal.
      serverRevoked = error instanceof ApiError && error.status === 401;
    }
    await clearTokens();
    setState({ status: 'unauthenticated' });
    return { serverRevoked };
  }, []);

  const updateProfile = useCallback((profile: Profile) => {
    setState((current) => (current.status === 'authenticated' ? { status: 'authenticated', me: { ...current.me, profile } } : current));
  }, []);

  const authenticatedId = state.status === 'authenticated' ? state.me.user.id : null;
  useEffect(() => {
    if (!authenticatedId) return;
    let active = true;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void fetchMe().then((me) => {
        if (active) setState((current) => current.status === 'authenticated' && current.me.user.id === authenticatedId ? { status: 'authenticated', me } : current);
      }, () => undefined); // Network failures preserve the session; 401 uses the global sign-out handler.
    });
    return () => { active = false; subscription.remove(); };
  }, [authenticatedId]);

  const value = useMemo(
    () => ({ state, signIn, signUp, signOut, restoreSession, updateProfile }),
    [state, signIn, signUp, signOut, restoreSession, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
