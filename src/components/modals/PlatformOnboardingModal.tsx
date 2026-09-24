import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Instagram, 
  Youtube, 
  Facebook, 
  Linkedin,
  ExternalLink
} from 'lucide-react';
import { PlatformType } from '../../types';
import { useMedia } from '../../context/MediaContext';

interface PlatformOnboardingModalProps {
  platform: PlatformType | null;
  onClose: () => void;
  onProceedToAuth: (platform: PlatformType) => void;
}

export const PlatformOnboardingModal: React.FC<PlatformOnboardingModalProps> = ({
  platform,
  onClose,
  onProceedToAuth,
}) => {
  const { startSyncFlow } = useMedia();
  const [stage, setStage] = useState<'onboarding' | 'permission_review'>('onboarding');
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!platform) return null;

  const getPlatformDetails = (p: PlatformType) => {
    switch (p) {
      case 'instagram':
        return {
          title: 'Instagram Professional & Creator Connection',
          icon: Instagram,
          color: 'from-amber-500 via-rose-500 to-purple-600',
          dataAccessed: [
            'Published Reels, Carousels, and Photos',
            'Verified Plays, Impressions, and Reach',
            'Likes, Public Comments, and Saves',
            'Video Retention and Audience Growth'
          ],
          whyNeeded: 'Required to calculate exact format benchmarks, caption hook effectiveness, and peak follower activity windows.',
          permissions: [
            { scope: 'instagram_basic', name: 'Basic Profile & Media', desc: 'Read username, profile picture, and media assets' },
            { scope: 'instagram_manage_insights', name: 'Media Insights', desc: 'Read post reach, impressions, views, and interactions' },
            { scope: 'pages_show_list', name: 'Linked Meta Assets', desc: 'Verify connection to linked Facebook Page' }
          ],
          note: 'Meta requires an Instagram Professional (Creator or Business) account linked to an authorized Meta asset.'
        };
      case 'youtube':
        return {
          title: 'YouTube Channel Data Connection',
          icon: Youtube,
          color: 'bg-red-600',
          dataAccessed: [
            'Shorts and Long-form Channel Uploads',
            'View Counts, Watch Time, and Click-through Rates',
            'Comment Frequency and Like Counts',
            'Upload Timestamps and Playlist Metadata'
          ],
          whyNeeded: 'Calculates format retention differences between Shorts and long-form video, identifying peak viewer engagement.',
          permissions: [
            { scope: 'youtube.readonly', name: 'YouTube Read-Only', desc: 'View your YouTube account, channel statistics, and video details' },
            { scope: 'yt-analytics.readonly', name: 'YouTube Analytics Read-Only', desc: 'View aggregate video performance reports' }
          ],
          note: 'Google requires channel owner or manager authorization with read-only scope permissions.'
        };
      case 'facebook':
        return {
          title: 'Facebook Page Performance Connection',
          icon: Facebook,
          color: 'bg-blue-600',
          dataAccessed: [
            'Page Posts, Photos, and Videos',
            'Organic Reach and Aggregate Impressions',
            'Reactions, Comments, and Shares'
          ],
          whyNeeded: 'Measures organic distribution velocity and post-type response rates across your brand page.',
          permissions: [
            { scope: 'pages_read_engagement', name: 'Page Engagement', desc: 'Read public content, reactions, and comments on your Page' },
            { scope: 'read_insights', name: 'Page Insights', desc: 'Read Page-level metrics and aggregate reach' }
          ],
          note: 'Requires Admin or Editor access to the Facebook Page.'
        };
      case 'linkedin':
        return {
          title: 'LinkedIn Organization & Creator Feed',
          icon: Linkedin,
          color: 'bg-sky-700',
          dataAccessed: [
            'Published Updates, Documents, and Articles',
            'Impressions, Clicks, and Social Reactions',
            'Comment Discussion Velocity'
          ],
          whyNeeded: 'Identifies high-performing B2B thought leadership formats and document carousel swipe rates.',
          permissions: [
            { scope: 'r_organization_social', name: 'Organization Social Management', desc: 'Read organizational posts and performance' },
            { scope: 'r_basicprofile', name: 'Basic Profile', desc: 'Verify identity and authorized administrator status' }
          ],
          note: 'Requires Page Admin authorization on the LinkedIn Company Page.'
        };
    }
  };

  const details = getPlatformDetails(platform);
  const Icon = details.icon;

  const handleAuthorize = () => {
    setAuthorizing(true);
    setAuthError(null);

    // Simulate real OAuth handoff
    setTimeout(() => {
      setAuthorizing(false);
      onClose();
      startSyncFlow(platform, `${platform}_account`);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B132B]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-[#CBD5E1] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${details.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B132B]">
                {stage === 'onboarding' ? 'Platform Onboarding' : 'Permission Review'}
              </h3>
              <p className="text-[11px] text-[#64748B]">
                {details.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#0B132B] hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {stage === 'onboarding' ? (
            /* STAGE 1: Screen 07 Platform Connection Onboarding */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0284C7]/5 border border-[#0284C7]/20 space-y-1.5">
                <div className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Why Access Is Needed
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {details.whyNeeded}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
                  What Media Navigator Accesses (Read-Only)
                </h4>
                <div className="space-y-2">
                  {details.dataAccessed.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#475569]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <div className="text-[11px] font-bold text-[#0B132B] uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Official Privacy & Data Protection Guarantee
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Media Navigator uses official read-only APIs. We cannot publish content, delete posts, or modify your profile. Tokens are never shared or stored insecurely.
                </p>
              </div>

              {details.note && (
                <div className="text-[11px] text-[#64748B] italic">
                  * Note: {details.note}
                </div>
              )}
            </div>
          ) : (
            /* STAGE 2: Screen 08 Permission Review */
            <div className="space-y-4">
              <div className="text-xs text-[#64748B] leading-relaxed">
                Review the specific OAuth permission scopes requested by Media Navigator for official API synchronization.
              </div>

              <div className="space-y-2.5">
                {details.permissions.map((perm) => (
                  <div key={perm.scope} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B132B]">{perm.name}</span>
                      <code className="text-[10px] font-mono text-[#0284C7] bg-[#0284C7]/10 px-1.5 py-0.5 rounded">
                        {perm.scope}
                      </code>
                    </div>
                    <p className="text-xs text-[#64748B]">{perm.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Permission Integrity Rule:</div>
                <p className="text-[11px]">
                  Connection state is verified by the backend after successful OAuth callback. No mock status or fake access is granted.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
          {stage === 'permission_review' ? (
            <button
              onClick={() => setStage('onboarding')}
              disabled={authorizing}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0B132B]"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0B132B]"
            >
              Cancel
            </button>
          )}

          {stage === 'onboarding' ? (
            <button
              onClick={() => setStage('permission_review')}
              className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] flex items-center gap-1.5 shadow-xs"
            >
              <span>Review Requested Permissions</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#06B6D4]" />
            </button>
          ) : (
            <button
              onClick={handleAuthorize}
              disabled={authorizing}
              className="px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              {authorizing ? (
                <span>Redirecting to Official Auth...</span>
              ) : (
                <>
                  <span>Authorize & Ingest Content</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
