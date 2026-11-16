import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Clock, 
  Loader2, 
  Sparkles, 
  Film, 
  Tv 
} from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { searchTmdb, getTmdbStatus, TmdbStatus } from '../services/tmdb';
import { availabilityService } from '../services/availability';

interface SearchViewProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

const POPULAR_SEARCH_TAGS = [
  'Avatar',
  'Dune',
  'Cyberpunk',
  'Severance',
  'Shōgun',
  'Deadpool',
  'Gladiator',
  'Arcane',
  'Batman',
  'Spider-Man'
];

export const SearchView: React.FC<SearchViewProps> = ({
  mediaCatalog,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  initialQuery = '',
  onQueryChange,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Search API State
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus | null>(null);

  // Request race-condition tracking
  const searchRequestIdRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmittedQueryRef = useRef<string>(initialQuery);

  // Recent searches with persistence
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crator_recent_searches');
      return saved ? JSON.parse(saved) : ['Avatar', 'Dune', 'Severance'];
    } catch {
      return ['Avatar', 'Dune', 'Severance'];
    }
  });

  useEffect(() => {
    if (initialQuery !== lastEmittedQueryRef.current) {
      lastEmittedQueryRef.current = initialQuery;
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    inputRef.current?.focus();
    getTmdbStatus().then(setTmdbStatus);
  }, []);

  const saveRecentSearch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('crator_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== text);
      try {
        localStorage.setItem('crator_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('crator_recent_searches');
    } catch {}
  };

  // Perform search (TMDB live with catalogue fallback)
  const executeSearch = async (searchKeyword: string, targetPage: number = 1, append: boolean = false) => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setResults([]);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    const currentRequestId = ++searchRequestIdRef.current;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const tmdbRes = await searchTmdb(keyword, targetPage);
      if (currentRequestId !== searchRequestIdRef.current) return;

      if (tmdbRes.items && tmdbRes.items.length > 0) {
        setHasMore(tmdbRes.hasMore);
        setPage(targetPage);
        setResults((prev) => {
          if (append) {
            const existingIds = new Set(prev.map((i) => i.id));
            const newUnique = tmdbRes.items.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newUnique];
          }
          return tmdbRes.items;
        });
      } else {
        // Fallback to local catalog
        const lower = keyword.toLowerCase();
        const localMatches = mediaCatalog.filter((item) =>
          item.title.toLowerCase().includes(lower) ||
          item.genres.some((g) => g.toLowerCase().includes(lower)) ||
          item.cast?.some((c) => c.name.toLowerCase().includes(lower))
        );
        setResults(localMatches);
        setHasMore(false);
      }
    } catch {
      if (currentRequestId !== searchRequestIdRef.current) return;
      const lower = keyword.toLowerCase();
      const localMatches = mediaCatalog.filter((item) =>
        item.title.toLowerCase().includes(lower) ||
        item.genres.some((g) => g.toLowerCase().includes(lower))
      );
      setResults(localMatches);
      setHasMore(false);
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  // Debounced search when query changes
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      onQueryChange?.('');
      return;
    }

    const timer = setTimeout(() => {
      onQueryChange?.(trimmed);
      executeSearch(trimmed, 1, false);
      saveRecentSearch(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onQueryChange?.(trimmed);
      executeSearch(trimmed, 1, false);
      saveRecentSearch(trimmed);
    }
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    onQueryChange?.(tag);
    executeSearch(tag, 1, false);
    saveRecentSearch(tag);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      executeSearch(query, page + 1, true);
    }
  };

  const [onlyPlayable, setOnlyPlayable] = useState<boolean>(true);

  // Filter currently displayed results by Availability (keep released + upcoming unreleased), Type, and Genre
  const filteredResults = results.filter((item) => {
    if (onlyPlayable) {
      const avail = availabilityService.checkAvailability(item);
      if (!avail.isAvailable && avail.confidence !== 'unreleased') return false;
    }
    if (selectedType !== 'all') {
      const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';
      if (selectedType === 'movie' && isTv) return false;
      if (selectedType === 'series' && !isTv) return false;
    }
    if (selectedGenre !== 'All' && !item.genres.includes(selectedGenre)) return false;
    return true;
  });

  return (
    <div className="w-full min-h-screen py-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <span className="eyebrow block">DISCOVERY ARCHIVE</span>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-[#f3f0ea] tracking-tight flex items-center gap-3 flex-wrap mt-1">
          <Search className="w-5 h-5 text-white" />
          <span>Search</span>
        </h1>
        <p className="text-xs text-[#8e8a91] mt-1 font-mono">
          Search live across movies, TV series, cast, and 4K streaming titles
        </p>
      </div>

      {/* Global Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#9a9ba1] absolute left-4 pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies, TV shows, actors (e.g. Avatar, Dune, Severance)..."
            className="glass-control w-full rounded-2xl pl-11 pr-24 py-3.5 text-sm text-[#f3f0ea] placeholder-[#8a8890] focus:outline-none"
          />

          <div className="absolute right-4 flex items-center gap-2 z-10">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="glass-pill p-1.5 rounded-full text-[#beb9bc] hover:text-white cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filter Tabs & Quick Categorization */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Type Filter */}
        <div className="dz-type">
          {[
            { id: 'all', label: 'All' },
            { id: 'movie', label: 'Movies' },
            { id: 'series', label: 'TV Shows' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id as any)}
              className={`dz-type-btn ${selectedType === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Quick Genre Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {['All', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Animation', 'Fantasy', 'Comedy'].map((genre) => (
            <button
              key={genre}
              type="button"
              aria-pressed={selectedGenre === genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                selectedGenre === genre
                  ? 'glass-pill-active'
                  : 'glass-pill text-[#c9c7cc]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions and Recent Searches (when query is short or empty) */}
      {!query && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="eyebrow flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearAllRecent}
                  className="text-[11px] text-[#9a9ba1] hover:text-white transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleTagClick(item)}
                    className="glass-pill group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[#d3d1d6] cursor-pointer"
                  >
                    <span>{item}</span>
                    <X
                      className="w-3 h-3 text-[#8a8890] group-hover:text-white opacity-70 hover:opacity-100"
                      onClick={(e) => removeRecentSearch(item, e)}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Search Tags */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <span className="eyebrow block">
              Trending Searches
            </span>

            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="glass-pill px-3 py-1.5 rounded-full text-xs text-[#d3d1d6] cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popular Trending Suggestions when not searching */}
      {!query && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow block">CURATED PICKS</span>
              <h3 className="font-display font-bold text-lg text-[#f3f0ea] mt-0.5">
                Recommended to Browse
              </h3>
            </div>
            <span className="text-xs text-[#8e8a91] font-mono">Top cinema selections</span>
          </div>
          <div className="dz-grid">
            {availabilityService.filterPlayableTitles(mediaCatalog).slice(0, 12).map((item) => (
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
        </div>
      )}

      {/* Results Header */}
      {query && (
        <div className="flex flex-wrap items-center justify-between text-xs text-[#8e8a91] pt-2 border-t border-white/10 gap-2 font-mono">
          <span>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                Searching for "{query}"...
              </span>
            ) : (
              <span className="flex items-center gap-2 flex-wrap">
                <span>Found <strong className="text-[#f3f0ea]">{filteredResults.length}</strong> titles for "{query}"</span>
              </span>
            )}
          </span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && results.length === 0 && (
        <div className="dz-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-2 animate-pulse">
              <div className="aspect-[2/3] rounded-xl glass-surface" />
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {filteredResults.length > 0 ? (
        <div className="space-y-6">
          <div className="dz-grid">
            {filteredResults.map((item) => (
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

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="primary-btn h-10 px-6 rounded-xl text-xs font-semibold"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading more titles...</span>
                  </>
                ) : (
                  <span>Load More Results</span>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        query && !isLoading && (
          <div className="glass-panel py-20 text-center rounded-2xl max-w-lg mx-auto space-y-3 px-6">
            <div className="glass-surface w-12 h-12 rounded-full flex items-center justify-center mx-auto text-white">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#f3f0ea]">No results found for "{query}"</h3>
            <p className="text-xs text-[#9a9ba1] max-w-xs mx-auto">
              Check for typos or try searching with different keywords, actor names, or genres.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedGenre('All');
                  setSelectedType('all');
                }}
                className="primary-btn h-10 px-5 text-xs font-semibold rounded-xl"
              >
                Clear Search
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
