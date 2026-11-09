import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Plus, 
  Check, 
  Share2, 
  Download, 
  ExternalLink, 
  ChevronDown, 
  Loader2 
} from 'lucide-react';
import { MediaItem, Episode, Season } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { 
  getTmdbDetail, 
  getTmdbSeasonEpisodes, 
  getTmdbRecommendations, 
  getTmdbLogo,
  getSynchronousKnownLogo 
} from '../services/tmdb';

interface DetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (item: MediaItem, episode?: Episode) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  isInWatchlist: (id: string) => boolean;
  relatedItems: MediaItem[];
  onSelectRelated: (item: MediaItem) => void;
  onShowToast: (message: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  item,
  onClose,
  onPlay,
  onToggleWatchlist,
  isInWatchlist,
  relatedItems,
  onSelectRelated,
  onShowToast,
}) => {
  const initialResolvedLogo = item ? (item.logoUrl || getSynchronousKnownLogo(item)) : undefined;
  const initialActiveItem = item ? (initialResolvedLogo && !item.logoUrl ? { ...item, logoUrl: initialResolvedLogo } : item) : null;
  const [activeItem, setActiveItem] = useState<MediaItem | null>(initialActiveItem);
  const [seasons, setSeasons] = useState<Season[]>(item?.seasons || []);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(false);
  const [tmdbRecommendations, setTmdbRecommendations] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!item) {
      setActiveItem(null);
      return;
    }
    const resolvedLogo = item.logoUrl || getSynchronousKnownLogo(item);
    setActiveItem(resolvedLogo && !item.logoUrl ? { ...item, logoUrl: resolvedLogo } : item);
    setTmdbRecommendations([]);

    if (item.seasons && item.seasons.length > 0) {
      setSeasons(item.seasons);
      setSelectedSeasonNumber(item.seasons[0].seasonNumber);
    } else {
      setSeasons([]);
    }

    let isCancelled = false;

    async function loadExtraDetails() {
      if (!item) return;

      const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';
      const mediaType = isTv ? 'tv' : 'movie';
      const lookupId = item.tmdbId || item.id;

      // 1. Fetch live TMDB details (which also includes images with logos)
      getTmdbDetail(mediaType, lookupId).then((detailed) => {
        if (!isCancelled && detailed) {
          setActiveItem((prev) => prev ? { 
            ...prev, 
            ...detailed, 
            logoUrl: detailed.logoUrl || prev.logoUrl || resolvedLogo 
          } : detailed);
        }
      }).catch(() => {});

      // 2. Fetch live official graphic title logo if not yet provided
      if (!item.logoUrl && !resolvedLogo) {
        getTmdbLogo(mediaType, lookupId).then((logoUrl) => {
          if (!isCancelled && logoUrl) {
            setActiveItem((prev) => prev ? { ...prev, logoUrl } : null);
          }
        }).catch(() => {});
      }

      // 3. Fetch live TMDB recommendations
      getTmdbRecommendations(mediaType, lookupId).then((recs) => {
        if (!isCancelled && recs.length > 0) {
          setTmdbRecommendations(recs);
        }
      }).catch(() => {});

      // 4. Fetch TV season episodes
      if (isTv) {
        setIsLoadingSeasons(true);
        getTmdbSeasonEpisodes(item.id, selectedSeasonNumber).then((episodes) => {
          if (!isCancelled && episodes.length > 0) {
            setSeasons((prevSeasons) => {
              if (prevSeasons.length > 0) {
                return prevSeasons.map((s) => s.seasonNumber === selectedSeasonNumber ? { ...s, episodes } : s);
              }
              const totalSeas = item.totalSeasons || 1;
              const newSeasons: Season[] = [];
              for (let i = 1; i <= Math.max(totalSeas, 1); i++) {
                newSeasons.push({
                  seasonNumber: i,
                  title: `Season ${i}`,
                  episodeCount: i === selectedSeasonNumber ? episodes.length : 10,
                  episodes: i === selectedSeasonNumber ? episodes : [],
                });
              }
              return newSeasons;
            });
          }
        }).catch(() => {}).finally(() => {
          if (!isCancelled) setIsLoadingSeasons(false);
        });
      }
    }

    loadExtraDetails();

    return () => {
      isCancelled = true;
    };
  }, [item?.id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activeItem) return null;

  const inWatchlist = isInWatchlist(activeItem.id);
  const selectedSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      onShowToast('Link copied to clipboard');
    }
  };

  const handleDownload = () => {
    onShowToast(`Downloading stream cache for "${activeItem.title}"`);
  };

  const handleSeasonChange = (newSeasonNumber: number) => {
    setSelectedSeasonNumber(newSeasonNumber);
    const seasonObj = seasons.find((s) => s.seasonNumber === newSeasonNumber);
    if (!seasonObj || seasonObj.episodes.length === 0) {
      setIsLoadingSeasons(true);
      getTmdbSeasonEpisodes(activeItem.id, newSeasonNumber).then((episodes) => {
        if (episodes.length > 0) {
          setSeasons((prev) => prev.map((s) => s.seasonNumber === newSeasonNumber ? { ...s, episodes, episodeCount: episodes.length } : s));
        }
      }).catch(() => {}).finally(() => setIsLoadingSeasons(false));
    }
  };

  const isTv = activeItem.type === 'series' || activeItem.type === 'anime' || (activeItem.type as any) === 'tv';

  const handlePlayCurrent = (ep?: Episode) => {
    if (ep) {
      onPlay(activeItem, ep);
      return;
    }
    if (isTv) {
      const currentSeasonObj = seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];
      const firstEp = currentSeasonObj?.episodes?.[0] || {
        id: `${activeItem.id}-s${selectedSeasonNumber}e1`,
        episodeNumber: 1,
        seasonNumber: selectedSeasonNumber,
        title: `Episode 1`,
        runtime: '45m',
        synopsis: activeItem.synopsis,
        thumbnail: activeItem.backdropUrl || activeItem.posterUrl,
      };
      onPlay(activeItem, firstEp);
    } else {
      onPlay(activeItem);
    }
  };

  const mediaTypeLabel = isTv ? 'SERIES' : 'FILM';
  const ageRatingLabel = activeItem.ageRating || 'PG-13';
  const runtimeLabel = activeItem.runtime 
    ? activeItem.runtime.toUpperCase() 
    : (activeItem.totalSeasons ? `${activeItem.totalSeasons} ${activeItem.totalSeasons === 1 ? 'SEASON' : 'SEASONS'}` : '2H 15M');

  // Format title into stacked uppercase lines if multi-word as fallback
  const renderStackedTitle = () => {
    const titleWords = (activeItem.title || '').trim().split(' ');
    if (titleWords.length > 1 && titleWords.length <= 4) {
      const mid = Math.ceil(titleWords.length / 2);
      const line1 = titleWords.slice(0, mid).join(' ');
      const line2 = titleWords.slice(mid).join(' ');
      return (
        <h1 className="font-display font-black text-5xl sm:text-7xl md:text-8xl tracking-tight text-[#9fb8cf] uppercase leading-[0.92] drop-shadow-2xl">
          <span className="block">{line1}</span>
          <span className="block">{line2}</span>
        </h1>
      );
    }
    return (
      <h1 className="font-display font-black text-5xl sm:text-7xl md:text-8xl tracking-tight text-[#9fb8cf] uppercase leading-[0.92] drop-shadow-2xl">
        {activeItem.title}
      </h1>
    );
  };

  // Genre display separated with slashes
  const genresRow = activeItem.genres && activeItem.genres.length > 0
    ? activeItem.genres.slice(0, 3).map((g) => g.toUpperCase()).join('   /   ')
    : 'ACTION   /   ADVENTURE   /   SCI-FI';

  const castMembers = activeItem.cast || [
    { name: 'Robert Downey Jr.', character: 'Tony Stark', avatar: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3ag0.jpg' },
    { name: 'Gwyneth Paltrow', character: 'Pepper Potts', avatar: 'https://image.tmdb.org/t/p/w185/v3f8J7.jpg' },
    { name: 'Terrence Howard', character: 'James Rhodes', avatar: 'https://image.tmdb.org/t/p/w185/57M77i.jpg' },
    { name: 'Jeff Bridges', character: 'Obadiah Stane', avatar: 'https://image.tmdb.org/t/p/w185/x7Xb7c.jpg' }
  ];

  const directorName = activeItem.director || 'Christopher Nolan';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black text-[#f3f0ea] select-none animate-fadeIn">
      {/* 1. Top-Left Circular Glass Back Button (exact match to screenshots) */}
      <button
        onClick={onClose}
        className="fixed top-6 left-6 z-50 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xl"
        aria-label="Back"
        title="Back (Esc)"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* 2. Hero Section with Full-Bleed Cinematic Backdrop */}
      <div className="relative w-full min-h-[84vh] md:min-h-[88vh] flex flex-col justify-end overflow-hidden">
        {/* Full-Bleed Backdrop Image */}
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src={activeItem.backdropUrl || activeItem.posterUrl}
            fallbackSrc={activeItem.fallbackBackdropUrl || activeItem.fallbackPosterUrl}
            alt={activeItem.title}
            fallbackTitle={activeItem.title}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover object-center filter brightness-[0.85]"
          />

          {/* Gradients matching screenshots: deep left vignette and smooth bottom fade to pure black */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent w-full md:w-3/4" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-transparent h-full" />
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
        </div>

        {/* Hero Content Block (Left-Aligned, exactly matching screenshots) */}
        <div className="relative z-10 w-full max-w-5xl px-6 sm:px-12 md:px-16 pt-32 pb-10 space-y-4">
          {/* Kicker Row: — FILM · 2026 · [ R ] · 2H 53M or — SERIES · 2026 · TV-14 · 1 SEASON */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wider text-white/90">
            <span className="text-white/50 text-base leading-none select-none">—</span>
            <span className="uppercase">{mediaTypeLabel}</span>
            <span className="text-white/40">·</span>
            <span>{activeItem.releaseYear || 2026}</span>
            <span className="text-white/40">·</span>
            <span className="px-1.5 py-0.5 rounded border border-white/30 text-[10px] font-mono font-bold uppercase tracking-widest bg-black/30">
              {ageRatingLabel}
            </span>
            <span className="text-white/40">·</span>
            <span className="uppercase">{runtimeLabel}</span>
          </div>

          {/* OFFICIAL GRAPHIC TITLE LOGO (FROM TMDB) OR STYLED TITLE */}
          <div className="py-1">
            {activeItem.logoUrl ? (
              <div className="py-2 max-w-sm sm:max-w-md md:max-w-xl">
                <img
                  src={activeItem.logoUrl}
                  alt={activeItem.title}
                  className="max-h-24 sm:max-h-32 md:max-h-36 w-auto max-w-full object-contain object-left drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] select-none"
                  onError={() => {
                    // Graceful fallback to text if logo image is unavailable
                    setActiveItem((prev) => prev ? { ...prev, logoUrl: undefined } : null);
                  }}
                />
              </div>
            ) : (
              renderStackedTitle()
            )}
          </div>

          {/* Genres row: ADVENTURE / ACTION / FANTASY */}
          <div className="text-xs sm:text-sm font-bold tracking-[0.25em] text-[#beb9bc] uppercase py-0.5">
            {genresRow}
          </div>

          {/* Synopsis paragraph */}
          <p className="text-sm sm:text-base text-[#d1ced2] leading-relaxed max-w-2xl line-clamp-3">
            {activeItem.synopsis}
          </p>

          {/* Directed by / Created by line */}
          <div className="flex items-center gap-2 pt-1 text-xs sm:text-sm">
            <span className="font-mono text-[11px] tracking-widest uppercase text-white/50">
              {isTv ? 'CREATED BY' : 'DIRECTED BY'}
            </span>
            <span className="font-semibold text-white ml-1">
              {directorName}
            </span>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 pt-3 flex-wrap">
            {/* White Primary Play / Resume Button */}
            <button
              onClick={() => handlePlayCurrent()}
              className="bg-white text-black hover:bg-neutral-100 font-bold px-7 py-3 rounded-xl flex items-center gap-2.5 text-sm transition-all shadow-xl active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>{isTv ? `Resume S${selectedSeasonNumber} E1` : 'Play'}</span>
            </button>

            {/* Plus / Watchlist Button */}
            <button
              onClick={() => onToggleWatchlist(activeItem)}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
              title={inWatchlist ? 'In Watchlist' : 'Add to List'}
            >
              {inWatchlist ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
              title="Download offline stream"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Promo Banner Card: Always find 7Movies / 7domains.fans */}
          <div className="pt-2">
            <div 
              onClick={handleShare}
              className="relative rounded-2xl bg-[#141418]/85 hover:bg-[#1a1a20] border border-white/15 hover:border-white/30 p-3.5 max-w-md flex items-center justify-between backdrop-blur-md transition-all cursor-pointer shadow-xl group overflow-hidden"
            >
              {/* Subtle background thumbnail snippet */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none overflow-hidden">
                <ImageWithFallback
                  src={activeItem.backdropUrl || activeItem.posterUrl}
                  alt="promo"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="relative z-10 text-left">
                <h4 className="text-sm font-bold text-white leading-tight">
                  Always find 7Movies
                </h4>
                <p className="text-xs text-[#8e8a91] font-mono mt-0.5">
                  7domains.fans
                </p>
              </div>

              <div className="relative z-10 text-white/70 group-hover:text-white transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT SECTIONS */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 md:px-16 pt-8 pb-16 space-y-12">
        {/* ================================================================= */}
        {/* FOR TV SERIES: CONTINUE THE STORY / Episodes (exact match to VisionQuest Screenshot 1) */}
        {/* ================================================================= */}
        {isTv && (
          <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-white/10 pb-4 flex-wrap gap-4">
              <div>
                <span className="text-xs font-mono tracking-widest text-[#8e8a91] uppercase block mb-1">
                  CONTINUE THE STORY
                </span>
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight flex items-center gap-2.5">
                  <span>Episodes</span>
                  {isLoadingSeasons && (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </h2>
              </div>

              {/* Season Dropdown Selector on Right (exact match to VisionQuest screenshot) */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono tracking-widest text-[#8e8a91] uppercase mb-1">
                  SEASON
                </span>
                <div className="relative">
                  <select
                    value={selectedSeasonNumber}
                    onChange={(e) => handleSeasonChange(Number(e.target.value))}
                    className="appearance-none bg-[#141316] border border-white/20 hover:border-white/40 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer transition-all shadow-lg"
                  >
                    {seasons.map((s) => (
                      <option key={s.seasonNumber} value={s.seasonNumber} className="bg-[#141316] text-white">
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#beb9bc] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Episodes List / Grid */}
            {selectedSeason && selectedSeason.episodes.length > 0 ? (
              <div className="space-y-3">
                {selectedSeason.episodes.map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => onPlay(activeItem, ep)}
                    className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl bg-[#121114] hover:bg-[#1a191e] border border-white/10 hover:border-white/25 transition-all cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full sm:w-44 rounded-xl overflow-hidden shrink-0 bg-[#0a0a0c]">
                      <ImageWithFallback
                        src={ep.thumbnail || activeItem.backdropUrl || activeItem.posterUrl}
                        alt={ep.title}
                        fallbackTitle={ep.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                        <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {ep.runtime}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#beb9bc]">
                          Episode {ep.episodeNumber}
                        </span>
                        <span className="text-white/30">·</span>
                        <h4 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors">
                          {ep.title}
                        </h4>
                      </div>
                      <p className="text-xs text-[#8e8a91] line-clamp-2">
                        {ep.synopsis || 'Full episode stream ready via VidRift player.'}
                      </p>
                    </div>

                    <div className="hidden sm:block shrink-0">
                      <button className="px-3.5 py-2 rounded-xl bg-white/10 group-hover:bg-white group-hover:text-black text-white text-xs font-bold transition-all">
                        Stream
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Quick Episode Grid */
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((epNum) => (
                  <button
                    key={`quick-ep-${epNum}`}
                    onClick={() =>
                      onPlay(activeItem, {
                        id: `${activeItem.id}-s${selectedSeasonNumber}e${epNum}`,
                        episodeNumber: epNum,
                        seasonNumber: selectedSeasonNumber,
                        title: `Episode ${epNum}`,
                        runtime: '48m',
                        synopsis: activeItem.synopsis,
                        thumbnail: activeItem.backdropUrl || activeItem.posterUrl,
                      })
                    }
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121114] hover:bg-white hover:text-black border border-white/10 transition-all text-left group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-black block">
                        Episode {epNum}
                      </span>
                      <span className="text-[10px] font-mono text-[#8e8a91] group-hover:text-neutral-700">
                        Season {selectedSeasonNumber}
                      </span>
                    </div>
                    <Play className="w-3.5 h-3.5 text-white/70 group-hover:text-black fill-current" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* FEATURING & Cast Section (exact match to screenshots 1, 2, and 3) */}
        {/* ================================================================= */}
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono tracking-widest text-[#8e8a91] uppercase flex items-center gap-2">
              <span className="text-white/50">—</span>
              <span>FEATURING</span>
            </span>
            <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Cast
              </h2>
              <span className="text-xs font-mono tracking-widest text-[#8e8a91] uppercase">
                {castMembers.length} CREDITED
              </span>
            </div>
          </div>

          {/* Cast Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {castMembers.map((member) => (
              <div 
                key={member.name}
                className="flex flex-col items-start gap-2.5 p-3 rounded-2xl bg-[#121114] border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/15 shadow-md">
                  <ImageWithFallback
                    src={member.avatar}
                    alt={member.name}
                    fallbackTitle={member.name}
                    containerClassName="w-full h-full rounded-full"
                    isAvatar={true}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="w-full text-left">
                  <h4 className="font-semibold text-xs text-white truncate">{member.name}</h4>
                  <p className="text-[11px] text-[#8e8a91] truncate font-mono">{member.character}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* Recommendations ("More Like This") */}
        {/* ================================================================= */}
        {(tmdbRecommendations.length > 0 || relatedItems.length > 0) && (
          <div className="space-y-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono tracking-widest text-[#8e8a91] uppercase block mb-1">
                  RECOMMENDATIONS
                </span>
                <h3 className="font-display font-bold text-2xl text-white">
                  More Like This
                </h3>
              </div>
              <span className="text-xs font-mono text-[#8e8a91]">
                Powered by TMDB
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {(tmdbRecommendations.length > 0 ? tmdbRecommendations : relatedItems).slice(0, 6).map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectRelated(rel)}
                  className="group relative flex flex-col cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#141316] border border-white/10 group-hover:border-white/30 transition-all">
                    <ImageWithFallback
                      src={rel.posterUrl}
                      fallbackSrc={rel.fallbackPosterUrl}
                      alt={rel.title}
                      fallbackTitle={rel.title}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h4 className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors truncate mt-2 text-left">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] text-[#8e8a91] text-left">
                    {rel.releaseYear} · {rel.type === 'movie' ? 'Film' : 'TV'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
