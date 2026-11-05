import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sidebar, 
  NavTab 
} from './components/Sidebar';
import { AnnouncementBar } from './components/AnnouncementBar';
import { HeroSection } from './components/HeroSection';
import { MediaCarousel } from './components/MediaCarousel';
import { ContinueWatching } from './components/ContinueWatching';
import { NewEpisodes } from './components/NewEpisodes';
import { ExploreGrid } from './components/ExploreGrid';
import { DetailModal } from './components/DetailModal';
import { VideoPlayer } from './components/VideoPlayer';
import { SearchView } from './components/SearchView';
import { WatchlistView } from './components/WatchlistView';
import { PlatformsView } from './components/PlatformsView';
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
  StreamingPlatform, 
  ContinueWatchingItem 
} from './types';
import { 
  getMovieBoxHomeRows, 
  getMovieBoxRowSubjects, 
  getMovieBoxConfigStatus,
  MovieBoxStatus 
} from './services/moviebox';
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
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedPlatform, setSelectedPlatform] = useState<StreamingPlatform>('Netflix');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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

  // Dynamic MovieBox & TMDB data loaded from APIs
  const [dynamicMovieBoxRows, setDynamicMovieBoxRows] = useState<Array<{ title: string; items: MediaItem[] }>>([]);
  const [movieBoxStatus, setMovieBoxStatus] = useState<MovieBoxStatus | null>(null);
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

  // Load live TMDB trending & MovieBox homepage rows on mount
  useEffect(() => {
    let isCancelled = false;

    async function loadLiveFeeds() {
      // 1. Check & Load TMDB Live Discovery Feeds
      try {
        const tmdbStat = await getTmdbStatus();
        if (!isCancelled) setTmdbStatus(tmdbStat);
        if (tmdbStat.configured || tmdbStat.hasKey) {
          const [trendingRes, popularRes, topRatedRes] = await Promise.allSettled([
            getTmdbTrending(),
            getTmdbPopular('movie'),
            getTmdbTopRated('tv')
          ]);

          if (!isCancelled) {
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
        }
      } catch (err) {
        console.warn('[CRATOR] TMDB discovery feeds load error:', err);
      }

      // 2. Check & Load MovieBox Homepage
      try {
        const status = await getMovieBoxConfigStatus();
        if (isCancelled) return;
        setMovieBoxStatus(status);

        if (status.hasSecret && status.isVerified) {
          const rows = await getMovieBoxHomeRows();
          if (isCancelled || !rows || rows.length === 0) return;

          // Fetch subjects for first 3 discovered rows dynamically
          const loadedRows: Array<{ title: string; items: MediaItem[] }> = [];
          for (const row of rows.slice(0, 3)) {
            const items = await getMovieBoxRowSubjects(row.opId);
            if (items && items.length > 0) {
              loadedRows.push({ title: row.title, items });
            }
          }

          if (!isCancelled && loadedRows.length > 0) {
            setDynamicMovieBoxRows(loadedRows);
          }
        }
      } catch (err) {
        console.warn('[CRATOR] Dynamic MovieBox rows load error:', err);
      }
    }

    loadLiveFeeds();

    return () => {
      isCancelled = true;
    };
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
      showToast(`Removed "${item.title}" from Watchlist`);
    } else {
      const updated = [...watchlistIds, item.id];
      updateWatchlist(updated);
      showToast(`Added "${item.title}" to Watchlist`);
    }
  };

  const isInWatchlist = (id: string) => watchlistIds.includes(id);

  // Playback trigger
  const handlePlay = (item: MediaItem, episode?: Episode) => {
    setPlayingMedia(item);
    setPlayingEpisode(episode);

    // Update or add to continue watching
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
          progressPercent: 15,
          currentTime: '18m',
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

  // Platform selection handler
  const handleSelectPlatform = (platform: StreamingPlatform) => {
    setSelectedPlatform(platform);
    setCurrentTab('platform');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Curated datasets for sections
  const heroFeaturedItems = useMemo(() => {
    return MEDIA_CATALOG.filter((item) => item.featuredInHero).slice(0, 5);
  }, []);

  const topTenItems = useMemo(() => {
    return MEDIA_CATALOG.filter((item) => typeof item.topTenRank === 'number')
      .sort((a, b) => (a.topTenRank || 99) - (b.topTenRank || 99));
  }, []);

  const freshMovies = useMemo(() => {
    return MEDIA_CATALOG.filter((item) => item.type === 'movie' && item.isFresh);
  }, []);

  const popularSeries = useMemo(() => {
    return MEDIA_CATALOG.filter((item) => (item.type === 'series' || item.type === 'anime') && item.isPopularSeries);
  }, []);

  // Related items for modal
  const modalRelatedItems = useMemo(() => {
    if (!selectedMedia) return [];
    return MEDIA_CATALOG.filter(
      (m) => m.id !== selectedMedia.id && (m.genres.some((g) => selectedMedia.genres.includes(g)) || m.type === selectedMedia.type)
    );
  }, [selectedMedia]);

  return (
    <div className="min-h-screen bg-[#08060D] text-white flex flex-col antialiased selection:bg-purple-600 selection:text-white">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={handleSelectPlatform}
        watchlistCount={watchlistIds.length}
        onOpenCommunity={() => setCommunityModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0 pb-20 lg:pb-12 pt-16 lg:pt-0">
        {/* Top Dismissible Announcement Bar */}
        <AnnouncementBar onJoinCommunity={() => setCommunityModalOpen(true)} />

        {/* Dynamic Page Views */}
        <main className="flex-1 w-full">
          {/* HOME VIEW */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              {/* Hero Section */}
              <HeroSection
                featuredItems={heroFeaturedItems}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />

              {/* TMDB Live Trending Carousel (When TMDB is connected) */}
              {tmdbTrendingItems.length > 0 && (
                <MediaCarousel
                  title="Trending Worldwide (TMDB Live)"
                  subtitle="Live global cinema and television sensations powered by The Movie Database"
                  items={tmdbTrendingItems}
                  onPlay={(item) => handlePlay(item)}
                  onOpenDetails={(item) => setSelectedMedia(item)}
                  onToggleWatchlist={toggleWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              )}

              {/* TMDB Live Popular Cinema */}
              {tmdbPopularItems.length > 0 && (
                <MediaCarousel
                  title="Popular Cinema (TMDB Live)"
                  subtitle="Most popular theatrical releases from The Movie Database"
                  items={tmdbPopularItems}
                  onPlay={(item) => handlePlay(item)}
                  onOpenDetails={(item) => setSelectedMedia(item)}
                  onToggleWatchlist={toggleWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              )}

              {/* TMDB Live Top Rated Television */}
              {tmdbTopRatedItems.length > 0 && (
                <MediaCarousel
                  title="Top Rated Series (TMDB Live)"
                  subtitle="Critically acclaimed television masterpieces rated by global audiences"
                  items={tmdbTopRatedItems}
                  onPlay={(item) => handlePlay(item)}
                  onOpenDetails={(item) => setSelectedMedia(item)}
                  onToggleWatchlist={toggleWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              )}

              {/* Dynamic MovieBox API Rows (when loaded from Cloudflare worker) */}
              {dynamicMovieBoxRows.map((row, rIdx) => (
                <MediaCarousel
                  key={`mb-row-${rIdx}`}
                  title={row.title}
                  subtitle="Live streaming row from MovieBox Cloudflare Worker"
                  items={row.items}
                  onPlay={(item) => handlePlay(item)}
                  onOpenDetails={(item) => setSelectedMedia(item)}
                  onToggleWatchlist={toggleWatchlist}
                  isInWatchlist={isInWatchlist}
                />
              ))}

              {/* Top 10 This Week Carousel */}
              <MediaCarousel
                title="Top 10 This Week"
                subtitle="The most-watched movies and series worldwide right now"
                items={topTenItems}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
                showRankingNumbers={true}
              />

              {/* Continue Watching Section */}
              <ContinueWatching
                items={continueWatchingItems}
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onRemove={handleRemoveContinueWatching}
              />

              {/* New Episodes Section */}
              <NewEpisodes
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
              />

              {/* Fresh Movies Carousel */}
              <MediaCarousel
                title="Fresh Movies"
                subtitle="Newly added films in 4K HDR and Dolby Atmos"
                items={freshMovies}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />

              {/* Popular Series Carousel */}
              <MediaCarousel
                title="Popular Series & Anime"
                subtitle="Binge-worthy shows trending across all major networks"
                items={popularSeries}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />

              {/* Explore Everything Grid with multi-filters */}
              <ExploreGrid
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            </div>
          )}

          {/* MOVIES HUB VIEW */}
          {currentTab === 'movies' && (
            <div className="space-y-6 pt-2">
              <div className="px-4 md:px-8 pt-4">
                <h1 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight">
                  Movies Hub
                </h1>
                <p className="text-xs text-purple-200/60 mt-1">
                  Blockbuster cinema, indie masterpieces, and festival gems in pristine 4K Ultra HD
                </p>
              </div>

              <MediaCarousel
                title="Trending Movies"
                subtitle="Top feature films dominating watchlists this week"
                items={MEDIA_CATALOG.filter((m) => m.type === 'movie')}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />

              <ExploreGrid
                initialType="movie"
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            </div>
          )}

          {/* SERIES HUB VIEW */}
          {currentTab === 'series' && (
            <div className="space-y-6 pt-2">
              <div className="px-4 md:px-8 pt-4">
                <h1 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight">
                  Series Hub
                </h1>
                <p className="text-xs text-purple-200/60 mt-1">
                  Peak TV dramas, mystery thrillers, and award-winning limited series
                </p>
              </div>

              <NewEpisodes
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
              />

              <ExploreGrid
                initialType="series"
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            </div>
          )}

          {/* ANIME HUB VIEW */}
          {currentTab === 'anime' && (
            <div className="space-y-6 pt-2">
              <div className="px-4 md:px-8 pt-4">
                <h1 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight flex items-center gap-2">
                  <span>Anime & Simulcasts</span>
                </h1>
                <p className="text-xs text-purple-200/60 mt-1">
                  Direct from Tokyo studios: Shonen, Cyberpunk, Dark Fantasy, and Isekai with English subs & dubs
                </p>
              </div>

              <MediaCarousel
                title="Top Rated Anime"
                items={MEDIA_CATALOG.filter((m) => m.type === 'anime')}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />

              <ExploreGrid
                initialType="anime"
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            </div>
          )}

          {/* SEARCH VIEW */}
          {currentTab === 'search' && (
            <SearchView
              mediaCatalog={MEDIA_CATALOG}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          )}

          {/* WATCHLIST VIEW */}
          {currentTab === 'watchlist' && (
            <WatchlistView
              watchlistIds={watchlistIds}
              mediaCatalog={MEDIA_CATALOG}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              onClearWatchlist={() => {
                updateWatchlist([]);
                showToast('Cleared all items from Watchlist');
              }}
              onExplore={() => setCurrentTab('home')}
            />
          )}

          {/* EXPLORE VIEW */}
          {currentTab === 'explore' && (
            <div className="pt-4">
              <ExploreGrid
                mediaCatalog={MEDIA_CATALOG}
                onPlay={(item) => handlePlay(item)}
                onOpenDetails={(item) => setSelectedMedia(item)}
                onToggleWatchlist={toggleWatchlist}
                isInWatchlist={isInWatchlist}
              />
            </div>
          )}

          {/* PLATFORMS HUB VIEW */}
          {currentTab === 'platform' && (
            <PlatformsView
              platform={selectedPlatform}
              mediaCatalog={MEDIA_CATALOG}
              onSelectPlatform={(p) => setSelectedPlatform(p)}
              onPlay={(item) => handlePlay(item)}
              onOpenDetails={(item) => setSelectedMedia(item)}
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="mt-16 px-4 md:px-8 py-8 border-t border-purple-950/40 text-xs text-purple-300/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm text-purple-400">CRATOR</span>
            <span>·</span>
            <span>Powered by TMDB 4K Metadata & MovieBox Streaming Engine</span>
          </div>
          <div className="flex items-center gap-4 text-purple-400/60">
            <button 
              onClick={() => setCommunityModalOpen(true)}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Telegram Community
            </button>
            <span>·</span>
            <button 
              onClick={() => setProfileModalOpen(true)}
              className="hover:text-purple-300 transition-colors cursor-pointer"
            >
              Stream Settings
            </button>
            <span>·</span>
            <span>4K HDR Dolby Vision</span>
          </div>
        </footer>
      </div>

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
      />

      {/* Global Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
