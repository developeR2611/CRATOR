import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Maximize, 
  Minimize, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Info,
  Server,
  Check,
  ChevronDown
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { 
  resolveVidRiftPlayback, 
  isVidRiftOrigin, 
  sendVidRiftCommand,
  extractTmdbNumericId,
  VidRiftIncomingMessage,
  VidRiftStateEvent,
  VidRiftServerEntry
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
  const [playerState, setPlayerState] = useState<VidRiftStateEvent | null>(null);
  const [reportedServers, setReportedServers] = useState<VidRiftServerEntry[]>([]);
  const [activeServer, setActiveServer] = useState<string>('');
  const [isServerMenuOpen, setIsServerMenuOpen] = useState<boolean>(false);
  const [commandHint, setCommandHint] = useState<string | null>(null);
  const serverMenuRef = useRef<HTMLDivElement>(null);
  const hasReceivedStateRef = useRef<boolean>(false);
  const stateRetryTimerRef = useRef<number | null>(null);
  const hintTimerRef = useRef<number | null>(null);

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

  const clearStateRetryTimer = useCallback(() => {
    if (stateRetryTimerRef.current !== null) {
      window.clearTimeout(stateRetryTimerRef.current);
      stateRetryTimerRef.current = null;
    }
  }, []);

  const showTemporaryHint = useCallback((msg: string) => {
    setCommandHint(msg);
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setCommandHint(null);
      hintTimerRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      clearStateRetryTimer();
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
  }, [clearStateRetryTimer]);

  // --------------------------------------------------------------------------
  // Embed Resolution
  // --------------------------------------------------------------------------
  const loadVidRift = useCallback(() => {
    if (!item) return;

    clearStateRetryTimer();
    hasReceivedStateRef.current = false;
    setPlayerState(null);
    setReportedServers([]);
    setActiveServer('');
    setIsServerMenuOpen(false);
    setCommandHint(null);
    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);

    const result = resolveVidRiftPlayback(item, currentSeason, currentEpisode, {
      brand: 'CRATOR',
      brandColor: 'f3f0ea',
      showTitle: true,
      exit: true,
      autoplay: true,
    });

    if (result.error || !result.embedUrl) {
      setErrorMessage(result.error || 'Could not resolve playback stream for this title.');
      setErrorCode(result.errorCode || 'STREAM_UNAVAILABLE');
      setIsLoading(false);
      return;
    }

    setEmbedUrl(result.embedUrl);
    setTmdbNumericId(result.tmdbId);
  }, [item, currentSeason, currentEpisode, clearStateRetryTimer]);

  // Load when item or episode indices change
  useEffect(() => {
    loadVidRift();
  }, [loadVidRift]);

  // Auto-dismiss loading indicator after short delay to allow immediate interaction with player
  useEffect(() => {
    if (isLoading && embedUrl) {
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, embedUrl]);

  const requestPlayerState = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    sendVidRiftCommand(win, { type: 'vidrift:get-state' });
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    requestPlayerState();
    clearStateRetryTimer();
    // Retry once if deferred player script had not attached its message listener at onLoad time
    stateRetryTimerRef.current = window.setTimeout(() => {
      if (!hasReceivedStateRef.current) {
        requestPlayerState();
      }
      stateRetryTimerRef.current = null;
    }, 650);
  }, [requestPlayerState, clearStateRetryTimer]);

  // Close server dropdown on outside click
  useEffect(() => {
    if (!isServerMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(e.target as Node)) {
        setIsServerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isServerMenuOpen]);

  // --------------------------------------------------------------------------
  // Cross-Origin postMessage Event Listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Strict origin and source validation
      if (!isVidRiftOrigin(event.origin)) {
        return;
      }
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const data = event.data as VidRiftIncomingMessage;
      if (!data || typeof data !== 'object' || !data.type) {
        return;
      }

      switch (data.type) {
        // Complete state snapshot & live change stream (servers, sources, qualities, audio, subtitles)
        case 'vidrift:state': {
          hasReceivedStateRef.current = true;
          clearStateRetryTimer();
          setPlayerState(data);
          if (Array.isArray(data.servers)) {
            setReportedServers(data.servers);
          }
          if (typeof data.server === 'string') {
            setActiveServer(data.server);
          }
          break;
        }

        // Immediate server list updates during provider initialization or automatic failover
        case 'vidrift:providers': {
          if (Array.isArray(data.providers)) {
            setReportedServers(data.providers);
          }
          if (typeof data.current === 'string') {
            setActiveServer(data.current);
          }
          break;
        }

        // Command feedback (e.g., first click inside player required before remote switching)
        case 'vidrift:command-error': {
          if (data.reason === 'click-required') {
            showTemporaryHint('Click inside the player once to enable external switching, or switch inside the player menu.');
          } else if (data.reason === 'invalid' || data.reason === 'unavailable' || data.reason === 'not-ready') {
            showTemporaryHint(
              data.field
                ? `Selected ${data.field} is currently unavailable.`
                : 'That playback action is currently unavailable.'
            );
          }
          break;
        }

        case 'vidrift:wont-play':
        case 'vidrift:unreleased': {
          setIsLoading(false);
          break;
        }

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
  }, [item, isTv, currentSeason, currentEpisode, tmdbNumericId, onClose, onNextEpisode, hasNextEpisode, onProgress, onEpisodeChange, clearStateRetryTimer, showTemporaryHint]);

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
        if (isServerMenuOpen) {
          setIsServerMenuOpen(false);
          return;
        }
        if (!document.fullscreenElement) {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isServerMenuOpen]);

  if (!item) return null;

  const servers = playerState?.servers?.length ? playerState.servers : reportedServers;
  const currentServerValue = playerState?.server || activeServer;
  const currentServerEntry = servers.find((s) => s.value === currentServerValue);
  const currentQualityLabel = (() => {
    if (!playerState?.quality) return null;
    if (playerState.quality === 'auto') return 'Auto';
    const matched = playerState.qualities?.find((q) => q.value === playerState.quality);
    return matched?.label || playerState.quality;
  })();

  const handleSelectServer = (serverValue: string) => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      sendVidRiftCommand(win, { type: 'vidrift:set', server: serverValue });
    }
    setIsServerMenuOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-[100dvh] w-full z-50 bg-black flex items-center justify-center select-none overflow-hidden overscroll-none"
    >
      {/* 1. Embedded Player */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {embedUrl && !errorMessage && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={titleToDisplay}
            className="w-full h-full border-0 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={handleIframeLoad}
          />
        )}
      </div>

      {/* 2. Loading Overlay */}
      {isLoading && !errorMessage && (
        <div className="glass-backdrop absolute inset-0 flex flex-col items-center justify-center p-4 z-40 pointer-events-none">
          <div className="glass-panel rounded-2xl px-8 py-6 flex flex-col items-center gap-3.5 text-center">
            <Loader2 className="w-9 h-9 text-white animate-spin" />
            <div className="space-y-1">
              <h3 className="text-[#f3f0ea] font-semibold text-sm">
                Loading Stream
              </h3>
              <p className="text-xs text-[#9a9ba1] font-mono">Title: {item.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Error Overlay */}
      {errorMessage && !isLoading && (
        <div className="glass-backdrop absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 z-40 overflow-y-auto">
          <div className="glass-panel my-auto rounded-2xl p-5 sm:p-8 text-center max-w-xl w-full space-y-4 sm:space-y-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-950/60 border border-rose-400/40 flex items-center justify-center shadow-2xl text-rose-300 mx-auto">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-bold text-xl md:text-2xl text-[#f3f0ea]">
                Playback Unavailable
              </h2>
              <p className="text-sm font-medium text-[#c9c7cc]">
                {errorMessage}
              </p>
              {errorCode && (
                <span className="glass-badge inline-block px-3 py-1 rounded-full text-[11px] font-mono text-[#c9c7cc]">
                  Code: {errorCode}
                </span>
              )}
            </div>

            {/* Action CTAs */}
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={loadVidRift}
                className="primary-btn min-h-[44px] sm:min-h-0 sm:h-10 px-5 text-xs rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Playback</span>
              </button>

              {onViewDetails && item && (
                <button
                  type="button"
                  onClick={() => onViewDetails(item)}
                  className="secondary-btn min-h-[44px] sm:min-h-0 sm:h-10 px-4 text-xs rounded-xl"
                >
                  <Info className="w-4 h-4 text-[#c9c7cc]" />
                  <span>Details & Episodes</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="secondary-btn min-h-[44px] sm:min-h-0 sm:h-10 px-4 text-xs rounded-xl"
              >
                Back to Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Top Header Bar */}
      <div 
        className="glass-overlay-bar absolute top-0 left-0 right-0 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-3 md:p-6 flex items-center justify-between gap-2.5 sm:gap-3 z-30 pointer-events-auto transition-opacity duration-300"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="glass-control w-11 h-11 sm:w-auto sm:h-auto sm:p-2.5 flex items-center justify-center rounded-full text-white cursor-pointer shrink-0"
            aria-label="Back to title"
            title="Exit player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-sm sm:text-base md:text-lg text-[#f3f0ea] truncate sm:max-w-md md:max-w-xl">
              {titleToDisplay}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#c9c7cc]">
              <span className="glass-badge font-mono px-2 py-0.5 rounded-full text-[11px] text-[#f3f0ea]">
                4K Ultra HD
              </span>
              {isTv && (
                <>
                  <span className="text-[11px] font-mono text-[#9a9ba1] sm:hidden">
                    S{currentSeason}·E{currentEpisode}
                  </span>
                  <span className="text-[11px] font-mono text-[#9a9ba1] hidden sm:inline">
                    Season {currentSeason} · Episode {currentEpisode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Right: Live Server Selector & Details Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {servers.length > 0 && (
            <div ref={serverMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsServerMenuOpen((prev) => !prev)}
                aria-expanded={isServerMenuOpen}
                aria-haspopup="listbox"
                className="glass-pill flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-2.5 sm:px-3.5 py-2 rounded-full text-[#f3f0ea] text-xs font-semibold cursor-pointer"
                title="Switch streaming server"
              >
                <Server className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[78px] sm:max-w-[120px] truncate">
                  {currentServerEntry?.label || 'Servers'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-75 transition-transform duration-150 ${isServerMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isServerMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Streaming servers"
                  className="glass-panel absolute right-0 mt-2 w-56 max-h-[60dvh] overflow-y-auto rounded-2xl p-1.5 shadow-2xl z-50"
                >
                  <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#9a9ba1]">
                    <span>Servers ({servers.length})</span>
                    {currentQualityLabel && <span>{currentQualityLabel}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {servers.map((srv) => {
                      const isActive = srv.value === currentServerValue;
                      const isFailed = srv.state === 'failed';
                      return (
                        <button
                          key={srv.value}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelectServer(srv.value)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-white/15 text-[#f3f0ea] font-semibold'
                              : isFailed
                                ? 'text-[#9a9ba1] hover:bg-white/5'
                                : 'text-[#c9c7cc] hover:bg-white/10 hover:text-[#f3f0ea]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{srv.label}</span>
                            {isFailed && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 shrink-0">
                                Down
                              </span>
                            )}
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#f3f0ea] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {onViewDetails && (
            <button
              type="button"
              onClick={() => onViewDetails(item)}
              className="glass-pill flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-2.5 sm:px-3.5 py-2 rounded-full text-[#f3f0ea] text-xs font-semibold cursor-pointer"
              title="View Details"
              aria-label="View Details"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden min-[400px]:inline">Details</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Non-intrusive playback command hint (e.g. click-required or unavailable server) */}
      {commandHint && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 max-w-[90vw] pointer-events-none">
          <div className="glass-panel rounded-full px-4 py-2 text-xs text-[#f3f0ea] text-center shadow-xl">
            {commandHint}
          </div>
        </div>
      )}
    </div>
  );
};
