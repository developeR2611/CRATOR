import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { NEW_EPISODES, NewEpisodeItem } from '../data/mockData';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface NewEpisodesProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
}

export const NewEpisodes: React.FC<NewEpisodesProps> = ({
  mediaCatalog,
  onPlay,
  onOpenDetails,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="rail new-episodes-rail">
      {/* 7Movies Rail Heading */}
      <div className="rail-heading">
        <div>
          <p className="eyebrow">FROM SHOWS YOU WATCH OR SAVED</p>
          <h2>New episodes</h2>
        </div>
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
          {NEW_EPISODES.map((ep: NewEpisodeItem) => {
            const media = mediaCatalog.find((m) => m.id === ep.mediaId);

            return (
              <div
                key={ep.id}
                onClick={() => {
                  if (media) onOpenDetails(media);
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && media) {
                    e.preventDefault();
                    onOpenDetails(media);
                  }
                }}
                className="media-card is-wide group"
                role="button"
                tabIndex={0}
                aria-label={`${ep.showTitle} - ${ep.episodeTitle}`}
              >
                {/* 16:9 Landscape Poster */}
                <div className="poster is-wide">
                  <ImageWithFallback
                    src={ep.thumbnail}
                    alt={ep.episodeTitle}
                    fallbackTitle={ep.showTitle}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />

                  {/* Badge top right */}
                  <span className="card-badge">
                    {ep.statusBadge === 'Finale' ? 'Finale' : 'New episode'}
                  </span>

                  {/* Play hover button */}
                  <div className="absolute inset-0 z-[2] flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (media) onPlay(media);
                      }}
                      className="w-11 h-11 rounded-full glass-pill-active flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform pointer-events-auto cursor-pointer"
                      title="Play Episode"
                      aria-label={`Play ${ep.showTitle} ${ep.seasonEpisode}`}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  {/* Bottom details on poster */}
                  <div className="absolute bottom-2.5 left-3 right-3 z-10 pointer-events-none">
                    <span className="glass-badge inline-block px-2 py-0.5 rounded-full text-[11px] font-mono text-white/95">
                      {ep.seasonEpisode} · {ep.runtime}
                    </span>
                  </div>
                </div>

                {/* Minimal Card Copy below image */}
                <div className="card-copy">
                  <h3>{ep.showTitle}</h3>
                  <p>{ep.episodeTitle}</p>
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
