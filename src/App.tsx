import React, { useState } from 'react';
import { MediaProvider, useMedia } from './app/providers/MediaContext';
import { Sidebar, NavList, AccountCard } from './app/layout/Sidebar';
import { TopBar } from './app/layout/TopBar';
import { MobileNav } from './app/layout/MobileNav';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { NotificationsDrawer } from './app/layout/NotificationsDrawer';
import { SyncProgressModal } from './components/modals/SyncProgressModal';
import { ContentDetailModal } from './components/modals/ContentDetailModal';

// Auth and Onboarding Screens
import { Landing } from './features/landing/Landing';
import { SignIn } from './features/auth/SignIn';
import { CreateAccount } from './features/auth/CreateAccount';
import { Onboarding } from './features/onboarding/Onboarding';

// SaaS Core Screens
import { Overview } from './features/overview/Overview';
import { Analytics } from './features/analytics/Analytics';
import { AiInsights } from './features/intelligence/AiInsights';
import { Performers } from './features/intelligence/Performers';
import { Patterns } from './features/intelligence/Patterns';
import { ContentIntelligence } from './features/content/ContentIntelligence';
import { TimingIntelligence } from './features/timing/TimingIntelligence';
import { CrossPlatform } from './features/cross-platform/CrossPlatform';
import { Trends } from './features/trends/Trends';
import { Recommendations } from './features/recommendations/Recommendations';
import { ContentPlanner } from './features/content/ContentPlanner';
import { Alerts } from './features/alerts/Alerts';
import { Connections } from './features/connections/Connections';
import { Settings } from './features/settings/Settings';
import { Reports } from './features/reports/Reports';
import { BrandLogo } from './components/common/BrandLogo';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminProvider } from './app/providers/AdminContext';

import { X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    appView, 
    setAppView,
    currentTab, 
    setCurrentTab, 
    isNavigating, 
    navigationStep,
    activeMedia,
    setActiveMedia
  } = useMedia();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If in unauthenticated or onboarding flows:
  if (appView === 'landing') {
    return <Landing />;
  }
  if (appView === 'signin') {
    return <SignIn />;
  }
  if (appView === 'signup') {
    return <CreateAccount />;
  }
  if (appView === 'onboarding') {
    return <Onboarding />;
  }
  if (appView === 'admin') {
    return <AdminDashboard />;
  }

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview />;
      case 'analytics':
        return <Analytics />;
      case 'content':
        return <ContentIntelligence />;
      case 'top_performers':
        return <Performers mode="top" />;
      case 'bottom_performers':
        return <Performers mode="bottom" />;
      case 'intelligence':
        return <AiInsights />;
      case 'trends':
        return <Trends />;
      case 'timing':
        return <TimingIntelligence />;
      case 'patterns':
        return <Patterns />;
      case 'reports':
        return <Reports />;
      case 'connections':
        return <Connections />;
      case 'settings':
        return <Settings />;
      case 'alerts':
        return <Alerts />;
      case 'planner':
        return <ContentPlanner />;
      case 'recommendations':
        return <Recommendations />;
      case 'crossplatform':
        return <CrossPlatform />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex font-sans antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] btn btn-primary btn-sm">Skip to content</a>

      <LoadingOverlay isVisible={isNavigating} currentStep={navigationStep} />
      <Sidebar />
      <NotificationsDrawer />
      <SyncProgressModal />
      <ContentDetailModal media={activeMedia} onClose={() => setActiveMedia(null)} />

      {/* Phone menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[300px] max-w-[88vw] h-full bg-white flex flex-col shadow-pop animate-fade-up">
            <div className="h-[72px] px-5 flex items-center justify-between border-b border-line">
              <BrandLogo onClick={() => { setAppView('landing'); setMobileMenuOpen(false); }} />
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl text-muted hover:text-ink hover:bg-canvas-soft" aria-label="Close menu"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3"><NavList onNavigate={() => setMobileMenuOpen(false)} /></div>
            <div className="p-3 border-t border-line"><AccountCard /></div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMobileMenuClick={() => setMobileMenuOpen(true)} />
        <main id="main-content" className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-12 animate-fade-up" key={currentTab}>
          {renderActiveScreen()}
        </main>
      </div>

      <MobileNav onMoreClick={() => setMobileMenuOpen(true)} />
    </div>
  );
};

export default function App() {
  return (
    <MediaProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </MediaProvider>
  );
}
