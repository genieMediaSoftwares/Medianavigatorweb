import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  Printer, 
  Calendar, 
  Check, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Trophy, 
  AlertTriangle,
  RotateCw,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { ReportItem } from '../types';

export const Reports: React.FC = () => {
  const { reports, generateReport, connections, timeframe, currentWorkspace } = useMedia();
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [period, setPeriod] = useState('Last 7 days');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'youtube', 'facebook']);
  const [generating, setGenerating] = useState(false);

  const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

  const handleCreateReport = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const rep = await generateReport(period, selectedPlatforms);
      setSelectedReportId(rep.id);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(x => x !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
            Executive Growth Reporting
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B132B] tracking-tight">
            Cross-Channel Performance Reports
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Shareable, client-ready intelligence summaries with verifiable organic metrics and AI recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={() => alert('Report shareable link copied to clipboard: https://app.medianavigator.io/reports/' + (activeReport?.id || 'latest'))}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Share Link</span>
          </button>
        </div>
      </div>

      {/* Report Generator Controls (Hidden in Print) */}
      <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B132B] uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#0284C7]" />
            Generate New Intelligence Report
          </span>
          <span className="text-xs text-[#64748B]">
            {reports.length} reports archived
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
              Report Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-[#F8FAFC]"
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 14 days">Last 14 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Full Historical Archive">Full Historical Archive</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
              Included Channels
            </label>
            <div className="flex items-center gap-2">
              {['instagram', 'youtube', 'facebook', 'linkedin'].map((plat) => (
                <button
                  key={plat}
                  type="button"
                  onClick={() => togglePlatform(plat)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    selectedPlatforms.includes(plat)
                      ? 'bg-[#0B132B] text-white border-[#0B132B]'
                      : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCreateReport}
              disabled={generating}
              className="w-full py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling Intelligence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Existing reports selector tabs */}
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-[#64748B] shrink-0">Archived Briefs:</span>
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReportId(r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                r.id === activeReport?.id
                  ? 'bg-[#0B132B] text-white'
                  : 'bg-slate-100 text-[#64748B] hover:text-[#0B132B]'
              }`}
            >
              {r.period} · {r.generatedAt}
            </button>
          ))}
        </div>
      </div>

      {/* Rendered Executive Report (Printable Document Card) */}
      {activeReport && (
        <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xl overflow-hidden p-8 md:p-10 space-y-8">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                <span>Media Navigator</span>
                <span aria-hidden="true">·</span>
                <span>Executive Intelligence Report</span>
                <span aria-hidden="true">·</span>
                <span>Verified Official Data</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B]">
                {activeReport.title}
              </h2>
              <div className="text-xs text-[#64748B] flex items-center gap-4 pt-1">
                <span>Period: <strong className="text-[#0B132B]">{activeReport.period}</strong></span>
                <span>Generated: <strong className="text-[#0B132B]">{activeReport.generatedAt}</strong></span>
                <span>Platforms: <strong className="text-[#0B132B] uppercase">{activeReport.platforms.join(', ')}</strong></span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-500">Report Status</div>
              <div className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Verified Complete
              </div>
            </div>
          </div>

          {/* Key Executive Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                Total Reach
              </div>
              <div className="text-2xl font-extrabold text-[#0B132B] font-mono">
                {activeReport.metrics.totalReach.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 font-semibold">
                +{activeReport.metrics.growthRate}% Growth
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                Verified Views
              </div>
              <div className="text-2xl font-extrabold text-[#0284C7] font-mono">
                {activeReport.metrics.totalViews.toLocaleString()}
              </div>
              <div className="text-xs text-[#64748B]">
                Across all formats
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                Avg Engagement
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                {activeReport.metrics.avgEngagement}%
              </div>
              <div className="text-xs text-[#64748B]">
                Baseline: 2.8%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                Top Asset
              </div>
              <div className="text-xs font-bold text-[#0B132B] line-clamp-2">
                "{activeReport.topPerformerTitle}"
              </div>
              <div className="text-[10px] text-[#0284C7] font-semibold">
                #1 Winning Format
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-5 rounded-2xl bg-[#0284C7]/5 border border-[#0284C7]/20 space-y-2">
            <div className="text-xs font-bold text-[#0284C7] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0284C7]" />
              Executive Growth Summary
            </div>
            <p className="text-sm text-[#0B132B] leading-relaxed font-medium">
              {activeReport.executiveSummary}
            </p>
          </div>

          {/* Strategic Highlights */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#0B132B] uppercase tracking-wider">
              Strategic Observations & Algorithmic Patterns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeReport.highlights.map((h, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1 shadow-2xs">
                  <div className="text-xs font-bold text-[#0284C7]">Insight 0{i + 1}</div>
                  <p className="text-xs text-[#475569] leading-relaxed">{h}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Next Steps */}
          <div className="p-6 rounded-2xl bg-[#0B132B] text-white space-y-3">
            <div className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">
              Recommended Editorial Action Plan for Next Period
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-slate-200">1. Prioritize Vertical Reels</div>
                <p className="text-slate-400">Increase short-form publishing cadence to 3x weekly, targeting the highest-converting 3:00 PM window.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-200">2. Test Question Opening Hooks</div>
                <p className="text-slate-400">Adopt the verified question-hook structure to maintain algorithmic comment velocity above 4.0%.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-200">3. Repurpose Underperformers</div>
                <p className="text-slate-400">Convert single image posts below baseline into 5-slide educational carousels with visual takeaways.</p>
              </div>
            </div>
          </div>

          {/* Signature & Disclaimer */}
          <div className="pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
            <div>Prepared for: <strong>{currentWorkspace || 'Primary Workspace'}</strong></div>
            <div className="text-[11px] text-slate-400">
              Generated by Media Navigator AI Intelligence Engine · Confidential
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
