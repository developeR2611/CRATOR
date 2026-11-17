import React from 'react';
import {
  Home,
  Film,
  Tv,
  Sparkles,
  Search,
  Bookmark,
  Compass,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import { StreamingPlatform } from '../types';
import { PLATFORMS_LIST } from '../data/mockData';
import { GlassButton } from './GlassButton';

export type NavTab = 'home' | 'movies' | 'series' | 'anime' | 'search' | 'watchlist' | 'explore' | 'platform';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedPlatform: StreamingPlatform | null;
  onSelectPlatform: (platform: StreamingPlatform) => void;
  watchlistCount: number;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onRefreshHome?: () => void;
  isRefreshingHome?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  selectedPlatform,
  onSelectPlatform,
  watchlistCount,
  mobileMenuOpen,
  onToggleMobileMenu,
  onRefreshHome,
  isRefreshingHome = false,
}) => {
  const primaryNavItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'movies', label: 'Movies', icon: <Film className="w-5 h-5" /> },
    { id: 'series', label: 'Series', icon: <Tv className="w-5 h-5" /> },
    { id: 'anime', label: 'Anime', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'search', label: 'Search', icon: <Search className="w-5 h-5" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Bookmark className="w-5 h-5" />, badge: watchlistCount },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 glass-panel !rounded-none border-x-0 border-t-0 px-4 flex items-center justify-between">
        <GlassButton
          variant="ghost"
          size="sm"
          shape="pill"
          onClick={() => {
            if (currentTab === 'home') {
              onRefreshHome?.();
            } else {
              onSelectTab('home');
            }
          }}
          className="!px-2.5"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg">
            <span className="font-display font-black text-base text-white">C</span>
          </span>
          <span className="font-display font-black text-lg tracking-wider text-white">CRATOR</span>
        </GlassButton>

        <div className="flex items-center gap-1.5">
          <GlassButton
            variant="icon"
            size="icon"
            shape="circle"
            onClick={() => onRefreshHome?.()}
            disabled={isRefreshingHome}
            className="!w-9 !h-9"
            title="Refresh Feeds"
            aria-label="Refresh feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingHome ? 'animate-spin text-orange-400' : ''}`} />
          </GlassButton>
          <GlassButton
            variant="icon"
            size="icon"
            shape="circle"
            onClick={() => onSelectTab('search')}
            className="!w-9 !h-9"
            title="Search"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </GlassButton>
          <GlassButton
            variant="icon"
            size="icon"
            shape="circle"
            onClick={onToggleMobileMenu}
            className="!w-9 !h-9"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </GlassButton>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={onToggleMobileMenu}
          className="glass-backdrop lg:hidden fixed inset-0 z-40 transition-opacity"
        />
      )}

      {/* Main Persistent Sidebar (Desktop & Mobile Slide-in) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 glass-panel !rounded-none border-y-0 border-l-0 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-6">
          {/* Brand Identity */}
          <div className="px-2 pt-1 pb-2 flex items-center justify-between gap-2">
            <GlassButton
              variant="ghost"
              size="md"
              onClick={() => {
                onSelectTab('home');
                if (mobileMenuOpen) onToggleMobileMenu();
              }}
              className="!h-auto !py-1.5 !px-2 justify-start"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shrink-0">
                <span className="font-display font-black text-lg text-white">C</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-display font-black text-lg tracking-wider text-white">CRATOR</span>
                <span className="text-[10px] tracking-widest text-[#9a9ba1] font-mono uppercase">Cinematic 4K</span>
              </div>
            </GlassButton>

            {mobileMenuOpen && (
              <GlassButton
                variant="icon"
                size="icon"
                shape="circle"
                onClick={onToggleMobileMenu}
                className="lg:hidden !w-8 !h-8"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </GlassButton>
            )}
          </div>

          {/* Primary Navigation */}
          <div className="space-y-1.5">
            <span className="px-3 text-[11px] font-mono text-[#8a8890] uppercase tracking-wider block mb-2">
              Menu
            </span>
            {primaryNavItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <GlassButton
                  key={item.id}
                  variant="navigation"
                  shape="default"
                  active={isActive}
                  fullWidth={true}
                  onClick={() => {
                    if (item.id === 'home' && isActive) {
                      onRefreshHome?.();
                    } else {
                      onSelectTab(item.id);
                    }
                    if (mobileMenuOpen) onToggleMobileMenu();
                  }}
                  className="justify-between !px-3.5"
                >
                  <span className="flex items-center gap-3 w-full justify-between">
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="glass-badge px-2 py-0.5 text-[11px] font-semibold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </GlassButton>
              );
            })}
          </div>

          {/* Platforms Section */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="px-3 flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-[#8a8890] uppercase tracking-wider">
                Platforms
              </span>
              <GlassButton
                variant="ghost"
                size="sm"
                shape="pill"
                onClick={() => {
                  onSelectTab('explore');
                  if (mobileMenuOpen) onToggleMobileMenu();
                }}
                className="!h-6 !px-2 text-[11px]"
                leftIcon={<Compass className="w-3 h-3" />}
              >
                <span>All</span>
              </GlassButton>
            </div>

            <div className="space-y-1">
              {PLATFORMS_LIST.map((platform) => {
                const isSelected = currentTab === 'platform' && selectedPlatform === platform.name;
                return (
                  <GlassButton
                    key={platform.name}
                    variant="navigation"
                    size="sm"
                    active={isSelected}
                    fullWidth={true}
                    onClick={() => {
                      onSelectPlatform(platform.name);
                      if (mobileMenuOpen) onToggleMobileMenu();
                    }}
                    className="justify-start !px-3"
                    leftIcon={
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: platform.color }}
                      />
                    }
                  >
                    <span className="truncate">{platform.name}</span>
                  </GlassButton>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel !rounded-none border-x-0 border-b-0 px-2 py-2 flex items-center justify-around">
        {primaryNavItems.slice(0, 5).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <GlassButton
              key={item.id}
              variant="navigation"
              size="sm"
              shape="pill"
              active={isActive}
              onClick={() => onSelectTab(item.id)}
              className="!h-auto !py-1.5 !px-2.5 flex-col !gap-1 text-[10px]"
            >
              {item.icon}
              <span>{item.label}</span>
            </GlassButton>
          );
        })}
      </nav>
    </>
  );
};
