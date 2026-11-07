import { 
  extractTmdbNumericId, 
  buildVidRiftMovieUrl, 
  buildVidRiftTvUrl, 
  buildVidRiftAnimeUrl, 
  isVidRiftOrigin,
  resolveVidRiftPlayback 
} from '../src/services/vidrift';
import { MediaItem } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('--- Testing VidRift ID Extraction ---');
assert(extractTmdbNumericId(1440098) === 1440098, 'Numeric ID extracted correctly');
assert(extractTmdbNumericId('1440098') === 1440098, 'String integer extracted correctly');
assert(extractTmdbNumericId('tmdb-movie-1440098') === 1440098, 'Prefixed tmdb-movie- ID extracted');
assert(extractTmdbNumericId('tmdb-tv-1399') === 1399, 'Prefixed tmdb-tv- ID extracted');
assert(extractTmdbNumericId('invalid-string') === null, 'Invalid string returns null');

console.log('\n--- Testing VidRift Embed URL Builders ---');
const movieUrl = buildVidRiftMovieUrl(1440098, {
  brand: 'CRATOR',
  brandColor: 'f3f0ea',
  showTitle: true,
  exit: true,
  autoplay: false,
});
assert(
  movieUrl.startsWith('https://embed.vidrift.net/embed/movie/1440098'),
  'Movie URL starts with correct embed endpoint'
);
assert(movieUrl.includes('brand=CRATOR'), 'Movie URL includes brand parameter');
assert(movieUrl.includes('brandColor=f3f0ea'), 'Movie URL includes brandColor parameter');
assert(movieUrl.includes('exit=1'), 'Movie URL includes exit=1 parameter');
assert(movieUrl.includes('autoplay=0'), 'Movie URL includes autoplay=0 parameter');

const tvUrl = buildVidRiftTvUrl(1399, 2, 4, {
  brand: 'CRATOR',
  brandColor: 'f3f0ea',
});
assert(
  tvUrl.startsWith('https://embed.vidrift.net/embed/tv/1399/2/4'),
  'TV URL contains season 2 and episode 4'
);

const animeUrl = buildVidRiftAnimeUrl(16498, 1, {
  brand: 'CRATOR',
});
assert(
  animeUrl.startsWith('https://embed.vidrift.net/embed/anilist/16498/1'),
  'Anime URL contains anilist ID and episode 1'
);

console.log('\n--- Testing Origin Validation ---');
assert(isVidRiftOrigin('https://embed.vidrift.net') === true, 'Exact VidRift embed origin matches');
assert(isVidRiftOrigin('https://embed.vidrift.net/') === false, 'Origin with trailing slash rejected');
assert(isVidRiftOrigin('https://cinesrc.st') === false, 'Old CineSRC origin rejected');
assert(isVidRiftOrigin('https://malicious-site.com') === false, 'Arbitrary origin rejected');

console.log('\n--- Testing Playback Resolution on MediaItems ---');
const testMovieItem: MediaItem = {
  id: 'dune-2',
  tmdbId: 693134,
  title: 'Dune: Part Two',
  type: 'movie',
  releaseYear: 2024,
  rating: 8.6,
  voteCount: '4.5K',
  synopsis: 'Paul Atreides unites with Chani and the Fremen...',
  runtime: '2h 46m',
  ageRating: 'PG-13',
  quality: '4K Ultra HD',
  audio: 'Dolby Atmos',
  genres: ['Sci-Fi', 'Adventure'],
  platform: 'HBO Max',
  industry: 'Hollywood',
  language: 'English',
  cast: [],
  posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/original/8bcoRX3hQRHufLzyRE59MVooaoi.jpg',
};

const movieRes = resolveVidRiftPlayback(testMovieItem);
assert(!movieRes.error, 'Movie resolved without error');
assert(movieRes.tmdbId === 693134, 'Resolved correct TMDB ID 693134');
assert(movieRes.embedUrl.includes('/embed/movie/693134'), 'Generated movie embed URL');

const testTvItem: MediaItem = {
  id: 'severance',
  tmdbId: 95557,
  title: 'Severance',
  type: 'series',
  releaseYear: 2022,
  rating: 8.7,
  voteCount: '2.1K',
  synopsis: 'Mark leads a team of office workers...',
  ageRating: 'TV-MA',
  quality: '4K Ultra HD',
  audio: 'Dolby Atmos',
  genres: ['Sci-Fi', 'Mystery'],
  platform: 'Apple TV+',
  industry: 'Hollywood',
  language: 'English',
  cast: [],
  posterUrl: 'https://image.tmdb.org/t/p/w500/A31s6hR292uB42k3G1p1p.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/original/9faGSFi5jam6pDWGNd0ip80ioSO.jpg',
};

const tvRes = resolveVidRiftPlayback(testTvItem, 1, 3);
assert(!tvRes.error, 'TV show resolved without error');
assert(tvRes.embedUrl.includes('/embed/tv/95557/1/3'), 'Generated TV embed URL with S1:E3');

console.log('\n🎉 ALL VIDRIFT TESTS PASSED SUCCESSFULLY!');
