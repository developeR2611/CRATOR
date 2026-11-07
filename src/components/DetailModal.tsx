import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Bookmark, 
  Heart, 
  Star, 
  Share2, 
  Check, 
  Tv, 
  ChevronDown, 
  Loader2 
} from 'lucide-react';
import { MediaItem, Episode, Season } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
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

    let isCancelled = false;

    async function loadExtraDetails() {
      if (!item) return;

      const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';
      const mediaType = isTv ? 'tv' : 'movie';
      const lookupId = item.tmdbId || item.id;

      // 1. Fetch live TMDB details
      getTmdbDetail(mediaType, lookupId).then((detailed) => {
        if (!isCancelled && detailed) {
          setActiveItem((prev) => prev ? { ...prev, ...detailed } : detailed);
        }
      }).catch(() => {});

      // 2. Fetch live TMDB recommendations
      getTmdbRecommendations(mediaType, lookupId).then((recs) => {
        if (!isCancelled && recs.length > 0) {
          setTmdbRecommendations(recs);
        }
      }).catch(() => {});

      // 3. Fetch TV season episodes
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

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    onShowToast(!isFavorite ? `Added "${activeItem.title}" to Favorites` : `Removed from Favorites`);
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

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-0 sm:p-4 lg:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-5xl bg-[#0e0d11] rounded-none sm:rounded-2xl overflow-hidden border border-white/12 shadow-2xl shadow-black/90 my-0 sm:my-8 text-[#f3f0ea]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/70 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          aria-label="Close dialog"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cinematic Backdrop Area */}
        <div className="relative w-full h-[240px] sm:h-[320px] md:h-[400px] overflow-hidden bg-[#0a0a0c] select-none">
          <ImageWithFallback
            src={activeItem.backdropUrl || activeItem.posterUrl}
            fallbackSrc={activeItem.fallbackBackdropUrl || activeItem.fallbackPosterUrl}
            alt={activeItem.title}
            fallbackTitle={activeItem.title}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover filter brightness-[0.70]"
          />

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d11] via-[#0e0d11]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0d11]/80 via-transparent to-transparent w-full sm:w-2/3" />
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Floating Top Badges */}
          <div className="absolute top-4 left-4 sm:left-6 z-30 flex items-center gap-2 flex-wrap pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[#f3f0ea] font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>VidRift 4K Stream</span>
            </span>

            {activeItem.platform && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-white/80 text-[11px] font-medium backdrop-blur-md">
                {activeItem.platform}
              </span>
            )}
          </div>
        </div>

        {/* Details Content Section */}
        <div className="px-5 sm:px-8 md:px-10 pb-8 sm:pb-10 space-y-6">
          {/* Header & Meta Row */}
          <div className="flex flex-col md:flex-row gap-5 sm:gap-7 md:gap-8 items-start -mt-16 sm:-mt-24 md:-mt-32 relative z-20">
            {/* Left Column: Vertical Poster + Cast */}
            <div className="w-44 sm:w-48 md:w-56 lg:w-60 shrink-0 space-y-2 mx-auto sm:mx-0">
              {/* Vertical Poster Thumbnail */}
              <div className="w-full aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/90 border border-white/15 bg-[#141316] relative group">
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
                  <span className="text-[9px] font-mono font-bold text-white/90 uppercase px-1 rounded bg-black/60">
                    {activeItem.type}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-amber-300 px-1 rounded bg-black/60">
                    ★ {activeItem.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Cast & Key Characters */}
              {activeItem.cast && activeItem.cast.length > 0 && (
                <div className="space-y-1.5 pt-0.5 text-left w-full">
                  <h3 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#beb9bc]">
                    Cast & Key Characters
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {activeItem.cast.slice(0, 5).map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-2.5 p-1.5 sm:p-2 rounded-xl bg-[#141316] border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/15">
                          <ImageWithFallback
                            src={member.avatar}
                            alt={member.name}
                            fallbackTitle={member.name}
                            containerClassName="w-full h-full rounded-full"
                            isAvatar={true}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="overflow-hidden text-left min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate">{member.name}</h4>
                          <p className="text-[10px] text-[#8e8a91] truncate">{member.character}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Info & Action Column */}
            <div className="flex-1 space-y-4 pt-1 sm:pt-6 md:pt-10 text-left w-full">
              {/* Metadata Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-[#beb9bc] font-medium">
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm">{activeItem.rating.toFixed(1)}</span>
                  {activeItem.voteCount && (
                    <span className="text-[#77737a] font-normal">({activeItem.voteCount})</span>
                  )}
                </span>

                <span className="text-white/30" aria-hidden="true">·</span>
                <span>{activeItem.releaseYear}</span>

                <span className="text-white/30" aria-hidden="true">·</span>
                <span>{activeItem.runtime || (activeItem.totalSeasons ? `${activeItem.totalSeasons} Seasons` : 'Series')}</span>

                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="px-1.5 py-0.5 rounded border border-white/20 font-mono text-[10px] text-white/90">
                  {activeItem.ageRating}
                </span>

                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="font-mono text-white/90">{activeItem.quality}</span>

                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="text-[#beb9bc]">{activeItem.audio}</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight">
                  {activeItem.title}
                </h2>
                {activeItem.tagline && (
                  <p className="text-sm italic text-[#beb9bc] mt-1">
                    "{activeItem.tagline}"
                  </p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {/* Watch Now (VidRift 4K) Button */}
                <button
                  onClick={() => handlePlayCurrent()}
                  className="primary-btn h-11 px-6 rounded-lg"
                  title="Stream in VidRift 4K Player"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {isTv 
                      ? `Watch S${selectedSeasonNumber}:E1 (VidRift 4K)`
                      : 'Watch Now (VidRift 4K)'}
                  </span>
                </button>

                {/* Watchlist Button */}
                <button
                  onClick={() => onToggleWatchlist(activeItem)}
                  className={`secondary-btn h-11 px-4 rounded-lg ${
                    inWatchlist
                      ? 'bg-white text-black border-white'
                      : ''
                  }`}
                  title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'In List' : 'My List'}</span>
                </button>

                {/* Favorite Button */}
                <button
                  onClick={handleFavorite}
                  className="secondary-btn h-11 px-4 rounded-lg"
                  title={isFavorite ? 'Favorited' : 'Add to Favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="secondary-btn h-11 px-4 rounded-lg"
                  title="Share Title"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {/* Synopsis */}
              <p className="text-sm text-[#beb9bc] leading-relaxed pt-1">
                {activeItem.synopsis}
              </p>

              {/* Badges / Genres */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-[#77737a] font-medium mr-1">Genres:</span>
                {activeItem.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2.5 py-0.5 rounded-full bg-white/5 text-[#beb9bc] text-xs font-medium border border-white/10"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Director & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[#beb9bc] border-t border-white/10">
                {activeItem.director && (
                  <div>
                    <span className="text-[#8e8a91] font-semibold block mb-0.5">Director</span>
                    <span className="text-[#f3f0ea] font-medium">{activeItem.director}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#8e8a91] font-semibold block mb-0.5">Streaming Platform</span>
                  <span className="text-[#f3f0ea] font-medium">{activeItem.platform}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Series Season Selector & Episodes List */}
          {(activeItem.type === 'series' || activeItem.type === 'anime') && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-[#f3f0ea] flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#beb9bc]" />
                  <span>Episodes & Seasons</span>
                  {isLoadingSeasons && (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  )}
                </h3>

                {/* Season Dropdown */}
                {seasons.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedSeasonNumber}
                      onChange={(e) => handleSeasonChange(Number(e.target.value))}
                      className="appearance-none bg-[#141316] border border-white/15 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-semibold text-[#f3f0ea] focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
                    >
                      {seasons.map((s) => (
                        <option key={s.seasonNumber} value={s.seasonNumber}>
                          {s.title} ({s.episodeCount || s.episodes.length} Episodes)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#beb9bc] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl bg-[#141316] hover:bg-[#1f1e22] border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full sm:w-36 rounded-lg overflow-hidden shrink-0 bg-[#0a0a0c]">
                        <ImageWithFallback
                          src={ep.thumbnail || activeItem.backdropUrl || activeItem.posterUrl}
                          alt={ep.title}
                          fallbackTitle={ep.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                            <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-[#f3f0ea]">
                          {ep.runtime}
                        </span>
                      </div>

                      {/* Episode Text Info */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#beb9bc]">
                            Episode {ep.episodeNumber}
                          </span>
                          <span className="text-white/40">·</span>
                          <h4 className="font-semibold text-sm text-[#f3f0ea] group-hover:text-white transition-colors">
                            {ep.title}
                          </h4>
                        </div>
                        <p className="text-xs text-[#8e8a91] line-clamp-2">
                          {ep.synopsis || 'Full episode stream ready via VidRift player.'}
                        </p>
                      </div>

                      <div className="hidden sm:block shrink-0">
                        <button className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white hover:text-black text-[#f3f0ea] text-xs font-semibold transition-colors">
                          Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#141316] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-[#beb9bc] font-medium">
                      Select any episode to stream instantly in VidRift 4K:
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
                        className="group flex items-center justify-between p-2.5 rounded-xl bg-[#1a191d] hover:bg-white hover:text-black border border-white/10 hover:border-white transition-all text-left cursor-pointer"
                      >
                        <div className="overflow-hidden">
                          <span className="text-[11px] font-bold text-[#f3f0ea] group-hover:text-black block">
                            Ep {epNum}
                          </span>
                          <span className="text-[10px] text-[#8e8a91] group-hover:text-neutral-700 font-mono">
                            S{selectedSeasonNumber}
                          </span>
                        </div>
                        <Play className="w-3.5 h-3.5 text-[#beb9bc] group-hover:text-black fill-current shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Related / More Like This */}
          {(tmdbRecommendations.length > 0 || relatedItems.length > 0) && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-[#f3f0ea]">More Like This</h3>
                {tmdbRecommendations.length > 0 && (
                  <span className="text-[10px] font-mono text-[#beb9bc] bg-white/5 px-2 py-0.5 rounded border border-white/10">
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
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#141316] border border-white/10 group-hover:border-white/30 transition-colors">
                      <ImageWithFallback
                        src={rel.posterUrl}
                        fallbackSrc={rel.fallbackPosterUrl}
                        alt={rel.title}
                        fallbackTitle={rel.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="font-semibold text-xs text-[#f3f0ea] group-hover:text-white transition-colors truncate mt-1.5">
                      {rel.title}
                    </h4>
                    <span className="text-[11px] text-[#8e8a91]">
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
