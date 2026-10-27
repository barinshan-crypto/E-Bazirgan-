import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface BrowserPlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMiBrowser: boolean;
  isSamsung: boolean;
  isChrome: boolean;
  isFirefox: boolean;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<BrowserPlatformInfo>({
    isIOS: false,
    isAndroid: false,
    isMiBrowser: false,
    isSamsung: false,
    isChrome: false,
    isFirefox: false,
  });

  useEffect(() => {
    // 1. Check if running in standalone mode or already previously installed on Home Screen
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isDisplayFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isDisplayMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isNavStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidAppReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');
      
      let isStoredInstalled = false;
      try {
        isStoredInstalled = localStorage.getItem('payv_pwa_installed') === 'true' || 
                            localStorage.getItem('eb_pwa_installed') === 'true';
      } catch (_) {}

      const isHardwareStandalone = isDisplayStandalone || isDisplayFullscreen || isDisplayMinimalUi || isNavStandalone || isAndroidAppReferrer;
      setIsStandalone(isHardwareStandalone);
      setIsInstalled(isHardwareStandalone || isStoredInstalled);
    };

    checkStandalone();

    // 2. Detect platform & browser
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !((window as any).MSStream);
    const isAndroidDevice = /android/.test(userAgent);
    const isMi = /miuibrowser|xiaomi/i.test(userAgent);
    const isSamsungBrowser = /samsungbrowser/i.test(userAgent);
    const isChromeBrowser = /chrome|chromium|crios/i.test(userAgent) && !/edge|edg|opr|opera|miuibrowser|samsungbrowser/i.test(userAgent);
    const isFirefoxBrowser = /firefox|fxios/i.test(userAgent);

    setPlatform({
      isIOS: isIOSDevice,
      isAndroid: isAndroidDevice,
      isMiBrowser: isMi,
      isSamsung: isSamsungBrowser,
      isChrome: isChromeBrowser,
      isFirefox: isFirefoxBrowser,
    });

    // 3. Listen to beforeinstallprompt event (Android Chrome, Chromium, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      // If already marked as installed, ignore prompt
      try {
        if (localStorage.getItem('payv_pwa_installed') === 'true') {
          return;
        }
      } catch (_) {}

      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptReady = () => {
      try {
        if (localStorage.getItem('payv_pwa_installed') === 'true') {
          return;
        }
      } catch (_) {}

      if ((window as any).__pwaInstallPrompt) {
        setDeferredPrompt((window as any).__pwaInstallPrompt);
      }
    };

    // 4. Listen to appinstalled event (fired by Chrome/Android immediately upon install)
    const handleAppInstalled = () => {
      try {
        localStorage.setItem('payv_pwa_installed', 'true');
        localStorage.setItem('eb_pwa_installed', 'true');
        localStorage.setItem('payv_pwa_installed_at', Date.now().toString());
      } catch (_) {}

      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const markInstalled = useCallback(() => {
    try {
      localStorage.setItem('payv_pwa_installed', 'true');
      localStorage.setItem('eb_pwa_installed', 'true');
      localStorage.setItem('payv_pwa_installed_at', Date.now().toString());
    } catch (_) {}
    setIsInstalled(true);
    setDeferredPrompt(null);
    if (typeof window !== 'undefined') {
      (window as any).__pwaInstallPrompt = null;
    }
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_guide'> => {
    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__pwaInstallPrompt : null);

    if (activePrompt && typeof activePrompt.prompt === 'function') {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          try {
            localStorage.setItem('payv_pwa_installed', 'true');
            localStorage.setItem('eb_pwa_installed', 'true');
            localStorage.setItem('payv_pwa_installed_at', Date.now().toString());
          } catch (_) {}
          setIsInstalled(true);
          setDeferredPrompt(null);
          (window as any).__pwaInstallPrompt = null;
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // Do NOT download .url files onto Android/iOS! Return manual_guide so user gets clean UI instructions.
    return 'manual_guide';
  }, [deferredPrompt]);

  const openInChrome = useCallback(() => {
    if (typeof window === 'undefined') return;
    const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  }, []);

  return {
    isInstallable: !!deferredPrompt || platform.isIOS || platform.isAndroid,
    hasNativePrompt: !!deferredPrompt || !!(typeof window !== 'undefined' && (window as any).__pwaInstallPrompt),
    isInstalled,
    isStandalone,
    platform,
    promptInstall,
    markInstalled,
    openInChrome,
  };
}

