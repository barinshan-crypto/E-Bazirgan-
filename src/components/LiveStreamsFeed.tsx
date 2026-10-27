import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Video, 
  Users, 
  MapPin, 
  Search, 
  Sparkles, 
  Heart, 
  Share2, 
  X, 
  Volume2, 
  VolumeX, 
  Send, 
  Check, 
  Copy,
  ChevronDown,
  ChevronDown as ScrollDownIcon,
  Tag,
  ShoppingBag,
  Edit2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Phone,
  Layers,
  PackageCheck,
  UserPlus,
  Clock,
  User as UserIcon,
  Store,
  Truck,
  ShieldCheck,
  Pin,
  Play,
  Film,
  Bell,
  ShoppingCart,
  Sliders,
  Info,
  Square,
  Grid,
  List,
  Maximize2,
  Minimize2,
  Flag,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, LiveSession, LiveComment, User, checkIsAdmin } from '../lib/db';
import { initWebRTCViewer } from '../lib/webrtc';
import { IRAQ_CITIES, COMMON_COLORS, COMMON_SIZES, DEFAULT_LIVE_BROADCAST_VIDEO, FALLBACK_LIVE_BROADCAST_VIDEO } from '../lib/constants';
import { rankLiveSessions } from '../lib/algorithm';
import { safeCopyToClipboard } from '../lib/clipboard';
import { 
  getStoredMutePreference, 
  setStoredMutePreference, 
  savePlaybackState, 
  getPlaybackState, 
  safelyTeardownVideo 
} from '../lib/liveStreamPlaybackManager';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_LIVE_STREAM_VIDEO = DEFAULT_LIVE_BROADCAST_VIDEO;

interface LiveStreamsFeedProps {
  user: User | null;
  theme: string;
  initialSessionId?: string | null;
  onRequireAuth: () => void;
  onStartOwnLive: () => void;
  onBack?: () => void;
  onOpenLiveSession?: (session: LiveSession) => void;
  onOpenSellerProfile?: (sellerId: string, fallbackInfo?: any) => void;
}

interface ShowcaseProduct {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  specs?: string[];
  shippingFee?: number;
  etaHours?: number;
}

const FEATURED_CITY_IDS = ['Erbil', 'Sulaymaniyah', 'Duhok', 'Kirkuk', 'Zakho', 'Halabja', 'Baghdad', 'Basra', 'Mosul'];

const normalizeStr = (str: string) => {
  return (str || '')
    .toLowerCase()
    .replace(/[كک]/g, 'ک')
    .replace(/[ىيێی]/g, 'ی')
    .replace(/[ۆو]/g, 'و')
    .replace(/[ەہ]/g, 'ە')
    .replace(/\s+/g, ' ')
    .trim();
};

/* Individual Vertical Immersive Stream Card (Full Viewport Height) */
interface FullVerticalStreamCardProps {
  key?: React.Key;
  session: LiveSession & { products?: ShowcaseProduct[]; sellerPhone?: string };
  user: User | null;
  onRequireAuth: () => void;
  isKu: boolean;
  index: number;
  totalCount: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onDeleteStream?: (session: LiveSession) => void;
  onOpenSellerProfile?: (sellerId: string, fallbackInfo?: any) => void;
  isFullscreen?: boolean;
  isActive?: boolean;
  isBackgrounded?: boolean;
}

function FullVerticalStreamCard({
  session,
  user,
  onRequireAuth,
  isKu,
  index,
  totalCount,
  onClose,
  onMinimize,
  onDeleteStream,
  onOpenSellerProfile,
  isFullscreen = false,
  isActive = true,
  isBackgrounded = false
}: FullVerticalStreamCardProps) {
  const { i18n } = useTranslation();
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const cached = session?.id ? getPlaybackState(session.id) : null;
    return cached ? cached.isMuted : getStoredMutePreference();
  });
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [hasStreamObject, setHasStreamObject] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const cardRootRef = useRef<HTMLDivElement>(null);
  const [isInViewport, setIsInViewport] = useState<boolean>(isFullscreen || index === 0);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Viewport intersection observer: only play when in active viewport
  useEffect(() => {
    if (isFullscreen) {
      setIsInViewport(true);
      return;
    }
    if (!cardRootRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      { threshold: 0.55 }
    );

    observer.observe(cardRootRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, []);

  const shouldStreamPlay = !isBackgrounded && isInViewport && isActive;
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [viewerCount, setViewerCount] = useState<number>(session.viewerCount ?? (session as any).viewer_count ?? 1);
  const [likesCount, setLikesCount] = useState<number>(230 + Math.floor(Math.random() * 120));
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [activeGift, setActiveGift] = useState<string | null>(null);

  // Quick Share State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareCopiedToast, setShareCopiedToast] = useState<boolean>(false);

  // Live Pinned Product State
  const [featuredTitle, setFeaturedTitle] = useState<string>(
    session.featuredTitle || (isKu ? 'قوماشی ئۆرجیناڵ - دیزاینی نوێ' : 'Featured Live Product')
  );
  const [featuredPrice, setFeaturedPrice] = useState<number>(
    session.featuredPrice || 25000
  );
  const [featuredImage, setFeaturedImage] = useState<string>(
    session.featuredImage || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400'
  );

  // Broadcaster Edit Price Modal
  const [showEditPriceModal, setShowEditPriceModal] = useState<boolean>(false);
  const [editTitleInput, setEditTitleInput] = useState<string>(featuredTitle);
  const [editPriceInput, setEditPriceInput] = useState<string>(featuredPrice.toString());
  const [editImageInput, setEditImageInput] = useState<string>(featuredImage);

  // Viewer Order Modal State
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderTargetProduct, setOrderTargetProduct] = useState<{ title: string; price: number; imageUrl: string } | null>(null);
  const [orderPhone, setOrderPhone] = useState<string>(user?.phone || '');
  const [orderAddress, setOrderAddress] = useState<string>(user?.city ? `${user.city} - ${user.address || ''}` : '');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  // Pre-WhatsApp Review Modal State
  const [showWaReviewModal, setShowWaReviewModal] = useState<boolean>(false);
  const [waOrderCode, setWaOrderCode] = useState<string>('');
  const [waOrderDate, setWaOrderDate] = useState<string>('');
  const [waProductTitle, setWaProductTitle] = useState<string>('');
  const [waProductPrice, setWaProductPrice] = useState<number>(0);
  const [waProductImage, setWaProductImage] = useState<string>('');
  const [waQuantity, setWaQuantity] = useState<number>(1);
  const [waBuyerName, setWaBuyerName] = useState<string>('');
  const [waBuyerPhone, setWaBuyerPhone] = useState<string>('');
  const [waBuyerCity, setWaBuyerCity] = useState<string>('');
  const [waBuyerAddress, setWaBuyerAddress] = useState<string>('');
  const [waBuyerGps, setWaBuyerGps] = useState<string>('');
  const [waSellerName, setWaSellerName] = useState<string>('');
  const [waSellerCode, setWaSellerCode] = useState<string>('');
  const [waSellerAddress, setWaSellerAddress] = useState<string>('');
  const [waSellerPhone, setWaSellerPhone] = useState<string>('');

  // Showcase Product Catalog Drawer State
  const [showCatalogDrawer, setShowCatalogDrawer] = useState<boolean>(false);

  // Product Details Bottom Sheet State (Interactive Product Sheet)
  const [showProductBottomSheet, setShowProductBottomSheet] = useState<boolean>(false);
  const [bottomSheetProduct, setBottomSheetProduct] = useState<ShowcaseProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');

  // Real-time Live Sale Notification Toast Overlay
  const [livePurchaseAlert, setLivePurchaseAlert] = useState<{ buyerName: string; city: string; itemTitle: string } | null>(null);

  // Host Pin Control Drawer State
  const [showHostPinDrawer, setShowHostPinDrawer] = useState<boolean>(false);

  // Floating Cart Count
  const [cartItemsCount, setCartItemsCount] = useState<number>(0);

  // Flag / Report Stream Modal State
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('fraud');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoSrc, setVideoSrc] = useState<string>(() => {
    const raw = (session as any).videoUrl || (session as any).streamUrl;
    if (raw && typeof raw === 'string' && !raw.includes('flower') && !raw.includes('friday') && !raw.includes('mixkit') && raw.trim().length > 0) {
      return raw;
    }
    return DEFAULT_LIVE_STREAM_VIDEO;
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  const isAdmin = checkIsAdmin(user);
  const isHost = Boolean(
    user && (
      (user.id && user.id === session.broadcasterId) ||
      (user.phone && ((session as any).broadcasterPhone || session.sellerPhone) && user.phone.replace(/\D/g, '') === ((session as any).broadcasterPhone || session.sellerPhone).replace(/\D/g, '')) ||
      (user.name && session.broadcasterName && user.name.trim().toLowerCase() === session.broadcasterName.trim().toLowerCase())
    )
  );
  const canManageStream = isHost || isAdmin;
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  useEffect(() => {
    if (user && session.broadcasterId) {
      db.getSellerProfile(session.broadcasterId).then(prof => {
        if (prof?.followers?.includes(user.id)) {
          setIsFollowing(true);
        }
      }).catch(() => {});
    }
  }, [user, session.broadcasterId]);

  const handleToggleFollow = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    try {
      const updatedFollowers = await db.toggleFollowSeller(session.broadcasterId, user.id);
      setIsFollowing(updatedFollowers.includes(user.id));
    } catch (err) {
      console.error("Failed to toggle follow seller:", err);
    }
  };

  const sellerPhone = session.sellerPhone || '07746573763';
  const showcaseProducts: ShowcaseProduct[] = (session.products && session.products.length > 0)
    ? session.products.map((p, idx) => idx === 0 ? { ...p, price: featuredPrice, title: featuredTitle, imageUrl: featuredImage || p.imageUrl } : p)
    : [
        {
          id: `${session.id}_p1`,
          title: featuredTitle,
          price: featuredPrice,
          imageUrl: featuredImage,
          description: isKu ? 'کاڵای دیاریکراوی پەخشی ڕاستەوخۆ' : 'Featured item in live stream'
        }
      ];

  // Subscribe to real-time session updates and comments
  useEffect(() => {
    const unsubSession = db.onLiveSessionUpdate(session.id, (updated) => {
      if (updated) {
        setViewerCount(updated.viewerCount ?? (updated as any).viewer_count ?? 1);
        if (updated.featuredTitle) setFeaturedTitle(updated.featuredTitle);
        if (updated.featuredPrice !== undefined) setFeaturedPrice(updated.featuredPrice);
        if (updated.featuredImage) setFeaturedImage(updated.featuredImage);
        if (updated.videoUrl || updated.streamUrl) {
          const raw = updated.videoUrl || updated.streamUrl;
          if (raw && typeof raw === 'string' && !raw.includes('flower') && !raw.includes('friday') && raw.trim().length > 0) {
            setVideoSrc(raw);
          }
        }
      }
    });

    const unsubComments = db.onLiveCommentsChange(session.id, (comments) => {
      setLiveComments(comments);
    });

    return () => {
      unsubSession();
      unsubComments();
    };
  }, [session.id]);

  // Video buffering stall watchdog for smooth auto-recovery (1000ms recovery)
  const handleVideoWaiting = () => {
    setIsBuffering(true);
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(() => {
      if (videoRef.current && shouldStreamPlay && isMountedRef.current) {
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
  };

  // Anti-Freeze Watchdog: monitors frame advancement and prevents video stalls
  useEffect(() => {
    if (!shouldStreamPlay) return;

    let lastTime = -1;
    let stuckCount = 0;

    const interval = setInterval(() => {
      const vid = videoRef.current;
      if (!vid || !isMountedRef.current || !shouldStreamPlay) return;

      if (!vid.paused && vid.readyState >= 2) {
        if (Math.abs(vid.currentTime - lastTime) < 0.05) {
          stuckCount++;
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
  }, [shouldStreamPlay]);

  // Video & Stream playback attempt with WebRTC support & viewport gating
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (!shouldStreamPlay) {
      vid.pause();
      setIsPlaying(false);
      return;
    }

    if ((session as any).mediaStream) {
      vid.srcObject = (session as any).mediaStream;
      setHasStreamObject(true);
    } else if ((session as any).stream) {
      vid.srcObject = (session as any).stream;
      setHasStreamObject(true);
    }

    // Restore cached playback time
    const cached = session?.id ? getPlaybackState(session.id) : null;
    if (cached && cached.currentTime > 0 && !vid.srcObject) {
      try {
        vid.currentTime = cached.currentTime;
      } catch (_) {}
    }

    // If viewer (not broadcaster), connect via WebRTC
    let cleanupWebRTC = () => {};
    if (!isHost && session.id) {
      const viewerId = user?.id || `viewer_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      cleanupWebRTC = initWebRTCViewer(session.id, viewerId, (remoteStream) => {
        if (vid && isMountedRef.current && shouldStreamPlay) {
          vid.srcObject = remoteStream;
          setHasStreamObject(true);
          vid.play().then(() => {
            setIsPlaying(true);
            setIsVideoLoaded(true);
            setIsBuffering(false);
          }).catch(() => {});
        }
      });
    }

    vid.defaultMuted = true;
    vid.muted = isMuted;
    vid.setAttribute('playsinline', 'true');
    vid.setAttribute('webkit-playsinline', 'true');

    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (isMountedRef.current) {
            setIsPlaying(true);
            setIsVideoLoaded(true);
            setIsBuffering(false);
          }
        })
        .catch(() => {
          if (isMountedRef.current) {
            vid.muted = true;
            setIsMuted(true);
            vid.play().then(() => {
              setIsPlaying(true);
              setIsVideoLoaded(true);
              setIsBuffering(false);
            }).catch(() => {});
          }
        });
    }

    // Safe unmount teardown: prevents memory leaks, stops active tracks and saves state
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
      if (!shouldStreamPlay) {
        vid.pause();
      }
    };
  }, [videoSrc, session.id, isHost, shouldStreamPlay]);

  // Synchronize mute toggle directly without re-triggering WebRTC
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
    setStoredMutePreference(isMuted);
    if (session?.id) {
      savePlaybackState(session.id, { isMuted });
    }
  }, [isMuted, session?.id]);

  const handleVideoError = () => {
    if (videoSrc !== DEFAULT_LIVE_STREAM_VIDEO) {
      setVideoSrc(DEFAULT_LIVE_STREAM_VIDEO);
    } else {
      setVideoSrc(FALLBACK_LIVE_BROADCAST_VIDEO);
    }
  };

  const handleQuickShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?live=${session.id}`;
    const shareTitle = `🔴 ${session.broadcasterName} - ${featuredTitle || session.title || 'پەخشی ڕاستەوخۆ'}`;
    const shareText = `🔴 تەماشای پەخشی ڕاستەوخۆی "${session.broadcasterName}" بکە لە پەیڤ مارکێت!\n🛍️ کاڵا: ${featuredTitle}\n💰 نرخ: ${Number(featuredPrice).toLocaleString()} IQD\n📍 شوێن: ${session.location || 'کوردستان'}\n🔗 لینکی پەخش:`;

    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (e) {
        // User cancelled or share unavailable, fall through to modal
      }
    }

    setShowShareModal(true);
  };

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?live=${session.id}`;
    const success = await safeCopyToClipboard(shareUrl);
    if (success) {
      setShareCopiedToast(true);
      setTimeout(() => setShareCopiedToast(false), 2500);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      await db.addLiveComment({
        sessionId: session.id,
        broadcasterId: session.broadcasterId,
        userId: user.id,
        userName: user.name || 'بینەر',
        userAvatar: user.avatar,
        text: newComment.trim()
      });
      setNewComment('');
    } catch (err) {
      console.error("Failed to send comment:", err);
    }
  };

  // Broadcaster updates price live
  const handleSavePriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(editPriceInput) || 0;
    setFeaturedTitle(editTitleInput);
    setFeaturedPrice(priceNum);
    if (editImageInput) setFeaturedImage(editImageInput);

    await db.updateLiveSessionProduct(session.id, {
      featuredTitle: editTitleInput,
      featuredPrice: priceNum,
      featuredImage: editImageInput || featuredImage
    });

    const priceCommentText = isKu 
      ? `🏷️ فرۆشیار نرخی کاڵاکەی دیاریکرد: ${editTitleInput} بە ${priceNum.toLocaleString()} د.ع`
      : `🏷️ Pinned price: ${editTitleInput} for ${priceNum.toLocaleString()} IQD`;
    
    await db.addLiveComment({
      sessionId: session.id,
      broadcasterId: session.broadcasterId,
      userId: 'system',
      userName: '📢 SYSTEM',
      text: priceCommentText
    });

    setShowEditPriceModal(false);
  };

  // Host Pins a product live during stream
  const handlePinProduct = async (prod: ShowcaseProduct) => {
    setFeaturedTitle(prod.title);
    setFeaturedPrice(prod.price);
    setFeaturedImage(prod.imageUrl);

    await db.updateLiveSessionProduct(session.id, {
      featuredTitle: prod.title,
      featuredPrice: prod.price,
      featuredImage: prod.imageUrl
    });

    const pinMsg = isKu 
      ? `📌 فرۆشیار کاڵای نوێی ڕاگەیاند: ${prod.title} بە ${prod.price.toLocaleString()} د.ع`
      : `📌 Host pinned item: ${prod.title} for ${prod.price.toLocaleString()} IQD`;

    await db.addLiveComment({
      sessionId: session.id,
      broadcasterId: session.broadcasterId,
      userId: 'system',
      userName: '📢 SYSTEM',
      text: pinMsg
    });

    setShowHostPinDrawer(false);
  };

  // Fast 1-Click Instant Buy from Live Stream
  const [instantOrderResult, setInstantOrderResult] = useState<{
    orderCode: string;
    orderDate: string;
    orderTime: string;
    buyerName: string;
    buyerPhone: string;
    buyerCity: string;
    buyerAddress: string;
    itemTitle: string;
    itemPrice: number;
    itemImage: string;
    size: string;
    color: string;
  } | null>(null);

  const handleInstantBuy = async (product: ShowcaseProduct) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    const orderCode = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();
    const orderDate = now.toLocaleDateString('en-GB');
    const orderTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const buyerName = user.name || (isKu ? 'کڕیاری بەرێز' : 'Valued Customer');
    const buyerPhone = user.phone || '07746573763';
    const buyerCity = user.city || (isKu ? 'هەولێر' : 'Erbil');
    const buyerAddress = user.address
      ? `${buyerCity} - ${user.address}`
      : (isKu ? `${buyerCity} - شەقامی سەرەکی (زانیاری پرۆفایل)` : `${buyerCity} - Main Street (From Profile)`);

    // Trigger instant sale alert toast overlay for all stream viewers
    setLivePurchaseAlert({
      buyerName,
      city: buyerCity,
      itemTitle: product.title
    });
    setTimeout(() => setLivePurchaseAlert(null), 5000);

    setCartItemsCount(prev => prev + 1);

    const orderRecord = {
      orderCode,
      orderDate,
      orderTime,
      buyerName,
      buyerPhone,
      buyerCity,
      buyerAddress,
      itemTitle: product.title,
      itemPrice: product.price,
      itemImage: product.imageUrl,
      size: selectedSize,
      color: selectedColor
    };

    setInstantOrderResult(orderRecord);
    setShowProductBottomSheet(false);

    try {
      await db.addToBasket(user.id, {
        id: `live_item_${Date.now()}`,
        userId: session.broadcasterId,
        userName: session.broadcasterName,
        title: product.title,
        description: `کۆدی داواکاری: ${orderCode} | بەروار: ${orderDate} ${orderTime} | سایز: ${selectedSize} | ڕەنگ: ${selectedColor} | ئەدرێسی پرۆفایل: ${buyerAddress}`,
        price: product.price,
        imageUrl: product.imageUrl,
        category: 'live',
        postType: 'marketplace',
        createdAt: Date.now(),
        sellerId: session.broadcasterId,
        sellerPhone: session.sellerPhone || '07746573763'
      });
    } catch (err) {
      console.error("Instant order error:", err);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const triggerGift = (emoji: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setActiveGift(emoji);
    setTimeout(() => setActiveGift(null), 2000);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const reportData = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.id,
      sessionTitle: session.title || featuredTitle || 'پەخشی ڕاستەوخۆ',
      broadcasterId: session.broadcasterId,
      broadcasterName: session.broadcasterName || 'پەخشکەر',
      broadcasterAvatar: session.broadcasterAvatar || '',
      reportedByUserId: user?.id || 'guest',
      reportedByUserName: user?.name || (isKu ? 'بینەر' : 'Viewer'),
      reportedByUserPhone: user?.phone || '',
      reason: reportReason,
      details: reportDetails.trim(),
      createdAt: Date.now()
    };
    try {
      await db.createLiveReport(reportData);
    } catch (err) {
      console.warn("Report save error:", err);
    }
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setShowReportModal(false);
      setReportDetails('');
    }, 2000);
  };

  const openWhatsAppOrderReview = (prodTitle?: string, prodPrice?: number, prodImg?: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }

    const title = prodTitle || orderTargetProduct?.title || featuredTitle;
    const price = prodPrice || orderTargetProduct?.price || featuredPrice;
    const img = prodImg || orderTargetProduct?.imageUrl || featuredImage;
    const qty = orderQuantity || 1;
    const randomCode = `#LIVE-${Math.floor(100000 + Math.random() * 900000)}`;

    const d = new Date();
    const dateFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')})`;

    const buyerName = user?.name || (isKu ? 'کڕیاری بەڕێز' : 'Valued Buyer');
    const buyerPhone = user?.phone || orderPhone || '07746573763';
    const buyerCity = user?.city || session.city || (isKu ? 'هەولێر' : 'Erbil');
    const buyerAddress = user?.address
      ? `${buyerCity} - ${user.address}`
      : `${buyerCity} - ${isKu ? 'شەقامی سەرەکی (لە پرۆفایلەوە)' : 'Main Street (From Profile)'}`;

    const storeName = session.broadcasterName || 'Live Boutique';
    const sellerCityName = session.city || (isKu ? 'سلێمانی' : 'Sulaymaniyah');
    const rawSellerPhone = sellerPhone || session.sellerPhone || '07746573763';
    const cleanPhone = rawSellerPhone.replace(/\D/g, '');
    const phoneFormatted = cleanPhone.startsWith('0') ? '964' + cleanPhone.slice(1) : (cleanPhone || '9647746573763');
    const totalPrice = price * qty;

    const formattedMessage = isKu
      ? `📦 *داواکاری نوێ لە پەخشی ڕاستەوخۆ*
==============================
🏷️ *کۆدی داواکاری:* ${randomCode}
📅 *بەروار و کات:* ${dateFormatted}

🛍️ *زانیاری کاڵا:*
• ناوی کاڵا: ${title}
• نرخ: ${price.toLocaleString()} د.ع
• بڕ: ${qty} دانە
• کۆی گشتی: ${totalPrice.toLocaleString()} د.ع

👤 *زانیاری و لۆکەیشنی کڕیار (خۆکارانە لە پرۆفایلەوە):*
• ناوی کڕیار: ${buyerName}
• ژمارەی مۆبایل: ${buyerPhone}
• شار و ئەدرێس: ${buyerAddress}

🏪 *زانیاری فرۆشیار:*
• ناوی فرۆشگا: ${storeName}
• شار: ${sellerCityName}
==============================
تکایە داواکارییەکە ڕەوانە بکەن و پەیوەندیم پێوە بکەن!`
      : `📦 *NEW LIVE STREAM ORDER*
==============================
🏷️ *Order Code:* ${randomCode}
📅 *Date & Time:* ${dateFormatted}

🛍️ *Item Details:*
• Item Name: ${title}
• Unit Price: ${price.toLocaleString()} IQD
• Quantity: ${qty}
• Total Amount: ${totalPrice.toLocaleString()} IQD

👤 *Buyer Info (Auto from profile):*
• Name: ${buyerName}
• Phone: ${buyerPhone}
• Address: ${buyerAddress}

🏪 *Seller Info:*
• Store: ${storeName}
• City: ${sellerCityName}`;

    // Close any open drawers
    setShowWaReviewModal(false);
    setShowOrderModal(false);
    setShowProductBottomSheet(false);
    setShowCatalogDrawer(false);

    // Trigger instant sale alert overlay
    setLivePurchaseAlert({
      buyerName,
      city: buyerCity,
      itemTitle: title
    });
    setTimeout(() => setLivePurchaseAlert(null), 5000);

    // Record order in basket/db
    db.createSourcedPost({
      userName: buyerName,
      title,
      description: `WhatsApp Live Order (${randomCode}) - ${buyerAddress}`,
      price: totalPrice,
      imageUrl: img,
      category: 'live',
      postType: 'marketplace',
      createdAt: Date.now(),
      sellerId: session.broadcasterId,
      sellerPhone: buyerPhone
    }).catch(err => console.warn("Recorded order locally", err));

    // Open WhatsApp directly
    window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(formattedMessage)}`, '_blank');
  };

  const openWhatsApp = (productName?: string, price?: number, imageUrl?: string) => {
    openWhatsAppOrderReview(productName, price, imageUrl);
  };

  const handleSendWhatsAppNow = async () => {
    if (!waBuyerPhone.trim()) {
      alert(isKu ? 'تکایە ژمارەی مۆبایلی کڕیار بنووسە' : 'Please specify buyer phone number');
      return;
    }
    if (!waBuyerAddress.trim()) {
      alert(isKu ? 'تکایە ناونیشانی گەیاندنی کڕیار بنووسە' : 'Please specify delivery address');
      return;
    }

    const cleanPhone = waSellerPhone.replace(/\D/g, '');
    const phoneFormatted = cleanPhone.startsWith('0') ? '964' + cleanPhone.slice(1) : (cleanPhone || '9647746573763');
    const totalPrice = waProductPrice * waQuantity;

    const formattedMessage = isKu
      ? `📦 *داواکاری نوێ لە پەخشی ڕاستەوخۆ*
==============================
🏷️ *کۆدی داواکاری:* ${waOrderCode}
📅 *بەروار و کات:* ${waOrderDate}

🛍️ *زانیاری کاڵا:*
• ناوی کاڵا: ${waProductTitle}
• وێنەی کاڵا: ${waProductImage}
• نرخ: ${waProductPrice.toLocaleString()} د.ع
• بڕ: ${waQuantity} دانە
• کۆی گشتی: ${totalPrice.toLocaleString()} د.ع

👤 *زانیاری و لۆکەیشنی کڕیار (Buyer):*
• ناوی کڕیار: ${waBuyerName}
• ژمارەی مۆبایل: ${waBuyerPhone}
• شار: ${waBuyerCity}
• ئەدرێسی گەیاندن: ${waBuyerAddress}
• لۆکەیشن / نەخشە: ${waBuyerGps}

🏪 *زانیاری و ئەدرێسی فرۆشیار (Seller):*
• کۆدی فرۆشیار: ${waSellerCode}
• ناوی فرۆشگا: ${waSellerName}
• شار و ئەدرێسی فرۆشیار: ${waSellerAddress}
• مۆبایلی فرۆشیار: ${waSellerPhone}
==============================
تکایە داواکارییەکە ڕەوانە بکەن و پەیوەندیم پێوە بکەن!`
      : `📦 *NEW LIVE STREAM ORDER*
==============================
🏷️ *Order Code:* ${waOrderCode}
📅 *Date & Time:* ${waOrderDate}

🛍️ *Item Details:*
• Item Name: ${waProductTitle}
• Image URL: ${waProductImage}
• Unit Price: ${waProductPrice.toLocaleString()} IQD
• Quantity: ${waQuantity}
• Total Amount: ${totalPrice.toLocaleString()} IQD

👤 *Buyer Info & Location:*
• Name: ${waBuyerName}
• Phone: ${waBuyerPhone}
• City: ${waBuyerCity}
• Delivery Address: ${waBuyerAddress}
• GPS Location: ${waBuyerGps}

🏪 *Seller Info & Address:*
• Seller Code: ${waSellerCode}
• Store Name: ${waSellerName}
• Address: ${waSellerAddress}
• Contact Phone: ${waSellerPhone}
==============================
Please confirm this order and prepare for delivery!`;

    try {
      await db.createSourcedPost({
        userName: waBuyerName,
        title: waProductTitle,
        description: `WhatsApp Live Order (${waOrderCode}) - ${waBuyerAddress}`,
        price: totalPrice,
        imageUrl: waProductImage,
        category: 'live',
        postType: 'marketplace',
        createdAt: Date.now(),
        sellerId: session.broadcasterId,
        sellerPhone: waBuyerPhone
      });
    } catch (err) {
      console.warn("Recorded order locally", err);
    }

    window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(formattedMessage)}`, '_blank');
    setShowWaReviewModal(false);
    setShowOrderModal(false);
  };

  return (
    <div 
      ref={cardRootRef}
      className={clsx(
      "w-full mx-auto relative rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800/90 snap-start shrink-0 flex flex-col justify-between my-0",
      isFullscreen 
        ? "w-full h-full sm:h-auto sm:max-h-[96vh] sm:aspect-[9/16] sm:max-w-md md:max-w-lg" 
        : "w-full max-w-lg h-[calc(100vh-110px)] sm:h-[calc(100vh-125px)] sm:aspect-[9/16]"
    )}>
      {/* Floating Gift Animation Overlay */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: -220, scale: 2.8 }}
            exit={{ opacity: 0, scale: 3.2 }}
            transition={{ duration: 1.5 }}
            className="absolute left-1/2 -translate-x-1/2 top-1/2 pointer-events-none z-50 text-7xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
          >
            {activeGift}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Stream & Full-Screen Canvas */}
      <div 
        onClick={() => {
          if (videoRef.current) {
            if (isMuted) {
              setIsMuted(false);
              videoRef.current.muted = false;
            }
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }}
        className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center overflow-hidden cursor-pointer"
        style={{ contain: 'paint layout' }}
      >
        {/* Ambient Animated Live Studio Glow Backdrop (Guarantees no black screen) */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-950/30 to-rose-950/40 z-0 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-rose-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Blurred Ambient Backdrop - Automatically eliminates letterbox borders */}
        <img 
          src={session.currentFrame || featuredImage || session.featuredImage || session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`} 
          className="w-full h-full object-cover absolute inset-0 z-0 filter blur-3xl opacity-40 scale-125 pointer-events-none select-none" 
          alt=""
          aria-hidden="true"
        />

        {/* Live Stream Poster Backdrop */}
        <img 
          src={session.currentFrame || featuredImage || session.featuredImage || session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`} 
          className="w-full h-full object-contain absolute inset-0 z-1 filter brightness-95" 
          alt="Live Stream HD Poster"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`;
          }}
        />

        {/* Dynamic Dark Gradient Backdrop Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/70 z-1 pointer-events-none" />

        {Boolean(videoSrc || hasStreamObject || (session as any).mediaStream || (session as any).stream) && (
          <video
            ref={videoRef}
            src={(hasStreamObject || (session as any).mediaStream || (session as any).stream) ? undefined : (shouldStreamPlay ? videoSrc : undefined)}
            poster={featuredImage || session.featuredImage || session.broadcasterAvatar}
            autoPlay={shouldStreamPlay}
            loop
            muted={isMuted}
            playsInline
            webkit-playsinline="true"
            x5-video-player-type="h5-page"
            x5-video-player-fullscreen="true"
            x5-playsinline="true"
            preload={shouldStreamPlay ? "auto" : "none"}
            onPlay={() => {
              setIsPlaying(true);
              setIsVideoLoaded(true);
            }}
            onPlaying={handleVideoPlaying}
            onWaiting={handleVideoWaiting}
            onCanPlay={() => {
              setIsVideoLoaded(true);
              if (shouldStreamPlay && videoRef.current) {
                videoRef.current.play().then(() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                }).catch(() => {});
              }
            }}
            onError={() => {
              handleVideoError();
            }}
            className={clsx(
              "w-full h-full object-contain absolute inset-0 z-5 select-none transition-opacity duration-300",
              isVideoLoaded ? "opacity-100" : "opacity-95"
            )}
            style={{
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              willChange: 'transform'
            }}
          />
        )}

        {/* Buffering Indicator for Slow Network */}
        {isBuffering && shouldStreamPlay && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-400/40 flex items-center gap-2 shadow-2xl pointer-events-none animate-pulse">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-[11px] font-bold text-white">
              {isKu ? 'خەتی ئینتەرنێت کەمێک هێواشە...' : i18n.language === 'ar' ? 'جاري التحميل...' : 'Buffering...'}
            </span>
          </div>
        )}

        {/* Tap to Unmute / Play Prompt if muted or not playing */}
        {(!isPlaying || isMuted) && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black/75 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 shadow-2xl pointer-events-none transition-all">
            {isMuted ? <VolumeX className="w-4 h-4 text-amber-400 shrink-0" /> : <Play className="w-4 h-4 text-emerald-400 shrink-0 fill-current" />}
            <span>
              {isKu 
                ? (isMuted ? 'کلیک بکە بۆ دەنگ' : 'دەست لێبدە بۆ دەستپێکردنی پەخش') 
                : (isMuted ? 'Tap for audio' : 'Tap to play video')}
            </span>
          </div>
        )}

        {/* Top and Bottom Dark Gradients for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-8 pointer-events-none" />
      </div>

      {/* Top Header Overlay Bar */}
      <div className="relative z-30 p-3 sm:p-4 flex items-center justify-between gap-2 pointer-events-auto">
        {/* Left Side: Unified Back & Minimize Button & Broadcaster Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          {(onClose || onMinimize) && (
            <div className="flex items-center gap-1 bg-black/75 backdrop-blur-xl border border-white/20 p-1 rounded-full shadow-2xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onMinimize) onMinimize();
                  else if (onClose) onClose();
                }}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all cursor-pointer active:scale-90 flex items-center gap-1.5 text-xs font-black shadow-sm"
                title={isKu ? 'گەڕانەوە و بچووککردنەوە بۆ سەر شاشە' : 'Back & Minimize to PiP'}
                aria-label={isKu ? 'گەڕانەوە' : 'Back'}
              >
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180 text-emerald-400" />
                <Minimize2 className="w-3 h-3 text-amber-300" />
                <span>{isKu ? 'گەڕانەوە' : 'Back'}</span>
              </button>
            </div>
          )}

          {/* Broadcaster Badge */}
          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-xl border border-white/15 px-2.5 py-1 rounded-full shadow-2xl min-w-0">
            <div 
              onClick={() => {
                if (onOpenSellerProfile && session.broadcasterId) {
                  onOpenSellerProfile(session.broadcasterId, {
                    name: session.broadcasterName,
                    avatar: session.broadcasterAvatar,
                    location: session.location
                  });
                }
              }}
              className="flex items-center gap-1.5 cursor-pointer group/host hover:opacity-90 transition-opacity min-w-0"
              title={isKu ? 'بینینی فرۆشگا و کاڵاکانی پەخشکەر' : 'View seller store'}
            >
              <div className="relative shrink-0">
                <img
                  src={session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-red-500 shrink-0 group-hover/host:scale-105 transition-transform"
                  alt=""
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-black" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-white text-[11px] font-black tracking-tight truncate max-w-[70px] sm:max-w-[110px] group-hover/host:underline">
                    {session.broadcasterName}
                  </span>
                  {isHost && (
                    <span className="bg-amber-500/30 text-amber-300 text-[7px] font-black px-1 rounded border border-amber-400/40 shrink-0">
                      HOST
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 text-[9px] text-slate-300">
                  <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[60px] sm:max-w-[80px]">{session.location || 'هەولێر'}</span>
                </div>
              </div>
            </div>

            {!isHost && (
              <button
                type="button"
                onClick={handleToggleFollow}
                className={clsx(
                  "ml-0.5 px-2 py-0.5 rounded-full text-[9px] font-black transition-all flex items-center gap-0.5 cursor-pointer shrink-0 border active:scale-95 shadow-md",
                  isFollowing 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30" 
                    : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-white/20 shadow-red-600/30"
                )}
                title={isFollowing ? (isKu ? 'شوێنکەوتووی' : 'Following') : (isKu ? 'شوێنکەوتن' : 'Follow')}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    <span>{isKu ? '✓' : '✓'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-2.5 h-2.5 text-white" />
                    <span>{isKu ? 'شوێنکەوتن' : 'Follow'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Live Counters & Owner Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canManageStream && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteStream) {
                  onDeleteStream(session);
                } else if (onClose) {
                  onClose();
                }
              }}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1 border border-white/30 shadow-lg cursor-pointer active:scale-90 transition-transform"
              title={isKu ? 'سڕینەوەی پەخش' : 'Delete Stream'}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">{isKu ? 'سڕینەوە' : 'Delete'}</span>
            </button>
          )}

          {session.isReplay ? (
            <span className="flex items-center gap-1 bg-purple-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-lg shadow-purple-600/40 border border-purple-400/50">
              <Film className="w-2.5 h-2.5" />
              REPLAY
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse shadow-lg shadow-red-600/40">
              <Radio className="w-2.5 h-2.5" />
              LIVE
            </span>
          )}

          <span className="bg-black/60 backdrop-blur-xl border border-white/15 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Users className="w-2.5 h-2.5 text-red-400" />
            <span>{viewerCount}</span>
          </span>
        </div>
      </div>

      {/* Real-time Purchase Toast Notification Banner Overlay */}
      <AnimatePresence>
        {livePurchaseAlert && (
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.9 }}
            className="absolute top-16 left-3 right-3 z-[40] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-2.5 rounded-2xl border-2 border-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.6)] flex items-center gap-2.5 backdrop-blur-xl"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-yellow-300 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black leading-tight truncate">
                🎉 {livePurchaseAlert.buyerName} ({livePurchaseAlert.city}) {isKu ? 'ئێستا ئەم کاڵایەی کڕی:' : 'just bought:'}
              </p>
              <p className="text-[10px] font-bold text-emerald-100 truncate mt-0.5">
                {livePurchaseAlert.itemTitle}
              </p>
            </div>
            <span className="text-[9px] bg-white text-emerald-900 font-black px-2 py-0.5 rounded-full shrink-0 shadow">
              {isKu ? 'کڕینی ڕاستەوخۆ' : 'Live Order'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Interactive Area */}
      <div className="relative z-20 p-3.5 sm:p-4 space-y-2.5">
        {/* Stream Title */}
        <p className="text-xs font-extrabold text-white line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {session.title || (isKu ? 'پەخشی ڕاستەوخۆ' : 'Live Broadcast')}
        </p>

        {/* ULTRA-COMPACT FLOATING PINNED PRODUCT CARD AT BOTTOM LEFT (NON-INTRUSIVE, TIKTOK/DOUYIN STYLE) */}
        {showcaseProducts.length > 0 && (
          <div className="w-full max-w-[280px] sm:max-w-[320px] bg-slate-950/90 backdrop-blur-2xl border border-red-500/50 rounded-2xl p-1.5 shadow-2xl relative overflow-hidden transition-all my-1 flex items-center justify-between gap-2">
            {/* Primary Pinned Product Detail - CLICKABLE TO OPEN BOTTOM SHEET */}
            <button
              type="button"
              onClick={() => {
                setBottomSheetProduct(showcaseProducts[0]);
                setShowProductBottomSheet(true);
              }}
              className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
            >
              {/* Product Thumbnail */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-white/20 shrink-0 relative bg-slate-900 shadow group-hover:scale-105 transition-transform">
                <img src={showcaseProducts[0].imageUrl} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-0 left-0 bg-red-600 text-white text-[7px] font-black px-1 rounded-br">
                  LIVE
                </span>
              </div>

              {/* Title & Red Price Badge */}
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black text-white truncate drop-shadow group-hover:text-red-400 transition-colors">
                  {showcaseProducts[0].title}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[11px] px-2 py-0.5 rounded-md border border-red-400/80 shadow-md shadow-red-600/30 flex items-center gap-0.5 shrink-0">
                    <span>{Number(showcaseProducts[0].price).toLocaleString()}</span>
                    <span className="text-[9px] font-black opacity-90">{isKu ? 'د.ع' : 'IQD'}</span>
                  </div>
                  <span className="text-[9px] text-amber-300 font-extrabold flex items-center gap-0.5">
                    <Info className="w-3 h-3" />
                    <span>{isKu ? 'وردەکاری' : 'Details'}</span>
                  </span>
                </div>
              </div>
            </button>

            {/* Quick Action Icon Triggers & Fast Order Buy Button */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Catalog Icon Button (NO TEXT HEADER, ONLY ICON) */}
              <button
                type="button"
                onClick={() => setShowCatalogDrawer(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-amber-500/40 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                title={isKu ? 'کەتەلۆگی کاڵاکان' : 'Product Catalog'}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              </button>

              {/* Fast Buy Button */}
              <button
                type="button"
                onClick={() => {
                  setBottomSheetProduct(showcaseProducts[0]);
                  setShowProductBottomSheet(true);
                }}
                className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10px] rounded-xl shadow flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <ShoppingBag className="w-3 h-3" />
                <span>{isKu ? 'کڕین' : 'Buy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Chat & Side Floating Action Controls */}
        <div className="flex items-end justify-between gap-3">
          {/* Left Column: Live Floating Chat & Comment Input */}
          <div className="flex-1 max-w-[75%] space-y-2">
            <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar pr-1">
              {liveComments.slice(-3).map((c) => (
                <div 
                  key={c.id} 
                  className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1 text-xs text-white flex items-start gap-2 shadow-lg"
                >
                  <span className="font-extrabold text-red-400 shrink-0">{c.userName}:</span>
                  <span className="text-slate-200 break-words line-clamp-2">{c.text}</span>
                </div>
              ))}
            </div>

            {/* Inline Comment Input Bar */}
            <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1" dir="ltr">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={isKu ? 'کۆمێنتێک بۆ فرۆشیار بنووسە...' : 'Write a comment...'}
                dir={isKu ? 'rtl' : 'ltr'}
                className="flex-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xl"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-xs rounded-2xl disabled:opacity-40 transition-all cursor-pointer shadow-lg shrink-0 flex items-center gap-1"
              >
                <span>{isKu ? 'ناردن' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Right Column: Floating TikTok Action Icons */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            {/* WhatsApp Direct Seller Inquiry Button */}
            <button
              onClick={() => openWhatsApp()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 backdrop-blur-md rounded-full text-white border border-emerald-400/50 transition-all cursor-pointer shadow-xl flex flex-col items-center active:scale-95"
              title={isKu ? 'پەیوەندی بەواتسئاپ' : 'WhatsApp Seller'}
            >
              <MessageCircle className="w-4 h-4 fill-white" />
            </button>

            {/* Phone Direct Call Button */}
            <a
              href={`tel:${sellerPhone}`}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 backdrop-blur-md rounded-full text-white border border-blue-400/50 transition-all cursor-pointer shadow-xl flex flex-col items-center active:scale-95"
              title={isKu ? 'پەیوەندی تەلەفۆنی' : 'Call Seller'}
            >
              <Phone className="w-4 h-4" />
            </a>

            {/* Sound Toggle Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/20 transition-all cursor-pointer shadow-xl flex flex-col items-center"
              title={isMuted ? (isKu ? 'دەنگ چالاک بکە' : 'Unmute') : (isKu ? 'بێدەنگکردن' : 'Mute')}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Like Button */}
            <button
              onClick={handleLike}
              className={clsx(
                "p-2.5 backdrop-blur-md rounded-full border transition-all cursor-pointer shadow-xl flex flex-col items-center",
                isLiked 
                  ? "bg-red-600 text-white border-red-500 scale-110" 
                  : "bg-black/60 hover:bg-black/80 text-white border-white/20"
              )}
            >
              <Heart className={clsx("w-4 h-4", isLiked && "fill-white")} />
              <span className="text-[9px] font-bold mt-0.5">{likesCount}</span>
            </button>

            {/* Gift Trigger Button */}
            <button
              onClick={() => triggerGift('🎁')}
              className="p-2.5 bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-full border border-yellow-300 transition-all cursor-pointer shadow-xl"
              title={isKu ? 'دیاری' : 'Gift'}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Flag / Report Stream Button */}
            <button
              onClick={() => {
                if (!user) {
                  onRequireAuth();
                  return;
                }
                setShowReportModal(true);
              }}
              className="p-2.5 bg-black/60 hover:bg-rose-950/80 backdrop-blur-md rounded-full text-slate-300 hover:text-rose-400 border border-white/20 hover:border-rose-500/50 transition-all cursor-pointer shadow-xl flex flex-col items-center active:scale-95"
              title={isKu ? 'ڕاپۆرتکردنی پەخش' : i18n.language === 'ar' ? 'الإبلاغ عن البث' : 'Report / Flag Stream'}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scroll Hint if more streams exist */}
        {totalCount > 1 && index < totalCount - 1 && (
          <div className="pt-0.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400/80 font-bold animate-bounce">
            <ScrollDownIcon className="w-3 h-3 text-red-400" />
            <span>{isKu ? 'سکرۆڵ بکه بۆ پەخشی دواتر ↕' : 'Scroll down for next live broadcast ↕'}</span>
          </div>
        )}
      </div>

      {/* Broadcaster Set / Edit Price Modal */}
      <AnimatePresence>
        {showEditPriceModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[260] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 text-white shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm">
                  <Tag className="w-4 h-4 text-red-500" />
                  <h3>{isKu ? '🏷️ دیاریکردنی نرخی کاڵا بۆ پەخش' : 'Set Live Product Price'}</h3>
                </div>
                <button 
                  onClick={() => setShowEditPriceModal(false)}
                  className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePriceUpdate} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 mb-1">
                    {isKu ? 'ناوی کاڵا' : 'Product Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitleInput}
                    onChange={(e) => setEditTitleInput(e.target.value)}
                    placeholder={isKu ? 'ناوی کاڵاکەت بنووسە...' : 'Product title...'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 mb-1">
                    {isKu ? 'نرخ بە دیناری عێراقی (IQD)' : 'Price in IQD'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      min="0"
                      step="500"
                      value={editPriceInput}
                      onChange={(e) => setEditPriceInput(e.target.value)}
                      placeholder="25000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-16 py-2 text-xs text-white font-mono font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <span className="absolute right-3 text-xs font-black text-red-400">IQD / د.ع</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 mb-1">
                    {isKu ? 'بەستەری وێنەی کاڵا (ئارەزوومەندانە)' : 'Image URL (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={editImageInput}
                    onChange={(e) => setEditImageInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditPriceModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    {isKu ? 'پەشیمانبوونەوە' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black rounded-xl text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isKu ? 'پاشەکەوتکردن' : 'Save'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewer Fast Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[260] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 text-white shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <h3>{isKu ? '🛍️ کڕینی دەستبەجێ لە پەخشەوە' : 'Direct Live Order'}</h3>
                </div>
                <button 
                  onClick={() => setShowOrderModal(false)}
                  className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {orderSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="text-base font-black text-white">
                    {isKu ? 'داواکاریەکەت بە سەرکەوتوویی تۆمارکرا!' : 'Order Placed Successfully!'}
                  </h4>
                  <p className="text-xs text-slate-300">
                    {isKu ? 'فرۆشیار زووترین کات پەیوەندیت پێوە دەکات بۆ گەیاندنی کاڵاکەت.' : 'The seller will contact you shortly to confirm delivery.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  openWhatsApp(orderTargetProduct?.title || featuredTitle, (orderTargetProduct?.price || featuredPrice) * orderQuantity, orderTargetProduct?.imageUrl || featuredImage); 
                  setShowOrderModal(false); 
                }} className="space-y-3">
                  {/* Target Product Summary Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
                    <img 
                      src={orderTargetProduct?.imageUrl || featuredImage} 
                      alt="" 
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0" 
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-white truncate">
                        {orderTargetProduct?.title || featuredTitle}
                      </h4>
                      <p className="text-xs font-black text-red-400 mt-0.5">
                        {((orderTargetProduct?.price || featuredPrice) * orderQuantity).toLocaleString()} IQD
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      {isKu ? 'داخستن' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{isKu ? 'بکڕە' : 'Buy'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Showcase Product Catalog Drawer (لیستی کاڵاکانی پەخش) */}
      <AnimatePresence>
        {showCatalogDrawer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[260] flex items-end justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white shadow-2xl relative space-y-4 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <h3>{isKu ? '🛍️ کەتەلۆگی کاڵاکانی ئەم پەخشە' : 'Live Showcase Catalog'}</h3>
                </div>
                <button 
                  onClick={() => setShowCatalogDrawer(false)}
                  className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 shrink-0">
                {isKu ? 'هەموو ئەو بەرهەمانەی کە لەم پەخشەدا نیشان دەدرێن. دەتوانیت دەستبەجێ داوا بکەیت.' : 'All items showcased in this live broadcast. Order directly below.'}
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                {showcaseProducts.map((prod, idx) => (
                  <div key={`${prod.id || 'prod'}-${idx}`} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
                    <img src={prod.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-800 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-white truncate">{prod.title}</h4>
                      {prod.description && <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{prod.description}</p>}
                      <div className="text-xs font-black text-red-400 mt-1">
                        {prod.price.toLocaleString()} IQD
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setShowCatalogDrawer(false);
                          setOrderTargetProduct(prod);
                          setShowOrderModal(true);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-[11px] rounded-xl shadow flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isKu ? 'کڕین' : 'Buy'}</span>
                      </button>
                      <button
                        onClick={() => openWhatsApp(prod.title, prod.price, prod.imageUrl)}
                        className="px-3 py-1.5 bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] rounded-xl flex items-center gap-1 hover:bg-emerald-900 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pre-WhatsApp Order & Invoice Review Modal */}
      <AnimatePresence>
        {showWaReviewModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-5 text-white shadow-[0_0_50px_rgba(16,185,129,0.3)] relative space-y-4 my-auto"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {isKu ? 'پێداچوونەوەی داواکاری وەتسئەپ' : 'WhatsApp Order Review'}
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      {isKu ? 'پشکنین پێش ناردنی ڕاستەوخۆ' : 'Verify details before dispatch'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWaReviewModal(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Order Metadata Tag: Code & DateTime */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-black">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{waOrderCode}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{waOrderDate}</span>
                </div>
              </div>

              {/* Product Preview & Quantity */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
                <img
                  src={waProductImage}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white truncate">{waProductTitle}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400">
                      {waProductPrice.toLocaleString()} IQD
                    </span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-800">
                      x{waQuantity}
                    </span>
                  </div>
                  <p className="text-xs font-black text-emerald-400 mt-1">
                    {isKu ? 'کۆی گشتی:' : 'Total:'} {(waProductPrice * waQuantity).toLocaleString()} IQD
                  </p>
                </div>
                {/* Quantity Buttons */}
                <div className="flex flex-col items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setWaQuantity(waQuantity + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    +
                  </button>
                  <span className="text-xs font-black text-white">{waQuantity}</span>
                  <button
                    onClick={() => setWaQuantity(Math.max(1, waQuantity - 1))}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    -
                  </button>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="space-y-3 max-h-[35vh] overflow-y-auto no-scrollbar pr-1">
                {/* Buyer Information Section */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 border-b border-slate-800/80 pb-1.5">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{isKu ? 'زانیاری و لۆکەیشنی کڕیار (Buyer)' : 'Buyer & Delivery Location'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        {isKu ? 'ناوی کڕیار' : 'Buyer Name'}
                      </label>
                      <input
                        type="text"
                        value={waBuyerName}
                        onChange={(e) => setWaBuyerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        {isKu ? 'ژمارەی مۆبایل *' : 'Phone Number *'}
                      </label>
                      <input
                        type="tel"
                        value={waBuyerPhone}
                        onChange={(e) => setWaBuyerPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        {isKu ? 'شار' : 'City'}
                      </label>
                      <select
                        value={waBuyerCity}
                        onChange={(e) => setWaBuyerCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {IRAQ_CITIES.map(c => (
                          <option key={c.id} value={isKu ? c.ku : c.en}>
                            {isKu ? c.ku : c.en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                        {isKu ? 'ئەدرێس و گەڕەک *' : 'Address *'}
                      </label>
                      <input
                        type="text"
                        value={waBuyerAddress}
                        onChange={(e) => setWaBuyerAddress(e.target.value)}
                        placeholder={isKu ? 'گەڕەکی شۆڕش - کۆڵانی ١٢' : 'Neighborhood & Street'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {isKu ? 'لۆکەیشن / نەخشە' : 'GPS Location / Landmark'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={waBuyerGps}
                      onChange={(e) => setWaBuyerGps(e.target.value)}
                      placeholder={isKu ? 'هەولێر - شۆڕش (نزیک مزگەوتی گەورە)' : 'City, landmark or GPS pin'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Seller Information Section */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-rose-400 border-b border-slate-800/80 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      {isKu ? 'زانیاری و ئەدرێسی فرۆشیار (Seller)' : 'Seller Store Info'}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
                      {waSellerCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">{isKu ? 'ناوی فرۆشگا:' : 'Store Name:'}</span>
                      <span className="font-bold text-slate-200 truncate block">{waSellerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">{isKu ? 'مۆبایلی فرۆشیار:' : 'Phone:'}</span>
                      <span className="font-mono text-emerald-400 font-bold block">{waSellerPhone}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">{isKu ? 'ئەدرێسی فرۆشیار:' : 'Seller Address:'}</span>
                    <span className="text-xs font-bold text-slate-300 block">{waSellerAddress}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!waBuyerPhone.trim()) {
                      alert(isKu ? 'تکایە ژمارەی مۆبایلی کڕیار بنووسە' : 'Please specify buyer phone number');
                      return;
                    }
                    const now = new Date();
                    const orderDate = now.toLocaleDateString('en-GB');
                    const orderTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const totalPrice = waProductPrice * waQuantity;

                    try {
                      await db.addToBasket(user?.id || 'guest', {
                        id: `live_${Date.now()}`,
                        userId: session.broadcasterId,
                        userName: session.broadcasterName,
                        title: waProductTitle,
                        description: `کۆدی داواکاری لە سیستەم: ${waOrderCode} | بەروار: ${orderDate} - کات: ${orderTime} | ئەدرێس: ${waBuyerAddress}`,
                        price: totalPrice,
                        imageUrl: waProductImage,
                        category: 'live',
                        postType: 'marketplace',
                        createdAt: Date.now(),
                        sellerId: session.broadcasterId,
                        sellerPhone: waSellerPhone
                      });

                      setLivePurchaseAlert({
                        buyerName: waBuyerName,
                        city: waBuyerCity,
                        itemTitle: waProductTitle
                      });
                      setTimeout(() => setLivePurchaseAlert(null), 5000);

                      setInstantOrderResult({
                        orderCode: waOrderCode,
                        orderDate,
                        orderTime,
                        buyerName: waBuyerName,
                        buyerPhone: waBuyerPhone,
                        buyerCity: waBuyerCity,
                        buyerAddress: waBuyerAddress,
                        itemTitle: waProductTitle,
                        itemPrice: totalPrice,
                        itemImage: waProductImage,
                        size: selectedSize || 'Standard',
                        color: selectedColor || 'Default'
                      });

                      setShowWaReviewModal(false);
                      setShowOrderModal(false);
                    } catch (err) {
                      console.error("Order completion failed:", err);
                    }
                  }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm rounded-2xl border-2 border-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-5 h-5 text-white" />
                  <span>{isKu ? 'تەواوکردنی کڕین لە پلاتفۆرم 📦' : 'Complete Platform Purchase 📦'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWaReviewModal(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {isKu ? 'پەشیمانبوونەوە' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Product Details Bottom Sheet Modal */}
      <AnimatePresence>
        {showProductBottomSheet && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[280] flex items-end justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col overflow-y-auto no-scrollbar"
            >
              {/* Bottom Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm">
                  <ShoppingBag className="w-5 h-5 text-red-500" />
                  <h3>{isKu ? 'وردەکاری کاڵای پەخش' : 'Live Product Details'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductBottomSheet(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product Summary */}
              {bottomSheetProduct && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <img
                      src={bottomSheetProduct.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0 shadow"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-black text-white">{bottomSheetProduct.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {bottomSheetProduct.description || (isKu ? 'پۆشاکی نایاب و ئۆرجیناڵی تورکی' : 'Premium item')}
                      </p>
                      <div className="text-sm font-black text-red-400 mt-1">
                        {bottomSheetProduct.price.toLocaleString()} IQD / د.ع
                      </div>
                    </div>
                  </div>

                  {/* Size Picker */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 mb-1.5">
                      {isKu ? 'سایز هەڵبژێرە:' : 'Select Size:'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(bottomSheetProduct.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={clsx(
                            "px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer",
                            selectedSize === sz
                              ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/30 scale-105"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                          )}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 mb-1.5">
                      {isKu ? 'ڕەنگ هەڵبژێرە:' : 'Select Color:'}
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {COMMON_COLORS.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          title={isKu ? c.ku : c.name}
                          className={clsx(
                            "w-7 h-7 rounded-full transition-all border-2 cursor-pointer relative shadow",
                            selectedColor === c.hex
                              ? "ring-2 ring-red-500 ring-offset-2 ring-offset-slate-900 border-white scale-110"
                              : "border-slate-700 opacity-80 hover:opacity-100"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Quick Specs / Bullet Points */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                    <p className="font-extrabold text-slate-200 text-[11px] mb-1">
                      {isKu ? 'سیفەتە سەرەکییەکان:' : 'Key Specifications:'}
                    </p>
                    {(bottomSheetProduct.specs || [
                      isKu ? '• 100% قوماشی ئۆرجیناڵی تورکی' : '• 100% Authentic Turkish material',
                      isKu ? '• بێ وشکبوونەوە و ڕەنگ گۆڕین دوای ششتن' : '• Colorfast and shrink-resistant',
                      isKu ? '• گەرەنتی ١٠٠٪ی بەدەستگەیشتن' : '• 100% satisfaction guarantee'
                    ]).map((sp, idx) => (
                      <p key={idx} className="text-[11px] text-slate-300 leading-relaxed">{sp}</p>
                    ))}
                  </div>

                  {/* Shipping Cost & Delivery ETA Info Box */}
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 space-y-1">
                    <div className="flex items-center gap-2 font-extrabold text-emerald-400">
                      <Truck className="w-4 h-4 shrink-0" />
                      <span>{isKu ? 'تێچووی گەیاندن و کاتی گەیشتن:' : 'Shipping & Delivery ETA:'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {isKu ? '🚚 گەیاندن بۆ هەولێر ٤,٠٠٠ د.ع • شارەکانی تر ٥,٠٠٠ د.ع' : '🚚 Shipping Erbil: 4,000 IQD • Other cities: 5,000 IQD'}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-400">
                      {isKu ? '⏱️ گەیاندنی خێرا لەماوەی ۲٤ کاتژمێردا' : '⏱️ Express delivery within 24 hours'}
                    </p>
                  </div>

                  {/* Action Buttons - 1-Click Fast Instant Order */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleInstantBuy(bottomSheetProduct)}
                      className="w-full py-4 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm rounded-2xl shadow-[0_10px_30px_rgba(239,68,68,0.5)] border-2 border-red-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 animate-pulse"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      <span>{isKu ? '⚡ بکڕە (کڕینی خێرا لە پرۆفایلەوە)' : '⚡ Fast 1-Click Buy'}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400">
                      {isKu ? '🔒 ناو، ئەدرێس و لۆکەیشن ڕاستەوخۆ لە پرۆفایلەکەت وەرگیراوە' : '🔒 Address and location auto-retrieved from profile'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instant Order Success Receipt Modal */}
      <AnimatePresence>
        {instantOrderResult && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[350] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-emerald-500 rounded-3xl p-5 text-white shadow-[0_0_60px_rgba(16,185,129,0.4)] relative space-y-4"
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-base font-black text-white pt-1">
                  {isKu ? '🎉 داواکاریەکەت بە سەرکەوتوویی تۆمارکرا!' : '🎉 Order Placed Successfully!'}
                </h3>
                <p className="text-[11px] text-emerald-400 font-bold">
                  {isKu ? 'نێردرا بۆ فرۆشیار و سیستەم' : 'Dispatched to seller & system'}
                </p>
              </div>

              {/* Order Metadata Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-bold">{isKu ? 'کۆدی داواکاری:' : 'Order Code:'}</span>
                  <span className="font-mono font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded-md border border-amber-800">
                    {instantOrderResult.orderCode}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-bold">{isKu ? 'کاتی داواکاری:' : 'Timestamp:'}</span>
                  <span className="font-bold text-slate-200">
                    {instantOrderResult.orderDate} • {instantOrderResult.orderTime}
                  </span>
                </div>

                <div className="border-b border-slate-800 pb-2 space-y-1">
                  <span className="text-slate-400 font-bold block">{isKu ? 'کاڵای هەڵبژێردراو:' : 'Purchased Item:'}</span>
                  <div className="flex items-center gap-2">
                    <img src={instantOrderResult.itemImage} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <p className="font-black text-white text-[11px] truncate max-w-[180px]">{instantOrderResult.itemTitle}</p>
                      <p className="text-[10px] text-slate-400">
                        {isKu ? `سایز: ${instantOrderResult.size}` : `Size: ${instantOrderResult.size}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-800 pb-2 space-y-1">
                  <span className="text-slate-400 font-bold block">{isKu ? 'ئەدرێسی گەیاندن (لە پرۆفایلەوە):' : 'Delivery Address (From Profile):'}</span>
                  <p className="font-bold text-emerald-300 text-[11px]">{instantOrderResult.buyerAddress}</p>
                  <p className="text-[10px] font-mono text-slate-400">📱 {instantOrderResult.buyerPhone}</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300 font-black">{isKu ? 'کۆی گشتی:' : 'Total Amount:'}</span>
                  <span className="text-sm font-black text-emerald-400">
                    {instantOrderResult.itemPrice.toLocaleString()} IQD / د.ع
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setInstantOrderResult(null)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg border border-emerald-400 transition-all cursor-pointer active:scale-95"
              >
                {isKu ? 'باشە، بەردەوام بە' : 'Done, Continue'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Host Pin Item Control Drawer Modal */}
      <AnimatePresence>
        {showHostPinDrawer && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[280] flex items-end justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 text-white shadow-2xl relative space-y-4 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-yellow-400 font-extrabold text-sm">
                  <Pin className="w-5 h-5 text-yellow-400" />
                  <h3>{isKu ? '📌 هەڵبژاردنی کاڵا بۆ پەخشی ڕاستەوخۆ' : 'Pin Item For Live Broadcast'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHostPinDrawer(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 shrink-0">
                {isKu ? 'کلیک لەسەر هەر کاڵایەک بکە بۆ ئەوەی دەستبەجێ وەک "اعلان" لای هەموو بینەران دەربکەوێت:' : 'Tap any product to pin it live for all viewers:'}
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                {showcaseProducts.map((p, idx) => (
                  <div key={`${p.id || 'prod'}-${idx}`} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow">
                    <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-white truncate">{p.title}</h4>
                      <p className="text-xs font-black text-yellow-400 mt-0.5">{p.price.toLocaleString()} IQD</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePinProduct(p)}
                      className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
                    >
                      <Pin className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{isKu ? 'اعلان بکە' : 'Pin Live'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flag / Report Live Stream Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[360] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 text-white shadow-2xl relative space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <h3>{isKu ? '🚩 ڕاپۆرتکردنی ئەم پەخشە' : i18n.language === 'ar' ? '🚩 الإبلاغ عن هذا البث' : '🚩 Report Live Stream'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportSubmitted(false);
                  }}
                  className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportSubmitted ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-400/40">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-white">
                    {isKu ? 'سوپاس بۆ هاوکاریت!' : i18n.language === 'ar' ? 'شكراً لتعاونك!' : 'Thank you for reporting!'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isKu ? 'ڕاپۆرتەکەت بە سەرکەوتوویی نێردرا بۆ تیمی بەڕێوەبەرایەتی.' : i18n.language === 'ar' ? 'تم استلام تقريرك وسيتم مراجعته من قبل الإدارة.' : 'Your report has been submitted for review.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendReport} className="space-y-3.5">
                  <p className="text-xs text-slate-300">
                    {isKu ? 'تکایە هۆکاری ڕاپۆرتکردن دیاری بکە:' : i18n.language === 'ar' ? 'يرجى تحديد سبب الإبلاغ:' : 'Please select the reason for reporting:'}
                  </p>

                  <div className="space-y-2">
                    {[
                      { id: 'fraud', ku: 'فێڵکردن، نرخی ساختە یان کاڵای تەقلید', ar: 'احتيال أو سعر مضلل أو منتج مقلد', en: 'Fraud, misleading price or fake item' },
                      { id: 'inappropriate', ku: 'قسە، ڤیدیۆ یان ڕەفتاری نەشیاو', ar: 'محتوى غير لائق أو سلوك مسيء', en: 'Inappropriate language or behavior' },
                      { id: 'prohibited', ku: 'کاڵای قەدەغەکراو یان نایاسایی', ar: 'منتجات محظورة أو غير قانونية', en: 'Prohibited or illegal items' },
                      { id: 'spam', ku: 'سپام یان پەخشی بێزارکەر', ar: 'إزعاج أو بث متكرر (سبام)', en: 'Spam or harassing broadcast' },
                      { id: 'other', ku: 'هۆکاری تر', ar: 'سبب آخر', en: 'Other reason' }
                    ].map((reason) => (
                      <label
                        key={reason.id}
                        onClick={() => setReportReason(reason.id)}
                        className={clsx(
                          "w-full p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all",
                          reportReason === reason.id
                            ? "bg-rose-950/40 border-rose-500/60 text-white font-bold"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                        )}
                      >
                        <span>{isKu ? reason.ku : i18n.language === 'ar' ? reason.ar : reason.en}</span>
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason.id}
                          checked={reportReason === reason.id}
                          onChange={() => setReportReason(reason.id)}
                          className="accent-rose-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {isKu ? 'ڕوونکردنەوەی زیاتر (ئارەزوومەندانە):' : i18n.language === 'ar' ? 'تفاصيل إضافية (اختياري):' : 'Additional details (optional):'}
                    </label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={2}
                      placeholder={isKu ? 'تێبینی بنووسە...' : 'Write notes...'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      {isKu ? 'ناردنی ڕاپۆرت' : i18n.language === 'ar' ? 'إرسال البلاغ' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LiveStreamsFeed({
  user,
  theme,
  onRequireAuth,
  onStartOwnLive,
  onBack,
  onOpenLiveSession,
  onOpenSellerProfile
}: LiveStreamsFeedProps) {
  const { i18n } = useTranslation();
  const [realLiveSessions, setRealLiveSessions] = useState<LiveSession[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCityModal, setShowCityModal] = useState<boolean>(false);
  const [citySearchFilter, setCitySearchFilter] = useState<string>('');
  const [feedTab, setFeedTab] = useState<'live'>('live');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fullscreenStream, setFullscreenStream] = useState<(LiveSession & { products?: ShowcaseProduct[]; sellerPhone?: string }) | null>(null);
  const [reportingSession, setReportingSession] = useState<LiveSession | null>(null);
  const [gridReportReason, setGridReportReason] = useState<string>('fraud');
  const [gridReportDetails, setGridReportDetails] = useState<string>('');
  const [gridReportSubmitted, setGridReportSubmitted] = useState<boolean>(false);
  const [streamToDelete, setStreamToDelete] = useState<LiveSession | null>(null);
  const [isDeletingStream, setIsDeletingStream] = useState<boolean>(false);

  // Subscribe to real live sessions from Firestore
  useEffect(() => {
    const unsub = db.onLiveSessionsChange((sessions) => {
      setRealLiveSessions(sessions);
    });
    return () => unsub();
  }, []);

  // Active live sessions from Firestore strictly (no demos or test samples)
  const rawSessions = realLiveSessions.filter(s => {
    if (s.expiresAt && Date.now() > s.expiresAt) return false;
    if (s.status === 'ended' || s.isReplay) return false;
    const sId = (s.id || '').toLowerCase();
    const bId = (s.broadcasterId || '').toLowerCase();
    if ((s as any).isDemo || sId.startsWith('demo-') || sId.startsWith('sample-') || bId.startsWith('demo-') || bId.startsWith('sample-')) return false;
    return true;
  });

  const liveCount = rawSessions.length;

  // Rank live streams using the AI & Engagement Recommendation Algorithm
  const allSessions = rankLiveSessions(rawSessions, selectedCity);

  const getCityLabel = (cityObj: typeof IRAQ_CITIES[0]) => {
    if (i18n.language === 'ku') return cityObj.ku;
    if (i18n.language === 'ar') return cityObj.ar;
    return cityObj.en;
  };

  const filteredCitiesList = IRAQ_CITIES.filter((c) => {
    if (!citySearchFilter) return true;
    const term = citySearchFilter.toLowerCase().trim();
    return (
      c.en.toLowerCase().includes(term) ||
      c.ku.toLowerCase().includes(term) ||
      c.ar.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  });

  // Filter sessions seamlessly by city, search query, and feed tab (Live vs Replay)
  const filteredSessions = allSessions.filter((session) => {
    const isReplaySession = Boolean((session as any).isReplay || session.status === 'ended');
    if (feedTab === 'live' && isReplaySession) return false;
    if (feedTab === 'replay' && !isReplaySession) return false;

    const normQ = normalizeStr(searchQuery);
    const normLoc = normalizeStr(session.location || '');
    const normName = normalizeStr(session.broadcasterName || '');
    const normTitle = normalizeStr(session.title || '');

    let matchesCity = selectedCity === 'All';
    if (!matchesCity) {
      const targetObj = IRAQ_CITIES.find(
        c => c.id === selectedCity || c.ku === selectedCity || c.en === selectedCity || c.ar === selectedCity
      );
      if (targetObj) {
        const normKu = normalizeStr(targetObj.ku);
        const normAr = normalizeStr(targetObj.ar);
        const normEn = normalizeStr(targetObj.en);
        const normId = normalizeStr(targetObj.id);
        matchesCity = normLoc.includes(normKu) || normLoc.includes(normAr) || normLoc.includes(normEn) || normLoc.includes(normId);
      } else {
        matchesCity = normLoc.includes(normalizeStr(selectedCity));
      }
    }

    let matchesSearch = true;
    if (normQ) {
      matchesSearch = normName.includes(normQ) || normTitle.includes(normQ) || normLoc.includes(normQ);
    }

    return matchesCity && matchesSearch;
  });

  const isKu = i18n.language === 'ku';

  return (
    <div className="w-full flex flex-col h-full max-h-[calc(100vh-80px)] space-y-2 pb-12 overflow-hidden">
      {/* Feed Filter & Live/Replay Toggle Bar - Clean Responsive 2-Row Layout */}
      <div className="p-2.5 rounded-2xl border border-slate-200 shadow-sm bg-white text-slate-900 transition-all shrink-0 space-y-2 w-full">
        {/* Row 1: Back + Tabs + List/Grid Switcher + City Selector */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1.5 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm shrink-0 active:scale-95"
                title={isKu ? 'گەڕانەوە' : i18n.language === 'ar' ? 'رجوع' : 'Go Back'}
                aria-label={isKu ? 'گەڕانەوە' : i18n.language === 'ar' ? 'رجوع' : 'Go Back'}
              >
                <ArrowRight className="w-3.5 h-3.5 text-white rtl:rotate-0 ltr:rotate-180" />
              </button>
            )}

            {/* Live Stream Badge Indicator */}
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 sm:px-3 py-1.5 rounded-xl text-red-600 font-black text-xs shadow-sm shrink-0">
              <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span className="hidden xs:inline">{isKu ? 'ڕاستەوخۆ' : i18n.language === 'ar' ? 'مباشر' : 'Live'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-600 text-white font-bold">
                {liveCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* List vs Grid View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-xs font-extrabold cursor-pointer",
                  viewMode === 'grid' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
                title={isKu ? 'تۆڕ / گرید' : i18n.language === 'ar' ? 'شبكة' : 'Grid View'}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isKu ? 'گرید' : i18n.language === 'ar' ? 'شبكة' : 'Grid'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={clsx(
                  "px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-xs font-extrabold cursor-pointer",
                  viewMode === 'list' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
                title={isKu ? 'لیست' : i18n.language === 'ar' ? 'قائمة' : 'List View'}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isKu ? 'لیست' : i18n.language === 'ar' ? 'قائمة' : 'List'}</span>
              </button>
            </div>

            {/* City Selection Trigger */}
            <button
              type="button"
              onClick={() => setShowCityModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold py-1 px-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate max-w-[70px] sm:max-w-[110px]">
                {selectedCity === 'All'
                  ? (isKu ? 'شارەکان' : i18n.language === 'ar' ? 'المدن' : 'Cities')
                  : (getCityLabel(IRAQ_CITIES.find(c => c.id === selectedCity) || { id: selectedCity, en: selectedCity, ku: selectedCity, ar: selectedCity }))
                }
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-black font-mono shrink-0 border border-red-200">
                {filteredSessions.length}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
          </div>
        </div>

        {/* Row 2: Full-Width Search Input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isKu ? 'گەڕان لە پەخشەکاندا...' : i18n.language === 'ar' ? 'البحث في البث المباشر...' : 'Search live streams...'}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Stream Feed or Clean Light Empty State */}
      {filteredSessions.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-white border border-slate-200 rounded-3xl shadow-lg space-y-4 my-auto max-w-md mx-auto">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center mx-auto text-red-600 shadow-sm">
            <Radio className="w-8 h-8 animate-pulse text-red-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              {isKu ? 'هیچ پەخشێکی ڕاستەوخۆ لەم کاتەدا چالاک نییە' : i18n.language === 'ar' ? 'لا يوجد بث مباشر نشط حالياً' : 'No active live streams right now'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isKu ? 'تۆ یەکەم کەس بە کە کالا و بەرهەمەکانت ڕاستەوخۆ بۆ کڕیاران بە پەخش پێشاندەدەیت' : i18n.language === 'ar' ? 'كن أول من يعرض منتجاتك مباشرة لآلاف المشترين' : 'Be the first to showcase your items live to thousands of buyers'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 w-full justify-center">
            <button
              onClick={onStartOwnLive}
              className="flex-1 w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>{isKu ? '🔴 دەستپێکردنی لایڤ' : i18n.language === 'ar' ? '🔴 بدء بث مباشر' : '🔴 Start Live'}</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center border border-slate-200 shrink-0"
                title={isKu ? 'گەڕانەوە بۆ بازاڕ' : i18n.language === 'ar' ? 'الرجوع إلى المتجر' : 'Back to Shop'}
                aria-label={isKu ? 'گەڕانەوە' : 'Back'}
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180 text-slate-700" />
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW WITH 1-CLICK FULLSCREEN EXPAND */
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-130px)] p-2 sm:p-4 custom-scrollbar w-full">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
            {filteredSessions.map((session, idx) => {
              const liveViewerCount = session.viewerCount ?? (session as any).viewer_count ?? 1;
              const featTitle = session.featuredTitle || (isKu ? 'کاڵای دیاریکراو' : i18n.language === 'ar' ? 'المنتج المميز' : 'Featured Item');
              const featPrice = session.featuredPrice || 25000;
              const featImg = session.currentFrame || session.featuredImage || session.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`;
              const displayPrice = (Number(featPrice) * 1500 > 1000 ? Number(featPrice) : Number(featPrice) * 1500).toLocaleString();

              return (
                <div
                  key={`${session.id || 'grid-session'}-${idx}`}
                  onClick={() => {
                    if (onOpenLiveSession) {
                      onOpenLiveSession(session);
                    } else {
                      setFullscreenStream(session);
                    }
                  }}
                  className="group relative bg-slate-900 border border-slate-800/80 hover:border-red-500/70 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between w-full"
                >
                  {/* Thumbnail / Video Preview Box */}
                  <div className="relative w-full aspect-[3/4] bg-slate-950 overflow-hidden">
                    {/* Live stream thumbnail */}
                    <img 
                      src={featImg} 
                      alt={session.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.broadcasterId}`;
                      }}
                    />

                    {/* Gradient shade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                      {/* LIVE Pulse Badge */}
                      <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-red-600/95 backdrop-blur-md rounded-lg sm:rounded-xl text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>{isKu ? 'ڕاستەوخۆ' : i18n.language === 'ar' ? 'مباشر' : 'LIVE'}</span>
                      </div>

                      {/* Viewers, Delete & Flag Badges */}
                      <div className="flex items-center gap-1 pointer-events-auto">
                        {(session.broadcasterId === user?.id || (user?.phone && ((session as any).broadcasterPhone || session.sellerPhone) && user.phone.replace(/\D/g, '') === (((session as any).broadcasterPhone || session.sellerPhone) as string).replace(/\D/g, '')) || (user?.name && session.broadcasterName && user.name.trim().toLowerCase() === session.broadcasterName.trim().toLowerCase()) || checkIsAdmin(user)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStreamToDelete(session);
                            }}
                            className="p-1 bg-red-600/90 hover:bg-red-500 backdrop-blur-md rounded-lg text-white border border-white/20 transition-all cursor-pointer shadow active:scale-90"
                            title={isKu ? 'سڕینەوەی پەخش' : 'Delete Stream'}
                          >
                            <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </button>
                        )}
                        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-black/70 backdrop-blur-md rounded-lg text-white text-[9px] sm:text-[11px] font-bold">
                          <Users className="w-3 h-3 text-red-400" />
                          <span className="font-mono">{liveViewerCount}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              onRequireAuth();
                              return;
                            }
                            setReportingSession(session);
                          }}
                          className="p-1 bg-black/70 hover:bg-rose-950/80 backdrop-blur-md rounded-lg text-slate-300 hover:text-rose-400 border border-white/20 transition-all cursor-pointer shadow"
                          title={isKu ? 'ڕاپۆرتکردن' : i18n.language === 'ar' ? 'إبلاغ' : 'Flag / Report'}
                        >
                          <Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Quick 1-Click Fullscreen Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                      <div className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-2xl flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{isKu ? 'پڕاوپڕ' : 'Full Screen'}</span>
                      </div>
                    </div>

                    {/* Location Pin Badge */}
                    {session.location && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-slate-200 text-[8px] sm:text-[9px] font-bold">
                        <MapPin className="w-2.5 h-2.5 text-red-400" />
                        <span className="truncate max-w-[80px]">{session.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body / Details */}
                  <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2 bg-slate-900 text-left">
                    {/* Broadcaster Info */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenSellerProfile && session.broadcasterId) {
                          onOpenSellerProfile(session.broadcasterId, {
                            name: session.broadcasterName,
                            avatar: session.broadcasterAvatar,
                            location: session.location
                          });
                        }
                      }}
                      className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group/host hover:opacity-90 transition-opacity"
                      title={isKu ? 'بینینی فرۆشگای پەخشکەر' : 'View seller store'}
                    >
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-red-500/40 bg-slate-800 shrink-0 group-hover/host:scale-105 transition-transform">
                        <img 
                          src={session.broadcasterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                          alt={session.broadcasterName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-white text-[10px] sm:text-xs font-bold truncate leading-tight group-hover/host:underline">{session.broadcasterName}</h4>
                        <p className="text-slate-400 text-[9px] sm:text-[10px] truncate">{session.title}</p>
                      </div>
                    </div>

                    {/* Featured Item Snippet */}
                    <div className="p-1.5 sm:p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img src={featImg} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-800 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] sm:text-[10px] font-medium text-slate-300 truncate">{featTitle}</p>
                          <p className="text-[10px] sm:text-xs font-black text-amber-400 font-mono leading-none">{displayPrice} IQD</p>
                        </div>
                      </div>
                      <div className="p-1 sm:p-1.5 bg-red-600/20 text-red-400 rounded-lg shrink-0">
                        <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST / IMMERSIVE VERTICAL CARDS VIEW */
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-130px)] snap-y snap-mandatory py-0 px-0 no-scrollbar scroll-smooth space-y-4">
          {filteredSessions.map((session, idx) => (
            <FullVerticalStreamCard
              key={`${session.id || 'session'}-${idx}`}
              session={session}
              user={user}
              onRequireAuth={onRequireAuth}
              isKu={isKu}
              index={idx}
              totalCount={filteredSessions.length}
              isBackgrounded={Boolean(fullscreenStream)}
              onClose={onBack}
              onDeleteStream={(sess) => setStreamToDelete(sess)}
              onOpenSellerProfile={onOpenSellerProfile}
              onMinimize={() => {
                if (onOpenLiveSession) {
                  onOpenLiveSession(session);
                }
                if (onBack) {
                  onBack();
                }
              }}
            />
          ))}
        </div>
      )}

      {/* FULLSCREEN STREAM OVERLAY (1-CLICK EXPAND WITH PROMINENT BACK BUTTON) */}
      <AnimatePresence>
        {fullscreenStream && (
          <div className="fixed inset-0 w-screen h-screen z-[400] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-0 sm:p-4 overflow-hidden">
            {/* Top Fixed Header with Unified Back & Minimize Button */}
            <div className="absolute top-4 right-4 z-[450] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenLiveSession) {
                    onOpenLiveSession(fullscreenStream);
                  }
                  setFullscreenStream(null);
                }}
                className="px-4 py-2 bg-black/80 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180 text-emerald-400" />
                <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {isKu ? 'گەڕانەوە (بچووککردنەوە)' : i18n.language === 'ar' ? 'الرجوع (تصغير)' : 'Back (Minimize)'}
                </span>
              </button>
            </div>

            {/* Render Vertical Full Viewport Player Card */}
            <div className="w-full h-full flex items-center justify-center">
              <FullVerticalStreamCard
                session={fullscreenStream}
                user={user}
                onRequireAuth={onRequireAuth}
                isKu={isKu}
                index={0}
                totalCount={1}
                isFullscreen={true}
                onDeleteStream={(sess) => setStreamToDelete(sess)}
                onOpenSellerProfile={onOpenSellerProfile}
                onMinimize={() => {
                  if (onOpenLiveSession) {
                    onOpenLiveSession(fullscreenStream);
                  }
                  setFullscreenStream(null);
                }}
                onClose={() => setFullscreenStream(null)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid View Report Stream Modal */}
      <AnimatePresence>
        {reportingSession && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[460] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 text-white shadow-2xl relative space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <h3>{isKu ? '🚩 ڕاپۆرتکردنی پەخش' : i18n.language === 'ar' ? '🚩 الإبلاغ عن البث' : '🚩 Report Live Stream'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReportingSession(null);
                    setGridReportSubmitted(false);
                  }}
                  className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {gridReportSubmitted ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-400/40">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-white">
                    {isKu ? 'سوپاس بۆ هاوکاریت!' : i18n.language === 'ar' ? 'شكراً لتعاونك!' : 'Thank you for reporting!'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isKu ? 'ڕاپۆرتەکەت بە سەرکەوتوویی نێردرا بۆ تیمی بەڕێوەبەرایەتی.' : i18n.language === 'ar' ? 'تم استلام تقريرك وسيتم مراجعته من قبل الإدارة.' : 'Your report has been submitted for review.'}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const reportData = {
                        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        sessionId: reportingSession.id,
                        sessionTitle: reportingSession.title || 'پەخشی ڕاستەوخۆ',
                        broadcasterId: reportingSession.broadcasterId,
                        broadcasterName: reportingSession.broadcasterName || 'پەخشکەر',
                        broadcasterAvatar: reportingSession.broadcasterAvatar || '',
                        reportedByUserId: user?.id || 'guest',
                        reportedByUserName: user?.name || (isKu ? 'بینەر' : 'Viewer'),
                        reportedByUserPhone: user?.phone || '',
                        reason: gridReportReason,
                        details: gridReportDetails.trim(),
                        createdAt: Date.now()
                      };
                      await db.createLiveReport(reportData);
                    } catch (err) {
                      console.warn("Report save error:", err);
                    }
                    setGridReportSubmitted(true);
                    setTimeout(() => {
                      setGridReportSubmitted(false);
                      setReportingSession(null);
                      setGridReportDetails('');
                    }, 2000);
                  }}
                  className="space-y-3.5"
                >
                  <p className="text-xs text-slate-300">
                    {isKu ? 'تکایە هۆکاری ڕاپۆرتکردن دیاری بکە:' : i18n.language === 'ar' ? 'يرجى تحديد سبب الإبلاغ:' : 'Please select the reason for reporting:'}
                  </p>

                  <div className="space-y-2">
                    {[
                      { id: 'fraud', ku: 'فێڵکردن، نرخی ساختە یان کاڵای تەقلید', ar: 'احتيال أو سعر مضلل أو منتج مقلد', en: 'Fraud, misleading price or fake item' },
                      { id: 'inappropriate', ku: 'قسە، ڤیدیۆ یان ڕەفتاری نەشیاو', ar: 'محتوى غير لائق أو سلوك مسيء', en: 'Inappropriate language or behavior' },
                      { id: 'prohibited', ku: 'کاڵای قەدەغەکراو یان نایاسایی', ar: 'منتجات محظورة أو غير قانونية', en: 'Prohibited or illegal items' },
                      { id: 'spam', ku: 'سپام یان پەخشی بێزارکەر', ar: 'إزعاج أو بث متكرر (سبام)', en: 'Spam or harassing broadcast' },
                      { id: 'other', ku: 'هۆکاری تر', ar: 'سبب آخر', en: 'Other reason' }
                    ].map((reason) => (
                      <label
                        key={reason.id}
                        onClick={() => setGridReportReason(reason.id)}
                        className={clsx(
                          "w-full p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all",
                          gridReportReason === reason.id
                            ? "bg-rose-950/40 border-rose-500/60 text-white font-bold"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                        )}
                      >
                        <span>{isKu ? reason.ku : i18n.language === 'ar' ? reason.ar : reason.en}</span>
                        <input
                          type="radio"
                          name="gridReportReason"
                          value={reason.id}
                          checked={gridReportReason === reason.id}
                          onChange={() => setGridReportReason(reason.id)}
                          className="accent-rose-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {isKu ? 'ڕوونکردنەوەی زیاتر (ئارەزوومەندانە):' : i18n.language === 'ar' ? 'تفاصيل إضافية (اختياري):' : 'Additional details (optional):'}
                    </label>
                    <textarea
                      value={gridReportDetails}
                      onChange={(e) => setGridReportDetails(e.target.value)}
                      rows={2}
                      placeholder={isKu ? 'تێبینی بنووسە...' : 'Write notes...'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setReportingSession(null)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      {isKu ? 'ناردنی ڕاپۆرت' : i18n.language === 'ar' ? 'إرسال البلاغ' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Searchable City Selection Modal */}
      <AnimatePresence>
        {showCityModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-800 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <h3 className="text-white font-extrabold text-sm">
                    {isKu ? '📍 هەڵبژاردنی شار' : 'Select City'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCityModal(false); setCitySearchFilter(''); }}
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar inside Modal */}
              <div className="p-3 bg-slate-950/90 border-b border-slate-800">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={isKu ? 'گەڕان بۆ شار... (هەولێر، سلێمانی...)' : 'Search city...'}
                    value={citySearchFilter}
                    onChange={(e) => setCitySearchFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-slate-500"
                  />
                  {citySearchFilter && (
                    <button
                      type="button"
                      onClick={() => setCitySearchFilter('')}
                      className="absolute right-2.5 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* City List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {(!citySearchFilter || 'all'.includes(citySearchFilter.toLowerCase()) || 'هەموو'.includes(citySearchFilter)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity('All');
                      setShowCityModal(false);
                      setCitySearchFilter('');
                    }}
                    className={clsx(
                      "w-full px-4 py-3 rounded-2xl transition-all flex items-center justify-between text-right cursor-pointer border",
                      selectedCity === 'All'
                        ? "bg-red-600/20 border-red-500/60 text-white font-black shadow-md"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">📍</span>
                      <span className="text-xs font-bold">{isKu ? 'هەموو شارەکان' : 'All Cities'}</span>
                    </div>
                    <div className={clsx(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                      selectedCity === 'All' ? "border-red-500 bg-red-600 text-white" : "border-slate-600 bg-slate-950"
                    )}>
                      {selectedCity === 'All' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                )}

                {filteredCitiesList.length === 0 && citySearchFilter ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    {isKu ? 'هیچ شارێک نەدۆزرایەوە بەم ناوە' : 'No cities found matching search'}
                  </div>
                ) : (
                  filteredCitiesList.map((c) => {
                    const isSelected = selectedCity === c.id;
                    const label = getCityLabel(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCity(c.id);
                          setShowCityModal(false);
                          setCitySearchFilter('');
                        }}
                        className={clsx(
                          "w-full px-4 py-3 rounded-2xl transition-all flex items-center justify-between text-right cursor-pointer border",
                          isSelected
                            ? "bg-red-600/20 border-red-500/60 text-white font-black shadow-md"
                            : "bg-slate-950/60 border-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{label}</span>
                          <span className="text-[11px] text-slate-500 font-normal">({c.en})</span>
                        </div>
                        <div className={clsx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                          isSelected ? "border-red-500 bg-red-600 text-white" : "border-slate-600 bg-slate-950"
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Stream Deletion Confirmation Modal (Zero window.confirm) */}
      <AnimatePresence>
        {streamToDelete && (
          <div 
            className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setStreamToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/50 rounded-3xl p-5 max-w-xs w-full shadow-2xl text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
                <Trash2 className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {isKu ? 'سڕینەوەی ئەم پەخشە' : i18n.language === 'ar' ? 'حذف هذا البث' : 'Delete Broadcast'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isKu
                    ? 'ئایا دڵنیایت لە سڕینەوەی یەکجارەکی ئەم پەخشە؟ پەخشەکە لە داتابەیس لادەبرێت.'
                    : i18n.language === 'ar'
                    ? 'هل أنت متأكد من حذف هذا البث المباشر نهائياً؟'
                    : 'Are you sure you want to permanently delete this live stream?'}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeletingStream}
                  onClick={async () => {
                    if (!streamToDelete?.id) return;
                    setIsDeletingStream(true);
                    try {
                      await db.deleteLiveSession(streamToDelete.id);
                      setRealLiveSessions((prev) => prev.filter((s) => s.id !== streamToDelete.id));
                      if (fullscreenStream?.id === streamToDelete.id) {
                        setFullscreenStream(null);
                      }
                    } catch (err) {
                      console.error("Failed to delete live stream:", err);
                    } finally {
                      setIsDeletingStream(false);
                      setStreamToDelete(null);
                    }
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isKu ? 'بەڵێ، بسڕەوە' : i18n.language === 'ar' ? 'نعم، حذف' : 'Yes, Delete'}</span>
                </button>
                <button
                  type="button"
                  disabled={isDeletingStream}
                  onClick={() => setStreamToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer active:scale-95"
                >
                  {isKu ? 'پەشیمانبوونەوە' : i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
