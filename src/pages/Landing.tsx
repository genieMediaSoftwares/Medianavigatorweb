import React, { useState } from 'react';
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
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useMedia } from '../context/MediaContext';
import { 
  InstagramLogo, 
  YouTubeLogo, 
  FacebookLogo, 
  LinkedInLogo 
} from '../components/common/PlatformLogos';

export const Landing: React.FC = () => {
  const { setAppView } = useMedia();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#0284C7]/20 overflow-x-hidden">
      {/* Top Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <span className="hidden sm:inline-block text-xs font-semibold text-[#0284C7] uppercase tracking-wider pl-2 border-l border-[#E2E8F0]">
              Intelligence Platform
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <a href="#features" className="hover:text-[#0284C7] transition-colors">Features</a>
            <a href="#platforms" className="hover:text-[#0284C7] transition-colors">Integrations</a>
            <a href="#security" className="hover:text-[#0284C7] transition-colors">Security & Privacy</a>
            <a href="#faq" className="hover:text-[#0284C7] transition-colors">Architecture</a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setAppView('signin')}
              className="px-3.5 py-2 text-sm font-medium text-[#0F172A] hover:text-[#0284C7] transition-colors"
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

          {/* Mobile Menu & Quick CTA Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setAppView('signup')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B132B] text-white hover:bg-[#1C2541] transition-all shadow-xs"
            >
              Get Started
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#0B132B] hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-[#0B132B]">
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)} 
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Features
              </a>
              <a 
                href="#platforms" 
                onClick={() => setMobileMenuOpen(false)} 
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Integrations
              </a>
              <a 
                href="#security" 
                onClick={() => setMobileMenuOpen(false)} 
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Security & Privacy
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)} 
                className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Architecture
              </a>
            </nav>

            <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAppView('app');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-sky-50 text-[#0284C7] border border-sky-200 text-center"
              >
                Explore Live Demo
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAppView('signin')}
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-[#0F172A] border border-[#CBD5E1] hover:bg-slate-50 text-center"
              >
                Sign In to Workspace
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAppView('signup');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#0B132B] text-white hover:bg-[#1C2541] text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Start Free Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#06B6D4]" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white">
        {/* Animated Background Grid & Multi-Channel Glow Orbs */}
        <div className="absolute inset-0 bg-hero-grid [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_60%,transparent_100%)] pointer-events-none -z-10" />

        {/* Ambient Gradient Color Orbs for Social Channels */}
        <div className="absolute -top-16 -left-20 w-[320px] sm:w-[450px] h-[320px] sm:h-[450px] bg-gradient-to-tr from-rose-500/15 via-pink-400/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[340px] sm:w-[650px] h-[300px] sm:h-[380px] bg-gradient-to-tr from-[#0284C7]/15 via-[#06B6D4]/10 to-transparent blur-3xl rounded-full pointer-events-none -z-10 animate-pulse-glow [animation-delay:2.5s]" />
        <div className="absolute -top-16 -right-20 w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] bg-gradient-to-bl from-red-500/15 via-amber-400/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow [animation-delay:4s]" />
        <div className="absolute bottom-16 -left-10 w-[300px] sm:w-[380px] h-[300px] sm:h-[380px] bg-gradient-to-tr from-blue-600/10 via-sky-400/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow [animation-delay:1.5s]" />
        <div className="absolute bottom-20 -right-10 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-gradient-to-tl from-sky-500/10 via-cyan-400/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow [animation-delay:3.5s]" />

        {/* ========================================================================= */}
        {/* FLOATING SOCIAL MEDIA LOGOS & LIGHT GLASS CARDS (Hero Ambient Touch)      */}
        {/* ========================================================================= */}

        {/* 1. FLOATING INSTAGRAM CARD (Top Left - Desktop) */}
        <div 
          className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-rose-200/70 shadow-lg shadow-rose-500/5 absolute top-12 left-4 xl:left-12 z-20 animate-float-slow hover:scale-105 transition-all cursor-default group"
          title="Instagram Real-Time Signal Ingestion"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500/15 via-rose-500/20 to-purple-500/20 border border-rose-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:rotate-6 transition-transform">
            <InstagramLogo size="md" variant="light" />
          </div>
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0B132B] group-hover:text-rose-600 transition-colors">Instagram Reel</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] font-semibold text-emerald-600">+28.4% Retention</div>
            <div className="text-[9px] text-[#64748B] font-mono">Meta Graph v22.0</div>
          </div>
        </div>

        {/* 2. FLOATING YOUTUBE CARD (Top Right - Desktop) */}
        <div 
          className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-red-200/70 shadow-lg shadow-red-500/5 absolute top-12 right-4 xl:right-12 z-20 animate-float-medium hover:scale-105 transition-all cursor-default group"
          title="YouTube Shorts Channel Analytics"
        >
          <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:-rotate-6 transition-transform">
            <YouTubeLogo size="md" variant="light" />
          </div>
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0B132B] group-hover:text-red-600 transition-colors">YouTube Shorts</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] font-semibold text-[#0284C7]">142k Plays · 84% CTR</div>
            <div className="text-[9px] text-[#64748B] font-mono">Data API v3 Active</div>
          </div>
        </div>

        {/* 3. FLOATING FACEBOOK CARD (Mid/Bottom Left - Desktop) */}
        <div 
          className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-blue-200/70 shadow-lg shadow-blue-500/5 absolute bottom-28 left-6 xl:left-14 z-20 animate-float-reverse hover:scale-105 transition-all cursor-default group"
          title="Facebook Page Insights"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
            <FacebookLogo size="md" variant="light" />
          </div>
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0B132B] group-hover:text-blue-600 transition-colors">Facebook Page</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[11px] font-semibold text-blue-600">3.2x Viral Reshares</div>
            <div className="text-[9px] text-[#64748B] font-mono">Page Insights Ingest</div>
          </div>
        </div>

        {/* 4. FLOATING LINKEDIN CARD (Mid/Bottom Right - Desktop) */}
        <div 
          className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-sky-200/70 shadow-lg shadow-sky-500/5 absolute bottom-28 right-6 xl:right-14 z-20 animate-float-drift hover:scale-105 transition-all cursor-default group"
          title="LinkedIn Professional Feed Tracking"
        >
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-200/80 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
            <LinkedInLogo size="md" variant="light" />
          </div>
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0B132B] group-hover:text-sky-600 transition-colors">LinkedIn Feed</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-[11px] font-semibold text-[#0284C7]">B2B Decision Depth</div>
            <div className="text-[9px] text-[#64748B] font-mono">Community Ingestion</div>
          </div>
        </div>

        {/* RESPONSIVE MOBILE FLOATING PLATFORM PILLS (Visible on mobile and tablets) */}
        <div className="lg:hidden flex flex-wrap items-center justify-center gap-2 mb-4 px-3 relative z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-rose-200/80 shadow-xs backdrop-blur-md animate-float-slow">
            <InstagramLogo size="sm" variant="light" />
            <span className="text-[11px] font-bold text-[#0B132B]">Instagram</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-red-200/80 shadow-xs backdrop-blur-md animate-float-medium" style={{ animationDelay: '1.4s' }}>
            <YouTubeLogo size="sm" variant="light" />
            <span className="text-[11px] font-bold text-[#0B132B]">YouTube</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-blue-200/80 shadow-xs backdrop-blur-md animate-float-reverse" style={{ animationDelay: '0.8s' }}>
            <FacebookLogo size="sm" variant="light" />
            <span className="text-[11px] font-bold text-[#0B132B]">Facebook</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-sky-200/80 shadow-xs backdrop-blur-md animate-float-drift" style={{ animationDelay: '2.1s' }}>
            <LinkedInLogo size="sm" variant="light" />
            <span className="text-[11px] font-bold text-[#0B132B]">LinkedIn</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* SUBTLE FLOATING AMBIENT LOGO BUBBLES */}
        <div className="absolute top-8 left-1/4 -translate-x-12 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/80 border border-pink-200/60 shadow-xs backdrop-blur-xs animate-float-drift pointer-events-none opacity-80" style={{ animationDelay: '1.2s' }}>
          <InstagramLogo size="sm" variant="subtle" />
        </div>
        <div className="absolute top-10 right-1/4 translate-x-12 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/80 border border-red-200/60 shadow-xs backdrop-blur-xs animate-float-slow pointer-events-none opacity-80" style={{ animationDelay: '2.8s' }}>
          <YouTubeLogo size="sm" variant="subtle" />
        </div>
        <div className="absolute bottom-12 left-1/3 -translate-x-16 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/80 border border-blue-200/60 shadow-xs backdrop-blur-xs animate-float-medium pointer-events-none opacity-80" style={{ animationDelay: '3.4s' }}>
          <FacebookLogo size="sm" variant="subtle" />
        </div>
        <div className="absolute bottom-14 right-1/3 translate-x-16 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/80 border border-sky-200/60 shadow-xs backdrop-blur-xs animate-float-reverse pointer-events-none opacity-80" style={{ animationDelay: '0.8s' }}>
          <LinkedInLogo size="sm" variant="subtle" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {/* Clean kicker */}
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
              <span>Official Meta & Google APIs</span>
              <span aria-hidden="true">·</span>
              <span>Full Archive Ingestion</span>
              <span aria-hidden="true">·</span>
              <span>Zero Truncation</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B132B] tracking-tight leading-tight px-1">
              Turn Your Social Media Data Into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0284C7] to-[#06B6D4]">
                Smarter Growth.
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto px-2">
              Media Navigator connects your Instagram, YouTube, Facebook, and LinkedIn profiles to ingest your complete content history. Uncover winning patterns, diagnose underperformers, and get grounded, data-backed growth intelligence.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto w-full px-4 sm:px-0">
              <button
                onClick={() => setAppView('signup')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold bg-[#0B132B] text-white hover:bg-[#1C2541] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Free Workspace</span>
                <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
              </button>

              <button
                onClick={() => setAppView('app')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-medium bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Live Interactive Demo</span>
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            {/* Trust and privacy messaging */}
            <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                Read-Only Access Only
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7]" />
                Zero Token Storage
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7]" />
                100% Verified APIs
              </span>
            </div>

            {/* Light Platform Integration Ribbon */}
            <div className="pt-6 max-w-4xl mx-auto">
              <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-center mb-3 flex items-center justify-center gap-2">
                <span className="h-px w-6 sm:w-8 bg-[#E2E8F0]" />
                <span>Synchronized Cross-Platform Ingestion</span>
                <span className="h-px w-6 sm:w-8 bg-[#E2E8F0]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Instagram Light Card */}
                <div className="group p-2.5 sm:p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E2E8F0] hover:border-pink-300/70 shadow-xs hover:shadow-md transition-all flex items-center gap-2.5 sm:gap-3 backdrop-blur-xs">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-rose-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <InstagramLogo size="md" variant="light" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-[#0B132B] truncate group-hover:text-rose-600 transition-colors">Instagram</div>
                    <div className="text-[10px] text-[#64748B] truncate">Reels · Posts</div>
                  </div>
                </div>

                {/* YouTube Light Card */}
                <div className="group p-2.5 sm:p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E2E8F0] hover:border-red-300/70 shadow-xs hover:shadow-md transition-all flex items-center gap-2.5 sm:gap-3 backdrop-blur-xs">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 border border-red-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <YouTubeLogo size="md" variant="light" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-[#0B132B] truncate group-hover:text-red-600 transition-colors">YouTube</div>
                    <div className="text-[10px] text-[#64748B] truncate">Shorts · Retention</div>
                  </div>
                </div>

                {/* Facebook Light Card */}
                <div className="group p-2.5 sm:p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E2E8F0] hover:border-blue-300/70 shadow-xs hover:shadow-md transition-all flex items-center gap-2.5 sm:gap-3 backdrop-blur-xs">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <FacebookLogo size="md" variant="light" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-[#0B132B] truncate group-hover:text-blue-600 transition-colors">Facebook</div>
                    <div className="text-[10px] text-[#64748B] truncate">Pages · Shares</div>
                  </div>
                </div>

                {/* LinkedIn Light Card */}
                <div className="group p-2.5 sm:p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E2E8F0] hover:border-sky-300/70 shadow-xs hover:shadow-md transition-all flex items-center gap-2.5 sm:gap-3 backdrop-blur-xs">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <LinkedInLogo size="md" variant="light" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-[#0B132B] truncate group-hover:text-sky-600 transition-colors">LinkedIn</div>
                    <div className="text-[10px] text-[#64748B] truncate">Feeds · Depth</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Dashboard Preview with Ambient Floating Light Badges */}
          <div className="mt-14 relative max-w-5xl mx-auto">
            {/* Floating Light Badge: Instagram Reel */}
            <div className="hidden lg:flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg absolute -top-5 -left-5 z-20 animate-float-slow hover:scale-105 transition-transform">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-rose-200/60 flex items-center justify-center shrink-0">
                <InstagramLogo size="sm" variant="light" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                  <span>Instagram Reel</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">+4.9% Eng</span>
                </div>
                <div className="text-[10px] text-[#64748B]">Hook retention analyzed</div>
              </div>
            </div>

            {/* Floating Light Badge: YouTube Shorts */}
            <div className="hidden lg:flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg absolute -bottom-5 -right-5 z-20 animate-float-reverse hover:scale-105 transition-transform">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-200/60 flex items-center justify-center shrink-0">
                <YouTubeLogo size="sm" variant="light" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                  <span>YouTube Shorts</span>
                  <span className="text-[10px] font-semibold text-[#0284C7] bg-sky-50 border border-sky-200/60 px-1.5 py-0.5 rounded-md">142k Plays</span>
                </div>
                <div className="text-[10px] text-[#64748B]">Full channel ingest active</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-[#CBD5E1] shadow-2xl overflow-hidden">
              {/* Mock Window Header */}
              <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-[#0B132B] text-white flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 sm:ml-3 text-[11px] sm:text-xs font-mono text-slate-300 truncate max-w-[180px] sm:max-w-none">
                    app.medianavigator.io / intelligence
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Ingestion Live · 4 Channels Active</span>
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-3.5 sm:p-6 md:p-8 bg-[#F8FAFC] space-y-4 sm:space-y-6">
                {/* 4 Metric Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Total Analyzed
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-[#0B132B]">
                      1,482 Assets
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#0284C7] font-medium truncate">
                      Zero Pagination Limit
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Aggregate Views
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-[#0B132B]">
                      2,489,120
                    </div>
                    <div className="text-[11px] sm:text-xs text-emerald-600 font-medium truncate">
                      +28.4% vs baseline
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Top Format
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-[#0284C7]">
                      Reels (4.9%)
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#64748B] truncate">
                      2.4x higher comments
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-1">
                    <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Hook Question Lift
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-emerald-600">
                      +3.8%
                    </div>
                    <div className="text-[11px] sm:text-xs text-[#64748B] truncate">
                      Retention impact
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
      <section id="platforms" className="py-20 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
              Certified Integrations
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-[#0B132B] tracking-tight">
              Direct Official Connections to Your Core Channels
            </p>
            <p className="text-xs text-[#64748B] max-w-xl mx-auto">
              Media Navigator links with read-only scopes through Meta Graph API and Google Data API to analyze every post, reel, and video with verified metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Instagram Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-50/40 via-white to-white border border-[#E2E8F0] hover:border-pink-300/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-center group">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/10 via-rose-500/15 to-purple-500/15 border border-rose-200/60 text-white flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
                  <InstagramLogo size="lg" variant="light" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B132B] group-hover:text-rose-600 transition-colors">Instagram</h3>
                  <div className="text-[10px] font-semibold text-rose-600/80 uppercase tracking-wider mt-0.5">
                    Meta Graph API v22.0
                  </div>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Reels, Carousels, Stories, and Feeds. Ingests full archive, plays, saves, reach, and real audience retention.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#64748B]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Full Media Diagnostics</span>
              </div>
            </div>

            {/* YouTube Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-red-50/40 via-white to-white border border-[#E2E8F0] hover:border-red-300/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-center group">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-200/60 flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
                  <YouTubeLogo size="lg" variant="light" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B132B] group-hover:text-red-600 transition-colors">YouTube</h3>
                  <div className="text-[10px] font-semibold text-red-600/80 uppercase tracking-wider mt-0.5">
                    YouTube Data API v3
                  </div>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Shorts and Long-form Channel Uploads. Ingests total watch time, subscriber conversions, and click-through rates.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#64748B]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Shorts &amp; Long-Form Analytics</span>
              </div>
            </div>

            {/* Facebook Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-50/40 via-white to-white border border-[#E2E8F0] hover:border-blue-300/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-center group">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-200/60 flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
                  <FacebookLogo size="lg" variant="light" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B132B] group-hover:text-blue-600 transition-colors">Facebook</h3>
                  <div className="text-[10px] font-semibold text-blue-600/80 uppercase tracking-wider mt-0.5">
                    Meta Page Insights API
                  </div>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Page Posts, Videos, and Photos. Measures viral reshares, reactions, impressions, and follower demographics.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#64748B]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Organic Reach &amp; Viral Shares</span>
              </div>
            </div>

            {/* LinkedIn Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-sky-50/40 via-white to-white border border-[#E2E8F0] hover:border-sky-300/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-center group">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-200/60 flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
                  <LinkedInLogo size="lg" variant="light" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B132B] group-hover:text-sky-600 transition-colors">LinkedIn</h3>
                  <div className="text-[10px] font-semibold text-sky-600/80 uppercase tracking-wider mt-0.5">
                    LinkedIn Community API
                  </div>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Company and Professional Feeds. Evaluates PDF carousels, text-only discussions, clicks, and comment depth.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#64748B]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>B2B Document &amp; Feed Tracking</span>
              </div>
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

          {/* Light Platform Icons in Footer */}
          <div className="pt-6 pb-2 flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" title="Instagram Integration">
              <InstagramLogo size="sm" variant="light" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" title="YouTube Integration">
              <YouTubeLogo size="sm" variant="light" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" title="Facebook Integration">
              <FacebookLogo size="sm" variant="light" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors" title="LinkedIn Integration">
              <LinkedInLogo size="sm" variant="light" />
            </div>
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
