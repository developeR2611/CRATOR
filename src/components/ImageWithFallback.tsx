import React, { useState, useEffect } from 'react';
import { Film, User } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackTitle,
  fallbackSrc,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src || fallbackSrc);
  const [triedFallbackSrc, setTriedFallbackSrc] = useState(false);
  const [triedTmdbResize, setTriedTmdbResize] = useState(false);

  // Sync state whenever the src or fallbackSrc prop changes
  useEffect(() => {
    const initial = src || fallbackSrc;
    setCurrentSrc(initial);
    setHasError(!initial || initial.trim() === '');
    setIsLoaded(false);
    setTriedFallbackSrc(false);
    setTriedTmdbResize(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    // 1. If TMDB image resolution failed, try smaller TMDB size first
    if (currentSrc && currentSrc.includes('image.tmdb.org') && !triedTmdbResize) {
      setTriedTmdbResize(true);
      if (currentSrc.includes('/w780/')) {
        setCurrentSrc(currentSrc.replace('/w780/', '/w500/'));
        return;
      } else if (currentSrc.includes('/w1280/')) {
        setCurrentSrc(currentSrc.replace('/w1280/', '/w780/'));
        return;
      }
    }

    // 2. If primary src failed and fallbackSrc exists and has not been tried yet
    if (fallbackSrc && currentSrc !== fallbackSrc && !triedFallbackSrc) {
      setTriedFallbackSrc(true);
      setCurrentSrc(fallbackSrc);
      return;
    }

    // 3. Render polished CRATOR placeholder card
    setHasError(true);
  };

  // Determine if this is an avatar image by class hint
  const isAvatar = containerClassName.includes('rounded-full') || 
                   containerClassName.includes('w-10') || 
                   containerClassName.includes('w-9') || 
                   containerClassName.includes('w-8');

  // Generate initials for avatar fallback
  const getInitials = (text?: string) => {
    if (!text) return 'CR';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className={`relative overflow-hidden bg-[#150F22] ${containerClassName}`}>
      {/* Skeleton / Gradient Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-tr from-[#120D1D] via-[#1F1633] to-[#120D1D] animate-pulse" />
      )}

      {hasError || !currentSrc ? (
        isAvatar ? (
          /* Avatar Fallback */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-800 to-indigo-900 text-white font-bold text-xs select-none">
            {getInitials(fallbackTitle || alt)}
          </div>
        ) : (
          /* Rich Cinematic Poster Fallback Card */
          <div className="w-full h-full flex flex-col items-center justify-between p-3.5 text-center bg-gradient-to-br from-[#1C142E] via-[#140E24] to-[#0A0712] border border-purple-900/40 select-none relative overflow-hidden group">
            {/* Subtle glow background */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-fuchsia-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Top brand header */}
            <div className="w-full flex items-center justify-between text-[10px] text-purple-400/80 font-bold uppercase tracking-wider z-10">
              <span className="font-display">CRATOR</span>
              <span className="font-mono text-purple-400/60">4K</span>
            </div>

            {/* Center icon & Title */}
            <div className="flex flex-col items-center justify-center my-auto py-2 z-10 max-w-[95%]">
              <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center mb-2 shadow-inner text-purple-300">
                <Film className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold text-white line-clamp-3 leading-snug drop-shadow-sm">
                {fallbackTitle || alt || 'CRATOR Cinema'}
              </h4>
            </div>

            {/* Bottom film tag */}
            <div className="w-full pt-1.5 border-t border-purple-900/30 text-[9px] text-purple-300/60 tracking-widest uppercase font-mono z-10">
              Ultra HD
            </div>
          </div>
        )
      ) : (
        <img
          src={currentSrc}
          alt={alt || 'Media poster'}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`transition-opacity duration-300 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          {...props}
        />
      )}
    </div>
  );
};
