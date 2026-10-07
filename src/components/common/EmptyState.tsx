import React from 'react';
import { ShieldAlert, Link2, RefreshCw, PlugZap, ArrowRight } from 'lucide-react';
import { PlatformType } from '../../types';

interface EmptyStateProps {
  type?: 'no_connection' | 'no_data' | 'connection_expired' | 'permission_missing';
  title?: string;
  description?: string;
  platform?: PlatformType;
  actionText?: string;
  onAction?: () => void;
}

const DEFAULTS = {
  no_connection: { title: 'Connect an account to get started', description: 'Link Instagram, YouTube, Facebook or LinkedIn and your results will appear here once the first sync finishes.', action: 'Connect an account', Icon: Link2, tint: 'bg-brand-50 text-brand-600' },
  no_data: { title: 'No posts yet', description: 'Your account is connected but the platform returned no posts. Try syncing again in a few minutes.', action: 'Sync again', Icon: RefreshCw, tint: 'bg-brand-50 text-brand-600' },
  connection_expired: { title: 'Your connection expired', description: 'The platform’s access has expired or was revoked. Reconnect to keep your numbers up to date.', action: 'Reconnect', Icon: PlugZap, tint: 'bg-rose-50 text-rose-600' },
  permission_missing: { title: 'More permission is needed', description: 'Your account is connected, but the platform hasn’t granted access to this data. Reconnect and approve the requested permissions.', action: 'Review permissions', Icon: ShieldAlert, tint: 'bg-amber-50 text-amber-600' },
} as const;

export const EmptyState: React.FC<EmptyStateProps> = ({ type = 'no_connection', title, description, actionText, onAction }) => {
  const d = DEFAULTS[type];
  return (
    <div id="empty-state-container" className="card px-6 py-14 md:py-16 text-center max-w-2xl mx-auto my-4 flex flex-col items-center">
      <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${d.tint}`}><d.Icon className="w-7 h-7" /></span>
      <h3 className="mt-5 font-display text-2xl md:text-3xl font-medium tracking-tight text-ink">{title || d.title}</h3>
      <p className="mt-2 text-[15px] text-body leading-relaxed max-w-md">{description || d.description}</p>
      {onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary mt-6">
          {actionText || d.action}<ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
