export const OVERVIEW_SECTIONS = ['message', 'visual', 'caption', 'structure', 'audio', 'details', 'alignment', 'cta'] as const;
export type OverviewSectionKey = typeof OVERVIEW_SECTIONS[number];
export const OVERVIEW_LABELS: Record<OverviewSectionKey, string> = { message: 'Message & purpose', visual: 'Visual & production quality', caption: 'Caption & copy', structure: 'Story & progression', audio: 'Audio & delivery', details: 'Offer & information', alignment: 'Caption & creative alignment', cta: 'Call to action' };
export interface OverviewSection { key: OverviewSectionKey; title: string; assessment: string; status: 'strong' | 'good' | 'needs_attention'; evidenceIds: string[] }
export interface OverviewFact { label: string; value: string; quote: string; evidenceId: string }
export interface OverviewMetric { key: string; label: string; value: number; unit: 'count' | 'percent' | 'minutes'; basis: 'measured' | 'calculated' }
export interface DeepOverview { headline: string; introduction: string; verdict: string; evidenceIds: string[]; sections: OverviewSection[]; facts: OverviewFact[]; metrics: { syncedAt: string; items: OverviewMetric[] } }
