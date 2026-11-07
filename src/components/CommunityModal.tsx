import React from 'react';
import { X, Send, Copy, ExternalLink } from 'lucide-react';

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
    onShowToast(`Redirecting to ${channelName}...`);
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('https://t.me/crator_official');
      onShowToast('Invite link copied to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0e0d11] rounded-2xl overflow-hidden border border-white/12 shadow-2xl p-6 md:p-8 space-y-6 text-[#f3f0ea]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white hover:text-black text-[#beb9bc] border border-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg font-display font-bold">
            <Send className="w-5 h-5 ml-0.5" />
          </div>
          <div>
            <span className="eyebrow block">COMMUNITY & UPDATES</span>
            <h2 className="font-display font-bold text-xl md:text-2xl text-white tracking-tight">
              CRATOR Community
            </h2>
            <p className="text-xs text-[#8e8a91]">
              Join the official discussion & streaming announcement channels
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#141316] border border-white/10 text-center">
          <div>
            <span className="text-xs text-[#8e8a91] block">Active Members</span>
            <span className="font-display font-bold text-base text-white">48,200+</span>
          </div>
          <div>
            <span className="text-xs text-[#8e8a91] block">Daily Releases</span>
            <span className="font-display font-bold text-base text-white">100+ 4K HDR</span>
          </div>
        </div>

        {/* Channels List */}
        <div className="space-y-2.5">
          {[
            {
              name: 'CRATOR Official Announcements',
              desc: 'Direct daily 4K drops, VidRift updates, and new series alert',
              tag: 'Main Channel',
            },
            {
              name: 'CRATOR Lounge & Requests',
              desc: 'Chat with other cinephiles, report broken links & request titles',
              tag: 'Discussion Hub',
            },
          ].map((ch) => (
            <div
              key={ch.name}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#141316] border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-white">{ch.name}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#beb9bc]">
                    {ch.tag}
                  </span>
                </div>
                <p className="text-[11px] text-[#8e8a91]">{ch.desc}</p>
              </div>

              <button
                onClick={() => handleJoin(ch.name)}
                className="primary-btn h-8 px-3 rounded-lg text-xs shrink-0"
              >
                <span>Join</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Copy Invite Link */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#141316] border border-white/10">
          <span className="text-xs font-mono text-[#8e8a91] truncate mr-2">
            https://t.me/crator_official
          </span>
          <button
            onClick={handleCopy}
            className="secondary-btn h-8 px-3 rounded-lg text-xs shrink-0 flex items-center gap-1.5"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
