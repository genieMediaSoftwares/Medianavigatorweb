import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Send, 
  UserCheck, 
  Building,
  Tag,
  Plus
} from 'lucide-react';
import { useAdmin } from '../../app/providers/AdminContext';
import { AdminSupportTicket, TicketStatus, TicketPriority } from './types';

export const AdminSupportFeedback: React.FC = () => {
  const { tickets, updateTicketStatus, updateTicketPriority, addTicketInternalNote, createSupportTicket, currentRole } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [internalNoteInput, setInternalNoteInput] = useState('');

  // Create ticket state
  const [modalOpen, setModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCustomerMessage, setNewCustomerMessage] = useState('');
  const [newCategory, setNewCategory] = useState<AdminSupportTicket['category']>('Platform Sync Issue');
  const [newPriority, setNewPriority] = useState<TicketPriority>('high');
  const [newUserName, setNewUserName] = useState('Workspace Creator');
  const [newUserEmail, setNewUserEmail] = useState('creator@workspace.io');

  const filteredTickets = tickets.filter((t) => {
    const matchSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newCustomerMessage.trim()) return;

    createSupportTicket({
      userId: `usr_${Date.now()}`,
      userName: newUserName,
      userEmail: newUserEmail,
      workspace: 'Active Workspace',
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'open',
      assignedAdmin: 'Super Admin',
      customerMessage: newCustomerMessage,
    });

    setNewSubject('');
    setNewCustomerMessage('');
    setModalOpen(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !internalNoteInput.trim()) return;

    addTicketInternalNote(selectedTicket.id, internalNoteInput.trim());
    setSelectedTicket(prev => prev ? {
      ...prev,
      internalNotes: [
        ...prev.internalNotes,
        {
          author: 'Admin Operator',
          timestamp: 'Just now',
          note: internalNoteInput.trim(),
        },
      ],
    } : null);
    setInternalNoteInput('');
  };

  const isReadOnly = currentRole === 'read_only' || currentRole === 'finance' || currentRole === 'content_trend';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight">
            Support & Feedback Triage (Core Workflow 4)
          </h2>
          <p className="text-xs text-stone-500">
            Handle creator technical inquiries, platform OAuth failures, billing disputes, and feature feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 font-medium shadow-xs">
            {tickets.filter(t => t.status === 'open').length} Open Issues
          </span>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-ink-soft transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-brand-300" />
            <span>Log Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ticket #, subject, or creator name..."
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
            <option value="all">All Ticket Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_user">Waiting on User</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Ticket Table & Ticket Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`p-5 rounded-2xl bg-white border border-stone-200 shadow-xs ${selectedTicket ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-xs">
                  <th className="pb-3">Ticket ID & Subject</th>
                  <th className="pb-3">Creator & Workspace</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Assigned</th>
                  <th className="pb-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTickets.map((tkt) => (
                  <tr 
                    key={tkt.id}
                    onClick={() => setSelectedTicket(tkt)}
                    className={`hover:bg-stone-50/70 cursor-pointer transition-colors ${
                      selectedTicket?.id === tkt.id ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3">
                      <div className="font-mono text-xs font-bold text-stone-600">{tkt.ticketNumber}</div>
                      <div className="font-bold text-ink line-clamp-1">{tkt.subject}</div>
                    </td>

                    <td className="py-3">
                      <div className="font-medium text-stone-800">{tkt.userName}</div>
                      <div className="text-xs text-stone-400">{tkt.workspace}</div>
                    </td>

                    <td className="py-3">
                      <span className="font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded text-xs">
                        {tkt.category}
                      </span>
                    </td>

                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        tkt.priority === 'critical' || tkt.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                        tkt.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {tkt.priority}
                      </span>
                    </td>

                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        tkt.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                        tkt.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {tkt.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 text-xs font-medium text-stone-700">
                      {tkt.assignedAdmin}
                    </td>

                    <td className="py-3 text-right text-xs text-stone-500">
                      {tkt.lastUpdated}
                    </td>
                  </tr>
                ))}

                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <div className="text-xs font-bold text-stone-700">Support & Feedback Queue Clear</div>
                      <div className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                        0 open support tickets. Inbound platform error reports or creator inquiries will appear here in real-time.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Ticket Drawer (Workflow 4: Handle Support Ticket) */}
        {selectedTicket && (
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-md space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold uppercase text-stone-400 tracking-wider">
                  Ticket #{selectedTicket.ticketNumber}
                </span>
                <h3 className="text-base font-bold text-ink">{selectedTicket.subject}</h3>
                <div className="text-xs text-stone-500">From: {selectedTicket.userName} ({selectedTicket.userEmail})</div>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {/* Customer Message Box */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
              <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Creator Inquiry</span>
              <p className="text-xs text-stone-800 leading-relaxed">{selectedTicket.customerMessage}</p>
            </div>

            {/* Ticket Management Controls */}
            {!isReadOnly && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Status</label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => {
                      updateTicketStatus(selectedTicket.id, e.target.value as any);
                      setSelectedTicket(prev => prev ? { ...prev, status: e.target.value as any } : null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-800 bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_user">Waiting on User</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 font-bold mb-1">Priority</label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => {
                      updateTicketPriority(selectedTicket.id, e.target.value as any);
                      setSelectedTicket(prev => prev ? { ...prev, priority: e.target.value as any } : null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-800 bg-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            )}

            {/* Internal Audit Notes Stream */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                Internal Operator Notes ({selectedTicket.internalNotes.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedTicket.internalNotes.map((n, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-bold text-blue-950">{n.author}</span>
                      <span>{n.timestamp}</span>
                    </div>
                    <p className="text-stone-700">{n.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Internal Note */}
            {!isReadOnly && (
              <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-stone-100">
                <textarea
                  value={internalNoteInput}
                  onChange={(e) => setInternalNoteInput(e.target.value)}
                  placeholder="Record internal troubleshooting steps, OAuth tokens refreshed, or resolution notes..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-ink text-white text-xs font-bold hover:bg-ink-soft transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-brand-300" />
                  <span>Save Internal Note</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Modal for Logging Support Ticket */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-base font-bold text-ink">Log Creator Support Incident</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Issue Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. YouTube Data API 403 Forbidden Quota Exceeded"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Inquiry / Error Description</label>
                <textarea
                  value={newCustomerMessage}
                  onChange={(e) => setNewCustomerMessage(e.target.value)}
                  placeholder="Describe the platform error, affected workspace, or requested feature..."
                  rows={3}
                  required
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs text-ink focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
                  >
                    <option value="Platform Sync Issue">Platform Sync Issue</option>
                    <option value="Billing & Invoice">Billing & Invoice</option>
                    <option value="AI Insights Feedback">AI Insights Feedback</option>
                    <option value="Security / OAuth">Security / OAuth</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">User Name</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">User Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-ink"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-ink text-white hover:bg-ink-soft shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-300" />
                  <span>Register Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
