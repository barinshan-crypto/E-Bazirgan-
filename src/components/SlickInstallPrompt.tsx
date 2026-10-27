import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Check, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface SlickInstallPromptProps {
  theme?: string;
  onInstalled?: () => void;
}

export const SlickInstallPrompt: React.FC<SlickInstallPromptProps> = ({ theme = 'royal', onInstalled }) => {
  const { i18n } = useTranslation();
  const { isInstalled, isStandalone, hasNativePrompt, platform, promptInstall, markInstalled, openInChrome } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('payv_pwa_dismissed') === 'true' || 
             sessionStorage.getItem('eb_pwa_dismissed') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [justInstalled, setJustInstalled] = useState(false);
  const [guideHint, setGuideHint] = useState<string | null>(null);

  const isKu = i18n.language === 'ku';
  const isAr = i18n.language === 'ar';
  const isLight = theme === 'rainbow';

  // Check if previously installed in localStorage or running standalone
  const isAlreadyInstalled = () => {
    if (isInstalled || isStandalone) return true;
    try {
      return localStorage.getItem('payv_pwa_installed') === 'true' || 
             localStorage.getItem('eb_pwa_installed') === 'true';
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    // If installed already on the device, or dismissed, NEVER show again!
    if (isAlreadyInstalled() || isDismissed) {
      setIsVisible(false);
      return;
    }

    // Auto-reveal slim pill smoothly after initial load only if NOT installed and NOT dismissed
    const timer = setTimeout(() => {
      if (!isAlreadyInstalled() && !isDismissed) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isInstalled, isStandalone, isDismissed]);

  if (isAlreadyInstalled() || isDismissed) {
    return null;
  }

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. If native beforeinstallprompt is ready, trigger immediate native install
    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        try {
          localStorage.setItem('payv_pwa_installed', 'true');
          localStorage.setItem('eb_pwa_installed', 'true');
          localStorage.setItem('payv_pwa_installed_at', Date.now().toString());
        } catch (_) {}
        markInstalled();
        setJustInstalled(true);
        if (onInstalled) onInstalled();
        setTimeout(() => {
          setIsVisible(false);
          setIsDismissed(true);
        }, 1800);
        return;
      }
    }

    // 2. If on Android in Mi Browser / custom browser without native prompt, open in Chrome for 1-tap install
    if (platform.isAndroid) {
      try {
        localStorage.setItem('payv_pwa_installed', 'true');
      } catch (_) {}
      openInChrome();
      setIsVisible(false);
      setIsDismissed(true);
      return;
    }

    // 3. If on iOS (Safari)
    if (platform.isIOS) {
      setGuideHint('ios_help');
      return;
    }

    // 4. Default attempt promptInstall
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      try {
        localStorage.setItem('payv_pwa_installed', 'true');
        localStorage.setItem('eb_pwa_installed', 'true');
        localStorage.setItem('payv_pwa_installed_at', Date.now().toString());
      } catch (_) {}
      markInstalled();
      setJustInstalled(true);
      if (onInstalled) onInstalled();
      setTimeout(() => {
        setIsVisible(false);
        setIsDismissed(true);
      }, 1800);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setIsDismissed(true);
    try {
      localStorage.setItem('payv_pwa_dismissed', 'true');
      sessionStorage.setItem('eb_pwa_dismissed', 'true');
    } catch (_) {}
  };

  const handleConfirmInstalled = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem('payv_pwa_installed', 'true');
      localStorage.setItem('eb_pwa_installed', 'true');
    } catch (_) {}
    markInstalled();
    setJustInstalled(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsDismissed(true);
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pwa-slim-install-tool"
          id="pwa-slim-install-tool"
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.94 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed bottom-3 sm:bottom-5 inset-x-0 z-[180] flex justify-center px-3 pointer-events-none"
        >
          {/* Single Unified Minimalist Floating Pill (Only 1 Single Clean Action) */}
          <div
            onClick={() => handleInstallClick()}
            className={clsx(
              "pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-2xl shadow-xl transition-all cursor-pointer select-none border active:scale-[0.98]",
              isLight
                ? "bg-white/95 border-slate-200 text-slate-900 shadow-slate-900/10 hover:border-slate-300"
                : "bg-slate-950/92 border-amber-500/30 text-white shadow-black/70 hover:border-amber-400/50"
            )}
          >
            {/* Minimal App Icon with Google Flow Gold Sparkle */}
            <div className="relative shrink-0 w-6 h-6 rounded-md overflow-hidden bg-white flex items-center justify-center border border-amber-400/50 shadow-xs">
              <img
                src="/pwa-192x192.png"
                alt="E-BAZIRGAN"
                className="w-full h-full object-cover"
              />
              <div className="absolute -top-1 -right-0.5 w-2.5 h-2.5 pointer-events-none animate-google-flow-sparkle">
                <svg viewBox="0 0 24 24" className="w-full h-full fill-amber-300 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.9)]">
                  <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
                </svg>
              </div>
            </div>

            {/* State: Just Installed */}
            {justInstalled ? (
              <span className="text-emerald-400 flex items-center gap-1 text-xs font-black whitespace-nowrap px-2">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                {isKu ? 'دانرا لەسەر شاشە' : isAr ? 'تم التثبيت' : 'Installed'}
              </span>
            ) : guideHint === 'ios_help' ? (
              /* State: iOS 1-Line Helper with confirmation */
              <div className="flex items-center gap-2">
                <span className="text-amber-400 flex items-center gap-1.5 font-bold text-xs whitespace-nowrap px-1">
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  {isKu ? 'هاوبەشکردن ➜ زیادکردن بۆ شاشە' : isAr ? 'مشاركة ➜ إضافة للشاشة' : 'Share ➜ Add to Home'}
                </span>
                <button
                  type="button"
                  onClick={handleConfirmInstalled}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black hover:bg-emerald-500/30"
                >
                  {isKu ? 'تەواوم کرد ✓' : isAr ? 'تم الإضافة ✓' : 'Done ✓'}
                </button>
              </div>
            ) : (
              /* ONE SINGLE UNIFIED BUTTON (دابەزاندن بۆ سەر شاشە) */
              <button
                type="button"
                onClick={(e) => handleInstallClick(e)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black cursor-pointer transition-transform active:scale-95 shadow-sm whitespace-nowrap",
                  isLight
                    ? "bg-amber-400 hover:bg-amber-500 text-slate-950"
                    : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950"
                )}
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isKu ? 'دابەزاندن بۆ سەر شاشە ⚡' : isAr ? 'تثبيت على الشاشة ⚡' : 'Add to Home Screen ⚡'}</span>
              </button>
            )}

            {/* Minimal Dismiss */}
            <button
              type="button"
              onClick={handleDismiss}
              className={clsx(
                "p-1 rounded-full transition-colors cursor-pointer shrink-0",
                isLight ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-white/10"
              )}
              title={isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
