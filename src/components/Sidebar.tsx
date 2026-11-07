import React from 'react';
import { 
  Home, 
  Film, 
  Tv, 
  Sparkles, 
  Search, 
  Bookmark, 
  Send, 
  Settings, 
  User, 
  Compass,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { StreamingPlatform } from '../types';
import { PLATFORMS_LIST } from '../data/mockData';

export type NavTab = 'home' | 'movies' | 'series' | 'anime' | 'search' | 'watchlist' | 'explore' | 'platform';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedPlatform: StreamingPlatform | null;
  onSelectPlatform: (platform: StreamingPlatform) => void;
  watchlistCount: number;
  onOpenCommunity: () => void;
  onOpenProfile: () => void;
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
  onOpenCommunity,
  onOpenProfile,
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-[#08060D]/90 backdrop-blur-md border-b border-purple-900/20 px-4 flex items-center justify-between">
        <button 
          onClick={() => {
            if (currentTab === 'home') {
              onRefreshHome?.();
            } else {
              onSelectTab('home');
            }
          }}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <span className="font-display font-black text-lg text-white">C</span>
          </div>
          <span className="font-display font-black text-xl tracking-wider text-white">CRATOR</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onRefreshHome?.()}
            disabled={isRefreshingHome}
            className="p-2 rounded-lg text-purple-200/80 hover:text-white hover:bg-purple-900/30 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Feeds"
            aria-label="Refresh feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingHome ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            onClick={() => onSelectTab('search')}
            className="p-2 rounded-lg text-purple-200/80 hover:text-white hover:bg-purple-900/30 transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-lg text-purple-200/80 hover:text-white hover:bg-purple-900/30 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={onToggleMobileMenu}
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Persistent Sidebar (Desktop & Mobile Slide-in) */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B0814] border-r border-purple-950/40 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-6">
          {/* Brand Identity */}
          <div className="px-2 pt-1 pb-2 flex items-center justify-between">
            <button
              onClick={() => {
                onSelectTab('home');
                if (mobileMenuOpen) onToggleMobileMenu();
              }}
              className="flex items-center gap-3 group text-left focus:outline-none"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 p-0.5 shadow-lg shadow-purple-600/30 group-hover:shadow-purple-500/50 transition-shadow">
                <div className="w-full h-full bg-[#0B0814] rounded-[10px] flex items-center justify-center">
                  <span className="font-display font-black text-xl bg-gradient-to-tr from-purple-400 to-fuchsia-300 bg-clip-text text-transparent">
                    C
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-wider text-white group-hover:text-purple-300 transition-colors">
                  CRATOR
                </span>
                <span className="text-[10px] tracking-widest text-purple-400 font-medium uppercase">
                  Cinematic 4K
                </span>
              </div>
            </button>

            {mobileMenuOpen && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-purple-900/30"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Primary Navigation */}
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-semibold text-purple-300/50 uppercase tracking-wider block mb-2">
              Menu
            </span>
            {primaryNavItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'home' && isActive) {
                      onRefreshHome?.();
                    } else {
                      onSelectTab(item.id);
                    }
                    if (mobileMenuOpen) onToggleMobileMenu();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 to-purple-800/20 text-white border border-purple-500/30 shadow-sm shadow-purple-900/30'
                      : 'text-purple-200/70 hover:text-white hover:bg-purple-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`transition-colors ${isActive ? 'text-purple-400' : 'text-purple-400/60 group-hover:text-purple-300'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.id === 'home' && isActive ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefreshHome?.();
                      }}
                      title="Refresh Feeds"
                      className="p-1 rounded text-purple-400/70 hover:text-purple-200 hover:bg-purple-900/40 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHome ? 'animate-spin text-purple-300' : ''}`} />
                    </span>
                  ) : typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-600 text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Platforms Section */}
          <div className="space-y-1.5 pt-2 border-t border-purple-950/40">
            <div className="px-3 flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-purple-300/50 uppercase tracking-wider">
                Platforms
              </span>
              <button 
                onClick={() => {
                  onSelectTab('explore');
                  if (mobileMenuOpen) onToggleMobileMenu();
                }}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <Compass className="w-3 h-3" />
                <span>All</span>
              </button>
            </div>

            <div className="space-y-1">
              {PLATFORMS_LIST.map((platform) => {
                const isSelected = currentTab === 'platform' && selectedPlatform === platform.name;
                return (
                  <button
                    key={platform.name}
                    onClick={() => {
                      onSelectPlatform(platform.name);
                      if (mobileMenuOpen) onToggleMobileMenu();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isSelected
                        ? 'bg-purple-900/40 text-white border border-purple-500/40'
                        : 'text-purple-200/60 hover:text-white hover:bg-purple-950/30'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full transition-transform group-hover:scale-125" 
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="truncate">{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section: Telegram Community & User Profile */}
        <div className="p-3 border-t border-purple-950/40 space-y-2 bg-[#08060D]/60 backdrop-blur-sm">
          {/* Telegram / Community banner */}
          <button
            onClick={() => {
              onOpenCommunity();
              if (mobileMenuOpen) onToggleMobileMenu();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-900/30 text-purple-200 text-xs transition-colors group"
          >
            <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                CRATOR Community
              </span>
              <span className="text-[10px] text-purple-300/60">48K+ members online</span>
            </div>
          </button>

          {/* Account & Settings button */}
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              onClick={() => {
                onOpenProfile();
                if (mobileMenuOpen) onToggleMobileMenu();
              }}
              className="flex items-center gap-2.5 group text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-fuchsia-600 p-[1.5px]">
                <div className="w-full h-full bg-[#120D1D] rounded-full flex items-center justify-center overflow-hidden">
                  <User className="w-4 h-4 text-purple-300" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                  Alex Rivera
                </span>
                <span className="text-[10px] text-purple-400">VIP 4K HDR</span>
              </div>
            </button>

            <button
              onClick={() => {
                onOpenProfile();
                if (mobileMenuOpen) onToggleMobileMenu();
              }}
              className="p-1.5 rounded-lg text-purple-400/60 hover:text-white hover:bg-purple-950/40 transition-colors"
              title="Preferences & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Persistent for quick touch access) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08060D]/95 backdrop-blur-lg border-t border-purple-950/60 px-2 py-2 flex items-center justify-around">
        {primaryNavItems.slice(0, 5).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-purple-400' : 'text-purple-200/50 hover:text-purple-200'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
