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
  Info
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { getMovieBoxStream, StreamOption } from '../services/moviebox';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Start muted to comply with browser autoplay policies
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Streaming & Quality State
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');
  const [streamOptions, setStreamOptions] = useState<StreamOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamErrorCode, setStreamErrorCode] = useState<string | null>(null);
  const [resolvedSubjectId, setResolvedSubjectId] = useState<string | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState<string | null>(null);

  // Audio & Subtitles
  const [selectedAudio, setSelectedAudio] = useState<string>('English [Original]');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('English [CC]');
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'speed' | 'quality'>('none');

  const titleToDisplay = episode 
    ? `${item?.title} · S${episode.seasonNumber}:E${episode.episodeNumber} "${episode.title}"`
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

  // Fetch verified stream URL from MovieBox API for this exact title
  const resolveStream = async () => {
    if (!item) return;

    setIsLoadingStream(true);
    setStreamError(null);
    setStreamErrorCode(null);
    setActiveStreamUrl('');
    setStreamOptions([]);

    const seasonNum = episode?.seasonNumber ?? 0;
    const episodeNum = episode?.episodeNumber ?? 0;

    try {
      // Strictly resolve stream for this movie's subject
      const result = await getMovieBoxStream(item.id, seasonNum, episodeNum, item.title);

      if (result.error || !result.streamUrl) {
        console.warn(`[CRATOR Player] Stream resolution failed for "${item.title}":`, result.error);
        
        // Stop playback completely. NEVER use sample cartoon or unrelated title video.
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        }
        setIsPlaying(false);
        setActiveStreamUrl('');
        setStreamOptions([]);
        setStreamError(result.error || 'MovieBox API returned no stream URL for this title.');
        setStreamErrorCode(result.errorCode || 'STREAM_UNAVAILABLE');
        setResolvedSubjectId(result.subjectId || null);
        return;
      }

      // Valid stream returned for this exact movie
      setResolvedSubjectId(result.subjectId || item.id);
      setResolvedTitle(result.resolvedTitle || item.title);
      setActiveStreamUrl(result.streamUrl);
      const options = result.streams && result.streams.length > 0 
        ? result.streams 
        : [{ url: result.streamUrl, quality: 'Auto', format: result.format || 'mp4' }];
      setStreamOptions(options);
      setSelectedQuality(options[0].quality || 'Auto');
      setStreamError(null);
    } catch (err: any) {
      console.error('[CRATOR Player] Exception during stream resolution:', err);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      setIsPlaying(false);
      setActiveStreamUrl('');
      setStreamOptions([]);
      setStreamError(err.message || 'Failed to communicate with stream backend');
      setStreamErrorCode('STREAM_FETCH_EXCEPTION');
    } finally {
      setIsLoadingStream(false);
    }
  };

  useEffect(() => {
    resolveStream();
  }, [item?.id, episode?.seasonNumber, episode?.episodeNumber]);

  // Attach video source with HLS.js or native HTML5
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeStreamUrl) return;

    // Destroy existing HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = activeStreamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Network error, attempting reload...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media decode error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal unrecoverable playback error:', data);
              hls.destroy();
              // Try alternate quality stream for the SAME movie if available
              const nextOption = streamOptions.find((opt) => opt.url !== activeStreamUrl);
              if (nextOption) {
                console.log('[CRATOR Player] Switching to alternate stream option for same movie:', nextOption.quality);
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
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = activeStreamUrl;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else {
      // Direct MP4 / WebM
      video.src = activeStreamUrl;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStreamUrl]);

  // Video error handler for native HTML5 video errors
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
    console.warn('[CRATOR Player] Video element error:', errorDetail, mediaError?.message || '');

    // Check if alternate stream option exists for THIS movie
    const altOption = streamOptions.find((opt) => opt.url !== activeStreamUrl);
    if (altOption) {
      console.log('[CRATOR Player] Retrying with alternate stream quality for same title:', altOption.quality);
      setActiveStreamUrl(altOption.url);
      setSelectedQuality(altOption.quality);
      return;
    }

    // Stop playback and report actual error. Never play an unrelated cartoon!
    setIsPlaying(false);
    setStreamError(`Stream playback error: ${errorDetail}.`);
    setStreamErrorCode(`MEDIA_ERR_${mediaError?.code || 'UNKNOWN'}`);
  };

  const togglePlay = () => {
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
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

  const handleQualityChange = (opt: StreamOption) => {
    setSelectedQuality(opt.quality);
    setActiveStreamUrl(opt.url);
    setActiveMenu('none');
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveMenu('none');
  };

  // Autohide controls logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && activeMenu === 'none') {
        setShowControls(false);
      }
    }, 3500);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        handleSkip(10);
      } else if (e.key === 'ArrowLeft') {
        handleSkip(-10);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, duration]);

  if (!item) return null;

  const isAuthError = streamErrorCode === 'WORKER_AUTH_401' || (streamError && streamError.includes('401'));

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Element */}
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

      {/* Loading Overlay */}
      {isLoadingStream && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3.5 z-40">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="text-white font-semibold text-sm">Resolving Stream from MovieBox API</h3>
            <p className="text-xs text-purple-300/70 font-mono">Title: {item.title}</p>
          </div>
        </div>
      )}

      {/* Dedicated Playback Error Screen - NO CARTOONS, NO FAKE STREAMS */}
      {streamError && !isLoadingStream && (
        <div className="absolute inset-0 bg-[#0B0714] flex flex-col items-center justify-center p-6 z-40 text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center shadow-2xl text-rose-400">
            {isAuthError ? <ShieldAlert className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-xl md:text-2xl text-white">
              Playback Unavailable
            </h2>
            <p className="text-sm font-medium text-purple-200">
              {titleToDisplay}
            </p>
          </div>

          {/* Diagnostic Details */}
          <div className="w-full p-4 rounded-xl bg-[#140E24] border border-purple-900/40 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-purple-400 font-mono">
              <span>Status: {streamErrorCode || 'STREAM_UNAVAILABLE'}</span>
              <span>Provider: Upstream MovieBox</span>
            </div>
            <p className="text-purple-200/90 leading-relaxed font-sans">
              {streamError}
            </p>
            <div className="pt-2 border-t border-purple-900/30 text-[11px] text-purple-300/70 space-y-1 font-sans">
              <p>
                Title metadata, synopsis, cast, and episode counts remain fully available. Upstream media files are currently unprovisioned or restricted by the provider.
              </p>
            </div>
            {isAuthError && (
              <div className="pt-2 border-t border-purple-900/30 text-[11px] text-purple-300/70 space-y-1 font-sans">
                <p>
                  The Cloudflare Worker at <code className="text-purple-300 font-mono">https://spun-moviebox.ravi-crator.workers.dev</code> requires a matching <code className="text-purple-300 font-mono">X-Worker-Secret</code> header.
                </p>
                <p className="text-amber-300/90">
                  Ensure the secret entered on this server matches the secret deployed on your Cloudflare Worker.
                </p>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
            <button
              onClick={() => resolveStream()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-purple-950/80 cursor-pointer"
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
                <span>View Details & Episodes</span>
              </button>
            )}

            {isAuthError && onOpenSettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D1433] hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span>Configure Worker Secret</span>
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

      {/* Top Header Bar */}
      <div 
        className={`absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls && activeStreamUrl && !streamError ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
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
            <h2 className="font-display font-bold text-base md:text-lg text-white truncate max-w-md md:max-w-xl">
              {titleToDisplay}
            </h2>
            <div className="flex items-center gap-2 text-xs text-purple-300/80">
              <span className="font-mono bg-purple-950/60 px-1.5 py-0.5 rounded text-[11px] text-purple-300 border border-purple-500/20">
                {selectedQuality}
              </span>
              {resolvedSubjectId && (
                <span className="text-[11px] font-mono text-purple-400/60">
                  ID: {resolvedSubjectId}
                </span>
              )}
              <span>·</span>
              <span>{item.platform}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Subtitles Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'audio' ? 'none' : 'audio')}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                activeMenu === 'audio' ? 'bg-purple-600 text-white' : 'bg-black/60 text-purple-200 hover:text-white border border-white/10'
              }`}
              title="Audio & Subtitles"
            >
              <Subtitles className="w-5 h-5" />
            </button>

            {activeMenu === 'audio' && (
              <div className="absolute right-0 top-12 w-64 bg-[#140E24] border border-purple-900/50 rounded-2xl p-3 shadow-2xl space-y-3 z-50 text-xs">
                <div>
                  <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] block mb-1.5">Audio Track</span>
                  {['English [Original] (Dolby Atmos)', 'Spanish (Latin America)', 'French'].map((aud) => (
                    <button
                      key={aud}
                      onClick={() => { setSelectedAudio(aud); setActiveMenu('none'); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-900/40 text-purple-200 hover:text-white transition-colors"
                    >
                      <span className="truncate">{aud}</span>
                      {selectedAudio === aud && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-purple-900/40 pt-2">
                  <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] block mb-1.5">Subtitles</span>
                  {['English [CC]', 'Spanish', 'French', 'Off'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => { setSelectedSubtitle(sub); setActiveMenu('none'); }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-900/40 text-purple-200 hover:text-white transition-colors"
                    >
                      <span>{sub}</span>
                      {selectedSubtitle === sub && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings / Quality / Speed Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'quality' ? 'none' : 'quality')}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                activeMenu === 'quality' ? 'bg-purple-600 text-white' : 'bg-black/60 text-purple-200 hover:text-white border border-white/10'
              }`}
              title="Stream Quality & Speed"
            >
              <Settings className="w-5 h-5" />
            </button>

            {activeMenu === 'quality' && (
              <div className="absolute right-0 top-12 w-64 bg-[#140E24] border border-purple-900/50 rounded-2xl p-3 shadow-2xl space-y-3 z-50 text-xs">
                <div>
                  <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] block mb-1.5">Playback Speed</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.75, 1, 1.25, 1.5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`p-1.5 rounded-lg text-center transition-colors ${
                          playbackSpeed === spd ? 'bg-purple-600 text-white font-bold' : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/40'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-purple-900/40 pt-2">
                  <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] block mb-1.5">Stream Quality</span>
                  <div className="space-y-1">
                    {streamOptions.map((opt) => (
                      <button
                        key={opt.url}
                        onClick={() => handleQualityChange(opt)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-900/40 text-purple-200 hover:text-white transition-colors"
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-white">{opt.quality}</span>
                          <span className="text-[10px] text-purple-400 uppercase">{opt.format}</span>
                        </div>
                        {selectedQuality === opt.quality && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-3 z-30 transition-opacity duration-300 ${
          showControls && activeStreamUrl && !streamError ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Scrubber Bar */}
        <div className="relative w-full flex items-center group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
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
              onClick={() => handleSkip(-10)}
              className="p-2 rounded-lg text-purple-200 hover:text-white transition-colors cursor-pointer"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleSkip(10)}
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

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-purple-200 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="text-xs font-mono text-purple-200/80">
              <span>{formatTime(currentTime)}</span>
              <span className="text-purple-400/50 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-purple-200 hover:text-white transition-colors cursor-pointer"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
