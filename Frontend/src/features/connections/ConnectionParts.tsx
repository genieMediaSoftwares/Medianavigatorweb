import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { ApiError } from '@/lib/api/client';
import type { Connection } from '@/types/api';

import type { PlatformSetup } from './setup';

const floating = elevation.button;

/** Back button, centered title and settings button. */
export function ConnectionHeader({ title, onBack, onSettings }: { title: string; onBack: () => void; onSettings: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-lg pb-sm pt-xs">
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" className="h-12 w-12 items-center justify-center rounded-full bg-white active:bg-neutral-50" style={floating}>
        <Ionicons name="chevron-back" size={26} color={colors.navy} />
      </Pressable>
      <Text className="text-[18px] font-semibold text-navy" accessibilityRole="header">
        {title}
      </Text>
      <Pressable
        onPress={onSettings}
        accessibilityRole="button"
        accessibilityLabel="Connected accounts"
        hitSlop={4}
        className="h-12 w-12 items-center justify-center rounded-full bg-sky active:bg-sky-border"
      >
        {/* Same pale-blue circle and navy gear as the Dashboard's settings button. */}
        <Ionicons name="settings-sharp" size={22} color={colors.navy} />
      </Pressable>
    </View>
  );
}

/** Pale-green panel for an account the server reports as connected. */
export function ConnectedPanel({ connection, onDisconnect, disconnecting }: { connection: Connection; onDisconnect: () => void; disconnecting: boolean }) {
  const name = connection.accountInfo?.name;
  return (
    <View className="mb-lg rounded-[16px] border border-success-border bg-success-light p-lg">
      <View className="flex-row items-center">
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text className="ml-xs text-[15px] font-semibold text-success">Currently Connected</Text>
      </View>
      <View className="mt-sm flex-row items-center">
        <View className="flex-1 pr-md">
          <Text className="text-[17px] font-bold text-navy" numberOfLines={1}>
            {connection.accountHandle}
          </Text>
          {name && name !== connection.accountHandle ? (
            <Text className="mt-0.5 text-[14px] text-neutral-500" numberOfLines={1}>
              {name}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onDisconnect} disabled={disconnecting} accessibilityRole="button" hitSlop={8} className="min-h-11 justify-center">
          <Text className={`text-[15px] font-semibold ${disconnecting ? 'text-neutral-400' : 'text-primary'}`}>{disconnecting ? 'Disconnecting…' : 'Disconnect'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Light-gray developer setup card with the platform's official links. */
export function ProviderSetupCard({ setup }: { setup: PlatformSetup['setup'] }) {
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const open = async (url: string) => {
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError('We couldn’t open the browser. Copy the address from Help, or try again.');
    }
  };

  return (
    <View className="mb-xl rounded-[16px] border border-neutral-200 bg-neutral-50 p-lg">
      <View className="flex-row items-center">
        <Ionicons name={setup.icon} size={22} color={colors.navy} />
        <Text className="ml-sm text-[18px] font-semibold text-navy">{setup.title}</Text>
      </View>
      <Text className="mt-sm text-[14px] leading-[20px] text-neutral-500">{setup.body}</Text>

      <Pressable onPress={() => setShowSteps((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showSteps }} className="mt-sm min-h-9 flex-row items-center">
        <Text className="text-[13px] font-semibold text-primary">{showSteps ? 'Hide steps' : 'How to get it'}</Text>
        <Ionicons name={showSteps ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} style={{ marginLeft: 4 }} />
      </Pressable>
      {showSteps ? (
        <View className="mb-xs">
          {setup.steps.map((step, i) => (
            <View key={i} className="mb-xs flex-row">
              <Text className="w-5 text-[13px] font-semibold text-navy">{i + 1}.</Text>
              <Text className="flex-1 text-[13px] leading-[19px] text-neutral-500">{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {setup.links.map((link) => (
        <Pressable
          key={link.url}
          onPress={() => void open(link.url)}
          accessibilityRole="link"
          className="mt-sm min-h-12 flex-row items-center justify-center rounded-[12px] border border-neutral-200 bg-white px-lg active:bg-neutral-50"
        >
          <Text className="text-[15px] font-semibold text-navy">{link.label}</Text>
          <Ionicons name="open-outline" size={15} color={colors.navy} style={{ marginLeft: 6 }} />
        </Pressable>
      ))}
      <Text className="mt-sm text-center text-[12px] text-neutral-500">Return to Media Navigator after completing setup.</Text>
      {linkError ? <Text className="mt-xs text-center text-[12px] text-danger">{linkError}</Text> : null}
    </View>
  );
}

/** Centered success state, shown only with the connection the server returned. */
export function ConnectionSuccess({ platformName, noun, connection, onDone }: { platformName: string; noun: string; connection: Connection; onDone: () => void }) {
  const name = connection.accountInfo?.name;
  return (
    <View className="flex-1 items-center justify-center px-xl pb-3xl">
      <View className="h-[88px] w-[88px] items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(6, 118, 71, 0.1)' }}>
        <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-success">
          <Ionicons name="checkmark" size={32} color={colors.white} />
        </View>
      </View>
      <Text className="mt-xl text-center text-[26px] font-bold text-navy" accessibilityRole="header">
        {platformName} connected
      </Text>
      <Text className="mt-xs text-center text-[18px] font-semibold text-primary">{connection.accountHandle}</Text>
      {name && name !== connection.accountHandle ? <Text className="mt-xs text-center text-[16px] text-neutral-500">{name}</Text> : null}
      <Text className="mb-xl mt-lg text-center text-[15px] leading-[22px] text-neutral-500">
        {`Your ${platformName} ${noun} is now securely connected to Media Navigator. We’re importing your content now.`}
      </Text>
      <View className="self-stretch">
        <Button title="Done" onPress={onDone} />
      </View>
    </View>
  );
}

/** Plain-language message for a failed connect, built from the server's error. */
export function connectErrorMessage(error: unknown, platformName: string): string {
  if (!(error instanceof ApiError)) return `We couldn’t connect ${platformName}. Please try again.`;
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Unable to reach Media Navigator. Check your connection and try again.';
    case 'CONFLICT':
      return `That ${platformName} account is already connected to another Media Navigator account.`;
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'PROVIDER_ERROR':
      return `${platformName} isn’t responding right now. Please try again in a few minutes.`;
    case 'SERVICE_UNAVAILABLE':
      return `${platformName} connections aren’t configured on the server yet.`;
    case 'BAD_REQUEST':
      // The server explains in plain words what the provider rejected (invalid key or token, API not enabled, channel not found…).
      return error.message;
    default:
      return error.message;
  }
}
