import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { colors } from '@/constants/colors';

export interface DraftChecklistItem {
  id?: string;
  label: string;
  done: boolean;
}

/** Tick, rename, add and remove preparation steps. `onChange` receives the whole list. */
export function ChecklistEditor({ items, onChange, editable = true }: { items: DraftChecklistItem[]; onChange: (items: DraftChecklistItem[]) => void; editable?: boolean }) {
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const done = items.filter((i) => i.done).length;

  const commitEdit = () => {
    if (editing === null) return;
    const label = draft.trim();
    onChange(label ? items.map((it, i) => (i === editing ? { ...it, label } : it)) : items.filter((_, i) => i !== editing));
    setEditing(null);
  };
  const add = () => {
    const label = adding.trim();
    if (!label) return;
    onChange([...items, { label, done: false }]);
    setAdding('');
  };

  return (
    <View>
      <Text className="mb-sm text-[12px] text-neutral-500" accessibilityLiveRegion="polite">
        {items.length ? `${done} of ${items.length} done` : 'No steps yet'}
      </Text>
      {items.map((item, i) => (
        <View key={item.id ?? `new-${i}`} className="flex-row items-center border-b border-neutral-100">
          <Pressable
            onPress={() => onChange(items.map((it, j) => (j === i ? { ...it, done: !it.done } : it)))}
            accessibilityRole="checkbox"
            disabled={!editable}
            accessibilityState={{ checked: item.done, disabled: !editable }}
            accessibilityLabel={item.label}
            className="min-h-11 flex-1 flex-row items-center py-xs"
          >
            <Ionicons name={item.done ? 'checkbox' : 'square-outline'} size={22} color={item.done ? colors.success : colors.neutral400} />
            {editing === i ? (
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
                maxLength={120}
                accessibilityLabel="Step name"
                className="ml-sm flex-1 rounded-md border border-primary px-sm py-xs text-label text-navy"
              />
            ) : (
              <Text className={`ml-sm flex-1 text-label ${item.done ? 'text-neutral-500 line-through' : 'text-navy'}`}>{item.label}</Text>
            )}
          </Pressable>
          {editable && editing !== i ? (
            <>
              <IconButton icon="pencil-outline" accessibilityLabel={`Rename ${item.label}`} color={colors.neutral500} onPress={() => { setEditing(i); setDraft(item.label); }} />
              <IconButton icon="close" accessibilityLabel={`Remove ${item.label}`} color={colors.neutral500} onPress={() => onChange(items.filter((_, j) => j !== i))} />
            </>
          ) : null}
        </View>
      ))}
      {editable && items.length < 20 ? (
        <View className="mt-sm flex-row items-center">
          <TextInput
            value={adding}
            onChangeText={setAdding}
            onSubmitEditing={add}
            placeholder="Add a step"
            placeholderTextColor={colors.placeholder}
            maxLength={120}
            accessibilityLabel="New checklist step"
            className="min-h-11 flex-1 rounded-lg border border-neutral-200 px-md text-label text-navy"
          />
          <IconButton icon="add-circle" accessibilityLabel="Add step" color={colors.primary} onPress={add} />
        </View>
      ) : null}
    </View>
  );
}
