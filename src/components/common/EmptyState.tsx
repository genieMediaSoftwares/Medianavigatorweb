import React from 'react';
import { ShieldAlert, Link2, AlertCircle, RefreshCw, Key } from 'lucide-react';
import { PlatformType } from '../../types';

interface EmptyStateProps {
  type?: 'no_connection' | 'no_data' | 'connection_expired' | 'permission_missing';
  title?: string;
  description?: string;
  platform?: PlatformType;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no_connection',
  title,
  description,
  platform,
  actionText,
  onAction,
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'no_connection':
        return {
          title: title || 'Connect your account to unlock Media Intelligence.',
          description: description || 'Media Navigator operates exclusively on verified live platform data. Connect your Instagram, Facebook, YouTube, or LinkedIn accounts to analyze real audience momentum.',
          actionText: actionText || 'Connect Platform',
          icon: <Link2 className="w-6 h-6 text-[#0284C7]" />,
        };
      case 'no_data':
        return {
          title: title || 'Your account is connected, but no analyzable media data is currently available.',
          description: description || 'We successfully verified your account connection, but no published posts, videos, or reels were returned from the platform API.',
          actionText: actionText || 'Sync Channel Again',
          icon: <RefreshCw className="w-6 h-6 text-[#0284C7]" />,
        };
      case 'connection_expired':
        return {
          title: title || 'Your connection has expired. Reconnect to continue analyzing your media.',
          description: description || 'The OAuth security token for this platform has expired. Re-authenticate to resume real-time synchronization.',
          actionText: actionText || 'Reconnect Account',
          icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
        };
      case 'permission_missing':
        return {
          title: title || 'Additional platform permissions are required to retrieve this data.',
          description: description || 'Your account is authorized, but the required analytics or insights scopes (such as yt-analytics.readonly or r_organization_social) have not been granted.',
          actionText: actionText || 'Update Permissions',
          icon: <ShieldAlert className="w-6 h-6 text-amber-500" />,
        };
    }
  };

  const content = getDefaultContent();

  return (
    <div 
      id="empty-state-container"
      className="p-8 md:p-10 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs text-center max-w-xl mx-auto my-6 flex flex-col items-center justify-center space-y-4 font-sans"
    >
      <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-2xs">
        {content.icon}
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-bold text-[#0B132B] tracking-tight">
          {content.title}
        </h3>
        <p className="text-xs text-[#64748B] leading-relaxed">
          {content.description}
        </p>
      </div>

      {onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            {content.actionText}
          </button>
        </div>
      )}
    </div>
  );
};
