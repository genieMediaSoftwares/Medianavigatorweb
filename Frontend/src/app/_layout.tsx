import '../global.css';
import '@/lib/nativewind-interop';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FullScreenError, SplashView } from '@/components/FullScreenStatus';
import { colors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

// Native header for screens pushed on top of the tabs.
const pushedScreenOptions = {
  headerShown: true,
  headerTintColor: colors.navy,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: { backgroundColor: colors.white },
  contentStyle: { backgroundColor: colors.white },
} as const;

function RootNavigator() {
  const { state, restoreSession, signOut } = useAuth();

  if (state.status === 'loading') return <SplashView />;

  if (state.status === 'error') {
    return (
      <FullScreenError
        title="Unable to verify your session"
        message={state.message}
        onRetry={restoreSession}
        secondaryAction={{ label: 'Sign out', onPress: () => void signOut() }}
      />
    );
  }

  // Client-side guards only decide which screens are reachable. The server is the source of
  // truth: every protected request is re-authenticated, and a session that cannot be refreshed signs the user out here.
  const isAuthenticated = state.status === 'authenticated';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="connected-accounts" options={{ ...pushedScreenOptions, title: 'Connected accounts' }} />
        <Stack.Screen name="notifications" options={{ ...pushedScreenOptions, title: 'Notifications' }} />
        {/* The connection screen renders its own header (back, title, settings) to match the design. */}
        <Stack.Screen name="connect/[platform]" options={{ headerShown: false }} />
        <Stack.Screen name="settings/security" options={{ ...pushedScreenOptions, title: 'Security' }} />
        <Stack.Screen name="settings/preferences" options={{ ...pushedScreenOptions, title: 'Profile details' }} />
        <Stack.Screen name="settings/help" options={{ ...pushedScreenOptions, title: 'Help' }} />
        <Stack.Screen name="settings/privacy" options={{ ...pushedScreenOptions, title: 'Privacy Policy' }} />
        <Stack.Screen name="settings/terms" options={{ ...pushedScreenOptions, title: 'Terms' }} />
        <Stack.Screen name="analysis/[platform]" options={{ headerShown: false }} />
        <Stack.Screen name="analysis/why/[id]" options={{ ...pushedScreenOptions, title: 'Why?' }} />
        <Stack.Screen name="analysis/deep/[id]" options={{ ...pushedScreenOptions, title: 'Deep Analysis' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>
  );
}
