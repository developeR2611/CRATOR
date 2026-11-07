/**
 * CineSRC Dedicated Service (CRATOR Primary Streaming Provider)
 * Official documentation: https://cinesrc.st/docs
 */
export {
  CINESRC_BASE_ORIGIN,
  validateTmdbId,
  validateSeasonEpisode,
  resolveTmdbId,
  getCineSrcMovieUrl,
  getCineSrcTvUrl,
  resolveCineSrcPlayback,
  isCineSrcOrigin,
  parseCineSrcMessage,
  sendCineSrcCommand,
} from './providers/cinesrc';

export type {
  CineSrcEmbedOptions,
} from './providers/cinesrc';

export type {
  CineSrcMessageEvent,
  CineSrcEventData,
} from './providers/types';
