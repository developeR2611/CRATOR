import React, { useState, useMemo } from 'react';
import { Layers, Film, Tv } from 'lucide-react';
import { MediaItem, StreamingPlatform } from '../types';
import { PLATFORMS_LIST } from '../data/mockData';
import { MediaCard } from './MediaCard';

interface PlatformsViewProps {
  platform: StreamingPlatform;
  mediaCatalog: MediaItem[];
  onSelectPlatform: (platform: StreamingPlatform) => void;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
}

export const PlatformsView: React.FC<PlatformsViewProps> = ({
  platform,
  mediaCatalog,
  onSelectPlatform,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');

  const currentPlatformInfo = PLATFORMS_LIST.find((p) => p.name === platform) || PLATFORMS_LIST[0];

  const platformItems = useMemo(() => {
    return mediaCatalog.filter((item) => {
      if (item.platform !== platform) return false;
      if (typeFilter === 'movie' && item.type !== 'movie') return false;
      if (typeFilter === 'series' && item.type !== 'series' && item.type !== 'anime') return false;
      return true;
    });
  }, [mediaCatalog, platform, typeFilter]);

  return (
    <div className="w-full min-h-screen py-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto">
      {/* Platform Switcher Horizontal Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {PLATFORMS_LIST.map((p) => {
          const active = p.name === platform;
          return (
            <button
              key={p.name}
              onClick={() => onSelectPlatform(p.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 border border-purple-400/40'
                  : 'bg-[#140E22] text-purple-200/70 hover:text-white hover:bg-[#1E1433] border border-purple-900/30'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Platform Showcase Banner */}
      <div 
        className="relative rounded-2xl overflow-hidden p-6 md:p-8 border border-purple-900/40 bg-gradient-to-r from-[#140D26] via-[#100B1E] to-[#0A0713]"
      >
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentPlatformInfo.color }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: currentPlatformInfo.color }}
              />
              <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                Official Streaming Hub
              </span>
            </div>

            <h1 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight">
              {platform} on CRATOR
            </h1>

            <p className="text-xs md:text-sm text-purple-200/75 leading-relaxed">
              Stream premier originals, critically acclaimed dramas, blockbuster movies, and award-winning releases in ultra-crisp 4K HDR with Spatial Audio.
            </p>
          </div>

          {/* Quick Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#0A0713]/80 backdrop-blur-md rounded-xl border border-purple-900/40 self-start md:self-auto">
            {[
              { id: 'all', label: 'All Titles' },
              { id: 'movie', label: 'Movies' },
              { id: 'series', label: 'Series & Anime' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-200/60 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-purple-200/60 pt-1">
        <span>
          Showing <strong className="text-purple-300">{platformItems.length}</strong> titles from {platform}
        </span>
      </div>

      {/* Grid */}
      {platformItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
          {platformItems.map((item) => (
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
        <div className="py-16 text-center bg-[#120D1D]/40 rounded-2xl border border-purple-900/20 max-w-lg mx-auto space-y-3">
          <p className="text-xs text-purple-200/60">
            No titles match the selected filter on {platform}.
          </p>
          <button
            onClick={() => setTypeFilter('all')}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
          >
            Show All {platform} Titles
          </button>
        </div>
      )}
    </div>
  );
};
