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
import { useMedia } from '../../context/MediaContext';
import { NotificationItem } from '../../context/MediaContext';

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
        return <Sparkles className="w-4 h-4 text-[#0284C7]" />;
      case 'trend_ready':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'report_ready':
        return <FileText className="w-4 h-4 text-[#06B6D4]" />;
      case 'reauth_required':
      case 'sync_failed':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
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
        className="fixed inset-0 bg-[#0B132B]/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsNotificationsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#CBD5E1] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0B132B]">Platform Notifications</h3>
                <p className="text-[11px] text-[#64748B]">
                  {unreadNotificationCount} unread system & intelligence events
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="p-1 rounded-lg text-[#64748B] hover:text-[#0B132B] hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-header Filter Tabs */}
          <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-[#0B132B] shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0B132B]'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === 'unread'
                    ? 'bg-white text-[#0B132B] shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0B132B]'
                }`}
              >
                Unread ({unreadNotificationCount})
              </button>
            </div>

            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-[#0284C7] hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-[#0B132B]">No notifications</div>
                <p className="text-xs text-[#64748B]">You are completely caught up on all channels.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    !item.read
                      ? 'bg-[#0284C7]/5 border-[#0284C7]/30 shadow-2xs hover:bg-[#0284C7]/10'
                      : 'bg-white border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-white border border-slate-200">
                        {getIcon(item.type)}
                      </div>
                      <span className="text-xs font-bold text-[#0B132B]">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-[#0284C7] font-medium">
                    <span>Explore details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            Real-time webhook and background polling alerts.
          </div>
        </div>
      </div>
    </div>
  );
};
