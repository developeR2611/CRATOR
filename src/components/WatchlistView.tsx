import React, { useState, useMemo } from 'react';
import { Bookmark, Trash2, Compass } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { GlassButton } from './GlassButton';

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
    <div className="w-full min-h-[70vh] py-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow block">PERSONAL LIBRARY</span>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-[#f3f0ea] tracking-tight flex items-center gap-2 mt-1">
            <Bookmark className="w-5 h-5 text-white" />
            <span>My List</span>
          </h1>
          <p className="text-xs text-[#8e8a91] mt-1 font-mono">
            {watchlistItems.length} {watchlistItems.length === 1 ? 'title' : 'titles'} saved to your library
          </p>
        </div>

        {watchlistItems.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="dz-type" role="group" aria-label="Filter saved titles">
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
                  active={filterType === t.id}
                  aria-pressed={filterType === t.id}
                  onClick={() => setFilterType(t.id as any)}
                  className="dz-type-btn"
                >
                  {t.label}
                </GlassButton>
              ))}
            </div>

            {/* Clear All */}
            <GlassButton
              variant="danger"
              size="icon"
              shape="square"
              onClick={onClearWatchlist}
              title="Clear Library"
              aria-label="Clear Library"
            >
              <Trash2 className="w-4 h-4" />
            </GlassButton>
          </div>
        )}
      </div>

      {/* Grid or Empty State */}
      {filteredItems.length > 0 ? (
        <div className="dz-grid">
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
        <div className="glass-panel py-20 text-center rounded-2xl max-w-lg mx-auto space-y-4 px-6">
          <div className="glass-surface w-14 h-14 rounded-full flex items-center justify-center mx-auto text-white">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-[#f3f0ea]">Your list is empty</h3>
            <p className="text-xs text-[#9a9ba1] max-w-xs mx-auto">
              Save movies and TV shows to your list to easily stream them anytime.
            </p>
          </div>
          <GlassButton
            variant="primary"
            size="md"
            refractive={true}
            onClick={onExplore}
            leftIcon={<Compass className="w-4 h-4" />}
          >
            <span>Discover Titles</span>
          </GlassButton>
        </div>
      )}
    </div>
  );
};
