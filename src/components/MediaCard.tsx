import React from 'react';
import { Play, Info, Bookmark, Star } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface MediaCardProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: boolean;
  rankingNumber?: number; // For Top 10 cards
  compact?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  rankingNumber,
  compact = false,
}) => {
  return (
    <div 
      className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out transform-gpu select-none hover:-translate-y-1"
      onClick={() => onOpenDetails(item)}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#130E20] border border-purple-900/20 group-hover:border-purple-500/50 shadow-md group-hover:shadow-2xl group-hover:shadow-purple-950/60 transition-all duration-300 ease-out transform-gpu">
        <ImageWithFallback
          src={item.posterUrl}
          fallbackSrc={item.fallbackPosterUrl}
          alt={item.title}
          fallbackTitle={item.title}
          containerClassName="w-full h-full"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 transform-gpu will-change-transform"
        />

        {/* Subtle Top Gradient for Badges */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

        {/* Top Badges (Quality / Platform / Episode badge) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none gap-1">
          <span className="text-[9px] font-bold tracking-wider uppercase bg-emerald-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-500/40 font-mono shadow-sm">
            CineSRC 4K
          </span>

          {/* Platform pill indicator */}
          <span className="text-[10px] font-medium bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-slate-300 border border-white/10 shrink-0">
            {item.platform}
          </span>
        </div>

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5 z-20">
          <div className="flex items-center justify-center gap-3 mb-2">
            {/* Quick Play */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(item);
              }}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/60 transform hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Watch Now"
              aria-label="Play title"
            >
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </button>

            {/* Quick Details */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(item);
              }}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-purple-900/60 text-white flex items-center justify-center border border-purple-500/40 backdrop-blur-md transform hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="View Details"
              aria-label="View title details"
            >
              <Info className="w-4 h-4 text-purple-300" />
            </button>

            {/* Watchlist Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(item);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transform hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                isInWatchlist
                  ? 'bg-purple-600 text-white border border-purple-400'
                  : 'bg-black/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40'
              }`}
              title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-4 h-4 ${isInWatchlist ? 'fill-white' : ''}`} />
            </button>
          </div>

          <p className="text-[11px] text-purple-200/80 text-center line-clamp-2 px-1">
            {item.genres.slice(0, 2).join(' · ')}
          </p>
        </div>

        {/* Large Purple Ranking Number for Top 10 */}
        {typeof rankingNumber === 'number' && (
          <div className="absolute -bottom-2 -left-2 z-10 pointer-events-none">
            <span 
              className="font-display font-black text-6xl md:text-7xl leading-none text-[#0B0814] select-none"
              style={{
                WebkitTextStroke: '2px #a855f7',
                textShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
              }}
            >
              {rankingNumber}
            </span>
          </div>
        )}
      </div>

      {/* Clean Metadata below Poster */}
      <div className="mt-2.5 px-0.5 space-y-1">
        <h3 className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
          {item.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-purple-200/60">
          <span className="flex items-center gap-1 font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{item.rating.toFixed(1)}</span>
          </span>

          <span aria-hidden="true">·</span>
          <span>{item.releaseYear}</span>

          <span aria-hidden="true">·</span>
          <span className="capitalize">{item.type}</span>
        </div>
      </div>
    </div>
  );
};
