import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  NavigationTab, 
  PlatformType, 
  NormalizedMedia, 
  PlatformConnection, 
  AlertItem,
  AppViewMode,
  BrandProfile,
  UserAccount,
  ReportItem
} from '../../types';
import { api } from '../../services/api';

export interface NotificationItem {
  id: string;
  type: 'sync_completed' | 'sync_failed' | 'reauth_required' | 'new_insight' | 'report_ready' | 'trend_ready' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetTab?: NavigationTab;
}

export interface SyncState {
  isOpen: boolean;
  platform?: PlatformType | 'all';
  step: number;
  isSyncing: boolean;
  isCompleted: boolean;
  accountName?: string;
  syncedCount?: number;
  errorMessage?: string;
}

interface MediaContextType {
  appView: AppViewMode;
  setAppView: (view: AppViewMode) => void;
  user: UserAccount;
  setUser: (user: UserAccount) => void;
  brandProfile: BrandProfile;
  setBrandProfile: (profile: BrandProfile) => void;
  workspaces: string[];
  currentWorkspace: string;
  setCurrentWorkspace: (ws: string) => void;
  
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedPlatform: 'all' | PlatformType;
  setSelectedPlatform: (p: 'all' | PlatformType) => void;
  timeframe: string;
  setTimeframe: (t: string) => void;
  activeMedia: NormalizedMedia | null;
  setActiveMedia: (media: NormalizedMedia | null) => void;
  connections: PlatformConnection[];
  refreshConnections: () => Promise<void>;
  alerts: AlertItem[];
  unreadAlertCount: number;
  isNavigating: boolean;
  navigationStep: string;
  triggerMediaNavigation: () => void;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;

  // Modals & Flows
  syncState: SyncState;
  startSyncFlow: (platform?: PlatformType | 'all', accountName?: string) => Promise<void>;
  closeSyncFlow: () => void;
  onboardingPlatform: PlatformType | null;
  setOnboardingPlatform: (p: PlatformType | null) => void;
  permissionReviewPlatform: PlatformType | null;
  setPermissionReviewPlatform: (p: PlatformType | null) => void;

  // Reports
  reports: ReportItem[];
  generateReport: (period: string, platforms: string[]) => Promise<ReportItem>;

  // Auth actions
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<UserAccount>) => Promise<boolean>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialAppView = (): AppViewMode => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const viewParam = searchParams.get('view');
      if (viewParam === 'app' || viewParam === 'signin' || viewParam === 'signup' || viewParam === 'landing') {
        return viewParam as AppViewMode;
      }
      if (window.location.hash === '#workspace' || window.location.hash === '#dashboard') {
        return 'app';
      }
    }
    return 'landing';
  };

  const [appView, setAppView] = useState<AppViewMode>(getInitialAppView);
  
  const [user, setUser] = useState<UserAccount>({
    fullName: 'Alex Vance',
    email: 'alex@medianavigator.app',
    organization: 'My Media Workspace',
    accountType: 'Creator',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  });

  const [brandProfile, setBrandProfile] = useState<BrandProfile>({
    brandName: 'My Media Channel',
    niche: 'Digital Media, Content & Creator Strategy',
    targetAudience: 'Engaged audience and modern community',
    primaryLocation: 'Global / North America',
    mainGoal: 'Increase reach and scale viral organic engagement',
    currentExperience: 'Active social media creator',
    preferredFormats: ['reel', 'carousel', 'video'],
  });

  const [workspaces, setWorkspaces] = useState<string[]>([
    'Primary Workspace',
    'Marketing Team',
    'Creator Studio'
  ]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('Primary Workspace');

  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | PlatformType>('all');
  const [timeframe, setTimeframe] = useState<string>('Last 7 days');
  const [activeMedia, setActiveMedia] = useState<NormalizedMedia | null>(null);
  const defaultConnections: PlatformConnection[] = [
    {
      platform: 'instagram',
      name: 'Instagram',
      accountHandle: 'Not connected',
      connected: false,
      lastSyncedAt: '',
      status: 'not_connected',
      statusMessage: 'Connect Instagram to start analyzing your media.',
      primaryStrength: 'Reels, visual carousels & reach',
      dataPointsCount: 0,
    },
    {
      platform: 'youtube',
      name: 'YouTube',
      accountHandle: 'Not connected',
      connected: false,
      lastSyncedAt: '',
      status: 'not_connected',
      statusMessage: 'Connect YouTube to start analyzing your media.',
      primaryStrength: 'Shorts & video retention',
      dataPointsCount: 0,
    },
    {
      platform: 'facebook',
      name: 'Facebook',
      accountHandle: 'Not connected',
      connected: false,
      lastSyncedAt: '',
      status: 'not_connected',
      statusMessage: 'Connect Facebook to start analyzing your media.',
      primaryStrength: 'Page posts & viral sharing',
      dataPointsCount: 0,
    },
    {
      platform: 'linkedin',
      name: 'LinkedIn',
      accountHandle: 'Not connected',
      connected: false,
      lastSyncedAt: '',
      status: 'not_connected',
      statusMessage: 'Connect LinkedIn to start analyzing your media.',
      primaryStrength: 'Professional network & B2B feeds',
      dataPointsCount: 0,
    },
  ];

  const [connections, setConnections] = useState<PlatformConnection[]>(defaultConnections);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navigationStep, setNavigationStep] = useState<string>('Collecting signals');
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Notifications (Populated only on real events)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Sync Flow Modal
  const [syncState, setSyncState] = useState<SyncState>({
    isOpen: false,
    step: 1,
    isSyncing: false,
    isCompleted: false,
  });

  const [onboardingPlatform, setOnboardingPlatform] = useState<PlatformType | null>(null);
  const [permissionReviewPlatform, setPermissionReviewPlatform] = useState<PlatformType | null>(null);

  // Reports (Generated strictly from verified media)
  const [reports, setReports] = useState<ReportItem[]>([]);

  const refreshConnections = useCallback(async () => {
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  }, []);

  useEffect(() => {
    refreshConnections();
    refreshAlerts();
  }, [refreshConnections, refreshAlerts]);

  const triggerMediaNavigation = useCallback(() => {
    setIsNavigating(true);
    const steps = [
      'Collecting signals',
      'Finding patterns',
      'Understanding performance',
      'Preparing insights',
    ];
    let stepIndex = 0;
    setNavigationStep(steps[0]);

    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setNavigationStep(steps[stepIndex]);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsNavigating(false);
          refreshConnections();
          refreshAlerts();
        }, 500);
      }
    }, 450);
  }, [refreshConnections, refreshAlerts]);

  const unreadAlertCount = alerts.filter(a => !a.read).length;
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Live Synchronizing Flow
  const startSyncFlow = async (platform: PlatformType | 'all' = 'all', accountName?: string) => {
    setSyncState({
      isOpen: true,
      platform,
      step: 1,
      isSyncing: true,
      isCompleted: false,
      accountName: accountName || (platform === 'all' ? 'All Channels' : `${platform}_account`),
      syncedCount: 0,
    });

    try {
      // Step 1: Connecting
      await new Promise(r => setTimeout(r, 350));
      setSyncState(prev => ({ ...prev, step: 2 }));

      // Step 2: Ingesting Profile
      await new Promise(r => setTimeout(r, 400));
      setSyncState(prev => ({ ...prev, step: 3 }));

      // Step 3: Fetching Media from API
      await new Promise(r => setTimeout(r, 450));
      setSyncState(prev => ({ ...prev, step: 4 }));

      // Step 4: Live Ingestion API call
      let realCount = 0;
      if (platform === 'all') {
        const syncRes = await api.syncAllConnections();
        realCount = syncRes.mediaCount || syncRes.media?.length || 0;
      } else {
        const syncRes = await api.syncConnection(platform);
        realCount = (syncRes as any).mediaCount || (syncRes as any).dataPointsCount || (syncRes as any).media?.length || 0;
      }

      // Step 5: Processing
      setSyncState(prev => ({ ...prev, step: 5, syncedCount: realCount }));
      await new Promise(r => setTimeout(r, 400));

      // Step 6: Computing AI Baselines
      setSyncState(prev => ({ ...prev, step: 6 }));
      await new Promise(r => setTimeout(r, 400));

      // Step 7: Completed
      setSyncState(prev => ({
        ...prev,
        step: 7,
        isSyncing: false,
        isCompleted: true,
        syncedCount: realCount,
      }));

      await refreshConnections();

      // Trigger a window event so any open views (Overview, Content, Intelligence) immediately re-fetch
      window.dispatchEvent(new CustomEvent('media-synced', { detail: { platform, count: realCount } }));

      addNotification({
        type: 'sync_completed',
        title: `${platform.toUpperCase()} Ingestion Complete`,
        message: `Successfully synchronized ${realCount} verified posts and live audience metrics.`,
        targetTab: 'content',
      });
    } catch (err: any) {
      console.error('Sync flow error:', err);
      setSyncState(prev => ({
        ...prev,
        step: 7,
        isSyncing: false,
        isCompleted: true,
        errorMessage: err.message || 'Sync encountered an issue.',
      }));
      await refreshConnections();
    }
  };

  const closeSyncFlow = () => {
    setSyncState(prev => ({ ...prev, isOpen: false }));
  };

  // Report generation strictly grounded in real verified media
  const generateReport = async (period: string, targetPlatforms: string[]): Promise<ReportItem> => {
    let allMedia: NormalizedMedia[] = [];
    try {
      allMedia = await api.getMedia();
    } catch {
      allMedia = [];
    }

    const filtered = allMedia.filter(m => targetPlatforms.includes(m.platform));
    const targetMedia = filtered.length > 0 ? filtered : allMedia;

    const totalViews = targetMedia.reduce((sum, m) => sum + (m.views || 0), 0);
    const totalLikes = targetMedia.reduce((sum, m) => sum + (m.likes || 0), 0);
    const totalComments = targetMedia.reduce((sum, m) => sum + (m.comments || 0), 0);
    const totalReach = targetMedia.reduce((sum, m) => sum + (m.reach || m.views || 0), 0);
    const avgEngagement = targetMedia.length > 0
      ? Number((targetMedia.reduce((sum, m) => sum + m.engagementRate, 0) / targetMedia.length).toFixed(1))
      : 0;

    const sortedByViews = [...targetMedia].sort((a, b) => b.views - a.views);
    const topPerformer = sortedByViews[0];

    const highlights: string[] = [];
    if (targetMedia.length > 0) {
      highlights.push(`Audited ${targetMedia.length} verified assets across ${targetPlatforms.join(', ')}.`);
      if (topPerformer) {
        highlights.push(`Top asset "${topPerformer.title.slice(0, 45)}" achieved ${topPerformer.views.toLocaleString()} verified views and ${topPerformer.engagementRate}% engagement.`);
      }
      const shorts = targetMedia.filter(m => m.contentType === 'short' || m.contentType === 'reel');
      if (shorts.length > 0) {
        highlights.push(`Short-form media accounts for ${Math.round((shorts.length / targetMedia.length) * 100)}% of your verified library.`);
      }
      highlights.push(`Logged ${totalLikes.toLocaleString()} total likes and ${totalComments.toLocaleString()} comments from real audience engagement.`);
    } else {
      highlights.push('Awaiting first media synchronization to calculate historical highlights.');
    }

    const newReport: ReportItem = {
      id: `rep-${Date.now()}`,
      title: `Executive Intelligence Report (${period})`,
      period,
      generatedAt: 'Just now',
      status: 'Ready',
      platforms: targetPlatforms,
      executiveSummary: targetMedia.length > 0
        ? `Archive intelligence summary across ${targetPlatforms.join(', ')} encompassing ${targetMedia.length} verified assets. Total views: ${totalViews.toLocaleString()} with average engagement of ${avgEngagement}%.`
        : `Connect your platform accounts to generate verified executive reports.`,
      metrics: {
        totalReach: totalReach || totalViews,
        totalViews,
        avgEngagement,
        growthRate: targetMedia.length > 0 ? Number(((totalLikes / Math.max(1, totalViews)) * 100).toFixed(1)) : 0,
      },
      highlights,
      topPerformerTitle: topPerformer ? topPerformer.title : 'Connect platform to analyze top performer',
    };

    setReports(prev => [newReport, ...prev]);
    addNotification({
      type: 'report_ready',
      title: 'New Real-Data Report Generated',
      message: `Your ${period} performance report across ${targetPlatforms.length} platforms is now ready.`,
      targetTab: 'reports',
    });
    return newReport;
  };

  // Auth actions
  const login = async (email: string, pass: string): Promise<boolean> => {
    if (!email || !pass) return false;

    const cleanUser = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Check if user is logging into the Admin Panel
    if ((cleanUser === 'admin' || cleanUser === 'admin@medianavigator.io' || cleanUser === 'admin@medianavigator.app') && cleanPass === 'password') {
      setUser(prev => ({
        ...prev,
        fullName: 'Chief Admin Officer',
        email: 'admin@medianavigator.io',
        organization: 'Media Navigator Global Ops',
        accountType: 'Other',
      }));
      setAppView('admin');
      return true;
    }

    setUser(prev => ({ ...prev, email }));
    setAppView('app');
    return true;
  };

  const logout = () => {
    setAppView('landing');
  };

  const register = async (data: Partial<UserAccount>): Promise<boolean> => {
    setUser(prev => ({
      ...prev,
      ...data,
      fullName: data.fullName || 'New Creator',
      email: data.email || 'user@growth.io',
      organization: data.organization || 'My Brand',
      accountType: data.accountType || 'Creator',
    }));
    setAppView('onboarding');
    return true;
  };

  return (
    <MediaContext.Provider
      value={{
        appView,
        setAppView,
        user,
        setUser,
        brandProfile,
        setBrandProfile,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,

        currentTab,
        setCurrentTab,
        selectedPlatform,
        setSelectedPlatform,
        timeframe,
        setTimeframe,
        activeMedia,
        setActiveMedia,
        connections,
        refreshConnections,
        alerts,
        unreadAlertCount,
        isNavigating,
        navigationStep,
        triggerMediaNavigation,
        demoMode,
        setDemoMode,

        notifications,
        unreadNotificationCount,
        isNotificationsOpen,
        setIsNotificationsOpen,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,

        syncState,
        startSyncFlow,
        closeSyncFlow,
        onboardingPlatform,
        setOnboardingPlatform,
        permissionReviewPlatform,
        setPermissionReviewPlatform,

        reports,
        generateReport,

        login,
        logout,
        register,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};

export function useMedia() {
  const ctx = useContext(MediaContext);
  if (!ctx) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return ctx;
}
