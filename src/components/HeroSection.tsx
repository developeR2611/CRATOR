import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { getSynchronousKnownLogo, getTmdbLogo } from '../services/tmdb';
import { isMediaUnreleased, formatReleaseDate } from '../services/availability';
import { GlassButton } from './GlassButton';

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
  const touchStartXRef = useRef<number | null>(null);

  const slides = featuredItems.slice(0, 6);
  const slidesSignature = slides.map((item) => item.id).join('|');
  const safeIndex = currentIndex < slides.length ? currentIndex : 0;
  const currentItem = slides[safeIndex];

  const goToPrev = () => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

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

  // Auto advance every 7 seconds when not hovered
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7000);
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
  const country =
    currentItem.industry === 'Anime'
      ? 'Japan'
      : currentItem.language === 'Korean'
        ? 'South Korea'
        : 'United States';
  const isUnreleased = isMediaUnreleased(currentItem);
  const releaseLabel = formatReleaseDate(currentItem.releaseDate, currentItem.releaseYear);

  return (
    <section
      className="hero hero-home"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const startX = touchStartXRef.current;
        const endX = e.changedTouches[0]?.clientX ?? null;
        touchStartXRef.current = null;
        if (startX === null || endX === null) return;
        const delta = endX - startX;
        if (Math.abs(delta) > 45) {
          if (delta < 0) goToNext();
          else goToPrev();
        }
      }}
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
          const heroLogo =
            currentItem.logoUrl || dynamicLogos[currentItem.id] || getSynchronousKnownLogo(currentItem);
          return heroLogo ? (
            <div className="mb-2.5 max-w-xs sm:max-w-sm md:max-w-md">
              <img
                src={heroLogo}
                alt={currentItem.title}
                className="max-h-14 sm:max-h-16 md:max-h-20 w-auto object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] select-none"
              />
            </div>
          ) : (
            <h1 className="hero-title">{currentItem.title}</h1>
          );
        })()}

        {/* Clean Metadata Row */}
        <div className="hero-meta">
          {!isUnreleased && <span className="rating">★ {currentItem.rating.toFixed(1)}</span>}
          <span>{isUnreleased ? `Releases ${releaseLabel}` : currentItem.releaseYear}</span>
          <span>{contentType}</span>
          <span>{country}</span>
        </div>

        {/* Dual Actions: Play & More info */}
        <div className="hero-buttons">
          {isUnreleased ? (
            <span className="glass-surface inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-[#f3f0ea] cursor-default">
              <Calendar className="w-4 h-4" />
              <span>Releases {releaseLabel}</span>
            </span>
          ) : (
            <GlassButton
              variant="primary"
              size="lg"
              refractive={true}
              onClick={() => onPlay(currentItem)}
              title={`Play ${currentItem.title}`}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              <span>Play</span>
            </GlassButton>
          )}

          <GlassButton
            variant="secondary"
            size="lg"
            refractive={true}
            onClick={() => onOpenDetails(currentItem)}
            title={`More info about ${currentItem.title}`}
            leftIcon={<Info className="w-4 h-4" />}
          >
            <span>More info</span>
          </GlassButton>
        </div>

        {/* Mobile Carousel Dots */}
        {slides.length > 1 && (
          <div
            className="hero-dots mt-5 flex md:hidden"
            role="tablist"
            aria-label="Featured titles"
          >
            {slides.map((item, idx) => (
              <button
                key={`mobile-dot-${item.id}`}
                type="button"
                role="tab"
                aria-selected={idx === safeIndex}
                aria-label={`Slide ${idx + 1}: ${item.title}`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hero Aside (Lower Right - Desktop) */}
      <div className="hero-aside">
        {/* Trending Ranking Badge */}
        <span className="hero-badge">#{rankNumber} trending</span>

        {/* Carousel Navigation + Pagination Indicator Dots */}
        {slides.length > 1 && (
          <div className="flex items-center gap-2.5">
            <GlassButton
              variant="icon"
              size="icon"
              shape="circle"
              onClick={goToPrev}
              className="w-9 h-9"
              aria-label="Previous featured title"
              title="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </GlassButton>

            <div className="hero-dots" role="tablist" aria-label="Featured titles">
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

            <GlassButton
              variant="icon"
              size="icon"
              shape="circle"
              onClick={goToNext}
              className="w-9 h-9"
              aria-label="Next featured title"
              title="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </GlassButton>
          </div>
        )}
      </div>
    </section>
  );
};
