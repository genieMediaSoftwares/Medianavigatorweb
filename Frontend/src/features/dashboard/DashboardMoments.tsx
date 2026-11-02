import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { colors } from '@/constants/colors';
import { radius, spacing, touchTarget, typography } from '@/constants/theme';
import { fetchMediaPage } from '@/features/analysis/api';
import { PostImage } from '@/features/analysis/PostImage';
import { postMetricValue } from '@/features/analysis/post-metrics';
import { PLATFORM_META } from '@/features/connections/platforms';
import type { ResourceState } from '@/hooks/useApiResource';
import type { Connection, MediaItem } from '@/types/api';

import { readIdea, rememberIdea } from './idea-storage';
import { dailyIdeaIndex, dayKey, savedIdeaIndex, selectLittleWin, TINY_IDEAS } from './moments';

type IconName = ComponentProps<typeof Ionicons>['name'];

function MomentCard({ title, icon, color, tint, children }: { title: string; icon: IconName; color: string; tint: string; children: ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.heading}>
        <View style={[s.icon, { backgroundColor: tint }]}><Ionicons name={icon} size={20} color={color} /></View>
        <Text accessibilityRole="header" style={s.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Action({ label, icon, onPress, expanded }: { label: string; icon: IconName; onPress: () => void; expanded?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={({ pressed }) => [s.action, { opacity: pressed ? 0.65 : 1 }]}>
      <Text style={s.actionText}>{label}</Text>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </Pressable>
  );
}

function WinImage({ post }: { post: MediaItem }) {
  const [failed, setFailed] = useState(false);
  return post.thumbnailUrl && !failed ? <PostImage uri={post.thumbnailUrl} onError={() => setFailed(true)} /> : <View style={s.imageFallback}><PlatformLogo platform={post.platform} size={24} /></View>;
}

function WinPost({ post }: { post: MediaItem }) {
  const [expanded, setExpanded] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 || fontScale > 1.3;
  const likes = postMetricValue(post, 'likes');
  const hasLikes = likes !== null && likes > 0;
  return (
    <>
      <Text style={s.body}>{hasLikes ? 'A little love for something you made.' : 'You put something out into the world. That counts.'}</Text>
      <View style={[s.post, stacked && s.stacked]}>
        <View style={s.thumb}><WinImage key={post.thumbnailUrl} post={post} /></View>
        <View style={s.postText}>
          <Text style={s.postTitle} numberOfLines={2}>{post.title || post.caption || 'A moment you shared'}</Text>
          <Text style={s.caption}>{PLATFORM_META[post.platform].name}</Text>
          {hasLikes ? <Text style={s.likes}>{`${likes.toLocaleString()} ${post.platform === 'facebook' ? (likes === 1 ? 'reaction' : 'reactions') : (likes === 1 ? 'like' : 'likes')}`}</Text> : null}
        </View>
      </View>
      {expanded ? (
        <View style={s.expanded}>
          {post.thumbnailUrl ? <View style={s.fullImage}><WinImage key={post.thumbnailUrl} post={post} /></View> : null}
          <Text selectable style={s.body}>{post.caption || post.title || 'A moment you shared.'}</Text>
          <Text style={s.caption}>{`Published ${new Date(post.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`}</Text>
        </View>
      ) : null}
      <Action label={expanded ? 'Hide post' : 'See post'} icon={expanded ? 'chevron-up' : 'arrow-forward'} expanded={expanded} onPress={() => setExpanded((value) => !value)} />
    </>
  );
}

function LittleWin({ connections, onRetry }: { connections: ResourceState<Connection[]>; onRetry: () => void }) {
  const router = useRouter();
  const connected = connections.status === 'success' && connections.data.some((item) => item.connected);
  // Changes after every completed dashboard refresh, so the highlight follows the refreshed account data.
  const fetcher = useCallback(async () => {
    if (!connected || connections.status !== 'success') return null;
    const platforms = connections.data.filter((c) => c.connected).map((c) => c.platform);
    const page = await fetchMediaPage();
    return selectLittleWin(page.items.filter((post) => platforms.includes(post.platform)));
  }, [connected, connections]);
  const [result, setResult] = useState<{ fetcher: typeof fetcher; post: MediaItem | null; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (connected) void fetcher().then(
      (post) => { if (active) setResult({ fetcher, post, error: false }); },
      () => { if (active) setResult({ fetcher, post: null, error: true }); },
    );
    return () => { active = false; };
  }, [connected, fetcher, retry]);

  let content: ReactNode;
  if (connections.status === 'loading' || (connected && result?.fetcher !== fetcher)) {
    content = <View style={s.loading} accessibilityRole="progressbar" accessibilityLabel="Finding a little win"><ActivityIndicator size="small" color={colors.violet} /><Text style={s.body}>Finding a little moment to celebrate…</Text></View>;
  } else if (connections.status !== 'success' || (connected && result?.error)) {
    content = <><Text style={s.body}>Your little win couldn’t load just now.</Text><Action label="Try again" icon="refresh-outline" onPress={() => { if (connections.status !== 'success') onRetry(); else setRetry((value) => value + 1); }} /></>;
  } else if (!connected) {
    content = <><Text style={s.body}>Your first little win starts with connecting an account.</Text><Action label="Connect an account" icon="arrow-forward" onPress={() => router.push('/connected-accounts')} /></>;
  } else if (result?.post) {
    content = <WinPost key={result.post.id} post={result.post} />;
  } else {
    content = <Text style={s.body}>Every story starts somewhere. Your little win will appear when a published post has synced.</Text>;
  }
  return <MomentCard title="A little win" icon="sparkles-outline" color={colors.violet} tint={colors.violetLight}>{content}</MomentCard>;
}

function TinyIdea({ userId, timezone }: { userId: string; timezone?: string | null }) {
  const [day, setDay] = useState(() => dayKey(new Date(), timezone));
  const [selection, setSelection] = useState<{ day: string; userId: string; index: number } | null>(null);
  const touched = useRef(false);
  const index = selection?.day === day && selection.userId === userId ? selection.index : dailyIdeaIndex(day, userId);
  const currentIndex = useRef(index);
  useEffect(() => { currentIndex.current = index; }, [index]);
  useEffect(() => {
    const update = () => setDay(dayKey(new Date(), timezone));
    update();
    const timer = setInterval(update, 60_000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [timezone]);
  useEffect(() => {
    let active = true;
    touched.current = false;
    void readIdea().then((saved) => {
      if (active && !touched.current) setSelection({ day, userId, index: savedIdeaIndex(saved, day, userId) });
    }, () => undefined);
    return () => { active = false; };
  }, [day, userId]);
  const another = () => {
    touched.current = true;
    const next = (currentIndex.current + 1) % TINY_IDEAS.length;
    currentIndex.current = next;
    setSelection({ day, userId, index: next });
    rememberIdea(day, userId, next);
  };
  const idea = TINY_IDEAS[index];
  return (
    <MomentCard title="One tiny idea" icon="leaf-outline" color={colors.success} tint={colors.successLight}>
      <View accessibilityLiveRegion="polite">
        <Text style={s.ideaTitle}>{idea.title}</Text>
        <Text style={s.body}>{idea.body}</Text>
      </View>
      <Action label="Another idea" icon="refresh-outline" onPress={another} />
    </MomentCard>
  );
}

/** Two small dashboard moments. No AI calls, new routes, or analysis jobs. */
export function DashboardMoments({ connections, userId, timezone, onRetry }: { connections: ResourceState<Connection[]>; userId: string; timezone?: string | null; onRetry: () => void }) {
  return <View style={s.section}><LittleWin connections={connections} onRetry={onRetry} /><TinyIdea userId={userId} timezone={timezone} /></View>;
}

const s = StyleSheet.create({
  section: { marginTop: spacing.sm, gap: spacing.md, width: '100%' },
  card: { padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral200, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { ...typography.title, color: colors.navy, flex: 1, minWidth: 0 },
  body: { ...typography.label, fontWeight: '400', color: colors.neutral500, flexShrink: 1 },
  ideaTitle: { ...typography.body, fontWeight: '600', color: colors.navy, marginBottom: spacing.xs },
  action: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  actionText: { ...typography.label, color: colors.primary, fontWeight: '600', flexShrink: 1 },
  post: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.canvas, borderRadius: radius.lg },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', flexShrink: 0 },
  postText: { flexShrink: 1, flexGrow: 1, minWidth: 0 },
  postTitle: { ...typography.label, color: colors.navy, fontWeight: '600' },
  caption: { ...typography.caption, color: colors.neutral500 },
  likes: { ...typography.label, color: colors.violet, fontWeight: '600', marginTop: spacing.xs },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  expanded: { gap: spacing.sm },
  fullImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden' },
  imageFallback: { flex: 1, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
});
