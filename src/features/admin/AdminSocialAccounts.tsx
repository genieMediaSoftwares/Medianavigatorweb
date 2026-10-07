import React, { useState } from 'react';
import { 
  Share2, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ExternalLink,
  Clock,
  Database,
  Unlink
} from 'lucide-react';
import { useAdmin } from '../../app/providers/AdminContext';
import { AdminSocialAccountRecord, SocialSyncStatus } from './types';

export const AdminSocialAccounts: React.FC = () => {
  const { socialAccounts, triggerReauthSocial, disconnectSocial, currentRole } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SocialSyncStatus>('all');
  const [selectedAccount, setSelectedAccount] = useState<AdminSocialAccountRecord | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<AdminSocialAccountRecord | null>(null);

  const filteredAccounts = socialAccounts.filter((acc) => {
    const matchSearch = acc.accountHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        acc.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        acc.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlatform = platformFilter === 'all' || acc.platform === platformFilter;
    const matchStatus = statusFilter === 'all' || acc.status === statusFilter;
    return matchSearch && matchPlatform && matchStatus;
  });

  const handleDisconnect = () => {
    if (!confirmDisconnect) return;
    disconnectSocial(confirmDisconnect.id);
    if (selectedAccount?.id === confirmDisconnect.id) setSelectedAccount(null);
    setConfirmDisconnect(null);
  };

  const isReadOnly = currentRole === 'read_only';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight">
            Social Account Ingestion Management (Core Workflow 2)
          </h2>
          <p className="text-xs text-stone-500">
            Monitor live platform API health, OAuth token expiration windows, data sync quotas, and trigger manual re-authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 font-medium shadow-xs">
            {socialAccounts.filter(s => s.status === 'healthy').length} / {socialAccounts.length} Streams Operational
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by handle, creator name, or email..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Platforms</option>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Sync Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning / Expiring</option>
            <option value="failed">Failed / Revoked</option>
          </select>
        </div>
      </div>

      {/* Grid Layout: Main Table & Diagnostics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`p-5 rounded-2xl bg-white border border-stone-200 shadow-xs ${selectedAccount ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-xs">
                  <th className="pb-3">Platform & Handle</th>
                  <th className="pb-3">Owner & Email</th>
                  <th className="pb-3">Auth Type</th>
                  <th className="pb-3">Sync Status</th>
                  <th className="pb-3">Ingested Data Points</th>
                  <th className="pb-3">Token Expiry</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAccounts.map((acc) => (
                  <tr 
                    key={acc.id}
                    onClick={() => setSelectedAccount(acc)}
                    className={`hover:bg-stone-50/70 cursor-pointer transition-colors ${
                      selectedAccount?.id === acc.id ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          acc.platform === 'youtube' ? 'bg-red-100 text-red-700' :
                          acc.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                          acc.platform === 'linkedin' ? 'bg-blue-100 text-blue-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {acc.platform}
                        </span>
                        <div>
                          <div className="font-bold text-ink">{acc.accountHandle}</div>
                          <div className="text-xs text-stone-400 truncate max-w-[130px]">{acc.accountId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3">
                      <div className="font-medium text-stone-800">{acc.userName}</div>
                      <div className="text-xs text-stone-400">{acc.userEmail}</div>
                    </td>

                    <td className="py-3">
                      <span className="font-mono text-xs text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                        {acc.authType}
                      </span>
                    </td>

                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        acc.status === 'healthy' ? 'bg-emerald-100 text-emerald-800' :
                        acc.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {acc.status}
                      </span>
                    </td>

                    <td className="py-3 font-semibold text-stone-700">
                      {acc.dataPointsIngested.toLocaleString()} items
                    </td>

                    <td className="py-3 text-xs">
                      <span className={acc.status === 'warning' ? 'text-amber-700 font-semibold' : 'text-stone-500'}>
                        {acc.tokenExpiresIn}
                      </span>
                      <div className="text-xs text-stone-400">Sync: {acc.lastSyncAt}</div>
                    </td>

                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => triggerReauthSocial(acc.id)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50"
                            title="Trigger Reauthorization / Resync"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDisconnect(acc)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="Disconnect Account"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No connected social stream records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Social Account Detail Drawer (Workflow 2: Review Error & Trigger Reauth) */}
        {selectedAccount && (
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-md space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">
                  Social Connection Diagnostics
                </span>
                <h3 className="text-base font-bold text-ink">{selectedAccount.accountHandle}</h3>
                <div className="text-xs text-stone-500">Platform: {selectedAccount.platform.toUpperCase()}</div>
              </div>
              <button 
                onClick={() => setSelectedAccount(null)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {/* Error Banner if Failed */}
            {selectedAccount.errorMessage && (
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-1 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Sync Failure Detected</span>
                </div>
                <p className="text-xs leading-relaxed">{selectedAccount.errorMessage}</p>
                <div className="text-xs text-rose-600 pt-1">
                  Error Code: {selectedAccount.errorCode}
                </div>
              </div>
            )}

            {/* Metrics Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Stream Status</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-xs ${
                  selectedAccount.status === 'healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedAccount.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Owner</span>
                <span className="font-bold text-ink">{selectedAccount.userName}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Token Lifespan</span>
                <span className="font-medium text-stone-700">{selectedAccount.tokenExpiresIn}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Verified Assets Stored</span>
                <span className="font-bold text-blue-900">{selectedAccount.dataPointsIngested.toLocaleString()} items</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Auto-Sync Enabled</span>
                <span className="font-semibold text-emerald-600">{selectedAccount.autoSyncEnabled ? 'Yes (Hourly)' : 'Paused'}</span>
              </div>
            </div>

            {/* Actions */}
            {!isReadOnly && (
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <button
                  onClick={() => triggerReauthSocial(selectedAccount.id)}
                  className="w-full py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-ink-soft transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-brand-300" />
                  <span>Dispatch Reauthorization Workflow</span>
                </button>
                <button
                  onClick={() => setConfirmDisconnect(selectedAccount)}
                  className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  Force Disconnect Stream
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Disconnecting Social Stream */}
      {confirmDisconnect && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-ink">Disconnect Social Stream</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to disconnect <strong>{confirmDisconnect.accountHandle}</strong> ({confirmDisconnect.platform.toUpperCase()})? 
              This will halt all real-time background metric synchronization for workspace <strong>{confirmDisconnect.userName}</strong>.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDisconnect(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
