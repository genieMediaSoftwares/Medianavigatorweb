import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import type { BestTimes } from '@/types/api';

import { CONTENT_TYPE_LABEL, formatMetric, metricOf, slotCount } from '../presentation';

function Row({ icon, title, body }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string }) {
  return (
    <View className="mb-md flex-row" accessible accessibilityLabel={`${title}. ${body}`}>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sky">
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View className="ml-md flex-1">
        <Text className="text-label font-semibold text-navy">{title}</Text>
        <Text className="mt-[2px] text-label font-normal text-neutral-500">{body}</Text>
      </View>
    </View>
  );
}

/** How the user actually posts, compared with what works, plus formats ranked on the chosen metric. */
export function PostingPatternCard({ data }: { data: BestTimes }) {
  const a = data.analysis!;
  const metric = metricOf(data);
  const window = (k: string) => data.windows.find((w) => w.key === k)?.label.toLowerCase() ?? k;
  const rec = a.recommendation;
  const used = a.pattern.mostUsed;
  const sameAsBest = rec && used && rec.day === used.day && rec.window === used.window;

  return (
    <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>
      <Text className="mb-md text-title text-navy" accessibilityRole="header">
        Your posting pattern
      </Text>

      {data.postsPerWeek !== undefined ? (
        <Row
          icon="calendar-outline"
          title={`${data.postsPerWeek} posts a week`}
          body={`Average over the last ${data.days} days. Posting regularly in your strongest slots gives the clearest read on what reaches people.`}
        />
      ) : null}

      {used ? (
        <Row
          icon="repeat-outline"
          title={`You post most on ${used.day} ${window(used.window)} (${used.posts} posts)`}
          body={
            sameAsBest
              ? 'That is also your strongest slot, so keep it.'
              : rec
                ? `It scores ${used.score} (50 = typical). ${rec.day} ${rec.windowLabel.toLowerCase()} scores ${rec.score}, so moving key posts there is worth testing.`
                : `It scores ${used.score} (50 = typical).`
          }
        />
      ) : null}

      <Row
        icon="flask-outline"
        title={`${a.pattern.untestedSlots} of ${slotCount(data)} time slots untested`}
        body={
          a.pattern.untestedSlots > slotCount(data) / 2
            ? 'You post in only a few slots, so a better time may exist that hasn’t been tried. Try a couple of posts in new slots to find out.'
            : 'You’ve tried a good spread of times, which makes the comparison more reliable.'
        }
      />

      {a.formats.length > 1 ? (
        <>
          <Text className="mb-xs mt-xs text-label font-semibold text-navy">{`Formats by ${metric.label.toLowerCase()}`}</Text>
          {a.formats.map((f, i) => (
            <View key={f.type} className="flex-row items-center border-t border-neutral-100 py-sm" accessible accessibilityLabel={`${CONTENT_TYPE_LABEL[f.type] ?? f.type}: median ${formatMetric(f.median, metric.unit)}, ${f.posts} posts`}>
              <Text className="w-6 text-label font-semibold text-neutral-400">{i + 1}</Text>
              <Text className="flex-1 text-label text-navy">{`${CONTENT_TYPE_LABEL[f.type] ?? f.type} · ${f.posts} posts`}</Text>
              <Text className="text-label font-semibold text-navy">{formatMetric(f.median, metric.unit)}</Text>
              {f.liftPct !== null ? (
                <Text className={`ml-sm w-[64px] text-right text-[12px] ${f.liftPct >= 0 ? 'text-success' : 'text-danger'}`}>{`${f.liftPct >= 0 ? '+' : ''}${Math.round(f.liftPct)}%`}</Text>
              ) : null}
            </View>
          ))}
          <Text className="mt-xs text-[12px] text-neutral-500">Median per post, compared with your typical post. Best times above already account for format.</Text>
        </>
      ) : null}
    </View>
  );
}
