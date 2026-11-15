import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Header, NavTab } from './components/Header';
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
  INITIAL_CONTINUE_WATCHING 
} from './data/mockData';
import { 
  MediaItem, 
  Episode, 
  ContinueWatchingItem 
} from './types';
import { 
  getStoredWatchlist, 
  saveStoredWatchlist 
} from './services/supabase';
import { 
  getTmdbTrending, 
  getTmdbPopular,
  getTmdbTopRated,
  getTmdbStatus, 
  TmdbStatus 
} from './services/tmdb';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Watchlist State (with Supabase / LocalStorage synchronization)
  const [watchlistIds, setWatchlistIds] = useState<string[]>(['dune-2', 'severance', 'cyberpunk-edgerunners', 'arcane']);

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
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus | null>(null);
  const [tmdbTrendingItems, setTmdbTrendingItems] = useState<MediaItem[]>([]);
  const [tmdbPopularItems, setTmdbPopularItems] = useState<MediaItem[]>([]);
  const [tmdbTopRatedItems, setTmdbTopRatedItems] = useState<MediaItem[]>([]);

  // Active Modals & Overlays
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [playingMedia, setPlayingMedia] = useState<MediaItem | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<Episode | undefined>(undefined);
  const [communityModalOpen, setCommunityModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshingHome, setIsRefreshingHome] = useState<boolean>(false);

  // Load watchlist on mount
  useEffect(() => {
    getStoredWatchlist(['dune-2', 'severance', 'cyberpunk-edgerunners', 'arcane']).then((ids) => {
      setWatchlistIds(ids);
    });
  }, []);

  // Save watchlist when updated
  const updateWatchlist = (newIds: string[]) => {
    setWatchlistIds(newIds);
    saveStoredWatchlist(newIds);
  };

  // Save continue watching
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

  // Load feeds on mount
  useEffect(() => {
    refreshHomePage(false);
  }, []);

  // Toast auto-clear
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3200);
  };

  // Watchlist toggle handler
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

  // Playback trigger
  const handlePlay = (item: MediaItem, episode?: Episode) => {
    setPlayingMedia(item);
    setPlayingEpisode(episode);

    // Initial item touch in continue watching
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
  };

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
    if (!playingMedia || !playingEpisode || !playingMedia.seasons) return;
    const season = playingMedia.seasons.find((s) => s.seasonNumber === playingEpisode.seasonNumber);
    if (!season) return;
    const nextEp = season.episodes.find((e) => e.episodeNumber === playingEpisode.episodeNumber + 1);
    if (nextEp) {
      setPlayingEpisode(nextEp);
      showToast(`Now Playing: Episode ${nextEp.episodeNumber} - "${nextEp.title}"`);
    }
  };

  const hasNextEpisode = useMemo(() => {
    if (!playingMedia || !playingEpisode || !playingMedia.seasons) return false;
    const season = playingMedia.seasons.find((s) => s.seasonNumber === playingEpisode.seasonNumber);
    if (!season) return false;
    return season.episodes.some((e) => e.episodeNumber === playingEpisode.episodeNumber + 1);
  }, [playingMedia, playingEpisode]);

  const handleRemoveContinueWatching = (mediaId: string) => {
    setContinueWatchingItems((prev) => prev.filter((item) => item.mediaId !== mediaId));
    showToast('Removed from Continue Watching');
  };

  const handleClearContinueWatching = () => {
    setContinueWatchingItems([]);
    showToast('Cleared watch history');
  };

  // Helper to deduplicate media lists by tmdbId or id
  const getMediaKey = (m: MediaItem) => (m.tmdbId ? `tmdb:${m.type === 'movie' ? 'movie' : 'tv'}:${m.tmdbId}` : m.id);

  // Unified catalog combining curated entries + live TMDB feeds for Watchlist, Continue Watching, and Browse tabs
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

  // Curated & deduplicated datasets for Home sections (no repeating the same titles across rows)
  const heroFeaturedItems = useMemo(() => {
    const list = MEDIA_CATALOG.filter((item) => item.featuredInHero);
    return list.length > 0 ? list.slice(0, 5) : MEDIA_CATALOG.slice(0, 5);
  }, []);

  const topTenItems = useMemo(() => {
    const ranked = MEDIA_CATALOG.filter((item) => typeof item.topTenRank === 'number')
      .sort((a, b) => (a.topTenRank || 99) - (b.topTenRank || 99));
    return ranked.length > 0 ? ranked.slice(0, 10) : MEDIA_CATALOG.slice(0, 10);
  }, []);

  const topTenKeys = useMemo(() => new Set(topTenItems.map(getMediaKey)), [topTenItems]);

  const homeTrendingWorldwide = useMemo(() => {
    const live = tmdbTrendingItems.filter((item) => !topTenKeys.has(getMediaKey(item)));
    if (live.length >= 6) return live.slice(0, 14);
    const catalogFallback = MEDIA_CATALOG.filter((item) => item.isTrending && !topTenKeys.has(getMediaKey(item)));
    return [...live, ...catalogFallback].slice(0, 14);
  }, [tmdbTrendingItems, topTenKeys]);

  const homePopularMovies = useMemo(() => {
    const seen = new Set<string>([...topTenKeys, ...homeTrendingWorldwide.map(getMediaKey)]);
    const live = tmdbPopularItems.filter((item) => !seen.has(getMediaKey(item)));
    const catalogFallback = MEDIA_CATALOG.filter((item) => item.type === 'movie' && !seen.has(getMediaKey(item)));
    const combined = [...live, ...catalogFallback];
    return combined.length > 0 ? combined.slice(0, 14) : MEDIA_CATALOG.filter((item) => item.type === 'movie');
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

  // Related items for modal
  const modalRelatedItems = useMemo(() => {
    if (!selectedMedia) return [];
    return allCatalogItems.filter(
      (m) => m.id !== selectedMedia.id && (m.genres.some((g) => selectedMedia.genres.includes(g)) || m.type === selectedMedia.type)
    );
  }, [selectedMedia, allCatalogItems]);

  return (
    <div className="min-h-screen bg-[#040508] text-[#f3f0ea] flex flex-col antialiased selection:bg-white selection:text-black">
      {/* Floating Header */}
      <Header
        activeTab={activeTab}
        isHidden={Boolean(selectedMedia || playingMedia)}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSearch={() => {
          setActiveTab('search');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSettings={() => setProfileModalOpen(true)}
        onOpenDiscord={() => setCommunityModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0">
        {/* ================================================================= */}
        {/* HOME VIEW: Clean, Non-Redundant Editorial Flow                    */}
        {/* ================================================================= */}
        {activeTab === 'home' && (
          <div className="pb-12">
            {/* 1. Cinematic Hero Spotlight */}
            <HeroSection
              featuredItems={heroFeaturedItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
            />

            {/* 2. Continue Watching (if active) */}
            <ContinueWatching
              items={continueWatchingItems}
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onRemove={handleRemoveContinueWatching}
              onClearHistory={handleClearContinueWatching}
            />

            {/* 3. Top 10 Today (Unique #1-#10 ranked showcase) */}
            <MediaCarousel
              eyebrow="The week's most watched"
              title="Top 10 Today"
              items={topTenItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
              showRankingNumbers={true}
              isWide={true}
            />

            {/* 4. Latest Series Episode Drops */}
            <NewEpisodes
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
            />

            {/* 5. Global Trending (Deduplicated against Top 10) */}
            {homeTrendingWorldwide.length > 0 && (
              <MediaCarousel
                eyebrow="Live worldwide charts"
                title="Trending worldwide"
                items={homeTrendingWorldwide}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            {/* 6. Popular Cinema (Deduplicated Movies) */}
            {homePopularMovies.length > 0 && (
              <MediaCarousel
                eyebrow="Theatrical releases"
                title="Popular movies"
                items={homePopularMovies}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            {/* 7. Critically Acclaimed Series & Anime (Deduplicated) */}
            {homeAcclaimedSeries.length > 0 && (
              <MediaCarousel
                eyebrow="Critically acclaimed"
                title="Series & anime"
                items={homeAcclaimedSeries}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            )}

            {/* Clean CTA to Browse Full Library (replaces redundant inline Discover grid dump) */}
            <section className="px-[4.5vw] pt-4">
              <div className="glass-panel glass-hover rounded-2xl px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Full library</p>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                    Filter by genre, year, language & platform
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('discover');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="primary-btn shrink-0"
                >
                  <span>Browse Discover</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* MOVIES TAB                                                        */}
        {/* ================================================================= */}
        {activeTab === 'movies' && (
          <div className="pt-24 pb-20 space-y-6">
            <MediaCarousel
              eyebrow="Feature films"
              title="Trending movies"
              items={freshMovies.slice(0, 14)}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />

            <ExploreGrid
              initialType="movie"
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TV TAB                                                            */}
        {/* ================================================================= */}
        {activeTab === 'tv' && (
          <div className="pt-24 pb-20 space-y-6">
            <NewEpisodes
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
            />

            <MediaCarousel
              eyebrow="Television masterworks"
              title="Popular series & anime"
              items={popularSeries.slice(0, 14)}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />

            <ExploreGrid
              initialType="series"
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* DISCOVER TAB                                                      */}
        {/* ================================================================= */}
        {activeTab === 'discover' && (
          <div className="pt-24 pb-20">
            <ExploreGrid
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* MY LIST TAB                                                       */}
        {/* ================================================================= */}
        {activeTab === 'mylist' && (
          <div className="pt-24 pb-20">
            <WatchlistView
              watchlistIds={watchlistIds}
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              onClearWatchlist={() => {
                updateWatchlist([]);
                showToast('Cleared all saved items');
              }}
              onExplore={() => {
                setActiveTab('discover');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* SEARCH TAB                                                        */}
        {/* ================================================================= */}
        {activeTab === ('search' as NavTab) && (
          <div className="pt-24 pb-20">
            <SearchView
              mediaCatalog={allCatalogItems}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          </div>
        )}
      </main>

      {/* 7movies Clean Site Footer */}
      <footer className="site-footer">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-base text-white tracking-tight">CRATOR</span>
            <span className="text-white/20">/</span>
            <span className="text-xs text-[#8e8a91]">VidRift 4K Ultra HD</span>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs text-[#c9c7cc]">
            <button 
              type="button"
              onClick={() => setCommunityModalOpen(true)}
              className="glass-pill px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer"
            >
              Telegram Community
            </button>
            <button 
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="glass-pill px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer"
            >
              Stream Settings
            </button>
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
          <p>© {new Date().getFullYear()} CRATOR. Powered by VidRift & The Movie Database.</p>
        </div>
      </footer>

      {/* Cinematic Detail Modal */}
      {selectedMedia && (
        <DetailModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlay={(item, ep) => {
            setSelectedMedia(null);
            handlePlay(item, ep);
          }}
          onToggleWatchlist={toggleWatchlist}
          isInWatchlist={isInWatchlist}
          relatedItems={modalRelatedItems}
          onSelectRelated={(item) => setSelectedMedia(item)}
          onShowToast={showToast}
        />
      )}

      {/* Cinematic Fullscreen Video Player */}
      {playingMedia && (
        <VideoPlayer
          item={playingMedia}
          episode={playingEpisode}
          onClose={() => {
            setPlayingMedia(null);
            setPlayingEpisode(undefined);
          }}
          onViewDetails={(item) => {
            setPlayingMedia(null);
            setPlayingEpisode(undefined);
            setSelectedMedia(item);
          }}
          onNextEpisode={handleNextEpisode}
          hasNextEpisode={hasNextEpisode}
          onOpenSettings={() => {
            setPlayingMedia(null);
            setProfileModalOpen(true);
          }}
          onProgress={handlePlayerProgress}
        />
      )}

      {/* Community / Telegram Modal */}
      <CommunityModal
        isOpen={communityModalOpen}
        onClose={() => setCommunityModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Profile / Preferences Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onShowToast={showToast}
        onRefreshFeeds={() => refreshHomePage(true)}
      />

      {/* Global Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
