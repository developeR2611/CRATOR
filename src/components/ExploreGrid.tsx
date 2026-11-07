import React, { useState, useMemo } from 'react';
import { ChevronDown, Dices } from 'lucide-react';
import { MediaItem } from '../types';
import { 
  GENRES_LIST, 
  LANGUAGES_LIST, 
  YEARS_LIST, 
  PLATFORMS_LIST 
} from '../data/mockData';
import { MediaCard } from './MediaCard';

interface ExploreGridProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist?: (item: MediaItem) => void;
  isInWatchlist?: (id: string) => boolean;
  initialType?: 'all' | 'movie' | 'series' | 'anime';
}

export const ExploreGrid: React.FC<ExploreGridProps> = ({
  mediaCatalog,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  isInWatchlist,
  initialType = 'all',
}) => {
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series'>(
    initialType === 'anime' ? 'series' : (initialType as any)
  );
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedRating, setSelectedRating] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'newest'>('popularity');

  // Filter & sort logic
  const filteredItems = useMemo(() => {
    return mediaCatalog.filter((item) => {
      // Type
      if (selectedType !== 'all') {
        if (selectedType === 'movie' && item.type !== 'movie') return false;
        if (selectedType === 'series' && item.type !== 'series' && item.type !== 'anime') return false;
      }
      // Genre
      if (selectedGenre !== 'All' && !item.genres.includes(selectedGenre)) {
        return false;
      }
      // Year
      if (selectedYear !== 'All') {
        if (selectedYear === '2026' && item.releaseYear !== 2026) return false;
        if (selectedYear === '2025' && item.releaseYear !== 2025) return false;
        if (selectedYear === '2024' && item.releaseYear !== 2024) return false;
        if (selectedYear === 'Classics' && item.releaseYear >= 2020) return false;
      }
      // Rating
      if (selectedRating !== 'All') {
        const minRating = parseFloat(selectedRating);
        if (item.rating < minRating) return false;
      }
      // Language
      if (selectedLanguage !== 'All' && item.language !== selectedLanguage) {
        return false;
      }
      // Platform / Service
      if (selectedPlatform !== 'All' && item.platform !== selectedPlatform) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'popularity') {
        return (a.topTenRank || 99) - (b.topTenRank || 99);
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'newest') {
        return b.releaseYear - a.releaseYear;
      }
      return 0;
    });
  }, [mediaCatalog, selectedType, selectedGenre, selectedYear, selectedRating, selectedLanguage, selectedPlatform, sortBy]);

  // "Pick one for me" random title selector
  const handlePickRandom = () => {
    if (!filteredItems.length) return;
    const randomIndex = Math.floor(Math.random() * filteredItems.length);
    const chosen = filteredItems[randomIndex];
    onOpenDetails(chosen);
  };

  return (
    <section className="discover w-full px-[4.5vw] py-8 text-left">
      {/* 7Movies Toolbar & Filters */}
      <div className="dz-head">
        <div className="dz-filters" role="toolbar" aria-label="Filters">
          {/* Segmented Type Pill */}
          <span className="dz-type" role="group" aria-label="Movies or TV shows">
            <button 
              type="button" 
              aria-pressed={selectedType === 'all'}
              onClick={() => setSelectedType('all')}
            >
              All
            </button>
            <button 
              type="button" 
              aria-pressed={selectedType === 'movie'}
              onClick={() => setSelectedType('movie')}
            >
              Movies
            </button>
            <button 
              type="button" 
              aria-pressed={selectedType === 'series'}
              onClick={() => setSelectedType('series')}
            >
              TV shows
            </button>
          </span>

          {/* Genre Filter */}
          <div className="relative inline-block">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="dz-filter appearance-none pr-8 cursor-pointer bg-transparent"
              aria-label="Genre"
            >
              <option value="All" className="bg-[#111215] text-white">Genre: Any</option>
              {GENRES_LIST.filter(g => g !== 'All Genres').map(g => (
                <option key={g} value={g} className="bg-[#111215] text-white">{g}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Year Filter */}
          <div className="relative inline-block">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="dz-filter appearance-none pr-8 cursor-pointer bg-transparent"
              aria-label="Year"
            >
              <option value="All" className="bg-[#111215] text-white">Year: Any</option>
              <option value="2026" className="bg-[#111215] text-white">2026</option>
              <option value="2025" className="bg-[#111215] text-white">2025</option>
              <option value="2024" className="bg-[#111215] text-white">2024</option>
              <option value="Classics" className="bg-[#111215] text-white">Classics</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Rating Filter */}
          <div className="relative inline-block">
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="dz-filter appearance-none pr-8 cursor-pointer bg-transparent"
              aria-label="Rating"
            >
              <option value="All" className="bg-[#111215] text-white">Rating: Any</option>
              <option value="8.5" className="bg-[#111215] text-white">★ 8.5+ Top Rated</option>
              <option value="8.0" className="bg-[#111215] text-white">★ 8.0+ High</option>
              <option value="7.0" className="bg-[#111215] text-white">★ 7.0+ Popular</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Language Filter */}
          <div className="relative inline-block">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="dz-filter appearance-none pr-8 cursor-pointer bg-transparent"
              aria-label="Language"
            >
              <option value="All" className="bg-[#111215] text-white">Language: Any</option>
              {LANGUAGES_LIST.filter(l => l !== 'All Languages').map(l => (
                <option key={l} value={l} className="bg-[#111215] text-white">{l}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Service / Platform Filter */}
          <div className="relative inline-block">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="dz-filter appearance-none pr-8 cursor-pointer bg-transparent"
              aria-label="Service"
            >
              <option value="All" className="bg-[#111215] text-white">Service: Any</option>
              {PLATFORMS_LIST.map(p => (
                <option key={p.name} value={p.name} className="bg-[#111215] text-white">{p.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Sort By Filter (Far Right) */}
          <span className="dz-sort ml-auto">
            <div className="relative inline-block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="dz-filter appearance-none pr-8 cursor-pointer bg-transparent"
                aria-label="Sort by"
              >
                <option value="popularity" className="bg-[#111215] text-white">Sort: Most popular</option>
                <option value="rating" className="bg-[#111215] text-white">Sort: Highest rated</option>
                <option value="newest" className="bg-[#111215] text-white">Sort: Release date</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          </span>
        </div>

        {/* 7Movies Secondary Meta Bar */}
        <div className="dz-bar flex items-center justify-between border-t border-white/10 pt-4 mt-5 text-xs text-[#77737a] font-mono uppercase tracking-wider">
          <span className="dz-count text-[#beb9bc]">
            {filteredItems.length} titles available
          </span>

          <span className="dz-bar-actions">
            <button 
              type="button" 
              onClick={handlePickRandom}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Pick one for me</span>
            </button>
          </span>
        </div>
      </div>

      {/* 7Movies Results Grid */}
      <div className="dz-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5 mt-6">
        {filteredItems.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onPlay={onPlay}
            onOpenDetails={onOpenDetails}
            onToggleWatchlist={onToggleWatchlist}
            isInWatchlist={isInWatchlist ? isInWatchlist(item.id) : false}
          />
        ))}
      </div>
    </section>
  );
};
