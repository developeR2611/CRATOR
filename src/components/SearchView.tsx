import React, { useState, useEffect, useRef, useTransition } from 'react';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Loader2, 
  AlertCircle, 
  RotateCcw,
  Film,
  Tv,
  Sparkles,
  Info
} from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { searchMovieBox, getMovieBoxConfigStatus, MovieBoxStatus } from '../services/moviebox';
import { searchTmdb, getTmdbStatus, TmdbStatus } from '../services/tmdb';
import { executeDualSearch } from '../services/dualSearch';

interface SearchViewProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
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
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  
  // Search API State
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiErrorCode, setApiErrorCode] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);
  const [configStatus, setConfigStatus] = useState<MovieBoxStatus | null>(null);
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus | null>(null);
  const [searchProvider, setSearchProvider] = useState<'all' | 'tmdb' | 'moviebox'>('all');

  // Request race-condition tracking
  const searchRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recent searches with persistence
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crator_recent_searches');
      return saved ? JSON.parse(saved) : ['Avatar', 'Dune', 'Severance'];
    } catch {
      return ['Avatar', 'Dune', 'Severance'];
    }
  });

  // Check MovieBox & TMDB server configuration status on mount
  useEffect(() => {
    inputRef.current?.focus();
    getMovieBoxConfigStatus().then(setConfigStatus);
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

  const [metrics, setMetrics] = useState<{ tmdbCount: number; movieBoxCount: number; matchedCount: number }>({
    tmdbCount: 0,
    movieBoxCount: 0,
    matchedCount: 0,
  });

  // Perform search (TMDB + MovieBox + curated catalogue fallback)
  const executeSearch = async (searchKeyword: string, targetPage: number = 1, append: boolean = false) => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setResults([]);
      setApiError(null);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    // Cancel previous request to avoid race condition
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentRequestId = ++searchRequestIdRef.current;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setApiError(null);
    }

    try {
      if (searchProvider === 'all') {
        const dualRes = await executeDualSearch(keyword, targetPage, mediaCatalog, abortController.signal);
        if (currentRequestId !== searchRequestIdRef.current) return;

        setMetrics({
          tmdbCount: dualRes.tmdbCount,
          movieBoxCount: dualRes.movieBoxCount,
          matchedCount: dualRes.matchedCount,
        });

        setIsUsingFallback(Boolean(dualRes.isUsingFallback));
        setHasMore(dualRes.hasMore);
        setPage(targetPage);
        setResults((prev) => {
          if (append) {
            const existingIds = new Set(prev.map((i) => i.id));
            const newUnique = dualRes.items.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newUnique];
          }
          return dualRes.items;
        });
      } else if (searchProvider === 'tmdb') {
        const tmdbRes = await searchTmdb(keyword, targetPage);
        if (currentRequestId !== searchRequestIdRef.current) return;

        setMetrics({ tmdbCount: tmdbRes.items.length, movieBoxCount: 0, matchedCount: 0 });
        setIsUsingFallback(false);
        setHasMore(tmdbRes.hasMore);
        setPage(targetPage);
        setResults((prev) => {
          if (append) {
            const existingIds = new Set(prev.map((i) => i.id));
            return [...prev, ...tmdbRes.items.filter((i) => !existingIds.has(i.id))];
          }
          return tmdbRes.items;
        });
      } else {
        const mbRes = await searchMovieBox(keyword, targetPage, 24, abortController.signal);
        if (currentRequestId !== searchRequestIdRef.current) return;

        setMetrics({ tmdbCount: 0, movieBoxCount: mbRes.items.length, matchedCount: mbRes.items.length });
        if (mbRes.error) {
          setApiError(mbRes.error);
          setApiErrorCode(mbRes.errorCode || 'MB_ERROR');
        }
        setIsUsingFallback(false);
        setHasMore(mbRes.hasMore);
        setPage(targetPage);
        setResults((prev) => {
          if (append) {
            const existingIds = new Set(prev.map((i) => i.id));
            return [...prev, ...mbRes.items.filter((i) => !existingIds.has(i.id))];
          }
          return mbRes.items;
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (currentRequestId === searchRequestIdRef.current) {
        setApiError(err.message || 'Search failed');
        setIsUsingFallback(true);
        const q = keyword.toLowerCase();
        const fallback = mediaCatalog.filter((i) => i.title.toLowerCase().includes(q));
        setResults(fallback);
      }
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  // Debounced live search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setApiError(null);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(query, 1, false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, searchProvider]);

  // Form submission (instant search on Enter key)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      executeSearch(query.trim(), 1, false);
    }
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    saveRecentSearch(tag);
    executeSearch(tag, 1, false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && query.trim()) {
      executeSearch(query, page + 1, true);
    }
  };

  // Filter the currently displayed results by Type and Genre
  const filteredResults = results.filter((item) => {
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (selectedGenre !== 'All' && !item.genres.includes(selectedGenre)) return false;
    return true;
  });

  return (
    <div className="w-full min-h-screen py-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight flex items-center gap-3 flex-wrap">
          <span>Search CRATOR</span>
          {tmdbStatus?.isVerified && (
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border bg-emerald-950/60 text-emerald-400 border-emerald-800/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>TMDB Live Active</span>
            </span>
          )}
          {configStatus && (
            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
              configStatus.hasSecret 
                ? 'bg-purple-950/60 text-purple-300 border-purple-800/40' 
                : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
            }`}>
              {configStatus.hasSecret ? 'MovieBox Worker Ready' : 'MovieBox Server Active'}
            </span>
          )}
        </h1>
        <p className="text-xs text-purple-200/60 mt-1">
          Search live across millions of titles powered by TMDB metadata and MovieBox streaming
        </p>
      </div>

      {/* Global Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-purple-400 absolute left-4 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies, TV shows, anime, actors (e.g. Avatar, Dune, Severance)..."
            className="w-full bg-[#120D1D] border border-purple-900/40 hover:border-purple-600/50 focus:border-purple-500 rounded-2xl pl-12 pr-24 py-3.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all shadow-lg shadow-purple-950/20"
          />

          <div className="absolute right-4 flex items-center gap-2">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setApiError(null);
                }}
                className="p-1 rounded-full text-purple-300/60 hover:text-white hover:bg-purple-900/40 transition-colors cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* API Notice / Banner when Secret or Error occurs */}
      {apiError && (
        <div className="p-4 rounded-xl bg-[#1D122B] border border-amber-500/40 text-xs text-amber-200/90 flex items-start gap-3 shadow-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>MovieBox API Notice ({apiErrorCode || 'Notice'})</span>
              {isUsingFallback && (
                <span className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded border border-purple-700/50">
                  Showing Curated Catalogue Results
                </span>
              )}
            </div>
            <p className="text-purple-200/80 leading-relaxed">
              {apiError}
            </p>
            {!configStatus?.hasSecret && (
              <p className="text-[11px] text-amber-300/80 font-mono pt-1">
                Tip: Add <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">MOVIEBOX_SECRET="your_secret"</code> to your server <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">.env</code> to authenticate live worker requests.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Quick Categorization */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Provider Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#120D1D] rounded-xl border border-purple-900/40">
            <span className="text-[10px] uppercase font-bold text-purple-400/60 px-2">Source:</span>
            {[
              { id: 'all', label: 'Unified (All)' },
              { id: 'tmdb', label: 'TMDB Live' },
              { id: 'moviebox', label: 'MovieBox' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSearchProvider(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  searchProvider === p.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#120D1D] rounded-xl border border-purple-900/40">
          {[
            { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'movie', label: 'Movies', icon: <Film className="w-3.5 h-3.5" /> },
            { id: 'series', label: 'Series', icon: <Tv className="w-3.5 h-3.5" /> },
            { id: 'anime', label: 'Anime', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedType === t.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-200/60 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        </div>

        {/* Quick Genre Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {['All', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Animation', 'Fantasy', 'Comedy'].map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                selectedGenre === genre
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50'
                  : 'bg-[#140E22] text-purple-300/60 hover:text-white border border-purple-900/30'
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
            <div className="bg-[#120D1D]/60 rounded-2xl p-4 border border-purple-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Recent Searches
                </span>
                <button
                  onClick={clearAllRecent}
                  className="text-[11px] text-purple-400/60 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleTagClick(item)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A122B] hover:bg-purple-900/40 text-xs text-purple-200 border border-purple-900/40 transition-colors cursor-pointer"
                  >
                    <span>{item}</span>
                    <span
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="text-purple-400/40 group-hover:text-purple-300 hover:text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          <div className="bg-[#120D1D]/60 rounded-2xl p-4 border border-purple-900/30 space-y-3">
            <span className="text-xs font-bold text-purple-300/60 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-fuchsia-400" />
              Popular Titles
            </span>

            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-3 py-1.5 rounded-xl bg-[#1A122B] hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-fuchsia-900/50 text-xs text-purple-200 hover:text-white border border-purple-900/40 transition-all cursor-pointer"
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
        <div className="space-y-4 pt-4 border-t border-purple-950/40">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Recommended to Browse</span>
            </h3>
            <span className="text-xs text-purple-200/50">Top cinema selections</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
            {mediaCatalog.slice(0, 12).map((item) => (
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
        <div className="flex flex-wrap items-center justify-between text-xs text-purple-200/60 pt-2 border-t border-purple-950/40 gap-2">
          <span>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                Searching TMDB & MovieBox concurrently for "{query}"...
              </span>
            ) : (
              <span className="flex items-center gap-2 flex-wrap">
                <span>Found <strong className="text-purple-200">{filteredResults.length}</strong> titles for "{query}"</span>
                {metrics.tmdbCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[10px] font-mono">
                    {metrics.tmdbCount} TMDB
                  </span>
                )}
                {metrics.movieBoxCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[10px] font-mono">
                    {metrics.movieBoxCount} MovieBox
                  </span>
                )}
                {metrics.matchedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 text-[10px] font-mono">
                    {metrics.matchedCount} Stream-Ready
                  </span>
                )}
                {isUsingFallback && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] font-mono">
                    Local Catalogue
                  </span>
                )}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && results.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-2 animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-[#150F22] border border-purple-900/20" />
              <div className="h-3 bg-purple-950/60 rounded w-3/4" />
              <div className="h-2.5 bg-purple-950/40 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {filteredResults.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
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
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/40 text-purple-200 hover:text-white text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
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
          <div className="py-20 text-center bg-[#120D1D]/40 rounded-2xl border border-purple-900/20 max-w-lg mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-900/30 flex items-center justify-center mx-auto text-purple-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">No results found for "{query}"</h3>
            <p className="text-xs text-purple-200/60 max-w-xs mx-auto">
              Check for typos or try searching with different keywords, actor names, or genres.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedGenre('All');
                  setSelectedType('all');
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
