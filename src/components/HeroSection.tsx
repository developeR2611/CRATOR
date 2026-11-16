import React, { useState, useEffect } from 'react';
import { Play, Info, Calendar } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { getSynchronousKnownLogo, getTmdbLogo } from '../services/tmdb';
import { isMediaUnreleased, formatReleaseDate } from '../services/availability';

interface HeroSectionProps {
  featuredItems: MediaItem[];
  isLoading?: boolean;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredItems,
  isLoading = false,
  onPlay,
  onOpenDetails,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dynamicLogos, setDynamicLogos] = useState<Record<string, string>>({});

  const slides = featuredItems.slice(0, 5);
  const slidesSignature = slides.map((item) => item.id).join('|');
  const safeIndex = currentIndex < slides.length ? currentIndex : 0;
  const currentItem = slides[safeIndex];

  // Reset slide index when dynamic slide set updates
  useEffect(() => {
    setCurrentIndex(0);
  }, [slidesSignature]);

  // Prefetch official graphic logos for all dynamic slides
  useEffect(() => {
    if (slides.length === 0) return;
    let isCancelled = false;

    slides.forEach((slide) => {
      const synchronousLogo = slide.logoUrl || getSynchronousKnownLogo(slide);
      if (synchronousLogo || dynamicLogos[slide.id]) return;

      const isTv = slide.type === 'series' || slide.type === 'anime';
      const lookupId = slide.tmdbId || slide.id;
      getTmdbLogo(isTv ? 'tv' : 'movie', lookupId)
        .then((url) => {
          if (!isCancelled && url) {
            setDynamicLogos((prev) => (prev[slide.id] ? prev : { ...prev, [slide.id]: url }));
          }
        })
        .catch(() => {});
    });

    return () => {
      isCancelled = true;
    };
  }, [slidesSignature]);

  // Auto advance every 8 seconds when not hovered
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  if (!currentItem) {
    if (!isLoading) return null;
    return (
      <section className="hero hero-home" aria-busy="true" aria-label="Loading featured titles">
        <div className="hero-media bg-[#07090e]">
          <div className="hero-fade" />
        </div>
        <div className="hero-shade" />
        <div className="hero-content space-y-4">
          <div className="h-12 sm:h-16 w-64 sm:w-80 rounded-2xl bg-white/10 animate-pulse" />
          <div className="h-4 w-48 rounded-full bg-white/10 animate-pulse" />
          <div className="flex gap-3 pt-1">
            <div className="h-11 w-28 rounded-full bg-white/15 animate-pulse" />
            <div className="h-11 w-32 rounded-full bg-white/10 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  const contentType = currentItem.type === 'movie' ? 'Movie' : 'TV';
  const rankNumber = safeIndex + 1;
  const country = currentItem.industry === 'Anime' ? 'Japan' : (currentItem.language === 'Korean' ? 'South Korea' : 'United States');
  const isUnreleased = isMediaUnreleased(currentItem);
  const releaseLabel = formatReleaseDate(currentItem.releaseDate, currentItem.releaseYear);

  return (
    <section 
      className="hero hero-home"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Cinematic Background Backdrop Art with Crossfade */}
      <div className="hero-media">
        {slides.map((item, idx) => {
          const isActive = idx === safeIndex;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                isActive ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <ImageWithFallback
                src={item.backdropUrl || item.posterUrl}
                fallbackSrc={item.fallbackBackdropUrl || item.fallbackPosterUrl}
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
        {/* Title or Official Graphic Logo */}
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
          {!isUnreleased && <span className="rating">★ {currentItem.rating.toFixed(1)}</span>}
          <span>{isUnreleased ? `Releases ${releaseLabel}` : currentItem.releaseYear}</span>
          <span>{contentType}</span>
          <span>{country}</span>
        </div>

        {/* Dual Actions: Play & More info */}
        <div className="hero-buttons">
          {isUnreleased ? (
            <span className="secondary-btn cursor-default">
              <Calendar className="w-4 h-4" />
              <span>Releases {releaseLabel}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onPlay(currentItem)}
              className="primary-btn"
              title={`Play ${currentItem.title}`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play</span>
            </button>
          )}

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
        {/* Trending Ranking Badge */}
        <span className="hero-badge">
          #{rankNumber} trending
        </span>

        {/* Pagination Indicator Dots */}
        <div 
          className="hero-dots" 
          role="tablist" 
          aria-label="Featured titles"
        >
          {slides.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={idx === safeIndex}
              aria-label={`Slide ${idx + 1}: ${item.title}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
