import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Film, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MediaCarousel } from './components/MediaCarousel';
import { ContinueWatching } from './components/ContinueWatching';
import { NewEpisodes } from './components/NewEpisodes';
import { ExploreGrid } from './components/ExploreGrid';
import { DetailModal } from './components/DetailModal';
import { VideoPlayer } from './components/VideoPlayer';
import { SearchView } from './components/SearchView';
import { WatchlistView } from './components/WatchlistView';
import { CommunityModal } from './components/CommunityModal';
import { ProfileModal } from './components/ProfileModal';
import { Toast } from './components/Toast';

import {
  MEDIA_CATALOG,
  INITIAL_CONTINUE_WATCHING,
} from './data/mockData';
import {
  MediaItem,
  Episode,
  ContinueWatchingItem,
} from './types';
import {
  getStoredWatchlist,
  saveStoredWatchlist,
} from './services/supabase';
import {
  getTmdbTrending,
  getTmdbPopular,
  getTmdbTopRated,
  getTmdbDetail,
  getTmdbSeasonEpisodes,
  getTmdbStatus,
  TmdbStatus,
} from './services/tmdb';
import {
  AppRoute,
  EXTRA_PATHS,
  TAB_PATHS,
  buildTitlePath,
  buildWatchPath,
  isItemTv,
  parseAppRoute,
} from './utils/router';

function stripIdPrefix(raw: string): string {
  return raw.replace(/^tmdb-(movie|tv|series)-/i, '');
}

function findMediaInList(
  list: MediaItem[],
  id: string,
  mediaType: 'movie' | 'tv' | 'auto'
): MediaItem | null {
  const cleanId = stripIdPrefix(id).toLowerCase();
  const rawLower = id.toLowerCase();

  for (const item of list) {
    const itemIsTv = isItemTv(item);
    if (mediaType === 'movie' && itemIsTv) continue;
    if (mediaType === 'tv' && !itemIsTv) continue;

    if (item.id.toLowerCase() === rawLower) return item;
    if (item.tmdbId && String(item.tmdbId) === cleanId) return item;
    if (stripIdPrefix(item.id).toLowerCase() === cleanId) return item;
  }

  return null;
}

export default function App() {
  // Multi-page Router State
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location.pathname, window.location.search)
  );
  const internalNavCountRef = useRef<number>(0);

  // Cache of clicked/resolved items & episodes for instant client transitions without flicker
  const knownItemsRef = useRef<Map<string, MediaItem>>(new Map());
  const selectedEpisodeRef = useRef<{ key: string; episode: Episode } | null>(null);

  // Route-resolved async media state (for direct links & browser reloads)
  const [fetchedRouteMedia, setFetchedRouteMedia] = useState<{
    key: string;
    item: MediaItem;
  } | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeRetryToken, setRouteRetryToken] = useState<number>(0);
  const [resolvedWatchEpisode, setResolvedWatchEpisode] = useState<Episode | undefined>(undefined);

  // Watchlist State (with Supabase / LocalStorage synchronization)
  const [watchlistIds, setWatchlistIds] = useState<string[]>([
    'dune-2',
    'severance',
    'cyberpunk-edgerunners',
    'arcane',
  ]);

  // Continue Watching state
  const [continueWatchingItems, setContinueWatchingItems] = useState<ContinueWatchingItem[]>(() => {
    try {
      const saved = localStorage.getItem('crator_continue_watching');
      return saved ? JSON.parse(saved) : INITIAL_CONTINUE_WATCHING;
    } catch {
      return INITIAL_CONTINUE_WATCHING;
    }
  });

  // Dynamic TMDB data loaded from APIs
  const [, setTmdbStatus] = useState<TmdbStatus | null>(null);
  const [tmdbTrendingItems, setTmdbTrendingItems] = useState<MediaItem[]>([]);
  const [tmdbPopularItems, setTmdbPopularItems] = useState<MediaItem[]>([]);
  const [tmdbTopRatedItems, setTmdbTopRatedItems] = useState<MediaItem[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshingHome, setIsRefreshingHome] = useState<boolean>(false);

  // Sync browser URL -> route on popstate & normalize legacy /mylist alias
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, '') === '/mylist') {
      window.history.replaceState(null, '', `${TAB_PATHS.mylist}${window.location.search}`);
    }

    const handlePopState = () => {
      setRoute(parseAppRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback(
    (
      path: string,
      options?: { replace?: boolean; preserveScroll?: boolean }
    ) => {
      const targetUrl = path.startsWith('/') ? path : `/${path}`;
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (currentUrl !== targetUrl) {
        if (options?.replace) {
          window.history.replaceState(null, '', targetUrl);
        } else {
          window.history.pushState(null, '', targetUrl);
          internalNavCountRef.current += 1;
        }
      }

      const [pathnamePart, searchPart] = targetUrl.split('?');
      setRoute(parseAppRoute(pathnamePart, searchPart ? `?${searchPart}` : ''));

      if (!options?.preserveScroll) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    },
    []
  );

  const goBack = useCallback(
    (fallbackPath: string = TAB_PATHS.home) => {
      if (internalNavCountRef.current > 0) {
        internalNavCountRef.current -= 1;
        window.history.back();
      } else {
        navigate(fallbackPath);
      }
    },
    [navigate]
  );

  const cacheMediaItem = useCallback((item: MediaItem) => {
    const typeKey = isItemTv(item) ? 'tv' : 'movie';
    const numericOrClean = item.tmdbId ? String(item.tmdbId) : stripIdPrefix(item.id);
    knownItemsRef.current.set(`${typeKey}:${numericOrClean.toLowerCase()}`, item);
    knownItemsRef.current.set(`auto:${item.id.toLowerCase()}`, item);
    knownItemsRef.current.set(`auto:${numericOrClean.toLowerCase()}`, item);
  }, []);

  const openDetailsPage = useCallback(
    (item: MediaItem) => {
      cacheMediaItem(item);
      navigate(buildTitlePath(item));
    },
    [cacheMediaItem, navigate]
  );

  // Load watchlist on mount
  useEffect(() => {
    getStoredWatchlist(['dune-2', 'severance', 'cyberpunk-edgerunners', 'arcane']).then((ids) => {
      setWatchlistIds(ids);
    });
  }, []);

  const updateWatchlist = (newIds: string[]) => {
    setWatchlistIds(newIds);
    saveStoredWatchlist(newIds);
  };

  useEffect(() => {
    try {
      localStorage.setItem('crator_continue_watching', JSON.stringify(continueWatchingItems));
    } catch {}
  }, [continueWatchingItems]);

  // Core Home Refresh Engine: Re-queries TMDB live feeds
  const refreshHomePage = async (showNotification = true) => {
    setIsRefreshingHome(true);
    try {
      const tmdbStat = await getTmdbStatus();
      setTmdbStatus(tmdbStat);
      if (tmdbStat.configured || tmdbStat.hasKey) {
        const [trendingRes, popularRes, topRatedRes] = await Promise.allSettled([
          getTmdbTrending(),
          getTmdbPopular('movie'),
          getTmdbTopRated('tv'),
        ]);

        if (trendingRes.status === 'fulfilled' && trendingRes.value.length > 0) {
          setTmdbTrendingItems(trendingRes.value);
        }
        if (popularRes.status === 'fulfilled' && popularRes.value.length > 0) {
          setTmdbPopularItems(popularRes.value);
        }
        if (topRatedRes.status === 'fulfilled' && topRatedRes.value.length > 0) {
          setTmdbTopRatedItems(topRatedRes.value);
        }
      }

      if (showNotification) {
        showToast('Home feeds refreshed');
      }
    } catch (err) {
      console.warn('[CRATOR] Dynamic feeds load error:', err);
      if (showNotification) {
        showToast('Catalog feeds refreshed');
      }
    } finally {
      setIsRefreshingHome(false);
    }
  };

  useEffect(() => {
    refreshHomePage(false);
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3200);
  };

  const toggleWatchlist = (item: MediaItem) => {
    if (watchlistIds.includes(item.id)) {
      const updated = watchlistIds.filter((id) => id !== item.id);
      updateWatchlist(updated);
      showToast(`Removed "${item.title}" from My List`);
    } else {
      const updated = [...watchlistIds, item.id];
      updateWatchlist(updated);
      showToast(`Added "${item.title}" to My List`);
    }
  };

  const isInWatchlist = (id: string) => watchlistIds.includes(id);

  // Unified catalog combining curated entries + live TMDB feeds
  const getMediaKey = (m: MediaItem) =>
    m.tmdbId ? `tmdb:${m.type === 'movie' ? 'movie' : 'tv'}:${m.tmdbId}` : m.id;

  const allCatalogItems = useMemo(() => {
    const map = new Map<string, MediaItem>();
    for (const item of MEDIA_CATALOG) {
      map.set(getMediaKey(item), item);
    }
    for (const item of [...tmdbTrendingItems, ...tmdbPopularItems, ...tmdbTopRatedItems]) {
      const key = getMediaKey(item);
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  }, [tmdbTrendingItems, tmdbPopularItems, tmdbTopRatedItems]);

  // Determine current route key for title / watch pages
  const activeMediaRouteKey =
    route.name === 'title' || route.name === 'watch'
      ? `${route.mediaType}:${stripIdPrefix(route.id).toLowerCase()}`
      : null;

  // Synchronous lookup from catalog / in-memory navigation cache / already-fetched item
  const activeRouteMedia: MediaItem | null = useMemo(() => {
    if (route.name !== 'title' && route.name !== 'watch') return null;

    const cleanId = stripIdPrefix(route.id).toLowerCase();
    const cached =
      knownItemsRef.current.get(`${route.mediaType}:${cleanId}`) ||
      knownItemsRef.current.get(`auto:${route.id.toLowerCase()}`) ||
      knownItemsRef.current.get(`auto:${cleanId}`);

    if (cached) return cached;

    if (fetchedRouteMedia && fetchedRouteMedia.key === activeMediaRouteKey) {
      return fetchedRouteMedia.item;
    }

    return findMediaInList(allCatalogItems, route.id, route.mediaType);
  }, [route, activeMediaRouteKey, fetchedRouteMedia, allCatalogItems]);

  // Fetch missing title from TMDB when landing directly on /movie/:id, /tv/:id, or /watch/...
  useEffect(() => {
    if (route.name !== 'title' && route.name !== 'watch') {
      setIsRouteLoading(false);
      setRouteError(null);
      return;
    }

    if (activeRouteMedia) {
      setIsRouteLoading(false);
      setRouteError(null);
      return;
    }

    let isCancelled = false;
    const targetKey = activeMediaRouteKey!;
    const targetMediaType = route.mediaType;
    const lookupId = stripIdPrefix(route.id);

    setIsRouteLoading(true);
    setRouteError(null);

    async function resolveTitleFromTmdb() {
      let detail: MediaItem | null = null;
      if (targetMediaType === 'auto') {
        detail = await getTmdbDetail('movie', lookupId);
        if (!detail) {
          detail = await getTmdbDetail('tv', lookupId);
        }
      } else {
        detail = await getTmdbDetail(targetMediaType, lookupId);
      }

      if (isCancelled) return;

      if (detail) {
        cacheMediaItem(detail);
        setFetchedRouteMedia({ key: targetKey, item: detail });
        setRouteError(null);
      } else {
        setRouteError('We could not find this title or its metadata is currently unavailable.');
      }
      setIsRouteLoading(false);
    }

    resolveTitleFromTmdb().catch(() => {
      if (isCancelled) return;
      setRouteError('Unable to load title details right now.');
      setIsRouteLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [
    route.name,
    route.name === 'title' || route.name === 'watch' ? route.id : '',
    route.name === 'title' || route.name === 'watch' ? route.mediaType : '',
    activeMediaRouteKey,
    Boolean(activeRouteMedia),
    routeRetryToken,
    cacheMediaItem,
  ]);

  // Resolve active episode for /watch/tv/:id/:season/:episode
  useEffect(() => {
    if (route.name !== 'watch' || route.mediaType !== 'tv' || !activeRouteMedia) {
      setResolvedWatchEpisode(undefined);
      return;
    }

    const seasonNum = route.season || 1;
    const episodeNum = route.episode || 1;
    const epKey = `${activeRouteMedia.id}:${seasonNum}:${episodeNum}`;

    if (selectedEpisodeRef.current?.key === epKey) {
      setResolvedWatchEpisode(selectedEpisodeRef.current.episode);
      return;
    }

    const existingSeason = activeRouteMedia.seasons?.find((s) => s.seasonNumber === seasonNum);
    const existingEp = existingSeason?.episodes?.find((e) => e.episodeNumber === episodeNum);
    if (existingEp) {
      setResolvedWatchEpisode(existingEp);
      return;
    }

    // Set immediate placeholder so VideoPlayer starts without waiting on metadata
    setResolvedWatchEpisode({
      id: `${activeRouteMedia.id}-s${seasonNum}e${episodeNum}`,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      title: `Episode ${episodeNum}`,
      runtime: '45m',
      synopsis: activeRouteMedia.synopsis,
      thumbnail: activeRouteMedia.backdropUrl || activeRouteMedia.posterUrl,
    });

    let isCancelled = false;
    const lookupId = activeRouteMedia.tmdbId || activeRouteMedia.id;
    getTmdbSeasonEpisodes(lookupId, seasonNum)
      .then((episodes) => {
        if (isCancelled || episodes.length === 0) return;
        const match = episodes.find((e) => e.episodeNumber === episodeNum);
        if (match) {
          setResolvedWatchEpisode(match);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [
    route.name,
    route.name === 'watch' ? route.mediaType : '',
    route.name === 'watch' ? route.season : 0,
    route.name === 'watch' ? route.episode : 0,
    activeRouteMedia?.id,
  ]);

  // Dynamic Page Title (<title>)
  useEffect(() => {
    switch (route.name) {
      case 'home':
        document.title = 'CRATOR — Modern Streaming Cinema';
        break;
      case 'movies':
        document.title = 'Movies — CRATOR';
        break;
      case 'tv':
        document.title = 'TV Shows — CRATOR';
        break;
      case 'discover':
        document.title = 'Discover — CRATOR';
        break;
      case 'mylist':
        document.title = 'My List — CRATOR';
        break;
      case 'search':
        document.title = route.query ? `Search: ${route.query} — CRATOR` : 'Search — CRATOR';
        break;
      case 'settings':
        document.title = 'Stream Settings — CRATOR';
        break;
      case 'community':
        document.title = 'Community — CRATOR';
        break;
      case 'title':
        document.title = activeRouteMedia ? `${activeRouteMedia.title} — CRATOR` : 'Title Details — CRATOR';
        break;
      case 'watch':
        document.title = activeRouteMedia ? `Watch ${activeRouteMedia.title} — CRATOR` : 'Watch — CRATOR';
        break;
      case 'notfound':
        document.title = 'Page Not Found — CRATOR';
        break;
    }
  }, [route, activeRouteMedia?.title]);

  // Playback trigger -> pushes Continue Watching entry & navigates to /watch/...
  const handlePlay = useCallback(
    (item: MediaItem, episode?: Episode) => {
      cacheMediaItem(item);
      if (episode) {
        selectedEpisodeRef.current = {
          key: `${item.id}:${episode.seasonNumber}:${episode.episodeNumber}`,
          episode,
        };
      }

      setContinueWatchingItems((prev) => {
        const exists = prev.find((cw) => cw.mediaId === item.id);
        if (exists) {
          return [
            {
              ...exists,
              seasonNumber: episode?.seasonNumber || exists.seasonNumber,
              episodeNumber: episode?.episodeNumber || exists.episodeNumber,
              episodeTitle: episode?.title || exists.episodeTitle,
              lastWatchedTimestamp: Date.now(),
            },
            ...prev.filter((cw) => cw.mediaId !== item.id),
          ];
        }
        return [
          {
            mediaId: item.id,
            progressPercent: 5,
            currentTime: '1m',
            totalDuration: item.runtime || '55m',
            seasonNumber: episode?.seasonNumber,
            episodeNumber: episode?.episodeNumber,
            episodeTitle: episode?.title,
            lastWatchedTimestamp: Date.now(),
          },
          ...prev,
        ];
      });

      navigate(buildWatchPath(item, episode));
    },
    [cacheMediaItem, navigate]
  );

  // Live progress update from VidRift postMessage
  const handlePlayerProgress = (progressData: {
    mediaId: string;
    tmdbId?: number;
    season?: number;
    episode?: number;
    currentTime: number;
    duration: number;
    progressPercent: number;
  }) => {
    setContinueWatchingItems((prev) => {
      const exists = prev.find((cw) => cw.mediaId === progressData.mediaId);
      const currentTimeStr = `${Math.floor(progressData.currentTime / 60)}m`;
      const totalDurationStr = `${Math.floor(progressData.duration / 60)}m`;

      if (exists) {
        return [
          {
            ...exists,
            seasonNumber: progressData.season ?? exists.seasonNumber,
            episodeNumber: progressData.episode ?? exists.episodeNumber,
            currentTime: currentTimeStr,
            totalDuration: totalDurationStr,
            progressPercent: progressData.progressPercent,
            lastWatchedTimestamp: Date.now(),
          },
          ...prev.filter((cw) => cw.mediaId !== progressData.mediaId),
        ];
      }
      return prev;
    });
  };

  // Next episode handler inside Video Player
  const handleNextEpisode = () => {
    if (!activeRouteMedia || !resolvedWatchEpisode || !activeRouteMedia.seasons) return;
    const season = activeRouteMedia.seasons.find(
      (s) => s.seasonNumber === resolvedWatchEpisode.seasonNumber
    );
    if (!season) return;
    const nextEp = season.episodes.find(
      (e) => e.episodeNumber === resolvedWatchEpisode.episodeNumber + 1
    );
    if (nextEp) {
      selectedEpisodeRef.current = {
        key: `${activeRouteMedia.id}:${nextEp.seasonNumber}:${nextEp.episodeNumber}`,
        episode: nextEp,
      };
      setResolvedWatchEpisode(nextEp);
      navigate(buildWatchPath(activeRouteMedia, nextEp), {
        replace: true,
        preserveScroll: true,
      });
      showToast(`Now Playing: Episode ${nextEp.episodeNumber} - "${nextEp.title}"`);
    }
  };

  const hasNextEpisode = useMemo(() => {
    if (!activeRouteMedia || !resolvedWatchEpisode || !activeRouteMedia.seasons) return false;
    const season = activeRouteMedia.seasons.find(
      (s) => s.seasonNumber === resolvedWatchEpisode.seasonNumber
    );
    if (!season) return false;
    return season.episodes.some((e) => e.episodeNumber === resolvedWatchEpisode.episodeNumber + 1);
  }, [activeRouteMedia, resolvedWatchEpisode]);

  const handleRemoveContinueWatching = (mediaId: string) => {
    setContinueWatchingItems((prev) => prev.filter((item) => item.mediaId !== mediaId));
    showToast('Removed from Continue Watching');
  };

  const handleClearContinueWatching = () => {
    setContinueWatchingItems([]);
    showToast('Cleared watch history');
  };

  // Curated & deduplicated datasets for Home sections
  const heroFeaturedItems = useMemo(() => {
    const list = MEDIA_CATALOG.filter((item) => item.featuredInHero);
    return list.length > 0 ? list.slice(0, 5) : MEDIA_CATALOG.slice(0, 5);
  }, []);

  const topTenItems = useMemo(() => {
    const ranked = MEDIA_CATALOG.filter((item) => typeof item.topTenRank === 'number').sort(
      (a, b) => (a.topTenRank || 99) - (b.topTenRank || 99)
    );
    return ranked.length > 0 ? ranked.slice(0, 10) : MEDIA_CATALOG.slice(0, 10);
  }, []);

  const topTenKeys = useMemo(() => new Set(topTenItems.map(getMediaKey)), [topTenItems]);

  const homeTrendingWorldwide = useMemo(() => {
    const live = tmdbTrendingItems.filter((item) => !topTenKeys.has(getMediaKey(item)));
    if (live.length >= 6) return live.slice(0, 14);
    const catalogFallback = MEDIA_CATALOG.filter(
      (item) => item.isTrending && !topTenKeys.has(getMediaKey(item))
    );
    return [...live, ...catalogFallback].slice(0, 14);
  }, [tmdbTrendingItems, topTenKeys]);

  const homePopularMovies = useMemo(() => {
    const seen = new Set<string>([...topTenKeys, ...homeTrendingWorldwide.map(getMediaKey)]);
    const live = tmdbPopularItems.filter((item) => !seen.has(getMediaKey(item)));
    const catalogFallback = MEDIA_CATALOG.filter(
      (item) => item.type === 'movie' && !seen.has(getMediaKey(item))
    );
    const combined = [...live, ...catalogFallback];
    return combined.length > 0
      ? combined.slice(0, 14)
      : MEDIA_CATALOG.filter((item) => item.type === 'movie');
  }, [tmdbPopularItems, topTenKeys, homeTrendingWorldwide]);

  const homeAcclaimedSeries = useMemo(() => {
    const seen = new Set<string>([
      ...topTenKeys,
      ...homeTrendingWorldwide.map(getMediaKey),
      ...homePopularMovies.map(getMediaKey),
    ]);
    const live = tmdbTopRatedItems.filter((item) => !seen.has(getMediaKey(item)));
    const catalogFallback = MEDIA_CATALOG.filter(
      (item) => (item.type === 'series' || item.type === 'anime') && !seen.has(getMediaKey(item))
    );
    const combined = [...live, ...catalogFallback];
    return combined.length > 0
      ? combined.slice(0, 14)
      : MEDIA_CATALOG.filter((item) => item.type === 'series' || item.type === 'anime');
  }, [tmdbTopRatedItems, topTenKeys, homeTrendingWorldwide, homePopularMovies]);

  const freshMovies = useMemo(() => {
    return allCatalogItems.filter((item) => item.type === 'movie');
  }, [allCatalogItems]);

  const popularSeries = useMemo(() => {
    return allCatalogItems.filter((item) => item.type === 'series' || item.type === 'anime');
  }, [allCatalogItems]);

  const modalRelatedItems = useMemo(() => {
    if (!activeRouteMedia) return [];
    return allCatalogItems.filter(
      (m) =>
        m.id !== activeRouteMedia.id &&
        (m.genres.some((g) => activeRouteMedia.genres.includes(g)) ||
          m.type === activeRouteMedia.type)
    );
  }, [activeRouteMedia, allCatalogItems]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(path);
  };

  const renderRouteLoading = (label: string) => (
    <div className="min-h-[82vh] w-full flex flex-col items-center justify-center px-4">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
        <div className="space-y-1">
          <h2 className="font-display font-bold text-lg text-white">{label}</h2>
          <p className="text-xs text-[#9a9ba1] font-mono">Loading title details...</p>
        </div>
        <button
          type="button"
          onClick={() => goBack(TAB_PATHS.home)}
          className="secondary-btn h-9 px-4 rounded-xl text-xs mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>
    </div>
  );

  const renderRouteError = (title: string, message: string, showRetry = true) => (
    <div className="min-h-[82vh] w-full flex flex-col items-center justify-center px-4 pt-20">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center space-y-5">
        <div className="glass-surface w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-white">
          <Film className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display font-bold text-2xl text-white">{title}</h1>
          <p className="text-xs text-[#9a9ba1] leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {showRetry && (
            <button
              type="button"
              onClick={() => setRouteRetryToken((n) => n + 1)}
              className="secondary-btn h-9 px-4 rounded-xl text-xs"
            >
              Retry
            </button>
          )}
          <a
            href={TAB_PATHS.home}
            onClick={(e) => handleLinkClick(e, TAB_PATHS.home)}
            className="primary-btn h-9 px-5 rounded-xl text-xs no-underline"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );

  const hideHeader = route.name === 'title' || route.name === 'watch';
  const hideFooter = route.name === 'watch';

  return (
    <div className="min-h-screen bg-[#040508] text-[#f3f0ea] flex flex-col antialiased selection:bg-white selection:text-black">
      {/* Floating Header */}
      <Header
        activeRoute={route.name}
        isHidden={hideHeader}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content Area — Renders Strictly the Active Page */}
      <main className="flex-1 w-full min-w-0">
        {/* ================================================================= */}
        {/* HOME PAGE (/)                                                     */}
        {/* ================================================================= */}
        {route.name === 'home' && (
          <div className="pb-12">
            <HeroSection
              featuredItems={heroFeaturedItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
            />

            <ContinueWatching
              items={continueWatchingItems}
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onRemove={handleRemoveContinueWatching}
              onClearHistory={handleClearContinueWatching}
            />

            <MediaCarousel
              eyebrow="The week's most watched"
              title="Top 10 Today"
              items={topTenItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
              showRankingNumbers={true}
              isWide={true}
            />

            <NewEpisodes
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
            />

            {homeTrendingWorldwide.length > 0 && (
              <MediaCarousel
                eyebrow="Live worldwide charts"
                title="Trending worldwide"
                items={homeTrendingWorldwide}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={openDetailsPage}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            {homePopularMovies.length > 0 && (
              <MediaCarousel
                eyebrow="Theatrical releases"
                title="Popular movies"
                items={homePopularMovies}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={openDetailsPage}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            {homeAcclaimedSeries.length > 0 && (
              <MediaCarousel
                eyebrow="Critically acclaimed"
                title="Series & anime"
                items={homeAcclaimedSeries}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={openDetailsPage}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            <section className="px-[4.5vw] pt-4">
              <div className="glass-panel glass-hover rounded-2xl px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Full library</p>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                    Filter by genre, year, language &amp; platform
                  </h2>
                </div>
                <a
                  href={TAB_PATHS.discover}
                  onClick={(e) => handleLinkClick(e, TAB_PATHS.discover)}
                  className="primary-btn shrink-0 no-underline"
                >
                  <span>Browse Discover</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* MOVIES PAGE (/movies)                                             */}
        {/* ================================================================= */}
        {route.name === 'movies' && (
          <div className="pt-24 pb-20 space-y-6">
            <MediaCarousel
              eyebrow="Feature films"
              title="Trending movies"
              items={freshMovies.slice(0, 14)}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />

            <ExploreGrid
              initialType="movie"
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TV SHOWS PAGE (/tv)                                               */}
        {/* ================================================================= */}
        {route.name === 'tv' && (
          <div className="pt-24 pb-20 space-y-6">
            <NewEpisodes
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
            />

            <MediaCarousel
              eyebrow="Television masterworks"
              title="Popular series & anime"
              items={popularSeries.slice(0, 14)}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />

            <ExploreGrid
              initialType="series"
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* DISCOVER PAGE (/discover)                                         */}
        {/* ================================================================= */}
        {route.name === 'discover' && (
          <div className="pt-24 pb-20">
            <ExploreGrid
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* MY LIST PAGE (/my-list)                                           */}
        {/* ================================================================= */}
        {route.name === 'mylist' && (
          <div className="pt-24 pb-20">
            <WatchlistView
              watchlistIds={watchlistIds}
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              onClearWatchlist={() => {
                updateWatchlist([]);
                showToast('Cleared all saved items');
              }}
              onExplore={() => navigate(TAB_PATHS.discover)}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SEARCH PAGE (/search?q=...)                                       */}
        {/* ================================================================= */}
        {route.name === 'search' && (
          <div className="pt-24 pb-20">
            <SearchView
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={openDetailsPage}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
              initialQuery={route.query}
              onQueryChange={(nextQuery) => {
                const target = nextQuery
                  ? `${TAB_PATHS.search}?q=${encodeURIComponent(nextQuery)}`
                  : TAB_PATHS.search;
                if (`${window.location.pathname}${window.location.search}` !== target) {
                  navigate(target, { replace: true, preserveScroll: true });
                }
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SETTINGS PAGE (/settings)                                         */}
        {/* ================================================================= */}
        {route.name === 'settings' && (
          <ProfileModal
            standalone={true}
            onClose={() => goBack(TAB_PATHS.home)}
            onShowToast={showToast}
            onRefreshFeeds={() => refreshHomePage(true)}
          />
        )}

        {/* ================================================================= */}
        {/* COMMUNITY PAGE (/community)                                       */}
        {/* ================================================================= */}
        {route.name === 'community' && (
          <CommunityModal
            standalone={true}
            onClose={() => goBack(TAB_PATHS.home)}
            onShowToast={showToast}
          />
        )}

        {/* ================================================================= */}
        {/* TITLE DETAILS PAGE (/movie/:id, /tv/:id)                          */}
        {/* ================================================================= */}
        {route.name === 'title' &&
          (activeRouteMedia ? (
            <DetailModal
              item={activeRouteMedia}
              onClose={() => goBack(TAB_PATHS.home)}
              onPlay={(item, ep) => handlePlay(item, ep)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
              relatedItems={modalRelatedItems}
              onSelectRelated={openDetailsPage}
              onShowToast={showToast}
            />
          ) : isRouteLoading ? (
            renderRouteLoading('Loading Title Details')
          ) : (
            renderRouteError(
              'Title Not Found',
              routeError || 'The requested movie or TV show could not be loaded.'
            )
          ))}

        {/* ================================================================= */}
        {/* WATCH PLAYER PAGE (/watch/:type/:id[/s/e])                        */}
        {/* ================================================================= */}
        {route.name === 'watch' &&
          (activeRouteMedia ? (
            <VideoPlayer
              item={activeRouteMedia}
              episode={resolvedWatchEpisode}
              onClose={() => goBack(buildTitlePath(activeRouteMedia))}
              onViewDetails={openDetailsPage}
              onNextEpisode={handleNextEpisode}
              hasNextEpisode={hasNextEpisode}
              onOpenSettings={() => navigate(EXTRA_PATHS.settings)}
              onProgress={handlePlayerProgress}
              onEpisodeChange={(season, ep) => {
                const mediaType = isItemTv(activeRouteMedia) ? 'tv' : 'movie';
                const rawId = activeRouteMedia.tmdbId
                  ? String(activeRouteMedia.tmdbId)
                  : stripIdPrefix(activeRouteMedia.id);
                if (mediaType === 'tv') {
                  navigate(`/watch/tv/${encodeURIComponent(rawId)}/${season}/${ep}`, {
                    replace: true,
                    preserveScroll: true,
                  });
                }
              }}
            />
          ) : isRouteLoading ? (
            renderRouteLoading('Preparing Stream')
          ) : (
            renderRouteError(
              'Stream Not Available',
              routeError || 'We could not load this stream for playback.'
            )
          ))}

        {/* ================================================================= */}
        {/* 404 NOT FOUND PAGE                                                */}
        {/* ================================================================= */}
        {route.name === 'notfound' &&
          renderRouteError(
            'Page Not Found',
            `No page exists at "${route.pathname}". Choose a destination from the navigation bar or return home.`,
            false
          )}
      </main>

      {/* Site Footer */}
      {!hideFooter && (
        <footer className="site-footer">
          <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <a
                href={TAB_PATHS.home}
                onClick={(e) => handleLinkClick(e, TAB_PATHS.home)}
                className="font-display font-bold text-base text-white tracking-tight no-underline"
              >
                CRATOR
              </a>
              <span className="text-white/20">/</span>
              <span className="text-xs text-[#8e8a91]">4K Ultra HD</span>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-xs text-[#c9c7cc]">
              <a
                href={EXTRA_PATHS.community}
                onClick={(e) => handleLinkClick(e, EXTRA_PATHS.community)}
                className="glass-pill px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer no-underline"
              >
                Telegram Community
              </a>
              <a
                href={EXTRA_PATHS.settings}
                onClick={(e) => handleLinkClick(e, EXTRA_PATHS.settings)}
                className="glass-pill px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer no-underline"
              >
                Stream Settings
              </a>
              <button
                type="button"
                onClick={() => refreshHomePage(true)}
                className="glass-pill px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer"
              >
                {isRefreshingHome ? 'Refreshing...' : 'Refresh Feeds'}
              </button>
            </div>
          </div>

          <div className="w-full pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] text-[#77737a]">
            <p>
              CRATOR does not store any files on our server, we only link to media hosted on 3rd party services.
            </p>
            <p>© {new Date().getFullYear()} CRATOR. All rights reserved.</p>
          </div>
        </footer>
      )}

      {/* Global Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
