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
} from '../types';
import { api } from '../services/api';

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
  platform?: PlatformType;
  step: number;
  isSyncing: boolean;
  isCompleted: boolean;
  accountName?: string;
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
  startSyncFlow: (platform: PlatformType, accountName?: string) => void;
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
  const [appView, setAppView] = useState<AppViewMode>('app');
  
  const [user, setUser] = useState<UserAccount>({
    fullName: 'Alex Vance',
    email: 'alex@veritasmedia.co',
    organization: 'Veritas Media Labs',
    accountType: 'Marketing agency',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  });

  const [brandProfile, setBrandProfile] = useState<BrandProfile>({
    brandName: 'Veritas Media Labs',
    niche: 'B2B SaaS, Creator Economy & Growth Engineering',
    targetAudience: 'Tech founders, growth marketers, and modern creators',
    primaryLocation: 'North America & Global Remote',
    mainGoal: 'Increase reach and scale viral organic engagement',
    currentExperience: 'Advanced social media operators',
    preferredFormats: ['reel', 'carousel', 'video'],
  });

  const [workspaces, setWorkspaces] = useState<string[]>([
    'Veritas Media Labs',
    'Acme Growth Studio',
    'Apex Horizon Creators'
  ]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('Veritas Media Labs');

  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | PlatformType>('all');
  const [timeframe, setTimeframe] = useState<string>('Last 7 days');
  const [activeMedia, setActiveMedia] = useState<NormalizedMedia | null>(null);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navigationStep, setNavigationStep] = useState<string>('Collecting signals');
  const [demoMode, setDemoMode] = useState<boolean>(true);

  // Notifications
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'sync_completed',
      title: 'Full Ingestion Complete',
      message: 'Analyzed all published Reels and Posts across connected channels with zero pagination truncation.',
      timestamp: '10m ago',
      read: false,
      targetTab: 'intelligence',
    },
    {
      id: 'notif-2',
      type: 'new_insight',
      title: 'High-Impact Hook Pattern Detected',
      message: 'Posts with interrogative opening hooks deliver a +3.4% engagement lift over statements.',
      timestamp: '1h ago',
      read: false,
      targetTab: 'intelligence',
    },
    {
      id: 'notif-3',
      type: 'trend_ready',
      title: 'New Niche Opportunity Detected',
      message: 'Emerging short-form breakdown format is showing 2.8x higher share velocity in your niche.',
      timestamp: '3h ago',
      read: true,
      targetTab: 'trends',
    },
    {
      id: 'notif-4',
      type: 'report_ready',
      title: 'Weekly Performance Report Ready',
      message: 'Your cross-channel executive briefing for the last 7 days is prepared and ready for review.',
      timestamp: '1d ago',
      read: true,
      targetTab: 'reports',
    }
  ]);

  // Sync Flow Modal
  const [syncState, setSyncState] = useState<SyncState>({
    isOpen: false,
    step: 1,
    isSyncing: false,
    isCompleted: false,
  });

  const [onboardingPlatform, setOnboardingPlatform] = useState<PlatformType | null>(null);
  const [permissionReviewPlatform, setPermissionReviewPlatform] = useState<PlatformType | null>(null);

  // Reports
  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 'rep-1',
      title: 'Executive Cross-Channel Intelligence Briefing',
      period: 'Last 7 days',
      generatedAt: 'Today at 09:30 AM',
      status: 'Ready',
      platforms: ['instagram', 'youtube', 'facebook'],
      executiveSummary: 'Overall reach grew +18.4% week-over-week, propelled primarily by short-form vertical Reels and high-retention video hooks. Engagement rate maintained an above-baseline average of 4.2%.',
      metrics: {
        totalReach: 48920,
        totalViews: 64200,
        avgEngagement: 4.2,
        growthRate: 18.4,
      },
      highlights: [
        'Reels generated 68% of total organic impressions.',
        'Hook questions drove 3.4% higher comment velocity than descriptive statements.',
        'Friday 3:00 PM publishing window captured peak 48-hour velocity.'
      ],
      topPerformerTitle: 'How to build high-retention social content in 2026',
    },
    {
      id: 'rep-2',
      title: 'Monthly Growth & Retention Audit',
      period: 'Last 30 days',
      generatedAt: 'Sep 18, 2026',
      status: 'Ready',
      platforms: ['instagram', 'youtube'],
      executiveSummary: 'Full-month archive audit across 142 published items demonstrated strong baseline stability with carousels driving high bookmark/save rates.',
      metrics: {
        totalReach: 194000,
        totalViews: 248000,
        avgEngagement: 3.9,
        growthRate: 24.1,
      },
      highlights: [
        'Carousels averaged 4.8% bookmark save rate.',
        'Audience retention crossed 62% on videos under 45 seconds.'
      ],
      topPerformerTitle: 'The 5 algorithmic shifts every creator must know',
    }
  ]);

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
  const startSyncFlow = (platform: PlatformType, accountName?: string) => {
    setSyncState({
      isOpen: true,
      platform,
      step: 1,
      isSyncing: true,
      isCompleted: false,
      accountName: accountName || `${platform}_creator`,
    });

    // Run realistic 7-step sequence matching Screen 09 specifications
    const stepIntervals = [600, 700, 800, 900, 750, 700, 600];
    let currentStepIndex = 1;

    const advanceStep = () => {
      if (currentStepIndex < 7) {
        currentStepIndex++;
        setSyncState(prev => ({
          ...prev,
          step: currentStepIndex,
        }));
        setTimeout(advanceStep, stepIntervals[currentStepIndex - 1]);
      } else {
        setSyncState(prev => ({
          ...prev,
          step: 7,
          isSyncing: false,
          isCompleted: true,
        }));
        refreshConnections();
        addNotification({
          type: 'sync_completed',
          title: `${platform.toUpperCase()} Ingestion Finished`,
          message: `Successfully indexed content and verified real reach metrics for @${accountName || platform}.`,
          targetTab: 'overview',
        });
      }
    };

    setTimeout(advanceStep, stepIntervals[0]);
  };

  const closeSyncFlow = () => {
    setSyncState(prev => ({ ...prev, isOpen: false }));
  };

  // Report generation
  const generateReport = async (period: string, targetPlatforms: string[]): Promise<ReportItem> => {
    const newReport: ReportItem = {
      id: `rep-${Date.now()}`,
      title: `Executive Intelligence Report (${period})`,
      period,
      generatedAt: 'Just now',
      status: 'Ready',
      platforms: targetPlatforms,
      executiveSummary: `Generated full-archive intelligence evaluation across ${targetPlatforms.join(', ')}. Strongest performance observed in high-velocity short-form media with question opening hooks.`,
      metrics: {
        totalReach: Math.floor(35000 + Math.random() * 25000),
        totalViews: Math.floor(45000 + Math.random() * 30000),
        avgEngagement: Number((3.5 + Math.random() * 2).toFixed(1)),
        growthRate: Number((12 + Math.random() * 10).toFixed(1)),
      },
      highlights: [
        'Top quartile reels demonstrated 2.6x higher audience save rates.',
        'Publishing consistency within recommended hourly window increased reach by +22%.',
        'Direct question hooks drove +3.8% higher comment-to-view ratio.'
      ],
      topPerformerTitle: 'How to scale organic brand distribution with data-backed content',
    };

    setReports(prev => [newReport, ...prev]);
    addNotification({
      type: 'report_ready',
      title: 'New AI Intelligence Report Generated',
      message: `Your ${period} performance report across ${targetPlatforms.length} platforms is now available.`,
      targetTab: 'reports',
    });
    return newReport;
  };

  // Auth actions
  const login = async (email: string, pass: string): Promise<boolean> => {
    if (!email || !pass) return false;
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
