import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Check, 
  Key, 
  Sliders, 
  Volume2, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Film
} from 'lucide-react';
import { getMovieBoxConfigStatus, updateMovieBoxServerSecret, MovieBoxStatus } from '../services/moviebox';
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
  const [profileName, setProfileName] = useState<string>('Alex Rivera');
  const [selectedQuality, setSelectedQuality] = useState<string>('4K Ultra HD (2160p)');
  const [selectedAudio, setSelectedAudio] = useState<string>('Dolby Atmos / Spatial');
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string>('English');
  const [hardwareAcceleration, setHardwareAcceleration] = useState<boolean>(true);

  // MovieBox API Secret management
  const [workerSecretInput, setWorkerSecretInput] = useState<string>('');
  const [adminTokenInput, setAdminTokenInput] = useState<string>('');
  const [isVerifyingWorker, setIsVerifyingWorker] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<MovieBoxStatus | null>(null);

  // TMDB API Key management
  const [tmdbKeyInput, setTmdbKeyInput] = useState<string>('');
  const [isVerifyingTmdb, setIsVerifyingTmdb] = useState<boolean>(false);
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus | null>(null);

  useEffect(() => {
    if (isOpen) {
      getMovieBoxConfigStatus().then(setApiStatus);
      getTmdbStatus().then(setTmdbStatus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveWorkerSecret = async () => {
    if (!workerSecretInput.trim()) {
      onShowToast('Please enter your MovieBox Worker Secret');
      return;
    }
    if (!adminTokenInput.trim()) {
      onShowToast('Enter the CRATOR admin token configured on the server');
      return;
    }

    setIsVerifyingWorker(true);
    const res = await updateMovieBoxServerSecret(workerSecretInput.trim(), adminTokenInput.trim());
    setIsVerifyingWorker(false);

    onShowToast(res.message);
    const updated = await getMovieBoxConfigStatus();
    setApiStatus(updated);
    setWorkerSecretInput('');
    setAdminTokenInput('');
    if (res.verified) {
      onRefreshFeeds?.();
    }
  };

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
    onShowToast('Streaming preferences updated successfully');
    onRefreshFeeds?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0E0A1A] rounded-2xl overflow-hidden border border-purple-900/40 shadow-2xl p-6 md:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black text-purple-200/80 hover:text-white border border-purple-900/40 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Lockup */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 p-[2px] shadow-lg shadow-purple-900/50">
            <div className="w-full h-full bg-[#120D1D] rounded-[14px] flex items-center justify-center">
              <User className="w-7 h-7 text-purple-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-xl text-white tracking-tight">
                {profileName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40">
                VIP 4K
              </span>
            </div>
            <p className="text-xs text-purple-300/60 mt-0.5">
              Active Member · Dolby Vision Master Pass
            </p>
          </div>
        </div>

        {/* TMDB API Key Integration Card */}
        <div className="space-y-3 pt-2 border-t border-purple-950/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300/60 uppercase tracking-wider flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              TMDB API Key (The Movie Database)
            </span>

            {tmdbStatus && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                tmdbStatus.isVerified 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                  : (tmdbStatus.hasKey ? 'bg-sky-950/60 text-sky-300 border-sky-800/40' : 'bg-purple-950/60 text-purple-300 border-purple-800/40')
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

          <div className="p-3 rounded-xl bg-[#150F24] border border-purple-900/30 space-y-2">
            <label className="text-[11px] text-purple-200/80 font-medium">
              TMDB API Key or Read Access Token (v3 or v4)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tmdbKeyInput}
                onChange={(e) => setTmdbKeyInput(e.target.value)}
                placeholder={tmdbStatus?.hasKey ? '••••••••••••••••' : 'Paste TMDB API Key or Token...'}
                className="flex-1 bg-[#1A122B] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveTmdbKey}
                disabled={isVerifyingTmdb || !tmdbKeyInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isVerifyingTmdb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Save & Test</span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-purple-300/50">
              Powers live 4K posters, trending feeds, cast avatars, and detailed plot metadata.
            </p>
          </div>
        </div>

        {/* MovieBox API Worker Key Integration */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300/60 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              MovieBox Cloudflare Worker
            </span>

            {apiStatus && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                apiStatus.isVerified 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                  : (apiStatus.hasSecret ? 'bg-sky-950/60 text-sky-300 border-sky-800/40' : 'bg-amber-950/60 text-amber-300 border-amber-800/40')
              }`}>
                {apiStatus.isVerified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Connected & Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>{apiStatus.hasSecret ? 'Secret Configured' : 'Secret Required'}</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#150F24] border border-purple-900/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-purple-300/70">
              <span>Endpoint:</span>
              <span className="font-mono text-purple-200 truncate max-w-[240px]">
                {apiStatus?.apiUrl || 'https://spun-moviebox.ravi-crator.workers.dev'}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-purple-200/80 font-medium">CRATOR Admin Token</label>
              <input
                type="password"
                value={adminTokenInput}
                onChange={(e) => setAdminTokenInput(e.target.value)}
                placeholder="Server CRATOR_ADMIN_TOKEN"
                autoComplete="off"
                className="w-full bg-[#1A122B] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-purple-200/80 font-medium">
                Update Worker Secret (X-Worker-Secret header)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={workerSecretInput}
                  onChange={(e) => setWorkerSecretInput(e.target.value)}
                  placeholder={apiStatus?.hasSecret ? '••••••••••••••••' : 'Enter MOVIEBOX_SECRET...'}
                  className="flex-1 bg-[#1A122B] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveWorkerSecret}
                  disabled={isVerifyingWorker || !workerSecretInput.trim() || !adminTokenInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isVerifyingWorker ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Save & Verify</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Streaming & Playback Preferences */}
        <div className="space-y-4 pt-2 border-t border-purple-950/50">
          <span className="text-xs font-bold text-purple-300/50 uppercase tracking-wider block">
            Playback Preferences
          </span>

          <div className="space-y-1.5">
            <label className="text-xs text-purple-200/80 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>Default Video Quality</span>
            </label>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="w-full bg-[#150F24] border border-purple-900/40 rounded-xl px-3 py-2 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="4K Ultra HD (2160p)">4K Ultra HD (2160p) - Maximum Bitrate</option>
              <option value="1080p FHD">1080p FHD - Balanced</option>
              <option value="720p HD">720p HD - Data Saver</option>
              <option value="Auto">Auto (Adaptive Bitrate)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-purple-200/80 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Audio Format</span>
            </label>
            <select
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              className="w-full bg-[#150F24] border border-purple-900/40 rounded-xl px-3 py-2 text-xs text-purple-100 font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="Dolby Atmos / Spatial">Dolby Atmos / Spatial Audio 7.1</option>
              <option value="5.1 Surround">Dolby Digital 5.1 Surround</option>
              <option value="Stereo">Stereo 2.0 (Headphones)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-purple-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-purple-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/50 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
