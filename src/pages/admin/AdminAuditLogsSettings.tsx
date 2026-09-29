import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  User, 
  Lock, 
  Key, 
  Smartphone, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  Clock, 
  Download,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AdminAuditLog, AuditSeverity } from '../../types/admin';

export const AdminAuditLogsSettings: React.FC = () => {
  const { auditLogs, adminProfile, setAdminProfile, currentRole, hasPermission } = useAdmin();
  const [activeSubTab, setActiveSubTab] = useState<'audit_logs' | 'admin_profile' | 'security_tokens'>('audit_logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditSeverity>('all');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  // Form states for profile
  const [profileName, setProfileName] = useState(adminProfile.name);
  const [profileEmail, setProfileEmail] = useState(adminProfile.email);
  const [profileTimezone, setProfileTimezone] = useState(adminProfile.timezone);
  const [mfaStatus, setMfaStatus] = useState(adminProfile.mfaEnabled);
  const [saveNotice, setSaveNotice] = useState(false);

  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.eventId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminProfile((prev: any) => ({
      ...prev,
      name: profileName,
      email: profileEmail,
      timezone: profileTimezone,
      mfaEnabled: mfaStatus,
    }));
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 3000);
  };

  const handleExportAuditLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `media_navigator_audit_trail_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0B132B] tracking-tight">
            Audit Logs & Admin Profile (Screens 08 & 09)
          </h2>
          <p className="text-xs text-slate-500">
            Immutable forensic compliance tracking, role-based access review, MFA security controls, and personal operator credentials.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center p-1 rounded-xl bg-white border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveSubTab('audit_logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'audit_logs' ? 'bg-[#0B132B] text-white shadow-xs' : 'text-slate-600 hover:text-[#0B132B]'
            }`}
          >
            Audit Trail (Screen 08)
          </button>
          <button
            onClick={() => setActiveSubTab('admin_profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'admin_profile' ? 'bg-[#0B132B] text-white shadow-xs' : 'text-slate-600 hover:text-[#0B132B]'
            }`}
          >
            Profile & Security (Screen 09)
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: AUDIT LOGS (SCREEN 08) */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search event ID, action keyword, actor email, or resource..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="security">Security</option>
              </select>

              <button
                onClick={handleExportAuditLogs}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Table & Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs ${selectedLog ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="pb-3">Event ID</th>
                      <th className="pb-3">Timestamp (UTC)</th>
                      <th className="pb-3">Actor & Role</th>
                      <th className="pb-3">Action Name</th>
                      <th className="pb-3">Resource Target</th>
                      <th className="pb-3">Severity</th>
                      <th className="pb-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr 
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`hover:bg-slate-50/70 cursor-pointer transition-colors ${
                          selectedLog?.id === log.id ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="py-3 font-mono font-bold text-slate-600">{log.eventId}</td>
                        <td className="py-3 text-[11px] text-slate-500">{log.timestamp}</td>
                        <td className="py-3">
                          <div className="font-bold text-[#0B132B]">{log.actor}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{log.role.replace('_', ' ')}</div>
                        </td>
                        <td className="py-3 font-mono text-[11px] font-semibold text-blue-900">
                          {log.action}
                        </td>
                        <td className="py-3 text-slate-600 truncate max-w-xs">{log.resource}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.severity === 'critical' || log.severity === 'security' ? 'bg-rose-100 text-rose-800' :
                            log.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-600">
                          {log.result}
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No audit events found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Audit Log Forensic Drawer */}
            {selectedLog && (
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4 animate-in fade-in">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Forensic Audit Context
                    </span>
                    <h3 className="text-base font-bold text-[#0B132B] font-mono">{selectedLog.eventId}</h3>
                    <div className="text-xs text-slate-500">{selectedLog.timestamp}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-500 font-medium">Actor</span>
                    <span className="font-bold text-[#0B132B]">{selectedLog.actor}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-500 font-medium">RBAC Role</span>
                    <span className="font-bold text-blue-900 uppercase text-[11px]">{selectedLog.role}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-500 font-medium">Origin IP & Location</span>
                    <span className="font-mono text-slate-700">{selectedLog.ipAddress} ({selectedLog.location})</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-500 font-medium">Workspace Context</span>
                    <span className="font-semibold text-slate-800">{selectedLog.workspace}</span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-700 mb-1">Payload Metadata</span>
                    <pre className="p-3 rounded-xl bg-[#0B132B] text-[#00F0FF] text-[11px] font-mono overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ADMIN PROFILE & SETTINGS (SCREEN 09) */}
      {activeSubTab === 'admin_profile' && (
        <div className="max-w-3xl bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <img 
                src={adminProfile.photoUrl} 
                alt={adminProfile.name} 
                className="w-16 h-16 rounded-full object-cover border-2 border-[#00F0FF]" 
              />
              <div>
                <h3 className="text-lg font-bold text-[#0B132B]">{adminProfile.name}</h3>
                <div className="text-xs text-slate-500">{adminProfile.roleTitle} • {adminProfile.email}</div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  ● Active Session (Verified MFA)
                </div>
              </div>
            </div>
            {saveNotice && (
              <div className="p-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Profile Updated</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Security Contact Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Default Operating Timezone</label>
                <select
                  value={profileTimezone}
                  onChange={(e) => setProfileTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="UTC -07:00 (Pacific Time)">UTC -07:00 (Pacific Time)</option>
                  <option value="UTC -04:00 (Eastern Time)">UTC -04:00 (Eastern Time)</option>
                  <option value="UTC +00:00 (London)">UTC +00:00 (London)</option>
                  <option value="UTC +05:30 (India Standard)">UTC +05:30 (India Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Interface Theme</label>
                <select
                  defaultValue={adminProfile.theme}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="Dark Navy">Dark Navy (#0B132B)</option>
                  <option value="High Contrast">High Contrast Enterprise</option>
                </select>
              </div>
            </div>

            {/* Security & MFA Settings (Screen 09 spec) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-[#0B132B] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Multi-Factor Authentication & Session Tokens</span>
              </h4>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0B132B]">Hardware / Authenticator App (TOTP)</div>
                  <div className="text-[11px] text-slate-500">Enforce 6-digit one-time code for sensitive mutations and user suspensions</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mfaStatus}
                    onChange={(e) => setMfaStatus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0B132B]">Active Admin Sessions ({adminProfile.activeSessionsCount})</div>
                  <div className="text-[11px] text-slate-500">2 desktop sessions (San Francisco, New York) and 1 mobile token</div>
                </div>
                <button
                  type="button"
                  onClick={() => alert('All other operator sessions terminated.')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Revoke Other Sessions
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-white text-xs font-bold hover:bg-[#1C2541] transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Save Profile Preferences</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
