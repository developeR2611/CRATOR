import React, { useState, useMemo } from 'react';
import { Bookmark, Film, Tv, Sparkles, Trash2, Compass } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface WatchlistViewProps {
  watchlistIds: string[];
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onClearWatchlist: () => void;
  onExplore: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlistIds,
  mediaCatalog,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  onClearWatchlist,
  onExplore,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series' | 'anime'>('all');

  const watchlistItems = useMemo(() => {
    return mediaCatalog.filter((item) => watchlistIds.includes(item.id));
  }, [mediaCatalog, watchlistIds]);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return watchlistItems;
    return watchlistItems.filter((item) => item.type === filterType);
  }, [watchlistItems, filterType]);

  return (
    <div className="w-full min-h-screen py-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-purple-400" />
            <span>My Watchlist</span>
          </h1>
          <p className="text-xs text-purple-200/60 mt-1">
            {watchlistItems.length} {watchlistItems.length === 1 ? 'title' : 'titles'} saved to your library
          </p>
        </div>

        {watchlistItems.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#120D1D] rounded-xl border border-purple-900/40">
              {[
                { id: 'all', label: 'All' },
                { id: 'movie', label: 'Movies' },
                { id: 'series', label: 'Series' },
                { id: 'anime', label: 'Anime' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    filterType === t.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-purple-200/60 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Clear All */}
            <button
              onClick={onClearWatchlist}
              className="p-2 rounded-xl bg-purple-950/40 hover:bg-rose-950/60 text-purple-300 hover:text-rose-300 border border-purple-900/40 transition-colors cursor-pointer"
              title="Clear Watchlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid or Empty State */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
          {filteredItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              onToggleWatchlist={onToggleWatchlist}
              isInWatchlist={true}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-[#120D1D]/40 rounded-2xl border border-purple-900/20 max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-purple-900/30 flex items-center justify-center mx-auto text-purple-400">
            <Bookmark className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-white">Your Watchlist is empty</h3>
            <p className="text-xs text-purple-200/60 max-w-xs mx-auto">
              Save movies, exclusive series, and anime to your personal watchlist to stream them anytime.
            </p>
          </div>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/50 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Titles</span>
          </button>
        </div>
      )}
    </div>
  );
};
