import { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** Soft surface that groups one section of content, with an optional title and one line of context. */
export function Card({ title, description, right, children }: { title?: string; description?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="mb-lg rounded-2xl bg-neutral-50 p-lg">
      {title ? (
        <View className="mb-md flex-row items-start">
          <View className="flex-1 pr-sm">
            <Text className="text-title text-navy" accessibilityRole="header">
              {title}
            </Text>
            {description ? <Text className="mt-xs text-caption text-neutral-500">{description}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Label / value line inside a card. */
export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-xs" accessible accessibilityLabel={`${label}: ${value}`}>
      <Text className="mr-md flex-1 text-label font-normal text-neutral-500">{label}</Text>
      <Text className="text-label font-semibold text-navy">{value}</Text>
    </View>
  );
}

/** Bulleted list of server-provided text. */
export function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} className="mb-xs flex-row">
          <Text className="mr-sm text-body text-primary">•</Text>
          <Text className="flex-1 text-label font-normal text-navy">{item}</Text>
        </View>
      ))}
    </View>
  );
}
