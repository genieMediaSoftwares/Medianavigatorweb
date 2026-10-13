import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/colors';
import type { Connection } from '@/types/api';

import { connectPlatform, startOAuth } from './api';
import { connectErrorMessage } from './ConnectionParts';

const LINKS = {
  console: 'https://console.cloud.google.com/apis/credentials',
  library: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
  dataDocs: 'https://developers.google.com/youtube/v3',
  analyticsDocs: 'https://developers.google.com/youtube/analytics',
};

// Mirrors the server's checks so format mistakes are caught before a request is made.
const KEY_RE = /^AIza[0-9A-Za-z_-]{35}$/;
const CHANNEL_RE = /^(UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,30})$|youtube\.com\/(channel\/UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,30})/i;

function Section({ step, icon, title, subtitle, children }: { step: string; icon: ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string; children: ReactNode }) {
  return (
    <View className="mb-lg rounded-[16px] border border-neutral-200 bg-white p-lg">
      <View className="flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-sky">
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View className="ml-md flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-500">{step}</Text>
          <Text className="text-[17px] font-semibold text-navy" accessibilityRole="header">
            {title}
          </Text>
        </View>
      </View>
      <Text className="mb-md mt-sm text-[14px] leading-[20px] text-navy-light">{subtitle}</Text>
      {children}
    </View>
  );
}

function LinkButton({ label, url, onError }: { label: string; url: string; onError: (m: string) => void }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => onError('We couldn\u2019t open the browser. Please try again.'))}
      accessibilityRole="link"
      className="mb-sm min-h-11 flex-row items-center justify-center rounded-[12px] border border-neutral-200 bg-white px-lg active:bg-neutral-50"
    >
      <Text className="text-[14px] font-semibold text-navy">{label}</Text>
      <Ionicons name="open-outline" size={14} color={colors.navy} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

/** Section A: YouTube Data API v3 with an API key. Public data only. Channel resolved server-side. */
export function YouTubeDataApiSection({ onConnected }: { onConnected: (connection: Connection) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();

  // Step 2: server confirmed key is valid but needs a channel identifier
  const [needsChannel, setNeedsChannel] = useState(false);
  const [channel, setChannel] = useState('');
  const [channelError, setChannelError] = useState<string | undefined>();

  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    // --- Step 1: just the API key ---
    if (!needsChannel) {
      if (!KEY_RE.test(apiKey.trim())) {
        setApiKeyError('Paste the API key from Google Cloud Console. It starts with \u201cAIza\u201d and is 39 characters.');
        return;
      }
      setApiKeyError(undefined);
      setError(null);
      setBusy(true);
      try {
        const result = await connectPlatform('youtube', { apiKey: apiKey.trim() });
        setApiKey('');
        setNeedsChannel(false);
        onConnected(result.connection);
      } catch (e) {
        // If the server says the key is valid but a channel is needed, move to step 2.
        const msg = connectErrorMessage(e, 'YouTube');
        if (/API key verified/i.test(msg) || /channel field/i.test(msg) || /channel to connect/i.test(msg)) {
          setNeedsChannel(true);
          setError(null);
        } else {
          setError(msg);
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    // --- Step 2: key already validated, now send key + channel ---
    if (!channel.trim()) {
      setChannelError('Enter your @handle (e.g. @YourChannel) or channel ID (starts with UC\u2026).');
      return;
    }
    if (!CHANNEL_RE.test(channel.trim())) {
      setChannelError('Enter a channel ID (starts with UC\u2026) or your exact @handle (e.g. @YourChannel).');
      return;
    }
    setChannelError(undefined);
    setError(null);
    setBusy(true);
    try {
      const result = await connectPlatform('youtube', { apiKey: apiKey.trim(), channelQuery: channel.trim() });
      setApiKey('');
      setChannel('');
      setNeedsChannel(false);
      onConnected(result.connection);
    } catch (e) {
      setError(connectErrorMessage(e, 'YouTube'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      step="Section A"
      icon="logo-youtube"
      title="YouTube Data API v3"
      subtitle="Reads your channel\u2019s public video data: videos, Shorts, views, likes and comments. Paste your API key and click Connect \u2014 no channel ID needed upfront."
    >
      <Pressable onPress={() => setShowSteps((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showSteps }} className="mb-sm min-h-9 flex-row items-center">
        <Text className="text-[13px] font-semibold text-primary">{showSteps ? 'Hide setup steps' : 'How to enable the API and get a key'}</Text>
        <Ionicons name={showSteps ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} style={{ marginLeft: 4 }} />
      </Pressable>
      {showSteps ? (
        <View className="mb-md rounded-xl bg-neutral-50 p-md">
          {[
            'Open Google Cloud Console and select (or create) a project.',
            'APIs & Services \u2192 Library: enable \u201cYouTube Data API v3\u201d. Enable \u201cYouTube Analytics API\u201d too if you\u2019ll use Section B.',
            'APIs & Services \u2192 Credentials \u2192 Create credentials \u2192 API key.',
            'Edit the key: under \u201cAPI restrictions\u201d allow YouTube Data API v3. Leave \u201cApplication restrictions\u201d as None (the Media Navigator server makes the calls) or restrict it to the server\u2019s IP.',
          ].map((t, i) => (
            <View key={i} className="mb-xs flex-row">
              <Text className="w-5 text-[13px] font-semibold text-navy">{i + 1}.</Text>
              <Text className="flex-1 text-[13px] leading-[19px] text-neutral-500">{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <LinkButton label="Open Google Cloud Console" url={LINKS.console} onError={setError} />
      <LinkButton label="Enable YouTube Data API v3" url={LINKS.library} onError={setError} />
      <Text className="mb-md text-center text-[12px] text-primary" onPress={() => void Linking.openURL(LINKS.dataDocs)} accessibilityRole="link">
        YouTube Data API v3 documentation
      </Text>

      {error ? <Notice variant="error" message={error} /> : null}

      {/* Step 1: API key */}
      <TextField
        label="YouTube Data API key"
        value={apiKey}
        onChangeText={(v) => { setApiKey(v); setNeedsChannel(false); setError(null); }}
        placeholder="AIza\u2026"
        error={apiKeyError}
        hint="Stored encrypted on the Media Navigator server and never shown again."
        secureToggle
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={!busy}
      />

      {/* Step 2: channel — only shown after server confirms key is valid */}
      {needsChannel ? (
        <View className="mb-md rounded-xl border border-amber-200 bg-amber-50 p-md">
          <View className="mb-sm flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text className="ml-xs text-[13px] font-semibold text-navy">API key verified!</Text>
          </View>
          <Text className="mb-md text-[13px] leading-[19px] text-neutral-600">
            YouTube\u2019s API can\u2019t identify which channel belongs to an API key. Enter your @handle or channel ID so we know which channel to connect.
          </Text>
          <TextField
            label="Your YouTube channel @handle or ID"
            value={channel}
            onChangeText={setChannel}
            placeholder="@YourChannel or UC\u2026"
            error={channelError}
            hint="Find your @handle in YouTube Studio \u2192 Settings \u2192 Channel \u2192 Advanced settings."
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
        </View>
      ) : null}

      <Button
        title={busy ? 'Checking with YouTube\u2026' : needsChannel ? 'Connect channel' : 'Connect with API key'}
        onPress={() => void submit()}
        loading={busy}
        disabled={busy}
      />
    </Section>
  );
}

/** Section B: YouTube Analytics API, which Google only allows after the channel owner signs in (OAuth). */
export function YouTubeAnalyticsSection({ connection, onReturn }: { connection: Connection; onReturn: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signedIn = connection.connected && connection.authMethod === 'oauth';

  const signIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const { authorizeUrl } = await startOAuth('youtube');
      await WebBrowser.openBrowserAsync(authorizeUrl);
      onReturn();
    } catch (e) {
      setError(connectErrorMessage(e, 'YouTube'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      step="Section B"
      icon="bar-chart-outline"
      title="YouTube Analytics API"
      subtitle="Adds watch time for each video from your channel\u2019s private analytics. Google only allows this after you sign in with the Google account that owns or manages the channel; API keys can\u2019t access it."
    >
      {signedIn ? (
        <View className="flex-row items-center rounded-xl border border-success-border bg-success-light p-md">
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text className="ml-sm flex-1 text-[14px] text-success">Connected with your Google account. Watch time is included.</Text>
        </View>
      ) : connection.oauthAvailable ? (
        <>
          {error ? <Notice variant="error" message={error} /> : null}
          <Button title="Connect Google Account" icon="logo-google" onPress={() => void signIn()} loading={busy} disabled={busy} />
          <Text className="mt-sm text-center text-[12px] text-neutral-500">
            Read-only access (youtube.readonly and yt-analytics.readonly). It also connects your channel, so Section A isn\u2019t needed, and it renews automatically.
          </Text>
        </>
      ) : (
        <Notice
          variant="info"
          title="Google sign-in isn\u2019t set up on this server yet"
          message="Add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REDIRECT_URI to backend/.env (the steps are in that file) and restart the backend. Until then, use Section A for public data; watch time shows as not available."
        />
      )}
      <Text className="mt-sm text-center text-[12px] text-primary" onPress={() => void Linking.openURL(LINKS.analyticsDocs)} accessibilityRole="link">
        YouTube Analytics API documentation
      </Text>
    </Section>
  );
}
