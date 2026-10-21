export type CreativeRating = 'very_strong' | 'strong' | 'good' | 'needs_work' | 'not_observable';
export interface CreativeReport {
  mediaId: string;
  type: 'why_top' | 'why_bottom';
  result: {
    summary: string;
    points: { number: number; title: string; finding: string; rating: CreativeRating; evidence: { source: 'video_frame' | 'audio' | 'on_screen_text' | 'image' | 'caption'; timestamp: string | null; description: string }[] }[];
    recommendations: string[];
    limitations: string[];
  };
  mediaBasis: string;
  analyzedAt: string;
  fromCache: boolean;
  refreshError?: string;
}
