import React, { useRef } from 'react';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ContinueWatchingItem, MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onRemove: (mediaId: string) => void;
  onClearHistory?: () => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  items,
  mediaCatalog,
  onPlay,
  onRemove,
  onClearHistory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="rail continue-rail">
      {/* 7Movies Rail Heading */}
      <div className="rail-heading">
        <div>
          <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
          <h2>Continue watching</h2>
        </div>

        {onClearHistory && (
          <button 
            type="button"
            onClick={onClearHistory}
            className="rail-action"
            title="Clear all watch history"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Rail Row Wrap with Arrows */}
      <div className="rail-row-wrap">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="rail-arrow rail-arrow-left"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div ref={scrollRef} className="card-row">
          {items.map((item) => {
            const media = mediaCatalog.find((m) => m.id === item.mediaId);
            if (!media) return null;

            return (
              <div
                key={item.mediaId}
                className="media-card is-wide group"
                onClick={() => onPlay(media)}
                role="button"
                tabIndex={0}
                aria-label={`Continue watching ${media.title}`}
              >
                {/* 16:9 Landscape Poster */}
                <div className="poster is-wide">
                  <ImageWithFallback
                    src={media.backdropUrl || media.posterUrl}
                    alt={media.title}
                    fallbackTitle={media.title}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Dark gradient overlay behind text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                  {/* Play icon hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.mediaId);
                    }}
                    className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white transition-colors cursor-pointer z-10"
                    title="Remove from history"
                    aria-label={`Remove ${media.title} from history`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Content Overlay at bottom of image */}
                  <div className="absolute bottom-2.5 left-3 right-3 z-10 pointer-events-none">
                    <h3 className="font-display font-semibold text-sm text-white truncate drop-shadow-md">
                      {media.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-[#beb9bc] mt-0.5 font-mono">
                      <span>
                        {item.seasonNumber && item.episodeNumber
                          ? `S${item.seasonNumber}:E${item.episodeNumber}`
                          : (item.currentTime ? `${item.currentTime} left` : `${item.progressPercent}%`)}
                      </span>
                      <span>{item.progressPercent}%</span>
                    </div>
                  </div>

                  {/* Thin bottom progress indicator bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 pointer-events-none">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="rail-arrow rail-arrow-right"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
