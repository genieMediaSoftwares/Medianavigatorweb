import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  ArrowUpRight, 
  RefreshCw,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AdminSubscriptionRecord } from '../../types/admin';

export const AdminSubscriptions: React.FC = () => {
  const { subscriptions, cancelSubscription, refundSubscription, currentRole } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [gatewayStatusFilter, setGatewayStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedSub, setSelectedSub] = useState<AdminSubscriptionRecord | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'cancel' | 'refund';
    sub: AdminSubscriptionRecord | null;
  }>({ isOpen: false, action: 'cancel', sub: null });

  const filteredSubs = subscriptions.filter((s) => {
    const matchSearch = s.workspaceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = gatewayStatusFilter === 'all' || s.gatewayStatus === gatewayStatusFilter;
    const matchPlan = planFilter === 'all' || s.planName === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const totalMRR = subscriptions.reduce((sum, s) => s.gatewayStatus === 'Paid' ? sum + s.amount : sum, 0);
  const pastDueCount = subscriptions.filter(s => s.gatewayStatus === 'Payment Failed' || s.gatewayStatus === 'Past Due').length;

  const handleConfirmAction = () => {
    if (!confirmModal.sub) return;
    if (confirmModal.action === 'cancel') {
      cancelSubscription(confirmModal.sub.id);
    } else if (confirmModal.action === 'refund') {
      refundSubscription(confirmModal.sub.id);
    }
    setConfirmModal({ isOpen: false, action: 'cancel', sub: null });
  };

  const isReadOnly = currentRole === 'read_only' || currentRole === 'support' || currentRole === 'content_trend';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0B132B] tracking-tight">
            Subscriptions & Billing Operations (Core Workflow 5)
          </h2>
          <p className="text-xs text-slate-500">
            Audit Stripe Connect & Wire gateways, investigate payment failures, manage billing contracts, and issue refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold shadow-xs">
            MRR: ${totalMRR.toLocaleString()} USD
          </div>
          {pastDueCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold shadow-xs flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{pastDueCount} Past Due</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workspace, customer name, or email..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#0B132B] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={gatewayStatusFilter}
            onChange={(e) => setGatewayStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="all">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Payment Failed">Payment Failed</option>
            <option value="Past Due">Past Due</option>
            <option value="Refunded">Refunded</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="all">All Plans</option>
            <option value="Enterprise Pro">Enterprise Pro</option>
            <option value="Creator Plus">Creator Plus</option>
            <option value="Growth Starter">Growth Starter</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Subscriptions Table & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-xs ${selectedSub ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="pb-3">Workspace & Customer</th>
                  <th className="pb-3">Plan & Tier</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Gateway</th>
                  <th className="pb-3">Payment Status</th>
                  <th className="pb-3">Renewal Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub) => (
                  <tr 
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className={`hover:bg-slate-50/70 cursor-pointer transition-colors ${
                      selectedSub?.id === sub.id ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3">
                      <div className="font-bold text-[#0B132B]">{sub.workspaceName}</div>
                      <div className="text-[11px] text-slate-500">{sub.ownerName} ({sub.ownerEmail})</div>
                    </td>

                    <td className="py-3">
                      <span className="font-semibold text-blue-900">{sub.planName}</span>
                      <div className="text-[10px] text-slate-400">{sub.seatsUsed} / {sub.totalSeats} seats</div>
                    </td>

                    <td className="py-3 font-bold text-slate-800">
                      ${sub.amount} <span className="text-[10px] font-normal text-slate-400">/{sub.billingInterval.toLowerCase()}</span>
                    </td>

                    <td className="py-3">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {sub.gateway}
                      </span>
                    </td>

                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sub.gatewayStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        sub.gatewayStatus === 'Payment Failed' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {sub.gatewayStatus}
                      </span>
                    </td>

                    <td className="py-3 text-[11px] text-slate-600">
                      {sub.currentPeriodEnd}
                    </td>

                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, action: 'refund', sub })}
                            className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold"
                          >
                            Refund
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No subscription billing records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Subscription Drawer (Workflow 5: Subscription Issue) */}
        {selectedSub && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Subscription & Gateway Audit
                </span>
                <h3 className="text-base font-bold text-[#0B132B]">{selectedSub.workspaceName}</h3>
                <div className="text-xs text-slate-500">{selectedSub.ownerEmail}</div>
              </div>
              <button 
                onClick={() => setSelectedSub(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Gateway Status</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  selectedSub.gatewayStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedSub.gatewayStatus}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Payment Provider</span>
                <span className="font-bold text-[#0B132B]">{selectedSub.gateway}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Recurring Plan</span>
                <span className="font-bold text-blue-900">{selectedSub.planName} (${selectedSub.amount} / {selectedSub.billingInterval})</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Allocated Seats</span>
                <span className="font-medium text-slate-700">{selectedSub.seatsUsed} utilized of {selectedSub.totalSeats} seats</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Current Period Ends</span>
                <span className="font-medium text-slate-700">{selectedSub.currentPeriodEnd}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Auto-Renew Policy</span>
                <span className={`font-bold ${selectedSub.autoRenew ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {selectedSub.autoRenew ? 'Active (Card On File)' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Billing Action Controls */}
            {!isReadOnly && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => setConfirmModal({ isOpen: true, action: 'refund', sub: selectedSub })}
                  className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-colors shadow-xs"
                >
                  Issue Authorized Refund via {selectedSub.gateway}
                </button>
                <button
                  onClick={() => setConfirmModal({ isOpen: true, action: 'cancel', sub: selectedSub })}
                  className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Disable Auto-Renew & Downgrade
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.sub && (
        <div className="fixed inset-0 z-50 bg-[#0B132B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-[#0B132B]">
                Confirm Billing {confirmModal.action.toUpperCase()}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to <strong>{confirmModal.action}</strong> subscription for <strong>{confirmModal.sub.workspaceName}</strong> (${confirmModal.sub.amount} {confirmModal.sub.currency})? 
              This will record a financial mutation in the audit log and trigger an automated notification to {confirmModal.sub.ownerEmail}.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, action: 'cancel', sub: null })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              >
                Confirm {confirmModal.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
