import React from 'react';
import {
  House,
  Clapperboard,
  Tv,
  Compass,
  Bookmark,
  Search,
  Settings,
} from 'lucide-react';
import { AppRoute, NavTab, TAB_PATHS, EXTRA_PATHS } from '../utils/router';

export type { NavTab };

interface HeaderProps {
  activeRoute: AppRoute['name'];
  onNavigate: (path: string) => void;
  isHidden?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeRoute,
  onNavigate,
  isHidden = false,
}) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <header className={`topbar ${isHidden ? 'is-hidden' : ''}`} aria-hidden={isHidden}>
      {/* Desktop Brand (Left) */}
      <a
        href={TAB_PATHS.home}
        className="desktop-nav-brand no-underline"
        onClick={(e) => handleLinkClick(e, TAB_PATHS.home)}
        title="CRATOR"
        aria-label="CRATOR Home"
      >
        CRATOR
      </a>

      {/* Floating Center Pill Navigation */}
      <nav className="nav-pill" aria-label="Primary navigation">
        <div className="tab-links">
          {/* Home */}
          <a
            href={TAB_PATHS.home}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.home)}
            className={`nav-tab ${activeRoute === 'home' ? 'active' : ''}`}
            aria-current={activeRoute === 'home' ? 'page' : undefined}
            aria-label="Home"
          >
            <House className="tab-icon" />
            <span className="tab-label">Home</span>
          </a>

          {/* Movies */}
          <a
            href={TAB_PATHS.movies}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.movies)}
            className={`nav-tab ${activeRoute === 'movies' ? 'active' : ''}`}
            aria-current={activeRoute === 'movies' ? 'page' : undefined}
            aria-label="Movies"
          >
            <Clapperboard className="tab-icon" />
            <span className="tab-label">Movies</span>
          </a>

          {/* TV */}
          <a
            href={TAB_PATHS.tv}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.tv)}
            className={`nav-tab ${activeRoute === 'tv' ? 'active' : ''}`}
            aria-current={activeRoute === 'tv' ? 'page' : undefined}
            aria-label="TV"
          >
            <Tv className="tab-icon" />
            <span className="tab-label">TV</span>
          </a>

          {/* Discover */}
          <a
            href={TAB_PATHS.discover}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.discover)}
            className={`nav-tab ${activeRoute === 'discover' ? 'active' : ''}`}
            aria-current={activeRoute === 'discover' ? 'page' : undefined}
            aria-label="Discover"
          >
            <Compass className="tab-icon" />
            <span className="tab-label">Discover</span>
          </a>

          {/* My List */}
          <a
            href={TAB_PATHS.mylist}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.mylist)}
            className={`nav-tab ${activeRoute === 'mylist' ? 'active' : ''}`}
            aria-current={activeRoute === 'mylist' ? 'page' : undefined}
            aria-label="My List"
          >
            <Bookmark className="tab-icon" />
            <span className="tab-label">My List</span>
          </a>
        </div>

        {/* Vertical Separator */}
        <span className="nav-divider" aria-hidden="true" />

        {/* Action Controls */}
        <div className="nav-actions">
          {/* Community Page Link */}
          <a
            href={EXTRA_PATHS.community}
            onClick={(e) => handleLinkClick(e, EXTRA_PATHS.community)}
            className={`nav-action no-underline ${activeRoute === 'community' ? 'is-active' : ''}`}
            title="Join Community"
            aria-label="Join Community"
            aria-current={activeRoute === 'community' ? 'page' : undefined}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M19.54 5.32A16.7 16.7 0 0 0 15.4 4l-.5 1.03a15.4 15.4 0 0 0-5.8 0L8.6 4a16.7 16.7 0 0 0-4.14 1.32C1.84 9.32 1.13 13.2 1.5 17.03a16.8 16.8 0 0 0 5.1 2.6l1.23-1.67a10.1 10.1 0 0 1-1.94-.94l.48-.37c3.74 1.74 7.8 1.74 11.5 0l.5.37c-.62.37-1.27.68-1.95.94l1.23 1.67a16.8 16.8 0 0 0 5.1-2.6c.44-4.44-.75-8.28-3.21-11.71ZM8.47 14.8c-1.1 0-2-.99-2-2.2s.88-2.2 2-2.2 2 .99 2 2.2-.9 2.2-2 2.2Zm7.06 0c-1.1 0-2-.99-2-2.2s.88-2.2 2-2.2 2 .99 2 2.2-.9 2.2-2 2.2Z" />
            </svg>
          </a>

          {/* Search Page Link */}
          <a
            href={TAB_PATHS.search}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.search)}
            className={`nav-action no-underline ${activeRoute === 'search' ? 'is-active' : ''}`}
            title="Search movies & TV shows"
            aria-label="Search"
            aria-current={activeRoute === 'search' ? 'page' : undefined}
          >
            <Search className="w-4 h-4" />
          </a>

          {/* Settings Page Link */}
          <a
            href={EXTRA_PATHS.settings}
            onClick={(e) => handleLinkClick(e, EXTRA_PATHS.settings)}
            className={`nav-action no-underline ${activeRoute === 'settings' ? 'is-active' : ''}`}
            title="Playback Settings"
            aria-label="Settings"
            aria-current={activeRoute === 'settings' ? 'page' : undefined}
          >
            <Settings className="w-4 h-4" />
          </a>
        </div>
      </nav>
    </header>
  );
};
