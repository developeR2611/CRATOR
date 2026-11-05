import React, { useState, useEffect } from 'react';
import { Play, Info, Bookmark, Star } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface HeroSectionProps {
  featuredItems: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredItems,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentItem = featuredItems[currentIndex] || featuredItems[0];
  const inWatchlist = currentItem ? isInWatchlist(currentItem.id) : false;

  // Auto advance every 7.5 seconds when not hovered
  useEffect(() => {
    if (isPaused || featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [isPaused, featuredItems.length]);

  if (!currentItem) return null;

  return (
    <div 
      className="relative w-full h-[520px] md:h-[620px] lg:h-[680px] overflow-hidden select-none bg-[#08060D]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Backdrop Art with Butter-Smooth Crossfade */}
      <div className="absolute inset-0 z-0">
        {featuredItems.map((item, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out transform-gpu will-change-transform ${
                isActive ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <ImageWithFallback
                src={item.backdropUrl}
                alt={item.title}
                fallbackTitle={item.title}
                containerClassName="w-full h-full"
                className={`w-full h-full object-cover object-center filter brightness-[0.85] transition-transform duration-7000 ease-out transform-gpu ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>
          );
        })}

        {/* Cinematic Scrim & Gradients */}
        {/* Left darkening for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08060D] via-[#08060D]/85 to-transparent w-full md:w-3/4 z-10 pointer-events-none" />
        {/* Bottom fade to page canvas */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08060D] via-[#08060D]/40 to-transparent z-10 pointer-events-none" />
        {/* Top subtle vignette */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#08060D]/75 to-transparent z-10 pointer-events-none" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-12 md:pb-16">
        <div 
          key={currentItem.id} 
          className="max-w-2xl space-y-4 animate-fade-in"
          style={{
            animation: 'heroContentFade 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {/* Metadata Row: Zero-pill discipline */}
          <div className="flex items-center flex-wrap gap-2.5 text-xs font-medium text-purple-200/80">
            {/* Rating */}
            <span className="flex items-center gap-1 font-bold text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{currentItem.rating.toFixed(1)}</span>
            </span>

            <span className="text-purple-400/40" aria-hidden="true">·</span>

            {/* Year */}
            <span>{currentItem.releaseYear}</span>

            <span className="text-purple-400/40" aria-hidden="true">·</span>

            {/* Content Type */}
            <span className="capitalize">{currentItem.type}</span>

            <span className="text-purple-400/40" aria-hidden="true">·</span>

            {/* Age Rating / Quality */}
            <span className="px-1.5 py-0.5 rounded border border-purple-400/30 text-[10px] text-purple-300 font-mono">
              {currentItem.ageRating}
            </span>

            <span className="text-purple-400/40" aria-hidden="true">·</span>

            <span className="text-purple-300/90 font-mono text-[11px]">
              {currentItem.quality}
            </span>

            <span className="text-purple-400/40" aria-hidden="true">·</span>

            {/* Genres */}
            <span className="text-purple-300/70">
              {currentItem.genres.slice(0, 2).join(' / ')}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl tracking-tight text-white drop-shadow-md line-clamp-2">
            {currentItem.title}
          </h1>

          {/* Synopsis */}
          <p className="text-sm md:text-base text-purple-100/75 line-clamp-3 leading-relaxed max-w-xl">
            {currentItem.synopsis}
          </p>

          {/* CTA Actions */}
          <div className="flex items-center flex-wrap gap-3 pt-2">
            <button
              onClick={() => onPlay(currentItem)}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/40 hover:shadow-purple-500/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={() => onOpenDetails(currentItem)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-white font-medium text-sm backdrop-blur-md transition-all hover:border-purple-400/50 cursor-pointer"
            >
              <Info className="w-4 h-4 text-purple-300" />
              <span>Details</span>
            </button>

            <button
              onClick={() => onToggleWatchlist(currentItem)}
              className={`p-3 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                inWatchlist
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                  : 'bg-purple-950/40 text-purple-200 border-purple-800/40 hover:bg-purple-900/60 hover:text-white'
              }`}
              title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Bookmark className={`w-4 h-4 ${inWatchlist ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thumbnail Selector Strip (Bottom Right) */}
        <div className="hidden md:flex items-center gap-3 absolute bottom-12 right-8 z-30">
          <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md p-1.5 rounded-2xl border border-purple-900/40 shadow-xl">
            {featuredItems.map((item, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`group relative w-16 h-10 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${
                    active
                      ? 'ring-2 ring-purple-500 scale-105 shadow-md shadow-purple-900/60'
                      : 'opacity-50 hover:opacity-100 hover:scale-102'
                  }`}
                  aria-label={`Switch to featured title ${item.title}`}
                >
                  <img
                    src={item.backdropUrl || item.posterUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  {active && (
                    <div className="absolute inset-0 bg-purple-600/25" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
