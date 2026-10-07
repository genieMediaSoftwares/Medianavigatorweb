import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useMedia } from '../providers/MediaContext';
import { NAV_ITEMS } from '../navigation';

/** Phone tab bar: the four primary destinations plus a menu with everything else. */
export const MobileNav: React.FC<{ onMoreClick: () => void }> = ({ onMoreClick }) => {
  const { currentTab, setCurrentTab } = useMedia();
  const primary = NAV_ITEMS.filter((n) => n.primaryOnMobile);
  const moreActive = !primary.some((p) => p.id === currentTab);

  const base = 'flex-1 flex flex-col items-center justify-center gap-1 h-full text-xs font-semibold transition-colors';
  return (
    <nav id="mobile-bottom-nav" aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 h-[68px] pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur border-t border-line flex z-40">
      {primary.map((tab) => {
        const Icon = tab.icon;
        const active = currentTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setCurrentTab(tab.id)} aria-current={active ? 'page' : undefined} className={`${base} ${active ? 'text-brand-600' : 'text-muted'}`}>
            <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-brand-50' : ''}`}><Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.9} /></span>
            {tab.label.replace('Content library', 'Library').replace('Content planner', 'Planner').replace('AI insights', 'Insights')}
          </button>
        );
      })}
      <button onClick={onMoreClick} className={`${base} ${moreActive ? 'text-brand-600' : 'text-muted'}`}>
        <span className={`w-12 h-7 rounded-full flex items-center justify-center ${moreActive ? 'bg-brand-50' : ''}`}><MoreHorizontal className="w-5 h-5" /></span>
        More
      </button>
    </nav>
  );
};
