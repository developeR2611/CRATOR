import React from 'react';
import { Play, Sparkles, Clock } from 'lucide-react';
import { NEW_EPISODES, NewEpisodeItem } from '../data/mockData';
import { MediaItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface NewEpisodesProps {
  mediaCatalog: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
}

export const NewEpisodes: React.FC<NewEpisodesProps> = ({
  mediaCatalog,
  onPlay,
  onOpenDetails,
}) => {
  return (
    <section className="w-full py-4 space-y-3.5">
      <div className="flex items-center justify-between px-4 md:px-8">
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-white tracking-tight flex items-center gap-2">
            <span>New Episodes</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-fuchsia-400 bg-fuchsia-950/50 px-2 py-0.5 rounded-md border border-fuchsia-800/40">
              <Sparkles className="w-3 h-3" />
              Simulcast
            </span>
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Freshly dropped episodes available in 4K HDR
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-8">
        {NEW_EPISODES.map((ep: NewEpisodeItem) => {
          const media = mediaCatalog.find((m) => m.id === ep.mediaId);

          return (
            <div
              key={ep.id}
              onClick={() => {
                if (media) onOpenDetails(media);
              }}
              className="group relative bg-[#120D1D] rounded-xl overflow-hidden border border-purple-900/30 hover:border-purple-500/50 shadow-md transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* 16:9 Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden">
                <ImageWithFallback
                  src={ep.thumbnail}
                  alt={ep.episodeTitle}
                  fallbackTitle={ep.showTitle}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 group-hover:from-black/90 transition-colors" />

                {/* Top Badge: Update status & Platform */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-fuchsia-600/90 text-white shadow-sm">
                    {ep.statusBadge}
                  </span>
                  <span className="text-[10px] font-medium bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-purple-300 border border-purple-500/20">
                    {ep.platform}
                  </span>
                </div>

                {/* Play button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (media) onPlay(media);
                  }}
                  className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-purple-950/80 transform group-hover:scale-110 active:scale-95 transition-transform"
                  title="Play Episode"
                  aria-label="Play episode"
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </button>

                {/* Bottom Left: Season / Episode Indicator */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span className="text-purple-400 font-mono">{ep.seasonEpisode}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-purple-200/80">{ep.runtime}</span>
                </div>
              </div>

              {/* Episode Info */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                    {ep.showTitle}
                  </h4>
                  <p className="text-xs text-purple-200/70 truncate mt-0.5">
                    {ep.episodeTitle}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-purple-300/50 mt-2.5 pt-2 border-t border-purple-900/30">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Added {ep.updatedTime}</span>
                  </span>
                  <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform">
                    Watch →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
