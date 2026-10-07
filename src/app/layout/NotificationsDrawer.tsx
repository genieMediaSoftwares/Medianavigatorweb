import React, { useState } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  Sparkles, 
  TrendingUp, 
  FileText, 
  AlertTriangle, 
  Bell, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useMedia } from '../providers/MediaContext';
import { NotificationItem } from '../providers/MediaContext';

export const NotificationsDrawer: React.FC = () => {
  const { 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    setCurrentTab
  } = useMedia();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isNotificationsOpen) return null;

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'sync_completed':
        return <RotateCw className="w-4 h-4 text-emerald-600" />;
      case 'new_insight':
        return <Sparkles className="w-4 h-4 text-brand-600" />;
      case 'trend_ready':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'report_ready':
        return <FileText className="w-4 h-4 text-brand-400" />;
      case 'reauth_required':
      case 'sync_failed':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-stone-500" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    if (item.targetTab) {
      setCurrentTab(item.targetTab);
      setIsNotificationsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsNotificationsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-line-strong shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 bg-canvas border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600/10 text-brand-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Platform Notifications</h3>
                <p className="text-xs text-muted">
                  {unreadNotificationCount} unread system & intelligence events
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="p-1 rounded-lg text-muted hover:text-ink hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-header Filter Tabs */}
          <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-white">
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === 'unread'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Unread ({unreadNotificationCount})
              </button>
            </div>

            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Bell className="w-8 h-8 text-stone-300 mx-auto" />
                <div className="text-sm font-bold text-ink">No notifications</div>
                <p className="text-xs text-muted">You are completely caught up on all channels.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    !item.read
                      ? 'bg-brand-600/5 border-brand-600/30 shadow-2xs hover:bg-brand-600/10'
                      : 'bg-white border-line hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-white border border-stone-200">
                        {getIcon(item.type)}
                      </div>
                      <span className="text-xs font-bold text-ink">{item.title}</span>
                    </div>
                    <span className="text-xs text-muted shrink-0">
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs text-brand-600 font-medium">
                    <span>Explore details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-canvas border-t border-line text-center text-xs text-muted">
            Real-time webhook and background polling alerts.
          </div>
        </div>
      </div>
    </div>
  );
};
