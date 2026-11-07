import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Maximize, 
  Minimize, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Info,
  Tv,
  Film
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { 
  resolveVidRiftPlayback, 
  isVidRiftOrigin, 
  sendVidRiftCommand,
  extractTmdbNumericId,
  VidRiftIncomingMessage 
} from '../services/vidrift';

interface VideoPlayerProps {
  item: MediaItem | null;
  episode?: Episode;
  onClose: () => void;
  onViewDetails?: (item: MediaItem) => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  onOpenSettings?: () => void;
  onProgress?: (progressData: {
    mediaId: string;
    tmdbId?: number;
    season?: number;
    episode?: number;
    currentTime: number;
    duration: number;
    progressPercent: number;
  }) => void;
  onEpisodeChange?: (season: number, episode: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  item,
  episode,
  onClose,
  onViewDetails,
  onNextEpisode,
  hasNextEpisode = false,
  onProgress,
  onEpisodeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Current playing season & episode (can be updated dynamically by VidRift's in-player episode selector)
  const [currentSeason, setCurrentSeason] = useState<number>(episode?.seasonNumber ?? 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(episode?.episodeNumber ?? 1);

  // Playback URL & State
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [tmdbNumericId, setTmdbNumericId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastProgress, setLastProgress] = useState<{ currentTime: number; duration: number } | null>(null);

  // Sync state if episode prop changes externally
  useEffect(() => {
    if (episode) {
      setCurrentSeason(episode.seasonNumber);
      setCurrentEpisode(episode.episodeNumber);
    }
  }, [episode?.seasonNumber, episode?.episodeNumber]);

  const isTv = item?.type === 'series' || item?.type === 'anime' || (item?.type as any) === 'tv';

  const titleToDisplay = isTv
    ? `${item?.title} · S${currentSeason}:E${currentEpisode}${episode?.title ? ` "${episode.title}"` : ''}`
    : item?.title || 'CRATOR Streaming';

  // --------------------------------------------------------------------------
  // VidRift Embed Resolution
  // --------------------------------------------------------------------------
  const loadVidRift = useCallback(() => {
    if (!item) return;

    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);

    const result = resolveVidRiftPlayback(item, currentSeason, currentEpisode, {
      brand: 'CRATOR',
      brandColor: 'f3f0ea',
      showTitle: true,
      exit: true,
      autoplay: false,
    });

    if (result.error || !result.embedUrl) {
      setErrorMessage(result.error || 'Could not resolve streaming embed for this title.');
      setErrorCode(result.errorCode || 'VIDRIFT_RESOLUTION_FAILED');
      setIsLoading(false);
      return;
    }

    setEmbedUrl(result.embedUrl);
    setTmdbNumericId(result.tmdbId);
  }, [item, currentSeason, currentEpisode]);

  // Load when item or episode indices change
  useEffect(() => {
    loadVidRift();
  }, [loadVidRift]);

  // --------------------------------------------------------------------------
  // VidRift postMessage Event Listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Strict origin validation - must match https://embed.vidrift.net
      if (!isVidRiftOrigin(event.origin)) {
        return;
      }

      const data = event.data as VidRiftIncomingMessage;
      if (!data || typeof data !== 'object' || !data.type) {
        return;
      }

      switch (data.type) {
        // Playback progress update (sent every 5 seconds while playing)
        case 'vidrift:progress': {
          if (typeof data.currentTime === 'number' && typeof data.duration === 'number') {
            const currentTime = Math.round(data.currentTime);
            const duration = Math.round(data.duration);
            const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

            setLastProgress({ currentTime, duration });

            // Persist to Continue Watching
            if (item) {
              try {
                const storedRaw = localStorage.getItem('crator_continue_watching');
                const list = storedRaw ? JSON.parse(storedRaw) : [];
                const updatedList = [
                  {
                    mediaId: item.id,
                    tmdbId: data.tmdbId || tmdbNumericId || extractTmdbNumericId(item),
                    title: item.title,
                    type: item.type,
                    posterUrl: item.posterUrl,
                    backdropUrl: item.backdropUrl,
                    seasonNumber: data.season ?? (isTv ? currentSeason : undefined),
                    episodeNumber: data.episode ?? (isTv ? currentEpisode : undefined),
                    currentTime: `${Math.floor(currentTime / 60)}m`,
                    totalDuration: `${Math.floor(duration / 60)}m`,
                    progressPercent,
                    lastWatchedTimestamp: Date.now(),
                  },
                  ...list.filter((cw: any) => cw.mediaId !== item.id),
                ];
                localStorage.setItem('crator_continue_watching', JSON.stringify(updatedList));
              } catch (err) {
                console.warn('[VidRift] Continue watching storage error:', err);
              }

              if (onProgress) {
                onProgress({
                  mediaId: item.id,
                  tmdbId: data.tmdbId,
                  season: data.season,
                  episode: data.episode,
                  currentTime,
                  duration,
                  progressPercent,
                });
              }
            }
          }
          break;
        }

        // Viewer selected an episode in VidRift's in-player menu or Up Next moved on
        case 'vidrift:episode': {
          if (data.season && data.episode) {
            setCurrentSeason(data.season);
            setCurrentEpisode(data.episode);
            if (onEpisodeChange) {
              onEpisodeChange(data.season, data.episode);
            }
          }
          break;
        }

        // Playback ended
        case 'vidrift:ended': {
          if (item) {
            try {
              const storedRaw = localStorage.getItem('crator_continue_watching');
              const list = storedRaw ? JSON.parse(storedRaw) : [];
              const updated = list.map((cw: any) =>
                cw.mediaId === item.id ? { ...cw, progressPercent: 100, lastWatchedTimestamp: Date.now() } : cw
              );
              localStorage.setItem('crator_continue_watching', JSON.stringify(updated));
            } catch {}
          }
          break;
        }

        // Viewer clicked Exit button inside VidRift player
        case 'vidrift:exit': {
          onClose();
          break;
        }

        // Next episode play request from Up Next countdown
        case 'vidrift:nextup-play': {
          if (hasNextEpisode && onNextEpisode) {
            onNextEpisode();
          }
          break;
        }

        // Fullscreen toggle event if fs=parent is configured
        case 'vidrift:fullscreen': {
          if (data.on) {
            containerRef.current?.requestFullscreen().catch(() => {});
          } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item, isTv, currentSeason, currentEpisode, tmdbNumericId, onClose, onNextEpisode, hasNextEpisode, onProgress, onEpisodeChange]);

  // Fullscreen change synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (iframeRef.current?.contentWindow) {
        sendVidRiftCommand(iframeRef.current.contentWindow, {
          type: 'vidrift:fullscreen-state',
          on: active,
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* 1. VidRift Embedded Player */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {embedUrl && !errorMessage && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={titleToDisplay}
            className="w-full h-full border-0 bg-black"
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
        )}
      </div>

      {/* 2. Loading Overlay */}
      {isLoading && !errorMessage && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3.5 z-40 pointer-events-none">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="text-[#f3f0ea] font-semibold text-sm">
              Connecting to VidRift Stream
            </h3>
            <p className="text-xs text-[#8e8a91] font-mono">Title: {item.title}</p>
          </div>
        </div>
      )}

      {/* 3. Error Overlay */}
      {errorMessage && !isLoading && (
        <div className="absolute inset-0 bg-[#0e0d11] flex flex-col items-center justify-center p-6 z-40 text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center shadow-2xl text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-xl md:text-2xl text-[#f3f0ea]">
              Playback Unavailable
            </h2>
            <p className="text-sm font-medium text-[#beb9bc]">
              {errorMessage}
            </p>
            {errorCode && (
              <span className="inline-block px-2.5 py-1 rounded bg-black/50 border border-white/10 text-[11px] font-mono text-[#8e8a91]">
                Code: {errorCode}
              </span>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button
              onClick={loadVidRift}
              className="primary-btn h-10 px-5 text-xs rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Playback</span>
            </button>

            {onViewDetails && item && (
              <button
                onClick={() => onViewDetails(item)}
                className="secondary-btn h-10 px-4 text-xs rounded-xl"
              >
                <Info className="w-4 h-4 text-[#beb9bc]" />
                <span>Details & Episodes</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="secondary-btn h-10 px-4 text-xs rounded-xl"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      )}

      {/* 4. Top Header Bar */}
      <div 
        className="absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/95 via-black/40 to-transparent flex items-center justify-between z-30 pointer-events-auto transition-opacity duration-300"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-white hover:text-black text-white border border-white/10 transition-colors cursor-pointer"
            aria-label="Back to title"
            title="Exit player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-display font-bold text-base md:text-lg text-[#f3f0ea] truncate max-w-xs sm:max-w-md md:max-w-xl">
              {titleToDisplay}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#beb9bc]">
              <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[11px] text-[#f3f0ea] border border-white/15">
                VidRift 4K Ultra HD
              </span>
              {tmdbNumericId && (
                <span className="text-[11px] font-mono text-[#8e8a91] hidden sm:inline">
                  TMDB: {tmdbNumericId}
                </span>
              )}
              {isTv && (
                <span className="text-[11px] font-mono text-[#8e8a91] hidden sm:inline">
                  Season {currentSeason} · Episode {currentEpisode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Right: Fullscreen & Details */}
        <div className="flex items-center gap-2.5">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(item)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-white hover:text-black text-[#beb9bc] text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              title="View Details"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/60 hover:bg-white hover:text-black text-[#f3f0ea] border border-white/10 transition-colors cursor-pointer"
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
