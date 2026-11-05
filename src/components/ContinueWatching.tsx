import React from 'react';
import { Play, X, Clock } from 'lucide-react';
import { ContinueWatchingItem, MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onRemove: (mediaId: string) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  items,
  mediaCatalog,
  onPlay,
  onRemove,
}) => {
  if (!items.length) return null;

  return (
    <section className="w-full py-4 space-y-3.5">
      <div className="flex items-center justify-between px-4 md:px-8">
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-white tracking-tight flex items-center gap-2">
            <span>Continue Watching</span>
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Pick up right where you left off
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 md:px-8">
        {items.map((item) => {
          const media = mediaCatalog.find((m) => m.id === item.mediaId);
          if (!media) return null;

          return (
            <div
              key={item.mediaId}
              className="group relative bg-[#130D21] rounded-xl overflow-hidden border border-purple-900/30 hover:border-purple-500/50 shadow-md transition-all duration-300"
            >
              {/* Thumbnail Container (16:9) */}
              <div 
                className="relative aspect-video w-full overflow-hidden cursor-pointer"
                onClick={() => onPlay(media)}
              >
                <ImageWithFallback
                  src={media.backdropUrl || media.posterUrl}
                  alt={media.title}
                  fallbackTitle={media.title}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-purple-900/60 transform group-hover:scale-110 active:scale-95 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Progress bar overlay at bottom of image */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-purple-950/80">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-r-full"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.mediaId);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-purple-200/80 hover:text-white transition-colors cursor-pointer"
                  title="Remove from history"
                  aria-label="Remove title from continue watching"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Timing Info */}
              <div className="p-3">
                <h4 className="font-semibold text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                  {media.title}
                </h4>

                <div className="flex items-center justify-between text-xs text-purple-200/60 mt-1">
                  <span>
                    {item.seasonNumber && item.episodeNumber
                      ? `S${item.seasonNumber} · E${item.episodeNumber}`
                      : media.quality}
                  </span>
                  <div className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-purple-400" />
                    <span>{item.currentTime} left</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
