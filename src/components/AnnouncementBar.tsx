import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, Zap } from 'lucide-react';

interface AnnouncementBarProps {
  onJoinCommunity?: () => void;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ onJoinCommunity }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="glass-panel relative w-full text-xs px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 truncate">
          <span className="flex items-center gap-1 font-semibold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 shrink-0">
            <Zap className="w-3 h-3 text-white" />
            CRATOR
          </span>
          <p className="text-[#d6d3d9] truncate font-medium">
            Dolby Vision & Spatial Audio now live across all 4K HDR streams · Weekly simulcast schedules updated.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onJoinCommunity && (
            <button
              onClick={onJoinCommunity}
              className="hidden sm:flex items-center gap-1 text-[#c9c6cc] hover:text-white font-medium hover:underline cursor-pointer"
            >
              <span>Join Telegram</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full text-[#9a989e] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
