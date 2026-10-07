import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  NavigationTab, 
  PlatformType, 
  NormalizedMedia, 
  PlatformConnection, 
  AlertItem,
  AppViewMode,
  UserAccount,
} from '../../types';
import { api } from '../../services/api';
import { authApi, hasSession, clearSession, ApiError } from '../../services/auth';

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
  /** true only when the API confirmed the admin role for this session */
  isAdmin: boolean;
  setUser: (user: UserAccount) => void;
  
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
  refreshAlerts: () => Promise<void>;
  alerts: AlertItem[];
  unreadAlertCount: number;
  isNavigating: boolean;
  navigationStep: string;
  triggerMediaNavigation: () => void;

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

  // Auth actions
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<UserAccount> & { password: string }) => Promise<boolean>;
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
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [user, setUser] = useState<UserAccount>({
    fullName: '',
    email: '',
    organization: '',
    accountType: 'Creator',
    avatarUrl: '',
  });



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

  // Auth actions (server-verified; the role comes from the API, never from the client)
  const applySession = (u: { email: string; role: 'user' | 'admin' }, profile: { fullName?: string; organization?: string | null; accountType?: string | null } | null | undefined) => {
    setIsAdmin(u.role === 'admin');
    setUser(prev => ({
      ...prev,
      email: u.email,
      fullName: profile?.fullName || u.email,
      organization: profile?.organization || prev.organization,
      accountType: (profile?.accountType as UserAccount['accountType']) || prev.accountType,
    }));
  };

  // Restore an existing session on load; protected views are never shown without one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasSession()) {
        setAppView(v => (v === 'app' || v === 'admin' || v === 'onboarding' ? 'signin' : v));
        return;
      }
      try {
        const me = await authApi.me();
        if (cancelled) return;
        applySession(me.user, me.profile);
        setAppView(v => (v === 'admin' && me.user.role !== 'admin' ? 'app' : v));
        refreshConnections();
        refreshAlerts();
      } catch {
        if (!cancelled) setAppView(v => (v === 'app' || v === 'admin' || v === 'onboarding' ? 'signin' : v));
      }
    })();
    const lost = () => setAppView('signin');
    window.addEventListener('mn:auth-lost', lost);
    return () => { cancelled = true; window.removeEventListener('mn:auth-lost', lost); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (!email || !pass) return false;
    try {
      const res = await authApi.login(email.trim(), pass);
      const me = await authApi.me();
      applySession(res.user, me.profile);
      setAppView(res.user.role === 'admin' ? 'admin' : 'app');
      refreshConnections();
      refreshAlerts();
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 429 || err.status === 422)) return false;
      throw err;
    }
  };

  const logout = () => {
    void authApi.logout();
    clearSession();
    setConnections([]);
    setAlerts([]);
    setIsAdmin(false);
    setAppView('landing');
  };

  const register = async (data: Partial<UserAccount> & { password: string }): Promise<boolean> => {
    const res = await authApi.register({
      email: (data.email || '').trim(),
      password: data.password,
      fullName: data.fullName || '',
      organization: data.organization || undefined,
      accountType: data.accountType || undefined,
    });
    applySession(res.user, res.profile);
    setAppView('onboarding');
    return true;
  };

  return (
    <MediaContext.Provider
      value={{
        appView,
        setAppView,
        isAdmin,
        user,
        setUser,

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
        refreshAlerts,
        alerts,
        unreadAlertCount,
        isNavigating,
        navigationStep,
        triggerMediaNavigation,

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
