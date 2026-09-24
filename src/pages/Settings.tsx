import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  Target, 
  Share2, 
  Bell, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Trash2, 
  Check, 
  Save, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

export const Settings: React.FC = () => {
  const { 
    user, 
    setUser, 
    brandProfile, 
    setBrandProfile, 
    demoMode, 
    setDemoMode,
    currentWorkspace,
    setCurrentWorkspace,
    setCurrentTab
  } = useMedia();

  const [activeSubTab, setActiveSubTab] = useState<
    'profile' | 'workspace' | 'brand' | 'accounts' | 'notifications' | 'ai' | 'privacy' | 'security' | 'plan' | 'danger'
  >('profile');

  const [savedNotice, setSavedNotice] = useState(false);

  // Form states
  const [name, setName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [brandName, setBrandName] = useState(brandProfile.brandName);
  const [niche, setNiche] = useState(brandProfile.niche);
  const [targetAudience, setTargetAudience] = useState(brandProfile.targetAudience);
  const [mainGoal, setMainGoal] = useState(brandProfile.mainGoal);

  // Notification toggles
  const [emailSyncAlerts, setEmailSyncAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [performanceSpikeAlert, setPerformanceSpikeAlert] = useState(true);

  // AI settings
  const [strictGroundedOnly, setStrictGroundedOnly] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState('High (90%+)');

  const handleSaveProfile = () => {
    setUser({ ...user, fullName: name, email });
    setBrandProfile({
      ...brandProfile,
      brandName,
      niche,
      targetAudience,
      mainGoal,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const menuItems = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'workspace', label: 'Workspace', icon: Building2 },
    { id: 'brand', label: 'Brand & Niche', icon: Target },
    { id: 'accounts', label: 'Connected Accounts', icon: Share2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Intelligence Preferences', icon: Sparkles },
    { id: 'privacy', label: 'Data & Privacy', icon: ShieldCheck },
    { id: 'security', label: 'Security & OAuth', icon: Lock },
    { id: 'plan', label: 'Subscription & Plan', icon: CreditCard },
    { id: 'danger', label: 'Account Deletion', icon: Trash2, danger: true },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title */}
      <div>
        <div className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
          Configuration & Account Controls
        </div>
        <h1 className="text-2xl font-extrabold text-[#0B132B] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Manage workspace settings, brand profile context, data retention, and AI reasoning parameters.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings successfully updated across workspace.</span>
        </div>
      )}

      {/* Screen 21 Layout: Two-Column Settings View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Settings Navigation */}
        <div className="md:col-span-4 lg:col-span-3 bg-white rounded-2xl border border-[#E2E8F0] p-2 space-y-1 shadow-xs">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-[#0B132B] text-white shadow-xs'
                    : item.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-[#475569] hover:bg-slate-100 hover:text-[#0B132B]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#06B6D4]' : ''}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Panel */}
        <div className="md:col-span-8 lg:col-span-9 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
          {/* USER PROFILE */}
          {activeSubTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">User Profile</h3>
                <p className="text-xs text-[#64748B]">Manage your individual account credentials and role.</p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border border-[#CBD5E1]"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#0B132B]">{user.fullName}</div>
                  <div className="text-xs text-[#64748B]">{user.accountType} · Administrator</div>
                  <button className="text-xs text-[#0284C7] hover:underline font-semibold">Change Avatar</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}

          {/* WORKSPACE */}
          {activeSubTab === 'workspace' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">Workspace Profile</h3>
                <p className="text-xs text-[#64748B]">Settings for the currently active brand workspace.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={currentWorkspace}
                    onChange={(e) => setCurrentWorkspace(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A]"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="text-xs font-bold text-[#0B132B]">Workspace Identifier</div>
                  <code className="text-xs text-[#0284C7] font-mono">ws-live-prod-0824</code>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>Update Workspace</span>
                </button>
              </div>
            </div>
          )}

          {/* BRAND & NICHE */}
          {activeSubTab === 'brand' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">Brand & Intelligence Niche</h3>
                <p className="text-xs text-[#64748B]">Context used to tailor AI trend signals and hook evaluations.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Industry / Niche
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Primary Social Goal
                  </label>
                  <select
                    value={mainGoal}
                    onChange={(e) => setMainGoal(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-white"
                  >
                    <option value="Increase reach">Increase reach</option>
                    <option value="Improve engagement">Improve engagement</option>
                    <option value="Generate leads">Generate leads</option>
                    <option value="Build brand awareness">Build brand awareness</option>
                    <option value="Improve content consistency">Improve content consistency</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>Save Brand Context</span>
                </button>
              </div>
            </div>
          )}

          {/* CONNECTED ACCOUNTS SHORTCUT */}
          {activeSubTab === 'accounts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">Connected Accounts</h3>
                <p className="text-xs text-[#64748B]">Manage your active channels and OAuth tokens.</p>
              </div>
              <p className="text-xs text-[#475569]">
                View authorization statuses, trigger live synchronization, or connect new channels directly in the Connections manager.
              </p>
              <button
                onClick={() => setCurrentTab('connections')}
                className="px-4 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] transition-all flex items-center gap-1.5 shadow-xs"
              >
                <span>Go to Connections Manager</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSubTab === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">Notification Preferences</h3>
                <p className="text-xs text-[#64748B]">Configure email and in-app alert triggers.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <div className="text-xs font-bold text-[#0B132B]">Ingestion & Sync Notifications</div>
                    <div className="text-[11px] text-[#64748B]">Get notified when all Reels & Posts are updated</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailSyncAlerts}
                    onChange={(e) => setEmailSyncAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#0284C7]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <div className="text-xs font-bold text-[#0B132B]">Weekly Executive Briefing</div>
                    <div className="text-[11px] text-[#64748B]">Receive automated Monday performance intelligence report</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="w-4 h-4 accent-[#0284C7]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <div className="text-xs font-bold text-[#0B132B]">Viral Velocity & Spike Alerts</div>
                    <div className="text-[11px] text-[#64748B]">Immediate alerts when a post outperforms historical baseline by 3x</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={performanceSpikeAlert}
                    onChange={(e) => setPerformanceSpikeAlert(e.target.checked)}
                    className="w-4 h-4 accent-[#0284C7]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* AI PREFERENCES */}
          {activeSubTab === 'ai' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">AI Reasoning & Grounding Rules</h3>
                <p className="text-xs text-[#64748B]">Enforce strict factual grounding over unverified speculation.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0284C7]/5 border border-[#0284C7]/20 space-y-2">
                <div className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Anti-Hallucination & Anti-Slop Discipline
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Media Navigator explicitly differentiates measured facts (e.g. view retention, verified engagement rate) from causal hypotheses. It never claims unauthorized access to proprietary platform ranking algorithms.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <div className="text-xs font-bold text-[#0B132B]">Strict Measured-Data Grounding</div>
                    <div className="text-[11px] text-[#64748B]">Suppress unbacked speculative advice; only report statistically significant patterns</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={strictGroundedOnly}
                    onChange={(e) => setStrictGroundedOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#0284C7]"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                    Minimum Pattern Confidence Threshold
                  </label>
                  <select
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] bg-white"
                  >
                    <option value="High (90%+)">High (90%+ verified confidence)</option>
                    <option value="Moderate (75%+)">Moderate (75%+ trend indicator)</option>
                    <option value="Exploratory (50%+)">Exploratory (include emerging hypotheses)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* DATA & PRIVACY */}
          {activeSubTab === 'privacy' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">Data & Privacy</h3>
                <p className="text-xs text-[#64748B]">Manage data retention policies and audit compliance.</p>
              </div>

              <div className="space-y-3 text-xs text-[#475569]">
                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
                  <div className="font-bold text-[#0B132B]">Read-Only Permissions Guarantee</div>
                  <p>All API connections are strictly read-only. Media Navigator has zero ability to publish or delete content.</p>
                </div>

                <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
                  <div className="font-bold text-[#0B132B]">Data Export</div>
                  <p>Download your complete analytical history in standard CSV or JSON format.</p>
                  <div className="pt-2">
                    <button
                      onClick={() => alert('Exporting full historical archive...')}
                      className="px-3.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
                    >
                      Export Full Archive (.JSON)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBSCRIPTION & PLAN */}
          {activeSubTab === 'plan' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#0B132B]">Subscription & Plan</h3>
                <p className="text-xs text-[#64748B]">Enterprise growth tier active.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B132B] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Current Tier</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">Active</span>
                </div>
                <div className="text-2xl font-extrabold">Media Navigator Enterprise</div>
                <p className="text-xs text-slate-300">
                  Includes full-archive content ingestion, zero pagination truncation, unlimited AI pattern evaluations, and custom report exports.
                </p>
              </div>
            </div>
          )}

          {/* DANGER ZONE / ACCOUNT DELETION */}
          {activeSubTab === 'danger' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Account Deletion & Data Purge
                </div>
                <p>
                  Permanently erase your workspace, revoke all official platform OAuth tokens, and delete all stored performance metrics. This action is completely irreversible.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete your workspace?')) {
                        alert('Workspace data purged.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                  >
                    Delete Workspace & Purge Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
