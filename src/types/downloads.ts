export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DownloadMediaType = 'movie' | 'tv';

export type DownloadEngineType = 'aria2' | 'native';

export type DownloadStorageMode =
  | 'local-disk'
  | 'remote-service'
  | 'serverless-unconfigured';

export interface DownloadSubtitleTrack {
  lang: string;
  label: string;
  format: 'vtt' | 'srt';
  url?: string; // Server-side only; stripped from public API responses
}

export interface DownloadQualityOption {
  id: string;
  label: string;
  quality: string; // e.g., '480p', '720p', '1080p', '4K'
  container: string; // e.g., 'mp4', 'mkv', 'mov', 'webm'
  mimeType: string;
  fileSizeBytes: number | null;
  filename: string;
  sourceName: string;
  license: string;
  supportsRange?: boolean;
  subtitleTracks?: Array<{
    lang: string;
    label: string;
    format: 'vtt' | 'srt';
  }>;
}

export interface EpisodeDownloadSource {
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  options: DownloadQualityOption[];
}

export interface DownloadSourcesResponse {
  available: boolean;
  reason?: string;
  adapterName?: string;
  mediaType: DownloadMediaType;
  tmdbId: string;
  options: DownloadQualityOption[];
  episodes?: EpisodeDownloadSource[];
}

export interface MediaValidationInfo {
  durationSec?: number;
  width?: number;
  height?: number;
  videoCodec?: string;
  audioCodec?: string;
  container?: string;
}

export interface DownloadJob {
  id: string;
  userId: string;
  tmdbId: string;
  mediaType: DownloadMediaType;
  title: string;
  releaseYear?: number;
  posterUrl: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  quality: string;
  sourceName: string;
  filename: string;
  relativePath: string;
  fileSize: number;
  downloadedBytes: number;
  progress: number; // 0-100
  speed: number; // bytes per second
  etaSeconds: number | null;
  status: DownloadStatus;
  engine: DownloadEngineType;
  error?: string;
  ffprobeValidated?: boolean;
  mediaInfo?: MediaValidationInfo;
  queuePosition?: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DownloadStorageStats {
  usedBytes: number;
  maxBytes: number;
  userUsedBytes: number;
  userMaxBytes: number;
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  maxConcurrent: number;
  maxConcurrentPerUser: number;
  engine: DownloadEngineType;
  aria2Configured: boolean;
  aria2Connected: boolean;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  storageMode: DownloadStorageMode;
  persistentStorage: boolean;
}

export interface DownloadHealthResponse {
  status: 'ok' | 'degraded';
  engine: DownloadEngineType;
  aria2Configured: boolean;
  aria2Connected: boolean;
  aria2Version?: string;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  storageMode: DownloadStorageMode;
  persistentStorage: boolean;
  usedBytes: number;
  maxBytes: number;
  maxConcurrent: number;
  maxConcurrentPerUser: number;
  maxStoragePerUserBytes: number;
  aria2: {
    configured: boolean;
    connected: boolean;
    version?: string;
  };
  ffmpeg: {
    available: boolean;
    ffprobeAvailable: boolean;
  };
  storage: {
    mode: DownloadStorageMode;
    persistent: boolean;
    usedBytes: number;
    maxBytes: number;
    maxConcurrent: number;
    maxConcurrentPerUser: number;
    maxStoragePerUserBytes: number;
  };
}

export interface DownloadListResponse {
  jobs: DownloadJob[];
  stats: DownloadStorageStats;
}

export interface AuthorizedCatalogPreview {
  tmdbId: string;
  mediaType: DownloadMediaType;
  title: string;
  releaseYear: number;
  posterUrl: string;
  backdropUrl: string;
  synopsis: string;
  license: string;
  sourceName: string;
  qualities: string[];
  episodeCount?: number;
}
