import React, { useState } from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { MobileNav } from './components/layout/MobileNav';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { NotificationsDrawer } from './components/layout/NotificationsDrawer';
import { SyncProgressModal } from './components/modals/SyncProgressModal';
import { ContentDetailModal } from './components/modals/ContentDetailModal';

// Auth and Onboarding Screens
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { CreateAccount } from './pages/CreateAccount';
import { Onboarding } from './pages/Onboarding';

// SaaS Core Screens
import { Overview } from './pages/Overview';
import { Analytics } from './pages/Analytics';
import { Intelligence } from './pages/Intelligence';
import { ContentIntelligence } from './pages/ContentIntelligence';
import { TimingIntelligence } from './pages/TimingIntelligence';
import { CrossPlatform } from './pages/CrossPlatform';
import { Trends } from './pages/Trends';
import { Recommendations } from './pages/Recommendations';
import { ContentPlanner } from './pages/ContentPlanner';
import { Alerts } from './pages/Alerts';
import { Connections } from './pages/Connections';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { BrandLogo } from './components/common/BrandLogo';

import { X, ExternalLink, LogOut, Layers } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    appView, 
    setAppView,
    currentTab, 
    setCurrentTab, 
    isNavigating, 
    navigationStep,
    activeMedia,
    setActiveMedia,
    logout
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

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview />;
      case 'analytics':
        return <Analytics />;
      case 'content':
        return <ContentIntelligence />;
      case 'top_performers':
        return <Intelligence defaultSubTab="top" />;
      case 'bottom_performers':
        return <Intelligence defaultSubTab="bottom" />;
      case 'intelligence':
        return <Intelligence defaultSubTab="insights" />;
      case 'trends':
        return <Trends />;
      case 'timing':
        return <TimingIntelligence />;
      case 'patterns':
        return <Intelligence defaultSubTab="patterns" />;
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans antialiased selection:bg-[#0284C7]/20">
      {/* Intelligent Loading Overlay */}
      <LoadingOverlay isVisible={isNavigating} currentStep={navigationStep} />

      {/* Desktop Navy Sidebar */}
      <Sidebar />

      {/* Slide-over Notifications Drawer */}
      <NotificationsDrawer />

      {/* Live Synchronization Modal */}
      <SyncProgressModal />

      {/* Content Detail Modal */}
      <ContentDetailModal media={activeMedia} onClose={() => setActiveMedia(null)} />

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B132B]/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-white text-[#0F172A] border-r border-[#E2E8F0] p-5 flex flex-col justify-between z-50 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <BrandLogo />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 text-xs max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar pr-1">
                {[
                  { id: 'overview', label: 'Dashboard Overview' },
                  { id: 'analytics', label: 'Analytics Overview' },
                  { id: 'content', label: 'Content Library' },
                  { id: 'top_performers', label: "What's Working" },
                  { id: 'bottom_performers', label: 'What Needs Improvement' },
                  { id: 'intelligence', label: 'AI Growth Insights' },
                  { id: 'trends', label: 'AI Trends & Ideas' },
                  { id: 'timing', label: 'Posting Strategy' },
                  { id: 'patterns', label: 'Pattern Analysis' },
                  { id: 'reports', label: 'Reports' },
                  { id: 'connections', label: 'Connections' },
                  { id: 'settings', label: 'Settings' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-semibold transition-colors ${
                      currentTab === item.id
                        ? 'bg-[#0284C7] text-white shadow-xs'
                        : 'text-[#475569] hover:bg-slate-100 hover:text-[#0B132B]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <button
                onClick={() => setAppView('landing')}
                className="flex items-center gap-1.5 hover:text-[#0B132B] font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Landing Page</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-12 bg-[#F8FAFC]">
        <TopBar onMobileMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav onMoreClick={() => setMobileMenuOpen(true)} />
    </div>
  );
};

export default function App() {
  return (
    <MediaProvider>
      <AppContent />
    </MediaProvider>
  );
}
