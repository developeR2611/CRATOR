import { MediaItem, Episode } from '../../types';
import { StreamOption } from '../moviebox';

export type PlaybackProviderId = 'cinesrc' | 'moviebox';

export interface ProviderInfo {
  id: PlaybackProviderId;
  name: string;
  badge: string;
  tagline: string;
  type: 'embed' | 'direct';
  isPrimary: boolean;
  status: 'active' | 'alternative' | 'degraded';
}

export interface CineSrcEventData {
  currentTime?: number;
  duration?: number;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  season?: number;
  episode?: number;
  internalNavigation?: boolean;
  source?: string;
  sourceId?: string;
  time?: number;
  error?: string;
  command?: string;
  result?: any;
}

export interface CineSrcMessageEvent {
  type:
    | 'cinesrc:ready'
    | 'cinesrc:play'
    | 'cinesrc:pause'
    | 'cinesrc:timeupdate'
    | 'cinesrc:seeking'
    | 'cinesrc:seeked'
    | 'cinesrc:ended'
    | 'cinesrc:volumechange'
    | 'cinesrc:ratechange'
    | 'cinesrc:loadedmetadata'
    | 'cinesrc:nextepisode'
    | 'cinesrc:skipintro'
    | 'cinesrc:sourceused'
    | 'cinesrc:close'
    | 'cinesrc:error'
    | 'cinesrc:response';
  [key: string]: any;
}

export interface ProviderResolutionResult {
  provider: PlaybackProviderId;
  mode: 'embed' | 'direct';
  embedUrl?: string;
  streamUrl?: string;
  streams?: StreamOption[];
  format?: 'embed' | 'mp4' | 'hls' | 'dash' | 'unknown';
  tmdbId?: number | string;
  subjectId?: string;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  subtitles?: Array<{ language: string; url: string }>;
  duration?: number | string;
  error?: string;
  errorCode?: string;
}
