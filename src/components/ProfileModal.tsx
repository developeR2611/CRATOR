import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Check, 
  Volume2, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Film,
  Sparkles
} from 'lucide-react';
import { getTmdbStatus, updateTmdbServerKey, TmdbStatus } from '../services/tmdb';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onRefreshFeeds?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onRefreshFeeds,
}) => {
  const [profileName] = useState<string>('CRATOR Streamer');
  const [selectedQuality, setSelectedQuality] = useState<string>('4K Ultra HD (2160p)');
  const [selectedAudio, setSelectedAudio] = useState<string>('Dolby Atmos / Spatial');

  // TMDB API Key management
  const [tmdbKeyInput, setTmdbKeyInput] = useState<string>('');
  const [isVerifyingTmdb, setIsVerifyingTmdb] = useState<boolean>(false);
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus | null>(null);

  useEffect(() => {
    if (isOpen) {
      getTmdbStatus().then(setTmdbStatus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveTmdbKey = async () => {
    if (!tmdbKeyInput.trim()) {
      onShowToast('Please enter your TMDB API Key or Read Access Token');
      return;
    }

    setIsVerifyingTmdb(true);
    const res = await updateTmdbServerKey(tmdbKeyInput.trim());
    setIsVerifyingTmdb(false);

    onShowToast(res.message);
    const updated = await getTmdbStatus();
    setTmdbStatus(updated);
    setTmdbKeyInput('');
    if (res.verified) {
      onRefreshFeeds?.();
    }
  };

  const handleSave = () => {
    onShowToast('Streaming preferences updated');
    onRefreshFeeds?.();
    onClose();
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

        {/* Profile Lockup */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg font-display font-bold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-white tracking-tight">
                {profileName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white border border-white/15">
                VidRift 4K
              </span>
            </div>
            <p className="text-xs text-[#8e8a91] mt-0.5 font-mono">
              Playback Configuration & Streaming Status
            </p>
          </div>
        </div>

        {/* Streaming Provider Status */}
        <div className="p-3.5 rounded-xl bg-[#141316] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Streaming Engine
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-950/60 text-emerald-400 border-emerald-800/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>VidRift Embedded (Active)</span>
            </span>
          </div>
          <p className="text-xs text-[#8e8a91]">
            Powered by VidRift's high-speed adaptive HLS streaming engine with multi-server failover and subtitles. No key required.
          </p>
        </div>

        {/* TMDB API Key Integration Card */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-white" />
              TMDB API Key (Title Discovery & Metadata)
            </span>

            {tmdbStatus && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                tmdbStatus.isVerified 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                  : (tmdbStatus.hasKey ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-[#8e8a91] border-white/10')
              }`}>
                {tmdbStatus.isVerified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Active & Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>{tmdbStatus.hasKey ? 'Key Configured' : 'Key Optional'}</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#141316] border border-white/10 space-y-2">
            <label className="text-[11px] text-[#beb9bc] font-medium">
              TMDB API Key or Read Access Token (v3 or v4)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tmdbKeyInput}
                onChange={(e) => setTmdbKeyInput(e.target.value)}
                placeholder={tmdbStatus?.hasKey ? '••••••••••••••••' : 'Paste TMDB API Key...'}
                className="flex-1 bg-[#1a191d] border border-white/10 focus:border-white/40 rounded-xl px-3 py-2 text-xs text-white placeholder-[#77737a] focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleSaveTmdbKey}
                disabled={isVerifyingTmdb || !tmdbKeyInput.trim()}
                className="primary-btn h-8 px-3 rounded-lg text-xs font-semibold shrink-0 disabled:opacity-40"
              >
                {isVerifyingTmdb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-[#8e8a91]">
              Powers live posters, trending carousels, and cast photos.
            </p>
          </div>
        </div>

        {/* Streaming & Playback Preferences */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <span className="eyebrow block">
            Playback Preferences
          </span>

          <div className="space-y-1.5">
            <label className="text-xs text-[#beb9bc] flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-white" />
              <span>Default Video Quality</span>
            </label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="w-full bg-[#141316] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f3f0ea] font-medium focus:outline-none cursor-pointer"
            >
              <option value="4K Ultra HD (2160p)">4K Ultra HD (2160p) - Maximum Bitrate</option>
              <option value="1080p FHD">1080p FHD - Balanced</option>
              <option value="720p HD">720p HD - Data Saver</option>
              <option value="Auto">Auto (Adaptive Bitrate)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#beb9bc] flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-white" />
              <span>Audio Format</span>
            </label>
            <select
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              className="w-full bg-[#141316] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#f3f0ea] font-medium focus:outline-none cursor-pointer"
            >
              <option value="Dolby Atmos / Spatial">Dolby Atmos / Spatial Audio 7.1</option>
              <option value="5.1 Surround">Dolby Digital 5.1 Surround</option>
              <option value="Stereo">Stereo 2.0 (Headphones)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="secondary-btn h-9 px-4 rounded-xl text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="primary-btn h-9 px-5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
