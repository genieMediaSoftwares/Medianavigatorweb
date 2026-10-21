import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform as RNPlatform, Pressable, ScrollView, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/PlatformLogo';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import type { ContentAnalysisType, NewPlansInput, Plan, PlanFormat, PlanGoal, PlanUpdate, Platform } from '@/types/api';

import { formatDay, formatTime, todayIn, type LocalDate, type LocalTime } from '../dates';
import { IDEA_LIMIT, TITLE_LIMIT } from '../ideaPrefill';
import { defaultChecklist, FORMAT_LABEL, GOALS, PLAN_FORMATS } from '../planRules';
import { ChecklistEditor, type DraftChecklistItem } from './ChecklistEditor';
import { Chips, SectionLabel } from './Chips';
import { ReminderPicker } from './ReminderPicker';
import { ScheduleSheet } from './ScheduleSheet';

export interface PlanSource {
  mediaId: string;
  analysisType: ContentAnalysisType;
  recommendationIndex: number;
  recommendationText: string;
  platform?: Platform;
}

interface Target {
  platform: Platform;
  format: PlanFormat;
  date: LocalDate | null;
  time: LocalTime | null;
  caption: string;
  reminders: number[];
  checklist: DraftChecklistItem[];
  /** The user changed the checklist, so a format change keeps it. */
  checklistEdited: boolean;
}

/** One line of body text plus the field's vertical padding (TextField's py-md). */
const TITLE_MIN_HEIGHT = 48;

const newTarget = (platform: Platform, format?: PlanFormat | null, date: LocalDate | null = null, time: LocalTime | null = null): Target => {
  const f = format && PLAN_FORMATS[platform].includes(format) ? format : PLAN_FORMATS[platform][0];
  return { platform, format: f, date, time, caption: '', reminders: [], checklist: defaultChecklist(f).map((label) => ({ label, done: false })), checklistEdited: false };
};

function Card({ children }: { children: React.ReactNode }) {
  return <View className="mb-lg rounded-2xl border border-neutral-200 bg-white p-lg" style={elevation.card}>{children}</View>;
}

function WhenButton({ date, time, today, onPress }: { date: LocalDate | null; time: LocalTime | null; today: LocalDate; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={date && time ? `Date and time: ${formatDay(date, today)} at ${formatTime(time)}. Change` : 'Pick a date and time'}
      className="mb-md min-h-12 flex-row items-center rounded-lg border border-neutral-200 px-md active:bg-neutral-50">
      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
      <Text className={`ml-sm flex-1 text-body ${date && time ? 'text-navy' : 'text-neutral-400'}`}>{date && time ? `${formatDay(date, today)} · ${formatTime(time)}` : 'Pick date and time'}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral400} />
    </Pressable>
  );
}

/**
 * Create one idea for one or more platforms, or edit one plan. Dates and times come from pickers; formats from the
 * platform's list. Saving with dates makes "planned" posts; without any date it saves an idea.
 */
export function PlanForm(props: (
  | { mode: 'create'; initial: { title?: string; description?: string; descriptionTruncated?: boolean; platform?: Platform; format?: PlanFormat | null; date?: LocalDate | null; time?: LocalTime | null }; source?: PlanSource; onSubmit: (input: NewPlansInput) => Promise<void> }
  | { mode: 'edit'; plan: Plan; onSubmit: (patch: PlanUpdate) => Promise<void> }
) & { timezone: string; connectedPlatforms: Platform[] }) {
  const { timezone, connectedPlatforms } = props;
  const today = todayIn(timezone);
  const plan = props.mode === 'edit' ? props.plan : null;
  const planTz = plan?.timezone ?? timezone;

  const [title, setTitle] = useState(plan?.title ?? (props.mode === 'create' ? props.initial.title ?? '' : ''));
  const [titleHeight, setTitleHeight] = useState(TITLE_MIN_HEIGHT);
  const [description, setDescription] = useState(plan?.description ?? (props.mode === 'create' ? props.initial.description ?? '' : ''));
  const ideaTruncated = props.mode === 'create' && Boolean(props.initial.descriptionTruncated);
  const [caption, setCaption] = useState(plan?.caption ?? '');
  const [cta, setCta] = useState(plan?.cta ?? '');
  const [referenceUrl, setReferenceUrl] = useState(plan?.referenceUrl ?? '');
  const [notes, setNotes] = useState(plan?.notes ?? '');
  const [goal, setGoal] = useState<PlanGoal | null>(plan?.goal ?? null);
  const [more, setMore] = useState(Boolean(plan && (plan.cta || plan.referenceUrl || plan.notes || plan.goal)));
  const [targets, setTargets] = useState<Target[]>(() => {
    if (plan) {
      return [{
        platform: plan.platform, format: plan.format ?? PLAN_FORMATS[plan.platform][0], date: plan.localDate, time: plan.localTime, caption: '', reminders: plan.reminders,
        checklist: plan.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done })), checklistEdited: true,
      }];
    }
    const init = props.mode === 'create' ? props.initial : {};
    const platform = init.platform ?? connectedPlatforms[0] ?? 'instagram';
    const date = init.date && init.date >= today ? init.date : null;
    return [newTarget(platform, init.format, date, date ? init.time ?? null : null)];
  });
  const [scheduling, setScheduling] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | 'plan' | 'draft'>(null);
  const scroll = useRef<ScrollView>(null);

  const update = (i: number, patch: Partial<Target>) => setTargets((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const togglePlatform = (p: Platform) => {
    if (plan) return;
    setTargets((ts) => {
      if (ts.some((t) => t.platform === p)) return ts.length > 1 ? ts.filter((t) => t.platform !== p) : ts;
      // A new platform starts at the same date and time as the first; it can be changed per platform.
      return [...ts, newTarget(p, null, ts[0]?.date ?? null, ts[0]?.time ?? null)];
    });
  };
  const setFormat = (i: number, format: PlanFormat) =>
    setTargets((ts) => ts.map((t, j) => (j !== i ? t : { ...t, format, checklist: t.checklistEdited ? t.checklist : defaultChecklist(format).map((label) => ({ label, done: false })) })));

  const dated = targets.filter((t) => t.date && t.time).length;
  const canDate = !plan || (plan.storedStatus !== 'idea' && plan.storedStatus !== 'published' && !plan.needsDate);
  const isIdea = plan ? plan.storedStatus === 'idea' : dated === 0;

  const fail = (m: string) => {
    setError(m);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const submit = async (asDraft: boolean) => {
    setError(null);
    if (!title.trim()) {
      setTitleError('Add a title.');
      return fail('Add a title for this content.');
    }
    setTitleError(null);
    if (referenceUrl.trim() && !/^https?:\/\/\S+$/i.test(referenceUrl.trim())) return fail('The reference link must start with http:// or https://.');
    if (!plan && !asDraft && dated > 0 && dated < targets.length) return fail('Pick a date and time for every platform, or save it as a draft.');
    setSaving(asDraft ? 'draft' : 'plan');
    try {
      if (props.mode === 'create') {
        await props.onSubmit({
          title: title.trim(), description: description.trim() || undefined, caption: caption.trim() || undefined, cta: cta.trim() || undefined,
          referenceUrl: referenceUrl.trim() || undefined, notes: notes.trim() || undefined, goal: goal ?? undefined,
          status: asDraft ? 'draft' : dated ? 'planned' : 'idea',
          timezone,
          targets: targets.map((t) => ({
            platform: t.platform, format: t.format,
            ...(t.date && t.time ? { localDate: t.date, localTime: t.time } : {}),
            ...(t.caption.trim() ? { caption: t.caption.trim() } : {}),
            reminders: t.reminders,
            checklist: t.checklist.map((c) => ({ label: c.label, done: c.done })),
          })),
          ...(props.source ? { source: { mediaId: props.source.mediaId, analysisType: props.source.analysisType, recommendationIndex: props.source.recommendationIndex } } : {}),
        });
      } else {
        const t = targets[0];
        const p = props.plan;
        const patch: PlanUpdate = {};
        if (title.trim() !== p.title) patch.title = title.trim();
        if (description.trim() !== p.description) patch.description = description.trim();
        if (caption.trim() !== p.caption) patch.caption = caption.trim();
        if (cta.trim() !== p.cta) patch.cta = cta.trim();
        if (referenceUrl.trim() !== p.referenceUrl) patch.referenceUrl = referenceUrl.trim();
        if (notes.trim() !== p.notes) patch.notes = notes.trim();
        if (goal !== p.goal) patch.goal = goal;
        if (t.format !== p.format) patch.format = t.format;
        if (JSON.stringify(t.reminders) !== JSON.stringify(p.reminders)) patch.reminders = t.reminders;
        if (JSON.stringify(t.checklist) !== JSON.stringify(p.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done })))) patch.checklist = t.checklist;
        if (canDate && t.date && t.time && (t.date !== p.localDate || t.time !== p.localTime)) Object.assign(patch, { localDate: t.date, localTime: t.time, timezone: planTz });
        if (!Object.keys(patch).length) {
          setSaving(null);
          return props.onSubmit({});
        }
        await props.onSubmit(patch);
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(null);
    }
  };

  const choosable = [...connectedPlatforms, ...PLATFORM_ORDER.filter((p) => !connectedPlatforms.includes(p))];
  const sheetTarget = scheduling !== null ? targets[scheduling] : null;

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerClassName="px-lg pb-3xl pt-md" keyboardShouldPersistTaps="handled">
        {error ? <Notice variant="error" message={error} /> : null}

        {props.mode === 'create' && props.source ? (
          <View className="mb-lg rounded-xl border border-violet-border bg-violet-light p-md">
            <View className="flex-row items-center">
              <Ionicons name="sparkles-outline" size={16} color={colors.violet} />
              <Text className="ml-xs text-label font-semibold text-violet">Why this idea?</Text>
            </View>
            <Text className="mt-xs text-[13px] leading-[19px] text-navy">{props.source.recommendationText}</Text>
            <Text className="mt-xs text-[12px] text-neutral-500">From the analysis of one of your posts. The plan keeps a link back to it.</Text>
          </View>
        ) : null}

        {/*
          Wraps and grows with its text instead of overflowing (the height follows the measured content, so it doesn't
          depend on a platform auto-sizing multiline inputs). Still one line of text: Return finishes, pasted line
          breaks become spaces.
        */}
        <TextField
          label="Title"
          value={title}
          onChangeText={(v) => setTitle(v.replace(/[\r\n]+/g, ' '))}
          maxLength={TITLE_LIMIT}
          placeholder="What will you post?"
          error={titleError}
          multiline
          scrollEnabled={false}
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          onContentSizeChange={(e) => setTitleHeight(Math.ceil(e.nativeEvent.contentSize.height))}
          style={{ height: Math.max(TITLE_MIN_HEIGHT, titleHeight), textAlignVertical: 'top' }}
        />
        <TextField
          label="Idea (optional)"
          value={description}
          onChangeText={setDescription}
          maxLength={IDEA_LIMIT}
          placeholder="The angle, hook or key message"
          multiline
          hint={ideaTruncated ? 'The recommendation was longer than 2,000 characters, so it was shortened here. The full text is under “Why this idea?”.' : undefined}
          style={{ minHeight: 72, textAlignVertical: 'top' }}
        />

        <SectionLabel>{plan ? 'Platform' : 'Platforms'}</SectionLabel>
        {plan ? (
          <View className="mb-lg flex-row items-center">
            <PlatformLogo platform={plan.platform} size={24} />
            <Text className="ml-sm text-label text-navy">{PLATFORM_META[plan.platform].name}</Text>
          </View>
        ) : (
          <View className="mb-md">
            <Chips multi wrap accessibilityLabel="Platforms" options={choosable} value={targets.map((t) => t.platform)} onChange={togglePlatform}
              label={(p) => `${PLATFORM_META[p].name}${connectedPlatforms.includes(p) ? '' : ' (not connected)'}`} />
            <Text className="-mt-xs text-[12px] text-neutral-500">Each platform gets its own plan with its own format, time and checklist.</Text>
          </View>
        )}

        {targets.map((t, i) => (
          <Card key={t.platform}>
            {targets.length > 1 || !plan ? (
              <View className="mb-md flex-row items-center">
                <PlatformLogo platform={t.platform} size={26} />
                <Text className="ml-sm flex-1 text-title text-navy">{PLATFORM_META[t.platform].name}</Text>
              </View>
            ) : null}
            <SectionLabel>Format</SectionLabel>
            <View className="mb-sm">
              <Chips wrap accessibilityLabel={`${PLATFORM_META[t.platform].name} format`} options={PLAN_FORMATS[t.platform]} value={t.format} label={(f) => FORMAT_LABEL[f]} onChange={(f) => setFormat(i, f)} />
            </View>

            <SectionLabel>When</SectionLabel>
            {canDate ? (
              <WhenButton date={t.date} time={t.time} today={today} onPress={() => setScheduling(i)} />
            ) : (
              <Text className="mb-md text-[13px] text-neutral-500">
                {plan?.storedStatus === 'published' ? 'Published posts keep their date.' : 'Pick a date from the plan screen (“Pick a date”).'}
              </Text>
            )}
            {!plan && t.date && t.time ? (
              <Pressable onPress={() => update(i, { date: null, time: null })} accessibilityRole="button" className="-mt-sm mb-md min-h-9 self-start justify-center">
                <Text className="text-[13px] font-semibold text-primary">Remove date (keep as idea)</Text>
              </Pressable>
            ) : null}

            {targets.length > 1 ? (
              <TextField label={`Caption for ${PLATFORM_META[t.platform].name} (optional)`} value={t.caption} onChangeText={(v) => update(i, { caption: v })} maxLength={5000} placeholder="Leave empty to use the shared caption" multiline />
            ) : null}

            <SectionLabel>Reminders</SectionLabel>
            <View className="mb-md">
              <ReminderPicker value={t.reminders} onChange={(r) => update(i, { reminders: r })} hasDate={Boolean(t.date && t.time) || Boolean(plan?.scheduledAt)} />
            </View>

            <SectionLabel>Preparation checklist</SectionLabel>
            <ChecklistEditor items={t.checklist} onChange={(c) => update(i, { checklist: c, checklistEdited: true })} />
          </Card>
        ))}

        <TextField label={targets.length > 1 ? 'Shared caption draft (optional)' : 'Caption draft (optional)'} value={caption} onChangeText={setCaption} maxLength={5000} placeholder="Write or paste your caption" multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />

        <Pressable onPress={() => setMore((m) => !m)} accessibilityRole="button" accessibilityState={{ expanded: more }} className="mb-md min-h-11 flex-row items-center">
          <Ionicons name={more ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.primary} />
          <Text className="ml-xs text-label font-semibold text-primary">More details: goal, CTA, link, notes</Text>
        </Pressable>
        {more ? (
          <>
            <SectionLabel>Goal</SectionLabel>
            <View className="mb-md">
              <Chips wrap accessibilityLabel="Goal" options={GOALS.map((g) => g.value)} value={goal} label={(g) => GOALS.find((x) => x.value === g)!.label} onChange={(g) => setGoal(goal === g ? null : g)} />
            </View>
            <TextField label="Call to action (optional)" value={cta} onChangeText={setCta} maxLength={300} placeholder="e.g. Save this for later" />
            <TextField label="Reference link (optional)" value={referenceUrl} onChangeText={setReferenceUrl} maxLength={1000} placeholder="https://" autoCapitalize="none" keyboardType="url" />
            <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={2000} multiline style={{ minHeight: 72, textAlignVertical: 'top' }} />
          </>
        ) : null}

        <Text className="mb-md text-[12px] text-neutral-500">{`Times are in ${planTz}. Media Navigator doesn’t publish for you; you post it on the platform.`}</Text>
        <Button
          title={props.mode === 'edit' ? 'Save changes' : isIdea ? 'Save as idea' : targets.length > 1 ? `Save ${targets.length} plans` : 'Save plan'}
          onPress={() => void submit(false)}
          loading={saving === 'plan'}
          disabled={saving !== null}
        />
        {props.mode === 'create' && !isIdea ? (
          <View className="mt-sm">
            <Button title="Save as draft" variant="secondary" onPress={() => void submit(true)} loading={saving === 'draft'} disabled={saving !== null} />
          </View>
        ) : null}
      </ScrollView>

      {sheetTarget && scheduling !== null ? (
        <ScheduleSheet
          title={`When to post on ${PLATFORM_META[sheetTarget.platform].name}`}
          platform={sheetTarget.platform}
          format={sheetTarget.format}
          timezone={planTz}
          initialDate={sheetTarget.date}
          initialTime={sheetTarget.time}
          saving={false}
          error={null}
          onSave={(date, time) => {
            update(scheduling, { date, time });
            setScheduling(null);
          }}
          onClose={() => setScheduling(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
