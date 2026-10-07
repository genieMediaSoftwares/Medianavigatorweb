import React, { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  Sparkles, 
  Clock, 
  ThumbsUp, 
  ThumbsDown,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useAdmin } from '../../app/providers/AdminContext';
import { AdminTrendItem, TrendStatus } from './types';

export const AdminTrendManagement: React.FC = () => {
  const { trends, reviewTrend, currentRole } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TrendStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTrend, setSelectedTrend] = useState<AdminTrendItem | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');

  const filteredTrends = trends.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const handleReviewAction = (trendId: string, status: TrendStatus) => {
    reviewTrend(trendId, status, reviewNoteInput);
    if (selectedTrend?.id === trendId) {
      setSelectedTrend(prev => prev ? { ...prev, status, reviewNotes: reviewNoteInput || prev.reviewNotes } : null);
    }
    setReviewNoteInput('');
  };

  const isReadOnly = currentRole === 'read_only' || currentRole === 'support' || currentRole === 'finance';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight">
            Trend Quality & Moderation (Core Workflow 3)
          </h2>
          <p className="text-xs text-stone-500">
            Review algorithmic trends detected across Instagram Reels & YouTube Shorts. Approve, reject, or flag patterns before client publishing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 font-medium shadow-xs">
            {trends.filter(t => t.status === 'pending_review').length} Awaiting Review
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search trend patterns, hooks, or audio shifts..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Moderation Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved & Published</option>
            <option value="flagged">Flagged / Suppressed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Categories</option>
            <option value="Hook Pattern">Hook Pattern</option>
            <option value="Format Velocity">Format Velocity</option>
            <option value="Audio / Sound">Audio / Sound</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Trends List & Review Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`p-5 rounded-2xl bg-white border border-stone-200 shadow-xs ${selectedTrend ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-xs">
                  <th className="pb-3">Trend Pattern & Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Confidence & Volume</th>
                  <th className="pb-3">Source Freshness</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTrends.map((trend) => (
                  <tr 
                    key={trend.id}
                    onClick={() => {
                      setSelectedTrend(trend);
                      setReviewNoteInput(trend.reviewNotes || '');
                    }}
                    className={`hover:bg-stone-50/70 cursor-pointer transition-colors ${
                      selectedTrend?.id === trend.id ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3">
                      <div className="font-bold text-ink">{trend.title}</div>
                      <div className="text-xs text-stone-400">
                        Platform: <strong className="uppercase">{trend.platform}</strong> • By: {trend.submittedBy}
                      </div>
                    </td>

                    <td className="py-3">
                      <span className="font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded text-xs">
                        {trend.category}
                      </span>
                    </td>

                    <td className="py-3">
                      <div className="font-bold text-brand-600">{trend.confidenceScore}% Score</div>
                      <div className="text-xs text-stone-400">{trend.sampleVolume.toLocaleString()} samples</div>
                    </td>

                    <td className="py-3 text-xs text-stone-600">
                      {trend.sourceFreshness}
                    </td>

                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        trend.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        trend.status === 'flagged' ? 'bg-rose-100 text-rose-800' :
                        trend.status === 'rejected' ? 'bg-stone-100 text-stone-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {trend.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleReviewAction(trend.id, 'approved')}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                            title="Approve Trend"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReviewAction(trend.id, 'flagged')}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="Flag Negative Trend"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredTrends.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500">
                      <TrendingUp className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <div className="text-xs font-bold text-stone-700">No Algorithmic Trends Pending Review</div>
                      <div className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                        0 trends pending. Once content is synchronized from connected channels, statistical format velocity and retention hooks will appear here for review.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Trend Inspector (Workflow 3: Review a Trend) */}
        {selectedTrend && (
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-md space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">
                  Trend Verification & Quality Inspection
                </span>
                <h3 className="text-base font-bold text-ink">{selectedTrend.title}</h3>
                <div className="text-xs text-stone-500">Category: {selectedTrend.category}</div>
              </div>
              <button 
                onClick={() => setSelectedTrend(null)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 space-y-1">
                <span className="text-stone-400 text-xs uppercase font-bold tracking-wider">Recommended Strategy</span>
                <p className="text-stone-800 font-medium leading-relaxed">{selectedTrend.recommendedAction}</p>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Confidence & Statistical Power</span>
                <span className="font-bold text-brand-600">{selectedTrend.confidenceScore}% ({selectedTrend.sampleVolume.toLocaleString()} samples)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Source Freshness</span>
                <span className="font-bold text-stone-800">{selectedTrend.sourceFreshness}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Moderation Status</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-xs ${
                  selectedTrend.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  selectedTrend.status === 'flagged' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {selectedTrend.status}
                </span>
              </div>
            </div>

            {/* Internal Review Notes Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Internal Editorial / Audit Notes
              </label>
              <textarea
                value={reviewNoteInput}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                placeholder="Add audit rationale, algorithmic observations, or rollout restrictions..."
                rows={3}
                disabled={isReadOnly}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600"
              />
            </div>

            {/* Moderation Actions */}
            {!isReadOnly && (
              <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReviewAction(selectedTrend.id, 'approved')}
                  className="py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReviewAction(selectedTrend.id, 'flagged')}
                  className="py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Flag Spam
                </button>
                <button
                  onClick={() => handleReviewAction(selectedTrend.id, 'rejected')}
                  className="py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
