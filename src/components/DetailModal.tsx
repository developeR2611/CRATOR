import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Bookmark, 
  Heart, 
  Star, 
  Clock, 
  Share2, 
  Check, 
  Tv, 
  ChevronDown,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { MediaItem, Episode, Season } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { getMovieBoxSubjectDetail, getMovieBoxSeasons } from '../services/moviebox';
import { getTmdbDetail, getTmdbSeasonEpisodes, getTmdbRecommendations } from '../services/tmdb';

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
  const [activeItem, setActiveItem] = useState<MediaItem | null>(item);
  const [seasons, setSeasons] = useState<Season[]>(item?.seasons || []);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [tmdbRecommendations, setTmdbRecommendations] = useState<MediaItem[]>([]);

  useEffect(() => {
    setActiveItem(item);
    setTmdbRecommendations([]);
    if (!item) return;

    if (item.seasons && item.seasons.length > 0) {
      setSeasons(item.seasons);
      setSelectedSeasonNumber(item.seasons[0].seasonNumber);
    } else {
      setSeasons([]);
    }

    // Attempt to enrich with live API data (TMDB or MovieBox)
    let isCancelled = false;

    async function loadExtraDetails() {
      if (!item) return;

      if (item.id.startsWith('tmdb-') || item.tmdbId) {
        const isTv = item.type === 'series' || item.type === 'anime';
        const mediaType = isTv ? 'tv' : 'movie';
        const lookupId = item.tmdbId || item.id;

        getTmdbDetail(mediaType, lookupId).then((detailed) => {
          if (!isCancelled && detailed) {
            setActiveItem((prev) => prev ? { ...prev, ...detailed } : detailed);
          }
        }).catch(() => {});

        // Fetch live recommendations from TMDB
        getTmdbRecommendations(mediaType, lookupId).then((recs) => {
          if (!isCancelled && recs.length > 0) {
            setTmdbRecommendations(recs);
          }
        }).catch(() => {});

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
      } else {
        // Only fetch MovieBox extra info/seasons if the item is a native MovieBox item (not a local mock catalog item)
        const isMovieBoxId = item.id.startsWith('mb-') || /^\d+$/.test(item.id);
        if (isMovieBoxId) {
          // 1. Fetch MovieBox info if not complete
          getMovieBoxSubjectDetail(item.id).then((detailed) => {
            if (!isCancelled && detailed) {
              setActiveItem((prev) => prev ? { ...prev, ...detailed } : detailed);
            }
          }).catch(() => {});

          // 2. Fetch MovieBox seasons if it's a series or anime
          if (item.type === 'series' || item.type === 'anime') {
            setIsLoadingSeasons(true);
            getMovieBoxSeasons(item.id).then((fetchedSeasons) => {
              if (!isCancelled && fetchedSeasons.length > 0) {
                setSeasons(fetchedSeasons);
                setSelectedSeasonNumber(fetchedSeasons[0].seasonNumber);
              }
            }).catch(() => {}).finally(() => {
              if (!isCancelled) setIsLoadingSeasons(false);
            });
          }
        }
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

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    onShowToast(!isFavorite ? `Added "${activeItem.title}" to Favorites` : `Removed from Favorites`);
  };

  const handleSeasonChange = (newSeasonNumber: number) => {
    setSelectedSeasonNumber(newSeasonNumber);
    if (activeItem?.id.startsWith('tmdb-')) {
      const seasonObj = seasons.find((s) => s.seasonNumber === newSeasonNumber);
      if (!seasonObj || seasonObj.episodes.length === 0) {
        setIsLoadingSeasons(true);
        getTmdbSeasonEpisodes(activeItem.id, newSeasonNumber).then((episodes) => {
          if (episodes.length > 0) {
            setSeasons((prev) => prev.map((s) => s.seasonNumber === newSeasonNumber ? { ...s, episodes, episodeCount: episodes.length } : s));
          }
        }).catch(() => {}).finally(() => setIsLoadingSeasons(false));
      }
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

  const hasStreamMatch = Boolean(
    activeItem.movieBoxSubjectId ||
    activeItem.hasMovieBoxMatch ||
    activeItem.videoUrl ||
    (activeItem.id.startsWith('mb-') && !activeItem.id.includes('unknown'))
  );

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 lg:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-5xl bg-[#0E0A1A] rounded-none sm:rounded-2xl overflow-hidden border border-purple-900/40 shadow-2xl shadow-purple-950/80 my-0 sm:my-8 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/70 hover:bg-purple-900/80 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          aria-label="Close dialog"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cinematic Backdrop Area */}
        <div className="relative w-full h-[240px] sm:h-[320px] md:h-[400px] overflow-hidden bg-[#0A0714] select-none">
          <ImageWithFallback
            src={activeItem.backdropUrl || activeItem.posterUrl}
            fallbackSrc={activeItem.fallbackBackdropUrl || activeItem.fallbackPosterUrl}
            alt={activeItem.title}
            fallbackTitle={activeItem.title}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover filter brightness-[0.70]"
          />

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0A1A] via-[#0E0A1A]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E0A1A]/80 via-transparent to-transparent w-full sm:w-2/3" />
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Floating Top Badges */}
          <div className="absolute top-4 left-4 sm:left-6 z-30 flex items-center gap-2 flex-wrap pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CineSRC 4K</span>
            </span>

            {activeItem.platform && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-purple-200 text-[11px] font-medium backdrop-blur-md">
                {activeItem.platform}
              </span>
            )}

            {hasStreamMatch && (
              <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono text-[10px] hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>MovieBox Alt</span>
              </span>
            )}
          </div>

          {/* Center Cinematic Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={() => handlePlayCurrent()}
              className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-purple-600/80 hover:bg-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-600/60 backdrop-blur-sm border border-purple-400/40 transform hover:scale-110 active:scale-95 transition-all cursor-pointer group"
              title="Click to Play"
              aria-label="Play video"
            >
              <Play className="w-6 h-6 fill-white ml-1 group-hover:scale-105 transition-transform" />
            </button>
          </div>
        </div>

        {/* Details Content Section */}
        <div className="px-5 sm:px-8 md:px-10 pb-8 sm:pb-10 space-y-8">
          {/* Header & Meta Row */}
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-7 md:gap-8 items-start -mt-16 sm:-mt-24 md:-mt-32 relative z-20">
            {/* Vertical Poster Thumbnail (Visible on ALL devices) */}
            <div className="w-28 sm:w-36 md:w-48 shrink-0 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/90 border-2 border-purple-500/40 ring-1 ring-purple-400/20 bg-[#140F22] relative mx-auto sm:mx-0 group">
              <ImageWithFallback
                src={activeItem.posterUrl || activeItem.backdropUrl}
                fallbackSrc={activeItem.fallbackPosterUrl || activeItem.fallbackBackdropUrl}
                alt={activeItem.title}
                fallbackTitle={activeItem.title}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                <span className="text-[9px] font-mono font-bold text-purple-200/90 uppercase px-1 rounded bg-black/60">
                  {activeItem.type}
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-300 px-1 rounded bg-black/60">
                  ★ {activeItem.rating.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Info & Action Column */}
            <div className="flex-1 space-y-4 pt-1 sm:pt-6 md:pt-10 text-left w-full">
              {/* Metadata Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-purple-200/70 font-medium">
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm">{activeItem.rating.toFixed(1)}</span>
                  {activeItem.voteCount && (
                    <span className="text-purple-400/50 font-normal">({activeItem.voteCount})</span>
                  )}
                </span>

                <span className="text-purple-400/40" aria-hidden="true">·</span>
                <span>{activeItem.releaseYear}</span>

                <span className="text-purple-400/40" aria-hidden="true">·</span>
                <span>{activeItem.runtime || (activeItem.totalSeasons ? `${activeItem.totalSeasons} Seasons` : 'Series')}</span>

                <span className="text-purple-400/40" aria-hidden="true">·</span>
                <span className="px-1.5 py-0.5 rounded border border-purple-400/30 font-mono text-[10px] text-purple-300">
                  {activeItem.ageRating}
                </span>

                <span className="text-purple-400/40" aria-hidden="true">·</span>
                <span className="font-mono text-purple-300">{activeItem.quality}</span>

                <span className="text-purple-400/40" aria-hidden="true">·</span>
                <span className="text-purple-300">{activeItem.audio}</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight">
                  {activeItem.title}
                </h2>
                {activeItem.tagline && (
                  <p className="text-sm italic text-purple-300/80 font-serif mt-1">
                    "{activeItem.tagline}"
                  </p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {/* Watch Now (CineSRC 4K) Button */}
                <button
                  onClick={() => handlePlayCurrent()}
                  className="group flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 hover:shadow-purple-500/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  title="Stream in CineSRC 4K Player"
                >
                  <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                  <span>
                    {isTv 
                      ? `Watch S${selectedSeasonNumber}:E1 (CineSRC 4K)`
                      : 'Watch Now (CineSRC 4K)'}
                  </span>
                </button>

                {/* Watchlist Button */}
                <button
                  onClick={() => onToggleWatchlist(activeItem)}
                  className={`flex items-center gap-2 px-4 py-3.5 rounded-xl border backdrop-blur-md transition-all text-xs font-semibold cursor-pointer ${
                    inWatchlist
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                      : 'bg-[#181126] text-purple-200 border-purple-900/60 hover:bg-purple-900/40 hover:text-white'
                  }`}
                  title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                >
                  {inWatchlist ? <Check className="w-4 h-4 text-white" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                {/* Favorite Button */}
                <button
                  onClick={handleFavorite}
                  className={`flex items-center gap-2 px-4 py-3.5 rounded-xl border backdrop-blur-md transition-all text-xs font-semibold cursor-pointer ${
                    isFavorite
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30'
                      : 'bg-[#181126] text-purple-200 border-purple-900/60 hover:bg-purple-900/40 hover:text-white'
                  }`}
                  title={isFavorite ? 'Favorited' : 'Add to Favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white text-white' : ''}`} />
                  <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-[#181126] text-purple-200 border border-purple-900/60 hover:bg-purple-900/40 hover:text-white backdrop-blur-md transition-all text-xs font-semibold cursor-pointer"
                  title="Share Title"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {/* Synopsis */}
              <p className="text-sm text-purple-100/80 leading-relaxed pt-1">
                {activeItem.synopsis}
              </p>

              {/* Badges / Genres */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-purple-300/60 font-semibold mr-1">Genres:</span>
                {activeItem.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-200 text-xs font-medium border border-purple-800/40"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Director & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-purple-200/70 border-t border-purple-950/40">
                {activeItem.director && (
                  <div>
                    <span className="text-purple-400/60 font-semibold block mb-0.5">Director</span>
                    <span className="text-white font-medium">{activeItem.director}</span>
                  </div>
                )}
                <div>
                  <span className="text-purple-400/60 font-semibold block mb-0.5">Streaming Platform</span>
                  <span className="text-white font-medium">{activeItem.platform}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cast & Crew Section */}
          {activeItem.cast && activeItem.cast.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-display font-bold text-lg text-white">Cast & Key Characters</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeItem.cast.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#140F22] border border-purple-900/30"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-900/40 shrink-0 border border-purple-500/20">
                      <ImageWithFallback
                        src={member.avatar}
                        alt={member.name}
                        fallbackTitle={member.name}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden text-left">
                      <h4 className="text-xs font-semibold text-white truncate">{member.name}</h4>
                      <p className="text-[11px] text-purple-300/60 truncate">{member.character}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Series Season Selector & Episodes List */}
          {(activeItem.type === 'series' || activeItem.type === 'anime') && (
            <div className="space-y-4 pt-4 border-t border-purple-950/40">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-purple-400" />
                  <span>Episodes & Seasons</span>
                  {isLoadingSeasons && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  )}
                </h3>

                {/* Season Dropdown */}
                {seasons.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedSeasonNumber}
                      onChange={(e) => handleSeasonChange(Number(e.target.value))}
                      className="appearance-none bg-[#181126] border border-purple-900/50 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-semibold text-purple-100 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      {seasons.map((s) => (
                        <option key={s.seasonNumber} value={s.seasonNumber}>
                          {s.title} ({s.episodeCount || s.episodes.length} Episodes)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Episodes List */}
              {selectedSeason && selectedSeason.episodes.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedSeason.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => onPlay(activeItem, ep)}
                      className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl bg-[#140F22] hover:bg-[#1C142E] border border-purple-900/30 hover:border-purple-500/40 transition-colors cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full sm:w-36 rounded-lg overflow-hidden shrink-0 bg-[#0A0712]">
                        <ImageWithFallback
                          src={ep.thumbnail || activeItem.backdropUrl || activeItem.posterUrl}
                          alt={ep.title}
                          fallbackTitle={ep.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                          <div className="w-8 h-8 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-md">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-purple-200">
                          {ep.runtime}
                        </span>
                      </div>

                      {/* Episode Text Info */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-purple-400">
                            Episode {ep.episodeNumber}
                          </span>
                          <span className="text-white/40">·</span>
                          <h4 className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">
                            {ep.title}
                          </h4>
                        </div>
                        <p className="text-xs text-purple-200/70 line-clamp-2">
                          {ep.synopsis || 'Full episode stream available via MovieBox API.'}
                        </p>
                      </div>

                      <div className="hidden sm:block shrink-0">
                        <button className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold transition-colors">
                          Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#140F22] border border-purple-900/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-purple-300/80 font-medium">
                      Select any episode to stream instantly in CineSRC 4K:
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      Season {selectedSeasonNumber} Ready
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((epNum) => (
                      <button
                        key={`quick-ep-${epNum}`}
                        onClick={() =>
                          onPlay(activeItem, {
                            id: `${activeItem.id}-s${selectedSeasonNumber}e${epNum}`,
                            episodeNumber: epNum,
                            seasonNumber: selectedSeasonNumber,
                            title: `Episode ${epNum}`,
                            runtime: '45m',
                            synopsis: activeItem.synopsis,
                            thumbnail: activeItem.backdropUrl || activeItem.posterUrl,
                          })
                        }
                        className="group flex items-center justify-between p-2.5 rounded-xl bg-[#181126] hover:bg-purple-600 border border-purple-900/40 hover:border-purple-400 transition-all text-left cursor-pointer"
                      >
                        <div className="overflow-hidden">
                          <span className="text-[11px] font-bold text-white group-hover:text-white block">
                            Ep {epNum}
                          </span>
                          <span className="text-[10px] text-purple-400 group-hover:text-purple-100 font-mono">
                            S{selectedSeasonNumber}
                          </span>
                        </div>
                        <Play className="w-3.5 h-3.5 text-purple-400 group-hover:text-white fill-current shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Related / More Like This */}
          {(tmdbRecommendations.length > 0 || relatedItems.length > 0) && (
            <div className="space-y-4 pt-4 border-t border-purple-950/40">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-white">More Like This</h3>
                {tmdbRecommendations.length > 0 && (
                  <span className="text-[10px] font-mono text-purple-400/80 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    TMDB Recommendations
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(tmdbRecommendations.length > 0 ? tmdbRecommendations : relatedItems).slice(0, 4).map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectRelated(rel)}
                    className="group relative flex flex-col cursor-pointer"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#130E20] border border-purple-900/30 group-hover:border-purple-500/50 transition-colors">
                      <ImageWithFallback
                        src={rel.posterUrl}
                        fallbackSrc={rel.fallbackPosterUrl}
                        alt={rel.title}
                        fallbackTitle={rel.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="font-semibold text-xs text-white group-hover:text-purple-300 transition-colors truncate mt-1.5">
                      {rel.title}
                    </h4>
                    <span className="text-[11px] text-purple-300/60">
                      {rel.releaseYear} · {rel.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
