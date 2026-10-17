import type { CreativeRating } from './creative-report';

export interface DeepReport {
  mediaId: string;
  mediaBasis: string;
  analyzedAt: string;
  fromCache: boolean;
  refreshError?: string;
  assets: { id: string; label: string; kind: 'image' | 'video' | 'text'; durationSeconds: number | null }[];
  result: {
    summary: string;
    sections: {
      number: number;
      title: string;
      rating: CreativeRating;
      finding: string;
      evidence: { source: 'video_frame' | 'audio' | 'on_screen_text' | 'image' | 'caption'; assetId: string | null; timestamp: number | null; description: string }[];
      impact: string;
      action: string;
      tips: string[];
    }[];
    timeline: { assetId: string; startSeconds: number | null; endSeconds: number | null; observation: string; rating: CreativeRating; action: string }[];
    takeaways: string[];
    limitations: string[];
  };
}
