import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  X, 
  SkipForward, 
  Settings, 
  Subtitles, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  KeyRound,
  ShieldAlert,
  Info,
  Tv,
  Film,
  Sparkles,
  Server
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { getMovieBoxStream, StreamOption } from '../services/moviebox';
import { 
  resolveCineSrcPlayback, 
  CINESRC_BASE_ORIGIN, 
  sendCineSrcCommand,
  isCineSrcOrigin 
} from '../services/providers/cinesrc';
import { PlaybackProviderId } from '../services/providers/types';

interface VideoPlayerProps {
  item: MediaItem | null;
  episode?: Episode;
  onClose: () => void;
  onViewDetails?: (item: MediaItem) => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  onOpenSettings?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  item,
  episode,
  onClose,
  onViewDetails,
  onNextEpisode,
  hasNextEpisode = false,
  onOpenSettings,
}) => {
  // Provider Selection: CineSRC is Primary by default
  const [selectedProvider, setSelectedProvider] = useState<PlaybackProviderId>('cinesrc');

  // Video Element & Containers
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // CineSRC Embed State
  const [cineSrcEmbedUrl, setCineSrcEmbedUrl] = useState<string>('');
  const [cineSrcTmdbId, setCineSrcTmdbId] = useState<number | string | null>(null);

  // MovieBox Direct Stream State
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');
  const [streamOptions, setStreamOptions] = useState<StreamOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [resolvedSubjectId, setResolvedSubjectId] = useState<string | null>(null);

  // Common Loading & Error States
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamErrorCode, setStreamErrorCode] = useState<string | null>(null);

  // Audio & Subtitles (MovieBox mode)
  const [selectedAudio, setSelectedAudio] = useState<string>('English [Original]');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('English [CC]');
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'speed' | 'quality'>('none');

  const seasonNum = episode?.seasonNumber ?? 1;
  const episodeNum = episode?.episodeNumber ?? 1;

  const titleToDisplay = episode 
    ? `${item?.title} · S${seasonNum}:E${episodeNum} "${episode.title}"`
    : item?.title || 'CRATOR Streaming';

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------
  // 1. CineSRC Primary Resolution
  // --------------------------------------------------------------------------
  const resolveCineSrc = async () => {
    if (!item) return;

    setIsLoadingStream(true);
    setStreamError(null);
    setStreamErrorCode(null);

    try {
      const result = await resolveCineSrcPlayback(item, seasonNum, episodeNum);

      if (result.error || !result.embedUrl) {
        setStreamError(result.error || 'CineSRC could not resolve embed URL for this title.');
        setStreamErrorCode(result.errorCode || 'CINESRC_RESOLUTION_FAILED');
        setIsLoadingStream(false);
        return;
      }

      setCineSrcEmbedUrl(result.embedUrl);
      setCineSrcTmdbId(result.tmdbId || null);
      // Let iframe load event or cinesrc:ready set isLoadingStream to false
    } catch (err: any) {
      setStreamError(err.message || 'Failed to initialize CineSRC player');
      setStreamErrorCode('CINESRC_INIT_EXCEPTION');
      setIsLoadingStream(false);
    }
  };

  // --------------------------------------------------------------------------
  // 2. MovieBox Alternative Resolution
  // --------------------------------------------------------------------------
  const resolveMovieBox = async () => {
    if (!item) return;

    setIsLoadingStream(true);
    setStreamError(null);
    setStreamErrorCode(null);
    setActiveStreamUrl('');
    setStreamOptions([]);

    const sNum = episode?.seasonNumber ?? 0;
    const eNum = episode?.episodeNumber ?? 0;

    try {
      const result = await getMovieBoxStream(item.id, sNum, eNum, item.title);

      if (result.error || !result.streamUrl) {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
        setIsPlaying(false);
        setActiveStreamUrl('');
        setStreamOptions([]);
        setStreamError(result.error || 'MovieBox API returned no stream URL for this title.');
        setStreamErrorCode(result.errorCode || 'MOVIEBOX_UNAVAILABLE');
        setResolvedSubjectId(result.subjectId || null);
        return;
      }

      setResolvedSubjectId(result.subjectId || item.id);
      setActiveStreamUrl(result.streamUrl);
      const options = result.streams && result.streams.length > 0 
        ? result.streams 
        : [{ url: result.streamUrl, quality: 'Auto', format: result.format || 'mp4' }];
      setStreamOptions(options);
      setSelectedQuality(options[0].quality || 'Auto');
      setStreamError(null);
    } catch (err: any) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      setIsPlaying(false);
      setActiveStreamUrl('');
      setStreamOptions([]);
      setStreamError(err.message || 'Failed to communicate with MovieBox backend');
      setStreamErrorCode('MOVIEBOX_FETCH_EXCEPTION');
    } finally {
      setIsLoadingStream(false);
    }
  };

  // Switch or resolve when provider, item, or episode changes
  useEffect(() => {
    if (selectedProvider === 'cinesrc') {
      resolveCineSrc();
    } else {
      resolveMovieBox();
    }
  }, [selectedProvider, item?.id, seasonNum, episodeNum]);

  // --------------------------------------------------------------------------
  // 3. CineSRC postMessage Event Listener (Security: Strict Origin Check)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (selectedProvider !== 'cinesrc') return;

    const handleMessage = (event: MessageEvent) => {
      // Validate origin strictly
      if (!isCineSrcOrigin(event.origin)) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
        return;
      }

      switch (data.type) {
        case 'cinesrc:ready':
          setIsLoadingStream(false);
          setStreamError(null);
          break;

        case 'cinesrc:play':
          setIsPlaying(true);
          setIsLoadingStream(false);
          break;

        case 'cinesrc:pause':
          setIsPlaying(false);
          break;

        case 'cinesrc:loadedmetadata':
          if (typeof data.duration === 'number') {
            setDuration(data.duration);
          }
          setIsLoadingStream(false);
          break;

        case 'cinesrc:timeupdate':
          if (typeof data.currentTime === 'number') {
            setCurrentTime(data.currentTime);
          }
          if (typeof data.duration === 'number' && data.duration > 0) {
            setDuration(data.duration);
          }
          break;

        case 'cinesrc:nextepisode':
          if (hasNextEpisode && onNextEpisode && !data.internalNavigation) {
            onNextEpisode();
          }
          break;

        case 'cinesrc:close':
          onClose();
          break;

        case 'cinesrc:error':
          setIsLoadingStream(false);
          setStreamError(data.error || 'CineSRC player reported a playback error.');
          setStreamErrorCode('CINESRC_EMBED_ERROR');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [selectedProvider, hasNextEpisode, onNextEpisode, onClose]);

  // --------------------------------------------------------------------------
  // 4. MovieBox Video Element & HLS Attachment (Alternative mode)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (selectedProvider !== 'moviebox') return;
    const video = videoRef.current;
    if (!video || !activeStreamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeStreamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              const nextOption = streamOptions.find((opt) => opt.url !== activeStreamUrl);
              if (nextOption) {
                setActiveStreamUrl(nextOption.url);
                setSelectedQuality(nextOption.quality);
              } else {
                setStreamError('The stream source could not be decoded in this browser environment.');
                setStreamErrorCode('CODEC_OR_NETWORK_ERROR');
                setIsPlaying(false);
              }
              break;
          }
        }
      });
    } else {
      video.src = activeStreamUrl;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedProvider, activeStreamUrl]);

  const handleVideoError = () => {
    const video = videoRef.current;
    const mediaError = video?.error;
    let errorDetail = 'Unknown media error';
    if (mediaError) {
      switch (mediaError.code) {
        case 1: errorDetail = 'Playback aborted by user'; break;
        case 2: errorDetail = 'Network connection interrupted'; break;
        case 3: errorDetail = 'Video decode error'; break;
        case 4: errorDetail = 'Video format or CORS restriction blocked by browser'; break;
      }
    }

    const altOption = streamOptions.find((opt) => opt.url !== activeStreamUrl);
    if (altOption) {
      setActiveStreamUrl(altOption.url);
      setSelectedQuality(altOption.quality);
      return;
    }

    setIsPlaying(false);
    setStreamError(`Stream playback error: ${errorDetail}.`);
    setStreamErrorCode(`MEDIA_ERR_${mediaError?.code || 'UNKNOWN'}`);
  };

  const togglePlay = () => {
    if (selectedProvider === 'cinesrc' && iframeRef.current?.contentWindow) {
      sendCineSrcCommand(iframeRef.current.contentWindow, isPlaying ? 'pause' : 'play');
      setIsPlaying(!isPlaying);
      return;
    }

    if (!videoRef.current || !activeStreamUrl) return;
    if (videoRef.current.paused) {
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!item) return null;

  const isAuthError = streamErrorCode === 'WORKER_AUTH_401' || (streamError && streamError.includes('401'));

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* 1. CineSRC Primary Iframe Player */}
      {selectedProvider === 'cinesrc' && (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {cineSrcEmbedUrl && !streamError && (
            <iframe
              ref={iframeRef}
              src={cineSrcEmbedUrl}
              title={titleToDisplay}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoadingStream(false)}
            />
          )}
        </div>
      )}

      {/* 2. MovieBox Direct Video Player */}
      {selectedProvider === 'moviebox' && (
        <video
          ref={videoRef}
          playsInline
          muted={isMuted}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              videoRef.current.playbackRate = playbackSpeed;
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (hasNextEpisode && onNextEpisode) {
              onNextEpisode();
            }
          }}
          onError={handleVideoError}
          onClick={togglePlay}
          className={`w-full h-full object-contain cursor-pointer ${
            !activeStreamUrl || streamError ? 'hidden' : 'block'
          }`}
        />
      )}

      {/* Loading Overlay */}
      {isLoadingStream && !streamError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3.5 z-40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="text-white font-semibold text-sm">
              Connecting to {selectedProvider === 'cinesrc' ? 'CineSRC 4K Stream' : 'MovieBox Stream'}
            </h3>
            <p className="text-xs text-purple-300/70 font-mono">Title: {item.title}</p>
          </div>
        </div>
      )}

      {/* Dedicated Playback Error Screen with Provider Switching CTA */}
      {streamError && !isLoadingStream && (
        <div className="absolute inset-0 bg-[#0B0714] flex flex-col items-center justify-center p-6 z-40 text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center shadow-2xl text-rose-400">
            {isAuthError ? <ShieldAlert className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-xl md:text-2xl text-white">
              Playback Unavailable on {selectedProvider === 'cinesrc' ? 'CineSRC' : 'MovieBox'}
            </h2>
            <p className="text-sm font-medium text-purple-200">
              {titleToDisplay}
            </p>
          </div>

          {/* Diagnostic Details */}
          <div className="w-full p-4 rounded-xl bg-[#140E24] border border-purple-900/40 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-purple-400 font-mono">
              <span>Status: {streamErrorCode || 'STREAM_UNAVAILABLE'}</span>
              <span>Provider: {selectedProvider === 'cinesrc' ? 'CineSRC (Primary)' : 'MovieBox (Alternative)'}</span>
            </div>
            <p className="text-purple-200/90 leading-relaxed font-sans">
              {streamError}
            </p>
            <div className="pt-2 border-t border-purple-900/30 text-[11px] text-purple-300/70 space-y-1 font-sans">
              <p>
                Title metadata, synopsis, cast, and episode counts remain fully available.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
            {/* Primary Provider Fallback Switcher */}
            {selectedProvider === 'cinesrc' ? (
              <button
                onClick={() => {
                  setSelectedProvider('moviebox');
                  setStreamError(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-950/80 cursor-pointer"
              >
                <Server className="w-4 h-4" />
                <span>Try MovieBox Alternative</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedProvider('cinesrc');
                  setStreamError(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-950/80 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Switch to CineSRC (Primary)</span>
              </button>
            )}

            <button
              onClick={() => {
                if (selectedProvider === 'cinesrc') resolveCineSrc();
                else resolveMovieBox();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D1433] hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Stream</span>
            </button>

            {onViewDetails && item && (
              <button
                onClick={() => onViewDetails(item)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4 text-purple-400" />
                <span>Details & Episodes</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-black/60 hover:bg-black text-purple-300 hover:text-white border border-purple-900/30 text-xs font-medium transition-colors cursor-pointer"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar & Clean Provider Switcher */}
      <div 
        className="absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/95 via-black/50 to-transparent flex items-center justify-between z-30 pointer-events-auto"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-black text-white border border-white/10 transition-colors cursor-pointer"
            aria-label="Back to title"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-display font-bold text-base md:text-lg text-white truncate max-w-xs sm:max-w-md md:max-w-xl">
              {titleToDisplay}
            </h2>
            <div className="flex items-center gap-2 text-xs text-purple-300/80">
              <span className="font-mono bg-purple-950/60 px-1.5 py-0.5 rounded text-[11px] text-purple-300 border border-purple-500/20">
                {selectedProvider === 'cinesrc' ? 'CineSRC 4K HDR' : selectedQuality}
              </span>
              {cineSrcTmdbId && selectedProvider === 'cinesrc' && (
                <span className="text-[11px] font-mono text-purple-400/60 hidden sm:inline">
                  TMDB: {cineSrcTmdbId}
                </span>
              )}
              {resolvedSubjectId && selectedProvider === 'moviebox' && (
                <span className="text-[11px] font-mono text-purple-400/60 hidden sm:inline">
                  MB: {resolvedSubjectId}
                </span>
              )}
              <span>·</span>
              <span>{item.platform}</span>
            </div>
          </div>
        </div>

        {/* Top Right: Provider Selector & Fullscreen */}
        <div className="flex items-center gap-2.5">
          {/* Stream Provider Switcher Pill */}
          <div className="flex items-center p-1 rounded-xl bg-black/80 border border-purple-900/60 backdrop-blur-md shadow-lg">
            <button
              onClick={() => {
                if (selectedProvider !== 'cinesrc') {
                  setSelectedProvider('cinesrc');
                  setStreamError(null);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedProvider === 'cinesrc'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="CineSRC Embed Player (Primary 4K Provider)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CineSRC</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-purple-950/80 border border-purple-400/30 text-purple-200">
                Primary
              </span>
            </button>

            <button
              onClick={() => {
                if (selectedProvider !== 'moviebox') {
                  setSelectedProvider('moviebox');
                  setStreamError(null);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedProvider === 'moviebox'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="MovieBox Direct MP4 Stream (Alternative Provider)"
            >
              <Server className="w-3.5 h-3.5 text-purple-300" />
              <span>MovieBox</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-purple-950/80 border border-purple-400/30 text-purple-200">
                Alt
              </span>
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-black/60 hover:bg-black text-purple-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Controls Bar for MovieBox Direct Stream */}
      {selectedProvider === 'moviebox' && activeStreamUrl && !streamError && (
        <div 
          className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-3 z-30"
        >
          {/* Progress Scrubber Bar */}
          <div className="relative w-full flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (videoRef.current) {
                  videoRef.current.currentTime = val;
                  setCurrentTime(val);
                }
              }}
              className="w-full h-1.5 group-hover:h-2.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 transition-all"
            />
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg text-white hover:text-purple-300 transition-colors cursor-pointer"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10);
                }}
                className="p-2 rounded-lg text-purple-200 hover:text-white transition-colors cursor-pointer"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.min(duration, currentTime + 10);
                }}
                className="p-2 rounded-lg text-purple-200 hover:text-white transition-colors cursor-pointer"
                title="Forward 10 seconds"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {hasNextEpisode && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                  <span className="hidden sm:inline">Next Episode</span>
                </button>
              )}

              <div className="text-xs font-mono text-purple-200/80">
                <span>{formatTime(currentTime)}</span>
                <span className="text-purple-400/50 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
