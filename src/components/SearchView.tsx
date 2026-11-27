import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { searchTmdb } from '../services/tmdb';
import { availabilityService } from '../services/availability';
import { GlassButton } from './GlassButton';

interface SearchViewProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}

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

  // Search API State
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Request race-condition tracking
  const searchRequestIdRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmittedQueryRef = useRef<string>(initialQuery);

  useEffect(() => {
    if (initialQuery !== lastEmittedQueryRef.current) {
      lastEmittedQueryRef.current = initialQuery;
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onQueryChange?.(trimmed);
      executeSearch(trimmed, 1, false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      executeSearch(query, page + 1, true);
    }
  };

  const [onlyPlayable] = useState<boolean>(true);

  // Filter currently displayed results by Availability (keep released + upcoming unreleased) and Type
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
    return true;
  });

  return (
    <div className="w-full min-h-screen pt-2 pb-6 min-[801px]:py-6 px-4 md:px-8 space-y-5 max-w-7xl mx-auto">
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

          <div className="absolute right-3 flex items-center gap-2 z-10">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            )}
            {query && (
              <GlassButton
                variant="icon"
                size="icon"
                shape="circle"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="!w-7 !h-7"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </GlassButton>
            )}
          </div>
        </div>
      </form>

      {/* Type Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="dz-type" role="group" aria-label="Filter search by type">
          {[
            { id: 'all', label: 'All' },
            { id: 'movie', label: 'Movies' },
            { id: 'series', label: 'TV Shows' },
          ].map((t) => (
            <GlassButton
              key={t.id}
              variant="navigation"
              size="sm"
              shape="pill"
              active={selectedType === t.id}
              aria-pressed={selectedType === t.id}
              onClick={() => setSelectedType(t.id as any)}
              className="dz-type-btn"
            >
              {t.label}
            </GlassButton>
          ))}
        </div>
      </div>

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
              <GlassButton
                variant="primary"
                size="md"
                refractive={true}
                onClick={handleLoadMore}
                loading={isLoadingMore}
                leftIcon={isLoadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
              >
                <span>{isLoadingMore ? 'Loading more titles...' : 'Load More Results'}</span>
              </GlassButton>
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
              <GlassButton
                variant="primary"
                size="md"
                refractive={true}
                onClick={() => {
                  setQuery('');
                  setSelectedType('all');
                }}
              >
                Clear Search
              </GlassButton>
            </div>
          </div>
        )
      )}
    </div>
  );
};
