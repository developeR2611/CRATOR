import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="glass-panel fixed bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6 left-4 sm:left-auto right-4 md:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-xs font-medium max-w-sm ml-auto animate-slideUp"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
