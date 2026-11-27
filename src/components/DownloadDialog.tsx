import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  HardDrive,
  Info,
  Layers,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { MediaItem } from '../types';
import type {
  DownloadJob,
  DownloadMediaType,
  DownloadQualityOption,
  DownloadSourcesResponse,
  EpisodeDownloadSource,
} from '../types/downloads';
import {
  createBatchDownloadJobs,
  createDownloadJob,
  formatBytes,
  formatEpisodeCode,
  getDownloadHealth,
  getDownloadSources,
  listDownloads,
} from '../services/downloadsApi';
import { GlassButton } from './GlassButton';

interface DownloadDialogProps {
  item: MediaItem;
  initialSeasonNumber?: number;
  initialEpisodeNumber?: number;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onOpenDownloads: () => void;
  onJobsChanged?: () => void;
}

export const DownloadDialog: React.FC<DownloadDialogProps> = ({
  item,
  initialSeasonNumber,
  initialEpisodeNumber,
  onClose,
  onShowToast,
  onOpenDownloads,
  onJobsChanged,
}) => {
  const isTv =
    item.type === 'series' || item.type === 'anime' || (item.type as string) === 'tv';
  const mediaType: DownloadMediaType = isTv ? 'tv' : 'movie';
  const lookupId = String(
    item.tmdbId || item.id.replace(/^tmdb-(movie|tv|series)-/i, '')
  );

  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<DownloadSourcesResponse | null>(null);
  const [existingJobs, setExistingJobs] = useState<DownloadJob[]>([]);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Movie & Episode selection states
  const [selectedQualityId, setSelectedQualityId] = useState<string>('');
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [remuxToMkv, setRemuxToMkv] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSeason = initialSeasonNumber || 1;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sourceRes, jobsRes, healthRes] = await Promise.allSettled([
          getDownloadSources({
            mediaType,
            tmdbId: lookupId,
            seasonNumber: isTv ? activeSeason : undefined,
          }),
          listDownloads(),
          getDownloadHealth(),
        ]);

        if (cancelled) return;

        if (sourceRes.status === 'fulfilled') {
          const data = sourceRes.value;
          setSources(data);

          if (data.available) {
            if (isTv && data.episodes && data.episodes.length > 0) {
              const epNums = initialEpisodeNumber
                ? data.episodes
                    .filter((ep) => ep.episodeNumber === initialEpisodeNumber)
                    .map((ep) => ep.episodeNumber)
                : data.episodes.map((ep) => ep.episodeNumber);
              setSelectedEpisodes(
                epNums.length > 0 ? epNums : [data.episodes[0].episodeNumber]
              );

              const firstEp =
                (initialEpisodeNumber
                  ? data.episodes.find((e) => e.episodeNumber === initialEpisodeNumber)
                  : data.episodes[0]) || data.episodes[0];
              if (firstEp?.options[0]) {
                setSelectedQualityId(firstEp.options[0].quality);
              }
            } else if (data.options.length > 0) {
              setSelectedQualityId(data.options[0].quality);
            }
          }
        } else {
          setError(
            sourceRes.reason?.message || 'Unable to check download availability right now.'
          );
        }

        if (jobsRes.status === 'fulfilled') {
          setExistingJobs(jobsRes.value.jobs || []);
        }
        if (healthRes.status === 'fulfilled') {
          setFfmpegAvailable(Boolean(healthRes.value.ffmpegAvailable));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to inspect download sources.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mediaType, lookupId, isTv, activeSeason, initialEpisodeNumber]);

  const episodesList: EpisodeDownloadSource[] = useMemo(() => {
    if (!isTv || !sources?.episodes) return [];
    return sources.episodes;
  }, [isTv, sources]);

  // Distinct real qualities available across the currently selected episodes (never invented)
  const tvQualityOptions = useMemo(() => {
    if (!isTv || episodesList.length === 0) return [];
    const selectedSet = new Set(
      selectedEpisodes.length > 0
        ? selectedEpisodes
        : episodesList.map((e) => e.episodeNumber)
    );
    const relevantEps = episodesList.filter((e) => selectedSet.has(e.episodeNumber));
    const qualityMap = new Map<
      string,
      {
        quality: string;
        label: string;
        container: string;
        totalBytes: number;
        knownCount: number;
        totalEpisodes: number;
        sourceName: string;
        license: string;
      }
    >();

    for (const ep of relevantEps) {
      for (const opt of ep.options) {
        const prev = qualityMap.get(opt.quality);
        if (prev) {
          prev.totalBytes += opt.fileSizeBytes || 0;
          if (opt.fileSizeBytes) prev.knownCount += 1;
          prev.totalEpisodes += 1;
        } else {
          qualityMap.set(opt.quality, {
            quality: opt.quality,
            label: opt.label,
            container: opt.container,
            totalBytes: opt.fileSizeBytes || 0,
            knownCount: opt.fileSizeBytes ? 1 : 0,
            totalEpisodes: 1,
            sourceName: opt.sourceName,
            license: opt.license,
          });
        }
      }
    }
    return Array.from(qualityMap.values());
  }, [isTv, episodesList, selectedEpisodes]);

  // Ensure selectedQualityId always points to an actual available quality
  useEffect(() => {
    if (isTv && tvQualityOptions.length > 0) {
      if (!tvQualityOptions.some((q) => q.quality === selectedQualityId)) {
        setSelectedQualityId(tvQualityOptions[0].quality);
      }
    }
  }, [isTv, tvQualityOptions, selectedQualityId]);

  const activeJobsByKey = useMemo(() => {
    const map = new Map<string, DownloadJob>();
    for (const job of existingJobs) {
      if (job.tmdbId !== lookupId || job.mediaType !== mediaType) continue;
      if (
        job.status === 'queued' ||
        job.status === 'downloading' ||
        job.status === 'paused' ||
        job.status === 'processing' ||
        job.status === 'completed'
      ) {
        const key =
          mediaType === 'tv'
            ? `s${job.seasonNumber || 1}e${job.episodeNumber || 1}`
            : `movie:${job.quality}`;
        if (!map.has(key) || job.status === 'downloading') {
          map.set(key, job);
        }
      }
    }
    return map;
  }, [existingJobs, lookupId, mediaType]);

  const toggleEpisodeSelection = (episodeNumber: number) => {
    setSelectedEpisodes((prev) =>
      prev.includes(episodeNumber)
        ? prev.filter((n) => n !== episodeNumber)
        : [...prev, episodeNumber].sort((a, b) => a - b)
    );
  };

  const selectAllEpisodes = () => {
    setSelectedEpisodes(episodesList.map((e) => e.episodeNumber));
  };

  const clearEpisodeSelection = () => {
    setSelectedEpisodes([]);
  };

  const selectedMovieOption: DownloadQualityOption | undefined = useMemo(() => {
    if (isTv || !sources?.options) return undefined;
    return (
      sources.options.find((o) => o.quality === selectedQualityId) || sources.options[0]
    );
  }, [isTv, sources, selectedQualityId]);

  const handleStartMovieDownload = async () => {
    if (!selectedMovieOption) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createDownloadJob({
        tmdbId: lookupId,
        mediaType: 'movie',
        title: item.title,
        releaseYear: item.releaseYear,
        posterUrl: item.posterUrl,
        quality: selectedMovieOption.quality,
        remuxToMkv,
      });

      onJobsChanged?.();
      if (res.duplicate) {
        onShowToast(`"${item.title}" (${selectedMovieOption.quality}) is already in your download queue.`);
      } else {
        onShowToast(`Started downloading "${item.title}" (${selectedMovieOption.quality}).`);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to start download.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTvDownload = async () => {
    if (selectedEpisodes.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const targetEps = episodesList.filter((e) =>
        selectedEpisodes.includes(e.episodeNumber)
      );

      if (targetEps.length === 1) {
        const ep = targetEps[0];
        const chosenOpt =
          ep.options.find((o) => o.quality === selectedQualityId) || ep.options[0];
        if (!chosenOpt) {
          setError('No authorized quality option is available for this episode.');
          setIsSubmitting(false);
          return;
        }
        const res = await createDownloadJob({
          tmdbId: lookupId,
          mediaType: 'tv',
          title: item.title,
          releaseYear: item.releaseYear,
          posterUrl: item.posterUrl,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
          episodeTitle: ep.episodeTitle,
          quality: chosenOpt.quality,
          remuxToMkv,
        });
        onJobsChanged?.();
        const code = formatEpisodeCode(ep.seasonNumber, ep.episodeNumber);
        if (res.duplicate) {
          onShowToast(`${item.title} ${code} is already active in your download queue.`);
        } else {
          onShowToast(`Queued ${item.title} ${code} (${chosenOpt.quality}).`);
        }
        onClose();
        return;
      }

      const payloadItems = targetEps
        .map((ep) => {
          const opt =
            ep.options.find((o) => o.quality === selectedQualityId) || ep.options[0];
          if (!opt) return null;
          return {
            tmdbId: lookupId,
            mediaType: 'tv' as const,
            title: item.title,
            releaseYear: item.releaseYear,
            posterUrl: item.posterUrl,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            episodeTitle: ep.episodeTitle,
            quality: opt.quality,
            remuxToMkv,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const batch = await createBatchDownloadJobs(payloadItems);
      onJobsChanged?.();

      if (batch.created.length > 0) {
        const skippedNote =
          batch.skippedDuplicates > 0
            ? ` (${batch.skippedDuplicates} duplicate skipped)`
            : '';
        onShowToast(
          `Queued ${batch.created.length} episode${batch.created.length === 1 ? '' : 's'} of ${item.title}${skippedNote}.`
        );
        onClose();
      } else if (batch.skippedDuplicates > 0) {
        onShowToast('All selected episodes are already active in your download queue.');
        onClose();
      } else {
        setError(batch.errors[0] || 'Downloads are unavailable for this source.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to queue episode downloads.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="glass-backdrop fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Download ${item.title}`}
      data-download-dialog="true"
    >
      <div
        className="glass-panel relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl p-6 sm:p-7 space-y-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <GlassButton
          variant="icon"
          size="icon"
          shape="circle"
          refractive={true}
          onClick={onClose}
          aria-label="Close download dialog"
          className="!absolute top-4 right-4 w-9 h-9"
        >
          <X className="w-4 h-4" />
        </GlassButton>

        {/* Header */}
        <div className="pr-10 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
            {isTv ? `Season ${activeSeason} Downloads` : 'Authorized Media Download'}
          </p>
          <h3 className="font-display font-extrabold text-2xl text-white tracking-tight">
            {item.title}
          </h3>
          <p className="text-xs text-[#9a9ba1]">
            {item.releaseYear} · {isTv ? 'Series' : 'Film'}
            {sources?.adapterName ? ` · ${sources.adapterName}` : ''}
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <p className="text-xs text-[#9a9ba1] font-mono">
              Checking authorized download sources...
            </p>
          </div>
        )}

        {/* Unavailable state */}
        {!loading && (!sources || !sources.available) && (
          <div className="space-y-5 pt-1" data-download-unavailable="true">
            <div className="glass-surface rounded-xl p-5 space-y-2.5 border border-white/15">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-white">
                    {sources?.reason || 'Downloads are unavailable for this source.'}
                  </p>
                  <p className="text-xs text-[#9a9ba1] leading-relaxed">
                    {error ||
                      'CRATOR only downloads files from explicitly authorized media sources and open-license catalogs. Embedded third-party streams are not downloadable.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenDownloads();
                }}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open Download Manager
              </GlassButton>
              <GlassButton variant="ghost" size="sm" onClick={onClose}>
                Close
              </GlassButton>
            </div>
          </div>
        )}

        {/* Movie Quality Selection */}
        {!loading && sources?.available && !isTv && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#9a9ba1] block">
                Select Permitted Quality
              </label>

              <div className="space-y-2">
                {sources.options.map((opt) => {
                  const selected = selectedQualityId === opt.quality;
                  const existing = activeJobsByKey.get(`movie:${opt.quality}`);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedQualityId(opt.quality)}
                      data-quality-option={opt.quality}
                      className={`w-full text-left rounded-xl p-3.5 border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        selected
                          ? 'bg-white/14 border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                          : 'bg-white/[0.04] border-white/12 hover:bg-white/[0.08] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                            selected
                              ? 'bg-white text-[#0b0d12] border-white'
                              : 'border-white/30 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {opt.quality}
                            </span>
                            <span className="text-xs text-[#c9c7cc]">{opt.label}</span>
                          </div>
                          <p className="text-[11px] text-[#8e8a91] truncate">
                            {opt.sourceName} · {opt.license}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="text-xs font-mono font-semibold text-white tabular-nums">
                          {formatBytes(opt.fileSizeBytes)}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-[#8e8a91]">
                          {existing ? existing.status : opt.container}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {ffmpegAvailable && (
              <label className="flex items-center gap-2.5 text-xs text-[#c9c7cc] cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={remuxToMkv}
                  onChange={(e) => setRemuxToMkv(e.target.checked)}
                  className="rounded border-white/30 bg-white/10 accent-white w-4 h-4"
                />
                <span>Remux container to MKV after download (lossless stream copy)</span>
              </label>
            )}

            {error && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] text-[#8e8a91]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Verified authorized source</span>
              </div>

              <div className="flex items-center gap-2">
                <GlassButton variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  refractive={true}
                  loading={isSubmitting}
                  disabled={!selectedMovieOption || isSubmitting}
                  onClick={handleStartMovieDownload}
                  leftIcon={<Download className="w-4 h-4" />}
                  data-start-download-btn="true"
                >
                  Start Download
                </GlassButton>
              </div>
            </div>
          </div>
        )}

        {/* TV Series Episode & Season Selection */}
        {!loading && sources?.available && isTv && (
          <div className="space-y-4">
            {/* Quick selection controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#9a9ba1]">
                Episodes ({selectedEpisodes.length}/{episodesList.length} selected)
              </span>
              <div className="flex items-center gap-2">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={selectAllEpisodes}
                  disabled={selectedEpisodes.length === episodesList.length}
                >
                  Select Season
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={clearEpisodeSelection}
                  disabled={selectedEpisodes.length === 0}
                >
                  Clear
                </GlassButton>
              </div>
            </div>

            {/* Episode checkboxes */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {episodesList.map((ep) => {
                const checked = selectedEpisodes.includes(ep.episodeNumber);
                const code = formatEpisodeCode(ep.seasonNumber, ep.episodeNumber);
                const existing = activeJobsByKey.get(
                  `s${ep.seasonNumber}e${ep.episodeNumber}`
                );
                const matchedOpt =
                  ep.options.find((o) => o.quality === selectedQualityId) || ep.options[0];

                return (
                  <button
                    key={`${ep.seasonNumber}-${ep.episodeNumber}`}
                    type="button"
                    onClick={() => toggleEpisodeSelection(ep.episodeNumber)}
                    data-episode-option={code}
                    className={`w-full text-left rounded-xl px-3.5 py-2.5 border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      checked
                        ? 'bg-white/12 border-white/50'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          checked
                            ? 'bg-white text-[#0b0d12] border-white'
                            : 'border-white/30 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#c9c7cc]">{code}</span>
                          <span className="text-white font-semibold truncate">
                            {ep.episodeTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8e8a91] font-mono">
                          {ep.options.map((o) => o.quality).join(' · ')}
                          {existing ? ` · ${existing.status}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#c9c7cc] tabular-nums shrink-0">
                      {formatBytes(matchedOpt?.fileSizeBytes)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quality selector for selected episodes */}
            {tvQualityOptions.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#9a9ba1] block">
                  Quality
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tvQualityOptions.map((q) => {
                    const active = selectedQualityId === q.quality;
                    return (
                      <button
                        key={q.quality}
                        type="button"
                        onClick={() => setSelectedQualityId(q.quality)}
                        className={`rounded-xl p-3 border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-white/14 border-white/60'
                            : 'bg-white/[0.04] border-white/12 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white">{q.quality}</span>
                          <span className="text-xs font-mono text-[#c9c7cc] tabular-nums">
                            {q.knownCount > 0 ? formatBytes(q.totalBytes) : 'Variable'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8e8a91] mt-0.5 truncate">
                          {q.container.toUpperCase()} · {q.totalEpisodes} ep
                          {q.totalEpisodes === 1 ? '' : 's'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {ffmpegAvailable && (
              <label className="flex items-center gap-2.5 text-xs text-[#c9c7cc] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remuxToMkv}
                  onChange={(e) => setRemuxToMkv(e.target.checked)}
                  className="rounded border-white/30 bg-white/10 accent-white w-4 h-4"
                />
                <span>Remux episodes to MKV (lossless stream copy)</span>
              </label>
            )}

            {error && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] text-[#8e8a91]">
                <Layers className="w-3.5 h-3.5 text-white/70" />
                <span>Episodes queue sequentially</span>
              </div>

              <div className="flex items-center gap-2">
                <GlassButton variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  refractive={true}
                  loading={isSubmitting}
                  disabled={selectedEpisodes.length === 0 || isSubmitting}
                  onClick={handleStartTvDownload}
                  leftIcon={<Download className="w-4 h-4" />}
                  data-start-download-btn="true"
                >
                  {selectedEpisodes.length === episodesList.length && episodesList.length > 1
                    ? `Download Season ${activeSeason}`
                    : selectedEpisodes.length > 1
                      ? `Queue ${selectedEpisodes.length} Episodes`
                      : 'Start Download'}
                </GlassButton>
              </div>
            </div>
          </div>
        )}

        {/* Footer destination preview */}
        {!loading && sources?.available && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#7c7a82] pt-1">
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isTv
                ? `Downloads/${item.title}/Season ${String(activeSeason).padStart(2, '0')}/S${String(activeSeason).padStart(2, '0')}E01.${remuxToMkv ? 'mkv' : 'mp4'}`
                : `Downloads/${item.title} (${item.releaseYear || ''})/${item.title}.${remuxToMkv ? 'mkv' : selectedMovieOption?.container || 'mp4'}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
