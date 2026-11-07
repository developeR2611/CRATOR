import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface MediaCarouselProps {
  title: string;
  eyebrow?: string;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist?: (item: MediaItem) => void;
  isInWatchlist?: (id: string) => boolean;
  showRankingNumbers?: boolean;
  isWide?: boolean;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  eyebrow,
  items,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  showRankingNumbers = false,
  isWide = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update scroll bounds for arrow button visibility
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

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollAmount = isWide ? 480 : 360;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!items.length) return null;

  return (
    <section className={`rail ${showRankingNumbers ? 'top10-rail' : ''}`}>
      {/* 7Movies Rail Heading */}
      <div className="rail-heading">
        <div>
          {eyebrow && (
            <p className="eyebrow">
              {eyebrow}
            </p>
          )}
          <h2>
            {title}
          </h2>
        </div>
      </div>

      {/* Rail Row Wrap with Floating Directional Arrows */}
      <div className="rail-row-wrap">
        <button
          type="button"
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className="rail-arrow rail-arrow-left"
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div ref={scrollRef} className="card-row">
          {items.map((item, index) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              onToggleWatchlist={onToggleWatchlist}
              isInWatchlist={isInWatchlist ? isInWatchlist(item.id) : false}
              rankingNumber={showRankingNumbers ? index + 1 : undefined}
              isWide={isWide}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className="rail-arrow rail-arrow-right"
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
