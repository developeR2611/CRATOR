import React from 'react';
import {
  House,
  Clapperboard,
  Tv,
  Compass,
  Bookmark,
  Search,
  Download,
} from 'lucide-react';
import { AppRoute, NavTab, TAB_PATHS } from '../utils/router';
import { GlassButton, GlassNavbarShell } from './GlassButton';

export type { NavTab };

interface HeaderProps {
  activeRoute: AppRoute['name'];
  onNavigate: (path: string) => void;
  isHidden?: boolean;
  activeDownloadsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeRoute,
  onNavigate,
  isHidden = false,
  activeDownloadsCount = 0,
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
        className="desktop-nav-brand lg-btn lg-btn--navigation lg-btn--shape-pill no-underline"
        onClick={(e) => handleLinkClick(e, TAB_PATHS.home)}
        title="CRATOR"
        aria-label="CRATOR Home"
      >
        <span className="lg-btn__content">CRATOR</span>
      </a>

      {/* Floating Center Pill Navigation */}
      <GlassNavbarShell ariaLabel="Primary navigation">
        <div className="tab-links">
          <GlassButton
            href={TAB_PATHS.home}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.home)}
            variant="navigation"
            shape="pill"
            active={activeRoute === 'home'}
            className="nav-tab"
            aria-current={activeRoute === 'home' ? 'page' : undefined}
            aria-label="Home"
            leftIcon={<House className="tab-icon" />}
          >
            <span className="tab-label">Home</span>
          </GlassButton>

          <GlassButton
            href={TAB_PATHS.movies}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.movies)}
            variant="navigation"
            shape="pill"
            active={activeRoute === 'movies'}
            className="nav-tab"
            aria-current={activeRoute === 'movies' ? 'page' : undefined}
            aria-label="Movies"
            leftIcon={<Clapperboard className="tab-icon" />}
          >
            <span className="tab-label">Movies</span>
          </GlassButton>

          <GlassButton
            href={TAB_PATHS.tv}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.tv)}
            variant="navigation"
            shape="pill"
            active={activeRoute === 'tv'}
            className="nav-tab"
            aria-current={activeRoute === 'tv' ? 'page' : undefined}
            aria-label="TV"
            leftIcon={<Tv className="tab-icon" />}
          >
            <span className="tab-label">TV</span>
          </GlassButton>

          <GlassButton
            href={TAB_PATHS.discover}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.discover)}
            variant="navigation"
            shape="pill"
            active={activeRoute === 'discover'}
            className="nav-tab"
            aria-current={activeRoute === 'discover' ? 'page' : undefined}
            aria-label="Discover"
            leftIcon={<Compass className="tab-icon" />}
          >
            <span className="tab-label">Discover</span>
          </GlassButton>

          <GlassButton
            href={TAB_PATHS.mylist}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.mylist)}
            variant="navigation"
            shape="pill"
            active={activeRoute === 'mylist'}
            className="nav-tab"
            aria-current={activeRoute === 'mylist' ? 'page' : undefined}
            aria-label="My List"
            leftIcon={<Bookmark className="tab-icon" />}
          >
            <span className="tab-label">My List</span>
          </GlassButton>
        </div>

        {/* Vertical Separator */}
        <span className="nav-divider" aria-hidden="true" />

        {/* Action Controls */}
        <div className="nav-actions">
          <GlassButton
            href={TAB_PATHS.downloads}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.downloads)}
            variant="navigation"
            size="icon"
            shape="circle"
            active={activeRoute === 'downloads'}
            className="nav-action relative"
            title="Download Manager"
            aria-label={
              activeDownloadsCount > 0
                ? `Downloads (${activeDownloadsCount} active)`
                : 'Downloads'
            }
            aria-current={activeRoute === 'downloads' ? 'page' : undefined}
          >
            <Download className="w-4 h-4" />
            {activeDownloadsCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-[#0b0d12] text-[10px] font-mono font-bold leading-4 text-center shadow"
                aria-hidden="true"
              >
                {activeDownloadsCount > 9 ? '9+' : activeDownloadsCount}
              </span>
            )}
          </GlassButton>

          <GlassButton
            href={TAB_PATHS.search}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.search)}
            variant="navigation"
            size="icon"
            shape="circle"
            active={activeRoute === 'search'}
            className="nav-action"
            title="Search movies & TV shows"
            aria-label="Search"
            aria-current={activeRoute === 'search' ? 'page' : undefined}
          >
            <Search className="w-4 h-4" />
          </GlassButton>
        </div>
      </GlassNavbarShell>
    </header>
  );
};
