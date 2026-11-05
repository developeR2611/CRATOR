import React from 'react';
import { X, Send, Users, Bell, MessageSquare, Sparkles, Check, ExternalLink } from 'lucide-react';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const handleJoin = (channelName: string) => {
    onShowToast(`Joined ${channelName}! Welcome to the CRATOR community.`);
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('https://t.me/crator_official');
      onShowToast('Telegram invite link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0F0B1C] rounded-2xl overflow-hidden border border-purple-900/40 shadow-2xl p-6 md:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black text-purple-200/80 hover:text-white border border-purple-900/40 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
            <Send className="w-6 h-6 ml-0.5" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl md:text-2xl text-white tracking-tight">
              CRATOR Community
            </h2>
            <p className="text-xs text-purple-300/70">
              Official Telegram Channels & Discussion Hubs
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#160F28] border border-purple-900/30 text-center">
          <div>
            <span className="text-xs text-purple-300/60 block">Global Members</span>
            <span className="font-display font-bold text-lg text-white">48,450+</span>
          </div>
          <div>
            <span className="text-xs text-purple-300/60 block">Online Now</span>
            <span className="font-display font-bold text-lg text-emerald-400">2,840</span>
          </div>
        </div>

        {/* Channels List */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300/60 block">
            Select Channel
          </span>

          {[
            {
              id: 'releases',
              title: 'CRATOR 4K Releases & Alerts',
              desc: 'Instant notifications when new 4K episodes and films drop',
              icon: <Bell className="w-4 h-4 text-purple-400" />,
            },
            {
              id: 'lounge',
              title: 'Cinephile Chat & Requests',
              desc: 'Discuss plot twists, request remasters, and share reviews',
              icon: <MessageSquare className="w-4 h-4 text-sky-400" />,
            },
            {
              id: 'anime',
              title: 'CRATOR Anime & Simulcast',
              desc: 'Weekly episode drops, sub/dub announcements & schedules',
              icon: <Sparkles className="w-4 h-4 text-fuchsia-400" />,
            },
          ].map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#140E22] border border-purple-900/30 hover:border-purple-500/40 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden pr-2">
                <div className="p-2 rounded-lg bg-purple-950/60 shrink-0">
                  {channel.icon}
                </div>
                <div className="text-left overflow-hidden">
                  <h4 className="text-xs font-semibold text-white truncate">{channel.title}</h4>
                  <p className="text-[11px] text-purple-200/60 truncate">{channel.desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleJoin(channel.title)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              >
                Join
              </button>
            </div>
          ))}
        </div>

        {/* Copy Invite Link */}
        <div className="pt-2 flex items-center justify-between border-t border-purple-900/40">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Copy Telegram Link</span>
          </button>

          <span className="text-[11px] text-purple-400/50">
            t.me/crator_official
          </span>
        </div>
      </div>
    </div>
  );
};
