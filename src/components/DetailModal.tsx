import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Plus, 
  Check, 
  Share2, 
  Calendar,
  ChevronDown, 
  Loader2,
  X,
  MapPin,
  ChevronRight,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  MediaItem,
  Episode,
  Season,
  CastMember,
  TrailerVideo,
  PersonDetails,
} from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { 
  getTmdbDetail, 
  getTmdbSeasonEpisodes, 
  getTmdbRecommendations, 
  getTmdbLogo,
  getSynchronousKnownLogo,
  getTmdbVideos,
  getTmdbPerson
} from '../services/tmdb';
import { 
  isMediaUnreleased, 
  isFutureIsoDate, 
  formatReleaseDate 
} from '../services/availability';
import { buildTitlePath } from '../utils/router';
import { searchTmdbPersonId } from '../services/tmdb';
import { GlassButton } from './GlassButton';

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

const buildInitialSeasons = (item: MediaItem | null): Season[] => {
  if (!item) return [];
  const total = Math.max(item.totalSeasons || 0, item.seasons?.length || 0, 1);
  const existingMap = new Map<number, Season>();
  (item.seasons || []).forEach((s) => existingMap.set(s.seasonNumber, s));
  const list: Season[] = [];
  for (let i = 1; i <= total; i++) {
    const existing = existingMap.get(i);
    list.push(
      existing || {
        seasonNumber: i,
        title: `Season ${i}`,
        episodeCount: 0,
        episodes: [],
      }
    );
  }
  return list;
};

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
  const [seasons, setSeasons] = useState<Season[]>(() => buildInitialSeasons(item));
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
    item?.seasons?.[0]?.seasonNumber || 1
  );
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<string, Episode[]>>({});
  const [fetchedSeasons, setFetchedSeasons] = useState<Record<string, boolean>>({});
  const fetchedKeysRef = useRef<Set<string>>(new Set());
  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(false);
  const [isLogoLoading, setIsLogoLoading] = useState<boolean>(Boolean(item && !initialResolvedLogo));
  const [logoRetryDone, setLogoRetryDone] = useState<boolean>(false);
  const [tmdbRecommendations, setTmdbRecommendations] = useState<MediaItem[]>([]);

  // Trailer state (for 3-second hero poster autoplay)
  const [trailers, setTrailers] = useState<TrailerVideo[]>(item?.trailers || []);

  // Hero poster 3-second trailer autoplay state
  const HERO_AUTOPLAY_DELAY_MS = 3000;
  const HERO_CURSOR_IDLE_MS = 3000;
  const [heroTrailerActive, setHeroTrailerActive] = useState<boolean>(false);
  const [heroTrailerConfirmed, setHeroTrailerConfirmed] = useState<boolean>(false);
  const [heroTrailerMuted, setHeroTrailerMuted] = useState<boolean>(true);
  const [heroTrailerBlocked, setHeroTrailerBlocked] = useState<boolean>(false);
  const [heroTrailerFinished, setHeroTrailerFinished] = useState<boolean>(false);
  const [heroDetailsVisibleDuringTrailer, setHeroDetailsVisibleDuringTrailer] = useState<boolean>(false);
  const heroTimerRef = useRef<number | null>(null);
  const heroFallbackTimerRef = useRef<number | null>(null);
  const heroRevealTimerRef = useRef<number | null>(null);
  const heroDetailsIdleTimerRef = useRef<number | null>(null);
  const heroContentHoveredRef = useRef<boolean>(false);
  const heroIframeRef = useRef<HTMLIFrameElement | null>(null);
  const titleOpenedAtRef = useRef<number>(Date.now());
  const isStartingVidRiftRef = useRef<boolean>(false);

  // Cast member details modal state
  const [selectedCast, setSelectedCast] = useState<CastMember | null>(null);
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null);
  const [isPersonLoading, setIsPersonLoading] = useState<boolean>(false);
  const [personError, setPersonError] = useState<string | null>(null);
  const [isBioExpanded, setIsBioExpanded] = useState<boolean>(false);

  const clearHeroDetailsIdleTimer = () => {
    if (heroDetailsIdleTimerRef.current !== null) {
      window.clearTimeout(heroDetailsIdleTimerRef.current);
      heroDetailsIdleTimerRef.current = null;
    }
  };

  const cancelHeroTrailer = () => {
    if (heroTimerRef.current !== null) {
      window.clearTimeout(heroTimerRef.current);
      heroTimerRef.current = null;
    }
    if (heroFallbackTimerRef.current !== null) {
      window.clearTimeout(heroFallbackTimerRef.current);
      heroFallbackTimerRef.current = null;
    }
    if (heroRevealTimerRef.current !== null) {
      window.clearTimeout(heroRevealTimerRef.current);
      heroRevealTimerRef.current = null;
    }
    clearHeroDetailsIdleTimer();
    heroContentHoveredRef.current = false;
    setHeroDetailsVisibleDuringTrailer(false);
    setHeroTrailerActive(false);
    setHeroTrailerConfirmed(false);
  };

  // Reset and load details when item changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    titleOpenedAtRef.current = Date.now();
    isStartingVidRiftRef.current = false;
    cancelHeroTrailer();
    setHeroTrailerMuted(true);
    setHeroTrailerBlocked(false);
    setHeroTrailerFinished(false);

    if (!item) {
      setActiveItem(null);
      setSeasons([]);
      setIsLogoLoading(false);
      setLogoRetryDone(false);
      setTrailers([]);
      setSelectedCast(null);
      setPersonDetails(null);
      return;
    }

    const resolvedLogo = item.logoUrl || getSynchronousKnownLogo(item);
    setActiveItem(resolvedLogo && !item.logoUrl ? { ...item, logoUrl: resolvedLogo } : item);
    setTmdbRecommendations([]);
    setLogoRetryDone(false);
    setIsLogoLoading(!resolvedLogo);

    // Reset trailer & cast dialog states cleanly
    setTrailers(item.trailers || []);
    setSelectedCast(null);
    setPersonDetails(null);
    setPersonError(null);
    setIsBioExpanded(false);

    const initialSeasonNum = item.seasons && item.seasons.length > 0 ? item.seasons[0].seasonNumber : 1;
    setSeasons(buildInitialSeasons(item));
    setSelectedSeasonNumber(initialSeasonNum);

    let isCancelled = false;

    async function loadExtraDetails() {
      if (!item) return;

      const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';
      const mediaType = isTv ? 'tv' : 'movie';
      const lookupId = item.tmdbId || item.id;

      // 1 & 2. Fetch live official graphic title logo + TMDB full details in parallel
      const detailPromise = getTmdbDetail(mediaType, lookupId).then((detailed) => {
        if (!isCancelled && detailed) {
          setActiveItem((prev) => {
            if (!prev) return detailed;
            const mergedLogo = prev.logoUrl || detailed.logoUrl || resolvedLogo;
            return {
              ...prev,
              ...detailed,
              logoUrl: mergedLogo,
            };
          });
          if (detailed.seasons && detailed.seasons.length > 0) {
            setSeasons(detailed.seasons);
            setSelectedSeasonNumber((curr) =>
              detailed.seasons!.some((s) => s.seasonNumber === curr)
                ? curr
                : detailed.seasons![0].seasonNumber
            );
          }
          if (detailed.logoUrl) {
            setIsLogoLoading(false);
          }
          if (detailed.trailers && detailed.trailers.length > 0) {
            setTrailers(detailed.trailers);
          }
        }
        return detailed;
      }).catch(() => null);

      const logoPromise = !resolvedLogo
        ? getTmdbLogo(mediaType, lookupId).then((logoUrl) => {
            if (!isCancelled && logoUrl) {
              setActiveItem((prev) => (prev ? { ...prev, logoUrl } : null));
              setIsLogoLoading(false);
            }
            return logoUrl;
          }).catch(() => null)
        : Promise.resolve(resolvedLogo);

      // Fetch videos directly if detailPromise has none (covers non-English trailers or detail fallback)
      detailPromise.then(async (detailed) => {
        if (isCancelled) return;
        if (detailed?.trailers && detailed.trailers.length > 0) return;

        const videoRes = await getTmdbVideos(mediaType, lookupId);
        if (isCancelled) return;
        if (videoRes.videos.length > 0) {
          setTrailers(videoRes.videos);
        } else {
          setTrailers([]);
        }
      });

      Promise.allSettled([detailPromise, logoPromise]).then(() => {
        if (!isCancelled) {
          setIsLogoLoading(false);
        }
      });

      // 3. Fetch live TMDB recommendations
      getTmdbRecommendations(mediaType, lookupId).then((recs) => {
        if (!isCancelled && recs.length > 0) {
          setTmdbRecommendations(recs);
        }
      }).catch(() => {});
    }

    loadExtraDetails();

    return () => {
      isCancelled = true;
      cancelHeroTrailer();
    };
  }, [item?.id]);

  // Schedule 3-second hero poster trailer autoplay; cancel immediately on close, title change, or VidRift start
  const leadTrailerKey = trailers[0]?.key;

  useEffect(() => {
    if (heroTimerRef.current !== null) {
      window.clearTimeout(heroTimerRef.current);
      heroTimerRef.current = null;
    }

    if (
      !item?.id ||
      !leadTrailerKey ||
      heroTrailerBlocked ||
      heroTrailerFinished ||
      isStartingVidRiftRef.current
    ) {
      return;
    }

    const elapsed = Date.now() - titleOpenedAtRef.current;
    const remainingMs = Math.max(0, HERO_AUTOPLAY_DELAY_MS - elapsed);

    let isCancelled = false;
    heroTimerRef.current = window.setTimeout(() => {
      if (isCancelled || isStartingVidRiftRef.current || document.hidden) return;
      setHeroTrailerMuted(true);
      setHeroTrailerConfirmed(false);
      setHeroTrailerActive(true);
    }, remainingMs);

    return () => {
      isCancelled = true;
      if (heroTimerRef.current !== null) {
        window.clearTimeout(heroTimerRef.current);
        heroTimerRef.current = null;
      }
    };
  }, [item?.id, leadTrailerKey, heroTrailerBlocked, heroTrailerFinished]);

  // Verify YouTube playback started, keep intro/pause/end center playback buttons completely behind poster, and restore poster when trailer ends
  useEffect(() => {
    if (!heroTrailerActive || !leadTrailerKey) return;

    let confirmedPlayback = false;
    let isRevealed = false;
    let isEffectCancelled = false;
    let knownDuration = 0;

    const clearRevealTimer = () => {
      if (heroRevealTimerRef.current !== null) {
        window.clearTimeout(heroRevealTimerRef.current);
        heroRevealTimerRef.current = null;
      }
    };

    const revealTrailer = () => {
      if (isRevealed || isEffectCancelled || isStartingVidRiftRef.current) return;
      isRevealed = true;
      clearRevealTimer();
      window.clearInterval(handshakeInterval);
      setHeroTrailerConfirmed(true);
    };

    const finishTrailer = () => {
      window.clearInterval(handshakeInterval);
      if (heroFallbackTimerRef.current !== null) {
        window.clearTimeout(heroFallbackTimerRef.current);
        heroFallbackTimerRef.current = null;
      }
      clearRevealTimer();
      setHeroTrailerFinished(true);
      setHeroTrailerConfirmed(false);
      setHeroTrailerActive(false);
    };

    const handshakeInterval = window.setInterval(() => {
      if (isRevealed) return;
      registerHeroYouTubeListeners();
    }, 350);

    heroFallbackTimerRef.current = window.setTimeout(() => {
      if (!confirmedPlayback) {
        clearRevealTimer();
        setHeroTrailerActive(false);
        setHeroTrailerConfirmed(false);
        setHeroTrailerBlocked(true);
      }
    }, 7000);

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.youtube-nocookie.com' &&
        event.origin !== 'https://www.youtube.com'
      ) {
        return;
      }

      let payload: any = null;
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!payload || typeof payload !== 'object') return;

      if (payload.event === 'onError') {
        window.clearInterval(handshakeInterval);
        if (heroFallbackTimerRef.current !== null) {
          window.clearTimeout(heroFallbackTimerRef.current);
          heroFallbackTimerRef.current = null;
        }
        clearRevealTimer();
        setHeroTrailerActive(false);
        setHeroTrailerConfirmed(false);
        setHeroTrailerBlocked(true);
        return;
      }

      if (payload.event === 'infoDelivery' && typeof payload.info?.duration === 'number' && payload.info.duration > 0) {
        knownDuration = payload.info.duration;
      }

      const currentTime =
        payload.event === 'infoDelivery' && typeof payload.info?.currentTime === 'number'
          ? payload.info.currentTime
          : undefined;

      const playerState =
        payload.event === 'onStateChange'
          ? payload.info
          : payload.event === 'infoDelivery'
            ? payload.info?.playerState
            : undefined;

      if (playerState === 1) {
        confirmedPlayback = true;
        if (heroFallbackTimerRef.current !== null) {
          window.clearTimeout(heroFallbackTimerRef.current);
          heroFallbackTimerRef.current = null;
        }

        // Wait until at least ~3.2s of active playback has elapsed so both the center playback icon and top-right intro buttons are completely gone
        if (!isRevealed) {
          if (typeof currentTime === 'number' && currentTime >= 3.2) {
            revealTrailer();
          } else if (heroRevealTimerRef.current === null) {
            heroRevealTimerRef.current = window.setTimeout(() => {
              revealTrailer();
            }, 3200);
          }
        }
      }

      // If buffering/paused/cued before or during playback, never expose YouTube's center playback button
      if (playerState === 2 || playerState === 3 || playerState === 5) {
        clearRevealTimer();
        if (isRevealed && playerState === 2) {
          isRevealed = false;
          setHeroTrailerConfirmed(false);
          try {
            heroIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              'https://www.youtube-nocookie.com'
            );
          } catch {}
        }
      }

      // Hide just before end-screen suggestions / replay playback button appear
      if (
        playerState === 0 ||
        (typeof currentTime === 'number' && knownDuration > 6 && currentTime >= knownDuration - 0.7)
      ) {
        finishTrailer();
        return;
      }

      if (payload.event === 'infoDelivery' && typeof payload.info?.muted === 'boolean') {
        setHeroTrailerMuted(payload.info.muted);
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => {
      isEffectCancelled = true;
      window.clearInterval(handshakeInterval);
      window.removeEventListener('message', handleYouTubeMessage);
      if (heroFallbackTimerRef.current !== null) {
        window.clearTimeout(heroFallbackTimerRef.current);
        heroFallbackTimerRef.current = null;
      }
      clearRevealTimer();
    };
  }, [heroTrailerActive, leadTrailerKey]);

  // Dedicated effect to always fetch live TMDB episodes for whichever season is selected
  const currentIsTv = Boolean(
    item && (item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv')
  );

  useEffect(() => {
    if (!item || !currentIsTv) {
      setIsLoadingSeasons(false);
      return;
    }

    const cacheKey = `${item.id}:${selectedSeasonNumber}`;
    if (fetchedKeysRef.current.has(cacheKey)) {
      setIsLoadingSeasons(false);
      return;
    }

    let isCancelled = false;
    const lookupId = item.tmdbId || item.id;
    setIsLoadingSeasons(true);

    getTmdbSeasonEpisodes(lookupId, selectedSeasonNumber)
      .then((episodes) => {
        if (isCancelled) return;
        fetchedKeysRef.current.add(cacheKey);
        const existingLocalSeason = item.seasons?.find(
          (s) => s.seasonNumber === selectedSeasonNumber
        );
        const resolvedEps =
          episodes.length > 0 ? episodes : existingLocalSeason?.episodes || [];
        setFetchedSeasons((prev) => ({ ...prev, [cacheKey]: true }));
        setEpisodesBySeason((prev) => ({ ...prev, [cacheKey]: resolvedEps }));
      })
      .catch(() => {
        if (isCancelled) return;
        const existingLocalSeason = item.seasons?.find(
          (s) => s.seasonNumber === selectedSeasonNumber
        );
        setFetchedSeasons((prev) => ({ ...prev, [cacheKey]: true }));
        if (existingLocalSeason?.episodes?.length) {
          setEpisodesBySeason((prev) => ({
            ...prev,
            [cacheKey]: existingLocalSeason.episodes,
          }));
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingSeasons(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [item?.id, item?.tmdbId, currentIsTv, selectedSeasonNumber]);

  const handleCloseModal = () => {
    cancelHeroTrailer();
    onClose();
  };

  // Handle ESC key to close cast dialog first, then main detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCast) {
          setSelectedCast(null);
        } else {
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedCast]);

  if (!activeItem) return null;

  const inWatchlist = isInWatchlist(activeItem.id);
  const selectedSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNumber) || seasons[0];
  const isTv = activeItem.type === 'series' || activeItem.type === 'anime' || (activeItem.type as any) === 'tv';
  const isUnreleased = isMediaUnreleased(activeItem);
  const formattedReleaseDate = formatReleaseDate(activeItem.releaseDate, activeItem.releaseYear);

  // Key episode lookup cleanly by item + season so cross-item switches never leak stale data
  const activeEpisodeKey = `${item?.id || activeItem.id}:${selectedSeasonNumber}`;
  const liveSeasonEpisodes = episodesBySeason[activeEpisodeKey];
  const hasFetchedSeason = Boolean(fetchedSeasons[activeEpisodeKey]);
  const displayedEpisodes: Episode[] = hasFetchedSeason
    ? (liveSeasonEpisodes || [])
    : (selectedSeason?.episodes || []);

  const hasFutureSeasonDate = Boolean(selectedSeason?.airDate) && isFutureIsoDate(selectedSeason?.airDate);
  const allDisplayedEpisodesUnreleased =
    displayedEpisodes.length > 0 && displayedEpisodes.every((ep) => isFutureIsoDate(ep.releaseDate));
  const isEmptyUnannouncedSeason =
    hasFetchedSeason &&
    displayedEpisodes.length === 0 &&
    (selectedSeason?.episodeCount === 0 || !selectedSeason?.airDate || hasFutureSeasonDate);

  const isSelectedSeasonUnreleased =
    isUnreleased ||
    allDisplayedEpisodesUnreleased ||
    (hasFutureSeasonDate && displayedEpisodes.length === 0) ||
    isEmptyUnannouncedSeason;

  const hideTopPlayButton = isUnreleased || (isTv && isSelectedSeasonUnreleased);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      onShowToast('Link copied to clipboard');
    }
  };

  const handleSeasonChange = (newSeasonNumber: number) => {
    setSelectedSeasonNumber(newSeasonNumber);
  };

  const handleLogoError = () => {
    const brokenUrl = activeItem.logoUrl;
    if (!logoRetryDone) {
      setLogoRetryDone(true);
      setIsLogoLoading(true);
      const mediaType = isTv ? 'tv' : 'movie';
      const lookupId = activeItem.tmdbId || activeItem.id;
      getTmdbLogo(mediaType, lookupId, true)
        .then((freshUrl) => {
          setActiveItem((prev) => {
            if (!prev) return null;
            if (freshUrl && freshUrl !== brokenUrl) {
              return { ...prev, logoUrl: freshUrl };
            }
            return { ...prev, logoUrl: undefined };
          });
        })
        .catch(() => {
          setActiveItem((prev) => (prev ? { ...prev, logoUrl: undefined } : null));
        })
        .finally(() => {
          setIsLogoLoading(false);
        });
    } else {
      setActiveItem((prev) => (prev ? { ...prev, logoUrl: undefined } : null));
      setIsLogoLoading(false);
    }
  };

  const registerHeroYouTubeListeners = () => {
    const win = heroIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({ event: 'listening', id: 'crator-hero-trailer' }),
        'https://www.youtube-nocookie.com'
      );
      win.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
        'https://www.youtube-nocookie.com'
      );
      win.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'] }),
        'https://www.youtube-nocookie.com'
      );
    } catch {}
  };

  const handleToggleHeroMute = () => {
    const nextMuted = !heroTrailerMuted;
    setHeroTrailerMuted(nextMuted);
    const win = heroIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({ event: 'command', func: nextMuted ? 'mute' : 'unMute', args: [] }),
        'https://www.youtube-nocookie.com'
      );
      if (!nextMuted) {
        win.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
          'https://www.youtube-nocookie.com'
        );
        win.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          'https://www.youtube-nocookie.com'
        );
      }
    } catch {}
  };

  const handlePlayCurrent = (ep?: Episode) => {
    if (isUnreleased) return;
    if (ep) {
      if (isFutureIsoDate(ep.releaseDate)) return;
      isStartingVidRiftRef.current = true;
      cancelHeroTrailer();
      onPlay(activeItem, ep);
      return;
    }
    if (isTv) {
      if (isSelectedSeasonUnreleased) return;
      const firstReleasedEp =
        displayedEpisodes.find((e) => !isFutureIsoDate(e.releaseDate)) ||
        (!hasFetchedSeason
          ? {
              id: `${activeItem.id}-s${selectedSeasonNumber}e1`,
              episodeNumber: 1,
              seasonNumber: selectedSeasonNumber,
              title: `Episode 1`,
              runtime: '45m',
              synopsis: activeItem.synopsis,
              thumbnail: activeItem.backdropUrl || activeItem.posterUrl,
            }
          : undefined);
      if (!firstReleasedEp) return;
      isStartingVidRiftRef.current = true;
      cancelHeroTrailer();
      onPlay(activeItem, firstReleasedEp);
    } else {
      isStartingVidRiftRef.current = true;
      cancelHeroTrailer();
      onPlay(activeItem);
    }
  };

  const heroTrailer = trailers[0];

  const loadPersonDetails = async (personId: number) => {
    setIsPersonLoading(true);
    setPersonError(null);
    const res = await getTmdbPerson(personId);
    if (res.person) {
      setPersonDetails(res.person);
      setPersonError(null);
    } else {
      setPersonDetails(null);
      setPersonError(res.error || 'Unable to load cast member details right now.');
    }
    setIsPersonLoading(false);
  };

  const handleOpenCastMember = async (member: CastMember) => {
    setSelectedCast(member);
    setPersonDetails(null);
    setPersonError(null);
    setIsBioExpanded(false);

    if (!member.id) {
      setIsPersonLoading(true);
      const resolvedId = await searchTmdbPersonId(member.name);
      if (resolvedId) {
        loadPersonDetails(resolvedId);
      } else {
        setIsPersonLoading(false);
        setPersonError('Detailed biography is not available for this cast entry yet.');
      }
      return;
    }

    loadPersonDetails(member.id);
  };

  const mediaTypeLabel = isTv ? 'SERIES' : 'FILM';
  const ageRatingLabel = activeItem.ageRating || 'PG-13';
  const runtimeLabel = activeItem.runtime 
    ? activeItem.runtime.toUpperCase() 
    : (activeItem.totalSeasons ? `${activeItem.totalSeasons} ${activeItem.totalSeasons === 1 ? 'SEASON' : 'SEASONS'}` : 'FEATURE');

  // Refined typographic fallback ONLY if TMDB has zero official logos
  const renderStackedTitle = () => {
    const titleWords = (activeItem.title || '').trim().split(' ');
    if (titleWords.length > 1 && titleWords.length <= 4) {
      const mid = Math.ceil(titleWords.length / 2);
      const line1 = titleWords.slice(0, mid).join(' ');
      const line2 = titleWords.slice(mid).join(' ');
      return (
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-white uppercase leading-[0.95] drop-shadow-2xl">
          <span className="block">{line1}</span>
          <span className="block">{line2}</span>
        </h1>
      );
    }
    return (
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-white uppercase leading-[0.95] drop-shadow-2xl">
        {activeItem.title}
      </h1>
    );
  };

  // Genre display separated with slashes
  const genresRow = activeItem.genres && activeItem.genres.length > 0
    ? activeItem.genres.slice(0, 3).map((g) => g.toUpperCase()).join('   /   ')
    : 'ACTION   /   ADVENTURE   /   SCI-FI';

  const castMembers = Array.isArray(activeItem.cast) ? activeItem.cast : [];
  const directorName = activeItem.director;
  const isHeroTrailerShowing = heroTrailerActive && heroTrailerConfirmed && !heroTrailerBlocked;
  const hideHeroDetailsForTrailer = isHeroTrailerShowing && !heroDetailsVisibleDuringTrailer;

  const scheduleHeroDetailsAutoHide = () => {
    clearHeroDetailsIdleTimer();
    if (!isHeroTrailerShowing || heroContentHoveredRef.current) return;
    heroDetailsIdleTimerRef.current = window.setTimeout(() => {
      if (!heroContentHoveredRef.current) {
        setHeroDetailsVisibleDuringTrailer(false);
      }
    }, HERO_CURSOR_IDLE_MS);
  };

  const handleHeroPointerActivity = () => {
    if (!isHeroTrailerShowing) return;
    setHeroDetailsVisibleDuringTrailer(true);
    scheduleHeroDetailsAutoHide();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#040508] text-[#f3f0ea] select-none animate-fadeIn">
      {/* 1. Top-Left Circular Glass Back Button */}
      <GlassButton
        variant="icon"
        size="icon"
        shape="circle"
        refractive={true}
        onClick={handleCloseModal}
        className="!fixed top-6 left-6 z-50 w-11 h-11"
        aria-label="Back"
        title="Back (Esc)"
      >
        <ArrowLeft className="w-5 h-5" />
      </GlassButton>

      {/* 2. Hero Section with Full-Bleed Cinematic Backdrop + 3s Auto-Playing Trailer */}
      <div
        className="relative w-full min-h-[92vh] md:min-h-[96vh] lg:min-h-screen flex flex-col justify-end overflow-hidden"
        onMouseMove={handleHeroPointerActivity}
        onTouchStart={handleHeroPointerActivity}
      >
        {/* Full-Bleed Poster / Trailer Media Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden" data-hero-poster-area="true">
          {/* Embedded Auto-Playing Trailer (renders underneath poster until playback & chrome fade are ready) */}
          {heroTrailerActive && heroTrailer && !heroTrailerBlocked && (
            <div
              className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-700 ${
                isHeroTrailerShowing ? 'opacity-100' : 'opacity-0'
              }`}
              data-hero-trailer-player="true"
            >
              <iframe
                ref={heroIframeRef}
                id="crator-hero-trailer-iframe"
                key={`${activeItem.id}-${heroTrailer.key}`}
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(heroTrailer.key)}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0&showinfo=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                title={`${activeItem.title} trailer preview`}
                onLoad={() => {
                  registerHeroYouTubeListeners();
                  window.setTimeout(registerHeroYouTubeListeners, 250);
                }}
                style={{
                  width: 'max(100%, 177.78vh)',
                  height: 'max(100%, 56.25vw)',
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.28] sm:scale-[1.32] origin-center border-0 pointer-events-none"
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={-1}
              />
            </div>
          )}

          {/* Poster / Backdrop Image (stays visible until trailer playback starts or when unavailable/blocked/ended) */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              isHeroTrailerShowing
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100'
            }`}
            data-hero-poster-fallback="true"
          >
            <ImageWithFallback
              src={activeItem.backdropUrl || activeItem.posterUrl}
              fallbackSrc={activeItem.fallbackBackdropUrl || activeItem.fallbackPosterUrl}
              alt={activeItem.title}
              fallbackTitle={activeItem.title}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover object-[center_15%] sm:object-[center_12%]"
            />
          </div>

          {/* Subtle Cinematic Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent w-full md:w-1/2 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 via-22% to-transparent h-full pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />
        </div>

        {/* Visible Hero Trailer Mute / Unmute Control */}
        {isHeroTrailerShowing && (
          <GlassButton
            variant="secondary"
            size="md"
            shape="pill"
            refractive={true}
            onClick={handleToggleHeroMute}
            data-hero-mute-toggle="true"
            aria-label={heroTrailerMuted ? 'Unmute trailer' : 'Mute trailer'}
            title={heroTrailerMuted ? 'Unmute trailer' : 'Mute trailer'}
            className="!absolute top-6 right-6 z-20 h-11 px-4 text-xs"
            leftIcon={
              heroTrailerMuted ? (
                <VolumeX className="w-4 h-4 text-[#f3f0ea]" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )
            }
          >
            <span>{heroTrailerMuted ? 'Unmute' : 'Mute'}</span>
          </GlassButton>
        )}

        {/* Hero Content Block */}
        <div
          className="relative z-10 w-full max-w-4xl px-6 sm:px-12 md:px-16 pb-8 sm:pb-10 pt-44 sm:pt-60 md:pt-72"
          onMouseEnter={() => {
            if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
              heroContentHoveredRef.current = true;
              clearHeroDetailsIdleTimer();
            }
          }}
          onMouseLeave={() => {
            heroContentHoveredRef.current = false;
            scheduleHeroDetailsAutoHide();
          }}
        >
          {/* Kicker Row (hidden smoothly while trailer plays cleanly; reappears on cursor movement) */}
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out ${
              hideHeroDetailsForTrailer
                ? 'grid-rows-[0fr] opacity-0 mb-0 pointer-events-none'
                : 'grid-rows-[1fr] opacity-100 mb-2.5 sm:mb-3'
            }`}
            aria-hidden={hideHeroDetailsForTrailer}
          >
            <div className="overflow-hidden">
              <div className="flex items-center flex-wrap gap-2.5 text-xs sm:text-sm font-semibold tracking-wider text-white/90">
                <span className="text-white/50 text-base leading-none select-none">—</span>
                <span className="uppercase">{mediaTypeLabel}</span>
                <span className="text-white/40">·</span>
                <span>{activeItem.releaseDate ? formattedReleaseDate.toUpperCase() : (activeItem.releaseYear || 2026)}</span>
                <span className="text-white/40">·</span>
                <span className="glass-badge px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-widest">
                  {ageRatingLabel}
                </span>
                <span className="text-white/40">·</span>
                <span className="uppercase">{runtimeLabel}</span>
              </div>
            </div>
          </div>

          {/* OFFICIAL GRAPHIC TITLE LOGO (FROM TMDB) — always stays visible during trailer */}
          <div className="py-0.5 min-h-[68px] sm:min-h-[84px] flex items-center">
            {activeItem.logoUrl ? (
              <div className="py-1 max-w-xs sm:max-w-sm md:max-w-md">
                <img
                  src={activeItem.logoUrl}
                  alt={activeItem.title}
                  className="max-h-16 sm:max-h-20 md:max-h-24 w-auto max-w-full object-contain object-left drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] select-none"
                  onError={handleLogoError}
                />
              </div>
            ) : isLogoLoading ? (
              <div
                className="h-14 sm:h-16 md:h-20 w-52 sm:w-64 rounded-xl bg-white/10 animate-pulse"
                aria-label={`Loading logo for ${activeItem.title}`}
              />
            ) : (
              renderStackedTitle()
            )}
          </div>

          {/* Remaining Hero Details & Actions (hidden smoothly while trailer plays cleanly; reappears on cursor movement) */}
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out ${
              hideHeroDetailsForTrailer
                ? 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                : 'grid-rows-[1fr] opacity-100 mt-2.5 sm:mt-3'
            }`}
            aria-hidden={hideHeroDetailsForTrailer}
          >
            <div className="overflow-hidden space-y-2.5 sm:space-y-3">
              {/* Genres row */}
              <div className="text-xs sm:text-sm font-bold tracking-[0.25em] text-[#beb9bc] uppercase py-0.5">
                {genresRow}
              </div>

              {/* Synopsis paragraph */}
              <p className="text-xs sm:text-sm text-[#d1ced2] leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-3">
                {activeItem.synopsis}
              </p>

              {/* Directed by / Created by line */}
              {directorName && (
                <div className="flex items-center gap-2 pt-0.5 text-xs">
                  <span className="font-mono text-[11px] tracking-widest uppercase text-white/50">
                    {isTv ? 'CREATED BY' : 'DIRECTED BY'}
                  </span>
                  <span className="font-semibold text-white ml-1">
                    {directorName}
                  </span>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2.5 pt-2 flex-wrap">
                {hideTopPlayButton ? (
                  <div
                    className="glass-panel text-[#f3f0ea] font-semibold px-5 py-3 rounded-xl flex items-center gap-2.5 text-sm"
                    data-unreleased-release-date="true"
                  >
                    <Calendar className="w-4 h-4 text-[#c9c7cc]" />
                    <span>
                      {!isUnreleased && isTv
                        ? `Season ${selectedSeasonNumber} Release Date: ${
                            selectedSeason?.airDate
                              ? formatReleaseDate(selectedSeason.airDate)
                              : displayedEpisodes[0]?.releaseDate
                                ? formatReleaseDate(displayedEpisodes[0].releaseDate)
                                : 'TBA'
                          }`
                        : `Release Date: ${formattedReleaseDate}`}
                    </span>
                  </div>
                ) : (
                  <GlassButton
                    variant="primary"
                    size="lg"
                    refractive={true}
                    onClick={() => handlePlayCurrent()}
                    className="h-11 px-7 rounded-xl text-sm font-bold"
                    leftIcon={<Play className="w-4 h-4 fill-current" />}
                  >
                    <span>{isTv ? `Resume S${selectedSeasonNumber} E1` : 'Play'}</span>
                  </GlassButton>
                )}

                {/* Plus / Watchlist Button */}
                <GlassButton
                  variant="icon"
                  size="icon"
                  shape="square"
                  refractive={true}
                  onClick={() => onToggleWatchlist(activeItem)}
                  className="w-11 h-11"
                  title={inWatchlist ? 'In Watchlist' : 'Add to List'}
                  aria-label={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  {inWatchlist ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
                </GlassButton>

                {/* Share Button */}
                <GlassButton
                  variant="icon"
                  size="icon"
                  shape="square"
                  refractive={true}
                  onClick={handleShare}
                  className="w-11 h-11"
                  title="Share"
                  aria-label="Share title"
                >
                  <Share2 className="w-4 h-4" />
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT SECTIONS */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 md:px-16 pt-8 pb-16 space-y-12">
        {/* ================================================================= */}
        {/* FOR TV SERIES: CONTINUE THE STORY / Episodes */}
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

              {/* Season Selector Controls */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono tracking-widest text-[#8e8a91] uppercase mb-1">
                  SEASON
                </span>
                <div className="relative z-20 flex items-center gap-2 flex-wrap justify-end">
                  {seasons.length > 1 && seasons.length <= 8 && (
                    <div className="flex items-center gap-1.5 mr-1 flex-wrap">
                      {seasons.map((s) => (
                        <GlassButton
                          key={`pill-${s.seasonNumber}`}
                          variant="pill"
                          size="sm"
                          shape="pill"
                          active={selectedSeasonNumber === s.seasonNumber}
                          aria-pressed={selectedSeasonNumber === s.seasonNumber}
                          onClick={() => handleSeasonChange(s.seasonNumber)}
                          className="px-3.5"
                        >
                          S{s.seasonNumber}
                        </GlassButton>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <select
                      value={selectedSeasonNumber}
                      onChange={(e) => handleSeasonChange(Number(e.target.value))}
                      aria-label="Select season"
                      className="lg-select rounded-full px-4 py-2 pr-9 text-xs text-white"
                    >
                      {seasons.map((s) => (
                        <option key={s.seasonNumber} value={s.seasonNumber} className="bg-[#0e1118] text-white">
                          {s.title || `Season ${s.seasonNumber}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#c9c7cc] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Episodes List / Loading / Unreleased State */}
            {isLoadingSeasons && displayedEpisodes.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={`ep-skel-${idx}`}
                    className="glass-surface h-28 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : displayedEpisodes.length > 0 ? (
              <div className="space-y-3">
                {displayedEpisodes.map((ep) => {
                  const epUnreleased = isUnreleased || isFutureIsoDate(ep.releaseDate);
                  return (
                    <div
                      key={ep.id}
                      onClick={() => {
                        if (!epUnreleased) handlePlayCurrent(ep);
                      }}
                      onKeyDown={(e) => {
                        if (!epUnreleased && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handlePlayCurrent(ep);
                        }
                      }}
                      role={epUnreleased ? undefined : 'button'}
                      tabIndex={epUnreleased ? undefined : 0}
                      className={`glass-surface group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-2xl ${
                        epUnreleased
                          ? 'opacity-80 cursor-default'
                          : 'glass-hover cursor-pointer'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full sm:w-44 rounded-xl overflow-hidden shrink-0 bg-[#0a0c12] border border-white/10">
                        <ImageWithFallback
                          src={ep.thumbnail || activeItem.backdropUrl || activeItem.posterUrl}
                          alt={ep.title}
                          fallbackTitle={ep.title}
                          containerClassName="w-full h-full"
                          className={`w-full h-full object-cover ${epUnreleased ? '' : 'group-hover:scale-105'} transition-transform duration-300`}
                        />
                        {!epUnreleased && (
                          <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                            <span className="lg-btn lg-btn--primary lg-btn--shape-circle w-9 h-9 flex items-center justify-center pointer-events-none">
                              <span className="lg-btn__content">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </span>
                            </span>
                          </div>
                        )}
                        <span className="glass-badge absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-white">
                          {epUnreleased && ep.releaseDate ? formatReleaseDate(ep.releaseDate) : ep.runtime}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#c9c7cc]">
                            Episode {ep.episodeNumber}
                          </span>
                          <span className="text-white/30">·</span>
                          <h4 className={`font-semibold text-sm text-white ${epUnreleased ? '' : 'group-hover:text-emerald-300'} transition-colors`}>
                            {ep.title}
                          </h4>
                          {ep.releaseDate && (
                            <span className="text-[11px] font-mono text-[#8a8890]">
                              · {formatReleaseDate(ep.releaseDate)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9a9ba1] line-clamp-2">
                          {ep.synopsis || (epUnreleased ? `Scheduled to air ${formatReleaseDate(ep.releaseDate)}.` : 'Full episode stream ready to watch.')}
                        </p>
                      </div>

                      <div className="hidden sm:block shrink-0">
                        {epUnreleased ? (
                          <span className="glass-badge px-3.5 py-2 rounded-full text-[#c9c7cc] text-xs font-mono">
                            {ep.releaseDate ? `Airs ${formatReleaseDate(ep.releaseDate)}` : 'Coming Soon'}
                          </span>
                        ) : (
                          <span className="lg-btn lg-btn--pill lg-btn--size-sm lg-btn--shape-pill group-hover:!bg-[var(--lg-bg-primary-hover)] group-hover:!border-[var(--lg-border-primary-hover)] group-hover:!text-[#0b0d12]">
                            <span className="lg-btn__content">Stream</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1 text-left">
                  <p className="text-sm font-semibold text-white">
                    {isSelectedSeasonUnreleased
                      ? `Season ${selectedSeasonNumber} is not released yet`
                      : `No episodes listed for Season ${selectedSeasonNumber} yet`}
                  </p>
                  <p className="text-xs text-[#9a9ba1] font-mono">
                    {selectedSeason?.airDate
                      ? `Release Date: ${formatReleaseDate(selectedSeason.airDate)}`
                      : (activeItem.releaseDate ? `Release Date: ${formattedReleaseDate}` : 'Release schedule to be announced')}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-[#9a9ba1]" />
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* FEATURING & Cast Section */}
        {/* ================================================================= */}
        {castMembers.length > 0 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono tracking-widest text-[#9a9ba1] uppercase flex items-center gap-2">
                <span className="text-white/50">—</span>
                <span>FEATURING</span>
              </span>
              <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  Cast
                </h2>
                <span className="text-xs font-mono tracking-widest text-[#9a9ba1] uppercase">
                  {castMembers.length} CREDITED · CLICK FOR BIO
                </span>
              </div>
            </div>

            {/* Cast Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {castMembers.map((member, idx) => (
                <button
                  key={`${member.id || member.name}-${idx}`}
                  type="button"
                  onClick={() => handleOpenCastMember(member)}
                  data-cast-card="true"
                  aria-label={`View details for ${member.name}`}
                  className="glass-surface glass-hover lg-card-btn flex flex-col items-start gap-2.5 p-3 rounded-2xl group cursor-pointer text-left"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/20 shadow-md">
                    <ImageWithFallback
                      src={member.avatar}
                      alt={member.name}
                      fallbackTitle={member.name}
                      containerClassName="w-full h-full rounded-full"
                      isAvatar={true}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="w-full text-left space-y-0.5">
                    <h4 className="font-semibold text-xs text-white group-hover:text-emerald-300 transition-colors truncate flex items-center justify-between gap-1">
                      <span className="truncate">{member.name}</span>
                      <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="text-[11px] text-[#9a9ba1] truncate font-mono">{member.character}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* Recommendations ("More Like This") */}
        {/* ================================================================= */}
        {(tmdbRecommendations.length > 0 || relatedItems.length > 0) && (
          <div className="space-y-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono tracking-widest text-[#9a9ba1] uppercase block mb-1">
                  RECOMMENDATIONS
                </span>
                <h3 className="font-display font-bold text-2xl text-white">
                  More Like This
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {(tmdbRecommendations.length > 0 ? tmdbRecommendations : relatedItems).slice(0, 6).map((rel) => (
                <a
                  key={rel.id}
                  href={buildTitlePath(rel)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    onSelectRelated(rel);
                  }}
                  className="group relative flex flex-col cursor-pointer text-left no-underline"
                >
                  <div className="poster w-full">
                    <ImageWithFallback
                      src={rel.posterUrl}
                      fallbackSrc={rel.fallbackPosterUrl}
                      alt={rel.title}
                      fallbackTitle={rel.title}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="font-semibold text-xs text-white group-hover:text-emerald-300 transition-colors truncate mt-2 text-left w-full">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] text-[#9a9ba1] text-left">
                    {rel.releaseYear} · {rel.type === 'movie' ? 'Film' : 'TV'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Cast Member Biography & Known-For Dialog */}
      {/* ================================================================= */}
      {selectedCast && (
        <div
          className="glass-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setSelectedCast(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCast.name} details`}
        >
          <div
            className="glass-panel relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl p-6 sm:p-8 space-y-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassButton
              variant="icon"
              size="icon"
              shape="circle"
              refractive={true}
              onClick={() => setSelectedCast(null)}
              aria-label="Close cast details"
              className="!absolute top-4 right-4 w-9 h-9"
            >
              <X className="w-4 h-4" />
            </GlassButton>

            {/* Top Profile Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-8">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white/10 border border-white/15 shrink-0 shadow-lg">
                <ImageWithFallback
                  src={personDetails?.profileUrl || selectedCast.avatar}
                  alt={personDetails?.name || selectedCast.name}
                  fallbackTitle={personDetails?.name || selectedCast.name}
                  containerClassName="w-full h-full"
                  isAvatar={true}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="space-y-2 flex-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8e8a91] block">
                  {personDetails?.knownForDepartment || 'Acting'} · In {activeItem.title} as {selectedCast.character}
                </span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                  {personDetails?.name || selectedCast.name}
                </h3>

                {(personDetails?.birthday || personDetails?.placeOfBirth) && (
                  <div className="flex items-center flex-wrap gap-3 text-xs text-[#beb9bc] pt-0.5">
                    {personDetails.birthday && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#8e8a91]" />
                        <span>
                          Born {formatReleaseDate(personDetails.birthday)}
                          {personDetails.deathday ? ` – ${formatReleaseDate(personDetails.deathday)}` : ''}
                        </span>
                      </span>
                    )}
                    {personDetails.placeOfBirth && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#8e8a91]" />
                        <span>{personDetails.placeOfBirth}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Biography Section */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#8e8a91]">
                Biography
              </h4>

              {isPersonLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-white/10 rounded w-full" />
                  <div className="h-3.5 bg-white/10 rounded w-11/12" />
                  <div className="h-3.5 bg-white/10 rounded w-4/5" />
                </div>
              ) : personError ? (
                <div className="glass-surface rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-[#c9c7cc]">{personError}</p>
                  {selectedCast.id && (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      shape="pill"
                      onClick={() => loadPersonDetails(selectedCast.id!)}
                    >
                      Retry
                    </GlassButton>
                  )}
                </div>
              ) : personDetails?.biography ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#d3d1d6] leading-relaxed whitespace-pre-line">
                    {isBioExpanded || personDetails.biography.length <= 360
                      ? personDetails.biography
                      : `${personDetails.biography.slice(0, 360).trimEnd()}...`}
                  </p>
                  {personDetails.biography.length > 360 && (
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      shape="pill"
                      onClick={() => setIsBioExpanded((prev) => !prev)}
                    >
                      {isBioExpanded ? 'Show less' : 'Read full biography'}
                    </GlassButton>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#9a9ba1] italic">
                  No biography available for {personDetails?.name || selectedCast.name}.
                </p>
              )}
            </div>

            {/* Known For Section */}
            {!personError && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#9a9ba1]">
                    Known For
                  </h4>
                  {personDetails && personDetails.knownFor.length > 0 && (
                    <span className="text-[11px] font-mono text-[#8a8890]">
                      {personDetails.knownFor.length} TITLES
                    </span>
                  )}
                </div>

                {isPersonLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((idx) => (
                      <div key={`kf-skel-${idx}`} className="aspect-[2/3] rounded-xl glass-surface animate-pulse" />
                    ))}
                  </div>
                ) : personDetails && personDetails.knownFor.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {personDetails.knownFor.map((credit) => (
                      <a
                        key={`${credit.mediaType}-${credit.id}`}
                        href={buildTitlePath(credit.mediaItem)}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                          e.preventDefault();
                          setSelectedCast(null);
                          onSelectRelated(credit.mediaItem);
                        }}
                        className="group flex flex-col text-left cursor-pointer no-underline"
                      >
                        <div className="poster w-full">
                          <ImageWithFallback
                            src={credit.posterUrl}
                            fallbackSrc={credit.backdropUrl}
                            alt={credit.title}
                            fallbackTitle={credit.title}
                            loading="lazy"
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <span className="font-semibold text-xs text-white group-hover:text-emerald-300 transition-colors truncate mt-2 w-full">
                          {credit.title}
                        </span>
                        <span className="text-[11px] text-[#8e8a91] truncate w-full">
                          {credit.releaseYear} · {credit.mediaType === 'movie' ? 'Film' : 'TV'}
                          {credit.character ? ` · ${credit.character}` : ''}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8e8a91]">
                    No credited movies or TV shows listed yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
