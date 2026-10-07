import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AdminRole, 
  AdminTab, 
  AdminUserRecord, 
  AdminSocialAccountRecord, 
  AdminTrendItem, 
  AdminSupportTicket, 
  AdminSubscriptionRecord, 
  AdminAuditLog,
  AdminNotificationBroadcast,
  UserStatus,
  SocialSyncStatus,
  TrendStatus,
  TicketStatus,
  TicketPriority
} from '../../features/admin/types';
import { 
  INITIAL_ADMIN_USERS, 
  INITIAL_ADMIN_SOCIAL_ACCOUNTS, 
  INITIAL_ADMIN_TRENDS, 
  INITIAL_ADMIN_TICKETS, 
  INITIAL_ADMIN_SUBSCRIPTIONS, 
  INITIAL_ADMIN_AUDIT_LOGS,
  INITIAL_ADMIN_BROADCASTS 
} from '../../features/admin/mockData';
import { useMedia } from './MediaContext';

interface AdminContextType {
  currentTab: AdminTab;
  setCurrentTab: (tab: AdminTab) => void;
  currentRole: AdminRole;
  setCurrentRole: (role: AdminRole) => void;

  // Users
  users: AdminUserRecord[];
  updateUserStatus: (id: string, status: UserStatus) => void;
  deleteUser: (id: string) => void;

  // Social Accounts
  socialAccounts: AdminSocialAccountRecord[];
  triggerReauthSocial: (id: string) => void;
  disconnectSocial: (id: string) => void;

  // Trends
  trends: AdminTrendItem[];
  reviewTrend: (id: string, status: TrendStatus, notes?: string) => void;

  // Tickets
  tickets: AdminSupportTicket[];
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  updateTicketPriority: (id: string, priority: TicketPriority) => void;
  addTicketInternalNote: (id: string, note: string) => void;
  createSupportTicket: (ticket: Omit<AdminSupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'lastUpdated' | 'internalNotes'>) => void;

  // Subscriptions
  subscriptions: AdminSubscriptionRecord[];
  cancelSubscription: (id: string) => void;
  refundSubscription: (id: string) => void;

  // Audit Logs
  auditLogs: AdminAuditLog[];
  logAuditEvent: (event: Omit<AdminAuditLog, 'id' | 'eventId' | 'timestamp'>) => void;

  // Broadcast Notifications
  broadcasts: AdminNotificationBroadcast[];
  createBroadcast: (broadcast: Omit<AdminNotificationBroadcast, 'id' | 'deliveredCount'>) => void;

  // Admin Profile & Security
  adminProfile: {
    name: string;
    email: string;
    photoUrl: string;
    roleTitle: string;
    timezone: string;
    language: string;
    theme: 'Dark Navy' | 'High Contrast' | 'Enterprise Light';
    mfaEnabled: boolean;
    activeSessionsCount: number;
  };
  setAdminProfile: React.Dispatch<React.SetStateAction<any>>;

  // RBAC Permission Checker
  hasPermission: (module: AdminTab) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, connections, refreshConnections } = useMedia();

  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<AdminRole>('super_admin');

  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
  const [socialAccounts, setSocialAccounts] = useState<AdminSocialAccountRecord[]>(INITIAL_ADMIN_SOCIAL_ACCOUNTS);
  const [trends, setTrends] = useState<AdminTrendItem[]>(INITIAL_ADMIN_TRENDS);
  const [tickets, setTickets] = useState<AdminSupportTicket[]>(INITIAL_ADMIN_TICKETS);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRecord[]>(INITIAL_ADMIN_SUBSCRIPTIONS);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(INITIAL_ADMIN_AUDIT_LOGS);
  const [broadcasts, setBroadcasts] = useState<AdminNotificationBroadcast[]>(INITIAL_ADMIN_BROADCASTS);

  // Synchronize users and social streams with real live system state
  useEffect(() => {
    if (connections && connections.length > 0) {
      setSocialAccounts(connections.map((c) => {
        const isHealthy = c.connected && c.status !== 'sync_failed' && c.status !== 'permission_required';
        const isWarning = c.connected && c.status === 'permission_required';
        return {
          id: `soc_${c.platform}`,
          userId: 'usr_admin',
          userName: user?.fullName || 'Workspace Owner',
          userEmail: user?.email || 'admin@medianavigator.io',
          platform: c.platform,
          accountHandle: c.connected ? c.accountHandle : 'Not connected',
          accountId: c.accountInfo?.id || `api.${c.platform}.com`,
          authType: c.platform === 'youtube' ? 'Data API Key' : 'OAuth 2.0 PKCE',
          status: isHealthy ? 'healthy' : isWarning ? 'warning' : 'failed',
          lastSyncAt: c.lastSyncedAt || 'Awaiting sync',
          tokenExpiresIn: c.connected ? 'Active Token' : 'Not configured',
          errorMessage: !c.connected ? `No active ${c.name} credentials configured.` : undefined,
          errorCode: !c.connected ? 'AWAITING_AUTH' : undefined,
          dataPointsIngested: c.dataPointsCount || 0,
          autoSyncEnabled: c.connected,
        };
      }));

      // Reflect real connected platforms in the user record
      const connectedPlatforms = connections.filter(c => c.connected).map(c => c.platform);
      setUsers(prev => prev.map(u => ({
        ...u,
        connectedPlatforms,
        workspaceName: user?.organization || u.workspaceName,
      })));
    }
  }, [connections, user]);

  const [adminProfile, setAdminProfile] = useState({
    name: 'Chief Admin Officer',
    email: 'admin@medianavigator.io',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    roleTitle: 'Super Administrator & SecOps',
    timezone: 'UTC -07:00 (Pacific Time)',
    language: 'English (US)',
    theme: 'Dark Navy' as const,
    mfaEnabled: true,
    activeSessionsCount: 3,
  });

  const logAuditEvent = (event: Omit<AdminAuditLog, 'id' | 'eventId' | 'timestamp'>) => {
    const newLog: AdminAuditLog = {
      ...event,
      id: `aud_${Date.now()}`,
      eventId: `EVT-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const updateUserStatus = (id: string, status: UserStatus) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: `USER_STATUS_UPDATED_${status.toUpperCase()}`,
      resource: `User: ${id}`,
      result: 'Success',
      severity: status === 'suspended' || status === 'deactivated' ? 'warning' : 'info',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { targetUserId: id, newStatus: status },
    });
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'USER_DELETED_PERMANENTLY',
      resource: `User: ${id} (${target?.name || ''})`,
      result: 'Success',
      severity: 'critical',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { deletedUserId: id, email: target?.email },
    });
  };

  const triggerReauthSocial = (id: string) => {
    setSocialAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return {
          ...acc,
          status: 'healthy',
          lastSyncAt: 'Just now',
          errorMessage: undefined,
          errorCode: undefined,
        };
      }
      return acc;
    }));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'SOCIAL_ACCOUNT_REAUTH_DISPATCHED',
      resource: `SocialAccount: ${id}`,
      result: 'Success',
      severity: 'info',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { accountId: id },
    });
  };

  const disconnectSocial = (id: string) => {
    setSocialAccounts(prev => prev.filter(acc => acc.id !== id));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'SOCIAL_ACCOUNT_DISCONNECTED_BY_ADMIN',
      resource: `SocialAccount: ${id}`,
      result: 'Success',
      severity: 'warning',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { accountId: id },
    });
  };

  const reviewTrend = (id: string, status: TrendStatus, notes?: string) => {
    setTrends(prev => prev.map(t => t.id === id ? { ...t, status, reviewNotes: notes || t.reviewNotes } : t));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: `TREND_${status.toUpperCase()}`,
      resource: `Trend: ${id}`,
      result: 'Success',
      severity: 'info',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { trendId: id, status, notes },
    });
  };

  const updateTicketStatus = (id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, lastUpdated: 'Just now' } : t));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: `SUPPORT_TICKET_STATUS_${status.toUpperCase()}`,
      resource: `Ticket: ${id}`,
      result: 'Success',
      severity: 'info',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { ticketId: id, status },
    });
  };

  const updateTicketPriority = (id: string, priority: TicketPriority) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, priority, lastUpdated: 'Just now' } : t));
  };

  const addTicketInternalNote = (id: string, note: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          lastUpdated: 'Just now',
          internalNotes: [
            ...t.internalNotes,
            {
              author: adminProfile.name,
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
              note,
            },
          ],
        };
      }
      return t;
    }));
  };

  const cancelSubscription = (id: string) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, autoRenew: false } : s));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'SUBSCRIPTION_AUTORENEW_DISABLED',
      resource: `Subscription: ${id}`,
      result: 'Success',
      severity: 'warning',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { subId: id },
    });
  };

  const refundSubscription = (id: string) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, gatewayStatus: 'Refunded' } : s));
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'SUBSCRIPTION_PAYMENT_REFUNDED',
      resource: `Subscription: ${id}`,
      result: 'Success',
      severity: 'critical',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { subId: id },
    });
  };

  const createBroadcast = (broadcast: Omit<AdminNotificationBroadcast, 'id' | 'deliveredCount'>) => {
    const newBroadcast: AdminNotificationBroadcast = {
      ...broadcast,
      id: `brd_${Date.now()}`,
      deliveredCount: broadcast.status === 'sent' ? 3850 : 0,
    };
    setBroadcasts(prev => [newBroadcast, ...prev]);
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'ADMIN_BROADCAST_CREATED',
      resource: `Broadcast: ${newBroadcast.title}`,
      result: 'Success',
      severity: 'info',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { title: newBroadcast.title, audience: newBroadcast.targetAudience },
    });
  };

  const createSupportTicket = (ticket: Omit<AdminSupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'lastUpdated' | 'internalNotes'>) => {
    const newTicket: AdminSupportTicket = {
      ...ticket,
      id: `tkt_${Date.now()}`,
      ticketNumber: `NAV-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      lastUpdated: 'Just now',
      internalNotes: [
        {
          author: adminProfile.name,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          note: 'Ticket registered by Super Admin into operational triage queue.',
        }
      ],
    };
    setTickets(prev => [newTicket, ...prev]);
    logAuditEvent({
      actor: adminProfile.email,
      actorEmail: adminProfile.email,
      role: currentRole,
      action: 'SUPPORT_TICKET_CREATED',
      resource: `Ticket: ${newTicket.ticketNumber} (${newTicket.subject})`,
      result: 'Success',
      severity: 'info',
      ipAddress: '192.168.1.1',
      location: 'Admin Console',
      workspace: 'Global Admin',
      metadata: { ticketId: newTicket.id, priority: newTicket.priority, category: newTicket.category },
    });
  };

  // RBAC Permission: Super Admin has full unrestricted access across all 8 modules
  const hasPermission = (_module: AdminTab): boolean => {
    return true;
  };

  return (
    <AdminContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        currentRole,
        setCurrentRole,
        users,
        updateUserStatus,
        deleteUser,
        socialAccounts,
        triggerReauthSocial,
        disconnectSocial,
        trends,
        reviewTrend,
        tickets,
        updateTicketStatus,
        updateTicketPriority,
        addTicketInternalNote,
        createSupportTicket,
        subscriptions,
        cancelSubscription,
        refundSubscription,
        auditLogs,
        logAuditEvent,
        broadcasts,
        createBroadcast,
        adminProfile,
        setAdminProfile,
        hasPermission,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return ctx;
};
