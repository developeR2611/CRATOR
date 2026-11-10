import React, { useState, useEffect } from 'react';
import { Play, Info } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { getSynchronousKnownLogo, getTmdbLogo } from '../services/tmdb';

interface HeroSectionProps {
  featuredItems: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredItems,
  onPlay,
  onOpenDetails,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dynamicLogos, setDynamicLogos] = useState<Record<string, string>>({});

  const currentItem = featuredItems[currentIndex] || featuredItems[0];

  // Fetch logo if not synchronously known
  useEffect(() => {
    if (!currentItem) return;
    const synchronousLogo = currentItem.logoUrl || getSynchronousKnownLogo(currentItem);
    if (!synchronousLogo && !dynamicLogos[currentItem.id]) {
      const isTv = currentItem.type === 'series' || currentItem.type === 'anime';
      const lookupId = currentItem.tmdbId || currentItem.id;
      getTmdbLogo(isTv ? 'tv' : 'movie', lookupId).then((url) => {
        if (url) {
          setDynamicLogos((prev) => ({ ...prev, [currentItem.id]: url }));
        }
      }).catch(() => {});
    }
  }, [currentItem?.id]);

  // Auto advance every 8 seconds when not hovered
  useEffect(() => {
    if (isPaused || featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, featuredItems.length]);

  if (!currentItem) return null;

  const contentType = currentItem.type === 'movie' ? 'Movie' : 'TV';
  const rankNumber = currentItem.topTenRank || (currentIndex + 1);
  const country = currentItem.industry === 'Anime' ? 'Japan' : (currentItem.language === 'Korean' ? 'South Korea' : 'United States');

  return (
    <section 
      className="hero hero-home"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Cinematic Background Backdrop Art with Crossfade */}
      <div className="hero-media">
        {featuredItems.map((item, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                isActive ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <ImageWithFallback
                src={item.backdropUrl || item.posterUrl}
                alt={item.title}
                fallbackTitle={item.title}
                containerClassName="w-full h-full"
                className="hero-media-image"
              />
            </div>
          );
        })}
        {/* Dark vertical bottom-to-top gradient */}
        <div className="hero-fade" />
      </div>

      {/* Dark horizontal left-to-right gradient for text legibility */}
      <div className="hero-shade" />

      {/* Hero Content (Lower Left) */}
      <div key={`content-${currentItem.id}`} className="hero-content">
        {/* Title */}
        {/* Title or Official TMDB Graphic Logo */}
        {(() => {
          const heroLogo = currentItem.logoUrl || dynamicLogos[currentItem.id] || getSynchronousKnownLogo(currentItem);
          return heroLogo ? (
            <div className="mb-2.5 max-w-xs sm:max-w-sm md:max-w-md">
              <img
                src={heroLogo}
                alt={currentItem.title}
                className="max-h-14 sm:max-h-16 md:max-h-20 w-auto object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] select-none"
              />
            </div>
          ) : (
            <h1 className="hero-title">
              {currentItem.title}
            </h1>
          );
        })()}

        {/* Clean Metadata Row (No pills) */}
        <div className="hero-meta">
          <span className="rating">★ {currentItem.rating.toFixed(1)}</span>
          <span>{currentItem.releaseYear}</span>
          <span>{contentType}</span>
          <span>{country}</span>
        </div>

        {/* Dual Actions: Play & More info */}
        <div className="hero-buttons">
          <button
            type="button"
            onClick={() => onPlay(currentItem)}
            className="primary-btn"
            title={`Play ${currentItem.title}`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDetails(currentItem)}
            className="secondary-btn"
            title={`More info about ${currentItem.title}`}
          >
            <Info className="w-4 h-4" />
            <span>More info</span>
          </button>
        </div>
      </div>

      {/* Hero Aside (Lower Right) */}
      <div className="hero-aside">
        {/* Top 10 Ranking Badge */}
        <span className="hero-badge">
          #{rankNumber} in {currentItem.type === 'movie' ? 'movies' : 'series'}
        </span>

        {/* Pagination Indicator Dots */}
        <div 
          className="hero-dots" 
          role="tablist" 
          aria-label="Featured titles"
        >
          {featuredItems.slice(0, 5).map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Slide ${idx + 1}: ${item.title}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
