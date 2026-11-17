import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  User,
  Check,
  Volume2,
  Monitor,
  Film,
  Sparkles,
} from 'lucide-react';
import { getTmdbStatus, TmdbStatus } from '../services/tmdb';

interface ProfileModalProps {
  isOpen?: boolean;
  standalone?: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onRefreshFeeds?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen = true,
  standalone = false,
  onClose,
  onShowToast,
  onRefreshFeeds,
}) => {
  const [profileName] = useState<string>('CRATOR Streamer');
  const [selectedQuality, setSelectedQuality] = useState<string>('4K Ultra HD (2160p)');
  const [selectedAudio, setSelectedAudio] = useState<string>('Dolby Atmos / Spatial');
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus | null>(null);

  useEffect(() => {
    if (standalone || isOpen) {
      getTmdbStatus().then(setTmdbStatus);
    }
  }, [standalone, isOpen]);

  if (!standalone && !isOpen) return null;

  const handleSave = () => {
    onShowToast('Streaming preferences updated');
    onRefreshFeeds?.();
    onClose();
  };

  const cardContent = (
    <div
      className={`glass-panel relative w-full max-w-2xl rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-[#f3f0ea] ${
        standalone ? 'overflow-hidden' : 'max-h-[92dvh] overflow-y-auto overscroll-contain'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {!standalone && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="glass-control absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-full text-[#c9c7cc] hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Profile Lockup */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl glass-pill-active flex items-center justify-center shadow-lg font-display font-bold">
          <User className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-xl md:text-2xl text-white tracking-tight">
              {profileName}
            </h1>
            <span className="glass-badge px-2.5 py-0.5 rounded-full text-[10px] font-mono text-white">
              4K HDR
            </span>
          </div>
          <p className="text-xs text-[#9a9ba1] mt-0.5 font-mono">
            Playback Configuration & Streaming Status
          </p>
        </div>
      </div>

      {/* Streaming Status */}
      <div className="glass-surface p-4 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="eyebrow flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            Playback Status
          </span>
          <span className="glass-badge text-[10px] font-mono px-2.5 py-0.5 rounded-full text-emerald-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>4K Adaptive Stream (Active)</span>
          </span>
        </div>
        <p className="text-xs text-[#9a9ba1] leading-relaxed">
          High-speed adaptive HLS streaming with multi-server failover and subtitles enabled automatically.
        </p>
      </div>

      {/* Catalog & Search Status */}
      <div className="space-y-2.5 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="eyebrow flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-white" />
            Live Catalog &amp; Search
          </span>
          {tmdbStatus && (
            <span
              className={`glass-badge text-[10px] font-mono px-2.5 py-0.5 rounded-full ${
                tmdbStatus.isVerified ? 'text-emerald-300' : 'text-[#c9c7cc]'
              }`}
            >
              {tmdbStatus.isVerified
                ? 'Active'
                : tmdbStatus.hasKey
                  ? 'Ready'
                  : 'Limited'}
            </span>
          )}
        </div>
        <p className="text-xs text-[#9a9ba1] leading-relaxed">
          Live catalog discovery, episode schedules, trailers, and instant search are synced automatically.
        </p>
      </div>

      {/* Streaming & Playback Preferences */}
      <div className="space-y-3.5 pt-3 border-t border-white/10">
        <span className="eyebrow block">Playback Preferences</span>

        <div className="space-y-1.5">
          <label className="text-xs text-[#c9c7cc] flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-white" />
            <span>Default Video Quality</span>
          </label>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            className="glass-control w-full min-h-[44px] sm:min-h-0 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-[#f3f0ea] font-medium focus:outline-none cursor-pointer"
          >
            <option value="4K Ultra HD (2160p)" className="bg-[#0e1118] text-white">
              4K Ultra HD (2160p) - Maximum Bitrate
            </option>
            <option value="1080p FHD" className="bg-[#0e1118] text-white">
              1080p FHD - Balanced
            </option>
            <option value="720p HD" className="bg-[#0e1118] text-white">
              720p HD - Data Saver
            </option>
            <option value="Auto" className="bg-[#0e1118] text-white">
              Auto (Adaptive Bitrate)
            </option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#c9c7cc] flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-white" />
            <span>Audio Format</span>
          </label>
          <select
            value={selectedAudio}
            onChange={(e) => setSelectedAudio(e.target.value)}
            className="glass-control w-full min-h-[44px] sm:min-h-0 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-[#f3f0ea] font-medium focus:outline-none cursor-pointer"
          >
            <option value="Dolby Atmos / Spatial" className="bg-[#0e1118] text-white">
              Dolby Atmos / Spatial Audio 7.1
            </option>
            <option value="5.1 Surround" className="bg-[#0e1118] text-white">
              Dolby Digital 5.1 Surround
            </option>
            <option value="Stereo" className="bg-[#0e1118] text-white">
              Stereo 2.0 (Headphones)
            </option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="secondary-btn min-h-[44px] sm:min-h-0 sm:h-9 flex-1 sm:flex-none px-4 rounded-xl text-xs"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="primary-btn min-h-[44px] sm:min-h-0 sm:h-9 flex-1 sm:flex-none px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save Settings</span>
        </button>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="page-shell w-full min-h-0 sm:min-h-[75vh] pt-24 pb-20 px-4 md:px-8 max-w-2xl mx-auto space-y-3 sm:space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glass-pill inline-flex items-center gap-2 min-h-[40px] sm:min-h-0 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="eyebrow">STREAM SETTINGS</span>
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
      aria-label="Stream Settings"
    >
      {cardContent}
    </div>
  );
};
