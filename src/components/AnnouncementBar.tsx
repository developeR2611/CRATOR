import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, Zap } from 'lucide-react';

interface AnnouncementBarProps {
  onJoinCommunity?: () => void;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ onJoinCommunity }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-purple-950 via-[#1F1133] to-purple-950 border-b border-purple-800/30 text-xs px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 truncate">
          <span className="flex items-center gap-1 font-semibold text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded-md border border-purple-700/40 shrink-0">
            <Zap className="w-3 h-3 text-fuchsia-400" />
            CRATOR v2.4
          </span>
          <p className="text-purple-200/90 truncate font-medium">
            Dolby Vision & Spatial Audio now live across all 4K HDR streams · Weekly simulcast schedules updated.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onJoinCommunity && (
            <button
              onClick={onJoinCommunity}
              className="hidden sm:flex items-center gap-1 text-purple-300 hover:text-white font-medium hover:underline cursor-pointer"
            >
              <span>Join Telegram</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-purple-300/60 hover:text-white hover:bg-purple-900/40 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
