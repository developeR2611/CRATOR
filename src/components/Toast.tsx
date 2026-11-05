import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#170F2B] border border-purple-500/50 text-white text-xs font-medium shadow-2xl shadow-purple-950/80 animate-slideUp">
      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
