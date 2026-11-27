import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  ExternalLink,
  Film,
  FolderOpen,
  HardDrive,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import type { MediaItem } from '../types';
import type {
  AuthorizedCatalogPreview,
  DownloadJob,
  DownloadStorageStats,
} from '../types/downloads';
import {
  cancelDownloadJob,
  deleteDownloadJob,
  formatBytes,
  formatCompletedDate,
  formatEpisodeCode,
  formatEta,
  formatSpeed,
  getAuthorizedCatalog,
  getDownloadFileUrl,
  listDownloads,
  pauseDownloadJob,
  reorderDownloadQueue,
  resumeDownloadJob,
  retryDownloadJob,
  triggerBrowserFileDownload,
} from '../services/downloadsApi';
import { GlassButton } from './GlassButton';
import { ImageWithFallback } from './ImageWithFallback';
import { DownloadDialog } from './DownloadDialog';

type DownloadFilter = 'all' | 'active' | 'queue' | 'completed' | 'failed';

interface DownloadsViewProps {
  onOpenDetails: (item: MediaItem) => void;
  onShowToast: (message: string) => void;
  onActiveCountChange?: (count: number) => void;
}

function catalogPreviewToMediaItem(preview: AuthorizedCatalogPreview): MediaItem {
  return {
    id: `tmdb-${preview.mediaType}-${preview.tmdbId}`,
    tmdbId: Number(preview.tmdbId) || undefined,
    title: preview.title,
    type: preview.mediaType === 'tv' ? 'series' : 'movie',
    releaseYear: preview.releaseYear,
    rating: 8.1,
    voteCount: '12K',
    ageRating: 'PG',
    quality: preview.qualities[0] || '1080p HD',
    audio: '5.1 Surround',
    platform: 'Apple TV+',
    industry: 'Indie',
    language: 'English',
    cast: [],
    runtime: preview.mediaType === 'tv' ? `${preview.episodeCount || 1} Episodes` : 'Open Film',
    genres: ['Open Cinema', preview.mediaType === 'tv' ? 'Anthology' : 'Animation'],
    synopsis: preview.synopsis,
    posterUrl: preview.posterUrl,
    backdropUrl: preview.backdropUrl,
    totalSeasons: preview.mediaType === 'tv' ? 1 : undefined,
  };
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  onOpenDetails,
  onShowToast,
  onActiveCountChange,
}) => {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [stats, setStats] = useState<DownloadStorageStats | null>(null);
  const [catalog, setCatalog] = useState<AuthorizedCatalogPreview[]>([]);
  const [filter, setFilter] = useState<DownloadFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [busyJobIds, setBusyJobIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog states
  const [dialogTarget, setDialogTarget] = useState<MediaItem | null>(null);
  const [previewJob, setPreviewJob] = useState<DownloadJob | null>(null);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const res = await listDownloads();
        setJobs(res.jobs || []);
        setStats(res.stats || null);
        setErrorMessage(null);

        const activeCount = (res.jobs || []).filter(
          (j) =>
            j.status === 'downloading' ||
            j.status === 'queued' ||
            j.status === 'processing'
        ).length;
        onActiveCountChange?.(activeCount);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unable to load download queue.');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [onActiveCountChange]
  );

  useEffect(() => {
    fetchAll(false);
    getAuthorizedCatalog()
      .then((items) => setCatalog(items))
      .catch(() => {});
  }, [fetchAll]);

  // Adaptive polling: fast while transfers run, gentle when idle
  const hasRunningJobs = useMemo(
    () =>
      jobs.some(
        (j) =>
          j.status === 'downloading' ||
          j.status === 'queued' ||
          j.status === 'processing'
      ),
    [jobs]
  );

  useEffect(() => {
    const intervalMs = hasRunningJobs ? 1400 : 8000;
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        fetchAll(true);
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [hasRunningJobs, fetchAll]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewJob) {
        setPreviewJob(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [previewJob]);

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.status === 'downloading' ||
          j.status === 'paused' ||
          j.status === 'processing'
      ),
    [jobs]
  );

  const queuedJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status === 'queued')
        .sort((a, b) => (a.queuePosition || 9999) - (b.queuePosition || 9999)),
    [jobs]
  );

  const completedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'completed'),
    [jobs]
  );

  const failedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'failed' || j.status === 'cancelled'),
    [jobs]
  );

  // Season-level completion summary for multi-episode TV downloads
  const seasonSummaries = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        tmdbId: string;
        title: string;
        seasonNumber: number;
        total: number;
        completed: number;
        active: number;
        totalProgress: number;
      }
    >();

    for (const job of jobs) {
      if (job.mediaType !== 'tv' || !job.seasonNumber) continue;
      const key = `${job.tmdbId}:s${job.seasonNumber}`;
      const existing = groups.get(key) || {
        key,
        tmdbId: job.tmdbId,
        title: job.title,
        seasonNumber: job.seasonNumber,
        total: 0,
        completed: 0,
        active: 0,
        totalProgress: 0,
      };
      existing.total += 1;
      if (job.status === 'completed') existing.completed += 1;
      if (
        job.status === 'downloading' ||
        job.status === 'queued' ||
        job.status === 'processing'
      ) {
        existing.active += 1;
      }
      existing.totalProgress += job.status === 'completed' ? 100 : job.progress;
      groups.set(key, existing);
    }

    return Array.from(groups.values())
      .filter((g) => g.total > 1)
      .map((g) => ({
        ...g,
        percent: Math.round(g.totalProgress / g.total),
      }));
  }, [jobs]);

  const runJobAction = async (
    jobId: string,
    action: () => Promise<any>,
    successMsg?: string
  ) => {
    setBusyJobIds((prev) => ({ ...prev, [jobId]: true }));
    try {
      await action();
      if (successMsg) onShowToast(successMsg);
      await fetchAll(true);
    } catch (err: any) {
      onShowToast(err?.message || 'Action failed.');
    } finally {
      setBusyJobIds((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleMoveQueueItem = async (jobId: string, direction: 'up' | 'down') => {
    const ids = queuedJobs.map((j) => j.id);
    const idx = ids.indexOf(jobId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    const nextIds = [...ids];
    [nextIds[idx], nextIds[swapIdx]] = [nextIds[swapIdx], nextIds[idx]];
    await runJobAction(jobId, () => reorderDownloadQueue(nextIds));
  };

  const handleSaveFile = async (job: DownloadJob) => {
    try {
      await triggerBrowserFileDownload(job);
      onShowToast(`Saving "${job.filename}"`);
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save file.');
    }
  };

  const storagePercent = stats && stats.maxBytes > 0
    ? Math.min(100, Math.round((stats.usedBytes / stats.maxBytes) * 100))
    : 0;

  const showActive = filter === 'all' || filter === 'active';
  const showQueue = filter === 'all' || filter === 'queue';
  const showCompleted = filter === 'all' || filter === 'completed';
  const showFailed = filter === 'all' || filter === 'failed';

  const renderJobTitle = (job: DownloadJob) => {
    const code =
      job.mediaType === 'tv'
        ? formatEpisodeCode(job.seasonNumber, job.episodeNumber)
        : '';
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-bold text-sm sm:text-base text-white truncate">
            {job.title}
          </h3>
          {code && (
            <span className="text-xs font-mono font-semibold text-[#c9c7cc]">
              {code}
            </span>
          )}
        </div>
        {job.episodeTitle && (
          <p className="text-xs text-[#c9c7cc] truncate">{job.episodeTitle}</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 space-y-8 animate-fadeIn">
      {/* Page Header & Storage Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-white/10">
        <div className="space-y-1.5">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Downloads
          </h1>
          <p className="text-xs sm:text-sm text-[#9a9ba1]">
            Manage authorized movie and episode transfers, queue order, and offline files.
          </p>
        </div>

        {/* Storage & Engine Meter */}
        <div className="glass-surface rounded-2xl px-4 py-3 min-w-[260px] sm:min-w-[320px] space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#c9c7cc] font-medium">
              <HardDrive className="w-3.5 h-3.5 text-white/75" />
              Storage
            </span>
            <span className="font-mono text-white tabular-nums">
              {stats ? `${formatBytes(stats.usedBytes)} / ${formatBytes(stats.maxBytes)}` : '—'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#8e8a91]">
            <span>
              {stats?.aria2Connected
                ? 'aria2 JSON-RPC'
                : 'Resumable HTTP Engine'}
              {stats?.ffmpegAvailable ? ' · FFmpeg Ready' : ''}
            </span>
            <span className="tabular-nums">
              {stats ? `${stats.activeCount}/${stats.maxConcurrent} slots` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar & Refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Filter downloads">
          {(
            [
              { id: 'all', label: 'All', count: jobs.length },
              { id: 'active', label: 'Active', count: activeJobs.length },
              { id: 'queue', label: 'Queue', count: queuedJobs.length },
              { id: 'completed', label: 'Completed', count: completedJobs.length },
              { id: 'failed', label: 'Failed', count: failedJobs.length },
            ] as const
          ).map((tab) => (
            <GlassButton
              key={tab.id}
              variant="pill"
              size="sm"
              shape="pill"
              active={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              role="tab"
              aria-selected={filter === tab.id}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 opacity-70 font-mono tabular-nums text-[11px]">
                {tab.count}
              </span>
            </GlassButton>
          ))}
        </div>

        <GlassButton
          variant="secondary"
          size="sm"
          onClick={() => fetchAll(false)}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </GlassButton>
      </div>

      {errorMessage && (
        <div className="glass-surface rounded-2xl p-4 border border-amber-400/25 flex items-center gap-3 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Season-Level Completion Summary */}
      {seasonSummaries.length > 0 && (filter === 'all' || filter === 'active' || filter === 'completed') && (
        <section className="space-y-3" aria-label="Season download progress">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
            Season Progress
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {seasonSummaries.map((season) => (
              <div
                key={season.key}
                className="glass-surface rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-white truncate">
                      {season.title} · Season {season.seasonNumber}
                    </p>
                    <p className="text-xs text-[#9a9ba1] font-mono tabular-nums">
                      {season.completed} of {season.total} episodes completed
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-white tabular-nums">
                    {season.percent}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300"
                    style={{ width: `${season.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Initial Loading State */}
      {isLoading && jobs.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
          <p className="text-xs font-mono text-[#9a9ba1]">Loading download manager...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ACTIVE DOWNLOADS */}
          {showActive && activeJobs.length > 0 && (
            <section className="space-y-3" data-downloads-section="active">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
                Active Downloads ({activeJobs.length})
              </h2>
              <div className="space-y-3">
                {activeJobs.map((job) => {
                  const busy = Boolean(busyJobIds[job.id]);
                  const isPaused = job.status === 'paused';
                  const isProcessing = job.status === 'processing';
                  return (
                    <div
                      key={job.id}
                      data-download-job={job.id}
                      data-download-status={job.status}
                      className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    >
                      <div className="w-14 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        <ImageWithFallback
                          src={job.posterUrl}
                          alt={job.title}
                          fallbackTitle={job.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 w-full space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          {renderJobTitle(job)}
                          <span className="font-mono text-sm font-bold text-white tabular-nums shrink-0">
                            {job.progress.toFixed(1)}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isPaused ? 'bg-white/45' : 'bg-white'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                          />
                        </div>

                        {/* Live Telemetry Row (clean unboxed tabular-nums) */}
                        <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-[#9a9ba1] font-mono tabular-nums">
                          <span>
                            {job.quality} · {formatBytes(job.downloadedBytes)}
                            {job.fileSize > 0 ? ` / ${formatBytes(job.fileSize)}` : ''}
                          </span>
                          <span>
                            {isProcessing
                              ? 'Verifying & finalizing media...'
                              : isPaused
                                ? 'Paused'
                                : `${formatSpeed(job.speed)} · ETA ${formatEta(job.etaSeconds)}`}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isPaused ? (
                          <GlassButton
                            variant="primary"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              runJobAction(job.id, () => resumeDownloadJob(job.id), 'Download resumed')
                            }
                            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                          >
                            Resume
                          </GlassButton>
                        ) : (
                          <GlassButton
                            variant="secondary"
                            size="sm"
                            disabled={busy || isProcessing}
                            onClick={() =>
                              runJobAction(job.id, () => pauseDownloadJob(job.id), 'Download paused')
                            }
                            leftIcon={<Pause className="w-3.5 h-3.5" />}
                          >
                            Pause
                          </GlassButton>
                        )}
                        <GlassButton
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            runJobAction(job.id, () => cancelDownloadJob(job.id), 'Download cancelled')
                          }
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Cancel
                        </GlassButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* QUEUE */}
          {showQueue && queuedJobs.length > 0 && (
            <section className="space-y-3" data-downloads-section="queue">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
                Queue ({queuedJobs.length})
              </h2>
              <div className="space-y-2.5">
                {queuedJobs.map((job, idx) => {
                  const busy = Boolean(busyJobIds[job.id]);
                  return (
                    <div
                      key={job.id}
                      data-download-job={job.id}
                      data-download-status={job.status}
                      className="glass-surface rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5"
                    >
                      <span className="font-mono text-xs text-[#8e8a91] tabular-nums w-7 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="w-11 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        <ImageWithFallback
                          src={job.posterUrl}
                          alt={job.title}
                          fallbackTitle={job.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        {renderJobTitle(job)}
                        <p className="text-xs font-mono text-[#8e8a91] tabular-nums">
                          Queued · {job.quality}
                          {job.fileSize > 0 ? ` · ${formatBytes(job.fileSize)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <GlassButton
                          variant="icon"
                          size="icon"
                          shape="square"
                          disabled={busy || idx === 0}
                          onClick={() => handleMoveQueueItem(job.id, 'up')}
                          aria-label="Move up in queue"
                          title="Move up"
                          className="w-8 h-8"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </GlassButton>
                        <GlassButton
                          variant="icon"
                          size="icon"
                          shape="square"
                          disabled={busy || idx === queuedJobs.length - 1}
                          onClick={() => handleMoveQueueItem(job.id, 'down')}
                          aria-label="Move down in queue"
                          title="Move down"
                          className="w-8 h-8"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </GlassButton>
                        <GlassButton
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            runJobAction(job.id, () => cancelDownloadJob(job.id), 'Removed from queue')
                          }
                        >
                          Cancel
                        </GlassButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* COMPLETED DOWNLOADS */}
          {showCompleted && completedJobs.length > 0 && (
            <section className="space-y-3" data-downloads-section="completed">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
                Completed ({completedJobs.length})
              </h2>
              <div className="space-y-3">
                {completedJobs.map((job) => {
                  const busy = Boolean(busyJobIds[job.id]);
                  const resolutionText =
                    job.mediaInfo?.width && job.mediaInfo?.height
                      ? `${job.mediaInfo.width}×${job.mediaInfo.height}`
                      : null;
                  const codecText = [job.mediaInfo?.videoCodec, job.mediaInfo?.audioCodec]
                    .filter(Boolean)
                    .join('/');

                  return (
                    <div
                      key={job.id}
                      data-download-job={job.id}
                      data-download-status={job.status}
                      className="glass-surface rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    >
                      <div className="w-14 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        <ImageWithFallback
                          src={job.posterUrl}
                          alt={job.title}
                          fallbackTitle={job.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          {renderJobTitle(job)}
                        </div>
                        <p className="text-xs font-mono text-[#c9c7cc] tabular-nums">
                          {job.quality} · {formatBytes(job.fileSize)}
                          {job.completedAt ? ` · ${formatCompletedDate(job.completedAt)}` : ''}
                          {resolutionText ? ` · ${resolutionText}` : ''}
                          {codecText ? ` · ${codecText}` : ''}
                        </p>
                        <p className="text-[11px] font-mono text-[#7c7a82] truncate flex items-center gap-1.5">
                          <FolderOpen className="w-3 h-3 shrink-0" />
                          <span className="truncate">Downloads/{job.relativePath}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap self-end sm:self-center">
                        <GlassButton
                          variant="primary"
                          size="sm"
                          onClick={() => setPreviewJob(job)}
                          leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                        >
                          Play
                        </GlassButton>
                        <GlassButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSaveFile(job)}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          Save File
                        </GlassButton>
                        <GlassButton
                          variant="icon"
                          size="icon"
                          shape="square"
                          disabled={busy}
                          onClick={() =>
                            runJobAction(job.id, () => deleteDownloadJob(job.id), 'Download removed')
                          }
                          aria-label={`Remove ${job.title}`}
                          title="Remove download"
                          className="w-9 h-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </GlassButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* FAILED / CANCELLED */}
          {showFailed && failedJobs.length > 0 && (
            <section className="space-y-3" data-downloads-section="failed">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
                Failed &amp; Cancelled ({failedJobs.length})
              </h2>
              <div className="space-y-2.5">
                {failedJobs.map((job) => {
                  const busy = Boolean(busyJobIds[job.id]);
                  return (
                    <div
                      key={job.id}
                      data-download-job={job.id}
                      data-download-status={job.status}
                      className="glass-surface rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    >
                      <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        <ImageWithFallback
                          src={job.posterUrl}
                          alt={job.title}
                          fallbackTitle={job.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        {renderJobTitle(job)}
                        <p className="text-xs text-amber-300/90">
                          {job.error || (job.status === 'cancelled' ? 'Cancelled by user.' : 'Download failed.')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <GlassButton
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            runJobAction(job.id, () => retryDownloadJob(job.id), 'Retrying download')
                          }
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                          Retry
                        </GlassButton>
                        <GlassButton
                          variant="icon"
                          size="icon"
                          shape="square"
                          disabled={busy}
                          onClick={() =>
                            runJobAction(job.id, () => deleteDownloadJob(job.id), 'Entry removed')
                          }
                          aria-label="Delete failed download"
                          title="Remove"
                          className="w-9 h-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </GlassButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* EMPTY STATE */}
          {jobs.length === 0 && (
            <div className="glass-panel rounded-2xl p-8 sm:p-10 text-center space-y-3">
              <div className="glass-surface w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-white">
                <Download className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display font-bold text-xl text-white">
                  No downloads yet
                </h2>
                <p className="text-xs sm:text-sm text-[#9a9ba1] max-w-md mx-auto">
                  Start an authorized movie or episode download from any supported title page or pick a Creative Commons release below.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AUTHORIZED OPEN-LICENSE CATALOG */}
      {catalog.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-white/10" data-authorized-catalog="true">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8e8a91]">
                Authorized Offline Library
              </p>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                Open-License Titles Ready to Download
              </h2>
            </div>
            <span className="text-xs font-mono text-[#8e8a91]">
              {catalog.length} verified sources
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((entry) => {
              const mediaItem = catalogPreviewToMediaItem(entry);
              return (
                <div
                  key={`${entry.mediaType}-${entry.tmdbId}`}
                  className="glass-surface rounded-2xl p-4 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      <ImageWithFallback
                        src={entry.posterUrl}
                        alt={entry.title}
                        fallbackTitle={entry.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8e8a91] uppercase">
                        {entry.mediaType === 'tv' ? (
                          <Tv className="w-3 h-3" />
                        ) : (
                          <Film className="w-3 h-3" />
                        )}
                        <span>
                          {entry.mediaType === 'tv'
                            ? `Series · ${entry.episodeCount || 1} eps`
                            : 'Film'}
                          {' · '}
                          {entry.releaseYear}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-base text-white truncate">
                        {entry.title}
                      </h3>
                      <p className="text-xs text-[#9a9ba1] line-clamp-2 leading-relaxed">
                        {entry.synopsis}
                      </p>
                      <p className="text-[11px] font-mono text-[#c9c7cc]">
                        {entry.qualities.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDetails(mediaItem)}
                      rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Details
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      size="sm"
                      refractive={true}
                      onClick={() => setDialogTarget(mediaItem)}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download
                    </GlassButton>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Download Quality / Season Dialog */}
      {dialogTarget && (
        <DownloadDialog
          item={dialogTarget}
          onClose={() => setDialogTarget(null)}
          onShowToast={onShowToast}
          onOpenDownloads={() => setDialogTarget(null)}
          onJobsChanged={() => fetchAll(true)}
        />
      )}

      {/* Local Offline Media Preview Player Modal */}
      {previewJob && (
        <div
          className="glass-backdrop fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setPreviewJob(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Playing downloaded file ${previewJob.title}`}
        >
          <div
            className="glass-panel relative w-full max-w-4xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10">
              <div className="min-w-0">
                <p className="font-display font-bold text-sm sm:text-base text-white truncate">
                  {previewJob.title}
                  {previewJob.mediaType === 'tv'
                    ? ` · ${formatEpisodeCode(previewJob.seasonNumber, previewJob.episodeNumber)}`
                    : ''}
                </p>
                <p className="text-[11px] font-mono text-[#8e8a91] truncate">
                  {previewJob.filename} · {previewJob.quality} · {formatBytes(previewJob.fileSize)}
                </p>
              </div>
              <GlassButton
                variant="icon"
                size="icon"
                shape="circle"
                onClick={() => setPreviewJob(null)}
                aria-label="Close local player"
                className="w-9 h-9"
              >
                <X className="w-4 h-4" />
              </GlassButton>
            </div>
            <div className="bg-black aspect-video w-full">
              <video
                key={previewJob.id}
                src={getDownloadFileUrl(previewJob.id, true)}
                controls
                autoPlay
                playsInline
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
