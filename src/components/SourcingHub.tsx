import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Upload, Search, X, Loader2, Sparkles, Check, CheckCircle2, Play, RefreshCw, Layers, Smartphone, Share2, Trash2, Video, Film, Trophy, Target, DollarSign, Plus, User as UserIcon, Clock, MapPin, AlertCircle, Volume2, VolumeX, Phone, ArrowLeft, ArrowRight, FileText, Tag, ShieldCheck, Radio, AlertTriangle, Minimize2, Maximize2, Mic, MicOff, MessageSquare, Wand2, Edit2, Image as ImageIcon, Settings, Sliders, ShoppingBag, Flame, Square, Calendar, Package, Copy, Moon, Sun, Home } from 'lucide-react';
import { db, MarketplaceItem, User, LiveSession, LiveComment } from '../lib/db';
import { initWebRTCBroadcaster, initWebRTCViewer } from '../lib/webrtc';
import { compressBase64Image, isVideoUrl } from '../lib/imageCompressor';
import { safeCopyToClipboard } from '../lib/clipboard';
import { COMMON_COLORS, COMMON_SIZES, IRAQ_CITIES, DEFAULT_LIVE_BROADCAST_VIDEO, FALLBACK_LIVE_BROADCAST_VIDEO } from '../lib/constants';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import LegalFooter from './LegalFooter';
import { SourcingProductSkeleton, ProductPickerSkeleton } from './Skeleton';
import InstagramPublicProfileModal from './InstagramPublicProfileModal';

interface SourcingHubProps {
  user: User | null;
  theme: string;
  onSearchChange: (query: string) => void;
  onSwitchToMarketplace: () => void;
  onTriggerPet?: () => void;
  onRequireAuth?: (action?: () => void) => void;
  autoOpenLiveStudio?: boolean;
  onOpenSellerProfile?: (sellerId: string, fallbackInfo?: any) => void;
}

const DEFAULT_BROADCAST_VIDEO = DEFAULT_LIVE_BROADCAST_VIDEO;
const FALLBACK_BROADCAST_VIDEO = FALLBACK_LIVE_BROADCAST_VIDEO;

export default function SourcingHub({ user, theme, onSearchChange, onSwitchToMarketplace, onTriggerPet, onRequireAuth, autoOpenLiveStudio, onOpenSellerProfile }: SourcingHubProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ku' || i18n.language === 'ar';
  const isRainbow = theme === 'rainbow';
  const isDarkTheme = theme === 'dark' || theme === 'royal' || theme === 'midnight' || theme === 'tokyo' || theme === 'sunset' || theme === 'aurora' || theme === 'emerald';
  const [localSearch, setLocalSearch] = useState('');
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveSession[]>([]);
  const [selectedLiveSession, setSelectedLiveSession] = useState<LiveSession | null>(null);
  const [pinnedProduct, setPinnedProduct] = useState<MarketplaceItem | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [followedSellers, setFollowedSellers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('followed_sellers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFollowSeller = (sellerId: string) => {
    setFollowedSellers(prev => {
      const next = prev.includes(sellerId) ? prev.filter(id => id !== sellerId) : [...prev, sellerId];
      localStorage.setItem('followed_sellers', JSON.stringify(next));
      return next;
    });
  };
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [streamQuality, setStreamQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [replayRetentionHours, setReplayRetentionHours] = useState<number>(72);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState<boolean>(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [myMarketplaceItems, setMyMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [loadingPickerItems, setLoadingPickerItems] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showLiveIndicators, setShowLiveIndicators] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<{id: string, user: string, text: string}[]>([]);
  const [liveCommentText, setLiveCommentText] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [hasViewerStreamObject, setHasViewerStreamObject] = useState<boolean>(false);
  const [isBroadcasterMicMuted, setIsBroadcasterMicMuted] = useState<boolean>(false);
  const [isLiveNow, setIsLiveNow] = useState(false);
  const [liveTitleInput, setLiveTitleInput] = useState('پەخشی ڕاستەوخۆی کاڵاکان 🔴');
  const [livePriceInput, setLivePriceInput] = useState('25000');
  const [liveCoverImage, setLiveCoverImage] = useState<string>(
    user?.avatar || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800'
  );
  const [isBeautyEnhanced, setIsBeautyEnhanced] = useState(true);
  const [isNightBoost, setIsNightBoost] = useState<boolean>(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [showFilterSelector, setShowFilterSelector] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'none' | 'beauty' | 'rosy' | 'warm' | 'cool' | 'vivid' | 'vintage' | 'noir' | 'glamour'>('beauty');
  const [beautyToast, setBeautyToast] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState<boolean>(false);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const videoStreamFileInputRef = useRef<HTMLInputElement>(null);
  const broadcasterControlsRef = useRef<{ stop: () => void; updateStream: (s: MediaStream) => void } | null>(null);

  // Buyer vs Seller Form Role State
  const [formUserRole, setFormUserRole] = useState<'buyer' | 'seller'>('buyer');
  const [buyerName, setBuyerName] = useState<string>(user?.name || '');
  const [buyerPhone, setBuyerPhone] = useState<string>(user?.phone || '');
  const [buyerCity, setBuyerCity] = useState<string>(user?.city || 'هەولێر');
  const [buyerAddress, setBuyerAddress] = useState<string>(user?.address || '');
  const [buyerNote, setBuyerNote] = useState<string>('');
  const [buyerQuantity, setBuyerQuantity] = useState<number>(1);
  const [buyerOrderSuccess, setBuyerOrderSuccess] = useState<boolean>(false);

  // Broadcaster & Seller profile inspection modal state
  const [activeSeller, setActiveSeller] = useState<{
    id: string;
    name: string;
    phone?: string;
    avatar: string;
    bio: string;
    location: string;
    followers: string[];
    category?: string;
  } | null>(null);
  const [activeSellerItems, setActiveSellerItems] = useState<MarketplaceItem[]>([]);
  const [isLoadingSellerProfile, setIsLoadingSellerProfile] = useState(false);

  const handleOpenSellerProfile = async (sellerId: string, fallbackInfo?: { name?: string; phone?: string; avatar?: string; location?: string }) => {
    if (onOpenSellerProfile) {
      onOpenSellerProfile(sellerId, fallbackInfo);
      return;
    }
    setIsLoadingSellerProfile(true);
    try {
      const [sellerProfile, targetUser, allItemsRes] = await Promise.all([
        db.getSellerProfile(sellerId).catch(() => null),
        db.getUserById(sellerId).catch(() => null),
        db.getMarketplaceItemsPaginated ? db.getMarketplaceItemsPaginated(60, undefined, 'all').catch(() => ({ items: [] })) : Promise.resolve({ items: [] })
      ]);

      const allItems = allItemsRes?.items || [];

      const rawName = sellerProfile?.businessName || targetUser?.name || fallbackInfo?.name || (i18n.language === 'ku' ? 'فرۆشیاری ئی-بازرگان' : 'E-BAZIRGAN Seller');
      const name = db.sanitizeBrandName ? db.sanitizeBrandName(rawName) : rawName;
      const phone = sellerProfile?.contactPhone || targetUser?.phone || fallbackInfo?.phone || '';
      const avatar = sellerProfile?.logoUrl || targetUser?.avatar || fallbackInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerId}`;
      const bio = sellerProfile?.bio || targetUser?.bio || (i18n.language === 'ku' ? 'دابەشکەری فەرمی و فرۆشگای خۆماڵی لە ئی-بازرگان.' : 'Verified merchant in E-BAZIRGAN.');
      const location = sellerProfile?.location || targetUser?.city || fallbackInfo?.location || 'هەولێر';
      const followers = sellerProfile?.followers || [];

      setActiveSeller({
        id: sellerId,
        name,
        phone,
        avatar,
        bio,
        location,
        followers,
        category: targetUser?.category || (sellerProfile as any)?.category
      });

      const userPosts = (allItems || []).filter(item => item.userId === sellerId || (item as any).sellerId === sellerId);
      setActiveSellerItems(userPosts);
    } catch (e) {
      console.error("Error opening seller profile in SourcingHub:", e);
    } finally {
      setIsLoadingSellerProfile(false);
    }
  };

  const triggerBeautyToast = (msg: string) => {
    setBeautyToast(msg);
    setTimeout(() => setBeautyToast(null), 2500);
  };

  const triggerCameraFlash = () => {
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);
  };

  const getVideoFilterClass = () => {
    let filterStr = '';
    if (isNightBoost) {
      filterStr += 'brightness(135%) contrast(114%) saturate(120%) ';
    }
    if (isBeautyEnhanced) {
      filterStr += 'brightness(116%) contrast(104%) saturate(122%) hue-rotate(-2deg) sepia(6%) ';
    }
    switch (selectedFilter) {
      case 'beauty':
        filterStr += 'brightness(122%) contrast(108%) saturate(135%) hue-rotate(-4deg) sepia(8%)';
        break;
      case 'rosy':
        filterStr += 'brightness(115%) saturate(150%) contrast(108%) hue-rotate(-12deg) sepia(12%)';
        break;
      case 'warm':
        filterStr += 'sepia(35%) saturate(145%) brightness(110%) contrast(105%) hue-rotate(-10deg)';
        break;
      case 'cool':
        filterStr += 'hue-rotate(175deg) saturate(125%) brightness(108%) contrast(110%)';
        break;
      case 'vivid':
        filterStr += 'saturate(200%) contrast(120%) brightness(105%)';
        break;
      case 'vintage':
        filterStr += 'sepia(50%) contrast(125%) brightness(95%) hue-rotate(8deg)';
        break;
      case 'noir':
        filterStr += 'grayscale(100%) contrast(150%) brightness(102%)';
        break;
      case 'glamour':
        filterStr += 'brightness(120%) saturate(140%) contrast(112%) hue-rotate(-5deg)';
        break;
      default:
        break;
    }
    return filterStr.trim();
  };

  const toggleBroadcasterMic = () => {
    const nextState = !isBroadcasterMicMuted;
    setIsBroadcasterMicMuted(nextState);
    if (cameraStream) {
      cameraStream.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    triggerBeautyToast(
      nextState 
        ? (i18n.language === 'ku' ? 'مایکرۆفۆن بێدەنگ کرا 🔇' : 'Microphone muted 🔇') 
        : (i18n.language === 'ku' ? 'مایکرۆفۆن چالاک کرا 🎙️' : 'Microphone unmuted 🎙️')
    );
  };

  const [showLiveStartConfirmation, setShowLiveStartConfirmation] = useState(false);
  const [isLiveMinimized, setIsLiveMinimized] = useState(false);
  const [showBuyerShowcase, setShowBuyerShowcase] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [autoDetectedLocation, setAutoDetectedLocation] = useState<string>(user?.address || 'هەولێر');
  const [currentGpsLocation, setCurrentGpsLocation] = useState<string>(user?.address || 'هەولێر');

  const resolveGpsLocation = (lat: number, lng: number): string => {
    // Zakho
    if (lat >= 37.0 && lat <= 37.3 && lng >= 42.5 && lng <= 42.8) return 'زاخۆ';
    // Duhok
    if (lat >= 36.5 && lat <= 37.3 && lng >= 42.5 && lng <= 43.8) return 'دهۆک';
    // Erbil
    if (lat >= 35.8 && lat <= 36.6 && lng >= 43.5 && lng <= 44.5) return 'هەولێر';
    // Sulaymaniyah
    if (lat >= 35.0 && lat <= 35.9 && lng >= 45.0 && lng <= 46.2) return 'سلێمانی';
    // Halabja
    if (lat >= 35.0 && lat <= 35.5 && lng >= 45.7 && lng <= 46.3) return 'هەڵەبجە';
    // Kirkuk
    if (lat >= 35.1 && lat <= 35.8 && lng >= 44.0 && lng <= 44.8) return 'کەرکووک';
    // Mosul
    if (lat >= 36.1 && lat <= 36.6 && lng >= 42.8 && lng <= 43.3) return 'مووسڵ';
    // Baghdad
    if (lat >= 33.1 && lat <= 33.6 && lng >= 44.1 && lng <= 44.6) return 'بەغداد';
    // Basra
    if (lat >= 30.2 && lat <= 30.8 && lng >= 47.5 && lng <= 48.2) return 'بەسرە';
    return user?.address || 'هەولێر';
  };

  const fetchAutoGpsLocation = () => {
    setDetectingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locName = resolveGpsLocation(lat, lng);
          setAutoDetectedLocation(locName);
          setCurrentGpsLocation(locName);
          setDetectingGps(false);
        },
        (error) => {
          console.warn("GPS detection fallback:", error);
          const fallbackLoc = user?.address || "هەولێر";
          setAutoDetectedLocation(fallbackLoc);
          setCurrentGpsLocation(fallbackLoc);
          setDetectingGps(false);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      const fallbackLoc = user?.address || "هەولێر";
      setAutoDetectedLocation(fallbackLoc);
      setCurrentGpsLocation(fallbackLoc);
      setDetectingGps(false);
    }
  };

  const triggerSourcingUpload = () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const secondaryInput = document.createElement('input');
    secondaryInput.type = 'file';
    secondaryInput.accept = 'image/*,video/*';
    secondaryInput.multiple = true;
    secondaryInput.onchange = async (e: any) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSubmittingFile(true);
        const newImages: string[] = [];
        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
              reader.onload = () => resolve((reader.result as string) || '');
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });
            if (!base64) continue;
            if (file.type.startsWith('video/')) {
              newImages.push(base64);
            } else {
              const compressed = await compressBase64Image(base64, 1200, 0.85);
              newImages.push(compressed || base64);
            }
          }
          if (newImages.length > 0) {
            setUploadedImages(prev => {
              const updated = [...prev, ...newImages];
              if (!capturedImage) {
                setCapturedImage(updated[0]);
                setSourceImage(updated[0]);
              }
              return updated;
            });
            const code = sourceCode || generateAutoSourceCode();
            setSourceCode(code);
            setFormUserRole('seller');
            setShowSourceForm(true);
            triggerBeautyToast(i18n.language === 'ku' ? 'فایلەکان بە سەرکەوتوویی بارکران ✨' : 'Files uploaded successfully ✨');
          }
        } catch (err) {
          console.error("Upload error:", err);
        } finally {
          setSubmittingFile(false);
        }
      }
    };
    secondaryInput.click();
  };

  // Instant direct camera video / photo recording for gallery
  const triggerDirectCameraCapture = (captureType: 'video' | 'photo' = 'video') => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const cameraInput = document.createElement('input');
    cameraInput.type = 'file';
    if (captureType === 'video') {
      cameraInput.accept = 'video/*';
      cameraInput.setAttribute('capture', 'environment');
    } else {
      cameraInput.accept = 'image/*';
      cameraInput.setAttribute('capture', 'environment');
    }
    cameraInput.onchange = async (e: any) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSubmittingFile(true);
        try {
          const file = files[0];
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (base64) {
            const finalMedia = file.type.startsWith('video/') 
              ? base64 
              : (await compressBase64Image(base64, 1200, 0.85)) || base64;
            setUploadedImages(prev => {
              const updated = [...prev, finalMedia];
              if (!capturedImage) {
                setCapturedImage(updated[0]);
                setSourceImage(updated[0]);
              }
              return updated;
            });
            const code = sourceCode || generateAutoSourceCode();
            setSourceCode(code);
            setFormUserRole('seller');
            setShowSourceForm(true);
            triggerBeautyToast(
              file.type.startsWith('video/')
                ? (i18n.language === 'ku' ? 'ڤیدیۆی دەمودەست بە سەرکەوتوویی تۆمارکرا 🎥' : 'Instant camera video captured 🎥')
                : (i18n.language === 'ku' ? 'وێنەی کامێرا بە سەرکەوتوویی تۆمارکرا 📸' : 'Instant camera photo captured 📸')
            );
          }
        } catch (err) {
          console.error("Camera direct record error:", err);
        } finally {
          setSubmittingFile(false);
        }
      }
    };
    cameraInput.click();
  };

  // Real-time Active Sessions Listener
  useEffect(() => {
    const unsubscribe = db.onLiveSessionsChange((sessions) => {
      setActiveLiveSessions(sessions);
    });
    return () => unsubscribe();
  }, []);

  // Auto-open studio shortcut from top navbar LIVE tab
  useEffect(() => {
    if (autoOpenLiveStudio) {
      if (!user && onRequireAuth) {
        onRequireAuth();
      } else if (user && !showCameraModal && !showLiveStartConfirmation) {
        handleCameraClick();
      }
    }
  }, [autoOpenLiveStudio, user]);

  const isSessionClosedRef = useRef<boolean>(false);

  // Real-time Live Session Management (Only when user explicitly broadcasts live)
  useEffect(() => {
    if (isLiveNow && user && currentSessionId) {
      isSessionClosedRef.current = false;
      const sessionId = currentSessionId;

      // Track presence as broadcaster
      const cleanupPresence = db.trackPresence('live_' + user.id, user.id, user.avatar);

      // Listen for session updates (like pinned product)
      const unsubscribeSession = db.onLiveSessionUpdate(sessionId, (session) => {
        if (session?.pinnedProductId) {
          db.getMarketplaceItems().then(items => {
            const found = items.find(i => i.id === session.pinnedProductId);
            if (found) setPinnedProduct(found);
          }).catch(() => {});
        } else {
          setPinnedProduct(null);
        }
      });

      // Listen for real-time comments from Firestore
      const unsubscribeComments = db.onLiveCommentsChange(sessionId, (newComments) => {
        setComments(newComments.map(c => ({ 
          id: c.id, 
          user: c.userName, 
          text: c.text 
        })));
      });

      // Listen for viewer count from presence
      const unsubscribeViewers = db.onViewersChange('live_' + user.id, (viewers) => {
        setViewerCount(Math.max(viewers.length, 1));
      });

      // Fetch my items for pinning
      db.getMarketplaceItems().then(items => {
        const userItems = items.filter(i => i.userId === user.id);
        setMyMarketplaceItems(userItems.length > 0 ? userItems : items);
      }).catch(() => {});

      // WebRTC Real-Time Video/Audio Broadcaster
      if (cameraStream) {
        broadcasterControlsRef.current = initWebRTCBroadcaster(sessionId, cameraStream, (count) => {
          setViewerCount((prev) => Math.max(prev, count));
        });
      }

      // Performance & thermal-optimized frame broadcasting and heartbeat (4s interval with canvas caching)
      let cachedCanvas: HTMLCanvasElement | null = null;

      const frameInterval = setInterval(() => {
        let frameDataUrl: string | undefined;
        if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          try {
            if (!cachedCanvas) {
              cachedCanvas = document.createElement('canvas');
            }
            const targetWidth = 240;
            const aspect = (videoRef.current.videoHeight || 480) / (videoRef.current.videoWidth || 640);
            cachedCanvas.width = targetWidth;
            cachedCanvas.height = Math.round(targetWidth * aspect);
            const ctx = cachedCanvas.getContext('2d', { alpha: false, desynchronized: true });
            if (ctx) {
              if (facingMode === 'user') {
                ctx.save();
                ctx.translate(cachedCanvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(videoRef.current, 0, 0, cachedCanvas.width, cachedCanvas.height);
                ctx.restore();
              } else {
                ctx.drawImage(videoRef.current, 0, 0, cachedCanvas.width, cachedCanvas.height);
              }
              frameDataUrl = cachedCanvas.toDataURL('image/jpeg', 0.4);
            }
          } catch (_) {}
        }
        
        // Lightweight fallback frame for Live Studio mode (no CPU-heavy canvas synthesis)
        if (!frameDataUrl) {
          frameDataUrl = liveCoverImage || pinnedProduct?.imageUrl || user?.avatar || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800';
        }

        db.sendLiveHeartbeat(sessionId, frameDataUrl).catch(() => {});
      }, 4000);

      // Handle window close or tab navigation
      const handleBeforeUnload = () => {
        if (!isSessionClosedRef.current) {
          db.endLiveSession(sessionId).catch(() => {});
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        clearInterval(frameInterval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (broadcasterControlsRef.current) {
          broadcasterControlsRef.current.stop();
          broadcasterControlsRef.current = null;
        }
        cleanupPresence();
        unsubscribeSession();
        unsubscribeComments();
        unsubscribeViewers();
      };
    }
  }, [isLiveNow, user, currentSessionId, facingMode, cameraStream]);

  // Real-time Watch Session Management
  useEffect(() => {
    if (selectedLiveSession && user) {
      // Connect to broadcaster via WebRTC for real-time video/audio stream
      const viewerId = user?.id || `viewer_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      const cleanupWebRTC = initWebRTCViewer(selectedLiveSession.id, viewerId, (remoteStream) => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = remoteStream;
          setHasViewerStreamObject(true);
          liveVideoRef.current.play().catch(() => {});
        }
      });

      // Track presence as viewer
      const cleanupPresence = db.trackPresence('live_' + selectedLiveSession.broadcasterId, user.id, user.avatar);

      // Listen for session updates (like pinned product)
      const unsubscribeSession = db.onLiveSessionUpdate(selectedLiveSession.id, (session) => {
        if (session?.pinnedProductId) {
            db.getMarketplaceItems().then(items => {
                const found = items.find(i => i.id === session.pinnedProductId);
                if (found) setPinnedProduct(found);
            });
        } else {
            setPinnedProduct(null);
        }
      });

      // Listen for real-time comments
      const unsubscribeComments = db.onLiveCommentsChange(selectedLiveSession.id, (newComments) => {
        setComments(newComments.map(c => ({ 
          id: c.id, 
          user: c.userName, 
          text: c.text 
        })));
      });

      // Listen for viewer count
      const unsubscribeViewers = db.onViewersChange('live_' + selectedLiveSession.broadcasterId, (viewers) => {
        setViewerCount(viewers.length);
      });

      return () => {
        cleanupWebRTC();
        setHasViewerStreamObject(false);
        cleanupPresence();
        unsubscribeSession();
        unsubscribeComments();
        unsubscribeViewers();
      };
    }
  }, [selectedLiveSession, user]);

  const loadPickerItems = useCallback(async () => {
    setLoadingPickerItems(true);
    try {
      const items = await db.getMarketplaceItems();
      const userItems = user ? items.filter(i => i.userId === user.id) : [];
      setMyMarketplaceItems(userItems.length > 0 ? userItems : items);
    } catch (err) {
      console.error("Error loading picker items:", err);
    } finally {
      setLoadingPickerItems(false);
    }
  }, [user]);

  const handlePinProduct = async (itemOrId: MarketplaceItem | string | null) => {
    let targetItem: MarketplaceItem | null = null;
    if (typeof itemOrId === 'string') {
      targetItem = myMarketplaceItems.find(i => i.id === itemOrId) || null;
    } else {
      targetItem = itemOrId;
    }

    if (targetItem) {
      setPinnedProduct(targetItem);
      setLiveTitleInput(targetItem.title);
      setLivePriceInput(targetItem.price ? targetItem.price.toString() : '25000');
      if (targetItem.imageUrl) setLiveCoverImage(targetItem.imageUrl);

      if (currentSessionId) {
        try {
          await db.pinProduct(currentSessionId, targetItem.id);
          await db.updateLiveSessionProduct(currentSessionId, {
            featuredTitle: targetItem.title,
            featuredPrice: targetItem.price || 25000,
            featuredImage: targetItem.imageUrl || liveCoverImage
          });
        } catch (err) {
          console.error("Failed to pin product:", err);
        }
      }
    } else if (itemOrId === null && currentSessionId) {
      setPinnedProduct(null);
      try {
        await db.pinProduct(currentSessionId, null);
      } catch (err) {}
    }
    setShowProductPicker(false);
  };

  const sellerShowcaseProducts = React.useMemo(() => {
    if (selectedLiveSession && (selectedLiveSession as any).products && (selectedLiveSession as any).products.length > 0) {
      return (selectedLiveSession as any).products.map((p: any) => ({
        id: p.id || `prod_${Math.random()}`,
        title: p.title || p.name || 'کاڵای لایڤ',
        price: p.price || 25000,
        imageUrl: p.imageUrl || p.image || liveCoverImage,
        sellerId: selectedLiveSession.broadcasterId,
        sellerName: selectedLiveSession.broadcasterName
      }));
    }
    
    if (myMarketplaceItems.length > 0) {
      return myMarketplaceItems;
    }

    return [
      {
        id: 'default_1',
        title: pinnedProduct?.title || liveTitleInput || (i18n.language === 'ku' ? 'پەخشی ڕاستەوخۆی کاڵاکان 🔴' : 'Live Stream Item'),
        price: pinnedProduct?.price || Number(livePriceInput) || 25000,
        imageUrl: pinnedProduct?.imageUrl || liveCoverImage,
        sellerId: selectedLiveSession?.broadcasterId || user?.id || 'seller'
      }
    ];
  }, [selectedLiveSession, myMarketplaceItems, pinnedProduct, liveTitleInput, livePriceInput, liveCoverImage, user, i18n.language]);

  const snapLiveStreamPhotoAndBuy = async (itemToBuy?: any) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setCapturing(true);
    let dataUrl: string | null = null;
    const activeVid = liveVideoRef.current || videoRef.current;

    if (activeVid && activeVid.readyState >= 2 && activeVid.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = activeVid.videoWidth || 640;
        canvas.height = activeVid.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(activeVid, 0, 0, canvas.width, canvas.height);
          const rawUrl = canvas.toDataURL('image/jpeg');
          dataUrl = await compressBase64Image(rawUrl, 800, 0.7);
        }
      } catch (e) {
        console.warn("Live video frame capture error:", e);
      }
    }

    setCapturing(false);

    const target = itemToBuy || pinnedProduct;
    const finalImage = dataUrl || target?.imageUrl || liveCoverImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('ku-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' })} - ${now.toLocaleTimeString('ku-IQ', { hour: '2-digit', minute: '2-digit' })}`;
    setCaptureDateTime(dateFormatted);
    setUploadedImages([finalImage]);
    setCapturedImage(finalImage);
    setSourceImage(finalImage);

    const activeTitle = target?.title || liveTitleInput || (i18n.language === 'ku' ? 'میوە / کاڵای باخ (لایڤ)' : 'Live Orchard Produce');
    const activePrice = (target?.price || Number(livePriceInput) || 25000).toString();

    setSourceTitle(activeTitle);
    setSourcePrice(activePrice);
    setSourceDesc(getDefaultProductDescription(activeTitle, sourceLocation));

    if (target) {
      setPinnedProduct(target as MarketplaceItem);
    }

    setFormUserRole('buyer');
    setIsLiveMinimized(true);
    setShowSourceForm(true);
  };

  const handleBuyPinnedProduct = async (itemToBuy?: any) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (selectedLiveSession || cameraStream) {
      await snapLiveStreamPhotoAndBuy(itemToBuy);
      return;
    }

    const target = itemToBuy || pinnedProduct || {
      id: `live_${Date.now()}`,
      title: liveTitleInput || 'پەخشی ڕاستەوخۆی کاڵاکان',
      price: Number(livePriceInput) || 25000,
      imageUrl: liveCoverImage,
      sellerId: selectedLiveSession?.broadcasterId || 'seller'
    };

    setPinnedProduct(target as MarketplaceItem);
    setSourceTitle(target.title || liveTitleInput);
    setSourcePrice(target.price ? target.price.toString() : livePriceInput);
    setSourceImage(target.imageUrl || liveCoverImage);
    setCapturedImage(target.imageUrl || liveCoverImage);
    setFormUserRole('buyer');
    setShowSourceForm(true);
  };

  const sendLiveComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = liveCommentText.trim();
    if (!textToSend) return;

    // Immediately post to local screen comments array so the user sees it instantly
    const newCommentObj = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
      user: user?.name || (i18n.language === 'ku' ? 'کڕیار' : 'Buyer'),
      text: textToSend
    };
    setComments(prev => [...prev, newCommentObj]);
    setLiveCommentText('');

    const broadcasterId = showCameraModal ? user?.id : selectedLiveSession?.broadcasterId;
    const sessionId = showCameraModal ? (currentSessionId || 'session_live') : selectedLiveSession?.id;

    if (user && broadcasterId && sessionId) {
      try {
        await db.addLiveComment({
          sessionId: sessionId,
          broadcasterId: broadcasterId,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          text: textToSend
        });
      } catch (err) {
        console.warn("Firestore live comment sync fallback:", err);
      }
    }
  };

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureDateTime, setCaptureDateTime] = useState<string>('');
  const [capturing, setCapturing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [cameraMode, setCameraMode] = useState<'initial' | 'add'>('initial');
  
  // Unique non-repeating automatic sourcing code & synchronized title generator
  const generateAutoSourceCode = useCallback(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `S-${randomSuffix}`;
  }, []);

  const generateAutoSourceTitle = useCallback((existingCode?: string) => {
    if (existingCode && existingCode.trim()) return existingCode;
    return generateAutoSourceCode();
  }, [generateAutoSourceCode]);

  // Sourcing form
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceDesc, setSourceDesc] = useState('');
  const [sourcePrice, setSourcePrice] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [sourcePhone, setSourcePhone] = useState('');
  const [showPhoneToPublic, setShowPhoneToPublic] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [sourceCategory, setSourceCategory] = useState('');
  const [sourceLocation, setSourceLocation] = useState('Erbil');
  const [sourceSizes, setSourceSizes] = useState<string[]>(['std']);
  const [sourceColors, setSourceColors] = useState<string[]>([]);
  const [sourceResalePrice, setSourceResalePrice] = useState('');
  const [sourceDiscount, setSourceDiscount] = useState('');
  const [sourceDiscountPercent, setSourceDiscountPercent] = useState('');
  const [sourceImage, setSourceImage] = useState('');

  const sanitizeNumericInput = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const normalized = String(val)
      .replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString())
      .replace(/[۰-۹]/g, d => (d.charCodeAt(0) - 1776).toString())
      .replace(/,/g, '')
      .trim();
    return parseFloat(normalized) || 0;
  };

  const getDefaultProductDescription = useCallback((title?: string, location?: string) => {
    const isKu = i18n.language === 'ku';
    const isAr = i18n.language === 'ar';
    if (isKu) {
      if (title && !title.startsWith('بەرهەمی دابینکراو') && !title.startsWith('Item_')) {
        return `بەرهەمی ناوازەی (${title}) بە بەرزترین کوالیتی و گونجاوترین نرخ، ئامادەیە بۆ دابینکردن و گەیاندنی خێرا بۆ هەموو کوردستان.`;
      }
      return 'بەرهەمێکی نایاب و کوالیتی بەرز، بە باشترین نرخ و ئامادەیە بۆ دابینکردن و گەیاندنی خێرا بۆ سەرجەم شارەکان.';
    }
    if (isAr) {
      if (title && !title.startsWith('منتج تم توفيره') && !title.startsWith('Item_')) {
        return `منتج (${title}) المميز بأعلى جودة وأفضل الأسعار، متوفر للتجهيز والتوصيل السريع لجميع المحافظات.`;
      }
      return 'منتج مميز وعالي الجودة، بأفضل الأسعار ومتاح للتجهيز والتوصيل السريع لجميع المحافظات.';
    }
    return title && !title.startsWith('Item_')
      ? `Premium quality (${title}) at the best price, ready for fast sourcing and secure delivery across Kurdistan.`
      : 'High-quality premium product at the best price, ready for sourcing and fast delivery across Kurdistan.';
  }, [i18n.language]);

  // Persistence for Sourcing Form Draft
  useEffect(() => {
    const saved = localStorage.getItem('payv_sourcing_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.uploadedImages && Array.isArray(draft.uploadedImages) && draft.uploadedImages.length > 0) {
          setUploadedImages(draft.uploadedImages);
          setCapturedImage(draft.capturedImage || null);
          setSourceTitle(draft.sourceTitle || '');
          setSourceDesc(draft.sourceDesc || '');
          setSourcePrice(draft.sourcePrice || '');
          setSourceResalePrice(draft.sourceResalePrice || '');
          setSourceCategory(draft.sourceCategory || 'farm');
          setSourceLocation(draft.sourceLocation || 'Erbil');
          setSourceSizes(Array.isArray(draft.sourceSizes) ? draft.sourceSizes : ['std']);
          setSourceColors(Array.isArray(draft.sourceColors) ? draft.sourceColors : []);
          setSourceImage(draft.sourceImage || '');
          setShowSourceForm(draft.showSourceForm || false);
        }
      } catch (e) {
        console.warn("Could not restore sourcing draft:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (uploadedImages.length > 0) {
      try {
        const draft = {
          uploadedImages, capturedImage, sourceTitle, sourceDesc,
          sourcePrice, sourceResalePrice, sourceCategory, sourceLocation,
          sourceSizes, sourceColors, sourceImage, showSourceForm
        };
        localStorage.setItem('payv_sourcing_draft', JSON.stringify(draft));
      } catch (e) {
        console.warn("Failed to save sourcing draft to localStorage (quota exceeded?):", e);
      }
    }
  }, [uploadedImages, capturedImage, sourceTitle, sourceDesc, sourcePrice, sourceResalePrice, sourceCategory, sourceLocation, sourceSizes, sourceColors, sourceImage, showSourceForm]);

  useEffect(() => {
    if (showSourceForm) {
      const unifiedCode = sourceCode?.trim() || generateAutoSourceCode();
      if (!sourceCode || sourceCode.trim() === '') {
        setSourceCode(unifiedCode);
      }
    }
  }, [showSourceForm, sourceCode, generateAutoSourceCode]);

  const [submittingFile, setSubmittingFile] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isBroadcasting = false; // Placeholder

  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleAIGenerate = async () => {
    if (!sourceTitle) {
      alert(i18n.language === 'ku' ? "تکایە سەرەتا ناوی کاڵا بنووسە!" : "Please enter an Item Title first!");
      return;
    }
    setGeneratingAI(true);
    setAiStatusMessage(null);
    try {
      const response = await fetch('/api/payv/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${sourceTitle} - Sourced at ${sourceLocation || 'Kurdistan'}. Category: ${sourceCategory}`,
          language: i18n.language === 'ku' ? 'Kurdish' : i18n.language === 'ar' ? 'Arabic' : 'English',
          tone: 'Luxury'
        })
      });
      const data = await response.json();
      const generateRichFallback = () => {
        const isKu = i18n.language === 'ku';
        const isAr = i18n.language === 'ar';
        if (isKu) {
          return `بەرهەمی نایاب و کوالیتی بەرزی (${sourceTitle}) بە گونجاوترین نرخ.\n✨ کوالیتی پلە یەک و گەرەنتی کراو.\n🚚 ئامادەیە بۆ گەیاندنی خێرا و پارێزراو بۆ سەرجەم شارەکانی کوردستان.\n📍 دابینکراو لە: ${sourceLocation || 'کوردستان'}`;
        }
        if (isAr) {
          return `منتج (${sourceTitle}) عالي الجودة ومميز بأفضل الأسعار.\n✨ جودة ممتازة ومضمونة ١٠٠٪.\n🚚 متوفر للتوصيل السريع لجميع المحافظات.\n📍 تم التوفير من: ${sourceLocation || 'إقليم كوردستان'}`;
        }
        return `High-quality product (${sourceTitle}) at the best price.\n✨ Premium quality & satisfaction guaranteed.\n🚚 Fast and secure delivery across all regions.\n📍 Sourced from: ${sourceLocation || 'Kurdistan'}`;
      };

      if (data.success && data.caption) {
        setSourceDesc(data.caption);
        setAiStatusMessage(i18n.language === 'ku' ? "✨ وەسفەکە بە سەرکەوتوویی ئامادەکرا! (دەتوانیت دەستکاریشی بکەیت)" : "✨ Caption successfully generated!");
      } else {
        const fallbackCaption = generateRichFallback();
        setSourceDesc(fallbackCaption);
        setAiStatusMessage(i18n.language === 'ku' ? "✨ وەسفەکە بە سەرکەوتوویی ئامادەکرا! (دەتوانیت دەستکاریشی بکەیت)" : "✨ Caption generated!");
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      const isKu = i18n.language === 'ku';
      const isAr = i18n.language === 'ar';
      const fallbackCaption = isKu
        ? `بەرهەمی نایاب و کوالیتی بەرزی (${sourceTitle}) بە گونجاوترین نرخ.\n✨ کوالیتی پلە یەک و گەرەنتی کراو.\n🚚 ئامادەیە بۆ گەیاندنی خێرا و پارێزراو بۆ سەرجەم شارەکانی کوردستان.\n📍 دابینکراو لە: ${sourceLocation || 'کوردستان'}`
        : isAr
        ? `منتج (${sourceTitle}) عالي الجودة ومميز بأفضل الأسعار.\n✨ جودة ممتازة ومضمونة ١٠٠٪.\n🚚 متوفر للتوصيل السريع لجميع المحافظات.\n📍 تم التوفير من: ${sourceLocation || 'إقليم كوردستان'}`
        : `High-quality product (${sourceTitle}) at the best price.\n✨ Premium quality & satisfaction guaranteed.\n🚚 Fast and secure delivery across all regions.\n📍 Sourced from: ${sourceLocation || 'Kurdistan'}`;
      setSourceDesc(fallbackCaption);
      setAiStatusMessage(i18n.language === 'ku' ? "✨ وەسفەکە بە سەرکەوتوویی ئامادەکرا! (دەتوانیت دەستکاریشی بکەیت)" : "✨ Caption generated!");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleMobileShare = async () => {
    const priceNum = parseFloat(sourcePrice || '0');
    const shareText = `🌟 Direct Sourced: ${sourceTitle}\n\n📍 Sourced from: ${sourceLocation}\n💰 Price: ${priceNum.toLocaleString()} Dinar\n\n${sourceDesc || 'Discover this unique hand-sourced item on E-BAZIRGAN.'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: sourceTitle,
          text: shareText,
          url: window.location.origin
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      const success = await safeCopyToClipboard(shareText);
      if (success) {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        alert(t("Please register or log in first to upload products!"));
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    fetchAutoGpsLocation();
    setCameraMode('initial');
    openCameraModal();
  };

  const textPrimary: Record<string, string> = {
    royal: 'text-white font-black drop-shadow-xs',
    dark: 'text-white font-black',
    midnight: 'text-blue-100 font-black',
    tokyo: 'text-indigo-100 font-black',
    sunset: 'text-orange-100 font-black',
    aurora: 'text-emerald-100 font-black',
    monochrome: 'text-slate-950 font-black',
    wavy: 'text-slate-900 font-black',
    rainbow: 'text-indigo-950 font-bold',
    colorful: 'text-slate-900 font-bold',
    orange: 'text-slate-900 font-black',
    watermelon: 'text-slate-900 font-black',
    mulberry: 'text-purple-50 font-black',
    pomegranate: 'text-rose-50 font-black',
    tomatoes: 'text-slate-900 font-black',
    grape: 'text-purple-50 font-black',
    strawberry: 'text-rose-50 font-black',
    fig: 'text-slate-900 font-black',
    white: 'text-slate-900 font-black',
    light: 'text-slate-900 font-black'
  };

  const textSecondary: Record<string, string> = {
    royal: 'text-slate-200 font-medium',
    dark: 'text-slate-400 font-medium',
    midnight: 'text-blue-200/70 font-medium',
    tokyo: 'text-indigo-200/70 font-medium',
    sunset: 'text-rose-200/80 font-medium',
    aurora: 'text-emerald-200/70 font-medium',
    monochrome: 'text-slate-700 font-medium',
    wavy: 'text-teal-800/80 font-medium',
    rainbow: 'text-slate-800/80 font-medium',
    colorful: 'text-slate-600 font-medium',
    orange: 'text-amber-800 font-bold',
    watermelon: 'text-emerald-700 font-medium',
    mulberry: 'text-purple-300/80 font-medium',
    pomegranate: 'text-rose-300/80 font-medium',
    tomatoes: 'text-red-700 font-bold',
    grape: 'text-purple-300/60',
    strawberry: 'text-rose-300/60',
    fig: 'text-lime-800 font-bold',
    white: 'text-slate-600 font-medium',
    light: 'text-slate-600 font-medium'
  };

  const bgCard: Record<string, string> = {
    royal: 'bg-[#080d1a]/85 backdrop-blur-2xl border-2 border-amber-400/30 shadow-2xl shadow-black/80 text-white',
    dark: 'bg-slate-900/85 backdrop-blur-2xl border border-slate-700/60 shadow-2xl text-white',
    midnight: 'bg-[#080d1a]/90 backdrop-blur-2xl border border-blue-500/30 text-white shadow-2xl shadow-blue-950/40',
    tokyo: 'bg-slate-950/70 backdrop-blur-2xl border border-indigo-500/30 text-slate-100 shadow-2xl shadow-indigo-950/40',
    sunset: 'bg-orange-950/70 backdrop-blur-2xl border border-orange-500/30 text-orange-50 shadow-2xl shadow-orange-950/40',
    aurora: 'bg-[#081e28]/70 backdrop-blur-2xl border border-emerald-400/30 text-emerald-50 shadow-2xl shadow-emerald-950/40',
    monochrome: 'bg-white/85 backdrop-blur-2xl border-2 border-slate-300 text-slate-950 shadow-xl',
    wavy: 'bg-white/70 backdrop-blur-2xl border border-teal-300/60 text-slate-900 shadow-xl',
    rainbow: 'bg-white/70 backdrop-blur-2xl border border-pink-200/60 text-slate-950 shadow-xl',
    colorful: 'bg-white/30 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-slate-900/10 text-slate-950',
    orange: 'bg-white/30 backdrop-blur-2xl border border-amber-200/40 shadow-2xl shadow-slate-900/10 text-slate-950',
    watermelon: 'bg-white/30 backdrop-blur-2xl border border-emerald-200/40 shadow-2xl shadow-slate-900/10 text-slate-950',
    mulberry: 'bg-black/35 backdrop-blur-2xl border border-purple-500/25 shadow-2xl shadow-black/20 text-white',
    pomegranate: 'bg-black/35 backdrop-blur-2xl border border-rose-500/25 shadow-2xl shadow-black/20 text-white',
    tomatoes: 'bg-white/30 backdrop-blur-2xl border border-red-200/40 shadow-2xl shadow-slate-900/10 text-slate-950',
    grape: 'bg-black/35 backdrop-blur-2xl border border-purple-500/25 shadow-2xl shadow-black/20 text-white',
    strawberry: 'bg-black/35 backdrop-blur-2xl border border-rose-500/25 shadow-2xl shadow-black/20 text-white',
    fig: 'bg-white/30 backdrop-blur-2xl border border-lime-200/40 shadow-2xl shadow-slate-900/10 text-slate-950',
    white: 'bg-white/95 border border-slate-200 shadow-md text-slate-900',
    light: 'bg-white/95 border border-slate-200 shadow-md text-slate-900'
  };

  const inputClasses: Record<string, string> = {
    royal: 'bg-[#050814]/90 backdrop-blur-2xl text-white border-amber-400/50 focus:border-amber-300 placeholder:text-slate-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.5)]',
    dark: 'bg-slate-950/80 backdrop-blur-2xl text-white border-slate-700/60 focus:border-indigo-400 placeholder:text-slate-400',
    midnight: 'bg-[#050814]/80 backdrop-blur-2xl text-blue-100 border-blue-500/40 focus:border-blue-400 placeholder:text-blue-300/60',
    tokyo: 'bg-black/50 backdrop-blur-2xl text-white border-indigo-500/50 focus:border-teal-400 placeholder:text-indigo-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    sunset: 'bg-black/50 backdrop-blur-2xl text-white border-orange-500/50 focus:border-orange-400 placeholder:text-amber-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    aurora: 'bg-[#061922]/60 backdrop-blur-2xl text-emerald-100 border-emerald-500/50 focus:border-emerald-300 placeholder:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    monochrome: 'bg-white text-slate-900 border-slate-300 focus:border-amber-500 placeholder:text-slate-500',
    wavy: 'bg-white/80 backdrop-blur-2xl text-slate-950 border-teal-300/60 focus:border-teal-400 placeholder:text-slate-600',
    rainbow: 'bg-white/80 backdrop-blur-2xl text-slate-950 border-pink-200/80 focus:border-indigo-400 placeholder:text-slate-600',
    colorful: 'bg-white/30 dark:bg-white/10 backdrop-blur-2xl text-slate-950 dark:text-white border-white/60 dark:border-white/20 focus:border-indigo-400 placeholder:text-slate-700/80 dark:placeholder:text-slate-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.06)]',
    orange: 'bg-white/30 dark:bg-white/10 backdrop-blur-2xl text-slate-950 dark:text-white border-amber-200/50 dark:border-white/20 focus:border-amber-400 placeholder:text-slate-700/80 dark:placeholder:text-slate-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.06)]',
    watermelon: 'bg-white/30 dark:bg-white/10 backdrop-blur-2xl text-slate-950 dark:text-white border-emerald-200/50 dark:border-white/20 focus:border-emerald-400 placeholder:text-slate-700/80 dark:placeholder:text-slate-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.06)]',
    mulberry: 'bg-black/40 backdrop-blur-2xl text-white border-purple-400/50 focus:border-purple-300 placeholder:text-purple-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    pomegranate: 'bg-black/40 backdrop-blur-2xl text-white border-rose-400/50 focus:border-rose-300 placeholder:text-rose-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    tomatoes: 'bg-white/30 dark:bg-white/10 backdrop-blur-2xl text-slate-950 dark:text-white border-red-200/50 dark:border-white/20 focus:border-emerald-400 placeholder:text-slate-700/80 dark:placeholder:text-slate-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.06)]',
    grape: 'bg-black/40 backdrop-blur-2xl text-white border-purple-400/50 focus:border-purple-300 placeholder:text-purple-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    strawberry: 'bg-black/40 backdrop-blur-2xl text-white border-rose-400/50 focus:border-rose-300 placeholder:text-rose-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]',
    fig: 'bg-white/30 dark:bg-white/10 backdrop-blur-2xl text-slate-950 dark:text-white border-lime-200/50 dark:border-white/20 focus:border-rose-400 placeholder:text-slate-700/80 dark:placeholder:text-slate-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.06)]',
    white: 'bg-slate-50 text-slate-900 border-slate-300 focus:border-indigo-500 placeholder:text-slate-500',
    light: 'bg-slate-50 text-slate-900 border-slate-300 focus:border-indigo-500 placeholder:text-slate-500'
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
    onSwitchToMarketplace();
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      // 1. Cleanly release any existing camera stream tracks
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
          try { track.stop(); } catch (_) {}
        });
        setCameraStream(null);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const prevStream = videoRef.current.srcObject as MediaStream;
          prevStream.getTracks().forEach(t => {
            try { t.stop(); } catch (_) {}
          });
          videoRef.current.srcObject = null;
        } catch (_) {}
      }

      // Check mediaDevices support with backwards compatibility
      const hasMediaDevices = typeof navigator !== 'undefined' && (
        Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
        Boolean((navigator as any).getUserMedia) ||
        Boolean((navigator as any).webkitGetUserMedia) ||
        Boolean((navigator as any).mozGetUserMedia)
      );

      if (!hasMediaDevices) {
        throw new Error("MEDIA_DEVICES_NOT_SUPPORTED");
      }

      const getMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return await navigator.mediaDevices.getUserMedia(constraints);
        }
        return new Promise((resolve, reject) => {
          const legacyFn = (navigator as any).getUserMedia || 
                           (navigator as any).webkitGetUserMedia || 
                           (navigator as any).mozGetUserMedia;
          legacyFn.call(navigator, constraints, resolve, reject);
        });
      };

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      // WeChat-style Mobile Portrait Live Stream Constraints (Zero-freeze, optimized bitrate & noise-canceled audio)
      const candidateList: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 720, max: 1080 },
            height: { ideal: 1280, max: 1920 },
            aspectRatio: { ideal: 9 / 16 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        },
        {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 540, max: 720 },
            height: { ideal: 960, max: 1280 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: true
        },
        {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 540 },
            height: { ideal: 960 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: false
        },
        { video: { facingMode: mode === 'user' ? 'environment' : 'user' }, audio: true },
        { video: { facingMode: mode === 'user' ? 'environment' : 'user' }, audio: false },
        { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: true, audio: false }
      ];

      for (const cand of candidateList) {
        try {
          stream = await getMedia(cand);
          if (stream && stream.getVideoTracks().length > 0) {
            break;
          }
        } catch (candErr: any) {
          lastErr = candErr;
        }
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        throw lastErr || new Error("NO_STREAM_ACQUIRED");
      }

      setCameraStream(stream);
      setIsSimulatedCamera(false);
      setCameraError(null);
      setShowLiveIndicators(true);

      if (videoRef.current) {
        try {
          videoRef.current.removeAttribute('src');
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        } catch (e) {
          console.warn("Error attaching stream to video element:", e);
        }
      }
    } catch (err: any) {
      console.warn("Camera hardware access error, switching to interactive live studio:", err?.name || err?.message || err);
      setIsSimulatedCamera(true);
      setCameraStream(null);
      setShowLiveIndicators(true);

      // Instantly connect broadcast stream video to video element so studio is actively streaming
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = null;
          videoRef.current.src = customVideoUrl || DEFAULT_BROADCAST_VIDEO;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        } catch (_) {}
      }

      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      if (isPermissionDenied) {
        setCameraError(i18n.language === 'ku' ? 'تکایە لە ڕێکخستنی براوسەرەکەت مۆڵەتی بەکارهێنانی کامێرا بدە' : 'Please allow camera permission in your browser');
      } else {
        setCameraError(null);
      }
    }
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setIsSimulatedCamera(true);
      setCameraError(null);
      setShowLiveIndicators(true);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
      }
      triggerBeautyToast(i18n.language === 'ku' ? 'فایلی ڤیدیۆ بۆ پەخش هەڵبژێردرا 📹' : 'Video file loaded for stream 📹');
    }
  };

  const handleStartDemoStudio = () => {
    setIsSimulatedCamera(true);
    setCameraError(null);
    setShowLiveIndicators(true);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = customVideoUrl || DEFAULT_BROADCAST_VIDEO;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(() => {});
    }
    triggerBeautyToast(i18n.language === 'ku' ? 'ستۆدیۆی پەخشی ڕاستەوخۆ چالاک کرا 🎥' : 'Live Studio Activated 🎥');
  };

  // Guarantee camera stream or broadcast video is attached to video element when stream or modal mounts
  useEffect(() => {
    if (videoRef.current) {
      if (cameraStream) {
        try {
          videoRef.current.removeAttribute('src');
          videoRef.current.srcObject = cameraStream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch((err) => console.log("Video auto-play catch:", err));
        } catch (e) {
          console.warn("Could not set srcObject:", e);
        }
      } else {
        try {
          const streamSrc = customVideoUrl || DEFAULT_BROADCAST_VIDEO;
          if (videoRef.current.src !== streamSrc) {
            videoRef.current.srcObject = null;
            videoRef.current.src = streamSrc;
          }
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        } catch (_) {}
      }
    }
  }, [cameraStream, showCameraModal, customVideoUrl, isSimulatedCamera]);

  const toggleCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.srcObject = null;
      } catch (err) {
        console.warn("Error stopping video stream element:", err);
      }
    }
  };

  const openCameraModal = async () => {
    setShowCameraModal(true);
    setIsLiveNow(false);
    setShowLiveIndicators(false);
    startCamera();

    const newSessionId = `live_${user ? user.id : 'guest'}_${Date.now()}`;
    setCurrentSessionId(newSessionId);
  };

  const handleGoLiveNow = async () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const newSessionId = currentSessionId || `live_${user.id}_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setIsLiveNow(true);

    const featuredTitle = liveTitleInput.trim() || (i18n.language === 'ku' ? 'پەخشی ڕاستەوخۆی کاڵاکان 🔴' : 'Live Stream Product Sale 🔴');
    const featuredPrice = Number(livePriceInput) || 25000;

    let initialCover = liveCoverImage;
    if (!initialCover && videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          initialCover = canvas.toDataURL('image/jpeg', 0.6);
          setLiveCoverImage(initialCover);
        }
      } catch (_) {}
    }

    // Immediately show pinned product showcase in stream corner
    setPinnedProduct({
      id: 'live_featured',
      title: featuredTitle,
      price: featuredPrice,
      imageUrl: initialCover || user.avatar || '',
      images: [initialCover || user.avatar || ''],
      category: 'Sourcing',
      sellerId: user.id,
      sellerName: user.name,
      sellerAvatar: user.avatar,
      isApproved: true,
      createdAt: Date.now()
    } as any);

    try {
      const effectiveStreamVideo = customVideoUrl || (cameraStream ? '' : DEFAULT_BROADCAST_VIDEO);

      await db.startLiveSession({
        id: newSessionId,
        broadcasterId: user.id,
        broadcasterName: user.name,
        broadcasterAvatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        broadcasterPhone: user.phone || '07746573763',
        sellerPhone: user.phone || '07746573763',
        status: 'live',
        location: currentGpsLocation || (i18n.language === 'ku' ? 'هەولێر' : 'Erbil'),
        title: featuredTitle,
        featuredTitle: featuredTitle,
        featuredPrice: featuredPrice,
        featuredImage: initialCover || user.avatar || '',
        currentFrame: initialCover || undefined,
        lastHeartbeat: Date.now(),
        pinnedProductId: 'live_featured',
        videoUrl: effectiveStreamVideo
      });
      setShowLiveIndicators(true);
    } catch (err) {
      console.warn("Could not start live session in DB:", err);
    }
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(files[0]);
      });
      const compressed = await compressBase64Image(base64, 600, 0.7);
      setLiveCoverImage(compressed);
    }
    e.target.value = '';
  };

  const snapCoverFromCamera = async () => {
    let capturedDataUrl: string | null = null;
    if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (facingMode === 'user' && cameraStream) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn("Video element canvas capture failed:", err);
      }
    }

    if (capturedDataUrl) {
      const compressed = await compressBase64Image(capturedDataUrl, 600, 0.7);
      setLiveCoverImage(compressed);
      triggerBeautyToast(i18n.language === 'ku' ? 'وێنەی بەرگ تۆمارکرا 📸' : 'Cover image captured 📸');
      return;
    }

    // Safe fallback: use existing cover or avatar without launching the phone camera app
    const fallbackImage = liveCoverImage || user?.avatar || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800';
    setLiveCoverImage(fallbackImage);
    triggerBeautyToast(i18n.language === 'ku' ? 'وێنەی بەرگ دیاریکرا ✨' : 'Cover photo set ✨');
  };

  const handleRequestEndLive = () => {
    const activeId = currentSessionId;
    forceCloseCameraStudio();
    if (activeId) {
      db.deleteLiveSession(activeId).catch(e => console.error("Firestore discard live error:", e));
    }
    triggerBeautyToast(i18n.language === 'ku' ? 'پەخشەکە ڕاگێرا 🚫' : 'Live stream stopped 🚫');
  };

  const forceCloseCameraStudio = () => {
    stopCamera();
    setShowCameraModal(false);
    setIsLiveMinimized(false);
    setIsLiveNow(false);
    setShowLiveIndicators(false);
    setCurrentSessionId(null);
    setSelectedLiveSession(null);
    setComments([]);
    setShowSaveConfirmModal(false);
    setIsSimulatedCamera(false);
    setCustomVideoUrl(null);
    setCameraError(null);
  };

  const closeCameraModal = () => {
    handleRequestEndLive();
  };

  const handleConfirmSaveAndEnd = () => {
    isSessionClosedRef.current = true;
    const activeId = currentSessionId || `live_${user ? user.id : 'guest'}_${Date.now()}`;
    const retentionDays = user?.broadcastRetentionDays || 30;
    const featuredTitle = liveTitleInput.trim() || (i18n.language === 'ku' ? 'پەخشی ڕاستەوخۆی پاشەکەوتکراو 🔴' : 'Saved Live Stream 🔴');
    const featuredPrice = Number(livePriceInput) || 25000;

    // Immediately stop camera and close modal for instant UI response
    forceCloseCameraStudio();
    triggerBeautyToast(i18n.language === 'ku' ? 'پەخشەکە ڕاگێرا و پاشەکەوت کرا 🎥' : 'Live stream stopped and saved 🎥');

    // Run Firestore save operation
    const bId = user ? user.id : 'guest_streamer';
    const bName = user ? user.name : (i18n.language === 'ku' ? 'پەخشکەری میوان' : 'Guest Broadcaster');
    const bAvatar = user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

    db.saveAndEndLiveSession({
      sessionId: activeId,
      broadcasterId: bId,
      broadcasterName: bName,
      broadcasterAvatar: bAvatar,
      title: featuredTitle,
      featuredTitle: featuredTitle,
      featuredPrice: featuredPrice,
      featuredImage: liveCoverImage,
      location: currentGpsLocation || (i18n.language === 'ku' ? 'هەولێر' : 'Erbil'),
      retentionDays: retentionDays,
      videoUrl: DEFAULT_BROADCAST_VIDEO
    }).catch(e => console.error("Firestore save live error:", e));
  };

  const handleConfirmDiscardAndEnd = () => {
    isSessionClosedRef.current = true;
    const activeId = currentSessionId;
    
    // Immediately stop camera and close modal synchronously
    forceCloseCameraStudio();
    triggerBeautyToast(i18n.language === 'ku' ? 'پەخشەکە ڕاگێرا (بێ پاشەکەوت) 🚫' : 'Live stream stopped (without saving) 🚫');

    if (activeId) {
      db.deleteLiveSession(activeId).catch(e => console.error("Firestore discard live error:", e));
    }
  };

  const capturePhoto = async () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    let dataUrl: string | null = null;
    if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      try {
        setCapturing(true);
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const rawUrl = canvas.toDataURL('image/jpeg');
          dataUrl = await compressBase64Image(rawUrl, 800, 0.7);
        }
      } catch (e) {
        console.warn("Canvas capture error:", e);
      } finally {
        setCapturing(false);
      }
    }

    if (!dataUrl) {
      // Camera stream fallback: prompt user to pick or shoot photo via native camera input
      dataUrl = await new Promise<string | null>((resolve) => {
        const nativeInput = document.createElement('input');
        nativeInput.type = 'file';
        nativeInput.accept = 'image/*';
        nativeInput.setAttribute('capture', 'environment');
        nativeInput.onchange = async (e: any) => {
          const files = e.target.files;
          if (files && files[0]) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const resBase64 = reader.result as string;
              const compressed = await compressBase64Image(resBase64, 800, 0.7);
              resolve(compressed);
            };
            reader.readAsDataURL(files[0]);
          } else {
            resolve(null);
          }
        };
        nativeInput.click();
      });
    }

    if (dataUrl) {
      if (cameraMode === 'add') {
        setUploadedImages(prev => [...prev, dataUrl!]);
        if (!capturedImage) {
          setCapturedImage(dataUrl);
          setSourceImage(dataUrl);
        }
        stopCamera();
        setShowCameraModal(false);
      } else {
        const now = new Date();
        const dateFormatted = `${now.toLocaleDateString('ku-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' })} - ${now.toLocaleTimeString('ku-IQ', { hour: '2-digit', minute: '2-digit' })}`;
        setCaptureDateTime(dateFormatted);
        setUploadedImages([dataUrl]);
        setCapturedImage(dataUrl);
        setSourceImage(dataUrl);
        const activeTitle = pinnedProduct ? pinnedProduct.title : (liveTitleInput || 'پەخشی ڕاستەوخۆی کاڵاکان');
        const activePrice = pinnedProduct ? pinnedProduct.price.toString() : (livePriceInput || '25000');
        setSourceTitle(activeTitle);
        setSourcePrice(activePrice);
        setSourceDesc(getDefaultProductDescription(activeTitle, 'Kurdistan'));
        stopCamera();
        setShowCameraModal(false);
        setShowSourceForm(true);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const files = e.target.files;
    if (files && files.length > 0) {
      setSubmittingFile(true);
      const newImages: string[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (!base64) continue;
          if (file.type.startsWith('video/')) {
            newImages.push(base64);
          } else {
            const compressed = await compressBase64Image(base64, 1200, 0.85);
            newImages.push(compressed || base64);
          }
        }
        
        if (newImages.length > 0) {
          // If the form is closed, user is starting a brand new product upload - do not append to old stale images!
          const updatedList = showSourceForm ? [...uploadedImages, ...newImages] : [...newImages];
          setUploadedImages(updatedList);
          
          if (updatedList.length > 0) {
            setCapturedImage(updatedList[0]);
            setSourceImage(updatedList[0]);
            const unifiedCode = sourceCode || generateAutoSourceCode();
            setSourceCode(unifiedCode);
            setFormUserRole('seller');
            if (!showSourceForm) {
              setSourceTitle(unifiedCode);
              setSourceDesc(getDefaultProductDescription(unifiedCode, sourceLocation));
              setSourcePrice('');
              setSourceResalePrice('');
              setSourceDiscount('');
              setSourceDiscountPercent('');
            }
            setShowSourceForm(true);
            triggerBeautyToast(i18n.language === 'ku' ? 'وێنەکان بە سەرکەوتوویی بارکران 📸' : 'Images uploaded successfully 📸');
          }
        }
      } catch (err) {
        console.error("File upload error:", err);
      } finally {
        setSubmittingFile(false);
        e.target.value = '';
      }
    }
  };

  const saveSourcedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(null);
    setCategoryError(null);

    const numericPrice = sanitizeNumericInput(sourcePrice);
    if (!sourcePrice || isNaN(numericPrice) || numericPrice <= 0) {
      const msg = i18n.language === 'ku' 
        ? "تکایە سەرەتا نرخ بە دروستی بنووسە! (دیاریکردنی نرخ پێویستە)" 
        : "Please enter a valid price before publishing!";
      setPriceError(msg);
      setAiStatusMessage(`⚠️ ${msg}`);
      setFormStep(3);
      return;
    }

    if (!sourceCategory) {
      const msg = i18n.language === 'ku' 
        ? "تکایە پۆلێنی بەرهەمەکە دیاری بکە! (دیاریکردنی پۆلێن پێویستە)" 
        : "Please select a product category before publishing!";
      setCategoryError(msg);
      setAiStatusMessage(`⚠️ ${msg}`);
      setFormStep(2);
      return;
    }

    if (!user) {
      if (onRequireAuth) {
        onRequireAuth(() => {
          setShowSourceForm(true);
        });
      }
      return;
    }

    setSubmittingFile(true);
    try {
      const activeUser = user;
      const phoneVal = activeUser.phone || '';
      const finalSellerPhone = (activeUser.showPhoneToPublic !== false && phoneVal) ? phoneVal : undefined;

      const finalImagesList = [...uploadedImages];
      if (capturedImage && !finalImagesList.includes(capturedImage)) {
        finalImagesList.unshift(capturedImage);
      }
      if (sourceImage && !finalImagesList.includes(sourceImage)) {
        finalImagesList.unshift(sourceImage);
      }
      const primaryImage = finalImagesList[0] || capturedImage || sourceImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80';
      const allItemImages = finalImagesList.length > 0 ? finalImagesList : [primaryImage];

      const finalDesc = sourceDesc?.trim() || getDefaultProductDescription(sourceTitle, sourceLocation);
      const finalCode = sourceCode || generateAutoSourceCode();

      // Calculate price and optional discount
      const baseRawPrice = sanitizeNumericInput(sourcePrice);
      const discountAmountRaw = sanitizeNumericInput(sourceDiscount);
      let calculatedResale = sanitizeNumericInput(sourceResalePrice);

      // If optional discount is provided, compute discounted resale price
      if (discountAmountRaw > 0 && discountAmountRaw < baseRawPrice) {
        calculatedResale = baseRawPrice - discountAmountRaw;
      }

      const usdPrice = sourceCurrency === 'USD' ? baseRawPrice : (baseRawPrice / 1500);
      const usdResalePrice = calculatedResale > 0 
        ? (sourceCurrency === 'USD' ? calculatedResale : (calculatedResale / 1500)) 
        : (discountAmountRaw > 0 ? (sourceCurrency === 'USD' ? (baseRawPrice - discountAmountRaw) : ((baseRawPrice - discountAmountRaw) / 1500)) : 0);

      const newItem: Omit<MarketplaceItem, 'id' | 'createdAt' | 'likes' | 'saves'> = {
        userId: activeUser.id,
        userName: activeUser.name,
        userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeUser.id}`,
        title: sourceTitle?.trim() || finalCode,
        sourceCode: finalCode,
        description: finalDesc,
        weight: finalDesc,
        price: usdPrice,
        shippingPrice: 10.0,
        sellerPhone: finalSellerPhone,
        imageUrl: primaryImage,
        imageUrls: allItemImages,
        category: sourceCategory,
        location: sourceLocation,
        sizes: (sourceSizes || []).filter(Boolean).map(sid => {
          const s = COMMON_SIZES.find(sz => sz.id === sid);
          return i18n.language === 'ku' ? (s?.ku || s?.name || sid) : (s?.name || sid);
        }),
        colors: (sourceColors || []).filter(Boolean).map(cid => {
          const c = COMMON_COLORS.find(cl => cl.id === cid);
          return i18n.language === 'ku' ? (c?.ku || c?.name || cid) : (c?.name || cid);
        }),
        isPublic: true,
        moderationStatus: 'approved',
        resalePrice: usdResalePrice,
        discountPrice: discountAmountRaw > 0 ? (sourceCurrency === 'USD' ? discountAmountRaw : (discountAmountRaw / 1500)) : undefined,
        discountPercent: sourceDiscountPercent ? parseFloat(sourceDiscountPercent) : (discountAmountRaw > 0 && baseRawPrice > 0 ? Math.round((discountAmountRaw / baseRawPrice) * 100) : undefined),
        showResalePriceToPublic: Boolean(usdResalePrice > 0 || discountAmountRaw > 0),
        postType: 'marketplace',
        productKind: 'sale',
        analytics: { views: 1, uniqueVisitors: 1, sales: 0, revenue: 0 },
        customFields: { SourcedRegion: sourceLocation, sourceCode: finalCode },
        features: [],
      };

      if (phoneVal) {
        db.addSellerProfile({
          businessName: activeUser.name,
          contactPhone: phoneVal
        }, activeUser.id).catch(err => console.error("Error saving contact phone to seller profile:", err));
      }

      await db.addMarketplaceItem(newItem);
      window.dispatchEvent(new Event('payv_item_added'));
      window.dispatchEvent(new Event('storage'));
      
      // Show success state
      setIsPublished(true);
      
      // Thoroughly cleanup draft
      localStorage.removeItem('payv_sourcing_draft');
      
      if (onTriggerPet) onTriggerPet();

      // Delay closing to let the user see the success
      setTimeout(() => {
        setShowSourceForm(false);
        setIsPublished(false);
        setSubmittingFile(false);
        setCapturedImage(null);
        setUploadedImages([]);
        setShowCameraModal(false);
        setSourceSizes(['std']);
        setSourceColors([]);
        setSourceTitle('');
        setSourceDesc('');
        setSourcePrice('');
        setSourceResalePrice('');
        setSourceDiscount('');
        setSourceDiscountPercent('');
        
        // Navigate to marketplace to show item immediately
        onSearchChange('');
        onSwitchToMarketplace();
      }, 700);
    } catch (err) {
      console.error("Save error:", err);
      setSubmittingFile(false);
      setAiStatusMessage(i18n.language === 'ku' ? "⚠️ هەڵەیەک ڕوویدا لە کاتی بڵاوکردنەوە." : "⚠️ Error during publishing.");
    }
  };

  const handleSendWhatsAppBuyerOrder = () => {
    const activeBuyerName = user?.name || buyerName || (i18n.language === 'ku' ? 'کڕیاری بەڕێز' : 'Valued Buyer');
    const activeBuyerPhone = user?.phone || buyerPhone || '07746573763';
    const activeBuyerCity = user?.city || buyerCity || (i18n.language === 'ku' ? 'هەولێر' : 'Erbil');
    const activeBuyerAddress = user?.address ? `${activeBuyerCity} - ${user.address}` : `${activeBuyerCity} - ${buyerAddress || (i18n.language === 'ku' ? 'ناونیشانی پرۆفایل' : 'Profile Address')}`;

    const effectiveTitle = pinnedProduct ? pinnedProduct.title : (sourceTitle || (isLiveNow ? liveTitleInput : (i18n.language === 'ku' ? 'داواکاری کاڵای دەستبەجێ' : 'Direct Order Item')));
    const unitPrice = pinnedProduct ? pinnedProduct.price : (Number(sourcePrice) || (isLiveNow ? Number(livePriceInput) : 25000));
    const priceText = `${unitPrice.toLocaleString()} ${i18n.language === 'ku' ? 'د.ع' : 'IQD'}`;
    const totalPriceText = `${(unitPrice * buyerQuantity).toLocaleString()} ${i18n.language === 'ku' ? 'د.ع' : 'IQD'}`;

    const formattedDate = captureDateTime || `${new Date().toLocaleDateString('ku-IQ')} - ${new Date().toLocaleTimeString('ku-IQ', { hour: '2-digit', minute: '2-digit' })}`;
    const orderMsg = 
      `🛍️ *داواکاری کڕینی ڕاستەوخۆ*\n` +
      `==============================\n` +
      `📦 *کاڵا:* ${effectiveTitle}\n` +
      `📅 *بەروار و کاتی وێنەگرتن:* ${formattedDate}\n` +
      `💵 *نرخی تاك:* ${priceText}\n` +
      `🔢 *بڕ:* ${buyerQuantity} دانە\n` +
      `💰 *کۆی گشتی:* ${totalPriceText}\n` +
      `==============================\n` +
      `👤 *زانیاری کڕیار (خۆکارانە لە پرۆفایلەوە):*\n` +
      `• ناوی کڕیار: ${activeBuyerName}\n` +
      `• ژمارەی مۆبایل: ${activeBuyerPhone}\n` +
      `• شار و ئەدرێس: ${activeBuyerAddress}\n` +
      (buyerNote.trim() ? `• تێبینی: ${buyerNote.trim()}\n` : '') +
      `==============================\n` +
      `⚡ نێردراوە لە ڕێگەی سیستەمی بازاڕ`;

    const targetPhone = '9647746573763';
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(orderMsg)}`;
    window.open(waUrl, '_blank');
  };

  const handleBuyerOrderSaveToBasket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    setSubmittingFile(true);
    try {
      const unitPrice = sourcePrice && !isNaN(parseFloat(sourcePrice)) ? parseFloat(sourcePrice) : 0;
      await db.addToBasket(user.id, {
        id: `buy_req_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        title: sourceTitle || 'داواکاری کڕینی کاڵا',
        description: `داواکاری کڕین لەلایەن کڕیار (${buyerCity}) - ${buyerNote || 'تکایە دابین بکرێت'}`,
        price: unitPrice * buyerQuantity,
        imageUrl: sourceImage || capturedImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
        category: 'sourcing_order',
        postType: 'sourcing',
        createdAt: Date.now(),
        sellerId: 'admin_sourcing',
        sellerPhone: buyerPhone || user.phone
      });
      setBuyerOrderSuccess(true);
      setTimeout(() => {
        setBuyerOrderSuccess(false);
        setShowSourceForm(false);
        setCapturedImage(null);
        setSubmittingFile(false);
      }, 1500);
    } catch (err) {
      console.error("Error saving buyer order to basket:", err);
      setSubmittingFile(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start pt-10 sm:pt-14 pb-8 w-full max-w-5xl lg:max-w-6xl mx-auto px-2 sm:px-4 animate-fade-in min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col items-center"
      >
        <div className="w-full max-w-xl mx-auto p-2 sm:p-4 relative flex flex-col justify-center">
          <div className="relative z-10 space-y-5 sm:space-y-6">

            {/* Sourcing Actions Grid - Black, White, Navy & 24K Gold in Dark Theme */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md mx-auto w-full items-stretch">
              {/* 1. Upload / Asset Gallery Card */}
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={handleUploadClick}
                className={clsx(
                  "group cursor-pointer h-36 sm:h-40 md:h-44 w-full rounded-2xl sm:rounded-3xl transition-all relative overflow-hidden flex flex-col hover:-translate-y-0.5",
                  isDarkTheme
                    ? "bg-[#060a16]/85 hover:bg-[#0c142b]/95 border-2 border-amber-400/40 hover:border-amber-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.7),inset_0_1px_2px_0_rgba(255,255,255,0.18)]"
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-2xl border-2 border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.2),inset_0_1px_2px_0_rgba(255,255,255,0.4)]"
                )}
              >
                <div className="w-full h-full p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden">
                  <div className={clsx(
                    "relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md border shrink-0",
                    isDarkTheme
                      ? "bg-[#0c142b] border-2 border-amber-400/70 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                      : "bg-gradient-to-br from-[#523F77] via-[#6B519A] to-[#8B5CF6] text-white border-white/60"
                  )}>
                    <Upload className={clsx("w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm", isDarkTheme ? "text-amber-400 stroke-[2.2]" : "text-white")} />
                  </div>
                  <div className="relative z-10 w-full flex flex-col items-center justify-center">
                    <h3 className={clsx(
                      "font-black uppercase text-xs sm:text-sm tracking-wide leading-tight flex items-center justify-center text-center px-1",
                      isDarkTheme ? "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" : "text-slate-900 drop-shadow-sm"
                    )}>
                      {i18n.language === 'ku' ? 'بارکردنی وێنە و ڤیدیۆ' : 'Upload Media'}
                    </h3>
                  </div>
                </div>
              </motion.div>

              {/* 2. Live Stream Studio Card */}
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={handleCameraClick}
                className={clsx(
                  "group cursor-pointer h-36 sm:h-40 md:h-44 w-full rounded-2xl sm:rounded-3xl transition-all relative overflow-hidden flex flex-col hover:-translate-y-0.5",
                  isDarkTheme
                    ? "bg-[#060a16]/85 hover:bg-[#0c142b]/95 border-2 border-amber-400/40 hover:border-amber-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.7),inset_0_1px_2px_0_rgba(255,255,255,0.18)]"
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-2xl border-2 border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.2),inset_0_1px_2px_0_rgba(255,255,255,0.4)]"
                )}
              >
                <div className="w-full h-full p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden">
                  <div className={clsx(
                    "relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md border shrink-0",
                    isDarkTheme
                      ? "bg-[#0c142b] border-2 border-amber-400/70 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                      : "bg-gradient-to-br from-rose-600 via-red-600 to-amber-500 text-white border-white/60"
                  )}>
                    <Camera className={clsx("w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm", isDarkTheme ? "text-amber-400 stroke-[2.2]" : "text-white")} />
                  </div>
                  <div className="relative z-10 w-full flex flex-col items-center justify-center">
                    <h3 className={clsx(
                      "font-black uppercase text-xs sm:text-sm tracking-wide leading-tight flex items-center justify-center text-center px-1",
                      isDarkTheme ? "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" : "text-slate-900 drop-shadow-sm"
                    )}>
                      {i18n.language === 'ku' ? 'پەخشی ڕاستەوخۆ' : 'Live Stream'}
                    </h3>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="flex flex-col gap-3">
              <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl mx-auto flex items-center">
                <input 
                  type="text"
                  placeholder={t('Search unique items, categories, or styles...')}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className={clsx(
                    "w-full py-3.5 sm:py-4 pl-5 sm:pl-6 pr-13 sm:pr-16 rounded-2xl md:rounded-[1.75rem] border text-sm sm:text-base md:text-lg shadow-xl focus:outline-none transition-all font-black",
                    isDarkTheme
                      ? "bg-[#040714]/90 text-white border-amber-400/50 focus:border-amber-300 placeholder:text-slate-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)]"
                      : (inputClasses[theme as keyof typeof inputClasses] || inputClasses.rainbow)
                  )}
                />
                <button 
                  type="submit"
                  className={clsx(
                    "absolute top-1/2 -translate-y-1/2 right-2 sm:right-2.5 p-2.5 sm:p-3 rounded-xl md:rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer z-10 overflow-hidden",
                    isDarkTheme
                      ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 border border-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.45),inset_0_1px_2px_rgba(255,255,255,0.8)]"
                      : "bg-gradient-to-br from-emerald-500/90 via-teal-600/95 to-emerald-700/90 hover:from-emerald-400 hover:to-teal-500 text-white backdrop-blur-md border border-emerald-300/40 shadow-[0_4px_16px_rgba(16,185,129,0.35)]"
                  )}
                  aria-label="Search"
                >
                  <Search className={clsx("w-5 h-5 relative z-10", isDarkTheme ? "text-slate-950 stroke-[2.8]" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]")} />
                </button>
              </form>
            </div>


          </div>
        </div>

        {/* Legal & Copyright Protection Footer strictly inside Sourcing Hub */}
        <LegalFooter theme={theme} />
      </motion.div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*,video/*" 
        multiple
        className="hidden" 
      />



      {/* Camera Scanning & Sourcing Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(showCameraModal || selectedLiveSession) && (
            <motion.div
              drag={isLiveMinimized}
              dragMomentum={false}
              dragElastic={0.12}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className={clsx(
                isLiveMinimized
                  ? "fixed bottom-20 right-4 sm:right-6 z-[9999999] w-36 sm:w-44 aspect-[9/16] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-red-500/90 bg-slate-950 cursor-grab active:cursor-grabbing touch-none select-none flex flex-col"
                  : "fixed inset-0 w-screen h-screen w-full h-full bg-black z-[9999999] flex flex-col items-center justify-center transition-all duration-300 p-0 overflow-hidden"
              )}
            >
            {/* Header shown ONLY when minimized in picture-in-picture mode */}
            {isLiveMinimized && (
              <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-[8px] font-black text-white uppercase tracking-wider">LIVE</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLiveMinimized(false);
                    }}
                    className="w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-90 cursor-pointer transition-transform"
                    title={i18n.language === 'ku' ? 'گەورەکردنەوە' : 'Maximize'}
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeCameraModal();
                      setSelectedLiveSession(null);
                      setIsLiveMinimized(false);
                    }} 
                    className="w-6 h-6 rounded-full bg-red-600/85 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md active:scale-90 cursor-pointer transition-transform"
                    title={i18n.language === 'ku' ? 'داخستن' : 'Close'}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            )}

            {/* Video container filling 100% height and width */}
            <div 
              onClick={() => {
                if (isLiveMinimized) {
                  setIsLiveMinimized(false);
                }
              }}
              className="relative bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex-1 w-full h-full flex items-center justify-center overflow-hidden"
            >
              {selectedLiveSession ? (
                <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center overflow-hidden">
                  {/* Ambient Glows to eliminate black screen */}
                  <div className="absolute -top-24 -left-24 w-72 h-72 bg-rose-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

                  {/* Live Backdrop Poster while connecting */}
                  <img
                    src={selectedLiveSession.currentFrame || selectedLiveSession.featuredImage || selectedLiveSession.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLiveSession.broadcasterId}`}
                    alt=""
                    className="w-full h-full object-cover absolute inset-0 z-1 filter brightness-90 scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLiveSession.broadcasterId}`;
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/40 z-1" />

                  {(() => {
                    const rawUrl = (selectedLiveSession as any).streamUrl || (selectedLiveSession as any).videoUrl;
                    const effectiveViewerVideo = (rawUrl && typeof rawUrl === 'string' && !rawUrl.includes('flower') && !rawUrl.includes('friday') && rawUrl.trim().length > 0)
                      ? rawUrl
                      : DEFAULT_BROADCAST_VIDEO;
                    return (
                      <video 
                        ref={liveVideoRef}
                        src={hasViewerStreamObject ? undefined : effectiveViewerVideo} 
                        poster={selectedLiveSession.currentFrame || selectedLiveSession.featuredImage || selectedLiveSession.broadcasterAvatar}
                        autoPlay 
                        loop={!hasViewerStreamObject}
                        playsInline 
                        webkit-playsinline="true"
                        x5-video-player-type="h5-page"
                        x5-video-player-fullscreen="true"
                        x5-playsinline="true"
                        muted={isAudioMuted}
                        className="w-full h-full object-cover relative z-5 transition-opacity duration-500"
                      />
                    );
                  })()}
                  
                  {/* Full Screen Top Header Overlay for Viewer Mode */}
                  <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between pointer-events-auto flex-row-reverse">
                    <button
                      onClick={() => {
                        closeCameraModal();
                        setSelectedLiveSession(null);
                      }}
                      className="px-4 py-2 bg-white/95 hover:bg-white active:scale-95 backdrop-blur-xl border border-slate-200 text-slate-900 rounded-full transition-all shadow-lg flex items-center gap-2 font-black text-xs cursor-pointer group"
                      title={i18n.language === 'ku' ? 'گەڕانەوە' : 'Go Back'}
                    >
                      <ArrowRight className="w-4 h-4 text-slate-800 rtl:rotate-0 ltr:rotate-180 group-hover:translate-x-1 transition-transform" />
                      <span>{i18n.language === 'ku' ? 'گەڕانەوە' : 'Back'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenSellerProfile(selectedLiveSession.broadcasterId, {
                            name: selectedLiveSession.broadcasterName,
                            avatar: selectedLiveSession.broadcasterAvatar,
                            location: selectedLiveSession.location
                          });
                        }}
                        className="flex items-center gap-1.5 bg-white/95 hover:bg-white backdrop-blur-xl border border-slate-200 px-3.5 py-1.5 rounded-full text-slate-900 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95"
                        title={i18n.language === 'ku' ? 'بینینی پرۆفایلی ئەم فرۆشیارە' : 'View seller profile'}
                      >
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                        <span className="text-red-600 font-extrabold uppercase text-[10px] tracking-wider">LIVE</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-900 truncate max-w-[130px]">{db.sanitizeBrandName ? db.sanitizeBrandName(selectedLiveSession.broadcasterName) : selectedLiveSession.broadcasterName}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsLiveMinimized(true)}
                        className="p-2.5 bg-white/95 hover:bg-white backdrop-blur-xl border border-slate-200 rounded-full text-slate-800 transition-all cursor-pointer shadow-md active:scale-95"
                        title={i18n.language === 'ku' ? 'بچووککردنەوە' : 'Minimize'}
                      >
                        <Minimize2 className="w-4 h-4 text-slate-700 shrink-0" />
                      </button>

                      <button
                        onClick={() => setIsAudioMuted(!isAudioMuted)}
                        className="p-2.5 bg-white/95 hover:bg-white backdrop-blur-xl border border-slate-200 rounded-full text-slate-800 transition-all cursor-pointer shadow-md active:scale-95"
                        title={isAudioMuted ? (i18n.language === 'ku' ? 'دەنگ چالاک بکە' : 'Unmute') : (i18n.language === 'ku' ? 'بێدەنگکردن' : 'Mute')}
                      >
                        {isAudioMuted ? (
                          <VolumeX className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center">
                  {/* Ambient dynamic glow behind video ensuring zero black screen */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950/80 pointer-events-none" />
                  <div className="absolute -top-20 -left-20 w-72 h-72 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

                  {/* Always mounted video element streaming live camera or broadcast */}
                  <video 
                    ref={(el) => {
                      videoRef.current = el;
                    }} 
                    autoPlay 
                    playsInline 
                    muted
                    loop
                    poster={liveCoverImage || user?.avatar || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&q=80'}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== DEFAULT_BROADCAST_VIDEO) {
                        target.src = DEFAULT_BROADCAST_VIDEO;
                        target.play().catch(() => {});
                      } else if (target.src !== FALLBACK_BROADCAST_VIDEO) {
                        target.src = FALLBACK_BROADCAST_VIDEO;
                        target.play().catch(() => {});
                      }
                    }}
                    style={{ filter: getVideoFilterClass() }}
                    className={clsx(
                      "w-full h-full object-cover transition-all duration-300 block relative z-5",
                      facingMode === 'user' && cameraStream && !customVideoUrl && "transform scale-x-[-1]"
                    )} 
                  />

                  {/* Beauty Overlay */}
                  {(isBeautyEnhanced || selectedFilter === 'snapchat' || selectedFilter === 'rosy') && (
                    <div className="pointer-events-none absolute inset-0 z-10 mix-blend-soft-light bg-gradient-to-tr from-rose-400/20 via-amber-100/10 to-pink-300/20 backdrop-blur-[0.3px]" />
                  )}
                  
                  {/* Flash animation layer */}
                  <div className={clsx("pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-200", flashActive ? "opacity-95" : "opacity-0")} />

                  {/* Beauty Toast Indicator */}
                  {beautyToast && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-pink-600 text-white backdrop-blur-xl px-4 py-2 rounded-full font-black text-xs border border-pink-300 shadow-xl animate-bounce flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
                      <span>{beautyToast}</span>
                    </div>
                  )}
                </div>
              )}

                  {/* Pre-LIVE & LIVE Overlays (Hidden in PiP mode) */}
                  {!isLiveMinimized && (
                    !isLiveNow && !selectedLiveSession ? (
                    /* Pre-LIVE Setup Screen */
                    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 pointer-events-auto overflow-hidden">
                      {/* Top Header Bar with Back Button & Product Setup Card at the TOP */}
                      <div className="flex items-center gap-2 w-full pt-1 ltr:flex-row rtl:flex-row-reverse">
                        <button 
                          onClick={closeCameraModal} 
                          className="w-10 h-10 bg-white/95 hover:bg-white active:scale-90 backdrop-blur-2xl border border-slate-200 text-slate-800 rounded-full transition-all cursor-pointer shadow-lg flex items-center justify-center shrink-0 z-50"
                          title={i18n.language === 'ku' ? 'گەڕانەوە' : 'Go Back'}
                          aria-label="Back"
                        >
                          <ArrowRight className="w-5 h-5 text-slate-800 rtl:rotate-0 ltr:rotate-180" />
                        </button>

                        {/* Top Card: Cover Photo & Title/Price Inputs placed directly at top header */}
                        <div className="flex-1 min-w-0 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl p-2.5 shadow-xl flex items-center gap-2.5">
                          {/* Cover Photo Circle with Camera Snapshot Badge */}
                          <div className="relative shrink-0 group">
                            <div 
                              onClick={() => setShowCoverMenu(true)}
                              className="w-12 h-12 rounded-xl overflow-hidden border-2 border-rose-500 shadow-md bg-slate-100 cursor-pointer relative group-hover:scale-105 transition-all"
                              title={i18n.language === 'ku' ? 'گۆڕینی وێنەی بەرگ' : 'Change Cover Photo'}
                            >
                              <img src={liveCoverImage} className="w-full h-full object-cover" alt="Cover" />
                              <div className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center text-white opacity-90 group-hover:opacity-100 transition-opacity">
                                <Edit2 className="w-3.5 h-3.5 text-white drop-shadow" />
                                <span className="text-[7px] font-extrabold mt-0.5">{i18n.language === 'ku' ? 'گۆڕین' : 'Change'}</span>
                              </div>
                            </div>
                            {/* 1-Tap Camera Snapshot Button Badge */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                triggerCameraFlash();
                                await snapCoverFromCamera();
                              }}
                              className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-all z-10"
                              title={i18n.language === 'ku' ? 'وێنەگرتن لە کامێرا' : 'Snap Live Photo'}
                            >
                              <Camera className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Title & Price Inputs */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="relative flex items-center">
                              <input 
                                type="text" 
                                value={liveTitleInput}
                                onChange={(e) => setLiveTitleInput(e.target.value)}
                                placeholder={i18n.language === 'ku' ? 'ناوی پەخش یان کاڵاکەت بنووسە...' : 'Broadcast or product title...'}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-black text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 pr-7"
                              />
                              <Edit2 className="w-3 h-3 text-red-500 absolute right-2 pointer-events-none" />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-600 shrink-0">{i18n.language === 'ku' ? 'نرخی سەرەکی:' : 'Price:'}</span>
                              <div className="relative flex items-center flex-1 min-w-0">
                                <input 
                                  type="number" 
                                  value={livePriceInput}
                                  onChange={(e) => setLivePriceInput(e.target.value)}
                                  placeholder="25000"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2 pr-12 py-1 text-xs font-black text-emerald-700 placeholder-slate-400 focus:outline-none focus:border-red-500 font-mono"
                                />
                                <span className="absolute right-2 text-[10px] font-black text-emerald-600 pointer-events-none">{i18n.language === 'ku' ? 'د.ع' : 'IQD'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hidden file input for cover photo */}
                      <input 
                        type="file" 
                        ref={coverFileInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleCoverPhotoChange} 
                      />

                      {/* TikTok Right Action Toolbar */}
                      <div className="absolute top-28 right-3 flex flex-col gap-3.5 items-center z-30">
                        {/* Microphone Mute/Unmute Toggle */}
                        <button 
                          onClick={toggleBroadcasterMic}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-emerald-400 transition-colors"
                          title={isBroadcasterMicMuted ? (i18n.language === 'ku' ? 'کردنەوەی دەنگ' : 'Unmute Mic') : (i18n.language === 'ku' ? 'کوژاندنەوەی دەنگ' : 'Mute Mic')}
                        >
                          <div className={clsx(
                            "p-2.5 backdrop-blur-md border rounded-full shadow-lg transition-all",
                            isBroadcasterMicMuted ? "bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-black/50 border-white/20 text-white"
                          )}>
                            {isBroadcasterMicMuted ? <MicOff className="w-5 h-5 text-red-200" /> : <Mic className="w-5 h-5 text-emerald-300" />}
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">
                            {isBroadcasterMicMuted 
                              ? (i18n.language === 'ku' ? 'بێ دەنگ' : 'Muted') 
                              : (i18n.language === 'ku' ? 'دەنگ' : 'Mic')}
                          </span>
                        </button>

                        <button 
                          onClick={toggleCamera}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-red-400 transition-colors"
                        >
                          <div className="p-2.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
                            <RefreshCw className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">{i18n.language === 'ku' ? 'سەر/ژێر' : 'Flip'}</span>
                        </button>

                        {/* Camera Hardware or Demo Video switcher */}
                        <button 
                          onClick={() => {
                            if (cameraStream) {
                              videoStreamFileInputRef.current?.click();
                            } else {
                              startCamera();
                            }
                          }}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-teal-400 transition-colors"
                          title={cameraStream ? (i18n.language === 'ku' ? 'گۆڕین بۆ ڤیدیۆ' : 'Switch to Video') : (i18n.language === 'ku' ? 'کردنەوەی کامێرا' : 'Turn on Camera')}
                        >
                          <div className={clsx(
                            "p-2.5 backdrop-blur-md border rounded-full shadow-lg transition-all",
                            !cameraStream ? "bg-amber-500/90 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-black/50 border-white/20 text-white"
                          )}>
                            {!cameraStream ? <Video className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">
                            {!cameraStream ? (i18n.language === 'ku' ? 'ڤیدیۆ' : 'Video') : (i18n.language === 'ku' ? 'کامێرا' : 'Camera')}
                          </span>
                        </button>

                        <button 
                          onClick={() => {
                            const nextState = !isBeautyEnhanced;
                            setIsBeautyEnhanced(nextState);
                            triggerBeautyToast(
                              nextState
                                ? (i18n.language === 'ku' ? 'فلتەری جوانکاری ڕوخسار چالاککرا ✨' : 'Face Beautifier Active ✨')
                                : (i18n.language === 'ku' ? 'فلتەری جوانکاری ناچالاککرا' : 'Beauty Filter Off')
                            );
                          }}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-pink-400 transition-colors"
                        >
                          <div className={clsx(
                            "p-2.5 backdrop-blur-md border rounded-full shadow-lg transition-all",
                            isBeautyEnhanced ? "bg-pink-600 text-white border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]" : "bg-black/50 border-white/20 text-white"
                          )}>
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">{i18n.language === 'ku' ? 'جوانکاری' : 'Enhance'}</span>
                        </button>

                        {/* Night Mode / Evening Boost button */}
                        <button 
                          onClick={() => {
                            const nextState = !isNightBoost;
                            setIsNightBoost(nextState);
                            triggerBeautyToast(
                              nextState
                                ? (i18n.language === 'ku' ? 'مۆدی شەوانە و ڕووناککەرەوە چالاککرا 🌙💡' : 'Night Light / Evening Boost Active 🌙💡')
                                : (i18n.language === 'ku' ? 'مۆدی شەوانە ناچالاککرا' : 'Night Boost Off')
                            );
                          }}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-amber-300 transition-colors"
                          title={i18n.language === 'ku' ? 'ڕووناککردنەوەی شەوانە' : 'Night Boost'}
                        >
                          <div className={clsx(
                            "p-2.5 backdrop-blur-md border rounded-full shadow-lg transition-all",
                            isNightBoost ? "bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.6)]" : "bg-black/50 border-white/20 text-white"
                          )}>
                            <Moon className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">{i18n.language === 'ku' ? 'شەوانە' : 'Night'}</span>
                        </button>

                        <button 
                          onClick={() => setShowFilterSelector(!showFilterSelector)}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-purple-400 transition-colors"
                        >
                          <div className={clsx(
                            "p-2.5 backdrop-blur-md border rounded-full shadow-lg transition-all",
                            showFilterSelector || selectedFilter !== 'none' ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "bg-black/50 border-white/20 text-white"
                          )}>
                            <Wand2 className="w-5 h-5 text-purple-200" />
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">{i18n.language === 'ku' ? 'فلتەر' : 'Effects'}</span>
                        </button>

                        <button 
                          onClick={() => {
                            loadPickerItems();
                            setShowProductPicker(true);
                          }}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-amber-400 transition-colors"
                        >
                          <div className="p-2.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
                            <ShoppingBag className="w-5 h-5 text-amber-300" />
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">{i18n.language === 'ku' ? 'کاڵاکان' : 'Business'}</span>
                        </button>

                        <button 
                          onClick={() => setShowSettingsModal(true)}
                          className="flex flex-col items-center gap-0.5 text-white hover:text-slate-300 transition-colors"
                        >
                          <div className="p-2.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
                            <Settings className="w-5 h-5 text-slate-200" />
                          </div>
                          <span className="text-[9px] font-extrabold text-white drop-shadow">{i18n.language === 'ku' ? 'ڕێکخستن' : 'Settings'}</span>
                        </button>
                      </div>

                      {/* Live Filter Preset Selector Drawer */}
                      {showFilterSelector && (
                        <div className="absolute bottom-24 left-3 right-3 z-40 bg-slate-950/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-3 shadow-2xl animate-fade-in">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                            <span className="text-xs font-black text-white flex items-center gap-1.5">
                              <Wand2 className="w-4 h-4 text-purple-400" />
                              {i18n.language === 'ku' ? 'فلتەرەکانی پەخشی ڕاستەوخۆ' : 'Live Filters'}
                            </span>
                            <button 
                              onClick={() => setShowFilterSelector(false)}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                            {[
                              { id: 'beauty', nameKu: '✨ روونی ڕوخسار', nameEn: '✨ Ultra Glow', color: 'from-amber-400 via-pink-500 to-rose-500' },
                              { id: 'rosy', nameKu: '🌸 گوڵاو', nameEn: '🌸 Rosy Blush', color: 'from-rose-500 to-pink-600' },
                              { id: 'glamour', nameKu: '✨ هۆڵیوود', nameEn: '✨ Hollywood', color: 'from-pink-500 to-purple-600' },
                              { id: 'warm', nameKu: '☀️ گەرم', nameEn: '☀️ Warm', color: 'from-amber-600 to-orange-600' },
                              { id: 'cool', nameKu: '❄️ سارد', nameEn: '❄️ Cool', color: 'from-cyan-600 to-blue-600' },
                              { id: 'vivid', nameKu: '💎 ڕووناک', nameEn: '💎 Vivid', color: 'from-emerald-500 to-teal-600' },
                              { id: 'vintage', nameKu: '🎞️ کۆن', nameEn: '🎞️ Vintage', color: 'from-yellow-700 to-amber-800' },
                              { id: 'noir', nameKu: '🖤 ڕەش/سپی', nameEn: '🖤 Noir', color: 'from-gray-800 to-black' },
                              { id: 'none', nameKu: 'ئاسایی', nameEn: 'Normal', color: 'from-slate-700 to-slate-800' },
                            ].map((f) => (
                              <button
                                key={f.id}
                                onClick={() => {
                                  setSelectedFilter(f.id as any);
                                  triggerBeautyToast(
                                    f.id === 'beauty'
                                      ? (i18n.language === 'ku' ? 'فلتەری روونی ڕوخسار ✨' : 'Ultra Glow Filter ✨')
                                      : (i18n.language === 'ku' ? `فلتەری ${f.nameKu}` : `Filter: ${f.nameEn}`)
                                  );
                                }}
                                className={clsx(
                                  "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all shrink-0 cursor-pointer",
                                  selectedFilter === f.id
                                    ? "border-purple-400 bg-purple-500/30 scale-105 shadow-lg"
                                    : "border-white/10 bg-black/40 hover:bg-black/60"
                                )}
                              >
                                <div className={clsx("w-9 h-9 rounded-full bg-gradient-to-tr shadow border border-white/20 flex items-center justify-center text-white text-[10px] font-black", f.color)}>
                                  {selectedFilter === f.id && <Check className="w-4 h-4 text-white" />}
                                </div>
                                <span className="text-[10px] font-bold text-white whitespace-nowrap">
                                  {i18n.language === 'ku' ? f.nameKu : f.nameEn}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cover Photo Change Modal */}
                      {showCoverMenu && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
                          <div className="bg-slate-900 border border-white/20 rounded-3xl p-5 max-w-xs w-full shadow-2xl text-center space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-white/10">
                              <h4 className="text-sm font-black text-white">
                                {i18n.language === 'ku' ? 'گۆڕینی وێنەی بەرگ' : 'Change Cover Image'}
                              </h4>
                              <button 
                                onClick={() => setShowCoverMenu(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-full cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              {/* Option 1: Live Snapshot from Camera */}
                              <button
                                onClick={async () => {
                                  triggerCameraFlash();
                                  await snapCoverFromCamera();
                                  setShowCoverMenu(false);
                                }}
                                className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 rounded-2xl text-white font-bold text-xs transition-all cursor-pointer group"
                              >
                                <div className="p-2.5 bg-emerald-500 rounded-xl text-slate-950 group-hover:scale-110 transition-transform">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <div className="text-right flex-1">
                                  <div className="font-black text-emerald-300 text-xs">
                                    {i18n.language === 'ku' ? 'وێنەگرتن ڕاستەوخۆ لە کامێرا' : 'Take Camera Snapshot'}
                                  </div>
                                  <div className="text-[10px] text-emerald-200/70">
                                    {i18n.language === 'ku' ? 'گرتنی وێنەی ئێستای کامێراکەت' : 'Capture current camera view'}
                                  </div>
                                </div>
                              </button>

                              {/* Option 2: Select from Gallery */}
                              <button
                                onClick={() => {
                                  setShowCoverMenu(false);
                                  if (coverFileInputRef.current) {
                                    coverFileInputRef.current.value = '';
                                    coverFileInputRef.current.click();
                                  }
                                }}
                                className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 rounded-2xl text-white font-bold text-xs transition-all cursor-pointer group"
                              >
                                <div className="p-2.5 bg-purple-500 rounded-xl text-white group-hover:scale-110 transition-transform">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                                <div className="text-right flex-1">
                                  <div className="font-black text-purple-200 text-xs">
                                    {i18n.language === 'ku' ? 'هەڵبژاردنی وێنە لە گەلەری' : 'Choose from Gallery'}
                                  </div>
                                  <div className="text-[10px] text-purple-300/70">
                                    {i18n.language === 'ku' ? 'بەرزکردنەوەی وێنە لە مۆبایلەکەت' : 'Upload photo from your device'}
                                  </div>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Center Area: Go LIVE Button */}
                      <div className="flex flex-col items-center justify-center gap-2.5 w-full pb-2 z-30 px-4">
                        {/* Red Go LIVE Button */}
                        <button 
                          onClick={handleGoLiveNow}
                          className="w-full max-w-xs py-3.5 bg-gradient-to-r from-rose-500 via-red-600 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-full shadow-[0_10px_35px_rgba(225,29,72,0.7)] border border-white/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Radio className="w-5 h-5 text-white animate-pulse" />
                          <span>{i18n.language === 'ku' ? 'دەستپێکردنی پەخش' : 'Go LIVE'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Active LIVE Broadcast Overlay - Clean Responsive Top Bar */
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 z-20">
                      {/* Top Action & Broadcaster Bar - Never wraps, pristine spacing */}
                      <div className="flex items-center justify-between gap-1 sm:gap-2 w-full pointer-events-auto">
                        {/* Left/Start: Back & Minimize Button */}
                        <div className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedLiveSession) {
                                closeCameraModal();
                                setSelectedLiveSession(null);
                              } else {
                                setIsLiveMinimized(true);
                              }
                            }}
                            className="px-2.5 sm:px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-black shadow-lg border border-white/20"
                            title={i18n.language === 'ku' ? 'گەڕانەوە و بچووککردنەوە بۆ سەر شاشە' : 'Back & Minimize to PiP'}
                            aria-label={i18n.language === 'ku' ? 'گەڕانەوە' : 'Back'}
                          >
                            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180 text-emerald-400" />
                            <Minimize2 className="w-3 h-3 text-amber-300" />
                            <span>{i18n.language === 'ku' ? 'گەڕانەوە' : 'Back'}</span>
                          </button>
                        </div>

                        {/* Middle/Center: Seller Profile (Viewer Mode) OR Broadcaster LIVE Indicator (Broadcaster Mode) */}
                        {selectedLiveSession ? (
                          <div 
                            onClick={() => {
                              const sId = selectedLiveSession?.broadcasterId || user?.id || 'seller_1';
                              const sName = selectedLiveSession?.broadcasterName || user?.name || (i18n.language === 'ku' ? 'فرۆشیاری ئی-بازرگان' : 'E-BAZIRGAN Seller');
                              const sAvatar = selectedLiveSession?.broadcasterAvatar || user?.avatar;
                              const sPhone = user?.phone;
                              const sLoc = selectedLiveSession?.location || user?.city;
                              handleOpenSellerProfile(sId, { name: sName, phone: sPhone, avatar: sAvatar, location: sLoc });
                            }}
                            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 p-1 pr-2 rounded-full shadow-lg text-slate-900 cursor-pointer hover:bg-slate-100 transition-all active:scale-95 shrink truncate max-w-[170px] sm:max-w-[220px]"
                            title={i18n.language === 'ku' ? 'بینینی پرۆفایلی ئەم فرۆشیارە' : 'View seller profile'}
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-[10px] text-white shrink-0 shadow-sm">
                              {(db.sanitizeBrandName ? db.sanitizeBrandName(selectedLiveSession?.broadcasterName || user?.name || 'P') : (selectedLiveSession?.broadcasterName || user?.name || 'P')).slice(0, 1).toUpperCase()}
                            </div>
                            <span 
                              className="text-[11px] font-black text-slate-900 hover:text-red-600 truncate max-w-[65px] sm:max-w-[90px]"
                            >
                              {db.sanitizeBrandName ? db.sanitizeBrandName(selectedLiveSession?.broadcasterName || user?.name || (i18n.language === 'ku' ? 'فرۆشیار' : 'Seller')) : (selectedLiveSession?.broadcasterName || user?.name || (i18n.language === 'ku' ? 'فرۆشیار' : 'Seller'))}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const sId = selectedLiveSession?.broadcasterId || 'seller_1';
                                toggleFollowSeller(sId);
                              }}
                              className={clsx(
                                "px-2 py-0.5 rounded-full text-[9px] font-black transition-all shrink-0 cursor-pointer active:scale-95 shadow-sm",
                                followedSellers.includes(selectedLiveSession?.broadcasterId || 'seller_1')
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
                              )}
                            >
                              {followedSellers.includes(selectedLiveSession?.broadcasterId || 'seller_1') 
                                ? (i18n.language === 'ku' ? 'شوێنکەوتووی ✓' : 'Followed ✓') 
                                : (i18n.language === 'ku' ? '+ شوێنکەوتن' : '+ Follow')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full shadow-lg shrink truncate max-w-[140px] sm:max-w-[200px]">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">LIVE</span>
                            <span className="text-[11px] font-black text-white truncate">{user?.name || (i18n.language === 'ku' ? 'پەخشی من' : 'My Stream')}</span>
                          </div>
                        )}

                        {/* Right/End: Viewers Badge & Broadcaster Controls */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          {/* Viewers Badge */}
                          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-slate-200 px-2 py-1 rounded-full text-slate-900 shadow-md">
                            <div className="flex items-center gap-0.5 bg-red-600 text-white px-1.5 py-0.2 rounded-full font-black text-[8px] tracking-widest uppercase animate-pulse shrink-0">
                              <span className="w-1 h-1 bg-white rounded-full"></span>
                              LIVE
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] font-extrabold text-slate-700 shrink-0">
                              <UserIcon className="w-2.5 h-2.5 text-red-500" />
                              <span>{viewerCount}</span>
                            </div>
                          </div>

                          {!selectedLiveSession && (
                            <>
                              <button 
                                type="button"
                                onClick={toggleBroadcasterMic} 
                                aria-label="Toggle Mic" 
                                title={isBroadcasterMicMuted ? (i18n.language === 'ku' ? 'کردنەوەی دەنگ' : 'Unmute Mic') : (i18n.language === 'ku' ? 'کوژاندنەوەی دەنگ' : 'Mute Mic')} 
                                className={clsx(
                                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-xl border transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0 z-50",
                                  isBroadcasterMicMuted 
                                    ? "bg-red-600 border-red-500 text-white shadow-red-600/30" 
                                    : "bg-emerald-600/95 hover:bg-emerald-500 border-emerald-400/40 text-white shadow-emerald-600/20"
                                )}
                              >
                                {isBroadcasterMicMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  if (cameraStream) {
                                    toggleCamera();
                                  } else {
                                    startCamera();
                                  }
                                }} 
                                aria-label="Switch camera" 
                                title={i18n.language === 'ku' ? 'سەر و ژێری کامێرا' : 'Flip Camera'} 
                                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/95 hover:bg-white backdrop-blur-xl border border-slate-200 text-slate-800 rounded-full transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0 z-50"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-700" />
                              </button>
                            </>
                          )}

                          {/* Stop Broadcast Button */}
                          {!selectedLiveSession && (
                            <button
                              type="button"
                              onClick={handleRequestEndLive}
                              className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-full shadow-lg cursor-pointer border border-red-400 active:scale-95 flex items-center justify-center shrink-0 z-50"
                              title={i18n.language === 'ku' ? 'کۆتاییهێنان بە پەخش' : 'End Live Broadcast'}
                              aria-label="End Broadcast"
                            >
                              <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white animate-pulse" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Video Stream Notice (if camera is not active in broadcast) - Non-colliding normal flex flow */}
                      {!cameraStream && !selectedLiveSession && (
                        <div className="mx-auto mt-2 pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 py-1 bg-black/80 backdrop-blur-md rounded-full border border-amber-500/50 text-amber-300 text-[11px] font-bold shadow-xl">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          <span>{i18n.language === 'ku' ? 'پەخشی ڤیدیۆیی چالاکە' : 'Video stream active'}</span>
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shrink-0"
                          >
                            <Camera className="w-2.5 h-2.5" />
                            <span>{i18n.language === 'ku' ? 'کامێرا' : 'Camera'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => videoStreamFileInputRef.current?.click()}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shrink-0"
                          >
                            <Upload className="w-2.5 h-2.5 text-teal-300" />
                            <span>{i18n.language === 'ku' ? 'گۆڕین' : 'Upload'}</span>
                          </button>
                        </div>
                      )}

                      {/* Bottom Live Controls Area */}
                      <div className="flex flex-col gap-2 w-full">
                        {/* TikTok Comments simulation */}
                        <div className="space-y-1.5 max-w-[85%] overflow-y-auto max-h-[22vh] no-scrollbar pointer-events-auto pr-2">
                           <AnimatePresence mode="popLayout">
                              {comments.map((comment, idx) => (
                                <motion.div 
                                  key={`${comment.id || 'comment'}-${idx}`}
                                  layout
                                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                                  className="flex flex-col bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-200 w-fit shadow-md"
                                >
                                   <span className="font-black text-red-600 text-[9px] uppercase tracking-tighter leading-none mb-0.5">{comment.user}</span>
                                   <span className="text-[11px] text-slate-900 font-medium leading-tight">{comment.text}</span>
                                </motion.div>
                              ))}
                           </AnimatePresence>
                        </div>

                        {/* Slim Floating Live Pinned Item Toolbar */}
                        <div className="pointer-events-auto flex items-center justify-between gap-2 bg-white/95 backdrop-blur-xl border border-slate-200 px-3 py-1.5 rounded-2xl shadow-xl w-full max-w-sm mx-auto">
                           <div className="flex items-center gap-2 min-w-0">
                             <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 relative shadow-sm">
                               <img src={pinnedProduct?.imageUrl || pinnedProduct?.images?.[0] || liveCoverImage} className="w-full h-full object-cover" alt="" />
                               <span className="absolute top-0 left-0 bg-red-600 text-white text-[6px] font-black px-0.5 rounded-br">LIVE</span>
                             </div>
                             <div className="min-w-0 text-right">
                               <h4 className="text-[11px] font-black text-slate-900 truncate">
                                 {pinnedProduct?.title || liveTitleInput || (i18n.language === 'ku' ? 'پەخشی ڕاستەوخۆی کاڵاکان' : 'Live Item')}
                               </h4>
                               <div className="text-[10px] font-extrabold text-emerald-700 font-mono">
                                 {(pinnedProduct ? pinnedProduct.price : Number(livePriceInput) || 25000).toLocaleString()} {i18n.language === 'ku' ? 'د.ع' : 'IQD'}
                               </div>
                             </div>
                           </div>

                           <button 
                             type="button"
                             onClick={() => handleBuyPinnedProduct(pinnedProduct)}
                             className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1"
                           >
                             <ShoppingBag className="w-3.5 h-3.5" />
                             <span>{i18n.language === 'ku' ? 'کڕین' : 'BUY'}</span>
                           </button>
                        </div>

                        {/* Comment Input for live stream */}
                        <div className="pointer-events-auto flex items-center gap-2" dir="ltr">
                           <input 
                              type="text"
                              value={liveCommentText}
                              onChange={(e) => setLiveCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && sendLiveComment()}
                              placeholder={i18n.language === 'ku' ? 'شتێک بڵێ...' : 'Say something...'}
                              dir={i18n.language === 'ku' ? 'rtl' : 'ltr'}
                              className="flex-1 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 placeholder:text-slate-400 shadow-sm"
                           />
                           <button 
                              type="button"
                              onClick={() => sendLiveComment()}
                              className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-full text-xs font-black shrink-0 active:scale-95 transition-transform cursor-pointer shadow-md"
                           >
                              {i18n.language === 'ku' ? 'ناردن' : 'SEND'}
                           </button>
                        </div>
                      </div>
                    </div>
                  )
                )}

                  {/* Camera Shutter Effect */}
                  <AnimatePresence>
                    {capturing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white z-50"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Sourcing form Modal */}
      <AnimatePresence>
        {showSourceForm && capturedImage && (
          <div className={clsx(
            "fixed inset-x-0 inset-y-0 z-[1000000] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain transition-colors",
            isRainbow ? "bg-slate-900/40 backdrop-blur-md" : "bg-slate-950/70 backdrop-blur-xl"
          )}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                "w-full max-w-lg rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 h-auto max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col pb-5 relative transition-all",
                isRainbow 
                  ? "bg-gradient-to-br from-pink-50/98 via-white/98 to-sky-50/98 border-2 border-pink-300/80 text-indigo-950 shadow-2xl shadow-indigo-500/20"
                  : "bg-[#0e1f48]/95 backdrop-blur-2xl border-2 border-amber-400/40 text-white shadow-2xl shadow-blue-950/60"
              )}
            >
              {/* Delicate Pastel Rainbow Ambient Mesh Glow when in rainbow theme */}
              {isRainbow && (
                <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden -z-0 opacity-40">
                  <div className="absolute -top-12 -left-12 w-52 h-52 bg-gradient-to-br from-pink-400/35 to-purple-400/35 rounded-full blur-2xl" />
                  <div className="absolute top-1/2 -right-12 w-52 h-52 bg-gradient-to-br from-sky-400/35 to-emerald-300/35 rounded-full blur-2xl" />
                  <div className="absolute -bottom-12 left-1/4 w-52 h-52 bg-gradient-to-br from-amber-300/35 to-rose-300/35 rounded-full blur-2xl" />
                </div>
              )}

              {/* Minimal Modern Header with single-line layout */}
              <div className={clsx(
                "flex items-center justify-between gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl w-full shrink-0 backdrop-blur-md relative z-10 border transition-all",
                isRainbow
                  ? "bg-white/85 border-indigo-200/70 text-indigo-950 shadow-xs"
                  : "bg-[#14295e]/80 border-amber-400/30 text-white"
              )}>
                <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                  <div className={clsx(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border",
                    isRainbow
                      ? "bg-gradient-to-br from-pink-500 to-indigo-600 text-white border-pink-400/30 shadow-xs"
                      : "bg-amber-400/20 border-amber-400/40 text-amber-300"
                  )}>
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <h3 className={clsx(
                    "font-extrabold text-xs sm:text-sm tracking-tight whitespace-nowrap",
                    isRainbow ? "text-indigo-950" : "text-white"
                  )}>
                    {formUserRole === 'buyer' 
                      ? (i18n.language === 'ku' ? 'داواکاری کاڵا' : 'Order Item')
                      : (i18n.language === 'ku' ? 'ڕێکخستنی کاڵا' : 'Product Setup')}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Single-line Upper-level Sourcing Code pill */}
                  <div className={clsx(
                    "flex items-center gap-1 px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap border backdrop-blur-sm",
                    isRainbow
                      ? "bg-indigo-50/90 border-indigo-200/80 text-indigo-950"
                      : "bg-[#0b1838]/80 border-white/20 text-amber-300"
                  )} dir="ltr">
                    <span className={clsx(
                      "text-[10px] font-mono font-medium",
                      isRainbow ? "text-indigo-600/80" : "text-amber-200/80"
                    )}>{i18n.language === 'ku' ? 'کۆد:' : 'Code:'}</span>
                    <span className={clsx(
                      "text-[11px] font-mono font-black whitespace-nowrap",
                      isRainbow ? "text-indigo-950" : "text-amber-300"
                    )}>{sourceCode || generateAutoSourceCode()}</span>
                    <button
                      type="button"
                      onClick={() => safeCopyToClipboard(sourceCode || generateAutoSourceCode())}
                      className={clsx(
                        "p-0.5 rounded transition-colors cursor-pointer",
                        isRainbow
                          ? "text-indigo-600 hover:text-indigo-950 hover:bg-indigo-100/70"
                          : "text-amber-300 hover:text-white hover:bg-white/10"
                      )}
                      title="Copy Code"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <button 
                    onClick={() => { setShowSourceForm(false); setCapturedImage(null); }}
                    className={clsx(
                      "w-6 h-6 flex items-center justify-center rounded-lg transition-all cursor-pointer shrink-0",
                      isRainbow
                        ? "bg-indigo-100/70 hover:bg-indigo-200/80 text-indigo-900"
                        : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                    )}
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>


              {/* BUYER MODE FORM */}
              {formUserRole === 'buyer' ? (
                <div className="space-y-4 pb-2 px-0.5 relative z-10">
                  {/* Product Showcase Badge inside Buyer Checkout */}
                  <div className={clsx(
                    "p-3.5 sm:p-4 rounded-3xl border-2 space-y-3.5",
                    isRainbow
                      ? "bg-white/90 border-emerald-400 text-slate-900 shadow-emerald-500/10"
                      : "bg-slate-950 border-emerald-500/80 shadow-2xl text-white"
                  )}>
                    <div className={clsx(
                      "flex items-center gap-3 p-3 rounded-2xl border relative overflow-hidden",
                      isRainbow ? "bg-indigo-50/50 border-indigo-100" : "bg-slate-900/90 border-white/10"
                    )}>
                      <div className={clsx(
                        "relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 shadow-md",
                        isRainbow ? "border-emerald-500 bg-white" : "border-emerald-500 bg-slate-950"
                      )}>
                        <img src={capturedImage || pinnedProduct?.imageUrl || sourceImage || liveCoverImage} className="w-full h-full object-cover" alt="Product" />
                        {(isLiveNow || pinnedProduct) ? (
                          <span className="absolute top-0 left-0 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br flex items-center gap-1 shadow">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                            LIVE
                          </span>
                        ) : (
                          <span className="absolute top-0 left-0 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br flex items-center gap-1 shadow">
                            <Package className="w-2.5 h-2.5 text-white" />
                            {i18n.language === 'ku' ? 'دەستبەجێ' : 'Direct'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left rtl:text-right space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={clsx(
                            "text-[10px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1 border",
                            isRainbow
                              ? "text-emerald-800 bg-emerald-100/80 border-emerald-300"
                              : "text-emerald-300 bg-emerald-950/80 border-emerald-500/50"
                          )}>
                            <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{captureDateTime || `${new Date().toLocaleDateString('ku-IQ')} - ${new Date().toLocaleTimeString('ku-IQ', { hour: '2-digit', minute: '2-digit' })}`}</span>
                          </span>
                          {(isLiveNow || pinnedProduct) && (
                            <span className={clsx(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                              isRainbow ? "text-amber-800 bg-amber-100 border-amber-300" : "text-amber-300 bg-amber-950/80 border-amber-500/40"
                            )}>
                              {i18n.language === 'ku' ? 'کاڵای پەخشی ڕاستەوخۆ 🔴' : 'Live Item 🔴'}
                            </span>
                          )}
                        </div>
                        
                        <h4 className={clsx(
                          "text-xs sm:text-sm font-black truncate",
                          isRainbow ? "text-indigo-950" : "text-white drop-shadow"
                        )}>
                          {pinnedProduct?.title || sourceTitle || (isLiveNow ? liveTitleInput : (i18n.language === 'ku' ? 'داواکاری کاڵای دەستبەجێ' : 'Direct Product Order'))}
                        </h4>
                        
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <span className={clsx("text-xs font-black", isRainbow ? "text-slate-600" : "text-slate-400")}>
                            {i18n.language === 'ku' ? 'نرخی جێگیرکراو:' : 'Fixed Price:'}
                          </span>
                          <span className={clsx(
                            "text-sm sm:text-base font-black font-mono px-2.5 py-0.5 rounded-lg border",
                            isRainbow
                              ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                              : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                          )}>
                            {(pinnedProduct ? pinnedProduct.price : Number(sourcePrice || (isLiveNow ? livePriceInput : 25000))).toLocaleString()} {i18n.language === 'ku' ? 'د.ع' : 'IQD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Total Amount Row */}
                    <div className={clsx(
                      "flex items-center justify-between gap-2 p-2 rounded-lg border",
                      isRainbow ? "bg-indigo-50/60 border-indigo-100 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className={clsx("text-xs font-bold", isRainbow ? "text-slate-700" : "text-slate-300")}>
                          {i18n.language === 'ku' ? 'ژمارە:' : 'Quantity:'}
                        </span>
                        <div className={clsx(
                          "flex items-center px-1.5 py-0.5 rounded-lg border",
                          isRainbow ? "bg-white border-indigo-200" : "bg-slate-900 border-slate-800"
                        )}>
                          <button
                            type="button"
                            onClick={() => setBuyerQuantity(Math.max(1, buyerQuantity - 1))}
                            className={clsx(
                              "w-6 h-6 rounded font-bold text-xs cursor-pointer active:scale-90 transition-transform",
                              isRainbow ? "bg-indigo-100 hover:bg-indigo-200 text-indigo-900" : "bg-slate-800 hover:bg-slate-700 text-white"
                            )}
                          >
                            -
                          </button>
                          <span className={clsx("text-xs font-bold px-2.5", isRainbow ? "text-indigo-900" : "text-amber-400")}>{buyerQuantity}</span>
                          <button
                            type="button"
                            onClick={() => setBuyerQuantity(buyerQuantity + 1)}
                            className={clsx(
                              "w-6 h-6 rounded font-bold text-xs cursor-pointer active:scale-90 transition-transform",
                              isRainbow ? "bg-indigo-100 hover:bg-indigo-200 text-indigo-900" : "bg-slate-800 hover:bg-slate-700 text-white"
                            )}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right rtl:text-left">
                        <span className={clsx("text-[10px] font-bold block", isRainbow ? "text-slate-500" : "text-slate-400")}>
                          {i18n.language === 'ku' ? 'کۆی گشتی' : 'Total Amount'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                          {((pinnedProduct ? pinnedProduct.price : Number(sourcePrice || (isLiveNow ? livePriceInput : 25000))) * buyerQuantity).toLocaleString()} {i18n.language === 'ku' ? 'د.ع' : 'IQD'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Contact & Address Information */}
                  <div className={clsx(
                    "border p-2.5 sm:p-3 rounded-xl space-y-2",
                    isRainbow ? "bg-white/90 border-indigo-200/70 text-slate-900 shadow-xs" : "bg-slate-900 border-slate-800 text-white"
                  )}>
                    <div className={clsx(
                      "flex items-center gap-1.5 text-xs font-bold border-b pb-1.5",
                      isRainbow ? "text-slate-800 border-indigo-100" : "text-slate-300 border-slate-800"
                    )}>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{i18n.language === 'ku' ? 'زانیاری کڕیار (لە پرۆفایلەوە)' : 'Buyer Info (from Profile)'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className={clsx("p-2 rounded-lg border", isRainbow ? "bg-indigo-50/60 border-indigo-100" : "bg-slate-950 border-slate-800")}>
                        <span className={clsx("text-[9.5px] font-bold block", isRainbow ? "text-slate-500" : "text-slate-500")}>{i18n.language === 'ku' ? 'ناوی کڕیار:' : 'Buyer Name:'}</span>
                        <span className={clsx("font-bold text-xs", isRainbow ? "text-indigo-950" : "text-white")}>{user?.name || buyerName || (i18n.language === 'ku' ? 'کڕیاری بەڕێز' : 'Valued Buyer')}</span>
                      </div>
                      <div className={clsx("p-2 rounded-lg border", isRainbow ? "bg-indigo-50/60 border-indigo-100" : "bg-slate-950 border-slate-800")}>
                        <span className={clsx("text-[9.5px] font-bold block", isRainbow ? "text-slate-500" : "text-slate-500")}>{i18n.language === 'ku' ? 'ژمارەی مۆبایل:' : 'Phone:'}</span>
                        <span className="font-mono font-bold text-emerald-600 text-xs">{user?.phone || buyerPhone || '07746573763'}</span>
                      </div>
                      <div className={clsx("p-2 rounded-lg border sm:col-span-2", isRainbow ? "bg-indigo-50/60 border-indigo-100" : "bg-slate-950 border-slate-800")}>
                        <span className={clsx("text-[9.5px] font-bold block", isRainbow ? "text-slate-500" : "text-slate-500")}>{i18n.language === 'ku' ? 'ناونیشان و شار:' : 'City & Address:'}</span>
                        <span className={clsx("font-bold text-xs", isRainbow ? "text-indigo-950" : "text-white")}>{user?.city || buyerCity || 'هەولێر'} - {user?.address || buyerAddress || (i18n.language === 'ku' ? 'شەقامی سەرەکی' : 'Main Street')}</span>
                      </div>
                    </div>

                    <div className="pt-0.5">
                      <label className={clsx("block text-[10px] font-bold mb-1", isRainbow ? "text-slate-600" : "text-slate-400")}>
                        {i18n.language === 'ku' ? 'تێبینی بۆ فرۆشیار (ئارەزوومەندانە):' : 'Order Notes (Optional):'}
                      </label>
                      <input
                        type="text"
                        value={buyerNote}
                        onChange={(e) => setBuyerNote(e.target.value)}
                        placeholder={i18n.language === 'ku' ? 'ڕەنگ، قەبارە یان داواکاری تایبەت...' : 'Special notes...'}
                        className={clsx(
                          "w-full border rounded-lg px-3 py-1.5 text-xs outline-none transition-all",
                          isRainbow
                            ? "bg-white border-indigo-200/80 text-indigo-950 placeholder:text-slate-400 focus:border-pink-500"
                            : "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500"
                        )}
                      />
                    </div>
                  </div>

                  {/* Buyer Action Buttons: Add to Cart / Basket OR Direct Purchase */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBuyerOrderSaveToBasket}
                      disabled={submittingFile}
                      className={clsx(
                        "w-full py-2.5 px-3 font-bold text-xs rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm text-white",
                        isRainbow ? "bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700" : "bg-indigo-600 hover:bg-indigo-500"
                      )}
                    >
                      <ShoppingBag className="w-4 h-4 text-white/80" />
                      <span>{i18n.language === 'ku' ? 'خستنە ناو سەبەتەی کڕین' : 'Add to Cart'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsAppBuyerOrder}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ShoppingBag className="w-4 h-4 text-emerald-200" />
                      <span>{(isLiveNow || pinnedProduct) ? (i18n.language === 'ku' ? 'کڕینی دەستبەجێ' : 'Buy Live Item') : (i18n.language === 'ku' ? 'داواکاری ڕاستەوخۆ' : 'Direct Order')}</span>
                    </button>
                  </div>

                  {buyerOrderSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-500/20 border border-emerald-400 text-emerald-600 dark:text-emerald-300 rounded-xl text-center text-xs font-black"
                    >
                      {i18n.language === 'ku' ? '✨ بەرهەم بە سەرکەوتوویی خرایە ناو سەبەتەی کڕینەکەت!' : '✨ Item added to your shopping cart successfully!'}
                    </motion.div>
                  )}
                </div>
              ) : (
                /* SELLER MODE FORM */
                <form onSubmit={saveSourcedItem} className="space-y-2.5 pb-2 relative z-10">
                  {/* Media Upload & Preview Row */}
                  <div className={clsx(
                    "border p-2.5 sm:p-3 rounded-xl space-y-2 backdrop-blur-md transition-all",
                    isRainbow
                      ? "bg-white/80 border-pink-200/70 text-indigo-950 shadow-xs"
                      : "bg-[#122554]/75 border-amber-400/30 text-white"
                  )}>
                    <div className="flex items-center justify-between px-0.5">
                      <label className={clsx(
                        "text-xs font-black uppercase tracking-wide flex items-center gap-1.5",
                        isRainbow ? "text-indigo-950" : "text-amber-200"
                      )}>
                        <Camera className={clsx("w-3.5 h-3.5", isRainbow ? "text-pink-500" : "text-amber-400")} />
                        <span>{i18n.language === 'ku' ? 'وێنە و ڤیدیۆی کاڵا' : i18n.language === 'ar' ? 'صور وفيديو المنتج' : 'Media Gallery'}</span>
                        <span className={clsx("text-[10px] font-bold", isRainbow ? "text-pink-600" : "text-amber-300/80")}>({uploadedImages.length}/10)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {uploadedImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImages([]);
                              setCapturedImage(null);
                              setSourceImage('');
                              localStorage.removeItem('payv_sourcing_draft');
                              triggerBeautyToast(i18n.language === 'ku' ? 'هەموو وێنە کۆنەکان سڕانەوە 🗑️' : 'All old images cleared 🗑️');
                            }}
                            className={clsx(
                              "text-[10px] font-bold border px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer",
                              isRainbow
                                ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
                                : "text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900/60 border-rose-500/40"
                            )}
                            title={i18n.language === 'ku' ? 'سڕینەوەی هەموو وێنە کۆنەکان' : 'Clear All Images'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{i18n.language === 'ku' ? 'سڕینەوەی وێنەکان' : 'Clear All'}</span>
                          </button>
                        )}
                        <span className={clsx(
                          "text-[9.5px] font-extrabold border px-2 py-0.5 rounded-md uppercase",
                          isRainbow
                            ? "bg-pink-100 text-pink-700 border-pink-300/60"
                            : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                        )}>
                          {i18n.language === 'ku' ? 'پێویستە' : 'Required'}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Scrollable Media Thumbnails & Add Buttons */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {uploadedImages.map((imgUrl, idx) => (
                          <motion.div
                            key={`${idx}-${imgUrl.slice(0, 30)}`}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, y: 15 }}
                            className={clsx(
                              "relative flex-shrink-0 w-18 sm:w-20 aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all group shadow-sm",
                              isRainbow
                                ? (imgUrl === capturedImage ? "border-pink-500 ring-2 ring-pink-400/40 bg-pink-50" : "border-indigo-200 hover:border-pink-300 bg-white")
                                : (imgUrl === capturedImage ? "border-amber-400 ring-2 ring-amber-400/40 bg-[#0c1838]" : "border-white/20 hover:border-amber-400/50 bg-[#0c1838]")
                            )}
                          >
                            {isVideoUrl(imgUrl) ? (
                              <video 
                                src={imgUrl} 
                                onClick={() => { setCapturedImage(imgUrl); setSourceImage(imgUrl); }}
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105" 
                              />
                            ) : (
                              <img 
                                src={imgUrl} 
                                onClick={() => { setCapturedImage(imgUrl); setSourceImage(imgUrl); }}
                                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105" 
                                alt="" 
                              />
                            )}
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const filtered = uploadedImages.filter((_, i) => i !== idx);
                                setUploadedImages(filtered);
                                if (imgUrl === capturedImage) {
                                  if (filtered.length > 0) {
                                    setCapturedImage(filtered[0]);
                                    setSourceImage(filtered[0]);
                                  } else {
                                    setCapturedImage(null);
                                    setSourceImage('');
                                    localStorage.removeItem('payv_sourcing_draft');
                                  }
                                }
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md active:scale-90"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {imgUrl === capturedImage && (
                              <div className={clsx(
                                "absolute bottom-1 left-1 right-1 py-0.5 text-[8px] font-black uppercase text-center rounded",
                                isRainbow
                                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                                  : "bg-amber-500 text-slate-950"
                              )}>
                                {i18n.language === 'ku' ? 'سەرەکی' : 'Primary'}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {uploadedImages.length < 10 && (
                        <div className="flex gap-1.5 shrink-0">
                          {/* Upload Media Button */}
                          <button
                            type="button"
                            onClick={triggerSourcingUpload}
                            className={clsx(
                              "flex-shrink-0 w-18 sm:w-20 aspect-[4/5] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all gap-1 cursor-pointer backdrop-blur-sm",
                              isRainbow
                                ? "border-pink-300/70 bg-pink-50/80 hover:bg-pink-100/90 text-pink-700 shadow-2xs"
                                : "border-amber-400/40 bg-white/10 hover:bg-white/20 text-amber-200"
                            )}
                          >
                            <Plus className={clsx("w-4 h-4", isRainbow ? "text-pink-600" : "text-amber-300")} />
                            <span className="text-[10px] font-black">{i18n.language === 'ku' ? 'گەلەری' : 'Gallery'}</span>
                          </button>

                          {/* Direct Camera Video Capture */}
                          <button
                            type="button"
                            onClick={() => triggerDirectCameraCapture('video')}
                            className={clsx(
                              "flex-shrink-0 w-18 sm:w-20 aspect-[4/5] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all gap-1 cursor-pointer backdrop-blur-sm",
                              isRainbow
                                ? "border-purple-300/70 bg-purple-50/80 hover:bg-purple-100/90 text-purple-700 shadow-2xs"
                                : "border-rose-400/40 bg-white/10 hover:bg-white/20 text-rose-300"
                            )}
                            title={i18n.language === 'ku' ? 'تۆمارکردنی ڤیدیۆ' : 'Record Video'}
                          >
                            <Video className={clsx("w-4 h-4", isRainbow ? "text-purple-600" : "text-rose-400")} />
                            <span className="text-[10px] font-black">{i18n.language === 'ku' ? 'ڤیدیۆ' : 'Video'}</span>
                          </button>

                          {/* Direct Camera Photo Capture */}
                          <button
                            type="button"
                            onClick={() => triggerDirectCameraCapture('photo')}
                            className={clsx(
                              "flex-shrink-0 w-18 sm:w-20 aspect-[4/5] rounded-xl border border-dashed flex flex-col items-center justify-center transition-all gap-1 cursor-pointer backdrop-blur-sm",
                              isRainbow
                                ? "border-sky-300/70 bg-sky-50/80 hover:bg-sky-100/90 text-sky-700 shadow-2xs"
                                : "border-emerald-400/40 bg-white/10 hover:bg-white/20 text-emerald-300"
                            )}
                            title={i18n.language === 'ku' ? 'گرتنی وێنە' : 'Take Photo'}
                          >
                            <Camera className={clsx("w-4 h-4", isRainbow ? "text-sky-600" : "text-emerald-400")} />
                            <span className="text-[10px] font-black">{i18n.language === 'ku' ? 'وێنە' : 'Photo'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div className={clsx(
                    "border p-2.5 sm:p-3 rounded-xl space-y-2.5 shadow-sm backdrop-blur-md relative z-10 transition-all",
                    isRainbow
                      ? "bg-white/80 border-indigo-200/70 text-indigo-950 shadow-xs"
                      : "bg-[#122554]/75 border-amber-400/30 text-white"
                  )}>
                    {/* Row 1: Product Title */}
                    <div className="space-y-1">
                      <label className={clsx(
                        "text-xs font-bold",
                        isRainbow ? "text-indigo-950" : "text-amber-200"
                      )}>
                        {i18n.language === 'ku' ? 'ناونیشانی کاڵا *' : i18n.language === 'ar' ? 'عنوان المنتج *' : 'Asset Title *'}
                      </label>
                      <input
                        type="text"
                        value={sourceTitle}
                        onChange={(e) => setSourceTitle(e.target.value)}
                        placeholder={i18n.language === 'ku' ? 'ناونیشانی کاڵا بنووسە...' : i18n.language === 'ar' ? 'أدخل عنوان المنتج...' : 'Enter product title...'}
                        className={clsx(
                          "w-full rounded-lg px-3 py-2 text-xs sm:text-sm font-bold outline-none transition-all",
                          isRainbow
                            ? "bg-white/95 border border-indigo-200/80 text-indigo-950 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-200/40 shadow-2xs"
                            : "bg-[#0c1838]/70 border border-white/20 text-white placeholder:text-slate-400 focus:border-amber-400 backdrop-blur-sm"
                        )}
                      />
                    </div>

                    {/* Row 2: Description */}
                    <div className={clsx(
                      "space-y-1 p-2 rounded-lg border",
                      isRainbow
                        ? "bg-indigo-50/50 border-indigo-100"
                        : "bg-[#0c1838]/60 border-white/15 backdrop-blur-sm"
                    )}>
                      <div className="flex items-center justify-between px-0.5">
                        <label className={clsx(
                          "text-xs font-bold flex items-center gap-1.5",
                          isRainbow ? "text-indigo-950" : "text-amber-200"
                        )}>
                          <FileText className={clsx("w-3.5 h-3.5", isRainbow ? "text-indigo-600" : "text-amber-400")} />
                          <span>{i18n.language === 'ku' ? 'وەسفی کاڵا' : i18n.language === 'ar' ? 'الوصف' : 'Description'}</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAIGenerate}
                          disabled={generatingAI}
                          className={clsx(
                            "flex items-center gap-1 px-2 py-0.5 rounded-md disabled:opacity-50 transition-all text-[10px] font-black cursor-pointer active:scale-95 shadow-xs",
                            isRainbow
                              ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white"
                              : "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950"
                          )}
                        >
                          <Sparkles className={clsx("w-2.5 h-2.5", isRainbow ? "text-white" : "text-slate-950", generatingAI && "animate-spin")} />
                          <span>{i18n.language === 'ku' ? 'نووسەری زیرەک' : 'AI Writer'}</span>
                        </button>
                      </div>
                      <textarea
                        value={sourceDesc}
                        onChange={(e) => setSourceDesc(e.target.value)}
                        rows={2}
                        className={clsx(
                          "w-full rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium outline-none resize-y",
                          isRainbow
                            ? "bg-white/95 border border-indigo-200/80 text-indigo-950 placeholder:text-slate-400 focus:border-pink-500"
                            : "bg-[#0a1532]/70 border border-white/20 text-white placeholder:text-slate-400 focus:border-amber-400"
                        )}
                        placeholder={i18n.language === 'ku' ? 'وەسفی وردی کاڵاکە بنووسە...' : 'Write item specifications...'}
                      />
                      {/* Quick Suggestion Tags */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {[
                          { ku: 'کوالیتی بەرز', ar: 'جودة ممتازة', en: 'Top Quality' },
                          { ku: 'گەیاندنی خێرا', ar: 'توصيل سريع', en: 'Fast Delivery' },
                          { ku: 'باشترین نرخ', ar: 'أفضل سعر', en: 'Best Price' },
                          { ku: 'گەرەنتی کراو', ar: 'مضمون', en: 'Guaranteed' }
                        ].map((tag, idx) => {
                          const label = i18n.language === 'ku' ? tag.ku : i18n.language === 'ar' ? tag.ar : tag.en;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSourceDesc(prev => prev ? `${prev} • ${label}` : label);
                              }}
                              className={clsx(
                                "px-1.5 py-0.5 rounded text-[9.5px] font-medium transition-all border cursor-pointer active:scale-95",
                                isRainbow
                                  ? "bg-white hover:bg-pink-50 text-indigo-700 border-indigo-200/80 shadow-2xs"
                                  : "bg-white/10 hover:bg-white/20 text-amber-200 border-white/15"
                              )}
                            >
                              +{label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row 3: Category and Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Product Category */}
                      <div className="space-y-1">
                        <label className={clsx(
                          "text-xs font-bold",
                          isRainbow ? "text-indigo-950" : "text-amber-200"
                        )}>
                          {i18n.language === 'ku' ? 'پۆلێنی بەرهەم *' : 'Product Category *'}
                        </label>
                        <select 
                          aria-label="Category Selection"
                          value={sourceCategory}
                          onChange={(e) => {
                            setSourceCategory(e.target.value);
                            if (categoryError) setCategoryError(null);
                          }}
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg border text-xs sm:text-sm font-bold focus:outline-none appearance-none cursor-pointer transition-all",
                            isRainbow
                              ? (categoryError ? "border-rose-500 bg-rose-50 text-rose-900" : "bg-white/95 border-indigo-200/80 text-indigo-950 focus:border-pink-500 shadow-2xs")
                              : (categoryError ? "border-rose-500 bg-rose-950/40 text-white" : "bg-[#0c1838]/80 border-white/20 text-white focus:border-amber-400")
                          )}
                          required
                        >
                          <option value="" disabled className={isRainbow ? "bg-white text-slate-400" : "bg-[#0e1f48] text-slate-400"}>
                            {i18n.language === 'ku' ? '-- پۆلێن هەڵبژێرە --' : '-- Select Category --'}
                          </option>
                          <option value="factory" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'کارگە' : 'Factory'}</option>
                          <option value="farm" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'کێڵگە' : 'Farm'}</option>
                          <option value="handmade" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'کاری دەستی' : 'Handmade'}</option>
                          <option value="local" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'پیشەی ناوخۆ' : 'Local Boutique'}</option>
                          <option value="offer" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'ئۆفەری تایبەت' : 'Special Offer'}</option>
                          <option value="resale" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'داشکاندن' : 'Discount & Resale'}</option>
                          <option value="wholesale" className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>{i18n.language === 'ku' ? 'کۆفرۆش' : 'Wholesale'}</option>
                        </select>
                        {categoryError && (
                          <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1 px-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{categoryError}</span>
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div className="space-y-1">
                        <label className={clsx(
                          "text-xs font-bold block",
                          isRainbow ? "text-indigo-950" : "text-amber-200"
                        )}>
                          {i18n.language === 'ku' ? 'شوێن' : 'Location'}
                        </label>
                        <div className="relative">
                          <MapPin className={clsx(
                            "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none",
                            isRainbow ? "text-pink-500" : "text-amber-400/80"
                          )} />
                          <select
                            value={sourceLocation}
                            onChange={(e) => setSourceLocation(e.target.value)}
                            className={clsx(
                              "w-full rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm font-bold appearance-none outline-none cursor-pointer border transition-all",
                              isRainbow
                                ? "bg-white/95 border-indigo-200/80 text-indigo-950 focus:border-pink-500 shadow-2xs"
                                : "bg-[#0c1838]/80 border-white/20 text-white focus:border-amber-400"
                            )}
                          >
                            {IRAQ_CITIES.map(city => (
                              <option key={city.id} value={city.id} className={isRainbow ? "bg-white text-slate-900" : "bg-[#0e1f48] text-white"}>
                                {i18n.language === 'ku' ? city.ku : (i18n.language === 'ar' ? city.ar : city.en)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Pricing & Optional Discount */}
                    <div className={clsx(
                      "space-y-2 p-2.5 rounded-lg border",
                      isRainbow ? "bg-indigo-50/50 border-indigo-100" : "bg-[#0c1838]/60 border-white/15 backdrop-blur-sm"
                    )}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Base Selling Price */}
                        <div className="space-y-1">
                          <label className={clsx(
                            "text-xs font-bold flex items-center justify-between",
                            isRainbow ? "text-indigo-950" : "text-amber-200"
                          )}>
                            <span>{i18n.language === 'ku' ? `نرخی فرۆشتن (${sourceCurrency === 'IQD' ? 'دینار' : '$ USD'}) *` : `Selling Price (${sourceCurrency === 'IQD' ? 'IQD' : '$ USD'}) *`}</span>
                            <span className={clsx("text-[10px] font-normal", isRainbow ? "text-pink-600" : "text-amber-300")}>{i18n.language === 'ku' ? 'گۆڕینی دراو' : 'Toggle currency'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={sourcePrice}
                              onChange={(e) => {
                                setSourcePrice(e.target.value);
                                if (priceError) setPriceError(null);
                                // If discount percent is active, recompute discount amount
                                if (sourceDiscountPercent) {
                                  const num = sanitizeNumericInput(e.target.value);
                                  const pct = parseFloat(sourceDiscountPercent) || 0;
                                  if (num > 0 && pct > 0) {
                                    setSourceDiscount(Math.round(num * (pct / 100)).toString());
                                  }
                                }
                              }}
                              placeholder={sourceCurrency === 'IQD' ? '25,000' : '20'}
                              className={clsx(
                                "w-full border rounded-lg px-3 py-2 text-xs sm:text-sm font-black outline-none pr-20 font-mono transition-all",
                                isRainbow
                                  ? (priceError ? "border-rose-500 bg-rose-50 text-rose-900" : "bg-white/95 border-indigo-200/80 text-indigo-950 placeholder:text-slate-400 focus:border-pink-500 shadow-2xs")
                                  : (priceError ? "border-rose-500 bg-rose-950/40 text-white" : "bg-[#0a1532]/70 border-white/20 text-white placeholder:text-slate-500 focus:border-amber-400")
                              )}
                              required
                            />
                            {/* One-Click Currency Switcher Button */}
                            <button
                              type="button"
                              onClick={() => setSourceCurrency(prev => prev === 'IQD' ? 'USD' : 'IQD')}
                              className={clsx(
                                "absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[11px] font-black transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer",
                                isRainbow
                                  ? "bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white"
                                  : "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950"
                              )}
                              title={i18n.language === 'ku' ? 'کلیک بکە بۆ گۆڕینی دراو (دینار / دۆلار)' : 'Click to toggle currency (IQD / USD)'}
                            >
                              <span>{sourceCurrency === 'IQD' ? 'دینار' : '$ USD'}</span>
                              <RefreshCw className="w-2.5 h-2.5 opacity-80" />
                            </button>
                          </div>
                          {priceError && (
                            <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1 px-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{priceError}</span>
                            </div>
                          )}
                        </div>

                        {/* Optional Discount Amount */}
                        <div className="space-y-1">
                          <label className={clsx(
                            "text-xs font-bold flex items-center justify-between",
                            isRainbow ? "text-indigo-950" : "text-amber-200"
                          )}>
                            <span>{i18n.language === 'ku' ? `بڕی داشکاندن (ئارەزوومەندانە)` : `Discount Amount (Optional)`}</span>
                            <span className={clsx("text-[10px] font-semibold", isRainbow ? "text-pink-600" : "text-amber-300")}>{sourceCurrency === 'IQD' ? 'دینار' : '$ USD'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={sourceDiscount}
                              onChange={(e) => {
                                setSourceDiscount(e.target.value);
                                const disc = sanitizeNumericInput(e.target.value);
                                const base = sanitizeNumericInput(sourcePrice);
                                if (base > 0 && disc > 0) {
                                  setSourceDiscountPercent(Math.round((disc / base) * 100).toString());
                                } else {
                                  setSourceDiscountPercent('');
                                }
                              }}
                              placeholder={sourceCurrency === 'IQD' ? '5,000' : '4'}
                              className={clsx(
                                "w-full rounded-lg px-3 py-2 text-xs sm:text-sm font-bold outline-none font-mono border transition-all",
                                isRainbow
                                  ? "bg-white/95 border-indigo-200/80 text-pink-700 placeholder:text-slate-400 focus:border-pink-500 shadow-2xs"
                                  : "bg-[#0a1532]/70 border-white/20 text-amber-300 placeholder:text-slate-500 focus:border-amber-400"
                              )}
                            />
                            {sourceDiscount && (
                              <button
                                type="button"
                                onClick={() => { setSourceDiscount(''); setSourceDiscountPercent(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 text-xs p-1"
                                title="Clear discount"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Discount Percentage Selector Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className={clsx("text-[10px] font-bold", isRainbow ? "text-indigo-800" : "text-amber-200/80")}>
                          {i18n.language === 'ku' ? 'داشکاندن بە ڕێژە:' : 'Quick Discount %:'}
                        </span>
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => {
                          const isActive = sourceDiscountPercent === pct.toString();
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                if (isActive) {
                                  setSourceDiscountPercent('');
                                  setSourceDiscount('');
                                } else {
                                  setSourceDiscountPercent(pct.toString());
                                  const base = sanitizeNumericInput(sourcePrice);
                                  if (base > 0) {
                                    setSourceDiscount(Math.round(base * (pct / 100)).toString());
                                  }
                                }
                              }}
                              className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                                isActive 
                                  ? (isRainbow ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs" : "bg-amber-400 text-slate-950 font-black shadow-xs")
                                  : (isRainbow ? "bg-white hover:bg-pink-50 text-indigo-700 border border-indigo-200/80" : "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15")
                              )}
                            >
                              %{pct}
                            </button>
                          );
                        })}
                      </div>

                      {/* Live Calculated Final Price Banner if Discount Applied */}
                      {(() => {
                        const base = sanitizeNumericInput(sourcePrice);
                        const disc = sanitizeNumericInput(sourceDiscount);
                        if (base > 0 && disc > 0 && disc < base) {
                          const finalCustomerPrice = base - disc;
                          const pct = sourceDiscountPercent || Math.round((disc / base) * 100);
                          return (
                            <motion.div 
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={clsx(
                                "p-2 rounded-lg flex items-center justify-between text-xs font-bold border transition-all",
                                isRainbow
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
                                  : "bg-amber-400/15 border-amber-400/40 text-amber-300 backdrop-blur-sm"
                              )}
                            >
                              <div className={clsx("flex items-center gap-1.5", isRainbow ? "text-emerald-800" : "text-amber-300")}>
                                <span className={clsx("text-[10px] font-black px-1.5 py-0.2 rounded", isRainbow ? "bg-emerald-600 text-white" : "bg-amber-400 text-slate-950")}>%{pct}-</span>
                                <span>{i18n.language === 'ku' ? 'نرخی کۆتایی دوای داشکاندن:' : 'Final Price After Discount:'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className={clsx("font-black text-sm", isRainbow ? "text-emerald-700" : "text-amber-300")}>
                                  {finalCustomerPrice.toLocaleString()} {sourceCurrency === 'IQD' ? (i18n.language === 'ku' ? 'دینار' : 'IQD') : '$'}
                                </span>
                                <span className="line-through text-slate-400 text-[11px]">
                                  {base.toLocaleString()}
                                </span>
                              </div>
                            </motion.div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Row 5: Sizes and Colors Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                      {/* Size Picker */}
                      <div className="space-y-1">
                        <label className={clsx(
                          "text-xs font-bold block",
                          isRainbow ? "text-indigo-950" : "text-amber-200"
                        )}>
                          {i18n.language === 'ku' ? 'قەبارە' : 'Sizes'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSizePicker(!showSizePicker)}
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer",
                            isRainbow
                              ? "bg-white/95 hover:bg-indigo-50/80 border-indigo-200/80 text-indigo-950 shadow-2xs"
                              : "bg-[#0c1838]/80 hover:bg-[#132554] border border-white/20 text-white backdrop-blur-sm"
                          )}
                        >
                          <div className="flex flex-wrap gap-1">
                            {sourceSizes.length === 0 ? (
                              <span className="text-slate-400 font-medium">{i18n.language === 'ku' ? 'دیارینەکراوە' : 'None Selected'}</span>
                            ) : (
                              sourceSizes.map((sid, idx) => {
                                const s = COMMON_SIZES.find(sz => sz.id === sid);
                                return (
                                  <span key={`${sid}-${idx}`} className={clsx(
                                    "px-1.5 py-0.5 font-black rounded text-[9.5px]",
                                    isRainbow
                                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                                      : "bg-amber-500 text-slate-950"
                                  )}>
                                    {i18n.language === 'ku' ? s?.ku : s?.name}
                                  </span>
                                );
                              })
                            )}
                          </div>
                          <Layers className={clsx("w-3.5 h-3.5 transition-transform shrink-0 ml-1.5", isRainbow ? "text-pink-500" : "text-amber-400", showSizePicker && "rotate-180")} />
                        </button>
                        
                        <AnimatePresence>
                          {showSizePicker && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className={clsx(
                                "overflow-hidden rounded-lg border mt-1 shadow-lg",
                                isRainbow
                                  ? "bg-white border-indigo-200 divide-y divide-indigo-100 shadow-indigo-200/50"
                                  : "bg-[#0e1f48] border-white/20 divide-y divide-white/10 backdrop-blur-xl"
                              )}
                            >
                              {COMMON_SIZES.map(size => (
                                <button
                                  key={size.id}
                                  type="button"
                                  onClick={() => {
                                    setSourceSizes(prev => 
                                      prev.includes(size.id) 
                                        ? prev.filter(s => s !== size.id) 
                                        : [...prev, size.id]
                                    );
                                  }}
                                  className={clsx(
                                    "w-full px-3 py-1.5 flex items-center justify-between transition-all cursor-pointer",
                                    isRainbow ? "hover:bg-indigo-50" : "hover:bg-white/10"
                                  )}
                                >
                                  <span className={clsx(
                                    "text-xs font-bold uppercase transition-colors",
                                    sourceSizes.includes(size.id)
                                      ? (isRainbow ? "text-pink-600 font-black" : "text-amber-300")
                                      : (isRainbow ? "text-slate-700" : "text-slate-300")
                                  )}>
                                    {i18n.language === 'ku' ? size.ku : size.name}
                                  </span>
                                  {sourceSizes.includes(size.id) && (
                                    <Check className={clsx("w-3.5 h-3.5 stroke-[2.5]", isRainbow ? "text-pink-600" : "text-amber-400")} />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Color Picker */}
                      <div className="space-y-1">
                        <label className={clsx(
                          "text-xs font-bold block",
                          isRainbow ? "text-indigo-950" : "text-amber-200"
                        )}>
                          {i18n.language === 'ku' ? 'ڕەنگ' : 'Colors'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer",
                            isRainbow
                              ? "bg-white/95 hover:bg-indigo-50/80 border-indigo-200/80 text-indigo-950 shadow-2xs"
                              : "bg-[#0c1838]/80 hover:bg-[#132554] border-white/20 text-white backdrop-blur-sm"
                          )}
                        >
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {sourceColors.length === 0 ? (
                              <span className="text-slate-400 font-medium">{i18n.language === 'ku' ? 'دیارینەکراوە' : 'None Selected'}</span>
                            ) : (
                              sourceColors.map((cid, idx) => {
                                const c = COMMON_COLORS.find(cl => cl.id === cid);
                                return (
                                  <div key={`${cid}-${idx}`} className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: c?.hex }} />
                                );
                              })
                            )}
                          </div>
                          <Layers className={clsx("w-3.5 h-3.5 transition-transform shrink-0 ml-1.5", isRainbow ? "text-pink-500" : "text-amber-400", showColorPicker && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {showColorPicker && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className={clsx(
                                "overflow-hidden rounded-lg border mt-1 shadow-lg",
                                isRainbow
                                  ? "bg-white border-indigo-200 divide-y divide-indigo-100 shadow-indigo-200/50"
                                  : "bg-[#0e1f48] border-white/20 divide-y divide-white/10 backdrop-blur-xl"
                              )}
                            >
                              {COMMON_COLORS.map(color => (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => {
                                    setSourceColors(prev => 
                                      prev.includes(color.id) 
                                        ? prev.filter(c => c !== color.id) 
                                        : [...prev, color.id]
                                    );
                                  }}
                                  className={clsx(
                                    "w-full px-3 py-1.5 flex items-center gap-2.5 transition-all cursor-pointer",
                                    isRainbow ? "hover:bg-indigo-50" : "hover:bg-white/10"
                                  )}
                                >
                                  <div 
                                    className={clsx(
                                      "w-4 h-4 rounded-full border shadow-xs transition-transform",
                                      sourceColors.includes(color.id)
                                        ? (isRainbow ? "border-pink-500 scale-110" : "border-amber-400 scale-110")
                                        : "border-slate-400"
                                    )} 
                                    style={{ backgroundColor: color.hex }}
                                  />
                                  <span className={clsx(
                                    "text-xs font-bold uppercase transition-colors flex-1 text-left",
                                    sourceColors.includes(color.id)
                                      ? (isRainbow ? "text-pink-600 font-black" : "text-amber-300")
                                      : (isRainbow ? "text-slate-700" : "text-slate-300")
                                  )}>
                                    {i18n.language === 'ku' ? color.ku : color.name}
                                  </span>
                                  {sourceColors.includes(color.id) && (
                                    <Check className={clsx("w-3.5 h-3.5 stroke-[2.5]", isRainbow ? "text-pink-600" : "text-amber-400")} />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={handleMobileShare}
                        className={clsx(
                          "p-2.5 font-bold rounded-lg transition-all flex items-center justify-center border cursor-pointer active:scale-95",
                          isRainbow
                            ? "bg-white/95 hover:bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-2xs"
                            : "bg-[#0c1838]/80 hover:bg-[#132554] text-amber-300 border-white/20 backdrop-blur-sm"
                        )}
                        aria-label="Share"
                        title={i18n.language === 'ku' ? 'بەشکردن' : 'Share'}
                      >
                        {shareSuccess ? (
                          <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                        ) : (
                          <Share2 className={clsx("w-4 h-4", isRainbow ? "text-indigo-600" : "text-amber-300")} />
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={submittingFile || uploadedImages.length === 0 || isPublished}
                        className={clsx(
                          "flex-1 py-2.5 px-4 font-black rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50",
                          isPublished 
                            ? "bg-emerald-600 text-white shadow-emerald-500/20" 
                            : isRainbow
                              ? "bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-lg shadow-pink-500/25"
                              : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-amber-500/30"
                        )}
                      >
                        {submittingFile ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPublished ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>
                          {submittingFile 
                            ? (i18n.language === 'ku' ? 'چاوەڕوانبە...' : 'Processing...')
                            : isPublished 
                              ? (i18n.language === 'ku' ? 'بڵاوکرایەوە' : 'Published!')
                              : (i18n.language === 'ku' ? 'بڵاوکردنەوەی بەرهەم' : 'Publish Product')}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Product Picker for Broadcaster */}
      {showProductPicker && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999999] flex items-end sm:items-center justify-center p-4 overscroll-contain">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-md bg-slate-900 rounded-3xl p-5 border border-slate-700/80 space-y-4 max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
            >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-white font-black uppercase tracking-wider text-sm bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                        {i18n.language === 'ku' ? 'کاڵایەک هەڵبژێرە بۆ پینکردن' : 'PIN PRODUCT TO LIVE'}
                    </h3>
                    <button onClick={() => setShowProductPicker(false)} aria-label="Close product picker" className="text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Quick Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 rtl:left-auto rtl:right-3" />
                  <input 
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder={i18n.language === 'ku' ? 'گەڕان بۆ کاڵا...' : 'Search products...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 rtl:pl-3 rtl:pr-9 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {loadingPickerItems ? (
                        <ProductPickerSkeleton count={4} />
                    ) : myMarketplaceItems.filter(item => !pickerSearchQuery || item.title.toLowerCase().includes(pickerSearchQuery.toLowerCase())).length === 0 ? (
                        <div className="text-center py-8 space-y-3">
                            <Layers className="w-10 h-10 text-slate-700 mx-auto" />
                            <p className="text-xs text-slate-400">{i18n.language === 'ku' ? 'هیچ کاڵایەک نەدۆزرایەوە' : 'No products found.'}</p>
                            <button
                              onClick={() => {
                                // Create quick item from current live title and price
                                const quickItem: MarketplaceItem = {
                                  id: `quick_${Date.now()}`,
                                  title: liveTitleInput || (i18n.language === 'ku' ? 'کاڵای پەخشی ڕاستەوخۆ' : 'Live Item'),
                                  price: Number(livePriceInput) || 25000,
                                  imageUrl: liveCoverImage,
                                  images: [liveCoverImage],
                                  category: 'Sourcing',
                                  sellerId: user?.id || 'guest',
                                  sellerName: user?.name || 'Seller',
                                  isApproved: true,
                                  createdAt: Date.now()
                                } as any;
                                handlePinProduct(quickItem);
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg"
                            >
                              {i18n.language === 'ku' ? '📌 پینکردنی ڕاستەوخۆی وێنەی سەرەوە' : '📌 Pin Current Cover Item'}
                            </button>
                        </div>
                    ) : (
                        myMarketplaceItems
                          .filter(item => !pickerSearchQuery || item.title.toLowerCase().includes(pickerSearchQuery.toLowerCase()))
                          .map((item, idx) => (
                            <div 
                                key={`${item.id || 'item'}-${idx}`}
                                onClick={() => handlePinProduct(item)}
                                className={clsx(
                                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 active:scale-98",
                                    pinnedProduct?.id === item.id ? "bg-amber-500/15 border-amber-400 shadow-md" : "bg-slate-950 border-slate-800 hover:border-slate-700"
                                )}
                            >
                                <img src={item.imageUrl} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10" alt="" />
                                <div className="flex-1 min-w-0 text-left rtl:text-right">
                                    <h4 className="text-white font-black text-xs truncate">{item.title}</h4>
                                    <p className="text-[11px] text-amber-400 font-mono font-black mt-0.5">{item.price ? item.price.toLocaleString() : (25000).toLocaleString()} IQD</p>
                                </div>
                                {pinnedProduct?.id === item.id ? (
                                    <div className="bg-amber-400 text-slate-950 p-1.5 rounded-full shadow">
                                        <Check className="w-4 h-4 stroke-[3]" />
                                    </div>
                                ) : (
                                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-lg">
                                      {i18n.language === 'ku' ? 'پینکردن' : 'Pin'}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <button 
                    onClick={() => setShowProductPicker(false)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest rounded-2xl text-xs cursor-pointer"
                >
                    {i18n.language === 'ku' ? 'داخستن' : 'CANCEL'}
                </button>
            </motion.div>
        </div>
      )}

      {/* Settings Modal for Broadcaster Stream */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999999] flex items-end sm:items-center justify-center p-4 overscroll-contain">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-md bg-slate-900 rounded-3xl p-6 border border-slate-700/80 space-y-5 max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
            >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-white font-black uppercase tracking-wider text-sm flex items-center gap-2">
                        <Settings className="w-4 h-4 text-teal-400" />
                        {i18n.language === 'ku' ? 'ڕێکخستنەکانی پەخشی ڕاستەوخۆ' : 'Stream Settings'}
                    </h3>
                    <button onClick={() => setShowSettingsModal(false)} aria-label="Close settings" className="text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                  {/* Stream Resolution Quality */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <label className="text-xs font-black text-slate-300 block">
                      {i18n.language === 'ku' ? 'کوالیتی ڤیدیۆی پەخش' : 'Video Stream Quality'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1080p', '720p', '480p'] as const).map(quality => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setStreamQuality(quality)}
                          className={clsx(
                            "py-2 rounded-xl text-xs font-black transition-all cursor-pointer border",
                            streamQuality === quality 
                              ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md" 
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                          )}
                        >
                          {quality} {quality === '1080p' ? 'Full HD' : quality === '720p' ? 'HD' : 'SD'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Microphone Audio Toggle inside Settings */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white">{i18n.language === 'ku' ? 'دەنگی مایکرۆفۆن' : 'Microphone Sound'}</h4>
                      <p className="text-[10px] text-slate-400">
                        {isBroadcasterMicMuted 
                          ? (i18n.language === 'ku' ? 'مایکرۆفۆن کوژاوەتەوە (بێ دەنگ)' : 'Microphone is muted') 
                          : (i18n.language === 'ku' ? 'مایکرۆفۆن چالاکە' : 'Microphone active')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleBroadcasterMic}
                      className={clsx(
                        "px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95",
                        isBroadcasterMicMuted 
                          ? "bg-red-600 text-white shadow-red-600/30" 
                          : "bg-emerald-600 text-white shadow-emerald-600/30"
                      )}
                    >
                      {isBroadcasterMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isBroadcasterMicMuted ? (i18n.language === 'ku' ? 'کردنەوەی دەنگ' : 'Unmute') : (i18n.language === 'ku' ? 'بێ دەنگ بکە' : 'Mute')}</span>
                    </button>
                  </div>
                </div>

                <button 
                    onClick={() => {
                        setShowSettingsModal(false);
                        triggerBeautyToast(i18n.language === 'ku' ? 'ڕێکخستنەکان نوێکرانەوە ⚙️' : 'Settings updated ⚙️');
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black uppercase tracking-wider rounded-2xl text-xs shadow-lg cursor-pointer"
                >
                    {i18n.language === 'ku' ? 'تەواو' : 'Done'}
                </button>
            </motion.div>
        </div>
      )}

      {/* Seller Product Showcase Drawer / Modal for Buyer */}
      <AnimatePresence>
        {showBuyerShowcase && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999999] flex items-end sm:items-center justify-center p-4 overscroll-contain">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-lg bg-slate-900 rounded-3xl p-5 border border-slate-700/80 space-y-4 max-h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                    <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">
                      {i18n.language === 'ku' ? 'پێڕستی کاڵاکانی فرۆشیار لە لایڤدا' : 'SELLER LIVE SHOWCASE'}
                    </h3>
                    <p className="text-[10px] text-amber-300 font-bold">
                      {i18n.language === 'ku' ? 'هەر کاڵایەک دەتەوێت هەڵیبژێرە بۆ کڕینی دەستبەجێ' : 'Select any item to buy immediately'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowBuyerShowcase(false)} 
                  className="text-slate-400 hover:text-white p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* List of Products */}
              <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {sellerShowcaseProducts.map((prod, idx) => {
                  const isCurrentPinned = pinnedProduct?.id === prod.id || (pinnedProduct?.title === prod.title);
                  return (
                    <div
                      key={`${prod.id || 'prod'}-${idx}`}
                      className={clsx(
                        "p-3 rounded-2xl border transition-all flex items-center gap-3",
                        isCurrentPinned 
                          ? "bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-500/20" 
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/20 bg-slate-800 relative">
                        <img src={prod.imageUrl || prod.images?.[0] || liveCoverImage} className="w-full h-full object-cover" alt="" />
                        {isCurrentPinned && (
                          <span className="absolute top-0 left-0 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-br">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-right rtl:text-right">
                        <h4 className="text-xs font-black text-white truncate">{prod.title}</h4>
                        <div className="text-xs font-extrabold text-amber-400 font-mono mt-0.5">
                          {Number(prod.price).toLocaleString()} {i18n.language === 'ku' ? 'د.ع' : 'IQD'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            handleBuyPinnedProduct(prod);
                            setShowBuyerShowcase(false);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shrink-0 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                          <span>{i18n.language === 'ku' ? 'کڕین' : 'BUY'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcaster & Seller Profile Inspection Modal - Instagram Style */}
      <AnimatePresence>
        {activeSeller && (
          <InstagramPublicProfileModal
            sellerId={activeSeller.id}
            currentUser={user}
            onClose={() => setActiveSeller(null)}
            onSelectItem={(item) => {
              setActiveSeller(null);
              onSwitchToMarketplace();
            }}
            onRequireAuth={onRequireAuth}
            fallbackInfo={{
              name: activeSeller.name,
              phone: activeSeller.phone,
              avatar: activeSeller.avatar,
              location: activeSeller.location
            }}
          />
        )}
      </AnimatePresence>

      {/* Hidden Video Stream File Input */}
      <input 
        type="file" 
        ref={videoStreamFileInputRef} 
        accept="video/*" 
        onChange={handleVideoFileSelect} 
        className="hidden" 
      />
    </div>
  );
}
