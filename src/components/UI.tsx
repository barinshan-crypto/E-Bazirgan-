import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'primary' | 'danger' | 'warning';
  theme?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'primary',
  theme = 'rainbow'
}) => {
  const isDarkTheme = ['royal', 'dark', 'midnight', 'sunset', 'tokyo'].includes(theme);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[10000000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={clsx(
              "border rounded-3xl p-6 max-w-[340px] w-full shadow-2xl space-y-4 relative overflow-hidden",
              "bg-white border-slate-200 text-slate-900"
            )}
          >
            {/* Decorative accent for themes */}
            {theme === 'royal' && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />}
            {theme === 'rainbow' && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500 animate-rainbow" />}
            {theme === 'wavy' && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-pink-500 via-indigo-500 via-teal-400 to-amber-400" />}
            {theme === 'sunset' && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600" />}
            {theme === 'tokyo' && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-700 via-purple-800 to-teal-500" />}

            <div className="flex items-start gap-3">
              <div className={clsx(
                "p-2 rounded-xl shrink-0",
                type === 'danger' ? "bg-red-500/10 text-red-400" :
                type === 'warning' ? "bg-amber-500/10 text-amber-400" : 
                theme === 'royal' ? "bg-amber-400/10 text-amber-300" : "bg-indigo-500/10 text-indigo-400"
              )}>
                {type === 'danger' ? <AlertCircle className="w-5 h-5" /> :
                 type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="font-black text-sm leading-tight uppercase tracking-tight text-slate-900">{title}</h2>
                <p className="text-[10px] mt-1.5 leading-relaxed font-bold text-slate-600">{message}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={clsx(
                  "flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest shadow-xl cursor-pointer",
                  type === 'danger' ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20 active:scale-95" :
                  type === 'warning' ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 active:scale-95" :
                  theme === 'royal' ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-amber-400/20 font-black active:scale-95" :
                  theme === 'wavy' ? "bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-90 text-white shadow-teal-500/20 active:scale-95" :
                  theme === 'sunset' ? "bg-gradient-to-r from-orange-500 to-rose-600 hover:opacity-90 text-white shadow-orange-500/20 active:scale-95" :
                  theme === 'tokyo' ? "bg-gradient-to-r from-indigo-600 to-teal-500 hover:opacity-90 text-white shadow-indigo-500/20 active:scale-95" :
                  "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-95"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
  theme?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 3000,
  theme = 'rainbow'
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isDarkTheme = ['royal', 'dark', 'midnight', 'sunset', 'tokyo'].includes(theme);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={clsx(
        "fixed bottom-6 right-6 z-[1100] flex items-center gap-3 px-5 py-4 rounded-[1.5rem] shadow-2xl border text-[11px] font-black uppercase tracking-widest backdrop-blur-xl max-w-sm",
        theme === 'royal' ? "bg-[#060a16]/95 border-amber-400/30 text-white shadow-black/80" : isDarkTheme ? "bg-slate-900/90 border-white/10" : "bg-white/90 border-slate-200"
      )}
      style={{
        color: type === 'success' ? (theme === 'royal' ? '#fbbf24' : '#10b981') : type === 'error' ? '#ef4444' : (theme === 'royal' ? '#f59e0b' : '#6366f1'),
      }}
    >
      {type === 'success' ? <CheckCircle className={clsx("w-4 h-4 shrink-0", theme === 'royal' ? "text-amber-300" : "text-emerald-400")} /> :
       type === 'error' ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> :
       <Info className={clsx("w-4 h-4 shrink-0", theme === 'royal' ? "text-amber-400" : "text-indigo-400")} />}
      <span className={clsx(
        "flex-1 pr-2 line-clamp-2 leading-tight",
        theme === 'royal' ? "text-white" : isDarkTheme ? "text-white" : "text-slate-900"
      )}>{message}</span>
      <button onClick={onClose} aria-label="Close notification" className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0 cursor-pointer">
        <X className="w-3.5 h-3.5 text-slate-400" />
      </button>
    </motion.div>
  );
};
