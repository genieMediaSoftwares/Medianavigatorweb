import React, { useState } from 'react';
import { 
  ArrowRight, 
  Check, 
  Sparkles, 
  Target, 
  Layers, 
  MapPin, 
  TrendingUp, 
  Video, 
  Image, 
  FileText
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useMedia } from '../context/MediaContext';
import { BrandProfile } from '../types';

export const Onboarding: React.FC = () => {
  const { brandProfile, setBrandProfile, setAppView, setCurrentTab } = useMedia();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [brandName, setBrandName] = useState(brandProfile.brandName || 'My Media Channel');
  const [niche, setNiche] = useState(brandProfile.niche || 'B2B SaaS, Creator Economy & Growth Engineering');
  const [targetAudience, setTargetAudience] = useState(brandProfile.targetAudience || 'Tech founders, growth marketers, and modern creators');
  const [primaryLocation, setPrimaryLocation] = useState(brandProfile.primaryLocation || 'Global / North America');
  const [mainGoal, setMainGoal] = useState(brandProfile.mainGoal || 'Increase reach');
  const [currentExperience, setCurrentExperience] = useState(brandProfile.currentExperience || 'Advanced social media operators');
  const [preferredFormats, setPreferredFormats] = useState<string[]>(brandProfile.preferredFormats || ['reel', 'carousel', 'video']);

  const goalOptions = [
    'Increase reach',
    'Improve engagement',
    'Generate leads',
    'Build brand awareness',
    'Increase website traffic',
    'Improve content consistency',
    'Analyze market trends'
  ];

  const experienceLevels = [
    'Beginner (Starting new channel)',
    'Intermediate (Regular weekly posting)',
    'Advanced (Professional team / Agency)'
  ];

  const formatOptions = [
    { id: 'reel', label: 'Instagram Reels & Vertical Video', icon: Video },
    { id: 'video', label: 'YouTube Long-form & Documentaries', icon: Video },
    { id: 'carousel', label: 'Multi-slide Carousels & Swipes', icon: Layers },
    { id: 'post', label: 'Static Visuals & Photography', icon: Image },
    { id: 'article', label: 'LinkedIn Long-form Articles', icon: FileText },
  ];

  const toggleFormat = (id: string) => {
    if (preferredFormats.includes(id)) {
      setPreferredFormats(preferredFormats.filter(f => f !== id));
    } else {
      setPreferredFormats([...preferredFormats, id]);
    }
  };

  const handleComplete = () => {
    const updated: BrandProfile = {
      brandName,
      niche,
      targetAudience,
      primaryLocation,
      mainGoal,
      currentExperience,
      preferredFormats,
    };
    setBrandProfile(updated);
    // Move to connections tab so they can connect accounts immediately!
    setCurrentTab('connections');
    setAppView('app');
  };

  const handleSkip = () => {
    setCurrentTab('connections');
    setAppView('app');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between selection:bg-[#0284C7]/20">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header with Step Indicator */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B]">
              Brand & Intelligence Profile Setup
            </h1>
            <p className="text-xs text-[#64748B]">
              Help Media Navigator customize your content benchmarks, niche trend signals, and hook evaluations.
            </p>
          </div>

          {/* Stepper Bar */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {[
              { num: 1, label: 'Brand & Niche' },
              { num: 2, label: 'Audience & Goals' },
              { num: 3, label: 'Content Formats' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    step === s.num
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    step === s.num ? 'text-[#0B132B]' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 3 && <span className="text-slate-300 mx-1">/</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] shadow-lg space-y-6">
          {/* STEP 1: BRAND & NICHE */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0B132B] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0284C7]" />
                  What is your brand and specific domain?
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Media Navigator uses this to avoid generic advice and tailor AI insights to your industry.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Tech Media"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Industry or Niche
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. B2B SaaS, Fitness Coaching, Real Estate Marketing"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                      Primary Target Location or Market
                    </label>
                    <span className="text-[11px] text-slate-400">Optional</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={primaryLocation}
                      onChange={(e) => setPrimaryLocation(e.target.value)}
                      placeholder="e.g. United States, United Kingdom, Global"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7] pl-10"
                    />
                    <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AUDIENCE & GOALS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0B132B] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#0284C7]" />
                  Who is your audience, and what is your primary objective?
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  We'll weigh performance metrics against what matters most to your organization.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Target Audience Persona
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Founders, product managers, software engineers"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
                    Main Social Media Goal
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {goalOptions.map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setMainGoal(goal)}
                        className={`p-3 rounded-xl text-xs font-medium text-left border transition-all ${
                          mainGoal === goal
                            ? 'bg-[#0B132B] text-white border-[#0B132B] shadow-xs'
                            : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-slate-100'
                        }`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
                    Current Experience Level
                  </label>
                  <div className="space-y-1.5">
                    {experienceLevels.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCurrentExperience(lvl)}
                        className={`w-full p-2.5 rounded-xl text-xs font-medium text-left border transition-all ${
                          currentExperience === lvl
                            ? 'bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/40 font-semibold'
                            : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREFERRED FORMATS */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0B132B] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0284C7]" />
                  Select your primary content formats
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Select all that apply. Media Navigator will evaluate format efficacy and suggest optimal mix ratios.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {formatOptions.map((fmt) => {
                  const Icon = fmt.icon;
                  const isSelected = preferredFormats.includes(fmt.id);

                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => toggleFormat(fmt.id)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#0284C7]/10 border-[#0284C7] text-[#0B132B]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#0284C7] text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold">{fmt.label}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#0284C7] border-[#0284C7] text-white'
                            : 'border-[#CBD5E1]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0B132B]"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-[#94A3B8] hover:text-[#64748B]"
              >
                Skip and complete later
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as 2 | 3)}
                className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] flex items-center gap-1.5 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#06B6D4]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] flex items-center gap-2 shadow-md"
              >
                <span>Save Profile & Connect Accounts</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-[#94A3B8] pt-6">
        Step {step} of 3 · You can update your brand profile anytime in Settings.
      </div>
    </div>
  );
};
