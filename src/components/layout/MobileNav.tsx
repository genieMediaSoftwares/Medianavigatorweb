import React from 'react';
import { Compass, BrainCircuit, PlaySquare, CalendarDays, MoreHorizontal } from 'lucide-react';
import { useMedia } from '../../context/MediaContext';
import { NavigationTab } from '../../types';

export const MobileNav: React.FC<{ onMoreClick: () => void }> = ({ onMoreClick }) => {
  const { currentTab, setCurrentTab } = useMedia();

  const tabs: { id: NavigationTab | 'more'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Home', icon: Compass },
    { id: 'intelligence', label: 'Intelligence', icon: BrainCircuit },
    { id: 'content', label: 'Content', icon: PlaySquare },
    { id: 'planner', label: 'Planner', icon: CalendarDays },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-around z-40 px-2 select-none shadow-lg"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === 'more' ? false : currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'more') {
                onMoreClick();
              } else {
                setCurrentTab(tab.id);
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
              isActive ? 'text-[#0284C7] font-bold' : 'text-[#64748B] hover:text-[#0B132B]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#0284C7]' : 'text-[#64748B]'}`} />
            <span className="text-[10px] tracking-tight mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
