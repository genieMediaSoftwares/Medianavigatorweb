import React from 'react';
import { Eye, Heart, MessageCircle, ArrowUpRight, Sparkles, TrendingUp, TriangleAlert } from 'lucide-react';
import { NormalizedMedia } from '../../types';
import { Thumb, compact, platformName, typeLabel } from './index';

export const PostCard: React.FC<{
  item: NormalizedMedia;
  tag?: 'top' | 'low';
  onDetails: () => void;
  onAnalyze: () => void;
}> = ({ item, tag, onDetails, onAnalyze }) => (
  <article className="card card-interactive overflow-hidden flex flex-col">
    <button onClick={onDetails} className="relative block text-left" aria-label={`Open details for ${item.title}`}>
      <Thumb src={item.thumbnailUrl} platform={item.platform} type={item.contentType} title={item.title} className="aspect-[16/10]" />
      <span className="absolute left-3 top-3 flex gap-1.5">
        <span className="badge bg-white/95 text-ink border-line backdrop-blur">{platformName(item.platform)}</span>
        <span className="badge bg-white/95 text-ink border-line backdrop-blur">{typeLabel(item.contentType)}</span>
      </span>
      {tag && (
        <span className={`absolute right-3 top-3 badge ${tag === 'top' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-500'}`}>
          {tag === 'top' ? <TrendingUp className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
          {tag === 'top' ? 'Top' : 'Below usual'}
        </span>
      )}
    </button>
    <div className="p-4 flex-1 flex flex-col">
      <h3 className="font-semibold text-ink leading-snug line-clamp-2">{item.title}</h3>
      <p className="mt-1 text-xs text-muted">{new Date(item.publishedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div><dt className="sr-only">Views</dt><dd className="flex flex-col items-center"><Eye className="w-4 h-4 text-muted" /><span className="mt-1 text-sm font-bold tabular">{compact(item.views)}</span></dd></div>
        <div><dt className="sr-only">Likes</dt><dd className="flex flex-col items-center"><Heart className="w-4 h-4 text-muted" /><span className="mt-1 text-sm font-bold tabular">{compact(item.likes)}</span></dd></div>
        <div><dt className="sr-only">Comments</dt><dd className="flex flex-col items-center"><MessageCircle className="w-4 h-4 text-muted" /><span className="mt-1 text-sm font-bold tabular">{compact(item.comments)}</span></dd></div>
        <div><dt className="sr-only">Engagement rate</dt><dd className="flex flex-col items-center"><span className="text-xs font-semibold text-muted leading-4">Eng.</span><span className="mt-1 text-sm font-bold tabular text-brand-700">{item.engagementRate.toFixed(1)}%</span></dd></div>
      </dl>
      <div className="mt-4 pt-4 border-t border-line flex gap-2">
        <button onClick={onAnalyze} className="btn btn-secondary btn-sm flex-1"><Sparkles className="w-4 h-4 text-brand-600" />Why it performed</button>
        <button onClick={onDetails} className="btn btn-ghost btn-sm" aria-label="Details"><ArrowUpRight className="w-4 h-4" /></button>
      </div>
    </div>
  </article>
);
