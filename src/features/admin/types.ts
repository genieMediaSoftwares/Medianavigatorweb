export type AdminRole = 
  | 'super_admin'
  | 'operations'
  | 'support'
  | 'content_trend'
  | 'finance'
  | 'read_only';

export type AdminTab = 
  | 'dashboard'
  | 'users'
  | 'social_accounts'
  | 'trend_management'
  | 'subscriptions'
  | 'notifications'
  | 'support_feedback'
  | 'audit_logs';

export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deactivated';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Creator' | 'Enterprise Agency' | 'Brand Manager' | 'Team Member';
  status: UserStatus;
  joinedAt: string;
  lastActive: string;
  connectedPlatforms: ('instagram' | 'youtube' | 'facebook' | 'linkedin')[];
  workspaceName: string;
  plan: 'Enterprise Pro' | 'Creator Plus' | 'Growth Starter' | 'Custom Agency';
  monthlySpend: number;
  riskScore: 'Low' | 'Medium' | 'High';
}

export type SocialSyncStatus = 'healthy' | 'warning' | 'failed' | 'expired' | 'rate_limited';

export interface AdminSocialAccountRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  platform: 'instagram' | 'youtube' | 'facebook' | 'linkedin';
  accountHandle: string;
  accountId: string;
  authType: 'OAuth 2.0 PKCE' | 'Data API Key' | 'Meta System Token';
  status: SocialSyncStatus;
  lastSyncAt: string;
  tokenExpiresIn: string;
  errorMessage?: string;
  errorCode?: string;
  dataPointsIngested: number;
  autoSyncEnabled: boolean;
}

export type TrendStatus = 'pending_review' | 'approved' | 'rejected' | 'flagged';

export interface AdminTrendItem {
  id: string;
  title: string;
  category: 'Format Velocity' | 'Audio / Sound' | 'Hook Pattern' | 'Niche Viral' | 'Hashtag Movement';
  platform: 'instagram' | 'youtube' | 'cross_platform';
  sourceFreshness: 'Live (2h ago)' | 'Emerging (6h ago)' | 'Verified (1d ago)' | 'Stale (4d ago)';
  confidenceScore: number; // 0 - 100
  sampleVolume: number;
  status: TrendStatus;
  detectedAt: string;
  submittedBy: 'AI Trend Scraper' | 'Growth Team' | 'Community Submission';
  reviewNotes?: string;
  recommendedAction: string;
}

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved';

export interface AdminSupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  workspace: string;
  subject: string;
  category: 'Platform Sync Issue' | 'Billing & Invoice' | 'AI Insights Feedback' | 'Feature Request' | 'Security / OAuth';
  priority: TicketPriority;
  status: TicketStatus;
  assignedAdmin: string;
  createdAt: string;
  lastUpdated: string;
  internalNotes: { author: string; timestamp: string; note: string }[];
  customerMessage: string;
}

export interface AdminSubscriptionRecord {
  id: string;
  workspaceId: string;
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  planName: 'Enterprise Pro' | 'Creator Plus' | 'Growth Starter';
  amount: number;
  currency: 'USD';
  billingInterval: 'Monthly' | 'Annual';
  gateway: 'Stripe Connect' | 'Razorpay' | 'Wire Invoiced';
  gatewayStatus: 'Paid' | 'Past Due' | 'Payment Failed' | 'Refunded';
  currentPeriodEnd: string;
  seatsUsed: number;
  totalSeats: number;
  autoRenew: boolean;
}

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'security';

export interface AdminAuditLog {
  id: string;
  eventId: string;
  timestamp: string;
  actor: string;
  actorEmail: string;
  role: AdminRole;
  action: string;
  resource: string;
  result: 'Success' | 'Denied' | 'Failed' | 'Escalated';
  severity: AuditSeverity;
  ipAddress: string;
  location: string;
  workspace: string;
  metadata: Record<string, any>;
}

export interface AdminNotificationBroadcast {
  id: string;
  title: string;
  body: string;
  type: 'system_maintenance' | 'feature_release' | 'api_incident' | 'security_bulletin';
  targetAudience: 'All Users' | 'Enterprise Only' | 'YouTube Creators' | 'Instagram Accounts';
  scheduledFor: string;
  status: 'draft' | 'scheduled' | 'sent';
  deliveredCount?: number;
}
