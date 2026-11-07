import React, { useState, useEffect, useRef } from 'react';
import { Film, User } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackSrc?: string;
  containerClassName?: string;
  isAvatar?: boolean;
}

const POSTER_PRESETS: Record<string, string> = {
  'avatar the way of water': 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
  'avatar': 'https://image.tmdb.org/t/p/w780/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg',
  'dune part two': 'https://image.tmdb.org/t/p/w780/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
  'dune 2': 'https://image.tmdb.org/t/p/w780/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
  'dune': 'https://image.tmdb.org/t/p/w780/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
  'severance': 'https://image.tmdb.org/t/p/w780/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg',
  'cyberpunk edgerunners': 'https://image.tmdb.org/t/p/w780/v3JuB15WybKmxDeT1hWdK3j6eSJ.jpg',
  'cyberpunk': 'https://image.tmdb.org/t/p/w780/v3JuB15WybKmxDeT1hWdK3j6eSJ.jpg',
  'shogun': 'https://image.tmdb.org/t/p/w780/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
  'shōgun': 'https://image.tmdb.org/t/p/w780/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
  'interstellar': 'https://image.tmdb.org/t/p/w780/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
  'arcane': 'https://image.tmdb.org/t/p/w780/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg',
  'arcane league of legends': 'https://image.tmdb.org/t/p/w780/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg',
  'oppenheimer': 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  'frieren': 'https://image.tmdb.org/t/p/w780/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
  'frieren beyond journey': 'https://image.tmdb.org/t/p/w780/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
  'the batman': 'https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg',
  'batman': 'https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg',
  'the last of us': 'https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
  'last of us': 'https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
  'blade runner 2049': 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  'blade runner': 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  'silo': 'https://image.tmdb.org/t/p/w780/r2QXomqKjkKHVtYGGtkf2l2Y7go.jpg',
  'spider man across the spider verse': 'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
  'spider man': 'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
  'spider verse': 'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
  'jujutsu kaisen': 'https://image.tmdb.org/t/p/w780/6qQzMJG27XOJsyAEEIisoJB45j2.jpg',
  'john wick chapter 4': 'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
  'john wick 4': 'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
  'john wick': 'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
  'house of the dragon': 'https://image.tmdb.org/t/p/w780/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg',
  'demon slayer': 'https://image.tmdb.org/t/p/w780/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
  'inception': 'https://image.tmdb.org/t/p/w780/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
  'stranger things': 'https://image.tmdb.org/t/p/w780/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
  'parasite': 'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  'poor things': 'https://image.tmdb.org/t/p/w780/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
  'anatomy of a fall': 'https://image.tmdb.org/t/p/w780/1ho0d4LNZw3Y0voeKmSvPSgJOJ2.jpg',
  'gladiator': 'https://image.tmdb.org/t/p/w780/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
  'deadpool': 'https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
  'deadpool wolverine': 'https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
  'game of thrones': 'https://image.tmdb.org/t/p/w780/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
  'breaking bad': 'https://image.tmdb.org/t/p/w780/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  'the dark knight': 'https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'fight club': 'https://image.tmdb.org/t/p/w780/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  'pulp fiction': 'https://image.tmdb.org/t/p/w780/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
  'the matrix': 'https://image.tmdb.org/t/p/w780/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
  'avengers endgame': 'https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  'avengers': 'https://image.tmdb.org/t/p/w780/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
};

// Guaranteed high-resolution cinematic artwork library
const CINEMATIC_FALLBACK_POSTERS = [
  'https://image.tmdb.org/t/p/w780/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg', // Dune 2
  'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', // Avatar 2
  'https://image.tmdb.org/t/p/w780/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg', // Severance
  'https://image.tmdb.org/t/p/w780/v3JuB15WybKmxDeT1hWdK3j6eSJ.jpg', // Cyberpunk
  'https://image.tmdb.org/t/p/w780/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg', // Shogun
  'https://image.tmdb.org/t/p/w780/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w780/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg', // Arcane
  'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman
  'https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg', // The Last of Us
  'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', // Spider-Verse
  'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', // John Wick 4
  'https://image.tmdb.org/t/p/w780/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg', // House of the Dragon
  'https://image.tmdb.org/t/p/w780/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg', // Inception
  'https://image.tmdb.org/t/p/w780/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg', // Stranger Things
  'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', // Parasite
  'https://image.tmdb.org/t/p/w780/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg', // Poor Things
  'https://image.tmdb.org/t/p/w780/1ho0d4LNZw3Y0voeKmSvPSgJOJ2.jpg', // Anatomy of a Fall
];

function lookupPreset(title?: string): string | undefined {
  if (!title) return undefined;
  const clean = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (POSTER_PRESETS[clean]) return POSTER_PRESETS[clean];
  for (const [k, v] of Object.entries(POSTER_PRESETS)) {
    if (clean.includes(k) || k.includes(clean)) return v;
  }
  return undefined;
}

function getCinematicFallbackPoster(title?: string): string {
  if (!title) return CINEMATIC_FALLBACK_POSTERS[0];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CINEMATIC_FALLBACK_POSTERS.length;
  return CINEMATIC_FALLBACK_POSTERS[index];
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackTitle,
  fallbackSrc,
  containerClassName = '',
  className = '',
  isAvatar: explicitIsAvatar,
  ...props
}) => {
  const isAvatar = explicitIsAvatar !== undefined 
    ? explicitIsAvatar 
    : (containerClassName.includes('rounded-full') || 
       containerClassName.includes('w-10') || 
       containerClassName.includes('w-9') || 
       containerClassName.includes('w-8'));

  const getInitialSrc = () => {
    if (src && typeof src === 'string' && src.trim() !== '' && !src.includes('undefined') && !src.includes('null')) {
      return src;
    }
    if (fallbackSrc && typeof fallbackSrc === 'string' && fallbackSrc.trim() !== '') {
      return fallbackSrc;
    }
    if (isAvatar) {
      return undefined;
    }
    const preset = lookupPreset(fallbackTitle || alt);
    if (preset) return preset;
    // Guaranteed cinematic fallback image so no card is ever a blank box
    return getCinematicFallbackPoster(fallbackTitle || alt);
  };

  const [currentSrc, setCurrentSrc] = useState<string | undefined>(getInitialSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [triedFallbackSrc, setTriedFallbackSrc] = useState(false);
  const [triedPreset, setTriedPreset] = useState(false);
  const [triedCinematicFallback, setTriedCinematicFallback] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync state whenever props change
  useEffect(() => {
    const initial = getInitialSrc();
    setCurrentSrc(initial);
    setHasError(!initial && isAvatar);
    setIsLoaded(false);
    setTriedFallbackSrc(false);
    setTriedPreset(false);
    setTriedCinematicFallback(false);
  }, [src, fallbackSrc, fallbackTitle, alt, isAvatar]);

  // Check if image is already cached/complete in DOM
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      setHasError(false);
    }
  }, [currentSrc]);

  const handleError = () => {
    // 1. Try fallbackSrc if provided
    if (fallbackSrc && currentSrc !== fallbackSrc && !triedFallbackSrc) {
      setTriedFallbackSrc(true);
      setCurrentSrc(fallbackSrc);
      return;
    }

    // 2. Try preset matching title
    if (!triedPreset) {
      setTriedPreset(true);
      const preset = lookupPreset(fallbackTitle || alt);
      if (preset && preset !== currentSrc) {
        setCurrentSrc(preset);
        return;
      }
    }

    // 3. For media posters, use guaranteed cinematic fallback poster so it is NEVER blank
    if (!isAvatar && !triedCinematicFallback) {
      setTriedCinematicFallback(true);
      const cinematicFallback = getCinematicFallbackPoster(fallbackTitle || alt);
      if (cinematicFallback !== currentSrc) {
        setCurrentSrc(cinematicFallback);
        return;
      }
    }

    // 4. Mark error
    setHasError(true);
  };

  const getInitials = (text?: string) => {
    if (!text) return 'CR';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className={`relative overflow-hidden bg-[#150F22] ${containerClassName}`}>
      {/* Background Pulse while loading */}
      {!isLoaded && !hasError && currentSrc && (
        <div className="absolute inset-0 bg-[#170E28] animate-pulse pointer-events-none" />
      )}

      {hasError || !currentSrc ? (
        isAvatar ? (
          /* Avatar Fallback: Elegant circle with gradient and initials */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-800 to-purple-950 text-white font-bold text-xs select-none shadow-inner">
            <span>{getInitials(fallbackTitle || alt)}</span>
          </div>
        ) : (
          /* Poster Fallback: Rich full-bleed cinematic card with title */
          <div className="w-full h-full flex flex-col items-center justify-between p-3.5 text-center bg-gradient-to-br from-[#1F1535] via-[#140E24] to-[#0A0712] border border-purple-900/40 select-none relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-fuchsia-600/20 rounded-full blur-2xl pointer-events-none" />

            <div className="w-full flex items-center justify-between text-[10px] text-purple-400/90 font-bold uppercase tracking-wider z-10">
              <span className="font-display">CRATOR</span>
              <span className="font-mono text-emerald-400 font-bold">4K</span>
            </div>

            <div className="flex flex-col items-center justify-center my-auto py-2 z-10 max-w-[95%]">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-500/40 flex items-center justify-center mb-2 shadow-lg text-purple-300">
                <Film className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold text-white line-clamp-3 leading-snug drop-shadow-sm">
                {fallbackTitle || alt || 'CRATOR Cinema'}
              </h4>
            </div>

            <div className="w-full pt-1.5 border-t border-white/10 text-[9px] text-[#8e8a91] tracking-widest uppercase font-mono z-10">
              VidRift 4K
            </div>
          </div>
        )
      ) : (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt || 'Media poster'}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover ${className}`}
          {...props}
        />
      )}
    </div>
  );
};
