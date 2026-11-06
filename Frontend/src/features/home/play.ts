export const VIBES = [
  { id: 'chill', emoji: '😌', label: 'Chill', message: 'Taking it easy is a vibe too.', background: '#EAF6FF' },
  { id: 'energetic', emoji: '⚡', label: 'Energetic', message: 'Your imaginary theme song just got louder!', background: '#FFF6DB' },
  { id: 'curious', emoji: '🧐', label: 'Curious', message: 'If you could ask your future self one question, what would it be?', background: '#F2EDFF' },
  { id: 'playful', emoji: '😄', label: 'Playful', message: 'Give today a ridiculous movie title.', background: '#EAFBF1' },
] as const;
export type VibeId = typeof VIBES[number]['id'];
export type DailyVibe = { date: string; id: VibeId };
export const CHALLENGES = [
  { prompt: 'Describe your day using only 3 emojis.', kind: 'emoji' },
  { prompt: 'Give yourself a funny superhero name.', kind: 'text' },
  { prompt: 'Name three things that make you smile.', kind: 'text' },
  { prompt: 'Invent a new flavour of ice cream.', kind: 'text' },
  { prompt: 'Give today a ridiculous movie title.', kind: 'text' },
  { prompt: 'Invent a name for a very sleepy dragon.', kind: 'text' },
] as const;
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
export function readDailyVibe(raw: string | null, today = localDay()): DailyVibe | null {
  try {
    const parsed = JSON.parse(raw ?? 'null');
    return parsed && parsed.date === today && VIBES.some((v) => v.id === parsed.id)
      ? { date: parsed.date, id: parsed.id } : null;
  } catch { return null; }
}
export function nextChallenge(previous: number | null, random = Math.random): number {
  const choices = CHALLENGES.map((_, index) => index).filter((index) => index !== previous);
  return choices[Math.floor(random() * choices.length)];
}
