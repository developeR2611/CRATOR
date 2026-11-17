import React, { useState } from 'react';
import { X, ChevronRight, Zap } from 'lucide-react';
import { GlassButton } from './GlassButton';

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
          <span className="glass-badge flex items-center gap-1 font-semibold text-white px-2.5 py-0.5 rounded-full shrink-0">
            <Zap className="w-3 h-3 text-white" />
            CRATOR
          </span>
          <p className="text-[#d6d3d9] truncate font-medium">
            Dolby Vision &amp; Spatial Audio now live across all 4K HDR streams · Weekly simulcast schedules updated.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onJoinCommunity && (
            <GlassButton
              variant="pill"
              size="sm"
              shape="pill"
              onClick={onJoinCommunity}
              className="hidden sm:inline-flex"
              rightIcon={<ChevronRight className="w-3 h-3" />}
            >
              <span>Join Telegram</span>
            </GlassButton>
          )}

          <GlassButton
            variant="icon"
            size="icon"
            shape="circle"
            onClick={() => setDismissed(true)}
            className="!w-7 !h-7"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </GlassButton>
        </div>
      </div>
    </div>
  );
};
