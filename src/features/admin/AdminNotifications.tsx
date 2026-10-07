import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Radio, 
  Plus, 
  Clock
} from 'lucide-react';
import { useAdmin } from '../../app/providers/AdminContext';
import { AdminNotificationBroadcast } from './types';

export const AdminNotifications: React.FC = () => {
  const { broadcasts, createBroadcast, currentRole } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AdminNotificationBroadcast['type']>('system_maintenance');
  const [targetAudience, setTargetAudience] = useState<AdminNotificationBroadcast['targetAudience']>('All Users');

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    createBroadcast({
      title,
      body,
      type,
      targetAudience,
      scheduledFor: 'Immediately',
      status: 'sent',
    });

    setTitle('');
    setBody('');
    setModalOpen(false);
  };

  const isReadOnly = currentRole === 'read_only' || currentRole === 'finance';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0B132B] tracking-tight">
            System Broadcasts & Announcements (Screen 06)
          </h2>
          <p className="text-xs text-slate-500">
            Dispatch critical platform alerts, scheduled maintenance notices, API incidents, and product releases to creators.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-bold hover:bg-[#1C2541] transition-all flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#00F0FF]" />
            <span>New System Broadcast</span>
          </button>
        )}
      </div>

      {/* Broadcast History Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#0B132B]">Dispatched Broadcast History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="pb-3">Title & Message</th>
                <th className="pb-3">Notice Type</th>
                <th className="pb-3">Target Audience</th>
                <th className="pb-3">Scheduled / Sent At</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Delivery Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {broadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70">
                  <td className="py-3 max-w-sm">
                    <div className="font-bold text-[#0B132B]">{b.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{b.body}</div>
                  </td>

                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      b.type === 'api_incident' ? 'bg-rose-100 text-rose-800' :
                      b.type === 'system_maintenance' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {b.type.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 font-medium text-slate-700">
                    {b.targetAudience}
                  </td>

                  <td className="py-3 text-[11px] text-slate-500">
                    {b.scheduledFor}
                  </td>

                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      b.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>

                  <td className="py-3 text-right font-bold text-slate-800">
                    {b.deliveredCount ? `${b.deliveredCount.toLocaleString()} users` : 'Pending'}
                  </td>
                </tr>
              ))}
              {broadcasts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Radio className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-slate-600 block">No System Broadcasts Dispatched</span>
                    <span className="text-[11px] text-slate-400">Use the button above to publish system maintenance, outage alerts, or product announcements.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating New Broadcast */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B132B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0B132B]">Draft Global System Notice</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Headline</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Meta API v22.0 Migration Maintenance"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Message Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Detailed notification content displayed inside creator notification drawer..."
                  rows={4}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Notice Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
                  >
                    <option value="system_maintenance">System Maintenance</option>
                    <option value="feature_release">Feature Release</option>
                    <option value="api_incident">API Incident</option>
                    <option value="security_bulletin">Security Bulletin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Audience Target</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
                  >
                    <option value="All Users">All Users</option>
                    <option value="Enterprise Only">Enterprise Only</option>
                    <option value="YouTube Creators">YouTube Creators</option>
                    <option value="Instagram Accounts">Instagram Accounts</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B132B] text-white hover:bg-[#1C2541] shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#00F0FF]" />
                  <span>Dispatch Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
