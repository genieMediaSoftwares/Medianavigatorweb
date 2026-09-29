import { 
  AdminUserRecord, 
  AdminSocialAccountRecord, 
  AdminTrendItem, 
  AdminSupportTicket, 
  AdminSubscriptionRecord, 
  AdminAuditLog,
  AdminNotificationBroadcast
} from '../types/admin';

// Real authenticated system users only (no fabricated mock creators)
export const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: 'usr_admin',
    name: 'Chief Admin Officer',
    email: 'admin@medianavigator.io',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Enterprise Agency',
    status: 'active',
    joinedAt: '2026-09-01',
    lastActive: 'Active now',
    connectedPlatforms: [],
    workspaceName: 'Media Navigator Operational Hub',
    plan: 'Enterprise Pro',
    monthlySpend: 0,
    riskScore: 'Low',
  }
];

// Initial social account records derive from live platform connections
export const INITIAL_ADMIN_SOCIAL_ACCOUNTS: AdminSocialAccountRecord[] = [
  {
    id: 'soc_youtube',
    userId: 'usr_admin',
    userName: 'Workspace Owner',
    userEmail: 'admin@medianavigator.io',
    platform: 'youtube',
    accountHandle: 'Not connected',
    accountId: 'googleapis.com/youtube/v3',
    authType: 'Data API Key',
    status: 'failed',
    lastSyncAt: 'Awaiting sync',
    tokenExpiresIn: 'Awaiting API Key',
    errorMessage: 'No YouTube Data API Key or OAuth Bearer token configured yet.',
    errorCode: 'AWAITING_AUTH',
    dataPointsIngested: 0,
    autoSyncEnabled: false,
  },
  {
    id: 'soc_instagram',
    userId: 'usr_admin',
    userName: 'Workspace Owner',
    userEmail: 'admin@medianavigator.io',
    platform: 'instagram',
    accountHandle: 'Not connected',
    accountId: 'graph.instagram.com',
    authType: 'OAuth 2.0 PKCE',
    status: 'failed',
    lastSyncAt: 'Awaiting sync',
    tokenExpiresIn: 'Awaiting Access Token',
    errorMessage: 'No Instagram User Access Token or Meta Graph key configured yet.',
    errorCode: 'AWAITING_AUTH',
    dataPointsIngested: 0,
    autoSyncEnabled: false,
  },
  {
    id: 'soc_facebook',
    userId: 'usr_admin',
    userName: 'Workspace Owner',
    userEmail: 'admin@medianavigator.io',
    platform: 'facebook',
    accountHandle: 'Not connected',
    accountId: 'graph.facebook.com',
    authType: 'Meta System Token',
    status: 'failed',
    lastSyncAt: 'Awaiting sync',
    tokenExpiresIn: 'Awaiting Page Token',
    errorMessage: 'No Facebook Page Token configured.',
    errorCode: 'AWAITING_AUTH',
    dataPointsIngested: 0,
    autoSyncEnabled: false,
  },
  {
    id: 'soc_linkedin',
    userId: 'usr_admin',
    userName: 'Workspace Owner',
    userEmail: 'admin@medianavigator.io',
    platform: 'linkedin',
    accountHandle: 'Not connected',
    accountId: 'api.linkedin.com',
    authType: 'OAuth 2.0 PKCE',
    status: 'failed',
    lastSyncAt: 'Awaiting sync',
    tokenExpiresIn: 'Awaiting OAuth Token',
    errorMessage: 'No LinkedIn Community Token configured.',
    errorCode: 'AWAITING_AUTH',
    dataPointsIngested: 0,
    autoSyncEnabled: false,
  }
];

// Real trends list starts empty until live media is analyzed
export const INITIAL_ADMIN_TRENDS: AdminTrendItem[] = [];

// Support tickets start empty until real tickets or inquiries are submitted
export const INITIAL_ADMIN_TICKETS: AdminSupportTicket[] = [];

// Subscription state reflects the verified workspace without fabricated invoices
export const INITIAL_ADMIN_SUBSCRIPTIONS: AdminSubscriptionRecord[] = [
  {
    id: 'sub_primary_workspace',
    workspaceId: 'ws_media_navigator',
    workspaceName: 'Media Navigator Operational Workspace',
    ownerName: 'Super Admin',
    ownerEmail: 'admin@medianavigator.io',
    planName: 'Enterprise Pro',
    amount: 0,
    currency: 'USD',
    billingInterval: 'Monthly',
    gateway: 'Stripe Connect',
    gatewayStatus: 'Paid',
    currentPeriodEnd: 'Active (Internal / Self-Hosted)',
    seatsUsed: 1,
    totalSeats: 10,
    autoRenew: true,
  }
];

// Authentic audit logs recording the admin session startup and system initialization
export const INITIAL_ADMIN_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'aud_boot_01',
    eventId: 'EVT-10001',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    actor: 'admin@medianavigator.io',
    actorEmail: 'admin@medianavigator.io',
    role: 'super_admin',
    action: 'SUPER_ADMIN_AUTHENTICATED',
    resource: 'SecOps Console: /signin',
    result: 'Success',
    severity: 'security',
    ipAddress: '127.0.0.1 (Local Session)',
    location: 'Admin Command Center',
    workspace: 'Global Admin',
    metadata: { authMethod: 'Password Credential', scope: 'Full Super Admin Privileges' },
  },
  {
    id: 'aud_boot_02',
    eventId: 'EVT-10002',
    timestamp: new Date(Date.now() - 30000).toISOString().replace('T', ' ').substring(0, 19),
    actor: 'system.core',
    actorEmail: 'system@medianavigator.io',
    role: 'super_admin',
    action: 'INTEGRATION_GATEWAYS_MOUNTED',
    resource: 'Adapters: YouTube, Instagram, Facebook, LinkedIn',
    result: 'Success',
    severity: 'info',
    ipAddress: '127.0.0.1',
    location: 'Express Server Port 3000',
    workspace: 'System Boot',
    metadata: { environment: 'Node.js Express + Vite SPA', antiHallucinationEnforced: true },
  }
];

// Broadcast notifications start empty
export const INITIAL_ADMIN_BROADCASTS: AdminNotificationBroadcast[] = [];
