import React, { useEffect } from 'react';
import { ArrowLeft, X, Send, Copy, ExternalLink } from 'lucide-react';

interface CommunityModalProps {
  isOpen?: boolean;
  standalone?: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen = true,
  standalone = false,
  onClose,
  onShowToast,
}) => {
  useEffect(() => {
    if (standalone || !isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [standalone, isOpen, onClose]);

  if (!standalone && !isOpen) return null;

  const handleJoin = (channelName: string) => {
    onShowToast(`Redirecting to ${channelName}...`);
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('https://t.me/crator_official');
      onShowToast('Invite link copied to clipboard');
    }
  };

  const cardContent = (
    <div
      className={`glass-panel relative w-full max-w-2xl rounded-2xl p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 text-[#f3f0ea] ${
        standalone ? 'overflow-hidden' : 'max-h-[92dvh] overflow-y-auto overscroll-contain'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {!standalone && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close community modal"
          className="glass-control absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-full text-[#c9c7cc] hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Icon & Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl glass-pill-active flex items-center justify-center shadow-lg font-display font-bold">
          <Send className="w-5 h-5 ml-0.5" />
        </div>
        <div>
          <span className="eyebrow block">COMMUNITY & UPDATES</span>
          <h1 className="font-display font-bold text-xl md:text-2xl text-white tracking-tight">
            CRATOR Community
          </h1>
          <p className="text-xs text-[#9a9ba1]">
            Join the official discussion & streaming announcement channels
          </p>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="glass-surface grid grid-cols-2 gap-3 p-3.5 rounded-xl text-center">
        <div>
          <span className="text-xs text-[#9a9ba1] block">Active Members</span>
          <span className="font-display font-bold text-base text-white">48,200+</span>
        </div>
        <div>
          <span className="text-xs text-[#9a9ba1] block">Daily Releases</span>
          <span className="font-display font-bold text-base text-white">100+ 4K HDR</span>
        </div>
      </div>

      {/* Channels List */}
      <div className="space-y-2.5">
        {[
          {
            name: 'CRATOR Official Announcements',
            desc: 'Direct daily 4K drops, platform updates, and new series alerts',
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
            className="glass-surface glass-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl"
          >
            <div className="space-y-0.5 sm:pr-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-semibold text-white">{ch.name}</h4>
                <span className="glass-badge text-[10px] font-mono px-2 py-0.5 rounded-full text-[#c9c7cc]">
                  {ch.tag}
                </span>
              </div>
              <p className="text-[11px] text-[#9a9ba1]">{ch.desc}</p>
            </div>

            <button
              type="button"
              onClick={() => handleJoin(ch.name)}
              className="primary-btn min-h-[40px] sm:min-h-0 sm:h-8 w-full sm:w-auto px-3 rounded-lg text-xs shrink-0"
            >
              <span>Join</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Copy Invite Link */}
      <div className="glass-surface flex items-center justify-between gap-2 p-3 rounded-xl">
        <span className="text-xs font-mono text-[#9a9ba1] truncate min-w-0 flex-1">
          https://t.me/crator_official
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="secondary-btn min-h-[40px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs shrink-0 flex items-center gap-1.5"
        >
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </button>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="page-shell w-full min-h-[75vh] pt-24 pb-20 px-4 md:px-8 max-w-2xl mx-auto space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glass-pill inline-flex items-center gap-2 min-h-[40px] sm:min-h-0 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="eyebrow">COMMUNITY</span>
        </div>
        {cardContent}
      </div>
    );
  }

  return (
    <div
      className="glass-backdrop fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="CRATOR Community"
    >
      {cardContent}
    </div>
  );
};
