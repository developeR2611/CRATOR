import React from 'react';
import { Play, Info } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { availabilityService, formatReleaseDate } from '../services/availability';

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
  const availability = availabilityService.checkAvailability(item);
  const isPlayable = availability.isAvailable;
  const isUnreleased = availability.confidence === 'unreleased';
  const isFresh = item.isFresh || item.releaseYear >= 2024;
  const isTopTen = typeof rankingNumber === 'number';
  const displayType = item.type === 'movie' ? 'Movie' : (item.type === 'anime' ? 'Anime' : 'TV');
  const displayRelease = isUnreleased
    ? formatReleaseDate(item.releaseDate, item.releaseYear)
    : item.releaseYear;

  return (
    <div 
      className={`media-card ${isWide ? 'is-wide' : 'is-poster'} group`}
      onClick={() => onOpenDetails(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetails(item);
        }
      }}
      role="button"
      tabIndex={0}
      data-media-card="true"
      aria-label={`${item.title} (${displayRelease})`}
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

        {/* Top-Right Badge: Availability / Fresh Status */}
        {!isTopTen && (
          <>
            {!isPlayable ? (
              <span className="card-badge !bg-none glass-badge text-[#e8e6e1]">
                {isUnreleased ? 'Coming Soon' : 'Unavailable'}
              </span>
            ) : isFresh ? (
              <span className="card-badge text-white">
                {item.type === 'series' ? 'New episode' : 'New release'}
              </span>
            ) : null}
          </>
        )}

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-0 z-[2] bg-black/35 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          {isPlayable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(item);
              }}
              className="w-11 h-11 rounded-full glass-pill-active flex items-center justify-center shadow-xl transform group-hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title={`Play ${item.title}`}
              aria-label={`Play ${item.title}`}
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(item);
              }}
              className="w-11 h-11 rounded-full glass-control text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title={`${availability.reason} - Click for details`}
              aria-label={`Details for ${item.title}`}
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Card Copy below Poster */}
      <div className="card-copy">
        <h3 title={item.title}>
          {item.title}
        </h3>

        <p>
          <span>{displayRelease}</span>
          <span>·</span>
          <span>{displayType}</span>
          {!isUnreleased && (
            <>
              <span>·</span>
              <span className="card-rating-star">★</span>
              <span>{item.rating.toFixed(1)}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

