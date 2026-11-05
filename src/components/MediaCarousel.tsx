import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  showRankingNumbers?: boolean;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  subtitle,
  items,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  showRankingNumbers = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mouse drag-to-scroll state for fluid desktop interaction
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Check scroll boundary state with throttle for 60/120fps smoothness
  const updateScrollBounds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollBounds();
    const handleScroll = () => {
      window.requestAnimationFrame(updateScrollBounds);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [items, updateScrollBounds]);

  // Smooth scroll by integer whole cards
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;

    const firstCard = el.querySelector<HTMLElement>('[data-carousel-card]');
    const cardWidth = firstCard ? firstCard.offsetWidth : 180;
    const gap = 16; // gap-4
    const totalStep = cardWidth + gap;

    // Scroll by an integer number of fully visible cards
    const visibleCards = Math.max(1, Math.floor(el.clientWidth / totalStep));
    const scrollAmount = visibleCards * totalStep;

    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Mouse drag to scroll handlers (frictionless drag on desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with primary mouse button
    if (e.button !== 0 || !scrollRef.current) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollStartLeftRef.current = scrollRef.current.scrollLeft;
    hasDraggedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const delta = x - startXRef.current;

    if (Math.abs(delta) > 5) {
      hasDraggedRef.current = true;
      // Disable snap during active drag for fluid 1:1 finger/mouse tracking
      scrollRef.current.style.scrollSnapType = 'none';
      scrollRef.current.style.scrollBehavior = 'auto';
      scrollRef.current.scrollLeft = scrollStartLeftRef.current - delta;
    }
  };

  const endDrag = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    if (scrollRef.current) {
      // Re-enable smooth snap
      scrollRef.current.style.scrollSnapType = 'x mandatory';
      scrollRef.current.style.scrollBehavior = 'smooth';
    }
    // Reset hasDraggedRef after small delay so onClickCapture can intercept
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    // If the user was dragging the slider, prevent opening details/playing
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (!items.length) return null;

  return (
    <section className="relative w-full py-3 space-y-3 select-none group/carousel">
      {/* Header with Title & Carousel Arrows */}
      <div className="flex items-end justify-between px-4 md:px-8">
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs text-purple-200/60 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Carousel Arrow Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              canScrollLeft
                ? 'bg-[#181126] hover:bg-purple-900/60 text-purple-200 hover:text-white border-purple-800/40 hover:border-purple-500/50 shadow-md active:scale-95'
                : 'bg-[#100A1A]/40 text-purple-400/20 border-purple-900/20 cursor-not-allowed opacity-40'
            }`}
            aria-label={`Scroll ${title} carousel left`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              canScrollRight
                ? 'bg-[#181126] hover:bg-purple-900/60 text-purple-200 hover:text-white border-purple-800/40 hover:border-purple-500/50 shadow-md active:scale-95'
                : 'bg-[#100A1A]/40 text-purple-400/20 border-purple-900/20 cursor-not-allowed opacity-40'
            }`}
            aria-label={`Scroll ${title} carousel right`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Relative wrapper for slider & subtle edge masks */}
      <div className="relative w-full">
        {/* Left Fade Gradient Mask when scrolled */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-[#08060D] via-[#08060D]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Fade Gradient Mask when more items to the right */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-[#08060D] via-[#08060D]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Horizontal Scroll Track */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onClickCapture={handleClickCapture}
          className="flex items-start gap-3.5 md:gap-5 overflow-x-auto no-scrollbar smooth-slider scroll-smooth px-4 md:px-8 py-3.5 cursor-grab active:cursor-grabbing will-change-scroll"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '1rem',
          }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              data-carousel-card="true"
              className={`shrink-0 snap-start gpu-layer transition-transform duration-300 ${
                showRankingNumbers
                  ? 'w-44 sm:w-48 md:w-52'
                  : 'w-36 sm:w-40 md:w-44 lg:w-48'
              }`}
            >
              <MediaCard
                item={item}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleWatchlist={onToggleWatchlist}
                isInWatchlist={isInWatchlist(item.id)}
                rankingNumber={showRankingNumbers ? index + 1 : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
