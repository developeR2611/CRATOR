import React from 'react';
import { Play } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface MediaCardProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist?: (item: MediaItem) => void;
  isInWatchlist?: boolean;
  rankingNumber?: number; // For Top 10 cards
  isWide?: boolean; // For 16:9 wide cards
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  onOpenDetails,
  rankingNumber,
  isWide = false,
}) => {
  const isFresh = item.isFresh || item.releaseYear >= 2024;
  const isTopTen = typeof rankingNumber === 'number';
  const displayType = item.type === 'movie' ? 'Movie' : (item.type === 'anime' ? 'Anime' : 'TV');

  return (
    <div 
      className={`media-card ${isWide ? 'is-wide' : 'is-poster'} group`}
      onClick={() => onOpenDetails(item)}
      role="button"
      tabIndex={0}
      data-media-card="true"
      aria-label={`${item.title} (${item.releaseYear})`}
    >
      {/* Poster Image Container */}
      <div className={`poster ${isWide ? 'is-wide' : ''}`}>
        <ImageWithFallback
          src={isWide ? (item.backdropUrl || item.posterUrl) : item.posterUrl}
          fallbackSrc={isWide ? item.posterUrl : item.backdropUrl}
          alt={item.title}
          fallbackTitle={item.title}
          containerClassName="w-full h-full"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Top-Left Card Number (For Top 10 or rankings) */}
        {isTopTen && (
          <span className="card-number">
            {rankingNumber}
          </span>
        )}

        {/* Top-Right Badge (e.g. New episode / New release) */}
        {isFresh && !isTopTen && (
          <span className="card-badge">
            {item.type === 'series' ? 'New episode' : 'New release'}
          </span>
        )}

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform group-hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title={`Play ${item.title}`}
            aria-label={`Play ${item.title}`}
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        </div>
      </div>

      {/* Clean 7Movies Card Copy below Poster */}
      <div className="card-copy">
        <h3 title={item.title}>
          {item.title}
        </h3>

        <p>
          <span>{item.releaseYear}</span>
          <span>·</span>
          <span>{displayType}</span>
          <span>·</span>
          <span className="card-rating-star">★</span>
          <span>{item.rating.toFixed(1)}</span>
        </p>
      </div>
    </div>
  );
};
