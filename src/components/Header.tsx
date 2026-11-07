import React from 'react';
import { 
  House, 
  Clapperboard, 
  Tv, 
  Compass, 
  Bookmark, 
  Search, 
  Settings 
} from 'lucide-react';

export type NavTab = 'home' | 'movies' | 'tv' | 'discover' | 'mylist';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenDiscord: () => void;
  adsEnabled?: boolean;
  onToggleAds?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onOpenSettings,
  onOpenDiscord,
  adsEnabled = true,
  onToggleAds,
}) => {
  return (
    <header className="topbar">
      {/* Desktop Brand (Left) */}
      <span 
        className="desktop-nav-brand" 
        onClick={() => onSelectTab('home')}
        title="CRATOR"
      >
        CRATOR
      </span>

      {/* Floating Center Pill Navigation */}
      <nav className="nav-pill" aria-label="Primary navigation">
        <div className="tab-links">
          {/* Home */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
            aria-current={activeTab === 'home' ? 'page' : undefined}
            aria-label="Home"
          >
            <House className="tab-icon" />
            <span className="tab-label">Home</span>
          </button>

          {/* Movies */}
          <button
            type="button"
            onClick={() => onSelectTab('movies')}
            className={`nav-tab ${activeTab === 'movies' ? 'active' : ''}`}
            aria-current={activeTab === 'movies' ? 'page' : undefined}
            aria-label="Movies"
          >
            <Clapperboard className="tab-icon" />
            <span className="tab-label">Movies</span>
          </button>

          {/* TV */}
          <button
            type="button"
            onClick={() => onSelectTab('tv')}
            className={`nav-tab ${activeTab === 'tv' ? 'active' : ''}`}
            aria-current={activeTab === 'tv' ? 'page' : undefined}
            aria-label="TV"
          >
            <Tv className="tab-icon" />
            <span className="tab-label">TV</span>
          </button>

          {/* Discover */}
          <button
            type="button"
            onClick={() => onSelectTab('discover')}
            className={`nav-tab ${activeTab === 'discover' ? 'active' : ''}`}
            aria-current={activeTab === 'discover' ? 'page' : undefined}
            aria-label="Discover"
          >
            <Compass className="tab-icon" />
            <span className="tab-label">Discover</span>
          </button>

          {/* My List */}
          <button
            type="button"
            onClick={() => onSelectTab('mylist')}
            className={`nav-tab ${activeTab === 'mylist' ? 'active' : ''}`}
            aria-current={activeTab === 'mylist' ? 'page' : undefined}
            aria-label="My List"
          >
            <Bookmark className="tab-icon" />
            <span className="tab-label">My List</span>
          </button>
        </div>

        {/* Vertical Separator */}
        <span className="nav-divider" aria-hidden="true" />

        {/* Action Controls */}
        <div className="nav-actions">
          {/* Discord Icon Placeholder */}
          <button
            type="button"
            onClick={onOpenDiscord}
            className="nav-action"
            title="Join Community"
            aria-label="Join Community"
          >
            <svg 
              className="w-4 h-4" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              aria-hidden="true"
            >
              <path d="M19.54 5.32A16.7 16.7 0 0 0 15.4 4l-.5 1.03a15.4 15.4 0 0 0-5.8 0L8.6 4a16.7 16.7 0 0 0-4.14 1.32C1.84 9.32 1.13 13.2 1.5 17.03a16.8 16.8 0 0 0 5.1 2.6l1.23-1.67a10.1 10.1 0 0 1-1.94-.94l.48-.37c3.74 1.74 7.8 1.74 11.5 0l.5.37c-.62.37-1.27.68-1.95.94l1.23 1.67a16.8 16.8 0 0 0 5.1-2.6c.44-4.44-.75-8.28-3.21-11.71ZM8.47 14.8c-1.1 0-2-.99-2-2.2s.88-2.2 2-2.2 2 .99 2 2.2-.9 2.2-2 2.2Zm7.06 0c-1.1 0-2-.99-2-2.2s.88-2.2 2-2.2 2 .99 2 2.2-.9 2.2-2 2.2Z" />
            </svg>
          </button>

          {/* Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="nav-action"
            title="Search movies & TV shows"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="nav-action"
            title="Playback Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Right Ads Pill Toggle */}
      <div className="pref-pill-wrap">
        <button
          type="button"
          onClick={onToggleAds}
          className="pref-pill"
          aria-label={adsEnabled ? 'Ads are on. Change' : 'Ads are off'}
          title="Ad experience toggle"
        >
          <span>Ads</span>
          <span 
            className="pref-dot" 
            style={{ 
              backgroundColor: adsEnabled ? '#10b981' : '#6b7280',
              boxShadow: adsEnabled ? '0 0 8px #10b981' : 'none'
            }} 
          />
        </button>
      </div>
    </header>
  );
};
