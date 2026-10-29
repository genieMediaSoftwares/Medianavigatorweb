import Constants from 'expo-constants';
import { ScrollView, Text, View } from 'react-native';

import { MediaNavigatorLogo } from '@/components/brand/MediaNavigatorLogo';

/** What the app is and its version (from the app config). The legal and help pages are linked from Profile. */
export default function AboutScreen() {
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
    </ScrollView>
  );
}
