import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Key, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Youtube, 
  Instagram, 
  Facebook, 
  Linkedin,
  Sparkles
} from 'lucide-react';
import { PlatformType, PlatformConnection } from '../../types';
import { api } from '../../services/api';

interface PlatformConnectModalProps {
  platform: PlatformType | null;
  connection?: PlatformConnection;
  onClose: () => void;
  onSuccess: () => void;
}

export const PlatformConnectModal: React.FC<PlatformConnectModalProps> = ({
  platform,
  connection,
  onClose,
  onSuccess,
}) => {
  if (!platform) return null;

  // Form states
  const [accessToken, setAccessToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [youtubeAuthMode, setYoutubeAuthMode] = useState<'api_key' | 'oauth'>('api_key');

  // Execution status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getPlatformMeta = () => {
    switch (platform) {
      case 'instagram':
        return {
          name: 'Instagram',
          icon: <Instagram className="w-5 h-5 text-pink-600" />,
          requiredPermissions: [
            { name: 'instagram_basic', desc: 'Read professional account profile and all media assets' },
            { name: 'instagram_manage_insights', desc: 'Fetch verified reach, impressions, views, and engagement' },
            { name: 'pages_show_list', desc: 'Discover linked Facebook Page' },
            { name: 'pages_read_engagement', desc: 'Verify business account association' },
          ],
          guideUrl: 'https://developers.facebook.com/tools/explorer/',
          guideText: 'Generate token via Meta Graph API Explorer or App Settings with Instagram Graph permissions.',
        };
      case 'facebook':
        return {
          name: 'Facebook',
          icon: <Facebook className="w-5 h-5 text-blue-600" />,
          requiredPermissions: [
            { name: 'pages_read_engagement', desc: 'Read Page post reactions, comments, and shares' },
            { name: 'pages_show_list', desc: 'Locate managed business Pages' },
            { name: 'read_insights', desc: 'Retrieve Page-level impression analytics' },
          ],
          guideUrl: 'https://developers.facebook.com/tools/explorer/',
          guideText: 'Generate token via Meta Graph API Explorer for your managed Facebook Page.',
        };
      case 'youtube':
        return {
          name: 'YouTube',
          icon: <Youtube className="w-5 h-5 text-red-600" />,
          requiredPermissions: [
            { name: 'youtube.readonly', desc: 'YouTube Data API v3: Channel uploads, video statistics' },
            { name: 'yt-analytics.readonly', desc: 'YouTube Analytics API: Audience retention and watch time' },
          ],
          guideUrl: 'https://console.cloud.google.com/apis/credentials',
          guideText: 'Obtain an API Key from Google Cloud Console with YouTube Data API v3 enabled.',
        };
      case 'linkedin':
        return {
          name: 'LinkedIn',
          icon: <Linkedin className="w-5 h-5 text-sky-700" />,
          requiredPermissions: [
            { name: 'r_organization_social', desc: 'Read Organization posts and share statistics' },
            { name: 'rw_organization_admin', desc: 'Verify organization admin status' },
          ],
          guideUrl: 'https://www.linkedin.com/developers/tools/oauth',
          guideText: 'Generate OAuth token in LinkedIn Developer Portal for your Organization.',
        };
    }
  };

  const meta = getPlatformMeta();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      setCurrentStep('Validating platform authorization key...');
      
      const payload: any = {};
      if (platform === 'youtube' && youtubeAuthMode === 'api_key') {
        payload.apiKey = apiKey.trim();
        if (accountId.trim()) {
          payload.channelId = accountId.trim();
          payload.channelQuery = accountId.trim();
        }
      } else if (platform === 'instagram') {
        payload.accessToken = accessToken.trim();
        payload.apiKey = accessToken.trim();
        if (accountId.trim()) {
          payload.accountId = accountId.trim();
          payload.username = accountId.trim();
        }
      } else {
        payload.accessToken = accessToken.trim();
        if (accountId.trim()) {
          if (platform === 'facebook') payload.pageId = accountId.trim();
          if (platform === 'youtube') {
            payload.channelId = accountId.trim();
            payload.channelQuery = accountId.trim();
          }
          if (platform === 'linkedin') payload.organizationId = accountId.trim();
        }
      }

      setCurrentStep(`Authenticating with ${meta.name} API & retrieving all media posts...`);
      await api.connectPlatform(platform, payload);

      setCurrentStep('Formulating real media performance insights from complete post history...');
      setSuccessMessage(`Successfully connected ${meta.name}! Generating executive insights...`);
      
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || `Failed to connect ${meta.name}. Please verify your credentials.`);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${meta.name}? All synchronized media and metrics from this channel will be removed from your command center.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.disconnectPlatform(platform);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to disconnect ${meta.name}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="platform-connect-modal"
        className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] font-sans"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs">
              {meta.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B132B]">
                {connection?.connected ? `Manage ${meta.name} Connection` : `Connect ${meta.name}`}
              </h2>
              <p className="text-xs text-[#64748B]">
                Real-time API authorization &amp; media insights
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {connection?.connected ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Currently Connected &amp; Generating Insights</span>
              </div>
              <p className="text-xs text-[#0B132B] leading-relaxed">
                Connected to <span className="font-bold">{connection.accountHandle || connection.name}</span>. 
                Last synchronized: <span className="font-semibold">{connection.lastSyncedAt}</span> with {connection.dataPointsCount} verified media items.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Disconnect {meta.name}
                </button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleConnect} className="space-y-4">
            {/* YouTube Auth Method Selector */}
            {platform === 'youtube' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0B132B]">Authentication Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setYoutubeAuthMode('api_key')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      youtubeAuthMode === 'api_key'
                        ? 'bg-white border-[#0284C7] ring-1 ring-[#0284C7]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                      <span>YouTube Data Key</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Recommended</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">Instant connection via YouTube Data API v3</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setYoutubeAuthMode('oauth')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      youtubeAuthMode === 'oauth'
                        ? 'bg-white border-[#0284C7] ring-1 ring-[#0284C7]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#0B132B]">OAuth Access Token</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">Google OAuth 2.0 User Token</div>
                  </button>
                </div>
              </div>
            )}

            {/* Token or Key Input */}
            {platform === 'youtube' && youtubeAuthMode === 'api_key' ? (
              <div className="space-y-4">
                {/* 1. API Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0B132B]">YouTube Data API Key</label>
                    <a 
                      href="https://console.cloud.google.com/apis/credentials" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-[#0284C7] hover:underline flex items-center gap-1"
                    >
                      Google Cloud Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                  <div className="text-[11px] text-[#64748B]">
                    Paste your YouTube Data API Key to immediately evaluate media assets and generate executive insights.
                  </div>
                </div>

                {/* 2. Channel Identifier Input (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0B132B]">
                      Channel Handle or Link <span className="text-[#64748B] font-normal text-[11px]">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">Auto-discovered if left blank</span>
                  </div>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="e.g. @YourChannel, YouTube URL, or leave blank to auto-discover"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                  <div className="text-[11px] text-[#64748B]">
                    Optionally target a specific channel handle (e.g. @YourChannel) or channel ID.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0B132B]">
                      {platform === 'instagram'
                        ? 'Instagram Access Token / API Key'
                        : platform === 'youtube'
                        ? 'YouTube OAuth Access Token'
                        : platform === 'linkedin'
                        ? 'LinkedIn OAuth Access Token'
                        : 'Meta User Access Token'}
                    </label>
                    <a 
                      href={meta.guideUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-[#0284C7] hover:underline flex items-center gap-1 font-medium"
                    >
                      {platform === 'instagram' ? 'Get Instagram Key' : 'Get Token'} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={
                      platform === 'instagram'
                        ? 'Paste Instagram Access Token or Meta Key (IGQ... or EAAB...)'
                        : platform === 'youtube'
                        ? 'ya29...'
                        : platform === 'linkedin'
                        ? 'AQV...'
                        : 'EAAB...'
                    }
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                  <div className="text-[11px] text-[#64748B]">
                    {platform === 'instagram'
                      ? 'Paste your Instagram User Token or Meta Graph API Access Key to connect your profile and retrieve your full post history with verified views, likes, and comments.'
                      : meta.guideText}
                  </div>
                </div>

                {/* Optional Account / Handle / Page Identifier */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0B132B]">
                      {platform === 'instagram' && 'Instagram Username or Profile Handle (Optional)'}
                      {platform === 'facebook' && 'Facebook Page ID (Optional)'}
                      {platform === 'youtube' && 'Channel ID / Handle (Optional)'}
                      {platform === 'linkedin' && 'Organization URN / ID (Optional)'}
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">Auto-detected if left blank</span>
                  </div>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder={
                      platform === 'instagram'
                        ? 'e.g. @your_brand, instagram.com/your_brand, or leave blank'
                        : 'Auto-discovered if left blank'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                  />
                  <div className="text-[11px] text-[#64748B]">
                    {platform === 'instagram'
                      ? 'Target a specific Instagram handle, or leave empty to auto-detect from your authorized token.'
                      : 'Leave empty to automatically discover connected profiles.'}
                  </div>
                </div>
              </>
            )}

            {/* Permissions List */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2">
              <div className="text-xs font-bold text-[#0B132B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Required Platform Permissions
              </div>
              <div className="space-y-1.5">
                {meta.requiredPermissions.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-xs">
                    <code className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1] text-[#0B132B] font-mono shrink-0">
                      {p.name}
                    </code>
                    <span className="text-[#64748B] text-[11px]">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Feedback */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Connection Failed</div>
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Success Feedback */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Loading step */}
            {isSubmitting && currentStep && (
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0B132B] flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
                <span>{currentStep}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0B132B] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Media Insights...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Connect &amp; Sync Full Archive
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
