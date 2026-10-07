import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Ban, 
  Trash2, 
  MoreVertical, 
  ExternalLink,
  Share2,
  Mail,
  Calendar,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { useAdmin } from '../../app/providers/AdminContext';
import { AdminUserRecord, UserStatus } from './types';

export const AdminUserManagement: React.FC = () => {
  const { users, updateUserStatus, deleteUser, currentRole } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'activate' | 'delete';
    user: AdminUserRecord | null;
  }>({ isOpen: false, action: 'suspend', user: null });

  const filteredUsers = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.workspaceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const handleActionClick = (user: AdminUserRecord, action: 'suspend' | 'activate' | 'delete') => {
    setConfirmModal({ isOpen: true, action, user });
  };

  const handleConfirmAction = () => {
    if (!confirmModal.user) return;
    if (confirmModal.action === 'suspend') {
      updateUserStatus(confirmModal.user.id, 'suspended');
    } else if (confirmModal.action === 'activate') {
      updateUserStatus(confirmModal.user.id, 'active');
    } else if (confirmModal.action === 'delete') {
      deleteUser(confirmModal.user.id);
      if (selectedUser?.id === confirmModal.user.id) setSelectedUser(null);
    }
    setConfirmModal({ isOpen: false, action: 'suspend', user: null });
  };

  const isReadOnly = currentRole === 'read_only';

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight">
            User Lifecycle Management (Core Workflow 1)
          </h2>
          <p className="text-xs text-stone-500">
            Audit user profiles, connected social channels, workspace plans, and account statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 font-medium shadow-xs">
            Total Users: <strong>{users.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or workspace..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="Creator">Creator</option>
            <option value="Brand Manager">Brand Manager</option>
            <option value="Enterprise Agency">Enterprise Agency</option>
          </select>
        </div>
      </div>

      {/* Main Table & Side Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table View */}
        <div className={`p-5 rounded-2xl bg-white border border-stone-200 shadow-xs ${selectedUser ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-xs">
                  <th className="pb-3">User & Workspace</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Connected Channels</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Last Active</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-stone-50/70 cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name} 
                          className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0" 
                        />
                        <div>
                          <div className="font-bold text-ink">{user.name}</div>
                          <div className="text-xs text-stone-500">{user.email}</div>
                          <div className="text-xs text-stone-400">Workspace: {user.workspaceName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3">
                      <span className="font-medium text-stone-700">{user.role}</span>
                    </td>

                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        user.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : user.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {user.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {user.connectedPlatforms.map((p) => (
                          <span 
                            key={p} 
                            className="px-1.5 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700 uppercase"
                          >
                            {p.slice(0, 2)}
                          </span>
                        ))}
                        {user.connectedPlatforms.length === 0 && (
                          <span className="text-xs text-stone-400">None</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3">
                      <span className="font-semibold text-blue-900">{user.plan}</span>
                      <div className="text-xs text-stone-500">${user.monthlySpend}/mo</div>
                    </td>

                    <td className="py-3 text-stone-500 text-xs">
                      {user.lastActive}
                    </td>

                    <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {!isReadOnly ? (
                        <div className="flex items-center justify-end gap-1">
                          {user.status === 'suspended' ? (
                            <button
                              onClick={() => handleActionClick(user, 'activate')}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                              title="Reactivate User"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActionClick(user, 'suspend')}
                              className="p-1 rounded text-amber-600 hover:bg-amber-50"
                              title="Suspend User"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleActionClick(user, 'delete')}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50"
                            title="Delete User Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No user records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected User Detail Drawer (Workflow 1: Review Profile) */}
        {selectedUser && (
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-md space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedUser.avatarUrl} 
                  alt={selectedUser.name} 
                  className="w-12 h-12 rounded-full object-cover border border-stone-200" 
                />
                <div>
                  <h3 className="text-base font-bold text-ink">{selectedUser.name}</h3>
                  <div className="text-xs text-stone-500">{selectedUser.email}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {/* Profile Attributes */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">User Status</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-xs ${
                  selectedUser.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedUser.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Workspace</span>
                <span className="font-bold text-ink">{selectedUser.workspaceName}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Subscription</span>
                <span className="font-bold text-blue-900">{selectedUser.plan} (${selectedUser.monthlySpend}/mo)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Risk Score</span>
                <span className={`font-bold ${
                  selectedUser.riskScore === 'Low' ? 'text-emerald-600' : selectedUser.riskScore === 'High' ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  {selectedUser.riskScore} Risk
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-500 font-medium">Joined Date</span>
                <span className="font-medium text-stone-700">{selectedUser.joinedAt}</span>
              </div>
            </div>

            {/* Connected Platforms */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                Authorized Platform Connections
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {['youtube', 'instagram', 'facebook', 'linkedin'].map((platform) => {
                  const isConn = selectedUser.connectedPlatforms.includes(platform as any);
                  return (
                    <div 
                      key={platform}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        isConn ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 font-semibold' : 'border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      <span className="capitalize">{platform}</span>
                      <span>{isConn ? 'Connected' : 'None'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            {!isReadOnly && (
              <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                {selectedUser.status === 'suspended' ? (
                  <button
                    onClick={() => handleActionClick(selectedUser, 'activate')}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Reactivate Account
                  </button>
                ) : (
                  <button
                    onClick={() => handleActionClick(selectedUser, 'suspend')}
                    className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                  >
                    Suspend User
                  </button>
                )}
                <button
                  onClick={() => handleActionClick(selectedUser, 'delete')}
                  className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mandatory Destructive Action Confirmation Dialog (Section 5 Spec) */}
      {confirmModal.isOpen && confirmModal.user && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-ink">
                Confirm {confirmModal.action.toUpperCase()} Action
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to <strong>{confirmModal.action}</strong> user <strong>{confirmModal.user.name}</strong> ({confirmModal.user.email})? 
              This will update access permissions across all connected workspaces and record an immutable event in the audit trail.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, action: 'suspend', user: null })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs ${
                  confirmModal.action === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-ink hover:bg-ink-soft'
                }`}
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
