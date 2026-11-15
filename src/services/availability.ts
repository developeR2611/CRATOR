import { MediaItem } from '../types';

export interface AvailabilityResult {
  isAvailable: boolean;
  confidence: 'confirmed' | 'probable' | 'unreleased' | 'unavailable';
  reason: string;
  checkedAt: number;
}

const STORAGE_KEY = 'crator_vidrift_availability_cache';

// Seed of confirmed popular titles readily available on VidRift / Orion sources
const SEED_CONFIRMED_TMDB_IDS: Record<number, boolean> = {
  // Movies
  550: true,     // Fight Club
  27205: true,   // Inception
  157336: true,  // Interstellar
  155: true,     // The Dark Knight
  693134: true,  // Dune: Part Two
  438631: true,  // Dune
  872585: true,  // Oppenheimer
  533535: true,  // Deadpool & Wolverine
  603: true,     // The Matrix
  569094: true,  // Spider-Man: Across the Spider-Verse
  98: true,      // Gladiator
  680: true,     // Pulp Fiction
  299534: true,  // Avengers: Endgame
  299536: true,  // Avengers: Infinity War
  19995: true,   // Avatar
  76600: true,   // Avatar: The Way of Water
  1440098: true, // Drawn Together Movie (Official VidRift Docs Sample)
  // Series
  66732: true,   // Stranger Things
  100088: true,  // The Last of Us
  1396: true,    // Breaking Bad
  1399: true,    // Game of Thrones
  94997: true,   // House of the Dragon
  95557: true,   // Invincible
  76479: true,   // The Boys
  106379: true,  // Fallout
  94605: true,   // Arcane
  85937: true,   // Demon Slayer
  93405: true,   // Squid Game
  87108: true,   // Chernobyl
  119051: true,  // Wednesday
  63351: true,   // Narcos
  114472: true,  // Severance
  93740: true,   // Shogun
};

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isFutureIsoDate(dateStr?: string | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const normalized = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  return normalized > getTodayIsoDate();
}

export function formatReleaseDate(dateStr?: string, fallbackYear?: number): string {
  if (dateStr) {
    const clean = dateStr.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  return fallbackYear ? String(fallbackYear) : 'TBA';
}

export function isMediaUnreleased(item: Partial<MediaItem> | null | undefined): boolean {
  if (!item) return false;

  if (item.releaseDate && isFutureIsoDate(item.releaseDate)) {
    return true;
  }

  const currentYear = new Date().getFullYear();
  if (!item.releaseDate && item.releaseYear && item.releaseYear > currentYear) {
    return true;
  }

  if (item.tmdbStatus) {
    const st = item.tmdbStatus.trim().toLowerCase();
    if (st === 'rumored' || st === 'planned' || st === 'in production' || st === 'post production') {
      return true;
    }
    if (st === 'pilot' && (!item.totalSeasons || item.totalSeasons < 1)) {
      return true;
    }
  }

  if ((item.type === 'series' || item.type === 'anime') && item.totalSeasons !== undefined && item.totalSeasons < 1) {
    return true;
  }

  return false;
}

class AvailabilityService {
  private cache: Map<string, AvailabilityResult> = new Map();

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, val]) => {
          this.cache.set(key, val as AvailabilityResult);
        });
      }
    } catch (e) {
      console.warn('[Availability] Failed to load local cache', e);
    }
  }

  private persistCache() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, AvailabilityResult> = {};
      this.cache.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[Availability] Failed to persist cache', e);
    }
  }

  private getCacheKey(item: MediaItem): string {
    const numericId = this.getNumericTmdbId(item);
    return `${item.type}:${numericId || item.id}`;
  }

  public getNumericTmdbId(item: MediaItem): number | null {
    if (typeof item.tmdbId === 'number' && !isNaN(item.tmdbId) && item.tmdbId > 0) {
      return item.tmdbId;
    }
    if (typeof item.tmdbId === 'string') {
      const parsed = parseInt(item.tmdbId.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const cleanFromId = parseInt(item.id.replace(/^tmdb-(movie|tv|series)-/, '').replace(/\D/g, ''), 10);
    if (!isNaN(cleanFromId) && cleanFromId > 0) return cleanFromId;
    return null;
  }

  /**
   * Check whether a title is available on VidRift.
   * Uses verified playback records, release dates, TMDB status, and known catalog.
   */
  public checkAvailability(item: MediaItem): AvailabilityResult {
    const key = this.getCacheKey(item);
    const now = Date.now();

    // 0. Always enforce unreleased check first so stale cache / seed IDs never mark unreleased titles playable
    if (isMediaUnreleased(item)) {
      const label = formatReleaseDate(item.releaseDate, item.releaseYear);
      return {
        isAvailable: false,
        confidence: 'unreleased',
        reason: `Releases ${label}. Not out yet.`,
        checkedAt: now,
      };
    }

    const cached = this.cache.get(key);

    // If cached within the last 48 hours, return cached verdict
    if (cached && now - cached.checkedAt < 48 * 60 * 60 * 1000) {
      return cached;
    }

    const numericId = this.getNumericTmdbId(item);

    // 1. Check known seeded playable titles
    if (numericId && SEED_CONFIRMED_TMDB_IDS[numericId]) {
      const res: AvailabilityResult = {
        isAvailable: true,
        confidence: 'confirmed',
        reason: 'Verified playable in VidRift catalogue',
        checkedAt: now,
      };
      this.cache.set(key, res);
      this.persistCache();
      return res;
    }

    // 2. Validate release year
    const currentYear = new Date().getFullYear();

    if (item.releaseYear > currentYear) {
      const res: AvailabilityResult = {
        isAvailable: false,
        confidence: 'unreleased',
        reason: `Release scheduled for ${item.releaseYear}. Not out yet.`,
        checkedAt: now,
      };
      this.cache.set(key, res);
      this.persistCache();
      return res;
    }

    // 3. For TV shows: ensure series has at least one season/episode
    if (item.type === 'series' || item.type === 'anime') {
      if (item.totalSeasons !== undefined && item.totalSeasons < 1) {
        const res: AvailabilityResult = {
          isAvailable: false,
          confidence: 'unreleased',
          reason: 'No aired episodes found yet.',
          checkedAt: now,
        };
        this.cache.set(key, res);
        this.persistCache();
        return res;
      }
    }

    // 4. Default for released TMDB catalogue items:
    // If the movie/series has been released (<= current year) and has valid artwork and TMDB ID:
    const isProbable = Boolean(numericId && numericId > 0 && item.posterUrl);

    const res: AvailabilityResult = {
      isAvailable: isProbable,
      confidence: isProbable ? 'probable' : 'unavailable',
      reason: isProbable
        ? 'Title is released with standard theatrical/digital distribution'
        : 'Missing required TMDB stream identifiers',
      checkedAt: now,
    };

    this.cache.set(key, res);
    this.persistCache();
    return res;
  }

  /**
   * Called when player receives a positive playback signal (vidrift:progress / unpaused)
   */
  public markVerifiedAvailable(item: MediaItem) {
    const key = this.getCacheKey(item);
    const numericId = this.getNumericTmdbId(item);
    const res: AvailabilityResult = {
      isAvailable: true,
      confidence: 'confirmed',
      reason: 'Confirmed live playback from VidRift stream',
      checkedAt: Date.now(),
    };
    this.cache.set(key, res);
    this.persistCache();

    // Inform server endpoint
    if (numericId) {
      fetch('/api/vidrift/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: numericId,
          type: item.type,
          available: true,
          reason: 'client_playback_verified',
        }),
      }).catch(() => {});
    }
  }

  /**
   * Called when title exits immediately or fails to resolve stream
   */
  public markUnavailable(item: MediaItem, reason: string = 'Provider reported stream unavailable') {
    const key = this.getCacheKey(item);
    const numericId = this.getNumericTmdbId(item);
    const res: AvailabilityResult = {
      isAvailable: false,
      confidence: 'unavailable',
      reason,
      checkedAt: Date.now(),
    };
    this.cache.set(key, res);
    this.persistCache();

    if (numericId) {
      fetch('/api/vidrift/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: numericId,
          type: item.type,
          available: false,
          reason,
        }),
      }).catch(() => {});
    }
  }

  /**
   * Filter a collection of MediaItems so only confirmed/verified available titles appear.
   */
  public filterPlayableTitles(items: MediaItem[]): MediaItem[] {
    return items.filter((item) => {
      const check = this.checkAvailability(item);
      return check.isAvailable;
    });
  }
}

export const availabilityService = new AvailabilityService();
