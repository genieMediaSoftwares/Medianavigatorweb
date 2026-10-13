import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { MediaNavigatorLogo } from '@/components/brand/MediaNavigatorLogo';
import { ListRow } from '@/components/ListRow';
import { Divider } from '@/components/ui/Divider';

/** What the app is, its version (from the app config) and links to the legal pages. */
export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? null;
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-lg pb-2xl pt-lg">
      <View className="mb-lg items-center">
        <MediaNavigatorLogo height={40} />
        {version ? <Text className="mt-sm text-[13px] text-neutral-500">{`Version ${version}`}</Text> : null}
      </View>
      <Text className="mb-lg text-[14px] leading-[21px] text-navy-light">
        Media Navigator brings your Instagram, YouTube, Facebook and LinkedIn posts together, shows how each one performed compared with your own usual, and finds the times your posts reach the most people. It only reads your accounts: it never posts, edits or deletes anything on them.
      </Text>
      <View className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
        <ListRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push('/settings/privacy')} />
        <Divider inset />
        <ListRow icon="document-text-outline" label="Terms and Conditions" onPress={() => router.push('/settings/terms')} />
        <Divider inset />
        <ListRow icon="help-circle-outline" label="Help and Support" onPress={() => router.push('/settings/help')} />
      </View>
    </ScrollView>
  );
}
