import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform as RNPlatform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { SegmentedControl } from '@/components/visual/SegmentedControl';
import { colors } from '@/constants/colors';
import { connectPlatform, disconnectPlatform, fetchConnections, startOAuth } from '@/features/connections/api';
import { ConnectedPanel, ConnectionHeader, ConnectionSuccess, connectErrorMessage, ProviderSetupCard } from '@/features/connections/ConnectionParts';
import { YouTubeAnalyticsSection, YouTubeDataApiSection } from '@/features/connections/YouTubeConnect';
import { isPlatform, PLATFORM_META, problemMessage, statusView } from '@/features/connections/platforms';
import { PLATFORM_SETUP } from '@/features/connections/setup';
import { useSync } from '@/features/connections/useSync';
import { useApiResource } from '@/hooks/useApiResource';
import { confirmDestructive, showMessage } from '@/lib/confirm';
import { formatRelativeTime } from '@/lib/format';
import type { Connection, ConnectInput, Platform } from '@/types/api';

type Phase = 'idle' | 'validating' | 'authorizing';

function ConnectForm({ platform, connection, onConnected, onOAuthReturn }: {
  platform: Platform;
  connection: Connection;
  onConnected: (connection: Connection) => void;
  onOAuthReturn: () => void;
}) {
  const name = PLATFORM_META[platform].name;
  const setup = PLATFORM_SETUP[platform];
  const [modeId, setModeId] = useState(setup.modes[0].id);
  const mode = setup.modes.find((m) => m.id === modeId) ?? setup.modes[0];
  const [secret, setSecret] = useState('');
  const [extra, setExtra] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  // With one-tap sign-in available, the manual token form is a fallback the user opens on purpose.
  const [manual, setManual] = useState(!connection.oauthAvailable);

  const extraRequired = mode.extra !== undefined && !mode.extra.label.includes('(optional)');
  const ready = secret.trim().length > 0 && (!extraRequired || extra.trim().length > 0);

  const submit = async () => {
    if (!ready || phase !== 'idle') return;
    setError(null);
    setPhase('validating');
    const body: ConnectInput = { [mode.field]: secret.trim() };
    if (mode.extra && extra.trim()) body[mode.extra.key] = extra.trim();
    try {
      // 202 only after the server validated the credentials with the provider and stored them.
      const result = await connectPlatform(platform, body);
      setSecret('');
      setExtra('');
      onConnected(result.connection);
    } catch (e) {
      setError(connectErrorMessage(e, name));
    } finally {
      setPhase('idle');
    }
  };

  // Provider sign-in. The server stores the connection on its callback; when the browser closes,
  // the connection list is reloaded from the API to see whether it succeeded.
  const signIn = async () => {
    setError(null);
    setPhase('authorizing');
    try {
      const { authorizeUrl } = await startOAuth(platform);
      await WebBrowser.openBrowserAsync(authorizeUrl);
      onOAuthReturn();
    } catch (e) {
      setError(connectErrorMessage(e, name));
    } finally {
      setPhase('idle');
    }
  };

  return (
    <>
      {error && !manual ? <Notice variant="error" message={error} /> : null}

      {connection.oauthAvailable ? (
        <View className="mb-xl">
          <Button title={`Continue with ${name}`} onPress={() => void signIn()} loading={phase === 'authorizing'} disabled={phase !== 'idle'} />
          <Text className="mt-sm text-center text-[12px] text-neutral-500">{`Sign in with ${name} to connect.`}</Text>
          <Text
            className="mt-md text-center text-[13px] font-semibold text-primary"
            onPress={() => setManual((m) => !m)}
            accessibilityRole="button"
            accessibilityState={{ expanded: manual }}
          >
            {manual ? 'Hide the access token option' : 'Use an access token instead'}
          </Text>
        </View>
      ) : platform === 'linkedin' ? (
        <Notice variant="info" title="One-tap sign-in isn’t set up yet" message={`${name} OAuth isn’t configured on the server, so connect with a token generated in the developer console.`} />
      ) : null}

      {manual ? (
    <>
      <ProviderSetupCard setup={setup.setup} />

      {setup.modes.length > 1 ? (
        <View className="mb-lg">
          <SegmentedControl
            segments={setup.modes.map((m) => ({ value: m.id, label: m.tab }))}
            value={modeId}
            onChange={(id) => {
              setModeId(id);
              setSecret('');
              setExtra('');
              setError(null);
            }}
          />
        </View>
      ) : null}

      {error ? <Notice variant="error" message={error} /> : null}

      <TextField
        label={mode.label}
        value={secret}
        onChangeText={setSecret}
        placeholder={mode.placeholder}
        hint={mode.hint}
        secureToggle
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={phase === 'idle'}
      />
      {mode.extra ? (
        <TextField
          label={mode.extra.label}
          value={extra}
          onChangeText={setExtra}
          placeholder={mode.extra.placeholder}
          hint={mode.extra.hint}
          autoCapitalize="none"
          autoCorrect={false}
          editable={phase === 'idle'}
        />
      ) : null}

      <View className="mt-sm">
        <Button title={phase === 'validating' ? `Validating with ${name}…` : `Connect ${name}`} onPress={() => void submit()} loading={phase === 'validating'} disabled={!ready || phase !== 'idle'} />
      </View>
      <Text className="mt-md text-center text-[12px] leading-[17px] text-neutral-500">
        Your access token is sent securely to the Media Navigator server, verified with {name}, and stored encrypted. It is never shown again.
      </Text>
    </>
      ) : null}
    </>
  );
}

/** Connect, manage or disconnect one platform. Connection state always comes from GET /connections. */
export default function ConnectPlatformScreen() {
  const router = useRouter();
  const { platform: param } = useLocalSearchParams<{ platform: string }>();
  const platform = isPlatform(param) ? param : null;
  const { state, reload, refresh } = useApiResource(fetchConnections);
  const sync = useSync(useCallback(() => void refresh(), [refresh]));
  const [disconnecting, setDisconnecting] = useState(false);
  const [success, setSuccess] = useState<Connection | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!platform) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <ConnectionHeader title="Connect" onBack={goBack} onSettings={() => router.push('/connected-accounts')} />
        <EmptyState icon="help-circle-outline" title="Unknown platform" message="This platform is not supported." action={{ label: 'Back', onPress: goBack }} />
      </SafeAreaView>
    );
  }

  const name = PLATFORM_META[platform].name;
  const setup = PLATFORM_SETUP[platform];
  const connection = state.status === 'success' ? state.data.find((c) => c.platform === platform) : undefined;

  const confirmDisconnect = async () => {
    const ok = await confirmDestructive(`Disconnect ${name}?`, 'Stored access is deleted and syncing stops. Your synced history is kept.', 'Disconnect');
    if (!ok) return;
    setDisconnecting(true);
    try {
      await disconnectPlatform(platform);
      await refresh();
    } catch (e) {
      showMessage('Unable to disconnect', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const afterOAuth = async () => {
    setOauthNotice(null);
    try {
      const latest = (await fetchConnections()).find((c) => c.platform === platform);
      if (latest?.connected) setSuccess(latest);
      else setOauthNotice(`${name} didn’t finish connecting. If you completed sign-in, pull to refresh in a moment; otherwise try again.`);
      await refresh();
    } catch (e) {
      setOauthNotice(e instanceof Error ? e.message : 'Unable to check the connection.');
    }
  };

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <ConnectionHeader title={name} onBack={goBack} onSettings={() => router.push('/connected-accounts')} />
        <ConnectionSuccess platformName={name} noun={setup.noun} connection={success} onDone={goBack} />
      </SafeAreaView>
    );
  }

  const status = connection ? statusView(connection, sync.active.includes(platform)) : null;
  const showForm = connection && (!connection.connected || status?.needsReconnect);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <ConnectionHeader title={name} onBack={goBack} onSettings={() => router.push('/connected-accounts')} />
      <KeyboardAvoidingView className="flex-1" behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-xl pb-3xl pt-md" keyboardShouldPersistTaps="handled">
          <View className="items-center">
            <PlatformLogo platform={platform} size={60} />
            <Text className="mt-lg text-center text-[24px] font-bold leading-[30px] text-navy" accessibilityRole="header">
              {`Connect your ${name} ${setup.noun}`}
            </Text>
            <Text className="mb-xl mt-sm text-center text-[15px] leading-[22px] text-neutral-500">{setup.intro}</Text>
          </View>

          {state.status === 'loading' ? (
            <LoadingState message="Checking connection…" />
          ) : state.status !== 'success' ? (
            <ErrorState message={state.message} onRetry={reload} />
          ) : !connection ? (
            <EmptyState icon="help-circle-outline" title={`${name} is not available`} message="The server did not report this platform." />
          ) : (
            <>
              {oauthNotice ? <Notice variant="warning" message={oauthNotice} /> : null}
              {connection.connected ? <ConnectedPanel connection={connection} onDisconnect={() => void confirmDisconnect()} disconnecting={disconnecting} /> : null}
              {problemMessage(connection) ? <Notice variant="warning" title={status?.label} message={problemMessage(connection)!} /> : null}
              {sync.error ? <Notice variant="error" title="Sync" message={sync.error} /> : null}

              {connection.connected && !status?.needsReconnect ? (
                <View style={{ gap: 10 }}>
                  <Text className="text-center text-[13px] text-neutral-500">
                    {`Last synced ${formatRelativeTime(connection.lastSyncedAt || null)} · ${connection.dataPointsCount.toLocaleString()} items`}
                  </Text>
                  <Button title="Sync now" icon="refresh-outline" variant="secondary" onPress={() => void sync.start(platform)} loading={sync.active.includes(platform)} />
                </View>
              ) : null}

              {showForm && platform === 'youtube' ? <YouTubeDataApiSection onConnected={setSuccess} /> : null}
              {platform === 'youtube' && (showForm || connection.authMethod !== 'oauth') ? (
                <View style={{ marginTop: connection.connected && !showForm ? 16 : 0 }}>
                  <YouTubeAnalyticsSection connection={connection} onReturn={() => void afterOAuth()} />
                </View>
              ) : null}
              {showForm && platform !== 'youtube' ? <ConnectForm platform={platform} connection={connection} onConnected={setSuccess} onOAuthReturn={() => void afterOAuth()} /> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
