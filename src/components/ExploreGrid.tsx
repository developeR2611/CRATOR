import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  SlidersHorizontal,
  Film,
  Tv,
  Sparkles,
  Layers
} from 'lucide-react';
import { MediaItem, MediaType, FilterState } from '../types';
import { 
  GENRES_LIST, 
  INDUSTRIES_LIST, 
  LANGUAGES_LIST, 
  YEARS_LIST, 
  PLATFORMS_LIST 
} from '../data/mockData';
import { MediaCard } from './MediaCard';

interface ExploreGridProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  initialType?: 'all' | 'movie' | 'series' | 'anime';
  initialPlatform?: string;
}

export const ExploreGrid: React.FC<ExploreGridProps> = ({
  mediaCatalog,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  initialType = 'all',
  initialPlatform = 'All Platforms',
}) => {
  const [filters, setFilters] = useState<FilterState>({
    type: initialType,
    industry: 'All Industries',
    platform: initialPlatform,
    genre: 'All Genres',
    language: 'All Languages',
    year: 'All Years',
    sortBy: 'popularity',
    searchQuery: '',
  });

  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Filter & sort logic
  const filteredItems = useMemo(() => {
    return mediaCatalog.filter((item) => {
      // Type
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }
      // Industry
      if (filters.industry !== 'All Industries' && item.industry !== filters.industry) {
        return false;
      }
      // Platform
      if (filters.platform !== 'All Platforms' && item.platform !== filters.platform) {
        return false;
      }
      // Genre
      if (filters.genre !== 'All Genres' && !item.genres.includes(filters.genre)) {
        return false;
      }
      // Language
      if (filters.language !== 'All Languages' && item.language !== filters.language) {
        return false;
      }
      // Year
      if (filters.year !== 'All Years') {
        if (filters.year === '2020-2022') {
          if (item.releaseYear < 2020 || item.releaseYear > 2022) return false;
        } else if (filters.year === 'Classics') {
          if (item.releaseYear >= 2020) return false;
        } else {
          if (item.releaseYear.toString() !== filters.year) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'popularity') {
        return (a.topTenRank || 99) - (b.topTenRank || 99);
      }
      if (filters.sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (filters.sortBy === 'newest') {
        return b.releaseYear - a.releaseYear;
      }
      if (filters.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [mediaCatalog, filters]);

  const hasActiveFilters = 
    filters.type !== 'all' ||
    filters.industry !== 'All Industries' ||
    filters.platform !== 'All Platforms' ||
    filters.genre !== 'All Genres' ||
    filters.language !== 'All Languages' ||
    filters.year !== 'All Years' ||
    filters.sortBy !== 'popularity';

  const resetFilters = () => {
    setFilters({
      type: 'all',
      industry: 'All Industries',
      platform: 'All Platforms',
      genre: 'All Genres',
      language: 'All Languages',
      year: 'All Years',
      sortBy: 'popularity',
      searchQuery: '',
    });
    setVisibleCount(12);
  };

  const visibleItems = filteredItems.slice(0, visibleCount);

  return (
    <section className="w-full py-6 space-y-6 px-4 md:px-8">
      {/* Title & Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-2">
            <span>Explore Everything</span>
          </h2>
          <p className="text-xs text-purple-200/60 mt-1">
            Browse our full 4K HDR library across global studios and streaming platforms
          </p>
        </div>

        {/* Content Type Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#120D1D] rounded-xl border border-purple-900/40 shrink-0 self-start md:self-auto">
          {[
            { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'movie', label: 'Movies', icon: <Film className="w-3.5 h-3.5" /> },
            { id: 'series', label: 'Series', icon: <Tv className="w-3.5 h-3.5" /> },
            { id: 'anime', label: 'Anime', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const active = filters.type === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, type: tab.id as any }));
                  setVisibleCount(12);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                    : 'text-purple-200/60 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-[#120D1D]/70 backdrop-blur-md rounded-2xl p-4 border border-purple-900/30 space-y-4">
        {/* Industry Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-semibold text-purple-300/50 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Origin:
          </span>
          {INDUSTRIES_LIST.map((ind) => {
            const active = filters.industry === ind;
            return (
              <button
                key={ind}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, industry: ind }));
                  setVisibleCount(12);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-purple-600/40 text-purple-200 border border-purple-400/50 shadow-sm'
                    : 'bg-[#181126] text-purple-200/60 hover:text-white hover:bg-[#201633] border border-purple-900/30'
                }`}
              >
                {ind}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {/* Platform Dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-medium text-purple-300/60">Platform</label>
            <div className="relative">
              <select
                value={filters.platform}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, platform: e.target.value }));
                  setVisibleCount(12);
                }}
                className="w-full appearance-none bg-[#181126] border border-purple-900/40 hover:border-purple-600/50 rounded-xl px-3 py-2 pr-8 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
              >
                <option value="All Platforms">All Platforms</option>
                {PLATFORMS_LIST.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Genre Dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-medium text-purple-300/60">Genre</label>
            <div className="relative">
              <select
                value={filters.genre}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, genre: e.target.value }));
                  setVisibleCount(12);
                }}
                className="w-full appearance-none bg-[#181126] border border-purple-900/40 hover:border-purple-600/50 rounded-xl px-3 py-2 pr-8 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
              >
                {GENRES_LIST.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Language Dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-medium text-purple-300/60">Language</label>
            <div className="relative">
              <select
                value={filters.language}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, language: e.target.value }));
                  setVisibleCount(12);
                }}
                className="w-full appearance-none bg-[#181126] border border-purple-900/40 hover:border-purple-600/50 rounded-xl px-3 py-2 pr-8 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
              >
                {LANGUAGES_LIST.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Year Dropdown */}
          <div className="flex flex-col space-y-1">
            <label className="text-[11px] font-medium text-purple-300/60">Year</label>
            <div className="relative">
              <select
                value={filters.year}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, year: e.target.value }));
                  setVisibleCount(12);
                }}
                className="w-full appearance-none bg-[#181126] border border-purple-900/40 hover:border-purple-600/50 rounded-xl px-3 py-2 pr-8 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
              >
                {YEARS_LIST.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex flex-col space-y-1 col-span-2 sm:col-span-1">
            <label className="text-[11px] font-medium text-purple-300/60">Sort By</label>
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }));
                  setVisibleCount(12);
                }}
                className="w-full appearance-none bg-[#181126] border border-purple-900/40 hover:border-purple-600/50 rounded-xl px-3 py-2 pr-8 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer"
              >
                <option value="popularity">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Release</option>
                <option value="title">Title (A-Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between text-xs text-purple-200/60 pt-2 border-t border-purple-950/40">
          <span className="font-mono">
            Showing <strong className="text-purple-300">{visibleItems.length}</strong> of{' '}
            <strong className="text-purple-300">{filteredItems.length}</strong> titles
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-purple-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Posters Grid */}
      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
          {visibleItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              onToggleWatchlist={onToggleWatchlist}
              isInWatchlist={isInWatchlist(item.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center bg-[#120D1D]/40 rounded-2xl border border-purple-900/20 max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mx-auto text-purple-400">
            <Filter className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-lg text-white">No titles match these filters</h3>
            <p className="text-xs text-purple-200/60 max-w-sm mx-auto">
              Try adjusting your platform, genre, or origin selection to discover more content.
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredItems.length && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="px-6 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/40 text-purple-200 hover:text-white text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
          >
            Load More Titles ({filteredItems.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </section>
  );
};
