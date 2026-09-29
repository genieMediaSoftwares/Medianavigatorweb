import React, { useState } from 'react';
import { 
  Users, 
  Share2, 
  TrendingUp, 
  CreditCard, 
  HelpCircle, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  UserCheck
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { 
  AdminUserRecord, 
  AdminSocialAccountRecord, 
  AdminTrendItem, 
  AdminSupportTicket, 
  AdminSubscriptionRecord, 
  AdminAuditLog 
} from '../../types/admin';

export const AdminDashboardOverview: React.FC = () => {
  const { 
    users, 
    socialAccounts, 
    trends, 
    tickets, 
    subscriptions, 
    auditLogs, 
    setCurrentTab,
    triggerReauthSocial,
    reviewTrend
  } = useAdmin();

  const [filterPeriod, setFilterPeriod] = useState<'24h' | '7d' | '30d'>('24h');

  // Computed metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u: AdminUserRecord) => u.status === 'active').length;
  const failedAccounts = socialAccounts.filter((s: AdminSocialAccountRecord) => s.status === 'failed' || s.status === 'warning');
  const pendingTrends = trends.filter((t: AdminTrendItem) => t.status === 'pending_review');
  const openTickets = tickets.filter((t: AdminSupportTicket) => t.status === 'open' || t.status === 'in_progress');
  const criticalTickets = tickets.filter((t: AdminSupportTicket) => t.priority === 'critical' || t.priority === 'high');
  const mrr = subscriptions.reduce((sum: number, s: AdminSubscriptionRecord) => s.gatewayStatus === 'Paid' ? sum + s.amount : sum, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-[#1C2541] text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
              OPERATIONAL COMMAND ACTIVE
            </span>
            <span className="text-xs text-slate-300">• Live Platform Audit Running</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Media Navigator Administrative Operations
          </h2>
          <p className="text-xs text-slate-300">
            Real-time governance over multi-platform social connections, user lifecycles, trend quality, and billing integrity.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('social_accounts')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{failedAccounts.length} Connection Alerts</span>
          </button>
          <button
            onClick={() => setCurrentTab('trend_management')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/30 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>{pendingTrends.length} Pending Trends</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div 
          onClick={() => setCurrentTab('users')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-[#00F0FF]/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0284C7] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0B132B]">{totalUsers}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{activeUsers} Active Creators & Agencies</span>
          </div>
        </div>

        {/* Failed / At-Risk Social Connections */}
        <div 
          onClick={() => setCurrentTab('social_accounts')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Social Integrations</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0B132B]">{socialAccounts.length} Connected</div>
          <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{failedAccounts.length} Require Immediate Re-Auth</span>
          </div>
        </div>

        {/* Trend Approvals */}
        <div 
          onClick={() => setCurrentTab('trend_management')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Trends</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0B132B]">{pendingTrends.length} Pending</div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting editorial review</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div 
          onClick={() => setCurrentTab('subscriptions')}
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Run-Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0B132B]">${mrr.toLocaleString()} /mo</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Stripe & Wire Auto-Invoiced</span>
          </div>
        </div>
      </div>

      {/* Two Column Operational Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pane 1: Priority Operational Workflows (Core Workflows 1, 2, 4) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#0B132B]">Critical Incidents & Triage</h3>
              <p className="text-[11px] text-slate-500">Accounts experiencing API token expiration or auth failures</p>
            </div>
            <button
              onClick={() => setCurrentTab('social_accounts')}
              className="text-xs text-[#0284C7] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {failedAccounts.map((acc: AdminSocialAccountRecord) => (
              <div 
                key={acc.id}
                className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                      {acc.platform}
                    </span>
                    <span className="text-xs font-bold text-[#0B132B]">{acc.accountHandle}</span>
                    <span className="text-[11px] text-slate-500">({acc.userName})</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    {acc.errorMessage || 'Token requires immediate re-authorization.'}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    Last sync: {acc.lastSyncAt} • Error Code: <code className="bg-white px-1 py-0.5 rounded border border-rose-200">{acc.errorCode || 'ERR_SYNC'}</code>
                  </div>
                </div>

                <button
                  onClick={() => triggerReauthSocial(acc.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0B132B] text-white hover:bg-[#1C2541] transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <RefreshCw className="w-3 h-3 text-[#00F0FF]" />
                  <span>Re-Auth</span>
                </button>
              </div>
            ))}

            {failedAccounts.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <span>All connected social streams are syncing healthily without active errors.</span>
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: High-Priority Support Queue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#0B132B]">Support & Feedback Queue</h3>
              <p className="text-[11px] text-slate-500">{openTickets.length} open tickets ({criticalTickets.length} elevated priority)</p>
            </div>
            <button
              onClick={() => setCurrentTab('support_feedback')}
              className="text-xs text-[#0284C7] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage Queue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tickets.slice(0, 3).map((tkt: AdminSupportTicket) => (
              <div 
                key={tkt.id}
                onClick={() => setCurrentTab('support_feedback')}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-600">{tkt.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      tkt.priority === 'critical' || tkt.priority === 'high' 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {tkt.priority}
                    </span>
                    <span className="text-xs font-bold text-[#0B132B] truncate max-w-[220px]">
                      {tkt.subject}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{tkt.createdAt}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-1">{tkt.customerMessage}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Creator: <strong>{tkt.userName}</strong> ({tkt.workspace})</span>
                  <span>Assigned: <strong>{tkt.assignedAdmin}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Stream Preview (Core Workflow 6) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-[#0B132B]">Recent Security & Audit Trail</h3>
            <p className="text-[11px] text-slate-500">Immutable record of administrator actions, status changes, and billing mutations</p>
          </div>
          <button
            onClick={() => setCurrentTab('audit_logs')}
            className="text-xs text-[#0284C7] font-semibold hover:underline flex items-center gap-1"
          >
            <span>Full Audit Logs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="pb-2.5">Event ID</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Actor</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Resource</th>
                <th className="pb-2.5">Severity</th>
                <th className="pb-2.5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 4).map((log: AdminAuditLog) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 font-mono text-[11px] font-semibold text-slate-600">{log.eventId}</td>
                  <td className="py-2.5 text-slate-500">{log.timestamp}</td>
                  <td className="py-2.5 font-medium text-[#0B132B]">{log.actor}</td>
                  <td className="py-2.5 font-mono text-[11px] text-blue-700">{log.action}</td>
                  <td className="py-2.5 text-slate-600 truncate max-w-xs">{log.resource}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.severity === 'critical' || log.severity === 'security'
                        ? 'bg-rose-100 text-rose-700'
                        : log.severity === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="font-semibold text-emerald-600">{log.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
