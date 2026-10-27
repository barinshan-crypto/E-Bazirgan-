import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Maximize2, Minimize2, Volume2, VolumeX, Users, MapPin, 
  Send, ShoppingBag, Heart, Flame, Sparkles, MessageCircle, 
  Share2, ShieldCheck, ChevronRight, Trash2, Wifi, WifiOff,
  AlertTriangle, RefreshCw, Eye, Check, UserPlus, Phone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, LiveSession, LiveComment, MarketplaceItem, User, checkIsAdmin } from '../lib/db';
import { initWebRTCViewer } from '../lib/webrtc';
import { DEFAULT_LIVE_BROADCAST_VIDEO, FALLBACK_LIVE_BROADCAST_VIDEO } from '../lib/constants';
import { safeCopyToClipboard } from '../lib/clipboard';
import { 
  getStoredMutePreference, 
  setStoredMutePreference, 
  savePlaybackState, 
  getPlaybackState, 
  safelyTeardownVideo 
} from '../lib/liveStreamPlaybackManager';
import clsx from 'clsx';

interface GlobalLivePlayerProps {
  session: LiveSession | null;
  isMinimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  user: User | null;
  onRequireAuth?: () => void;
  onOpenSellerProfile?: (sellerId: string) => void;
  onSelectItem?: (item: MarketplaceItem) => void;
}

const GIFTS = [
  { id: 'rose', name: 'گوڵ 🌹', icon: '🌹', cost: 1000 },
  { id: 'heart', name: 'دڵ ❤️', icon: '❤️', cost: 2500 },
  { id: 'fire', name: 'ئاگر 🔥', icon: '🔥', cost: 5000 },
  { id: 'diamond', name: 'ئەڵماس 💎', icon: '💎', cost: 10000 },
  { id: 'rocket', name: 'موشەک 🚀', icon: '🚀', cost: 25000 }
];

// Isolated GPU-Accelerated Video Surface with Ambient Letterbox & Fixed Aspect Ratio
const LiveVideoSurface = React.memo(function LiveVideoSurface({
  videoRef,
  videoSource,
  hasStreamObject,
  posterImage,
  isAudioMuted,
  isPlaying,
  onWaiting,
  onPlaying,
  onPlay,
  lowDataMode
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSource: string;
  hasStreamObject: boolean;
  posterImage: string;
  isAudioMuted: boolean;
  isPlaying: boolean;
  onWaiting: () => void;
  onPlaying: () => void;
  onPlay: () => void;
  lowDataMode: boolean;
}) {
  const initialPosterRef = useRef(posterImage);

  return (
    <div 
      className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden select-none"
      style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden', contain: 'paint layout' }}
    >
      {/* Ambient Live Glow Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-rose-950/60 pointer-events-none" />

      {/* Blurred Ambient Backdrop - Automatically matches video content and eliminates black letterbox bars during resize */}
      <img
        src={initialPosterRef.current || posterImage}
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover absolute inset-0 z-0 filter blur-3xl opacity-40 scale-125 pointer-events-none select-none transition-opacity duration-500"
      />

      {/* Fallback Poster (Visible only before playback begins to completely prevent flickering/jerking) */}
      <img
        src={initialPosterRef.current || posterImage}
        alt=""
        className={clsx(
          "w-full h-full object-contain absolute inset-0 z-1 filter brightness-90 pointer-events-none transition-opacity duration-300",
          isPlaying ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Continuous Live Video Player - Aspect-Ratio Locked, Zero-Jitter, GPU-Accelerated */}
      <video
        ref={videoRef}
        src={hasStreamObject ? undefined : videoSource}
        poster={initialPosterRef.current}
        autoPlay
        loop={!hasStreamObject}
        playsInline
        webkit-playsinline="true"
        x5-video-player-type="h5-page"
        x5-video-player-fullscreen="true"
        x5-playsinline="true"
        preload="auto"
        muted={isAudioMuted}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onPlay={onPlay}
        onError={(e) => {
          if (hasStreamObject) return;
          const target = e.currentTarget;
          if (target.src !== DEFAULT_LIVE_BROADCAST_VIDEO) {
            target.src = DEFAULT_LIVE_BROADCAST_VIDEO;
            target.play().catch(() => {});
          } else if (target.src !== FALLBACK_LIVE_BROADCAST_VIDEO) {
            target.src = FALLBACK_LIVE_BROADCAST_VIDEO;
            target.play().catch(() => {});
          }
        }}
        className={clsx(
          "w-full h-full object-contain relative z-5 select-none",
          lowDataMode && "filter contrast-105"
        )}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform'
        }}
      />

      {/* Subtle Dark Vignette for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/80 pointer-events-none z-10" />
    </div>
  );
});

export const GlobalLivePlayer: React.FC<GlobalLivePlayerProps> = ({
  session,
  isMinimized,
  onMinimize,
  onMaximize,
  onClose,
  user,
  onRequireAuth,
  onOpenSellerProfile,
  onSelectItem
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  // Restore cached mute state or stored preference
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => {
    const cached = session?.id ? getPlaybackState(session.id) : null;
    return cached ? cached.isMuted : getStoredMutePreference();
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStreamObject, setHasStreamObject] = useState<boolean>(false);
  const [networkHealth, setNetworkHealth] = useState<'good' | 'moderate' | 'poor'>('good');
  const [lowDataMode, setLowDataMode] = useState<boolean>(false);
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(1);
  const [pinnedProduct, setPinnedProduct] = useState<MarketplaceItem | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; icon: string; x: number }[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // In-App Delete Confirmation State (Completely eliminates window.confirm)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth ResizeObserver to prevent jitter and layout jumps during resizing
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      setIsResizing(true);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsResizing(false);
        }
      }, 120);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [isMinimized]);

  // Sync mute state changes directly without reloading the video or WebRTC
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isAudioMuted;
    }
    setStoredMutePreference(isAudioMuted);
    if (session?.id) {
      savePlaybackState(session.id, { isMuted: isAudioMuted });
    }
  }, [isAudioMuted, session?.id]);

  // Check management permission (Admin or Broadcaster)
  const isAdmin = checkIsAdmin(user);
  const isBroadcaster = Boolean(
    user && session && (
      (user.id && user.id === session.broadcasterId) ||
      (user.phone && ((session as any).broadcasterPhone || session.sellerPhone) && 
        user.phone.replace(/\D/g, '') === (((session as any).broadcasterPhone || session.sellerPhone) as string).replace(/\D/g, '')) ||
      (user.name && session.broadcasterName && user.name.trim().toLowerCase() === session.broadcasterName.trim().toLowerCase())
    )
  );
  const canManage = isBroadcaster || isAdmin;

  // Real-time Firestore session & comments listener
  useEffect(() => {
    if (!session?.id) return;

    setViewerCount(session.viewerCount || 1);

    // Follow status check
    if (user?.id && session.broadcasterId) {
      db.getSellerProfile(session.broadcasterId).then((profile) => {
        if (profile?.followers?.includes(user.id)) {
          setIsFollowing(true);
        }
      }).catch(() => {});
    }

    // Pinned product loader
    if (session.pinnedProductId) {
      db.getMarketplaceItems().then((items) => {
        const found = items.find((i) => i.id === session.pinnedProductId);
        if (found) setPinnedProduct(found);
      }).catch(console.warn);
    } else if ((session as any).featuredTitle) {
      setPinnedProduct({
        id: 'session_product',
        title: (session as any).featuredTitle || session.title,
        price: (session as any).featuredPrice || 25000,
        imageUrl: session.featuredImage || session.broadcasterAvatar || '',
        images: [session.featuredImage || session.broadcasterAvatar || ''],
        imageUrls: [session.featuredImage || session.broadcasterAvatar || ''],
        category: 'Live',
        sellerId: session.broadcasterId,
        sellerName: session.broadcasterName,
        createdAt: Date.now()
      } as any);
    }

    // Subscribe to live session updates (ends, viewer count, etc.)
    const unsubSession = db.onLiveSessionUpdate(session.id, (updatedSession) => {
      if (updatedSession) {
        if (updatedSession.status === 'ended') {
          onClose();
          return;
        }
        setViewerCount(updatedSession.viewerCount || 1);
        if (updatedSession.pinnedProductId) {
          db.getMarketplaceItems().then((items) => {
            const found = items.find((i) => i.id === updatedSession.pinnedProductId);
            if (found) setPinnedProduct(found);
          }).catch(console.warn);
        }
      }
    });

    // Subscribe to live comments
    const unsubComments = db.onLiveCommentsChange(session.id, (comments) => {
      setLiveComments(comments);
    });

    return () => {
      unsubSession();
      unsubComments();
    };
  }, [session?.id, user?.id]);

  // Persistent WebRTC & Stream Lifecycle with state recovery and safe unmount teardown
  useEffect(() => {
    if (!session?.id) return;

    let cleanupWebRTC = () => {};
    const vid = videoRef.current;
    const mediaStream = (session as any).mediaStream || (session as any).stream;

    // Restore cached playback position if resuming a recorded/fallback stream
    const cachedState = getPlaybackState(session.id);

    if (mediaStream && vid) {
      vid.srcObject = mediaStream;
      setHasStreamObject(true);
      vid.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {
        vid.muted = true;
        setIsAudioMuted(true);
        vid.play().catch(() => {});
      });
    } else {
      // Viewer WebRTC connection (Only connects if not local broadcaster stream)
      const viewerId = user?.id || `viewer_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      cleanupWebRTC = initWebRTCViewer(
        session.id,
        viewerId,
        (remoteStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            setHasStreamObject(true);
            videoRef.current.play().then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setNetworkHealth('good');
            }).catch(() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsAudioMuted(true);
                videoRef.current.play().catch(() => {});
              }
            });
          }
        },
        (state) => {
          if (state === 'disconnected' || state === 'failed') {
            setNetworkHealth('poor');
          } else if (state === 'connecting') {
            setNetworkHealth('moderate');
          } else if (state === 'connected') {
            setNetworkHealth('good');
          }
        }
      );

      // Initial video fallback play
      if (vid && !vid.srcObject) {
        if (cachedState && cachedState.currentTime > 0) {
          try {
            vid.currentTime = cachedState.currentTime;
          } catch (_) {}
        }
        vid.play().then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          vid.muted = true;
          setIsAudioMuted(true);
          vid.play().catch(() => {});
        });
      }
    }

    // Graceful unmount cleanup: preserves playback position & tears down tracks cleanly
    return () => {
      if (session?.id && vid) {
        savePlaybackState(session.id, {
          currentTime: vid.currentTime || 0,
          isMuted: vid.muted,
          isPlaying: !vid.paused,
          volume: vid.volume || 1
        });
      }
      cleanupWebRTC();
      safelyTeardownVideo(vid);
    };
  }, [session?.id]);

  // Auto-scroll comments to bottom in fullscreen mode
  useEffect(() => {
    if (!isMinimized) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveComments, isMinimized]);

  // Video buffering & network stall watchdog for low internet connections (fast 1000ms auto-recovery)
  const handleVideoWaiting = () => {
    setIsBuffering(true);
    setNetworkHealth('poor');

    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(() => {
      if (videoRef.current && isMountedRef.current) {
        videoRef.current.play().then(() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }).catch(() => {});
      }
    }, 1000);
  };

  const handleVideoPlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    if (networkHealth === 'poor') setNetworkHealth('moderate');
  };

  // Anti-Freeze Watchdog: detects frozen video frames and automatically unblocks playback
  useEffect(() => {
    let lastTime = -1;
    let stuckCount = 0;

    const interval = setInterval(() => {
      const vid = videoRef.current;
      if (!vid || !isMountedRef.current) return;

      if (!vid.paused && vid.readyState >= 2) {
        if (Math.abs(vid.currentTime - lastTime) < 0.05) {
          stuckCount++;
          // Video has not advanced frames for 2.5 seconds -> force unblock
          if (stuckCount >= 2) {
            stuckCount = 0;
            vid.play().catch(() => {});
          }
        } else {
          stuckCount = 0;
          lastTime = vid.currentTime;
        }
      }
    }, 1250);

    return () => clearInterval(interval);
  }, []);

  const handleToggleFollow = async () => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!session?.broadcasterId) return;

    try {
      const updated = await db.toggleFollowSeller(session.broadcasterId, user.id);
      setIsFollowing(updated.includes(user.id));
    } catch (e) {
      console.warn("Follow toggle failed:", e);
    }
  };

  const handleSendComment = () => {
    if (!newComment.trim() || !session?.id) return;
    const authorName = user?.name || (isKurdish ? 'میوان' : isArabic ? 'زائر' : 'Guest');
    const authorAvatar = user?.avatar || '';
    const authorId = user?.id || `guest_${Date.now()}`;

    db.addLiveComment({
      sessionId: session.id,
      broadcasterId: session.broadcasterId,
      userId: authorId,
      userName: authorName,
      userAvatar: authorAvatar,
      text: newComment.trim()
    });

    setNewComment('');
  };

  const handleSendGift = (gift: typeof GIFTS[0]) => {
    const heartId = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev.slice(-12), { id: heartId, icon: gift.icon, x: Math.random() * 70 + 15 }]);
    setLikeCount((prev) => prev + 1);

    if (session?.id) {
      const authorName = user?.name || (isKurdish ? 'میوان' : isArabic ? 'زائر' : 'Guest');
      db.addLiveComment({
        sessionId: session.id,
        broadcasterId: session.broadcasterId,
        userId: user?.id || 'guest',
        userName: authorName,
        userAvatar: user?.avatar || '',
        text: `${gift.icon} ${gift.name} ${isKurdish ? 'نارد!' : isArabic ? 'أرسل!' : 'sent!'}`
      });
    }

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 2200);
  };

  const handleShareStream = async () => {
    if (!session?.id) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?live=${session.id}`;
    const shareText = `🔴 ${isKurdish ? 'تەماشای پەخشی ڕاستەوخۆ بکە لە پەیڤ مارکێت' : 'Watch live broadcast on Payv Market'}: ${session.title || session.broadcasterName}`;

    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: session.title || 'Live Stream',
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (_) {}
    }

    await safeCopyToClipboard(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Perform permanent stream deletion from DB (100% in-app, zero window.confirm)
  const handleExecuteDelete = async () => {
    if (!session?.id) return;
    setIsDeleting(true);
    try {
      await db.deleteLiveSession(session.id);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteSuccessToast(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to delete live stream:", err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  if (!session) return null;

  const rawVideoUrl = (session as any).streamUrl || (session as any).videoUrl;
  const videoSource = (rawVideoUrl && typeof rawVideoUrl === 'string' && !rawVideoUrl.includes('flower') && !rawVideoUrl.includes('friday') && !rawVideoUrl.includes('mixkit') && rawVideoUrl.trim().length > 0)
    ? rawVideoUrl
    : DEFAULT_LIVE_BROADCAST_VIDEO;

  const posterImage = session.currentFrame || session.featuredImage || session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`;

  // -----------------------------------------------------------------
  // SHARED CONTINUOUS VIDEO COMPONENT (Active in both PiP & Fullscreen)
  // -----------------------------------------------------------------
  const renderContinuousVideo = () => (
    <>
      <LiveVideoSurface
        videoRef={videoRef}
        videoSource={videoSource}
        hasStreamObject={hasStreamObject}
        posterImage={posterImage}
        isAudioMuted={isAudioMuted}
        onWaiting={handleVideoWaiting}
        onPlaying={handleVideoPlaying}
        onPlay={() => setIsPlaying(true)}
        lowDataMode={lowDataMode}
      />
      {/* Buffering Indicator for Low Internet */}
      {isBuffering && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-400/40 flex items-center gap-2 shadow-2xl pointer-events-none animate-pulse">
          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="text-[11px] font-black text-white">
            {isKurdish ? 'خەتی ئینتەرنێت هێواشە...' : isArabic ? 'جاري التحميل...' : 'Buffering...'}
          </span>
        </div>
      )}
    </>
  );

  // =================================================================
  // UNIFIED PERSISTENT VIDEO CONTAINER (NEVER DESTROYS VIDEO ON TOGGLE)
  // =================================================================
  return (
    <div
      className={clsx(
        "select-none",
        isMinimized
          ? "fixed bottom-20 sm:bottom-6 ltr:right-3 rtl:left-3 z-[999999] w-48 sm:w-56 aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 border-amber-400/90 backdrop-blur-xl group cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          : "fixed inset-0 w-screen h-screen z-[999999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-3 overflow-hidden"
      )}
      onClick={isMinimized ? onMaximize : undefined}
    >
      <div
        ref={containerRef}
        className={clsx(
          "relative overflow-hidden bg-slate-950 flex flex-col shadow-2xl",
          isMinimized
            ? "w-full h-full"
            : "w-full h-full sm:h-auto sm:max-h-[96vh] sm:aspect-[9/16] sm:rounded-3xl border border-slate-800/80",
          !isResizing && "transition-[width,height] duration-200 ease-out"
        )}
      >
        {/* Continuous Active Video Layer - Preserved in the exact same DOM node */}
        {renderContinuousVideo()}

        {isMinimized ? (
          <>
            {/* PiP Top Control Bar - Touch-safe, isolated from clicks */}
            <div 
              className="absolute top-2 inset-x-2 z-30 flex items-center justify-between pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* LIVE Badge */}
              <div className="flex items-center gap-1.5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                <span>LIVE</span>
              </div>

              {/* Action Buttons: Audio Mute, Expand, Close */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-transform active:scale-90 border border-white/20 shadow"
                  title={isAudioMuted ? 'Unmute' : 'Mute'}
                >
                  {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={onMaximize}
                  className="w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-transform active:scale-90 border border-white/20 shadow"
                  title={isKurdish ? 'گەورەکردن' : 'Expand'}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                </button>

                {/* High-visibility, reliable Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-red-300/40 cursor-pointer transition-transform active:scale-90"
                  title={isKurdish ? 'داخستن' : 'Close'}
                >
                  <X className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* PiP Bottom Info Bar */}
            <div 
              className="absolute bottom-2.5 inset-x-2.5 z-30 flex items-center justify-between pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <img
                  src={session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`}
                  className="w-6 h-6 rounded-full object-cover border border-amber-400 shrink-0"
                  alt=""
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-white truncate block drop-shadow">
                    {session.broadcasterName}
                  </span>
                  <div className="flex items-center gap-1 text-[8px] text-emerald-300 font-bold">
                    <Users className="w-2.5 h-2.5" />
                    <span>{viewerCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onMaximize}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-black rounded-lg shadow cursor-pointer active:scale-90 transition-transform"
                >
                  {isKurdish ? 'کردنەوە' : 'Open'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="px-2 py-1 bg-red-600/90 hover:bg-red-600 text-white text-[9px] font-black rounded-lg shadow cursor-pointer active:scale-90 transition-transform"
                >
                  {isKurdish ? 'داخستن' : 'Close'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Floating Heart Particle Burst Reactions */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {floatingHearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 1, y: 350, x: `${h.x}%`, scale: 0.8 }}
                  animate={{ opacity: 0, y: 40, scale: 1.6 }}
                  transition={{ duration: 1.8, ease: 'easeOut' }}
                  className="absolute bottom-20 text-3xl drop-shadow-lg select-none"
                >
                  {h.icon}
                </motion.div>
              ))}
            </div>

        {/* ========================================================= */}
        {/* TOP BAR: Broadcaster Info, Network Quality, Controls */}
        {/* ========================================================= */}
        <div className="relative z-30 p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
          {/* Streamer Avatar, Name, Follow & Location */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 pr-3 rounded-full border border-white/20 shadow-lg">
            <div 
              className="relative cursor-pointer"
              onClick={() => onOpenSellerProfile?.(session.broadcasterId)}
            >
              <img
                src={session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`}
                className="w-8 h-8 rounded-full object-cover border-2 border-amber-400"
                alt=""
              />
              <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[7px] font-black px-1 rounded-full animate-pulse">
                LIVE
              </span>
            </div>

            <div className="text-left rtl:text-right min-w-0">
              <div className="flex items-center gap-1">
                <span 
                  onClick={() => onOpenSellerProfile?.(session.broadcasterId)}
                  className="text-xs font-black text-white hover:text-amber-300 transition-colors truncate max-w-[95px] cursor-pointer"
                >
                  {session.broadcasterName}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-300">
                <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                  <Users className="w-2.5 h-2.5" />
                  {viewerCount}
                </span>
                <span className="flex items-center gap-0.5 text-slate-400">
                  <MapPin className="w-2.5 h-2.5 text-amber-400" />
                  {session.location || 'Erbil'}
                </span>
              </div>
            </div>

            {/* Follow Streamer Button */}
            {!isBroadcaster && (
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow ${
                  isFollowing
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                }`}
              >
                {isFollowing ? <Check className="w-2.5 h-2.5" /> : <UserPlus className="w-2.5 h-2.5" />}
                <span>{isFollowing ? (isKurdish ? 'فۆڵۆوە' : 'Following') : (isKurdish ? 'فۆڵۆو' : 'Follow')}</span>
              </button>
            )}
          </div>

          {/* Right Action Controls: Network Mode, Delete (if owner), Minimize, Close */}
          <div className="flex items-center gap-1.5">
            {/* Low-Data Saver / Network Quality Badge */}
            <button
              type="button"
              onClick={() => setLowDataMode(!lowDataMode)}
              className={`px-2 py-1 rounded-full text-[9px] font-black flex items-center gap-1 backdrop-blur-md border shadow transition-transform active:scale-90 cursor-pointer ${
                lowDataMode
                  ? 'bg-amber-500/90 text-slate-950 border-amber-300'
                  : networkHealth === 'poor'
                  ? 'bg-rose-600/80 text-white border-rose-400 animate-pulse'
                  : 'bg-black/60 text-slate-200 border-white/20'
              }`}
              title={lowDataMode ? 'Low Data Mode Active' : 'Toggle Low Data Mode'}
            >
              <Wifi className="w-3 h-3" />
              <span>{lowDataMode ? (isKurdish ? 'خەتی کەم' : 'Low Data') : (isKurdish ? 'HD' : 'HD')}</span>
            </button>

            {/* Broadcaster / Admin DELETE Broadcast Button */}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white font-black text-xs flex items-center gap-1 backdrop-blur-md border border-red-400 shadow-lg cursor-pointer active:scale-90 transition-transform"
                title={isKurdish ? 'سڕینەوەی ئەم پەخشە' : 'Delete Stream'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isKurdish ? 'سڕینەوە' : 'Delete'}</span>
              </button>
            )}

            {/* Back & Minimize to PiP Button */}
            <button
              type="button"
              onClick={onMinimize}
              className="px-2.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1 backdrop-blur-md border border-white/20 shadow-lg cursor-pointer active:scale-90 transition-transform"
              title={isKurdish ? 'گەڕانەوە بۆ ئەپڵیکەیشن' : 'Back & Minimize'}
            >
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180 text-emerald-400" />
              <Minimize2 className="w-3 h-3 text-amber-300" />
              <span>{isKurdish ? 'گەڕانەوە' : 'Back'}</span>
            </button>

            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 cursor-pointer active:scale-90 transition-transform"
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Direct Close Button (لابردنی ڕاستەوخۆ) */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center border border-red-300/40 shadow-lg cursor-pointer active:scale-90 transition-transform"
              title={isKurdish ? 'داخستنی پەخش' : 'Close Stream'}
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Unmute floating reminder banner if audio is muted */}
        {isAudioMuted && (
          <button
            type="button"
            onClick={() => {
              setIsAudioMuted(false);
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.play().catch(() => {});
              }
            }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black/85 hover:bg-black text-white text-xs font-black px-4 py-2 rounded-full border border-amber-400/50 flex items-center gap-2 shadow-2xl cursor-pointer active:scale-95 transition-all animate-bounce"
          >
            <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isKurdish ? 'کلیک بکە بۆ دەنگ 🔊' : isArabic ? 'اضغط لتشغيل الصوت 🔊' : 'Tap for audio 🔊'}</span>
          </button>
        )}

        {/* Middle Flexible Spacer */}
        <div className="flex-1 min-h-[100px]" />

        {/* ========================================================= */}
        {/* PINNED SHOPPABLE PRODUCT DRAWER */}
        {/* ========================================================= */}
        {pinnedProduct && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-30 px-3 sm:px-4 mb-2 pointer-events-auto"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl">
              <img
                src={pinnedProduct.imageUrls?.[0] || pinnedProduct.imageUrl || posterImage}
                className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
                  {isKurdish ? '🔥 کاڵای ڕاستەوخۆ لە پەخش' : '🔥 Pinned Live Item'}
                </span>
                <h4 className="text-xs font-black text-white truncate">{pinnedProduct.title}</h4>
                <p className="text-xs font-extrabold text-emerald-400 font-mono">
                  {Number(pinnedProduct.price || 25000).toLocaleString()} IQD
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectItem?.(pinnedProduct)}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1 cursor-pointer active:scale-95 transition-transform shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'کڕین' : 'Buy'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* LIVE COMMENTS STREAM */}
        {/* ========================================================= */}
        <div className="relative z-30 px-3 sm:px-4 max-h-44 sm:max-h-48 overflow-y-auto space-y-1.5 mb-2 no-scrollbar pointer-events-auto">
          {liveComments.slice(-25).map((comment, cIdx) => (
            <motion.div
              key={`${comment.id || 'comm'}-${cIdx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 w-fit max-w-[88%] text-xs shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-amber-300">
                  {comment.userName}
                </span>
                {comment.broadcasterId === comment.userId && (
                  <span className="bg-red-600 text-white text-[8px] font-black px-1 rounded-sm">
                    HOST
                  </span>
                )}
              </div>
              <span className="text-white font-medium text-xs break-words block mt-0.5">
                {comment.text}
              </span>
            </motion.div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ACTION BAR: Gifts + Chat + Share */}
        {/* ========================================================= */}
        <div className="relative z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 sm:p-4 space-y-2 pointer-events-auto">
          {/* Gifts Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {GIFTS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSendGift(g)}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 px-2.5 py-1 rounded-xl text-xs font-black text-white shrink-0 active:scale-90 transition-all cursor-pointer shadow"
              >
                <span>{g.icon}</span>
                <span className="text-[10px] text-slate-300">{g.name}</span>
              </button>
            ))}

            {/* Quick Share Link */}
            <button
              type="button"
              onClick={handleShareStream}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl text-xs font-black text-emerald-400 shrink-0 active:scale-90 transition-all cursor-pointer shadow"
              title="Share Stream"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="text-[10px] text-white">
                {copiedLink ? (isKurdish ? 'کۆپیکرا!' : 'Copied!') : (isKurdish ? 'هاوبەشکردن' : 'Share')}
              </span>
            </button>
          </div>

          {/* Chat Comment Input Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={isKurdish ? 'کۆمێنت یان پرسیارێک بنووسە...' : isArabic ? 'أكتب تعليقاً أو استفساراً...' : 'Type a comment or ask a question...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendComment();
              }}
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none shadow-inner"
            />
            <button
              type="button"
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="w-10 h-10 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 flex items-center justify-center font-black transition-all cursor-pointer active:scale-95 shadow-lg shrink-0"
            >
              <Send className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CUSTOM IN-APP DELETE STREAM MODAL (ZERO reliance on window.confirm) */}
        {/* ========================================================= */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 border border-red-500/50 rounded-3xl p-5 max-w-xs w-full shadow-2xl text-center space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
                  <Trash2 className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {isKurdish ? 'سڕینەوەی ئەم پەخشە' : isArabic ? 'حذف هذا البث' : 'Delete Broadcast'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isKurdish 
                      ? 'ئایا دڵنیایت لە سڕینەوەی یەکجارەکی ئەم پەخشە؟ ئەم کردارە ناگەڕێتەوە.' 
                      : isArabic 
                      ? 'هل أنت متأكد من حذف هذا البث المباشر نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' 
                      : 'Are you sure you want to permanently delete this broadcast? This cannot be undone.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleExecuteDelete}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isKurdish ? 'بەڵێ، بسڕەوە' : isArabic ? 'نعم، حذف' : 'Yes, Delete'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer active:scale-95"
                  >
                    {isKurdish ? 'پەشیمانبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Success Toast Feedback */}
        <AnimatePresence>
          {deleteSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-2xl"
            >
              <Check className="w-4 h-4" />
              <span>{isKurdish ? 'پەخشەکە بە سەرکەوتوویی سڕایەوە' : 'Broadcast deleted successfully'}</span>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};
