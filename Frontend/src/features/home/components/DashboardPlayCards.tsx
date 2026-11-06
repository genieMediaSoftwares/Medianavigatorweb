import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { CHALLENGES, localDay, nextChallenge, VIBES, type DailyVibe, type VibeId } from '../play';
import { loadVibe, saveVibe } from '../vibeStorage';
import { PlayInfoCard } from './PlayInfoCard';

const EMOJIS = ['😊', '😴', '🤩', '😌', '😂', '🥳', '☕', '🌧️', '☀️', '🌊', '🍕', '💪'];

function Celebration({ emoji, confetti = false }: { emoji: string; confetti?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      animation = Animated.sequence([
        Animated.timing(scale, { toValue: 1.16, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]);
      animation.start();
    }).catch(() => undefined);
    return () => { active = false; animation?.stop(); };
  }, [scale]);
  return <Animated.View accessible={false} style={{ transform: [{ scale }], paddingVertical: 14 }}>
    <Text style={s.celebration}>{confetti ? `✨ 🎊 ${emoji} 🎊 ✨` : emoji}</Text>
  </Animated.View>;
}

export function DashboardPlayCards() {
  const [modal, setModal] = useState<'challenge' | 'vibe' | null>(null);
  const [challenge, setChallenge] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [emojis, setEmojis] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [daily, setDaily] = useState<DailyVibe | null>(null);
  const [today, setToday] = useState(localDay);
  const [picked, setPicked] = useState<VibeId | null>(null);
  const [saving, setSaving] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  const changed = useRef(false);
  const savingRef = useRef(false);
  useEffect(() => {
    let active = true;
    void loadVibe().then((value) => { if (active && !changed.current) setDaily(value); });
    const checkDay = () => {
      const day = localDay();
      setToday(day);
      setDaily((value) => value?.date === day ? value : null);
    };
    const timer = setInterval(checkDay, 30000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') checkDay(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, []);
  const vibe = VIBES.find((v) => v.id === picked);
  const currentVibe = daily?.date === today ? VIBES.find((v) => v.id === daily.id) : undefined;
  const task = CHALLENGES[challenge ?? 0];
  const close = () => { setModal(null); setAnswer(''); setEmojis([]); setDone(false); };
  const another = () => {
    setChallenge((previous) => nextChallenge(previous));
    setAnswer(''); setEmojis([]); setDone(false);
  };
  const chooseVibe = async (id: VibeId) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); changed.current = true;
    const value = { id, date: localDay() };
    setToday(value.date); setDaily(value); setPicked(id);
    setStorageNotice('');
    const saved = await saveVibe(value);
    setStorageNotice(saved ? '' : 'Your vibe is set for this visit. This device could not save it for later.');
    savingRef.current = false; setSaving(false);
  };
  return <View className="mt-sm">
    <PlayInfoCard icon="bulb-outline" iconColor={colors.violet} iconBackground={colors.violetLight}
      eyebrow="A little creative break" title="The 10-Second Challenge"
      message="A tiny challenge to spark your imagination. No timer, no pressure—just a little fun."
      onPress={() => { another(); setModal('challenge'); }} />
    <PlayInfoCard icon="happy-outline" iconColor={colors.success} iconBackground={colors.successLight}
      eyebrow={currentVibe ? `Today’s vibe: ${currentVibe.label} ${currentVibe.emoji}` : 'A moment for you'} title="Pick Your Vibe"
      message="Chill, energetic, curious or playful? Pick your mood and enjoy a little moment just for you."
      onPress={() => { setToday(localDay()); setPicked(daily?.date === localDay() ? daily.id : null); setStorageNotice(''); setModal('vibe'); }} />
    <Modal visible={modal !== null} transparent animationType="none" onRequestClose={close}>
      <SafeAreaView style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.center}>
          <View accessibilityViewIsModal style={s.sheet}>
            <View style={s.header}>
              <Text accessibilityRole="header" style={s.title}>{modal === 'challenge' ? 'The 10-Second Challenge' : 'Pick Your Vibe'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close activity" onPress={close} style={s.close}><Ionicons name="close" size={24} color={colors.navy} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
              {modal === 'challenge' ? <>
                {done ? <View accessibilityLiveRegion="polite" style={s.result}>
                  <Celebration emoji="🎉" confetti />
                  <Text style={s.prompt}>Small challenge. Big imagination!</Text>
                  <Text style={s.body}>{task.kind === 'emoji' ? emojis.join(' ') : answer.trim()}</Text>
                </View> : <>
                  <Text style={s.note}>Ten seconds is just an idea. Take your time.</Text>
                  <Text accessibilityRole="header" style={s.prompt}>{task.prompt}</Text>
                  {task.kind === 'emoji' ? <>
                    <Text accessibilityLiveRegion="polite" style={s.preview}>{emojis.length ? emojis.join(' ') : '＋  ＋  ＋'}</Text>
                    <Text style={s.note}>{emojis.length} / 3 selected. Tap again to remove.</Text>
                    <View style={s.grid}>{EMOJIS.map((emoji) => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Choose ${emoji}`} accessibilityState={{ selected: emojis.includes(emoji), disabled: emojis.length === 3 && !emojis.includes(emoji) }} disabled={emojis.length === 3 && !emojis.includes(emoji)} onPress={() => setEmojis((value) => value.includes(emoji) ? value.filter((item) => item !== emoji) : [...value, emoji])} style={[s.emoji, emojis.includes(emoji) && s.selected]}><Text style={{ fontSize: 27 }}>{emoji}</Text></Pressable>)}</View>
                  </> : <TextInput accessibilityLabel="Your challenge answer" placeholder="Let your imagination wander…" placeholderTextColor={colors.neutral500} value={answer} onChangeText={setAnswer} multiline maxLength={240} style={s.input} />}
                  <Button title="Done" disabled={task.kind === 'emoji' ? emojis.length !== 3 : !answer.trim()} onPress={() => setDone(true)} />
                </>}
                <Button title="Try another" variant="secondary" onPress={another} />
                <Text style={s.note}>Just for fun. Your answers are not saved or sent anywhere.</Text>
              </> : <>
                <Text style={s.prompt}>What’s your vibe right now?</Text>
                <View style={s.grid}>{VIBES.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label} vibe`} accessibilityState={{ selected: picked === item.id, disabled: saving }} disabled={saving} onPress={() => { void chooseVibe(item.id); }} style={[s.vibe, { backgroundColor: item.background }, picked === item.id && s.selected]}>
                  <Text style={{ fontSize: 32 }}>{item.emoji}</Text><Text style={s.vibeLabel}>{item.label}{picked === item.id ? ' ✓' : ''}</Text>
                </Pressable>)}</View>
                {vibe ? <View accessibilityLiveRegion="polite" style={[s.result, { backgroundColor: vibe.background }]}>
                  <Celebration key={vibe.id} emoji={vibe.emoji} />
                  <Text style={s.prompt}>{vibe.message}</Text>
                </View> : null}
                <Text style={s.note}>{storageNotice || 'Remembered only on this device for today. Pick a different vibe whenever you like.'}</Text>
                <Button title="Done" onPress={close} disabled={!picked || saving} />
              </>}
              <Button title="Close" variant="secondary" onPress={close} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 34, 72, 0.45)' }, center: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 460, maxHeight: '100%', alignSelf: 'center', borderRadius: 24, backgroundColor: colors.white, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 22, paddingRight: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral100 },
  title: { flex: 1, color: colors.navy, fontSize: 17, fontWeight: '700' }, close: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 22, gap: 16 }, prompt: { color: colors.navy, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  body: { color: colors.navy, fontSize: 16, lineHeight: 24 }, note: { color: colors.neutral500, fontSize: 12, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, emoji: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.neutral100, borderRadius: 12 },
  selected: { borderColor: colors.primary }, preview: { textAlign: 'center', fontSize: 32, minHeight: 44 },
  input: { borderWidth: 1, borderColor: colors.neutral200, borderRadius: 14, padding: 14, minHeight: 100, textAlignVertical: 'top', color: colors.navy, fontSize: 16 },
  result: { padding: 16, borderRadius: 18, backgroundColor: colors.violetLight, gap: 12 }, celebration: { textAlign: 'center', fontSize: 32 },
  vibe: { flexBasis: '45%', flexGrow: 1, alignItems: 'center', padding: 16, gap: 8, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' }, vibeLabel: { color: colors.navy, fontSize: 14, fontWeight: '600' },
});
