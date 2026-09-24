import React from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Instagram, 
  Youtube, 
  Facebook, 
  Linkedin,
  Lock,
  ChevronRight
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useMedia } from '../context/MediaContext';

export const Landing: React.FC = () => {
  const { setAppView } = useMedia();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#0284C7]/20">
      {/* Top Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <span className="hidden sm:inline-block text-xs font-semibold text-[#0284C7] uppercase tracking-wider pl-2 border-l border-[#E2E8F0]">
              Intelligence Platform
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <a href="#features" className="hover:text-[#0284C7] transition-colors">Features</a>
            <a href="#platforms" className="hover:text-[#0284C7] transition-colors">Integrations</a>
            <a href="#security" className="hover:text-[#0284C7] transition-colors">Security & Privacy</a>
            <a href="#faq" className="hover:text-[#0284C7] transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppView('signin')}
              className="px-4 py-2 text-sm font-medium text-[#0F172A] hover:text-[#0284C7] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setAppView('signup')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#0B132B] text-white hover:bg-[#1C2541] transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Subtle accent background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#0284C7]/10 via-[#06B6D4]/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Clean kicker - No pill enclosure */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
              <span>Official Meta & Google Partner APIs</span>
              <span aria-hidden="true">·</span>
              <span>Full Archive Ingestion</span>
              <span aria-hidden="true">·</span>
              <span>Zero Truncation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B132B] tracking-tight leading-tight">
              Turn Your Social Media Data Into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0284C7] to-[#06B6D4]">
                Smarter Growth.
              </span>
            </h1>

            <p className="text-lg text-[#475569] leading-relaxed">
              Media Navigator connects your Instagram, YouTube, Facebook, and LinkedIn profiles to ingest your complete content history. Uncover winning patterns, diagnose underperformers, and get grounded, data-backed growth intelligence.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setAppView('signup')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#0B132B] text-white hover:bg-[#1C2541] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Start Free Workspace</span>
                <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
              </button>

              <button
                onClick={() => setAppView('app')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-medium bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <span>Live Interactive Demo</span>
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            {/* Trust and privacy messaging */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Read-Only Access Only
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#0284C7]" />
                Zero Token or Credential Storage
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0284C7]" />
                100% Verified Official APIs
              </span>
            </div>
          </div>

          {/* Interactive Dashboard Preview */}
          <div className="mt-14 relative max-w-5xl mx-auto">
            <div className="rounded-2xl bg-white border border-[#CBD5E1] shadow-2xl overflow-hidden">
              {/* Mock Window Header */}
              <div className="px-5 py-3.5 bg-[#0B132B] text-white flex items-center justify-between border-b border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-mono text-slate-300">
                    app.medianavigator.io / workspace / intelligence
                  </span>
                </div>
                <div className="text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Active Ingestion: All Posts & Reels Synchronized
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-6 md:p-8 bg-[#F8FAFC] space-y-6">
                {/* 4 Metric Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Total Analyzed
                    </div>
                    <div className="text-2xl font-extrabold text-[#0B132B]">
                      1,482 Assets
                    </div>
                    <div className="text-xs text-[#0284C7] font-medium">
                      Zero Pagination Limit
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Aggregate Views
                    </div>
                    <div className="text-2xl font-extrabold text-[#0B132B]">
                      2,489,120
                    </div>
                    <div className="text-xs text-emerald-600 font-medium">
                      +28.4% vs baseline
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Top Format
                    </div>
                    <div className="text-2xl font-extrabold text-[#0284C7]">
                      Reels (4.9%)
                    </div>
                    <div className="text-xs text-[#64748B]">
                      2.4x higher comment depth
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Hook Question Lift
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-600">
                      +3.8%
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Measured retention impact
                    </div>
                  </div>
                </div>

                {/* Split comparison preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                        Top Performer Analysis
                      </span>
                      <span className="text-xs font-mono text-emerald-600 font-bold">5.8% Eng</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0B132B]">
                      "How We Replaced 5 Tool Subscriptions With Unified Intelligence"
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Audience retained through 84% of video length. Contributing factors: high-curiosity problem hook in opening 3 seconds, specific numerical contrast, and clear comment call-to-action.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        Underperformer Diagnostic
                      </span>
                      <span className="text-xs font-mono text-amber-600 font-bold">1.2% Eng</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0B132B]">
                      "Q3 Product Updates and Routine Release Notes"
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Reach fell below historical baseline. Contributing factors: passive title structure, lack of direct viewer benefit in hook, and published outside peak activity window. Recommended experiment: repurpose as a 5-slide carousel with visual takeaways.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms Section */}
      <section id="platforms" className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
              Certified Integrations
            </h2>
            <p className="text-xl font-bold text-[#0B132B]">
              Direct Official Connections to Your Core Channels
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-center hover:border-[#0284C7]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <Instagram className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B132B]">Instagram</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Reels, Carousels, and Posts. Analyzes plays, saves, shares, and real audience retention.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-center hover:border-[#0284C7]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <Youtube className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B132B]">YouTube</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Shorts and Long-form Videos. Ingests full channel uploads, watch time, and click-through rates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-center hover:border-[#0284C7]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <Facebook className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B132B]">Facebook</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Page Posts and Video distribution. Measures organic reach, impressions, and viral sharing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-center hover:border-[#0284C7]/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sky-700 text-white flex items-center justify-center mx-auto shadow-sm">
                <Linkedin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B132B]">LinkedIn</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Company and Professional creator feeds. Evaluates document carousels, text hooks, and engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Pillars */}
      <section id="features" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
              Engineered for Real Growth
            </h2>
            <p className="text-3xl font-extrabold text-[#0B132B] tracking-tight">
              Beyond Basic Vanity Counters: Actionable Growth Science
            </p>
            <p className="text-sm text-[#475569]">
              Media Navigator doesn't just display likes and views. It explains why content performs, identifies repeatable formulas, and pinpoints your optimal publishing timing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B132B]">Top & Bottom Performer Diagnostics</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Examine your highest performing assets alongside underperformers. Media Navigator isolates opening hooks, formats, and topics to deliver concrete recommendations.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B132B]">Posting Strategy & Hourly Heatmaps</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Discover exact publishing windows when your specific audience is active and receptive. Color-graded heatmaps backed by sample sizes and historical data.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0B132B]">AI Niche Trends & Content Ideation</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Discover verified trend signals tailored to your specific niche. Generates tailored video concepts, opening hooks, and ready-to-test format blueprints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-[#0B132B] text-white py-16 border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <BrandLogo />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white max-w-xl mx-auto">
            Ready to upgrade from basic analytics to intelligent social growth?
          </h2>
          <div className="pt-2 flex justify-center gap-4">
            <button
              onClick={() => setAppView('signup')}
              className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0284C7] to-[#06B6D4] text-white hover:opacity-90 transition-opacity shadow-md"
            >
              Get Started Now
            </button>
            <button
              onClick={() => setAppView('signin')}
              className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/15 transition-colors"
            >
              Sign In to Workspace
            </button>
          </div>
          <div className="pt-8 text-xs text-slate-400 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Media Navigator. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Official API Status</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
