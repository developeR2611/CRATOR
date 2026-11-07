import { MediaItem } from '../../types';
import { getMovieBoxStream } from '../moviebox';
import { ProviderResolutionResult } from './types';

/**
 * Resolves playback for a MediaItem using MovieBox as alternative provider.
 * Strictly calls existing getMovieBoxStream and maps it into ProviderResolutionResult.
 */
export async function resolveMovieBoxPlayback(
  item: MediaItem,
  season = 0,
  episode = 0
): Promise<ProviderResolutionResult> {
  try {
    const result = await getMovieBoxStream(item.id, season, episode, item.title);

    if (result.error || !result.streamUrl) {
      return {
        provider: 'moviebox',
        mode: 'direct',
        title: item.title,
        subjectId: result.subjectId || item.movieBoxSubjectId || item.id,
        error: result.error || 'MovieBox API returned no playable stream.',
        errorCode: result.errorCode || 'MOVIEBOX_STREAM_UNAVAILABLE',
        seasonNumber: season > 0 ? season : undefined,
        episodeNumber: episode > 0 ? episode : undefined,
      };
    }

    return {
      provider: 'moviebox',
      mode: 'direct',
      streamUrl: result.streamUrl,
      streams: result.streams,
      format: result.format || 'mp4',
      subjectId: result.subjectId || item.movieBoxSubjectId || item.id,
      title: result.resolvedTitle || item.title,
      duration: result.duration,
      subtitles: result.subtitles,
      seasonNumber: season > 0 ? season : undefined,
      episodeNumber: episode > 0 ? episode : undefined,
    };
  } catch (err: any) {
    return {
      provider: 'moviebox',
      mode: 'direct',
      title: item.title,
      subjectId: item.movieBoxSubjectId || item.id,
      error: err.message || 'MovieBox network request failed.',
      errorCode: 'MOVIEBOX_REQUEST_FAILED',
      seasonNumber: season > 0 ? season : undefined,
      episodeNumber: episode > 0 ? episode : undefined,
    };
  }
}
