import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home,
  Search, 
  Grid, 
  List, 
  Filter, 
  Heart, 
  Bookmark, 
  Plus, 
  Star, 
  Truck, 
  MapPin, 
  User as UserIcon, 
  Clock, 
  MoreHorizontal, 
  Trash2, 
  Share2, 
  X,
  Tag,
  Bell,
  BellRing,
  ShoppingBag,
  ShoppingBasket,
  MessageSquare,
  Users,
  Tv,
  Printer,
  Download,
  Package,
  Box,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Minimize2,
  Maximize2,
  Play,
  Pause,
  Music,
  TrendingUp,
  DollarSign,
  Phone,
  MessageCircle,
  Send,
  Bot,
  Zap,
  RotateCcw,
  Radio,
  Video,
  Target,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Paperclip,
  Volume2,
  VolumeX,
  Award,
  ShieldCheck,
  Store,
  Check,
  Layers,
  Globe,
  Sparkles,
  SlidersHorizontal,
  Sliders,
  Edit3,
  Lock,
  FileText,
  Gift,
  Eye,
  Activity,
  ChevronUp,
  QrCode,
  Rocket
} from 'lucide-react';
import ImageCarousel from './ImageCarousel';
import DailyStoriesTray from './DailyStoriesTray';
import { EditPostModal } from './EditPostModal';
import { ProductQrScannerModal } from './ProductQrScannerModal';
import { db, User, MarketplaceItem, Review, SellerProfile, LiveSession, LiveComment, Order, ChatMessage, isPostExpired, getBumpRuleForCategory, checkIsAdmin } from '../lib/db';
import { COMMON_COLORS, COMMON_SIZES, DEFAULT_LIVE_BROADCAST_VIDEO, FALLBACK_LIVE_BROADCAST_VIDEO } from '../lib/constants';
import { isVideoUrl, compressBase64Image } from '../lib/imageCompressor';
import { rankMarketplaceItems } from '../lib/algorithm';
import { safeCopyToClipboard } from '../lib/clipboard';
import { requestPushNotificationPermission } from '../lib/pushNotifications';
import clsx from 'clsx';
import { ConfirmationDialog, Toast } from './UI';
import ReviewSystem from './ReviewSystem';
import ItemReviewsModal from './ItemReviewsModal';
import ItemReviewsPreview from './ItemReviewsPreview';
import SellerReviewSystem from './SellerReviewSystem';
import SellerRatingBadge from './SellerRatingBadge';
import { CardSkeleton } from './Skeleton';
import InstagramPublicProfileModal from './InstagramPublicProfileModal';

interface MarketplaceProps {
  user: User | null;
  onRequireAuth: (action?: () => void) => void;
  onOpenSeller?: (sellerId: string) => void;
  onOpenSellerProfile?: (sellerId: string, fallbackInfo?: any) => void;
  onOpenProfile?: () => void;
  onOpenMessaging?: (sellerId: string, itemContext?: { id: string; title: string; imageUrl?: string; price: number }) => void;
  theme?: string;
  onTriggerPet?: () => void;
  onDelete?: (id: string) => void;
  initialSearchQuery?: string;
  targetSelectedItemId?: string | null;
  onClearTargetSelectedItemId?: () => void;
  onOpenLiveSession?: (session: LiveSession) => void;
  onOpenSellerDashboard?: () => void;
}

const AudioPlayer = ({ url, metadata, theme }: { url: string, metadata?: any, theme: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const textPrimary = {
    waves: "text-slate-800",
    bubbles: 'text-slate-900',
    abstract: 'text-slate-900',
    dynamic: 'text-white',
    rainbow: 'text-indigo-950 font-bold',
    raining: 'text-cyan-400',
    dark: 'text-white',
    white: 'text-black',
    custom: 'text-black'
  };

  return (
    <div className={clsx(
      "absolute bottom-3 left-3 right-3 p-2 rounded-xl backdrop-blur-xl border flex items-center gap-2 z-10",
      (theme === 'dynamic' || theme === 'raining' || theme === 'dark') ? "bg-black/60 border-white/10" : "bg-white/80 border-black/5"
    )}>
      <audio ref={audioRef} src={url || undefined} loop onEnded={() => setIsPlaying(false)} />
      <button 
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause track" : "Play track"}
        className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg hover:bg-indigo-600 transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Music className="w-2.5 h-2.5 text-indigo-400" />
          <span className={clsx("text-[9px] font-bold truncate uppercase tracking-wider", textPrimary[theme as keyof typeof textPrimary])}>
            {metadata?.title || 'AI Generated Track'}
          </span>
        </div>
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            animate={isPlaying ? { x: ['-100%', '100%'] } : { x: '-100%' }}
            transition={isPlaying ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
            className="h-full w-full bg-indigo-500/50"
          />
        </div>
      </div>
    </div>
  );
};

const MarketplaceItemCard = React.memo(function MarketplaceItemCard({ 
  item, 
  user, 
  theme, 
  cardClasses, 
  textPrimary, 
  textSecondary, 
  bgSecondary, 
  borderSecondary, 
  inputClasses, 
  sellerBg, 
  sellerText, 
  sellerName,
  onToggleLike,
  onToggleSave,
  onAddToCart,
  onOpenSeller,
  onTrackView,
  onOpenReview,
  onContactSeller,
  onDelete,
  onOpenDetails,
  onPreviewImage,
  onEditPrice,
  onEditPost,
  onTriggerPet,
  onBumpPost,
  onBoostPost,
  isBumpingToTop
}: {
  key?: any;
  item: MarketplaceItem;
  user: User | null;
  theme: string;
  cardClasses: any;
  textPrimary: any;
  textSecondary: any;
  bgSecondary: any;
  borderSecondary: any;
  inputClasses: any;
  sellerBg: any;
  sellerText: any;
  sellerName: any;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onAddToCart: (item: MarketplaceItem) => void;
  onOpenSeller: (id: string) => void;
  onTrackView: (sellerId: string, itemId: string, category: string) => void;
  onOpenReview: (item: MarketplaceItem) => void;
  onContactSeller: (sellerId: string, itemContext?: { id: string; title: string; imageUrl?: string; price: number }) => void;
  onDelete?: (id: string) => void;
  onTriggerPet?: () => void;
  onOpenDetails?: (item: MarketplaceItem) => void;
  onPreviewImage?: (item: MarketplaceItem) => void;
  onEditPrice?: (item: MarketplaceItem) => void;
  onEditPost?: (item: MarketplaceItem) => void;
  onBumpPost?: (item: MarketplaceItem) => void;
  onBoostPost?: (item: MarketplaceItem) => void;
  isBumpingToTop?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const ref = React.useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark' || theme === 'royal' || theme === 'midnight' || theme === 'tokyo' || theme === 'sunset' || theme === 'aurora' || theme === 'emerald';
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const images = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl];
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchEndX, setTouchEndX] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 30;
    if (distance > minSwipeDistance && images.length > 1) {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    } else if (distance < -minSwipeDistance && images.length > 1) {
      setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onTrackView(item.userId, item.id, item.category);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [item.id, item.userId, onTrackView]);

  const isLiked = user ? item.likes?.includes(user.id) : false;
  const isSaved = user ? item.saves?.includes(user.id) : false;

  const isAdmin = checkIsAdmin(user);
  const isOwner = Boolean(
    user && user.id && (item.userId === user.id || item.sellerId === user.id)
  );
  // Strict ownership: only the user who created this post can delete it from the feed
  const canDelete = isOwner && Boolean(onDelete);
  const canViewResalePrice = Boolean(
    item.resalePrice && 
    Number(item.resalePrice) > 0 && 
    (isOwner || isAdmin || item.showResalePriceToPublic === true)
  );

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const latestReview = reviews.length > 0 ? reviews[0] : null;

  useEffect(() => {
    let isMounted = true;
    const fetchItemReviews = () => {
      db.getReviews(item.id).then((revList) => {
        if (isMounted && revList && revList.length > 0) {
          setReviews(revList);
        }
      }).catch(() => {});
    };

    fetchItemReviews();

    const handleReviewAdded = (e: any) => {
      const detail = e.detail;
      if (detail && detail.itemId === item.id) {
        if (detail.review) {
          setReviews(prev => [detail.review, ...prev.filter(r => r.id !== detail.review.id)]);
        } else {
          fetchItemReviews();
        }
      }
    };

    window.addEventListener('payv_review_added', handleReviewAdded);
    return () => { 
      isMounted = false; 
      window.removeEventListener('payv_review_added', handleReviewAdded);
    };
  }, [item.id]);

  // Real-time viewer state
  const [realTimeViewers, setRealTimeViewers] = useState<{userId: string, avatar: string}[]>([]);

  // Seller follow state
  const targetSellerId = item.sellerId || item.userId;
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (!targetSellerId) return;
    db.getSellerProfile(targetSellerId).then(prof => {
      if (isMounted && prof) {
        const followers = prof.followers || [];
        setFollowersCount(followers.length);
        setIsFollowing(Boolean(user && followers.includes(user.id)));
      }
    });
    return () => { isMounted = false; };
  }, [targetSellerId, user?.id]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onOpenSeller?.(targetSellerId);
      return;
    }
    const willFollow = !isFollowing;
    if (willFollow) {
      requestPushNotificationPermission();
    }
    const updated = await db.toggleFollowSeller(targetSellerId, user.id);
    setIsFollowing(updated.includes(user.id));
    setFollowersCount(updated.length);
  };

  const displayTotalViews = Math.max(item.analytics?.views || 0, item.viewerCount || 0) + ((item.likes?.length || 0) * 8) + 24;

  useEffect(() => {
    if (!item.id) return;
    const unsub = db.onViewersChange(item.id, (viewers) => {
      setRealTimeViewers(viewers);
    });
    return () => unsub();
  }, [item.id]);

  useEffect(() => {
    if (!user || !item.id) return;
    const unsubPresence = db.trackPresence(item.id, user.id, user.avatar);
    return () => unsubPresence();
  }, [item.id, user?.id, user?.avatar]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        "group border rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 max-w-full shadow-md hover:shadow-xl",
        cardClasses[theme as keyof typeof cardClasses] || cardClasses.royal || cardClasses.white
      )}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (onPreviewImage) {
            onPreviewImage(item);
          } else {
            onOpenDetails?.(item);
          }
        }}
        className={clsx(
          "aspect-[4/3] max-h-[280px] sm:max-h-[340px] relative overflow-hidden cursor-pointer group/img", 
          theme === 'dark' ? "bg-slate-950" : 
          theme === 'sunset' ? "bg-orange-950/40" :
          theme === 'midnight' ? "bg-slate-950/40" :
          theme === 'tokyo' ? "bg-slate-950" :
          theme === 'emerald' || theme === 'aurora' ? "bg-emerald-950/40" :
          theme === 'royal' ? "bg-[#0b1220]" :
          theme === 'monochrome' ? "bg-slate-100" :
          theme === 'raz' ? "bg-ef-bg" :
          "bg-slate-100"
        )}
      >
        <ImageCarousel 
          images={images}
          videoUrl={item.videoUrl}
          alt={item.title}
          theme={theme}
          onImageClick={() => {
            if (onPreviewImage) {
              onPreviewImage(item);
            } else {
              onOpenDetails?.(item);
            }
          }}
        />

        {/* Delete Button on Card */}
        {canDelete && (
          <div className="absolute top-3 right-3 z-40">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(item.id);
              }}
              className="group/del flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white transition-all shadow-xl hover:scale-105 active:scale-95 border border-white/30 cursor-pointer"
              title={i18n.language === 'ku' ? 'سڕینەوەی پۆست' : i18n.language === 'ar' ? 'حذف المنشور' : 'Delete Post'}
            >
              <Trash2 className="w-3.5 h-3.5 group-hover/del:animate-bounce" />
              <span className="text-[9px] font-black uppercase tracking-wider">
                {i18n.language === 'ku' ? 'سڕینەوە' : i18n.language === 'ar' ? 'حذف' : 'Delete'}
              </span>
            </button>
          </div>
        )}

        {/* Hover photo preview indicator */}
        <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 border border-white/20 shadow-md">
          <ZoomIn className="w-3 h-3 text-amber-300" />
          <span>{i18n.language === 'ku' ? 'بینینی وێنە' : i18n.language === 'ar' ? 'معاينة الصورة' : 'Preview'}</span>
        </div>

        {item.audioUrl && (
          <AudioPlayer url={item.audioUrl} metadata={item.audioMetadata} theme={theme} />
        )}

        {item.category && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {item.isBoosted && (
              <div className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-300/40 shadow-lg flex items-center gap-1 animate-pulse">
                <TrendingUp className="w-3 h-3 text-amber-200" />
                <span>{i18n.language === 'ku' ? '🔥 VIP سپۆنسەر' : i18n.language === 'ar' ? '🔥 ترقية VIP' : '🔥 VIP Promoted'}</span>
              </div>
            )}
            {item.bumpCount && item.bumpCount > 0 && !item.isBoosted && (
              <div className="px-2.5 py-1 bg-indigo-600/90 text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-400/30 backdrop-blur-md flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-300" />
                <span>{i18n.language === 'ku' ? `🚀 بەرزکراوەوە (${item.bumpCount})` : i18n.language === 'ar' ? `🚀 تم الرفع (${item.bumpCount})` : `🚀 Bumped (${item.bumpCount})`}</span>
              </div>
            )}
            <div className={clsx(
              "px-2.5 py-1 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider border",
              theme === 'sunset' ? "bg-orange-500/80 text-white border-orange-400" :
              theme === 'tokyo' ? "bg-indigo-900/80 text-white border-indigo-400" :
              theme === 'wavy' ? "bg-teal-600/80 text-white border-teal-300" :
              "bg-black/60 text-white border-white/10"
            )}>
              {item.category}
            </div>
            {canViewResalePrice && (
              <div className={clsx(
                "px-2.5 py-1 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase tracking-wider border shadow-sm flex items-center gap-1",
                item.showResalePriceToPublic ? "bg-teal-500/90 border-teal-400/40" : "bg-purple-600/90 border-purple-400/40"
              )}>
                {!item.showResalePriceToPublic && <Lock className="w-2.5 h-2.5 text-purple-200" />}
                <span>
                  {i18n.language === 'ku' ? `🏷️ داشکاندن: ${(Number(item.resalePrice) * 1500).toLocaleString()} دینار` : i18n.language === 'ar' ? `🏷️ تخفيض: ${(Number(item.resalePrice) * 1500).toLocaleString()} دينار` : `🏷️ Discount: ${(Number(item.resalePrice) * 1500).toLocaleString()} IQD`}
                </span>
                {!item.showResalePriceToPublic && (
                  <span className="text-[8px] bg-black/40 px-1 py-0.2 rounded font-bold text-purple-200">
                    {i18n.language === 'ku' ? 'تایبەت' : i18n.language === 'ar' ? 'خاص' : 'Private'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Quick Actions Overlay */}
        <div className={clsx(
          "absolute right-3 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300",
          canDelete ? "top-15" : "top-3"
        )}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(item.id);
            }}
            aria-label={isLiked ? "Unlike item" : "Like item"}
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors",
              isLiked ? "bg-red-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            <Heart className={clsx("w-4 h-4", isLiked && "fill-current")} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(item.id);
            }}
            aria-label={isSaved ? "Remove bookmark" : "Bookmark item"}
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors",
              isSaved ? "bg-indigo-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
            )}
          >
            <Bookmark className={clsx("w-4 h-4", isSaved && "fill-current")} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const a = document.createElement('a');
              a.href = item.imageUrl;
              a.download = `${item.title.toLowerCase()}.jpg`;
              a.click();
            }}
            aria-label="Download image"
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 bg-black/40 text-white hover:bg-black/60 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <body style="margin:0; display:flex; align-items:center; justify-content:center; height:100vh;">
                      <img src="${item.imageUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" onload="window.print(); window.close();" />
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 bg-black/40 text-white hover:bg-black/60 transition-colors"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditPrice) {
                  onEditPrice(item);
                } else if (onOpenDetails) {
                  onOpenDetails(item);
                }
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 bg-emerald-500/80 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
              title={i18n.language === 'ku' ? 'نوێکردنەوەی نرخ' : i18n.language === 'ar' ? 'تعديل السعر' : 'Update Price'}
            >
              <Tag className="w-4 h-4" />
            </button>
          )}
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(item);
          }}
          aria-label="Add to cart"
          className="absolute bottom-3 right-3 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-xl md:translate-y-12 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-indigo-500 hover:text-white cursor-pointer z-30"
          title={i18n.language === 'ku' ? 'خستنە نێو سەبەتە' : i18n.language === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart'}
        >
          <ShoppingBasket className="w-5 h-5" />
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onContactSeller(item.userId, {
              id: item.id,
              title: item.title,
              imageUrl: item.imageUrls?.[0] || item.imageUrl,
              price: item.price
            });
          }}
          aria-label="Contact seller"
          className="absolute bottom-3 left-3 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl md:translate-y-12 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-indigo-700"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-3 sm:p-3.5 space-y-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={clsx("font-bold text-xs sm:text-sm truncate flex-1 tracking-tight", textPrimary[theme as keyof typeof textPrimary])}>{item.title}</h3>
          {item.rating ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenReview(item);
              }}
              className="flex items-center gap-1 text-yellow-400 text-[10px] sm:text-xs font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full hover:bg-yellow-400/20 transition-colors shrink-0 cursor-pointer"
              title={i18n.language === 'ku' ? 'هەڵسەنگاندن و کۆمێنتەکان' : 'Ratings & Reviews'}
            >
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              {item.rating.toFixed(1)}
              {item.reviewCount !== undefined && (
                <span className="ml-0.5 opacity-70">({item.reviewCount} {i18n.language === 'ku' ? 'هەڵسەنگاندن' : ''})</span>
              )}
            </button>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenReview(item);
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-400 text-[9px] font-bold bg-slate-500/10 hover:bg-amber-400/10 px-1.5 py-0.5 rounded-full transition-colors shrink-0 cursor-pointer"
              title={i18n.language === 'ku' ? 'هەڵسەنگاندن و کۆمێنت' : 'Rate & Review'}
            >
              <Star className="w-2.5 h-2.5" />
              {i18n.language === 'ku' ? 'هەڵسەنگاندن' : i18n.language === 'ar' ? 'تقييم' : 'Rate'}
            </button>
          )}
        </div>

        {/* Sourcing Code Tag / کۆدی سەرچاوە */}
        {Boolean(item.sourceCode || item.customFields?.sourceCode || (item.title && item.title.startsWith('SRC-'))) && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const code = item.sourceCode || item.customFields?.sourceCode || item.title;
                safeCopyToClipboard(code);
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-400 text-[9px] font-mono font-bold transition-all cursor-pointer group/code"
              title={i18n.language === 'ku' ? 'کۆپیکردنی کۆدی سەرچاوە' : i18n.language === 'ar' ? 'نسخ رمز المنتج' : 'Copy Sourcing Code'}
            >
              <span className="text-[8px] text-indigo-300 uppercase font-sans">{i18n.language === 'ku' ? 'کۆد:' : i18n.language === 'ar' ? 'الرمز:' : 'Code:'}</span>
              <span className="group-hover/code:underline">{item.sourceCode || item.customFields?.sourceCode || item.title}</span>
            </button>
          </div>
        )}
        <div className="flex flex-col mb-1.5 space-y-1">
          <div className="flex flex-wrap items-baseline gap-2">
            {canViewResalePrice ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                    {!item.showResalePriceToPublic && <Lock className="w-2.5 h-2.5 text-purple-400" />}
                    {i18n.language === 'ku' ? 'نرخی داشکاندن:' : i18n.language === 'ar' ? 'سعر التخفيض:' : 'Discount Price:'}
                  </span>
                  <span className={clsx(
                    "font-extrabold text-sm sm:text-base tracking-tight",
                    theme === 'royal' ? "text-amber-300 drop-shadow-xs" :
                    theme === 'sunset' ? "text-orange-400" : 
                    theme === 'tokyo' ? "text-teal-400" :
                    theme === 'wavy' ? "text-teal-600" :
                    "text-emerald-500"
                  )}>
                    {(Number(item.resalePrice) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'Dinar'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="font-semibold text-slate-400">
                    {i18n.language === 'ku' ? 'نرخی ئەسڵی:' : i18n.language === 'ar' ? 'السعر الأصلي:' : 'Original Price:'}
                  </span>
                  <span className="line-through decoration-red-500 decoration-2 text-red-500 font-extrabold">
                    {(Number(item.price) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                  </span>
                </div>
              </>
            ) : (
              Number(item.price) > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {i18n.language === 'ku' ? 'نرخی فرۆشتن:' : i18n.language === 'ar' ? 'سعر البيع:' : 'Price:'}
                  </span>
                  <span className={clsx(
                    "font-extrabold text-sm sm:text-base tracking-tight",
                    theme === 'royal' ? "text-amber-300 drop-shadow-xs" :
                    theme === 'sunset' ? "text-orange-400" : 
                    theme === 'tokyo' ? "text-teal-400" :
                    theme === 'wavy' ? "text-teal-600" :
                    "text-red-500"
                  )}>
                    {(Number(item.price) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'Dinar'}
                  </span>
                </div>
              )
            )}
          </div>

          {canViewResalePrice && Number(item.resalePrice) > Number(item.price) && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold w-fit">
              <span>{i18n.language === 'ku' ? '💰 قازانج:' : i18n.language === 'ar' ? '💰 الربح:' : '💰 Profit:'}</span>
              <span className="font-extrabold">+{( (Number(item.resalePrice) - Number(item.price)) * 1500 ).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
            </div>
          )}

          <div className={clsx("flex items-center gap-1 text-[9px] sm:text-[10px] font-medium mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            <Truck className="w-2.5 h-2.5 text-indigo-400" />
            <span>{i18n.language === 'ku' ? 'گەیاندن: ٤٠٠٠ دینار' : i18n.language === 'ar' ? 'التوصيل: ٤٠٠٠ دينار' : 'Delivery: 4000 IQD'}</span>
          </div>

          {(item.description || item.weight) && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setIsDescExpanded(!isDescExpanded);
              }}
              className="cursor-pointer group/desc my-1 select-text"
              title={i18n.language === 'ku' ? 'کلیک بکە بۆ بینینی تەواوی وەسف' : i18n.language === 'ar' ? 'انقر لعرض كامل الوصف' : 'Click to toggle full description'}
            >
              <p className={clsx(
                "text-[11px] sm:text-xs leading-relaxed font-medium transition-all duration-200",
                !isDescExpanded && "line-clamp-2",
                isDark ? "text-slate-200" : "text-slate-700"
              )}>
                {item.description || item.weight}
              </p>
              {((item.description || item.weight)?.length || 0) > 60 && (
                <span className="text-[9px] font-bold text-indigo-400 group-hover/desc:text-indigo-300 transition-colors inline-block mt-0.5">
                  {isDescExpanded 
                    ? (i18n.language === 'ku' ? '▲ کەمکردنەوە' : i18n.language === 'ar' ? '▲ إخفاء' : '▲ Show less') 
                    : (i18n.language === 'ku' ? '... تەواوی وەسف' : i18n.language === 'ar' ? '... قراءة المزيد' : '... Read full')}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Viewer count for live items or real-time presence */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-1.5">
            {realTimeViewers.length > 0 ? (
              realTimeViewers.slice(0, 4).map((viewer, i) => (
                <div key={`${viewer.userId || 'viewer'}-${i}`} className={clsx("w-5 h-5 rounded-full border overflow-hidden", isDark ? "border-slate-800 bg-slate-800" : "border-white bg-slate-200")}>
                  <img src={viewer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=viewer${i}${item.id}`} className="w-full h-full" alt="" />
                </div>
              ))
            ) : (
              [1, 2, 3, 4].map((i) => (
                <div key={`placeholder-viewer-${i}`} className={clsx("w-5 h-5 rounded-full border overflow-hidden", isDark ? "border-slate-800 bg-slate-800" : "border-white bg-slate-200")}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=viewer${i}${item.id}`} className="w-full h-full" alt="" />
                </div>
              ))
            )}
          </div>
          <span className={clsx("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-slate-400" : "text-slate-500")}>
            {item.isLive ? (
              <span className="text-rose-500 animate-pulse">{Math.max(item.viewerCount || 0, realTimeViewers.length)} {i18n.language === 'ku' ? 'بینەر ئێستا' : i18n.language === 'ar' ? 'مشاهد الآن' : 'watching live'}</span>
            ) : (
              <span>
                {realTimeViewers.length > 0 ? (
                  <>
                    <span className="text-teal-400 font-black">{realTimeViewers.length}</span>
                    {realTimeViewers.length === 1 
                      ? (i18n.language === 'ku' ? ' کەس سەیری دەکات' : i18n.language === 'ar' ? ' شخص يشاهد' : ' person viewing') 
                      : (i18n.language === 'ku' ? ' کەسی تر سەیری دەکەن' : i18n.language === 'ar' ? ' أشخاص يشاهدون' : ' others viewing')}
                  </>
                ) : (
                  <span>{Math.floor(Math.random() * 20) + 5} {i18n.language === 'ku' ? 'کەسی تر سەیری دەکەن' : i18n.language === 'ar' ? ' أشخاص يشاهدون الآن' : 'others viewing'}</span>
                )}
              </span>
            )}
          </span>
        </div>
        
        {/* Instagram-Style Comments & 1-Click Inline Review Bar */}
        <ItemReviewsPreview
          itemId={item.id}
          itemTitle={item.title}
          currentUser={user}
          theme={theme}
          onOpenReviews={() => onOpenReview(item)}
        />
        

        {item.location && (
          <div className={clsx("flex items-center gap-1 text-[10px] mb-3", isDark ? "text-slate-400" : "text-slate-500")}>
            <MapPin className="w-3 h-3 text-indigo-400" />
            <span>{item.location}</span>
          </div>
        )}
        
        <div className={clsx(
          "flex flex-col gap-2 pt-3 border-t", 
          theme === 'royal' ? "border-amber-400/20" :
          theme === 'dark' ? "border-slate-800/50" : 
          theme === 'sunset' ? "border-orange-500/20" :
          theme === 'midnight' ? "border-indigo-500/20" :
          theme === 'tokyo' ? "border-indigo-500/20" :
          theme === 'emerald' || theme === 'aurora' ? "border-emerald-500/20" :
          theme === 'raz' ? "border-ef-pink/20" :
          isDark ? "border-white/10" : "border-slate-200/60"
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <button 
                type="button"
                onClick={() => onOpenSeller?.(item.userId)}
                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors group/seller truncate"
              >
                <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0", sellerBg[theme as keyof typeof sellerBg])}>
                  <UserIcon className={clsx("w-3 h-3 transition-colors", sellerText[theme as keyof typeof sellerText])} />
                </div>
                <span className={clsx("text-[10px] font-medium transition-colors truncate", sellerName[theme as keyof typeof sellerName])}>{item.userName}</span>
                {(item.isVerified || item.userVerified) && (
                  <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0 inline-block" title={i18n.language === 'ku' ? 'فرۆشیاری پشڕاستکراو' : i18n.language === 'ar' ? 'بائع موثوق ومفعل' : 'Verified Seller'} />
                )}
                {(item.isPerfectSeller || item.userPerfectSeller) && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 inline-block animate-pulse" title={i18n.language === 'ku' ? 'فرۆشیاری نموونەیی (Perfect Seller)' : i18n.language === 'ar' ? 'بائع متميز' : 'Perfect Seller'} />
                )}
                {(item.isTrustedSeller || item.userTrustedSeller) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-700 text-amber-200 text-[8px] font-black border border-emerald-400 shrink-0 shadow-xs" title={i18n.language === 'ku' ? 'مۆری باوەڕپێکراو (فرۆشیاری ڕاستگۆ)' : i18n.language === 'ar' ? 'ختم الثقة (بائع صادق وموثوق)' : 'Official Trusted Honest Seller Seal'}>
                    <Award className="w-2.5 h-2.5 text-amber-300" />
                    <span className="hidden sm:inline">{i18n.language === 'ku' ? 'مۆری باوەڕپێکراو' : i18n.language === 'ar' ? 'ختم الثقة' : 'Trusted'}</span>
                  </span>
                )}
              </button>

              {/* Instagram-style Follow Button on Card with Push Alert Badge */}
              {user?.id !== targetSellerId && (
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1",
                    isFollowing
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs hover:scale-105 active:scale-95"
                  )}
                  title={isFollowing ? (i18n.language === 'ku' ? 'شوێنکەوتووی (ئاگادارییەکان چالاکن)' : i18n.language === 'ar' ? 'أنت تتابع (الإشعارات مفعلة)' : 'Following (Push alerts active)') : (i18n.language === 'ku' ? 'شوێنکەوتن بۆ ئاگاداری کاڵای نوێ' : i18n.language === 'ar' ? 'متابعة للحصول على إشعارات' : 'Follow for new product push alerts')}
                >
                  <Bell className={clsx("w-2.5 h-2.5", isFollowing ? "text-emerald-400 fill-emerald-400" : "text-white")} />
                  <span>
                    {isFollowing 
                      ? (i18n.language === 'ku' ? `✓ شوێنکەوتووی (${followersCount})` : i18n.language === 'ar' ? `✓ متابع (${followersCount})` : `✓ Following (${followersCount})`) 
                      : (i18n.language === 'ku' ? '+ شوێنکەوتن' : i18n.language === 'ar' ? '+ متابعة' : '+ Follow')}
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Views Count Display */}
              <div className="flex items-center gap-1 text-[10px] text-sky-500 font-bold" title={t('Views')}>
                <Eye className="w-3 h-3 text-sky-400 shrink-0" />
                <span>{displayTotalViews.toLocaleString()}</span>
              </div>

              {item.likes && item.likes.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                  {item.likes.length}
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-slate-500 hidden sm:flex">
                <Clock className="w-3 h-3" />
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const formatProductKind = (kind: string) => {
  if (!kind || kind === 'sale') return '';
  const map: Record<string, string> = {
    on_sale: 'on sale',
    resell: 'resell',
    bid_box: 'bid box',
    qishtalla: 'Qishtalla',
    farm: 'farm agriculture',
    handmade: 'handmade craft',
    factory: 'factory industrial',
    local: 'local industry',
    shops: 'local boutique',
    offer: 'special offer',
    wholesale: 'wholesale market',
    resale: 'resale'
  };
  return map[kind] || kind.replace('_', ' ');
};

const IRAQ_PROVINCES = [
  { id: 'all', nameEn: 'All Iraq & Regions', nameKu: '🌐 هەموو عێراق', nameAr: '🌐 كل العراق والمحافظات' },
  { id: 'Erbil', nameEn: 'Erbil (Hewlêr)', nameKu: '📍 هەولێر', nameAr: '📍 أربيل' },
  { id: 'Sulaymaniyah', nameEn: 'Sulaymaniyah', nameKu: '📍 سلێمانی', nameAr: '📍 السليمانية' },
  { id: 'Duhok', nameEn: 'Duhok', nameKu: '📍 دهۆک', nameAr: '📍 دهوك' },
  { id: 'Baghdad', nameEn: 'Baghdad', nameKu: '📍 بەغدا', nameAr: '📍 بغداد' },
  { id: 'Basra', nameEn: 'Basra', nameKu: '📍 بەسرە', nameAr: '📍 البصرة' },
  { id: 'Kirkuk', nameEn: 'Kirkuk', nameKu: '📍 کەرکووک', nameAr: '📍 كركوك' },
  { id: 'Mosul', nameEn: 'Mosul', nameKu: '📍 مووسڵ', nameAr: '📍 الموصل' },
  { id: 'Halabja', nameEn: 'Halabja', nameKu: '📍 هەڵەبجە', nameAr: '📍 حلبجة' },
  { id: 'Najaf', nameEn: 'Najaf', nameKu: '📍 نەجەف', nameAr: '📍 النجف' },
  { id: 'Karbala', nameEn: 'Karbala', nameKu: '📍 کەربەلا', nameAr: '📍 كربلاء' },
  { id: 'Diwaniyah', nameEn: 'Diwaniyah', nameKu: '📍 دیوانیە', nameAr: '📍 الديوانية' },
  { id: 'Nasiriyah', nameEn: 'Nasiriyah', nameKu: '📍 ناسریە', nameAr: '📍 الناصرية' },
  { id: 'Kut', nameEn: 'Kut', nameKu: '📍 کووت', nameAr: '📍 الكوت' },
  { id: 'Amarah', nameEn: 'Amarah', nameKu: '📍 عەممارە', nameAr: '📍 العمارة' },
  { id: 'Samarra', nameEn: 'Samarra', nameKu: '📍 سامەڕا', nameAr: '📍 سامراء' },
  { id: 'Ramadi', nameEn: 'Ramadi', nameKu: '📍 ڕەمادی', nameAr: '📍 الرمادي' },
  { id: 'Baqubah', nameEn: 'Baqubah', nameKu: '📍 بەعقووبە', nameAr: '📍 بعقوبة' },
];

const SORT_OPTIONS = [
  { id: 'algorithm', labelKu: '⚡ ئەلگۆریزمی زیرەکی عێراق', labelAr: '⚡ خوارزمية العراق الذكية', labelEn: '⚡ Smart Iraq Algorithm' },
  { id: 'bumped', labelKu: '🚀 دوایین بەرزکراوەکان', labelAr: '🚀 المرفوعة حديثاً', labelEn: '🚀 Recently Bumped' },
  { id: 'newest', labelKu: '🕒 نوێترین پۆستەکان', labelAr: '🕒 أحدث المنتجات', labelEn: '🕒 Newest Posts' },
  { id: 'popular', labelKu: '🔥 زۆرترین حەزلێکراو', labelAr: '🔥 الأكثر شعبية وإعجاباً', labelEn: '🔥 Most Popular' },
  { id: 'price_asc', labelKu: '💰 نرخی کەمتر بۆ زیاتر', labelAr: '💰 السعر: من الأقل للأعلى', labelEn: '💰 Price: Low to High' },
  { id: 'price_desc', labelKu: '💰 نرخی زیاتر بۆ کەمتر', labelAr: '💰 السعر: من الأعلى للأقل', labelEn: '💰 Price: High to Low' },
];

export default function Marketplace({ 
  user, 
  onRequireAuth, 
  onOpenSeller, 
  onOpenSellerProfile,
  onOpenProfile, 
  onOpenMessaging,
  theme = 'dark', 
  onTriggerPet, 
  onDelete,
  initialSearchQuery = '',
  targetSelectedItemId,
  onClearTargetSelectedItemId,
  onOpenLiveSession,
  onOpenSellerDashboard
}: MarketplaceProps) {
  const { t, i18n } = useTranslation();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const [items, setItems] = useState<MarketplaceItem[]>(() => {
    return db.getCachedMarketplaceItems().slice(0, 16);
  });
  const [renderedLimit, setRenderedLimit] = useState(16);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'algorithm' | 'bumped' | 'newest' | 'popular' | 'price_asc' | 'price_desc'>('algorithm');
  const [bumpingItemId, setBumpingItemId] = useState<string | null>(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState<boolean>(false);
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(() => {
    return db.getCachedMarketplaceItems().length === 0;
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<MarketplaceItem | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [gridCols, setGridCols] = useState(4);
  const [activeSeller, setActiveSeller] = useState<{
    id: string;
    name: string;
    phone?: string;
    avatar?: string;
    username?: string;
    bio?: string;
    city?: string;
    category?: string;
    isPublic?: boolean;
    followers?: string[];
    isVerified?: boolean;
  } | null>(null);
  const [isLiveAudioMuted, setIsLiveAudioMuted] = useState(true);
  const [sellerFullProfile, setSellerFullProfile] = useState<SellerProfile | null>(null);
  const [syncingReputation, setSyncingReputation] = useState(false);
  const [selectedLiveSession, setSelectedLiveSession] = useState<LiveSession | null>(null);
  const [isLiveMinimized, setIsLiveMinimized] = useState(false);
  const [liveComments, setLiveComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [pinnedProduct, setPinnedProduct] = useState<MarketplaceItem | null>(null);
  const [isJoiningLive, setIsJoiningLive] = useState(false);
  const [activeGift, setActiveGift] = useState<{ id: string, icon: string, name: string } | null>(null);
  const [expandedDescItemIds, setExpandedDescItemIds] = useState<Record<string, boolean>>({});
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const handleTrackOrder = async () => {
    if (!trackingOrderId.trim()) return;
    setIsTracking(true);
    setTrackingError(null);
    try {
      const order = await db.getOrder(trackingOrderId.trim());
      if (order) {
        setTrackedOrder(order);
        // Subscribe for real-time updates
        const unsub = db.subscribeToOrder(order.id, (updatedOrder) => {
          setTrackedOrder(updatedOrder);
        });
        return () => unsub();
      } else {
        setTrackingError(i18n.language === 'ku' ? 'ئەم داواکارییە نەدۆزرایەوە' : i18n.language === 'ar' ? 'لم يتم العثور على هذا الطلب' : 'Order not found');
        setTrackedOrder(null);
      }
    } catch (err) {
      console.error("Error tracking order:", err);
      setTrackingError(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا' : i18n.language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsTracking(false);
    }
  };

  const GIFTS = [
    { id: 'gift1', icon: '💎', name: 'Diamond' },
    { id: 'gift2', icon: '🌹', name: 'Rose' },
    { id: 'gift3', icon: '🏆', name: 'Trophy' },
    { id: 'gift4', icon: '⚡', name: 'Lightning' },
    { id: 'gift5', icon: '🔥', name: 'Fire' }
  ];

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    if (!selectedLiveSession) return;
    const currentUser = userRef.current;
    if (!currentUser) {
      onRequireAuth(() => handleSendGift(gift));
      return;
    }

    try {
      await db.addLiveComment({
        sessionId: selectedLiveSession.id,
        broadcasterId: selectedLiveSession.broadcasterId,
        userId: currentUser.id,
        userName: currentUser.name,
        text: `sent a ${gift.name} ${gift.icon}`
      });
      
      setActiveGift(gift);
      setTimeout(() => setActiveGift(null), 3000);
    } catch (err) {
      console.error("Error sending gift:", err);
    }
  };

  // Dynamic automatic translation states for items & bounties
  const [translatedItems, setTranslatedItems] = useState<Record<string, { title: string, description: string, category?: string }>>({});
  const [translating, setTranslating] = useState(false);
  const attemptedTranslationKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const translateIfNeeded = async () => {
      const targetLang = i18n.language === 'ku' ? 'Kurdish' : i18n.language === 'ar' ? 'Arabic' : null;
      if (!targetLang) return;

      // Filter out items that are already translated or attempted for this language
      const untranslatedItems = items.filter(item => {
        const cacheKey = `${i18n.language}_${item.id}`;
        return !translatedItems[cacheKey] && !attemptedTranslationKeysRef.current.has(cacheKey);
      });

      if (untranslatedItems.length === 0) return;

      // Mark all collected as attempted immediately to prevent duplicate runs
      untranslatedItems.forEach(it => {
        attemptedTranslationKeysRef.current.add(`${i18n.language}_${it.id}`);
      });

      setTranslating(true);
      try {
        const itemsToTranslate = untranslatedItems.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category
        }));

        let data: any = null;
        try {
          const response = await fetch('/api/payv/translate-batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              items: itemsToTranslate,
              targetLanguage: targetLang
            })
          });
          
          if (response.ok) {
            data = await response.json();
          }
        } catch (_fetchErr) {
          // Fall back gracefully
        }
        
        if (data && data.success && Array.isArray(data.translations)) {
          setTranslatedItems(prev => {
            const next = { ...prev };
            data.translations.forEach((t: any) => {
              const cacheKey = `${i18n.language}_${t.id}`;
              next[cacheKey] = {
                title: t.title,
                description: t.description,
                category: t.category
              };
            });
            return next;
          });
        }
      } catch (err) {
        // Silently handled
      } finally {
        setTranslating(false);
      }
    };

    // Debounce to batch calls
    timeoutId = setTimeout(() => {
      translateIfNeeded();
    }, 2000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [items, i18n.language]);

  const getDisplayItem = (item: MarketplaceItem) => {
    const cacheKey = `${i18n.language}_${item.id}`;
    const trans = translatedItems[cacheKey];
    if (trans) {
      return {
        ...item,
        title: trans.title || item.title,
        description: trans.description || item.description,
        category: trans.category || item.category
      };
    }
    return item;
  };

  const displayItems = useMemo(() => {
    return items.map(getDisplayItem);
  }, [items, translatedItems, i18n.language]);

  useEffect(() => {
    let active = true;
    if (activeSeller) {
      db.getSellerProfile(activeSeller.id).then(profile => {
        if (active && profile) {
          setSellerFullProfile(profile);
        }
      }).catch(console.error);
    } else {
      setSellerFullProfile(null);
    }
    return () => { active = false; };
  }, [activeSeller]);

  const handleSyncReputation = async () => {
    if (!activeSeller) return;
    try {
      setSyncingReputation(true);
      const updatedRep = await db.recalculateReputation(activeSeller.id);
      if (updatedRep) {
        setSellerFullProfile(prev => prev ? { ...prev, reputation: updatedRep } : null);
      }
    } catch (e) {
      console.error("Failed to sync reputation:", e);
    } finally {
      setSyncingReputation(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!activeSeller) return;
    const currentUser = userRef.current;
    if (!currentUser) {
      onRequireAuth(() => handleToggleFollow());
      return;
    }
    try {
      const willFollow = !sellerFullProfile?.followers?.includes(currentUser.id);
      if (willFollow) {
        requestPushNotificationPermission();
      }
      const updatedFollowers = await db.toggleFollowSeller(activeSeller.id, currentUser.id);
      setSellerFullProfile(prev => prev ? { ...prev, followers: updatedFollowers } : null);
      setToast({ 
        message: willFollow
          ? (i18n.language === 'ku' ? `تۆ ئێستا شوێنکەوتووی فرۆشگای (${activeSeller.name})یت! بە هاتنی هەر بەرهەمێکی نوێ ئاگاداری دەستبەجێت بۆ دێت 🔔` : i18n.language === 'ar' ? `أنت الآن تتابع (${activeSeller.name})! ستتلقى إشعارات فورية عند إضافة منتجات جديدة 🔔` : `You are now following ${activeSeller.name}! You'll receive instant push alerts on new products 🔔`)
          : (i18n.language === 'ku' ? 'شوێنکەوتنی فرۆشگا لابرا' : i18n.language === 'ar' ? 'تم إلغاء متابعة المتجر' : 'Unfollowed shop'), 
        type: willFollow ? 'success' : 'info' 
      });
      if (onTriggerPet) onTriggerPet();
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };
  const [chatMessages, setChatMessages] = useState<{ id: string; senderId: string; recipientId: string; text: string; imageUrl?: string; createdAt: number }[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chatImageUploading, setChatImageUploading] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImageZoom, setSelectedImageZoom] = useState<string | null>(null);
  const [isSellerTyping, setIsSellerTyping] = useState(false);
  const [sellerModalTab, setSellerModalTab] = useState<'posts' | 'reviews' | 'chat' | 'info' | 'reputation'>('posts');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [quickPhoneVal, setQuickPhoneVal] = useState('');

  const handleSaveQuickPhone = async () => {
    if (!quickPhoneVal.trim() || !user || !activeSeller) return;
    try {
      const updatedProfile = {
        ...sellerFullProfile,
        businessName: sellerFullProfile?.businessName || `${user.name || 'My'}'s Boutique`,
        contactPhone: quickPhoneVal.trim(),
        rating: sellerFullProfile?.rating ?? 4.8,
        bio: sellerFullProfile?.bio ?? 'Verified direct distributor and local boutique.',
        address: sellerFullProfile?.address ?? user.address ?? '',
        location: sellerFullProfile?.location ?? user.city ?? 'Erbil'
      };
      await db.addSellerProfile(updatedProfile, user.id);
      
      // Update active seller state
      setActiveSeller(prev => prev ? { ...prev, phone: quickPhoneVal.trim() } : null);
      setSellerFullProfile(prev => prev ? { ...prev, contactPhone: quickPhoneVal.trim() } : null);
      
      // Update user state if matched
      const updatedUser: User = {
        ...user,
        phone: quickPhoneVal.trim()
      };
      await db.saveCurrentUser(updatedUser);
      
      setQuickPhoneVal('');
      
      if (onTriggerPet) {
        onTriggerPet();
      }
    } catch (err) {
      console.error("Error saving quick phone number:", err);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isSellerTyping]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'item' | 'all' | 'video' | 'primary' | 'gallery' | 'my-post' | null>(null);
  const [deleteTargetIdx, setDeleteTargetIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectingItem, setSelectingItem] = useState<MarketplaceItem | null>(null);
  const [directBuyUseLoyalty, setDirectBuyUseLoyalty] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [isFollowingSelectingSeller, setIsFollowingSelectingSeller] = useState(false);
  const [selectingSellerFollowersCount, setSelectingSellerFollowersCount] = useState(0);

  useEffect(() => {
    db.getUsers().then(u => setAllUsersList(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectingItem) {
      setIsFollowingSelectingSeller(false);
      setSelectingSellerFollowersCount(0);
      return;
    }
    const sellerId = selectingItem.userId || selectingItem.sellerId;
    if (!sellerId) return;
    db.getSellerProfile(sellerId).then(prof => {
      const followers = prof?.followers || [];
      setSelectingSellerFollowersCount(followers.length);
      setIsFollowingSelectingSeller(Boolean(user && followers.includes(user.id)));
    });
  }, [selectingItem, user?.id]);

  const handleToggleFollowSelectingSeller = async () => {
    if (!selectingItem) return;
    const sellerId = selectingItem.userId || selectingItem.sellerId;
    if (!sellerId) return;
    if (!user) {
      onRequireAuth(() => handleToggleFollowSelectingSeller());
      return;
    }
    const willFollow = !isFollowingSelectingSeller;
    if (willFollow) {
      requestPushNotificationPermission();
    }
    const updated = await db.toggleFollowSeller(sellerId, user.id);
    const nowFollowing = updated.includes(user.id);
    setIsFollowingSelectingSeller(nowFollowing);
    setSelectingSellerFollowersCount(updated.length);

    setToast({
      message: nowFollowing
        ? (i18n.language === 'ku' ? `تۆ ئێستا شوێنکەوتووی فرۆشگای (${selectingItem.userName})یت! بە هاتنی هەر بەرهەمێکی نوێ ئاگاداری دەستبەجێت بۆ دێت 🔔` : i18n.language === 'ar' ? `أنت الآن تتابع (${selectingItem.userName})! ستتلقى إشعارات فورية عند إضافة منتجات جديدة 🔔` : `You are now following ${selectingItem.userName}! You'll receive instant push alerts on new products 🔔`)
        : (i18n.language === 'ku' ? 'شوێنکەوتنی فرۆشگا لابرا' : i18n.language === 'ar' ? 'تم إلغاء متابعة المتجر' : 'Unfollowed store'),
      type: nowFollowing ? 'success' : 'info'
    });
  };

  useEffect(() => {
    if (targetSelectedItemId) {
      const match = items.find(i => i.id === targetSelectedItemId);
      if (match) {
        setSelectingItem(match);
      } else {
        db.getItem(targetSelectedItemId).then(it => {
          if (it) setSelectingItem(it);
        });
      }
      onClearTargetSelectedItemId?.();
    }
  }, [targetSelectedItemId, items]);

  useEffect(() => {
    const handleOpenItemEvent = (e: any) => {
      const itemId = e?.detail?.itemId;
      if (itemId) {
        const match = items.find(i => i.id === itemId);
        if (match) {
          setSelectingItem(match);
        } else {
          db.getItem(itemId).then(it => {
            if (it) setSelectingItem(it);
          });
        }
      }
    };
    window.addEventListener('payv_open_item', handleOpenItemEvent);
    return () => window.removeEventListener('payv_open_item', handleOpenItemEvent);
  }, [items]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [viewingReviewsItem, setViewingReviewsItem] = useState<MarketplaceItem | null>(null);
  const [editingPriceItem, setEditingPriceItem] = useState<MarketplaceItem | null>(null);
  const [editingFullItem, setEditingFullItem] = useState<MarketplaceItem | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<boolean>(false);

  const [previewImageItem, setPreviewImageItem] = useState<MarketplaceItem | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number>(0);
  const isDarkTheme = theme === 'dark' || theme === 'royal' || theme === 'midnight' || theme === 'tokyo' || theme === 'sunset' || theme === 'aurora' || theme === 'emerald';

  const cardClasses: Record<string, string> = {
    royal: 'bg-gradient-to-b from-[#090f20]/90 via-[#060a16]/92 to-[#04060e]/95 border-amber-400/35 shadow-2xl shadow-black/80 backdrop-blur-xl hover:border-amber-300 text-white',
    dark: 'bg-slate-900/85 border-slate-700/60 shadow-2xl shadow-black/40 backdrop-blur-xl hover:border-slate-500 text-white',
    midnight: 'bg-[#080d1a]/90 border-blue-500/30 shadow-2xl shadow-blue-950/40 backdrop-blur-xl hover:border-blue-400 text-white',
    emerald: 'bg-[#061e16]/90 border-emerald-500/30 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl hover:border-emerald-400 text-white',
    tokyo: 'bg-gradient-to-b from-[#110b2a]/90 via-[#0b071e]/92 to-[#060412]/95 border-indigo-500/40 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl hover:border-teal-400 text-white',
    sunset: 'bg-gradient-to-b from-[#250d22]/90 via-[#19071c]/92 to-[#100313]/95 border-orange-500/40 shadow-2xl shadow-orange-950/50 backdrop-blur-xl hover:border-rose-400 text-white',
    aurora: 'bg-gradient-to-b from-[#08221c]/90 via-[#051612]/92 to-[#030d0a]/95 border-emerald-400/35 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl hover:border-emerald-300 text-emerald-50',
    monochrome: 'bg-white/85 border-2 border-slate-300 shadow-xl shadow-slate-900/5 backdrop-blur-xl hover:border-amber-400 text-slate-950 ring-1 ring-slate-200/50',
    wavy: 'bg-white/75 border-teal-200/80 shadow-xl shadow-teal-900/5 backdrop-blur-xl hover:border-teal-400 text-slate-900',
    rainbow: 'bg-white/75 border-pink-200/80 shadow-xl shadow-indigo-950/5 backdrop-blur-xl hover:border-pink-300 text-slate-900',
    white: 'bg-white/95 border border-slate-200 shadow-md hover:shadow-lg text-slate-900',
    light: 'bg-white/95 border border-slate-200 shadow-md hover:shadow-lg text-slate-900'
  };

  const textPrimary: Record<string, string> = {
    royal: 'text-white font-black drop-shadow-xs',
    dark: 'text-white font-extrabold',
    midnight: 'text-blue-100 font-extrabold',
    emerald: 'text-emerald-100 font-extrabold',
    tokyo: 'text-indigo-100 font-black',
    sunset: 'text-orange-200 font-black',
    aurora: 'text-emerald-100 font-black',
    monochrome: 'text-slate-950 font-black',
    wavy: 'text-slate-900 font-black',
    rainbow: 'text-indigo-950 font-extrabold',
    white: 'text-slate-900 font-black',
    light: 'text-slate-900 font-black'
  };

  const textSecondary: Record<string, string> = {
    royal: 'text-slate-200 font-semibold',
    dark: 'text-slate-400 font-medium',
    midnight: 'text-blue-200/70 font-medium',
    emerald: 'text-emerald-200/70 font-medium',
    tokyo: 'text-slate-400 font-medium',
    sunset: 'text-rose-200/80 font-medium',
    aurora: 'text-emerald-200/70 font-medium',
    monochrome: 'text-slate-700 font-medium',
    wavy: 'text-teal-700/80 font-medium',
    rainbow: 'text-slate-800/80 font-medium',
    white: 'text-slate-600 font-medium',
    light: 'text-slate-600 font-medium'
  };

  const bgSecondary: Record<string, string> = {
    royal: 'bg-[#091124] border-amber-400/30 text-white',
    dark: 'bg-slate-950/70 border-white/10',
    midnight: 'bg-[#050914]/80 border-blue-500/20',
    emerald: 'bg-[#04140e]/80 border-emerald-500/20',
    tokyo: 'bg-slate-950/70 border-indigo-500/30',
    sunset: 'bg-slate-950/70 border-orange-500/30',
    aurora: 'bg-[#04140e]/80 border-emerald-500/20',
    monochrome: 'bg-slate-100 border-slate-300 text-slate-900',
    wavy: 'bg-teal-50/80 border-teal-200',
    rainbow: 'bg-white/40 border-white/20',
    white: 'bg-slate-50 border-slate-200 text-slate-900',
    light: 'bg-slate-50 border-slate-200 text-slate-900'
  };

  const borderSecondary: Record<string, string> = {
    royal: 'border-amber-400/40',
    dark: 'border-slate-700/60',
    midnight: 'border-blue-500/30',
    emerald: 'border-emerald-500/30',
    tokyo: 'border-indigo-500/30',
    sunset: 'border-orange-500/30',
    aurora: 'border-emerald-500/30',
    monochrome: 'border-slate-300',
    wavy: 'border-teal-200/60',
    rainbow: 'border-white/30',
    white: 'border-slate-200',
    light: 'border-slate-200'
  };

  const inputClasses: Record<string, string> = {
    royal: 'bg-[#040714] text-white border-amber-400/50 focus:border-amber-300 placeholder:text-slate-300',
    dark: 'bg-slate-950 text-white border-slate-700 focus:border-indigo-500',
    midnight: 'bg-[#050914] text-blue-100 border-blue-500/40 focus:border-blue-400',
    emerald: 'bg-[#04140e] text-emerald-100 border-emerald-500/40 focus:border-emerald-400',
    tokyo: 'bg-slate-950 text-indigo-100 border-indigo-500/40 focus:border-teal-400',
    sunset: 'bg-slate-950 text-orange-100 border-orange-500/40 focus:border-rose-400',
    aurora: 'bg-[#04140e] text-emerald-100 border-emerald-500/40 focus:border-emerald-400',
    monochrome: 'bg-white text-slate-900 border-slate-300 focus:border-amber-500',
    wavy: 'bg-white text-slate-900 border-teal-200 focus:border-teal-500',
    rainbow: 'bg-white/70 text-slate-900 border-slate-200/80 focus:border-indigo-500',
    white: 'bg-slate-50 text-slate-900 border-slate-300 focus:border-indigo-500',
    light: 'bg-slate-50 text-slate-900 border-slate-300 focus:border-indigo-500'
  };

  const sellerBg: Record<string, string> = {
    royal: 'bg-amber-950/30 group-hover/seller:bg-amber-900/40',
    dark: 'bg-slate-800/50 group-hover/seller:bg-slate-700/60',
    midnight: 'bg-blue-950/40 group-hover/seller:bg-blue-900/50',
    emerald: 'bg-emerald-950/40 group-hover/seller:bg-emerald-900/50',
    tokyo: 'bg-indigo-950/40 group-hover/seller:bg-indigo-900/50',
    sunset: 'bg-orange-950/40 group-hover/seller:bg-orange-900/50',
    aurora: 'bg-emerald-950/40 group-hover/seller:bg-emerald-900/50',
    monochrome: 'bg-slate-100 group-hover/seller:bg-slate-200',
    wavy: 'bg-teal-50 group-hover/seller:bg-teal-100',
    rainbow: 'bg-white/50 group-hover/seller:bg-pink-100/40',
    white: 'bg-slate-100 group-hover/seller:bg-slate-200',
    light: 'bg-slate-100 group-hover/seller:bg-slate-200'
  };

  const sellerText: Record<string, string> = {
    royal: 'text-amber-300 group-hover/seller:text-amber-200',
    dark: 'text-slate-300 group-hover/seller:text-white',
    midnight: 'text-blue-300 group-hover/seller:text-teal-300',
    emerald: 'text-emerald-300 group-hover/seller:text-emerald-200',
    tokyo: 'text-indigo-400 group-hover/seller:text-teal-300',
    sunset: 'text-orange-400 group-hover/seller:text-rose-400',
    aurora: 'text-emerald-300 group-hover/seller:text-emerald-200',
    monochrome: 'text-slate-900 group-hover/seller:text-black',
    wavy: 'text-teal-600 group-hover/seller:text-teal-800',
    rainbow: 'text-slate-600 group-hover/seller:text-pink-600',
    white: 'text-slate-700 group-hover/seller:text-slate-900',
    light: 'text-slate-700 group-hover/seller:text-slate-900'
  };

  const sellerName: Record<string, string> = {
    royal: 'text-amber-100 font-bold group-hover/seller:text-white',
    dark: 'text-white font-bold group-hover/seller:text-slate-200',
    midnight: 'text-blue-100 font-bold group-hover/seller:text-white',
    emerald: 'text-emerald-100 font-bold group-hover/seller:text-white',
    tokyo: 'text-slate-100 font-bold group-hover/seller:text-teal-300',
    sunset: 'text-rose-100 font-bold group-hover/seller:text-orange-300',
    aurora: 'text-emerald-100 font-bold group-hover/seller:text-white',
    monochrome: 'text-slate-900 font-bold group-hover/seller:text-black',
    wavy: 'text-slate-900 font-bold group-hover/seller:text-teal-600',
    rainbow: 'text-slate-800 group-hover/seller:text-pink-950 font-bold',
    white: 'text-slate-800 font-bold group-hover/seller:text-slate-950',
    light: 'text-slate-800 font-bold group-hover/seller:text-slate-950'
  };

  const CATEGORIES = [
    { id: 'all', label: i18n.language === 'ku' ? 'هەموو سەرچاوەکان' : i18n.language === 'ar' ? 'جميع الأقسام' : 'All Sourced' },
    { id: 'resale', label: i18n.language === 'ku' ? '🏷️ داشکاندن' : i18n.language === 'ar' ? '🏷️ تخفيضات وعروض' : '🏷️ Discount & Sale' },
    { id: 'tracking', label: i18n.language === 'ku' ? '📦 بەدواداچوونی داواکاری' : i18n.language === 'ar' ? '📦 تتبع الطلب' : '📦 Track Order' },
    ...(user ? [{ id: 'my-items', label: i18n.language === 'ku' ? '👤 پۆستەکانی من' : i18n.language === 'ar' ? '👤 منتجاتي' : '👤 My Items' }] : []),
    { id: 'factory', label: i18n.language === 'ku' ? '🏭 کارگە' : i18n.language === 'ar' ? '🏭 مصانع وإنتاج' : '🏭 Industrial Factory' },
    { id: 'farm', label: i18n.language === 'ku' ? '🌾 کێڵگە' : i18n.language === 'ar' ? '🌾 مزارع ومنتجات' : '🌾 Farm Agriculture' },
    { id: 'handmade', label: i18n.language === 'ku' ? '🪵 کاری دەستی' : i18n.language === 'ar' ? '🪵 أعمال يدوية' : '🪵 Handmade Craft' },
    { id: 'local', label: i18n.language === 'ku' ? '🏬 پیشەی ناوخۆ' : i18n.language === 'ar' ? '🏬 محلات محلية' : '🏬 Local Boutique' },
    { id: 'offer', label: i18n.language === 'ku' ? '🏷️ ئۆفەری تایبەت' : i18n.language === 'ar' ? '🏷️ عروض خاصة' : '🏷️ Special Offer' },
    { id: 'wholesale', label: i18n.language === 'ku' ? '📦 کۆفرۆش' : i18n.language === 'ar' ? '📦 جملة وتوزيع' : '📦 Wholesale Market' }
  ];

  useEffect(() => {
    loadItems(true);

    const handleItemAdded = (e?: any) => {
      const addedItem = e?.detail as MarketplaceItem | undefined;
      if (addedItem && addedItem.id) {
        setItems(prev => {
          if (prev.some(i => i.id === addedItem.id)) return prev;
          return [addedItem, ...prev];
        });
      }
      loadItems(true);
    };
    const handleUserVerified = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const targetUserId = detail.id || detail.userId;
      const verified = detail.isVerified;
      const perfectSeller = detail.isPerfectSeller;
      const trustedSeller = detail.isTrustedSeller;
      if (targetUserId) {
        setItems(prev => prev.map(item => {
          if (item.userId === targetUserId || item.sellerId === targetUserId) {
            const updated = { ...item };
            if (verified !== undefined) {
              updated.isVerified = verified;
              updated.userVerified = verified;
            }
            if (perfectSeller !== undefined) {
              updated.isPerfectSeller = perfectSeller;
              updated.userPerfectSeller = perfectSeller;
            }
            if (trustedSeller !== undefined) {
              updated.isTrustedSeller = trustedSeller;
              updated.userTrustedSeller = trustedSeller;
            }
            return updated;
          }
          return item;
        }));
        setActiveSeller(prev => (prev && prev.id === targetUserId) ? { 
          ...prev, 
          ...(verified !== undefined ? { isVerified: verified } : {}),
          ...(perfectSeller !== undefined ? { isPerfectSeller: perfectSeller } : {}),
          ...(trustedSeller !== undefined ? { isTrustedSeller: trustedSeller } : {})
        } : prev);
        setSellerFullProfile(prev => (prev && (prev.id === targetUserId || prev.uid === targetUserId)) ? { 
          ...prev, 
          ...(verified !== undefined ? { isVerified: verified } : {}),
          ...(perfectSeller !== undefined ? { isPerfectSeller: perfectSeller } : {}),
          ...(trustedSeller !== undefined ? { isTrustedSeller: trustedSeller } : {})
        } : prev);
      }
    };

    window.addEventListener('payv_item_added', handleItemAdded);
    window.addEventListener('storage', handleItemAdded);
    window.addEventListener('payv_user_verified', handleUserVerified as EventListener);
    window.addEventListener('payv_seller_perfect_updated', handleUserVerified as EventListener);
    window.addEventListener('payv_seller_trusted_updated', handleUserVerified as EventListener);
    window.addEventListener('payv_user_updated', handleUserVerified as EventListener);

    const unsubscribeLive = db.onLiveSessionsChange((sessions) => {
      setActiveLiveSessions(sessions);
    });

    return () => {
      unsubscribeLive();
      window.removeEventListener('payv_item_added', handleItemAdded);
      window.removeEventListener('storage', handleItemAdded);
      window.removeEventListener('payv_user_verified', handleUserVerified as EventListener);
      window.removeEventListener('payv_user_updated', handleUserVerified as EventListener);
    };
  }, []);

  // Handle live session details and comments
  useEffect(() => {
    if (!selectedLiveSession) {
      setLiveComments([]);
      setPinnedProduct(null);
      setViewerCount(0);
      return;
    }

    const unsubSession = db.onLiveSessionUpdate(selectedLiveSession.id, (session) => {
      if (session && session.status === 'ended') {
        setSelectedLiveSession(null);
        setToast({ message: i18n.language === 'ku' ? 'ئەم پەخشە کۆتایی هاتوە' : i18n.language === 'ar' ? 'انتهى هذا البث المباشر' : 'This live session has ended', type: 'info' });
        return;
      }
      if (session) {
        setSelectedLiveSession(session);
        setViewerCount(session.viewerCount || 1);
        
        if (session.pinnedProductId) {
          db.getMarketplaceItems().then(items => {
            const product = items.find(i => i.id === session.pinnedProductId);
            if (product) setPinnedProduct(product);
          });
        } else {
          setPinnedProduct(null);
        }
      }
    });

    const unsubComments = db.onLiveCommentsChange(selectedLiveSession.id, (comments) => {
      if (comments && comments.length > 0) {
        setLiveComments(comments);
      }
    });

    return () => {
      unsubSession();
      unsubComments();
    };
  }, [selectedLiveSession?.id, i18n.language]);

  // Manage viewer count joining/leaving
  useEffect(() => {
    if (selectedLiveSession?.id) {
      db.updateLiveViewerCount(selectedLiveSession.id, 1);
      return () => {
        db.updateLiveViewerCount(selectedLiveSession.id, -1);
      };
    }
  }, [selectedLiveSession?.id]);

  const loadItems = async (isInitial = false) => {
    try {
      if (isInitial) {
        // Only trigger blocking skeleton if we truly have 0 items rendered
        if (items.length === 0) {
          setLoading(true);
        }
        setHasMore(true);
        setLastVisible(null);
      } else {
        setLoadingMore(true);
      }

      let newItems: MarketplaceItem[] = [];
      let lastDoc: any = null;

      if (searchQuery.trim() !== '') {
        newItems = await db.getMarketplaceItems(isInitial);
        setHasMore(false);
      } else {
        if (!isInitial && !lastVisible) {
          setLoadingMore(false);
          return;
        }
        const res = await db.getMarketplaceItemsPaginated(
          12, 
          isInitial ? undefined : (lastVisible || undefined),
          'marketplace',
          isInitial
        );
        newItems = res.items;
        lastDoc = res.lastDoc;
      }

      if (isInitial) {
        setItems(newItems);
      } else {
        setItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const uniqueNew = newItems.filter(i => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      setLastVisible(lastDoc);
      if (searchQuery.trim() === '' && newItems.length < 12) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading items:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleReviewAdded = async () => {
    // Refresh items to get updated review counts and ratings
    await loadItems(true);
    // If selectingItem is active, update it from the new items list
    if (selectingItem) {
      const items = await db.getMarketplaceItems();
      const updated = items.find(i => i.id === selectingItem.id);
      if (updated) {
        setSelectingItem(updated);
      }
    }
  };

  const handleOpenSellerProfile = async (sellerId: string, fallbackInfo?: { name?: string; phone?: string; avatar?: string; location?: string; isVerified?: boolean }) => {
    try {
      const [sellerProfile, targetUser] = await Promise.all([
        db.getSellerProfile(sellerId).catch(() => null),
        db.getUserById(sellerId).catch(() => null)
      ]);

      const isVerified = Boolean(sellerProfile?.isVerified || targetUser?.isVerified || fallbackInfo?.isVerified);
      const isUserPublic = targetUser?.isPublic !== false;
      const name = sellerProfile?.businessName || targetUser?.name || fallbackInfo?.name || 'Seller';
      const phone = sellerProfile?.contactPhone || targetUser?.phone || fallbackInfo?.phone;
      const avatar = sellerProfile?.logoUrl || targetUser?.avatar || fallbackInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerId}`;
      const bio = sellerProfile?.bio || targetUser?.bio || '';
      const city = sellerProfile?.location || targetUser?.city || 'Kurdistan';
      const category = targetUser?.category || (sellerProfile as any)?.category || 'Direct Merchant';
      const username = targetUser?.username || name.toLowerCase().replace(/\s+/g, '_');
      const followers = sellerProfile?.followers || [];

      setSellerFullProfile(sellerProfile ? { ...sellerProfile, isVerified } : {
        id: sellerId,
        businessName: name,
        contactPhone: phone,
        logoUrl: avatar,
        bio: bio,
        location: city,
        followers: followers,
        rating: 4.8,
        isVerified
      });

      if (onOpenSellerProfile) {
        onOpenSellerProfile(sellerId, {
          name,
          phone,
          avatar,
          username,
          bio,
          location: city,
          isPublic: isUserPublic,
          followers,
          isVerified
        });
        return;
      }

      setActiveSeller({
        id: sellerId,
        name,
        phone,
        avatar,
        username,
        bio,
        city,
        category,
        isPublic: isUserPublic,
        followers,
        isVerified
      });

      setSellerModalTab('posts');
      if (onOpenSeller) onOpenSeller(sellerId);
    } catch (err) {
      console.error("Error opening seller profile:", err);
    }
  };

  const activeSellerPosts = useMemo(() => {
    if (!activeSeller) return [];
    const allKnownItems = db.getCachedMarketplaceItems();
    const sourcePool = allKnownItems.length > 0 ? allKnownItems : items;
    return sourcePool.filter(item => 
      (item.userId === activeSeller.id || item.sellerId === activeSeller.id) && !item.isArchived
    );
  }, [items, activeSeller?.id]);

  const handleContactSeller = async (sellerId: string, itemContext?: { id: string; title: string; imageUrl?: string; price: number }) => {
    const currentUser = userRef.current;
    if (!currentUser) {
      onRequireAuth(() => handleContactSeller(sellerId, itemContext));
      return;
    }

    if (onOpenMessaging) {
      onOpenMessaging(sellerId, itemContext);
      return;
    }
    
    try {
      const sellerProfile = await db.getSellerProfile(sellerId);
      const targetUser = await db.getUserById(sellerId);
      const avatarUrl = sellerProfile?.logoUrl || targetUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerId}`;
      const isUserPublic = targetUser?.isPublic !== false;
      const name = sellerProfile?.businessName || targetUser?.name || 'Seller';
      const phone = sellerProfile?.contactPhone || targetUser?.phone;
      const bio = sellerProfile?.bio || targetUser?.bio || '';
      const city = sellerProfile?.location || targetUser?.city || 'Kurdistan';
      const category = targetUser?.category || (sellerProfile as any)?.category || 'Direct Merchant';
      const username = targetUser?.username || name.toLowerCase().replace(/\s+/g, '_');
      const followers = sellerProfile?.followers || [];

      setSellerFullProfile(sellerProfile || {
        id: sellerId,
        businessName: name,
        contactPhone: phone,
        logoUrl: avatarUrl,
        bio: bio,
        location: city,
        followers: followers,
        rating: 4.8
      });

      setActiveSeller({
        id: sellerId,
        name,
        phone,
        avatar: avatarUrl,
        username,
        bio,
        city,
        category,
        isPublic: isUserPublic,
        followers
      });
      setSellerModalTab('chat');
    } catch (err) {
      console.error("Error fetching seller profile:", err);
    }
  };

  useEffect(() => {
    const currentUser = userRef.current;
    if (activeSeller && sellerModalTab === 'chat' && currentUser) {
      const unsub = db.subscribeToMessages(currentUser.id, activeSeller.id, (msgs) => {
        setChatMessages(msgs);
      });
      return () => unsub();
    }
  }, [activeSeller?.id, sellerModalTab]);

  const handleChatImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string) || '';
        if (base64) {
          const compressed = await compressBase64Image(base64, 1000, 0.85);
          setChatImage(compressed || base64);
        }
        setChatImageUploading(false);
      };
      reader.onerror = () => {
        setChatImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to read chat image:", err);
      setChatImageUploading(false);
    } finally {
      e.target.value = '';
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (typeof customText === 'string' ? customText : newMessageText).trim();
    if ((!textToSend && !chatImage) || !activeSeller) return;
    const currentUser = userRef.current;
    if (!currentUser) {
      onRequireAuth(() => handleSendMessage(textToSend));
      return;
    }
    
    const optimisticMsg: ChatMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: [currentUser.id, activeSeller.id].sort().join('_'),
      senderId: currentUser.id,
      recipientId: activeSeller.id,
      text: textToSend,
      imageUrl: chatImage || undefined,
      createdAt: Date.now()
    };

    setChatMessages(prev => [...prev, optimisticMsg]);
    setNewMessageText('');
    setChatImage(null);

    try {
      await db.sendChatMessage({
        senderId: currentUser.id,
        recipientId: activeSeller.id,
        text: textToSend,
        imageUrl: optimisticMsg.imageUrl,
        createdAt: optimisticMsg.createdAt
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const toggleLike = async (id: string) => {
    const currentUser = userRef.current;
    if (!currentUser) {
      onRequireAuth(() => toggleLike(id));
      return;
    }
    
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const likes = item.likes || [];
        const isLiked = likes.includes(currentUser.id);
        return {
          ...item,
          likes: isLiked ? likes.filter(uid => uid !== currentUser.id) : [...likes, currentUser.id]
        };
      }
      return item;
    }));

    try {
      await db.toggleMarketplaceLike(id, currentUser.id);
    } catch (err) {
      console.error('Error toggling like:', err);
      loadItems();
    }
  };

  const toggleSave = async (id: string) => {
    const currentUser = userRef.current;
    if (!currentUser) {
      onRequireAuth(() => toggleSave(id));
      return;
    }

    const targetItem = items.find(i => i.id === id);
    const wasSaved = targetItem?.saves?.includes(currentUser.id);
    const isKurdishLang = i18n.language === 'ku';
    const isArabicLang = i18n.language === 'ar';

    if (wasSaved) {
      setToast({
        message: isKurdishLang ? 'لابرا لە لیستی چاودێری' : isArabicLang ? 'تمت الإزالة من قائمة المراقبة' : 'Removed from Watchlist',
        type: 'success'
      });
    } else {
      setToast({
        message: isKurdishLang ? 'زیادکرا بۆ لیستی چاودێری 🔔 کاتێک نرخەکەی گۆڕدرا ئاگادار دەکرێیتەوە' : isArabicLang ? 'تمت الإضافة إلى قائمة المراقبة 🔔 سيتم إشعارك عند تحديث السعر!' : 'Added to Watchlist 🔔 You will be notified when price updates!',
        type: 'success'
      });
    }

    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const saves = item.saves || [];
        const isSaved = saves.includes(currentUser.id);
        return {
          ...item,
          saves: isSaved ? saves.filter(uid => uid !== currentUser.id) : [...saves, currentUser.id]
        };
      }
      return item;
    }));

    try {
      await db.toggleMarketplaceSave(id, currentUser.id);
    } catch (err) {
      console.error('Error toggling save:', err);
      loadItems();
    }
  };

  const togglePriceWatch = async (id: string) => {
    const currentUser = userRef.current || user;
    const effectiveUserId = currentUser?.id || 'guest';
    const targetItem = items.find(i => i.id === id);
    const wasWatched = Boolean(
      (currentUser?.id && targetItem?.priceWatchers?.includes(currentUser.id)) ||
      targetItem?.priceWatchers?.includes('guest') ||
      db.isUserPriceWatching(id, effectiveUserId)
    );
    const isKurdishLang = i18n.language === 'ku';
    const isArabicLang = i18n.language === 'ar';

    if (wasWatched) {
      setToast({
        message: isKurdishLang ? '🔕 چاودێری نرخ ناچالاککرا' : isArabicLang ? '🔕 تم إلغاء مراقبة السعر' : '🔕 Price Watch disabled',
        type: 'info'
      });
    } else {
      setToast({
        message: isKurdishLang 
          ? '🔔 چاودێری نرخ چالاککرا! بە دابەزینی نرخ ڕاستەوخۆ ئاگاداریت پێدەگات' 
          : isArabicLang 
          ? '🔔 تم تفعيل مراقبة السعر! ستتلقى إشعاراً عند انخفاض السعر' 
          : '🔔 Price Watch active! You will be alerted on any price drop',
        type: 'success'
      });
    }

    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const watchers = item.priceWatchers || [];
        const isSubbed = watchers.includes(effectiveUserId);
        return {
          ...item,
          priceWatchers: isSubbed 
            ? watchers.filter(uid => uid !== effectiveUserId) 
            : [...watchers, effectiveUserId]
        };
      }
      return item;
    }));

    try {
      await db.togglePriceWatch(id, effectiveUserId);
    } catch (err) {
      console.error('Error toggling price watch:', err);
      loadItems();
    }
  };

  const addToCart = async (item: MarketplaceItem, size?: string, color?: string, bypass = false) => {
    const currentUser = userRef.current || user;
    const targetUserId = currentUser?.id || 'guest';

    // Real choice exists only if there are 2 or more distinct sizes/colors, or custom sizes that aren't generic
    const validSizes = (item.sizes || []).map(s => s?.trim()).filter(Boolean);
    const validColors = (item.colors || []).map(c => c?.trim()).filter(Boolean);

    const isGenericSize = (s?: string) => !s || s === 'قەبارەی ئاسایی' || s === 'Standard' || s === 'ئاسایی';
    const hasRealSizeChoice = validSizes.length > 1 || (validSizes.length === 1 && !isGenericSize(validSizes[0]));
    const hasRealColorChoice = validColors.length > 1;

    const needsSize = hasRealSizeChoice && !size;
    const needsColor = hasRealColorChoice && !color;

    if (!bypass && (needsSize || needsColor)) {
      setSelectingItem(item);
      // Explicitly set defaults if not provided
      const defaultSize = size || validSizes[0] || '';
      const defaultColor = color || validColors[0] || '';
      
      setSelectedSize(defaultSize);
      setSelectedColor(defaultColor);
      return;
    }

    const chosenSize = size || selectedSize || validSizes[0] || (item.sizes && item.sizes.filter(Boolean)[0]) || 'قەبارەی ئاسایی';
    const chosenColor = color || selectedColor || validColors[0] || (item.colors && item.colors.filter(Boolean)[0]) || '';

    setSelectingItem(null);
    setToast({ message: i18n.language === 'ku' ? `زیادکرا بۆ سەبەتە: ${item.title}` : i18n.language === 'ar' ? `تمت الإضافة إلى السلة: ${item.title}` : `Added ${item.title} to basket!`, type: 'success' });

    try {
      await db.addToBasket(targetUserId, item, chosenSize, chosenColor);
      window.dispatchEvent(new CustomEvent('cart_updated'));
      await db.updateDailyAnalytics(item.userId, { sales: 1, revenue: item.price });
    } catch (error) {
      console.error("Error adding to basket:", error);
      setToast({ message: i18n.language === 'ku' ? 'نەتوانرا زیاد بکرێت بۆ سەبەتە. تکایە دووبارە هەوڵبدەرەوە.' : i18n.language === 'ar' ? 'فشل في الإضافة إلى السلة. يرجى المحاولة مرة أخرى.' : "Failed to add to basket. Please try again.", type: 'error' });
    }
  };

  const [seenItems] = useState(new Set<string>());

  const trackItemView = useCallback(async (sellerId: string, itemId: string, category: string) => {
    if (seenItems.has(itemId)) return;
    seenItems.add(itemId);
    try {
      await db.updateDailyAnalytics(sellerId, { views: 1, uniqueVisitors: 1 });
      const currentUser = userRef.current;
      if (currentUser) {
        await db.trackInteraction(currentUser.id, category, 'view', sellerId);
      }
    } catch (error) {
      console.error("Error tracking item view:", error);
    }
  }, [seenItems]);

  const handleImageDelete = async (itemId: string, url: string) => {
    const targetItem = items.find(i => i.id === itemId) || (selectingItem?.id === itemId ? selectingItem : null);
    const isOwner = Boolean(user && user.id && targetItem && (targetItem.userId === user.id || targetItem.sellerId === user.id));
    if (!isOwner && !isAdmin) {
      setToast({ message: i18n.language === 'ku' ? 'تەنها دەتوانی وێنەی پۆستی خۆت بسڕیتەوە' : i18n.language === 'ar' ? 'يمكنك فقط حذف صور منشوراتك الخاصة!' : 'You can only delete images from your own posts!', type: 'error' });
      return;
    }

    try {
      await db.deleteItemImage(itemId, url);
      setToast({ message: i18n.language === 'ku' ? "وێنەکە سڕایەوە" : i18n.language === 'ar' ? "تم حذف الصورة بنجاح!" : "Image deleted successfully!", type: "success" });
      
      // Update local state lists in Marketplace
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updatedImageUrls = (item.imageUrls || []).filter(u => u !== url);
          const nextPrimary = item.imageUrl === url ? (updatedImageUrls[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80') : item.imageUrl;
          return {
            ...item,
            imageUrl: nextPrimary,
            imageUrls: updatedImageUrls
          };
        }
        return item;
      }));

      // Update selectingItem modal state so it reflects the deletion
      setSelectingItem(prev => {
        if (prev && prev.id === itemId) {
          const updatedImageUrls = (prev.imageUrls || []).filter(u => u !== url);
          const nextPrimary = prev.imageUrl === url ? (updatedImageUrls[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80') : prev.imageUrl;
          return {
            ...prev,
            imageUrl: nextPrimary,
            imageUrls: updatedImageUrls
          };
        }
        return prev;
      });

      if (onTriggerPet) onTriggerPet();
    } catch (e) {
      console.error("Error deleting image:", e);
      setToast({ message: i18n.language === 'ku' ? 'سڕینەوەی وێنە سەرکەوتوو نەبوو' : i18n.language === 'ar' ? 'فشل حذف الصورة' : "Failed to delete image.", type: "error" });
    }
  };

  const handleVideoDelete = async (itemId: string) => {
    const targetItem = items.find(i => i.id === itemId) || (selectingItem?.id === itemId ? selectingItem : null);
    const isOwner = Boolean(user && user.id && targetItem && (targetItem.userId === user.id || targetItem.sellerId === user.id));
    if (!isOwner && !isAdmin) {
      setToast({ message: i18n.language === 'ku' ? 'تەنها دەتوانی ڤیدیۆی پۆستی خۆت بسڕیتەوە' : i18n.language === 'ar' ? 'يمكنك فقط حذف فيديو منشورك الخاص!' : 'You can only delete videos from your own posts!', type: 'error' });
      return;
    }

    try {
      await db.deleteItemVideo(itemId);
      setToast({ message: i18n.language === 'ku' ? "ڤیدیۆکە سڕایەوە" : i18n.language === 'ar' ? "تم حذف الفيديو بنجاح!" : "Video deleted successfully!", type: "success" });
      
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return { ...item, videoUrl: undefined };
        }
        return item;
      }));

      setSelectingItem(prev => {
        if (prev && prev.id === itemId) {
          return { ...prev, videoUrl: undefined };
        }
        return prev;
      });

      if (onTriggerPet) onTriggerPet();
    } catch (e) {
      console.error("Error deleting video:", e);
      setToast({ message: i18n.language === 'ku' ? 'سڕینەوەی ڤیدیۆ سەرکەوتوو نەبوو' : i18n.language === 'ar' ? 'فشل حذف الفيديو' : "Failed to delete video.", type: "error" });
    }
  };

  const handleDelete = async (itemId: string) => {
    setDeleteId(itemId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    const action = deleteAction;
    const targetId = deleteId;
    
    setDeleteId(null);
    setDeleteAction(null);

    try {
      if (action === 'all') {
        if (!isAdmin) {
          setToast({ message: i18n.language === 'ku' ? 'تەنها ئەدمین دەتوانێت هەموو پۆستەکان بسڕێتەوە' : i18n.language === 'ar' ? 'المسؤولون فقط يمكنهم مسح جميع المنشورات' : 'Only admins can clear all posts', type: 'error' });
          return;
        }
        const count = await db.deleteAllMarketplaceItems();
        setToast({ 
          message: i18n.language === 'ku' ? `${count} پۆست سڕایەوە` : i18n.language === 'ar' ? `تم مسح ${count} منشور بنجاح` : `${count} posts cleared successfully`, 
          type: 'success' 
        });
        loadItems(true);
        if (onTriggerPet) onTriggerPet();
        return;
      }

      if (action === 'video') {
        await handleVideoDelete(targetId);
        return;
      }

      if (action === 'primary') {
        if (selectingItem) {
          await handleImageDelete(selectingItem.id, selectingItem.imageUrl);
        }
        return;
      }

      if (action === 'gallery') {
        if (selectingItem) {
          await handleImageDelete(selectingItem.id, targetId); // targetId is the URL
        }
        return;
      }

      if (action === 'my-post' || !action) {
        let targetItem = items.find(i => i.id === targetId) || (selectingItem?.id === targetId ? selectingItem : null);
        if (!targetItem) {
          try {
            const allItems = await db.getMarketplaceItems();
            targetItem = allItems.find(i => i.id === targetId) || null;
          } catch (e) {}
        }

        const isOwner = Boolean(
          user && targetItem && (
            (user.id && (targetItem.userId === user.id || targetItem.sellerId === user.id)) ||
            (user.phone && targetItem.sellerPhone && user.phone.replace(/\D/g, '') === targetItem.sellerPhone.replace(/\D/g, '')) ||
            (user.name && targetItem.userName && user.name.trim().toLowerCase() === targetItem.userName.trim().toLowerCase()) ||
            (user.username && targetItem.userName && user.username.trim().toLowerCase() === targetItem.userName.trim().toLowerCase())
          )
        );

        if (!isOwner) {
          setToast({
            message: i18n.language === 'ku'
              ? 'تەنها دەتوانیت پۆستی خۆت بسڕیتەوە! هەر بەکارهێنەرێک تایبەتمەندی و پۆستی خۆی دەپارێزێت و کەس ناتوانێت پۆستی کەس بسڕێتەوە.'
              : i18n.language === 'ar'
              ? 'يمكنك فقط حذف منشورك الخاص! كل مستخدم مسؤول عن منشوره ولا يمكن لأحد حذف منشور الآخر.'
              : 'You can only delete your own posts! Each user is responsible for their own post.',
            type: 'error'
          });
          return;
        }
        setItems(prev => prev.filter(item => item.id !== targetId));
        await db.deleteMarketplaceItem(targetId);
        setToast({
          message: i18n.language === 'ku' ? 'پۆستەکەت بە سەرکەوتوویی سڕایەوە' : i18n.language === 'ar' ? 'تم حذف منشورك بنجاح' : 'Your post was deleted successfully',
          type: 'success'
        });
        setSelectingItem(null);
        loadItems(true);
        return;
      }
    } catch (err) {
      setToast({ message: i18n.language === 'ku' ? 'کردارەکە سەرکەوتوو نەبوو' : i18n.language === 'ar' ? 'فشلت العملية' : 'Operation failed', type: 'error' });
      console.error("Delete failed:", err);
      loadItems();
    }
  };

  const handleShare = async (item: MarketplaceItem) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?item=${item.id}`;
    const shareText = `🌟 Check out this ${item.title} on E-BAZIRGAN Marketplace!\n\n💰 Price: ${item.price.toLocaleString()} Dinar\n📍 Location: ${item.location}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Error sharing:', err);
          // Fallback to clipboard if share fails for reasons other than user cancel
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    await safeCopyToClipboard(text);
    setToast({ 
      message: i18n.language === 'ku' ? 'بەستەرەکە کۆپی کرا بۆ کلیپبۆرد!' : i18n.language === 'ar' ? 'تم نسخ الرابط إلى الحافظة!' : 'Link copied to clipboard!', 
      type: 'success' 
    });
  };

  const isAdmin = checkIsAdmin(user);
  const [banConfirmUser, setBanConfirmUser] = useState<{ id: string; name: string } | null>(null);

  const handleBanUser = (targetUserId: string, targetName: string) => {
    setBanConfirmUser({ id: targetUserId, name: targetName });
  };

  const confirmBanUser = async () => {
    if (!banConfirmUser) return;
    const { id: targetUserId, name: targetName } = banConfirmUser;
    setBanConfirmUser(null);

    try {
      await db.deleteAccount(targetUserId);
      setItems(prev => prev.filter(i => i.userId !== targetUserId && i.sellerId !== targetUserId));
      setActiveSeller(null);
      setToast({
        message: i18n.language === 'ku' ? `هەژماری (${targetName}) بە سەرکەوتوویی سڕایەوە و بایکۆت کرا.` : i18n.language === 'ar' ? `تم حذف حساب (${targetName}) وحظره بنجاح.` : `Account (${targetName}) deleted and banned.`,
        type: 'success'
      });
    } catch (e) {
      console.error(e);
      setToast({
        message: i18n.language === 'ku' ? 'کێشەیەک ڕوویدا لە سڕینەوە' : i18n.language === 'ar' ? 'حدث خطأ أثناء حذف الحساب' : 'Error deleting account',
        type: 'error'
      });
    }
  };

  const handleBumpItem = async (itemToBump: MarketplaceItem) => {
    try {
      setBumpingItemId(itemToBump.id);
      const res = await db.bumpMarketplaceItem(itemToBump.id);
      if (res.success && res.updatedItem) {
        setItems(prev => prev.map(item => item.id === itemToBump.id ? res.updatedItem! : item));
        setToast({
          message: i18n.language === 'ku' ? res.messageKu : (i18n.language === 'ar' ? (res.messageAr || res.messageKu || res.message) : res.message),
          type: 'success'
        });
        if (onTriggerPet) onTriggerPet();
      } else {
        setToast({
          message: i18n.language === 'ku' ? res.messageKu : (i18n.language === 'ar' ? (res.messageAr || res.messageKu || res.message) : res.message),
          type: 'error'
        });
      }
    } catch (err) {
      console.error("Error bumping item:", err);
      setToast({
        message: i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە بەرزکردنەوەی پۆستەکە' : i18n.language === 'ar' ? 'حدث خطأ أثناء ترقية المنشور' : 'Error bumping post',
        type: 'error'
      });
    } finally {
      setBumpingItemId(null);
    }
  };

  const handleBoostItem = async (itemToBoost: MarketplaceItem) => {
    try {
      setBumpingItemId(itemToBoost.id);
      const updated = await db.boostMarketplaceItem(itemToBoost.id, 7);
      if (updated) {
        setItems(prev => prev.map(item => item.id === itemToBoost.id ? updated : item));
        setToast({
          message: i18n.language === 'ku'
            ? '🔥 پۆستەکەت بە هەڵبژێردراوی VIP جێگیرکرا و لە سەرەوەی عێراق دەردەکەوێت بۆ ماوەی ٧ ڕۆژ!'
            : i18n.language === 'ar'
            ? '🔥 تم تثبيت منشورك كـ VIP في صدارة العراق لمدة 7 أيام!'
            : '🔥 Post boosted as VIP across all Iraq for 7 days!',
          type: 'success'
        });
        if (onTriggerPet) onTriggerPet();
      }
    } catch (err) {
      console.error("Error boosting item:", err);
    } finally {
      setBumpingItemId(null);
    }
  };

  const filteredItems = useMemo(() => {
    let result = displayItems.filter(item => {
      const isMarketplace = !item.postType || item.postType === 'marketplace' || item.postType === 'sourcing' || item.postType === 'all';
      const isOwnerOfItem = Boolean(user && user.id && (item.userId === user.id || item.sellerId === user.id));
      const canViewResale = Boolean(item.resalePrice && Number(item.resalePrice) > 0 && (item.showResalePriceToPublic || isOwnerOfItem || isAdmin));
      const matchesCategory = activeCategory === 'all' || 
                             (activeCategory === 'my-items' && user && (item.userId === user.id || item.sellerId === user.id || (isAdmin && item.userId === 'sandbox-id'))) ||
                             (activeCategory === 'resale' && (canViewResale || item.category === 'resale')) ||
                             item.category === activeCategory;
      const sq = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !sq || 
        (item.title?.toLowerCase() || '').includes(sq) || 
        (item.description?.toLowerCase() || '').includes(sq) ||
        (item.sellerName?.toLowerCase() || '').includes(sq) ||
        (item.userName?.toLowerCase() || '').includes(sq) ||
        (item.sellerId?.toLowerCase() || '') === sq ||
        (item.userId?.toLowerCase() || '') === sq ||
        (item.brand?.toLowerCase() || '').includes(sq) ||
        (item.category?.toLowerCase() || '').includes(sq);
      
      const isVisible = item.isPublic !== false || isOwnerOfItem;
      const isApproved = item.moderationStatus !== 'rejected';
      
      const itemLoc = (item.location || '').toLowerCase();
      const selCity = (selectedCity || 'all').toLowerCase();
      const matchesCity = selCity === 'all' || 
                          !itemLoc || 
                          itemLoc.includes(selCity) ||
                          selCity.includes(itemLoc) ||
                          (selCity.includes('erbil') && (itemLoc.includes('هەولێر') || itemLoc.includes('أربيل') || itemLoc.includes('hawler'))) ||
                          (selCity.includes('sulaymaniyah') && (itemLoc.includes('سلێمانی') || itemLoc.includes('السليمانية') || itemLoc.includes('slemani'))) ||
                          (selCity.includes('duhok') && (itemLoc.includes('دهۆک') || itemLoc.includes('دهوك') || itemLoc.includes('dohuk'))) ||
                          (selCity.includes('kirkuk') && (itemLoc.includes('کەرکووک') || itemLoc.includes('كركوك')));

      return isMarketplace && matchesCategory && matchesSearch && isVisible && isApproved && matchesCity;
    });

    if (sortOption === 'algorithm') {
      return rankMarketplaceItems(result, selectedCity);
    }

    return [...result].sort((a, b) => {
      if (sortOption === 'bumped') {
        const aTime = a.lastBumpedAt || a.createdAt || 0;
        const bTime = b.lastBumpedAt || b.createdAt || 0;
        return bTime - aTime;
      } else if (sortOption === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      } else if (sortOption === 'popular') {
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      } else if (sortOption === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      } else if (sortOption === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });
  }, [displayItems, activeCategory, searchQuery, selectedCity, sortOption, user, isAdmin]);

  // Reset rendered limit on category/search/city/sort changes
  useEffect(() => {
    setRenderedLimit(16);
  }, [activeCategory, searchQuery, selectedCity, sortOption]);

  // Scroll listener for floating scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Progressive virtual slice of items for 60fps rendering
  const renderedItems = useMemo(() => {
    return filteredItems.slice(0, renderedLimit);
  }, [filteredItems, renderedLimit]);

  const hasMoreLocal = renderedLimit < filteredItems.length;
  const hasMoreToLoad = hasMoreLocal || hasMore;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setRenderedLimit(prev => {
          if (prev < filteredItems.length) {
            return Math.min(prev + 16, filteredItems.length);
          }
          return prev;
        });
        if (hasMore && !loadingMore) {
          loadItems(false);
        }
      }
    }, { rootMargin: '350px' });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, filteredItems.length, lastVisible]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "p-3 rounded-2xl",
              theme === 'royal' ? "bg-amber-400/15 text-amber-300 border border-amber-400/30" :
              theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : 
              theme === 'sunset' ? "bg-orange-500/10 text-orange-400" :
              theme === 'midnight' ? "bg-indigo-500/10 text-indigo-400" :
              theme === 'tokyo' ? "bg-indigo-500/10 text-indigo-400" :
              theme === 'emerald' || theme === 'aurora' ? "bg-emerald-500/20 text-emerald-400" :
              theme === 'monochrome' ? "bg-slate-900 text-white" :
              theme === 'raz' ? "bg-ef-pink/10 text-ef-deep" :
              "bg-indigo-50 text-indigo-600"
            )}>
              <ShoppingBag className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className={clsx("text-2xl md:text-3xl font-bold tracking-tight", textPrimary[theme as keyof typeof textPrimary])}>{t('Marketplace')}</h1>
              <p className={clsx("text-xs md:text-sm font-medium mt-0.5 opacity-90 leading-relaxed", textSecondary[theme as keyof typeof textSecondary])}>
                {t('Discover unique styles from our community')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={clsx("hidden sm:flex items-center p-1 rounded-2xl border", borderSecondary[theme as keyof typeof borderSecondary])}>
              <button 
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
                className={clsx(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewMode === 'grid' 
                    ? "bg-indigo-500 text-white shadow-lg" 
                    : (theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="List View"
                className={clsx(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewMode === 'list' 
                    ? "bg-indigo-500 text-white shadow-lg" 
                    : (theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {viewMode === 'grid' && (
              <div className={clsx("hidden sm:flex items-center p-1 rounded-2xl border", borderSecondary[theme as keyof typeof borderSecondary])}>
                <button 
                  type="button"
                  onClick={() => setGridCols(3)}
                  aria-label="3 columns"
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                    gridCols === 3 
                      ? "bg-indigo-500 text-white shadow-lg" 
                      : (theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  3
                </button>
                <button 
                  type="button"
                  onClick={() => setGridCols(4)}
                  aria-label="4 columns"
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                    gridCols === 4 
                      ? "bg-indigo-500 text-white shadow-lg" 
                      : (theme === 'dark' ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  4
                </button>
              </div>
            )}
            
            <button 
              type="button"
              onClick={() => {
                setDeleteId('ALL_MARKETPLACE_ITEMS');
                setDeleteAction('all');
              }}
              className={clsx(
                "flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm",
                theme === 'tokyo' || theme === 'sunset'
                  ? "bg-slate-900 border-slate-800 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                  : "bg-white border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200"
              )}
              title={i18n.language === 'ku' ? 'سڕینەوەی سەرجەم پۆستەکانی بازار' : i18n.language === 'ar' ? 'مسح كافة منشورات السوق' : 'Clear All Marketplace Posts'}
            >
              <Trash2 className="w-4 h-4 shrink-0 text-red-500" />
              <div className="flex flex-col text-center leading-tight text-[11px] sm:text-xs">
                {i18n.language === 'ku' ? (
                  <>
                    <span>سڕینەوەی</span>
                    <span>گشتی</span>
                  </>
                ) : i18n.language === 'ar' ? (
                  <>
                    <span>مسح</span>
                    <span>الكل</span>
                  </>
                ) : (
                  <>
                    <span>Clear</span>
                    <span>All</span>
                  </>
                )}
              </div>
            </button>
            
            <button 
              type="button"
              className={clsx(
                "sm:hidden flex items-center justify-center gap-1.5 px-3.5 h-11 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm",
                theme === 'royal'
                  ? "bg-[#091124] border-amber-400/40 text-amber-300 hover:bg-[#0e1935]"
                  : theme === 'tokyo' || theme === 'sunset'
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              <span>{viewMode === 'grid' ? (i18n.language === 'ku' ? 'تۆڕ' : i18n.language === 'ar' ? 'شبكة' : 'Grid') : (i18n.language === 'ku' ? 'لیست' : i18n.language === 'ar' ? 'قائمة' : 'List')}</span>
              {viewMode === 'grid' ? <Grid className="w-4 h-4 shrink-0" /> : <List className="w-4 h-4 shrink-0" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full">
          <div className="relative flex-1">
            <Search className={clsx("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", theme === 'royal' ? "text-amber-400" : "text-slate-500")} />
            <input 
              type="text"
              placeholder={t('Search unique items, categories, or styles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={clsx(
                "w-full pl-12 pr-10 py-3.5 rounded-2xl border text-base md:text-sm focus:outline-none transition-all font-bold",
                inputClasses[theme as keyof typeof inputClasses]
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={clsx(
                  "absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer",
                  theme === 'royal'
                    ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/40 hover:text-white"
                    : "bg-slate-500/20 hover:bg-slate-500/40 text-slate-400 hover:text-white"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowQrScanner(true)}
            className={clsx(
              "flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-black shadow-lg border transition-all active:scale-95 cursor-pointer shrink-0",
              theme === 'royal'
                ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30"
                : "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/25 border-indigo-400/30"
            )}
            title={i18n.language === 'ku' ? 'سکانی لەیبڵ و بارکۆدی کاڵا' : i18n.language === 'ar' ? 'مسح باركود وملصق المنتج' : 'Scan Product Label & QR'}
          >
            <QrCode className={clsx("w-4 h-4", theme === 'royal' ? "text-slate-950" : "text-indigo-100")} />
            <span className="hidden sm:inline">
              {i18n.language === 'ku' ? 'سکانی لەیبڵ' : i18n.language === 'ar' ? 'سكان الباركود' : 'Scan Label'}
            </span>
          </button>
        </div>

        {/* ⚡ 24h Daily Stories Tray (Douyin & Instagram Style) */}
        <DailyStoriesTray
          user={user}
          theme={theme}
          onRequireAuth={onRequireAuth}
          onOpenItemModal={(item) => setSelectingItem(item)}
          onOpenMessaging={onOpenMessaging}
          onOpenSellerProfile={(sellerId, fallbackInfo) => handleOpenSellerProfile(sellerId, fallbackInfo)}
          myItems={items.filter(i => i.userId === user?.id || i.sellerId === user?.id)}
        />

        {/* Iraq Governorates & Smart Algorithm Control Bar / پشتێنەی ڕێکخستنی شارەکان و ئەلگۆریزم */}
        <div className={clsx(
          "p-4 rounded-3xl border shadow-xl flex flex-col gap-3 transition-all",
          theme === 'rainbow'
            ? "bg-gradient-to-r from-pink-50/80 via-purple-50/70 via-sky-50/70 to-emerald-50/70 backdrop-blur-xl border-2 border-pink-200/70 shadow-[0_8px_30px_rgba(244,114,182,0.18)]"
            : theme === 'royal' || theme === 'dark' || theme === 'midnight'
            ? "bg-[#060a16]/90 backdrop-blur-xl border-2 border-amber-400/30 shadow-2xl shadow-black/80 text-white"
            : theme === 'tokyo' || theme === 'sunset' || theme === 'aurora'
            ? "bg-slate-900/90 border-slate-800 text-white"
            : theme === 'monochrome'
            ? "bg-white/95 border-2 border-slate-300 text-slate-900 shadow-lg"
            : "bg-white border-slate-200 text-slate-900"
        )}>
          {/* Header & Algorithm Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-500/10 pb-3">
            <div className="flex items-center gap-2">
              <span className={clsx(
                "text-sm font-black tracking-wide",
                theme === 'royal' ? "text-white" : textPrimary[theme as keyof typeof textPrimary]
              )}>
                {i18n.language === 'ku' ? '📍 هەڵبژاردنی پارێزگا:' : i18n.language === 'ar' ? '📍 تحديد المحافظة:' : '📍 Select Province:'}
              </span>
            </div>

            {/* Smart Algorithm Select */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                aria-label={i18n.language === 'ku' ? 'ڕێکخستنی ئەلگۆریزم' : i18n.language === 'ar' ? 'ترتيب الخوارزمية' : 'Sort Algorithm'}
                className={clsx(
                  "px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all outline-none w-full sm:w-auto shadow-sm",
                  theme === 'royal'
                    ? "bg-[#091124] border-amber-400/40 text-white focus:border-amber-300"
                    : theme === 'rainbow'
                    ? "bg-white/90 border-pink-200 text-indigo-950 focus:border-pink-500 shadow-xs"
                    : theme === 'tokyo' || theme === 'sunset'
                    ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                )}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id} className={theme === 'royal' ? "bg-[#091124] text-white" : undefined}>
                    {i18n.language === 'ku' ? opt.labelKu : i18n.language === 'ar' ? (opt as any).labelAr || opt.labelEn : opt.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
            {IRAQ_PROVINCES.map(prov => {
              const isSelected = selectedCity === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setSelectedCity(prov.id)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm",
                    isSelected
                      ? (theme === 'royal'
                          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black border-amber-300 shadow-[0_2px_12px_rgba(245,158,11,0.4)] scale-105"
                          : theme === 'rainbow'
                          ? "bg-gradient-to-r from-pink-500 via-purple-500 to-sky-400 text-white border-white/90 shadow-md shadow-pink-500/30 scale-105"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-indigo-500/20 scale-105")
                      : (theme === 'royal'
                          ? "bg-[#091124] text-white hover:text-amber-300 border-white/10 hover:border-amber-400/40"
                          : theme === 'rainbow'
                          ? "bg-white/80 text-indigo-950 border-pink-200/80 hover:border-pink-400 hover:text-pink-600 shadow-xs backdrop-blur-md"
                          : theme === 'tokyo' || theme === 'sunset'
                          ? "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-slate-900")
                  )}
                >
                  <span>{i18n.language === 'ku' ? prov.nameKu : i18n.language === 'ar' ? (prov as any).nameAr || prov.nameEn : prov.nameEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Categories / پشتێنەی پۆلێن و ڕێکخستنی کاڵا */}
      <div className={clsx(
        "flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto pb-4 pt-1.5 no-scrollbar snap-x px-2 rounded-3xl transition-all",
        theme === 'rainbow' 
          ? "bg-gradient-to-r from-pink-100/60 via-purple-100/50 via-sky-100/50 to-emerald-100/50 backdrop-blur-xl border-2 border-pink-200/70 shadow-[0_6px_25px_rgba(244,114,182,0.18)]" 
          : theme === 'royal'
          ? "bg-[#060a16]/70 backdrop-blur-xl border border-amber-400/25 shadow-xl"
          : "bg-transparent"
      )}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={clsx(
              "px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all border snap-start uppercase tracking-wide cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95",
              activeCategory === cat.id
                ? (theme === 'royal' ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black border-2 border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.45)] scale-105" :
                   theme === 'rainbow' ? "bg-gradient-to-r from-pink-500 via-purple-500 via-sky-400 to-emerald-400 text-white border-2 border-white/90 shadow-[0_8px_25px_rgba(244,114,182,0.45)] scale-105" :
                   theme === 'sunset' ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white border-orange-400 shadow-lg shadow-orange-500/30 scale-105" :
                   theme === 'tokyo' ? "bg-gradient-to-r from-indigo-600 to-teal-500 text-white border-indigo-400 shadow-lg shadow-indigo-900/50 scale-105" :
                   theme === 'wavy' ? "bg-gradient-to-r from-teal-500 to-indigo-600 text-white border-teal-300 shadow-lg shadow-teal-500/30 scale-105" :
                   "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-indigo-400 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] scale-105")
                : (theme === 'royal'
                    ? "bg-[#091124] text-white hover:text-amber-300 border border-amber-400/30 hover:border-amber-400/70 shadow-sm"
                    : theme === 'rainbow'
                    ? "bg-white/85 text-indigo-950 border-pink-200/80 hover:border-pink-400 hover:text-pink-600 hover:bg-white shadow-xs backdrop-blur-md"
                    : theme === 'tokyo'
                    ? "bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-indigo-400 hover:text-white" 
                    : theme === 'sunset' 
                    ? "bg-orange-950/80 text-orange-200 border-orange-500/30 hover:border-orange-400 hover:text-white" 
                    : theme === 'wavy' 
                    ? "bg-white/80 text-teal-800 border-teal-100 hover:border-teal-300 hover:text-teal-900" 
                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200 hover:text-indigo-600")
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track Order Section */}
      {activeCategory === 'tracking' && (
        <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={clsx(
            "p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden",
            theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
          )}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Package className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 text-center mb-8">
              <h2 className={clsx("text-3xl font-black mb-3 tracking-tighter", textPrimary[theme as keyof typeof textPrimary])}>
                {i18n.language === 'ku' ? 'بەدواداچوونی داواکاری' : i18n.language === 'ar' ? 'تتبع شحنتك' : 'Track Your Shipment'}
              </h2>
              <p className={clsx("text-sm opacity-70", textSecondary[theme as keyof typeof textSecondary])}>
                {i18n.language === 'ku' ? 'کۆدی داواکارییەکەت بنووسە بۆ بینینی باری گەیاندنەکە' : i18n.language === 'ar' ? 'أدخل رقم الطلب للتحقق من حالة الشحن' : 'Enter your order ID to check shipment status'}
              </p>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                placeholder={i18n.language === 'ku' ? 'کۆدی داواکاری (بۆ نمونە: order_123)...' : i18n.language === 'ar' ? 'رقم الطلب (مثال: order_123)...' : 'Order ID (e.g. order_123)...'}
                value={trackingOrderId}
                onChange={(e) => setTrackingOrderId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
                className={clsx(
                  "w-full pl-12 pr-32 py-4 rounded-2xl border text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all",
                  inputClasses[theme as keyof typeof inputClasses]
                )}
              />
              <button 
                onClick={handleTrackOrder}
                disabled={isTracking || !trackingOrderId.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTracking ? '...' : (i18n.language === 'ku' ? 'بگەڕێ' : i18n.language === 'ar' ? 'تتبع' : 'Track')}
              </button>
            </div>

            {trackingError && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-shake">
                <AlertCircle className="w-4 h-4" />
                {trackingError}
              </div>
            )}
          </div>

          {trackedOrder && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "p-8 rounded-[2.5rem] border shadow-2xl space-y-8",
                theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{i18n.language === 'ku' ? 'ژمارەی داواکاری' : i18n.language === 'ar' ? 'رقم الطلب' : 'ORDER ID'}</div>
                  <div className={clsx("text-xl font-black font-mono", textPrimary[theme as keyof typeof textPrimary])}>#{trackedOrder.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{i18n.language === 'ku' ? 'بڕی گشتی' : i18n.language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</div>
                  <div className={clsx("font-black text-xl", theme === 'dark' ? "text-emerald-400" : "text-emerald-700")}>{(trackedOrder.total * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-6">
                {[
                  { key: 'pending', label: i18n.language === 'ku' ? 'داواکاری وەرگیرا' : i18n.language === 'ar' ? 'تم استلام الطلب' : 'Order Received', icon: Box, time: trackedOrder.createdAt },
                  { key: 'processing', label: i18n.language === 'ku' ? 'ئامادەکردن' : i18n.language === 'ar' ? 'قيد التجهيز' : 'Processing', icon: Zap, time: trackedOrder.updatedAt },
                  { key: 'shipped', label: i18n.language === 'ku' ? 'لە ڕێگایە' : i18n.language === 'ar' ? 'في الطريق' : 'In Transit', icon: Truck, time: trackedOrder.status === 'shipped' || trackedOrder.status === 'delivered' ? trackedOrder.updatedAt : null },
                  { key: 'delivered', label: i18n.language === 'ku' ? 'گەیەندرا' : i18n.language === 'ar' ? 'تم التوصيل' : 'Delivered', icon: CheckCircle2, time: trackedOrder.status === 'delivered' ? trackedOrder.updatedAt : null }
                ].map((step, idx, arr) => {
                  const statuses = ['pending', 'processing', 'shipped', 'delivered'];
                  const currentIdx = statuses.indexOf(trackedOrder.status);
                  const stepIdx = statuses.indexOf(step.key);
                  const isCompleted = stepIdx <= currentIdx;
                  const isCurrent = stepIdx === currentIdx;
                  
                  return (
                    <div key={step.key} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                          isCompleted ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-slate-600 border border-white/10"
                        )}>
                          <step.icon className={clsx("w-5 h-5", isCurrent && "animate-bounce")} />
                        </div>
                        {idx !== arr.length - 1 && (
                          <div className={clsx(
                            "w-0.5 h-12 transition-all duration-500",
                            isCompleted ? "bg-indigo-500" : "bg-white/5"
                          )} />
                        )}
                      </div>
                      <div className="pt-1.5">
                        <div className={clsx(
                          "text-sm font-black uppercase tracking-widest",
                          isCompleted ? textPrimary[theme as keyof typeof textPrimary] : "text-slate-600"
                        )}>
                          {step.label}
                        </div>
                        {step.time && (
                          <div className="text-[10px] text-slate-500 font-bold mt-1">
                            {new Date(step.time).toLocaleDateString()} {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={clsx(
                "p-6 rounded-3xl border flex items-center gap-4",
                theme === 'dark' ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
              )}>
                <MapPin className="w-6 h-6 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{i18n.language === 'ku' ? 'ناونیشانی گەیاندن' : i18n.language === 'ar' ? 'عنوان التوصيل' : 'DELIVERY ADDRESS'}</div>
                  <div className={clsx("text-xs font-bold truncate", textPrimary[theme as keyof typeof textPrimary])}>
                    {trackedOrder.shippingCity}, {trackedOrder.shippingAddress}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Product Grid or List */}
      {activeCategory !== 'tracking' && (
        loading ? (
        <div className={clsx(
          "grid gap-4 md:gap-6",
          viewMode === 'list' 
            ? "grid-cols-1" 
            : (gridCols === 1 
                ? "grid-cols-1 max-w-2xl mx-auto" 
                : (gridCols === 3 ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"))
        )}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <CardSkeleton key={i} theme={theme} viewMode={viewMode} />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          {/* Feed Count & Performance Virtualization Status Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1 mb-2">
            <span>
              {i18n.language === 'ku'
                ? `پیشاندانی ${renderedItems.length} لە ${filteredItems.length} بەرهەم`
                : i18n.language === 'ar'
                ? `عرض ${renderedItems.length} من ${filteredItems.length} منتج`
                : `Showing ${renderedItems.length} of ${filteredItems.length} items`}
            </span>
            {hasMoreToLoad && (
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold">
                {i18n.language === 'ku' ? '⚡ شاشەی خێراکراو' : i18n.language === 'ar' ? '⚡ عرض فائق السرعة' : '⚡ Virtualized Feed'}
              </span>
            )}
          </div>

          {viewMode === 'grid' ? (
            <div className={clsx(
              "grid gap-4 md:gap-6",
              gridCols === 1 && "grid-cols-1 max-w-2xl mx-auto",
              gridCols === 3 && "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
              gridCols === 4 && "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
            )}>
              <AnimatePresence mode="popLayout">
                {renderedItems.map((item, idx) => (
                  <motion.div
                    key={`${item.id || 'item'}-${idx}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '380px' }}
                  >
                    <MarketplaceItemCard
                      item={item}
                      user={user}
                  theme={theme}
                  cardClasses={cardClasses}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  bgSecondary={bgSecondary}
                  borderSecondary={borderSecondary}
                  inputClasses={inputClasses}
                  sellerBg={sellerBg}
                  sellerText={sellerText}
                  sellerName={sellerName}
                  onToggleLike={(id) => { if (onTriggerPet) onTriggerPet(); toggleLike(id); }}
                  onToggleSave={(id) => { if (onTriggerPet) onTriggerPet(); toggleSave(id); }}
                  onAddToCart={(item) => { if (onTriggerPet) onTriggerPet(); addToCart(item, selectedSize, selectedColor); }}
                  onOpenSeller={(id) => {
                    handleOpenSellerProfile(id, { name: item.userName, phone: item.sellerPhone, avatar: item.userAvatar });
                  }}
                  onTrackView={trackItemView}
                  onContactSeller={handleContactSeller}
                  onDelete={handleDelete}
                  onPreviewImage={(item) => {
                    setPreviewImageItem(item);
                    setPreviewImageIndex(0);
                  }}
                  onOpenDetails={(item) => {
                    setSelectingItem(item);
                    setSelectedSize(item.sizes?.[0] || '');
                    setSelectedColor(item.colors?.[0] || '');
                  }}
                  onEditPrice={(item) => {
                    setEditingPriceItem(item);
                    setNewPriceInput(String(Math.round(item.price * 1500)));
                  }}
                  onEditPost={(item) => {
                    setEditingFullItem(item);
                  }}
                  onOpenReview={(item) => {
                    setViewingReviewsItem(item);
                  }}
                  onBumpPost={handleBumpItem}
                  onBoostPost={handleBoostItem}
                  isBumpingToTop={bumpingItemId === item.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
          ) : (
            <div className="w-full space-y-4">
              {renderedItems.map((item, idx) => {
                const isLiked = user ? item.likes?.includes(user.id) : false;
                const isSaved = user ? item.saves?.includes(user.id) : false;
                const isPriceWatched = Boolean(
                  (user && item.priceWatchers?.includes(user.id)) ||
                  item.priceWatchers?.includes('guest') ||
                  db.isUserPriceWatching(item.id, user?.id || 'guest')
                );
                // Strict ownership: Only the creator of the post can edit or delete their own post
                const isOwner = Boolean(
                  user && user.id && (item.userId === user.id || item.sellerId === user.id)
                );
                const canDelete = isOwner;
                const canViewResalePrice = Boolean(
                  item.resalePrice && 
                  Number(item.resalePrice) > 0 && 
                  (isOwner || isAdmin || item.showResalePriceToPublic === true)
                );

                return (
                  <motion.div
                    key={`${item.id || 'item'}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (idx % 16) * 0.03 }}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '240px' }}
                    className={clsx(
                      "flex flex-col sm:flex-row border rounded-3xl overflow-hidden group",
                      cardClasses[theme as keyof typeof cardClasses] || cardClasses.royal || cardClasses.white
                    )}
                  >
                    {/* Image/Video Section */}
                    <div 
                      className="w-full sm:w-48 md:w-64 aspect-[4/3] sm:aspect-auto relative bg-slate-950 flex-shrink-0"
                    >
                      <ImageCarousel 
                        images={item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl]}
                        videoUrl={item.videoUrl}
                        alt={item.title}
                        theme={theme}
                        onImageClick={() => {
                          setPreviewImageItem(item);
                          setPreviewImageIndex(0);
                        }}
                      />
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                        <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider">
                          {formatProductKind(item.productKind || item.category)}
                        </div>
                        {canViewResalePrice && (
                          <div className={clsx(
                            "px-2 py-1 backdrop-blur-md border rounded-lg text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1 shadow-sm",
                            item.showResalePriceToPublic ? "bg-teal-500/90 border-teal-400/40" : "bg-purple-600/90 border-purple-400/40"
                          )}>
                            {!item.showResalePriceToPublic && <Lock className="w-2.5 h-2.5 text-purple-200" />}
                            <span>{i18n.language === 'ku' ? `🏷️ داشکاندن: ${(Number(item.resalePrice) * 1500).toLocaleString()} دینار` : i18n.language === 'ar' ? `🏷️ تخفيض: ${(Number(item.resalePrice) * 1500).toLocaleString()} دينار` : `🏷️ ${t('Discount')}: ${(Number(item.resalePrice) * 1500).toLocaleString()} IQD`}</span>
                            {!item.showResalePriceToPublic && (
                              <span className="text-[8px] bg-black/40 px-1 py-0.2 rounded font-bold text-purple-200">
                                {i18n.language === 'ku' ? 'تایبەت' : i18n.language === 'ar' ? 'خاص' : 'Private'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 
                              dir="auto" 
                              className={clsx(
                                "text-base sm:text-lg font-bold mb-1 line-clamp-1 break-words [unicode-bidi:plaintext]", 
                                textPrimary[theme as keyof typeof textPrimary]
                              )}
                            >
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                              <button 
                                type="button"
                                onClick={() => {
                                  handleOpenSellerProfile(item.userId, { name: item.userName, phone: item.sellerPhone, avatar: item.userAvatar });
                                }}
                                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-pointer whitespace-nowrap [word-break:keep-all]"
                              >
                                <UserIcon className="w-3 h-3 shrink-0" />
                                <span className="whitespace-nowrap font-medium [word-break:keep-all]">{item.userName}</span>
                                {(item.isVerified || item.userVerified) && (
                                  <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0 inline-block" title={i18n.language === 'ku' ? 'فرۆشیاری پشڕاستکراو' : i18n.language === 'ar' ? 'بائع موثوق ومفعل' : 'Verified Seller'} />
                                )}
                                {(item.isPerfectSeller || item.userPerfectSeller) && (
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 inline-block animate-pulse" title={i18n.language === 'ku' ? 'فرۆشیاری نموونەیی (Perfect Seller)' : i18n.language === 'ar' ? 'بائع متميز' : 'Perfect Seller'} />
                                )}
                              </button>
                              <span className="text-slate-400">•</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                <span className="font-bold">{item.rating?.toFixed(1) || 'New'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {canViewResalePrice ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-0.5">
                                    {!item.showResalePriceToPublic && <Lock className="w-2.5 h-2.5 text-purple-400" />}
                                    {i18n.language === 'ku' ? 'نرخی داشکاندن:' : i18n.language === 'ar' ? 'سعر التخفيض:' : 'Discount Price:'}
                                  </span>
                                  <span className={clsx("text-xl font-black", theme === 'royal' ? "text-amber-300 drop-shadow-xs" : isDarkTheme ? "text-emerald-400" : "text-emerald-700")}>
                                    {(Number(item.resalePrice) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {i18n.language === 'ku' ? 'نرخی ئەسڵی:' : i18n.language === 'ar' ? 'السعر الأصلي:' : 'Original Price:'}
                                  </span>
                                  <span className="line-through decoration-red-500 decoration-2 text-red-500 font-extrabold">
                                    {(Number(item.price) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  {i18n.language === 'ku' ? 'نرخی فرۆشتن:' : i18n.language === 'ar' ? 'سعر البيع:' : 'Price:'}
                                </span>
                                <span className={clsx("text-xl font-black", theme === 'royal' ? "text-amber-300 drop-shadow-xs" : isDarkTheme ? "text-emerald-400" : "text-emerald-700")}>
                                  {(item.price * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                                </span>
                              </div>
                            )}

                            {canViewResalePrice && Number(item.resalePrice) > Number(item.price) && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                <span>{i18n.language === 'ku' ? '💰 قازانج:' : i18n.language === 'ar' ? '💰 الربح:' : '💰 Profit:'}</span>
                                <span className="font-extrabold">+{( (Number(item.resalePrice) - Number(item.price)) * 1500 ).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {(item.description || item.weight) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDescItemIds(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }));
                            }}
                            className="cursor-pointer group/desc my-2 select-text"
                            title={i18n.language === 'ku' ? 'کلیک بکە بۆ بینینی تەواوی وەسف' : i18n.language === 'ar' ? 'انقر لعرض الوصف بالكامل' : 'Click to toggle full description'}
                          >
                            <p className={clsx(
                              "text-xs sm:text-sm leading-relaxed font-medium transition-all duration-200",
                              !expandedDescItemIds[item.id] && "line-clamp-2",
                              isDarkTheme ? "text-slate-200" : "text-slate-700"
                            )}>
                              {item.description || item.weight}
                            </p>
                            {((item.description || item.weight)?.length || 0) > 80 && (
                              <span className="text-[10px] font-bold text-indigo-400 group-hover/desc:text-indigo-300 transition-colors inline-block mt-1">
                                {expandedDescItemIds[item.id] 
                                  ? (i18n.language === 'ku' ? '▲ کەمکردنەوە' : i18n.language === 'ar' ? '▲ عرض أقل' : '▲ Show less') 
                                  : (i18n.language === 'ku' ? '... تەواوی وەسف' : i18n.language === 'ar' ? '... قراءة المزيد' : '... Read full')}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-indigo-400" />
                            {i18n.language === 'ku' ? 'تەنها ٤٠٠٠ دینار' : i18n.language === 'ar' ? '٤٠٠٠ دينار فقط' : 'Delivery: 4000 IQD'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            {item.location || 'Global'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Customer Reviews & Comments Preview on List View Card */}
                        <ItemReviewsPreview 
                          itemId={item.id} 
                          itemTitle={item.title}
                          currentUser={user}
                          theme={theme} 
                          onOpenReviews={() => setViewingReviewsItem(item)} 
                        />
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => addToCart(item)}
                          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
                        >
                          <ShoppingBasket className="w-4 h-4" />
                          {i18n.language === 'ku' ? 'خستنە نێو سەبەتە' : i18n.language === 'ar' ? 'أضف إلى السلة' : 'Add to Cart'}
                        </button>
                        
                        <div className="flex items-center gap-1.5 justify-end">
                          {/* Review, Star Rating & All Comments Button */}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingReviewsItem(item);
                            }}
                            aria-label="View and add reviews, star ratings and comments"
                            title={i18n.language === 'ku' ? 'بینین و ناردنی ئەستێرە و کۆمێنت' : i18n.language === 'ar' ? 'عرض وإضافة تقييم بالنجوم، تعليق وصورة' : 'View & Add Ratings, Reviews and Photos'}
                            className={clsx(
                              "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              item.rating 
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" 
                                : (isDarkTheme ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/40" : 
                                   "bg-white/80 border-slate-200 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-300")
                            )}
                          >
                            <Star className={clsx("w-4 h-4 text-amber-400", item.rating ? "fill-amber-400" : "hover:fill-amber-400")} />
                            {item.rating ? (
                              <span className="text-[11px] font-black text-amber-400 font-mono">{item.rating.toFixed(1)}</span>
                            ) : (
                              <span className="text-[10px] font-bold hidden xs:inline">{i18n.language === 'ku' ? 'ئەستێرە' : i18n.language === 'ar' ? 'تقييم' : 'Rate'}</span>
                            )}
                          </button>

                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(item.id);
                            }}
                            aria-label={isLiked ? "Unlike item" : "Like item"}
                            className={clsx(
                              "p-3 rounded-xl border transition-all cursor-pointer",
                              isLiked 
                                ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                : (isDarkTheme ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" : 
                                   "bg-white/80 border-slate-200 text-slate-600 hover:text-indigo-600")
                            )}
                          >
                            <Heart className={clsx("w-4 h-4", isLiked && "fill-current")} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSave(item.id);
                            }}
                            aria-label={isSaved ? "Remove bookmark" : "Bookmark item"}
                            className={clsx(
                              "p-3 rounded-xl border transition-all cursor-pointer",
                              isSaved 
                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                                : (isDarkTheme ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" : 
                                   "bg-white/80 border-slate-200 text-slate-600 hover:text-indigo-600")
                            )}
                          >
                            <Bookmark className={clsx("w-4 h-4", isSaved && "fill-current")} />
                          </button>
                          {/* Price Watch Toggle Button in List View */}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePriceWatch(item.id);
                            }}
                            aria-label={isPriceWatched ? "Disable Price Watch" : "Enable Price Watch"}
                            title={
                              isPriceWatched 
                                ? (i18n.language === 'ku' ? 'چاودێری نرخ چالاکە (کلیک بکە بۆ ناچالاککردن)' : i18n.language === 'ar' ? 'مراقبة السعر مفعلة (انقر للإلغاء)' : 'Price Watch active (click to disable)')
                                : (i18n.language === 'ku' ? 'چاودێری نرخ (ئاگادارکردنەوە لە کاتی داشکاندن)' : i18n.language === 'ar' ? 'مراقبة السعر (إشعارك عند التخفيض)' : 'Price Watch (alert on price drop)')
                            }
                            className={clsx(
                              "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              isPriceWatched 
                                ? (theme === 'royal' 
                                    ? "bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-md shadow-amber-400/10" 
                                    : "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10")
                                : (isDarkTheme 
                                    ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" 
                                    : "bg-white/80 border-slate-200 text-slate-600 hover:text-emerald-600")
                            )}
                          >
                            {isPriceWatched ? (
                              <>
                                <BellRing className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-pulse shrink-0" />
                                <span className="text-[10px] font-black hidden sm:inline text-emerald-600 dark:text-emerald-400">
                                  {i18n.language === 'ku' ? 'چاودێری' : i18n.language === 'ar' ? 'مراقب' : 'Watching'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4 shrink-0" />
                                <span className="text-[10px] font-bold hidden sm:inline">
                                  {i18n.language === 'ku' ? 'چاودێری نرخ' : i18n.language === 'ar' ? 'مراقبة' : 'Watch'}
                                </span>
                              </>
                            )}
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(item);
                            }}
                            aria-label="Share item"
                            className={clsx(
                              "p-3 rounded-xl border transition-all cursor-pointer",
                              isDarkTheme ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" : 
                              "bg-white/80 border-slate-200 text-slate-600 hover:text-indigo-600"
                            )}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className={clsx(
                                "p-3 rounded-xl border transition-all cursor-pointer",
                                "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                              )}
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          
          {/* Infinite Scroll Sentinel & Modern Skeleton Feed Loading */}
          <div ref={lastItemRef} className="w-full pt-4 pb-8">
            {(loadingMore || (hasMoreLocal && renderedItems.length > 0)) && (
              <div className="w-full">
                <div className={clsx(
                  "grid gap-4 md:gap-6 w-full",
                  viewMode === 'list' 
                    ? "grid-cols-1" 
                    : (gridCols === 1 
                        ? "grid-cols-1 max-w-2xl mx-auto" 
                        : (gridCols === 3 ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"))
                )}>
                  {[1, 2, 3, 4].map(i => (
                    <CardSkeleton key={`more-skeleton-${i}`} theme={theme} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            )}
            {!hasMoreToLoad && filteredItems.length > 0 && (
              <div className="text-center py-6">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-50">
                  {i18n.language === 'ku' ? 'گه‌یشتیته‌ كۆتایی به‌رهه‌مه‌كان' : i18n.language === 'ar' ? 'وصلت إلى نهاية المنتجات' : "You've reached the end"}
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-20 text-center animate-in fade-in zoom-in duration-700">
          <div className={clsx(
            "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6",
            theme === 'sunset' ? "bg-orange-950/40" :
            theme === 'midnight' ? "bg-slate-950/40" :
            theme === 'tokyo' ? "bg-slate-950" :
            theme === 'emerald' ? "bg-emerald-950/40" :
            theme === 'raz' ? "bg-ef-bg" :
            "bg-slate-100"
          )}>
            <ShoppingBag className={clsx(
              "w-10 h-10", 
              theme === 'dark' ? "text-slate-700" : 
              theme === 'sunset' ? "text-orange-500/30" :
              theme === 'midnight' ? "text-indigo-500/30" :
              theme === 'tokyo' ? "text-indigo-400/30" :
              theme === 'emerald' ? "text-emerald-500/30" :
              theme === 'raz' ? "text-ef-pink/30" :
              "text-slate-300"
            )} />
          </div>
          <h3 className={clsx("text-xl font-medium mb-2", textPrimary[theme as keyof typeof textPrimary])}>{t('No posts yet')}</h3>
          <p className={clsx("max-w-sm mx-auto text-xs opacity-75", textSecondary[theme as keyof typeof textSecondary])}>
            {i18n.language === 'ku' 
              ? 'هیچ بابەتێک نەدۆزرایەوە لەم بەشەدا. تکایە بگەڕێوە بۆ بەشەکانی تر یان دواتر سەردان بکەرەوە.' 
              : i18n.language === 'ar'
              ? 'لم يتم العثور على أي منتجات في هذا القسم. يرجى تصفح الأقسام الأخرى أو المحاولة لاحقاً.'
              : 'No sourced items found in this category. Try exploring other factory channels or sourcing hubs!'}
          </p>
        </div>
      ))}

      {/* Fullscreen High-Resolution Image Lightbox Modal */}
      <AnimatePresence>
        {previewImageItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex flex-col bg-black/95 backdrop-blur-xl select-none"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10 z-20">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate drop-shadow">
                  {previewImageItem.title}
                </h3>
                <p className="text-xs text-amber-300 font-mono font-bold">
                  {(Number(previewImageItem.price) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const item = previewImageItem;
                    setPreviewImageItem(null);
                    setSelectingItem(item);
                    setSelectedSize(item.sizes?.[0] || '');
                    setSelectedColor(item.colors?.[0] || '');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  <ShoppingBasket className="w-4 h-4 text-white" />
                  <span>{i18n.language === 'ku' ? 'خستنە نێو سەبەتە' : i18n.language === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewImageItem(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Center Image Container */}
            <div 
              className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden cursor-zoom-out"
              onClick={() => setPreviewImageItem(null)}
            >
              {(() => {
                const imgList = (previewImageItem.imageUrls && previewImageItem.imageUrls.length > 0) 
                  ? previewImageItem.imageUrls 
                  : [previewImageItem.imageUrl || ''];
                const activeSrc = imgList[previewImageIndex] || imgList[0];

                return (
                  <div 
                    className="relative max-w-full max-h-full flex items-center justify-center cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={activeSrc}
                      alt={previewImageItem.title}
                      className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                      referrerPolicy="no-referrer"
                    />

                    {imgList.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewImageIndex((prev) => (prev - 1 + imgList.length) % imgList.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl cursor-pointer transition-all hover:scale-110 active:scale-95"
                          title="Previous image"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewImageIndex((prev) => (prev + 1) % imgList.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl cursor-pointer transition-all hover:scale-110 active:scale-95"
                          title="Next image"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Bottom Strip: Thumbnails & Image Counter */}
            {(() => {
              const imgList = (previewImageItem.imageUrls && previewImageItem.imageUrls.length > 0) 
                ? previewImageItem.imageUrls 
                : [previewImageItem.imageUrl || ''];

              return (
                <div className="flex flex-col items-center justify-center gap-2 p-3 bg-black/80 border-t border-white/10 z-20">
                  {imgList.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
                      {imgList.map((url, idx) => (
                        <button
                          key={url + idx}
                          type="button"
                          onClick={() => setPreviewImageIndex(idx)}
                          className={clsx(
                            "w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer",
                            previewImageIndex === idx ? "border-amber-400 scale-105 shadow-md shadow-amber-400/40" : "border-white/20 opacity-60 hover:opacity-100"
                          )}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-slate-400">
                    {previewImageIndex + 1} / {imgList.length}
                  </span>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Modal */}
      <AnimatePresence>
        {selectingItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectingItem(null)}
              className="fixed inset-x-0 inset-y-0 bg-black/60 backdrop-blur-sm z-[490]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={clsx(
                "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg border rounded-3xl shadow-2xl z-[500] overflow-y-auto max-h-[90vh]",
                theme === 'royal' ? "bg-[#0b1220] border-amber-400/30 text-white" :
                theme === 'dark' ? "bg-slate-900 border-white/15 text-white" : 
                theme === 'sunset' ? "bg-[#1f0c22] border-orange-500/40 text-white" :
                theme === 'midnight' ? "bg-[#091024] border-blue-500/40 text-white" :
                theme === 'tokyo' ? "bg-slate-950 border-indigo-500/40 text-white" :
                theme === 'emerald' ? "bg-[#061e16] border-emerald-500/40 text-white" :
                theme === 'raz' ? "bg-ef-bg border-ef-pink/40 text-slate-900" :
                "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between flex-row-reverse">
                  <button type="button" onClick={() => setSelectingItem(null)} className={clsx("cursor-pointer p-1.5 rounded-full hover:bg-slate-500/20 transition-colors", textSecondary[theme as keyof typeof textSecondary])}>
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className={clsx("text-lg font-bold", textPrimary[theme as keyof typeof textPrimary])}>
                    {i18n.language === 'ku' ? 'هەڵبژاردنی تایبەتمەندییەکان' : i18n.language === 'ar' ? 'تحديد الخيارات' : 'Select Options'}
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  <div className={clsx(
                    "flex gap-3.5 items-center p-3.5 rounded-2xl border transition-colors",
                    (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                      ? "bg-black/40 border-white/10 text-white"
                      : "bg-slate-50 border-slate-200/80 text-slate-900 shadow-xs"
                  )}>
                    <div className={clsx(
                      "relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border shrink-0",
                      (theme === 'dark' || theme === 'midnight') ? "border-white/10 bg-black/40" : "border-slate-200 bg-slate-100"
                    )}>
                      <ImageCarousel 
                        images={selectingItem.imageUrls && selectingItem.imageUrls.length > 0 ? selectingItem.imageUrls : [selectingItem.imageUrl]}
                        videoUrl={selectingItem.videoUrl}
                        alt={selectingItem.title}
                        theme={theme}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={clsx("font-bold text-sm sm:text-base truncate max-w-full", textPrimary[theme as keyof typeof textPrimary])}>
                          {selectingItem.title}
                        </h4>
                      </div>

                      {/* Clean formatted price */}
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {(() => {
                          const isModalItemOwner = Boolean(user && user.id && (selectingItem.userId === user.id || selectingItem.sellerId === user.id));
                          const canViewModalResalePrice = Boolean(
                            selectingItem.resalePrice && 
                            Number(selectingItem.resalePrice) > 0 && 
                            (isModalItemOwner || isAdmin || selectingItem.showResalePriceToPublic === true)
                          );

                          if (canViewModalResalePrice) {
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={clsx("font-black text-base sm:text-lg font-mono", (theme === 'dark' || theme === 'midnight') ? "text-emerald-400" : "text-emerald-600")}>
                                  {(Number(selectingItem.resalePrice) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                                </span>
                                <span className="line-through text-red-500 font-bold text-xs font-mono">
                                  {(Number(selectingItem.price) * 1500).toLocaleString()}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <span className={clsx("font-black text-base sm:text-lg font-mono", (theme === 'dark' || theme === 'midnight') ? "text-emerald-400" : "text-emerald-600")}>
                              {(Number(selectingItem.price) * 1500).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                            </span>
                          );
                        })()}

                        {selectingItem.category && (
                          <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            {selectingItem.category}
                          </span>
                        )}
                      </div>

                      {/* Sourcing code & seller tag */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {selectingItem.userName && (
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenSellerProfile(selectingItem.userId || selectingItem.sellerId, {
                                name: selectingItem.userName,
                                phone: selectingItem.sellerPhone,
                                avatar: selectingItem.userAvatar
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                          >
                            <span>🏪 {selectingItem.userName}</span>
                            {(selectingItem.isVerified || selectingItem.userVerified) && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" title={i18n.language === 'ku' ? 'فرۆشیاری پشڕاستکراو' : i18n.language === 'ar' ? 'بائع موثق' : 'Verified Seller'} />
                            )}
                            {(selectingItem.isPerfectSeller || selectingItem.userPerfectSeller) && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 animate-pulse" title={i18n.language === 'ku' ? 'فرۆشیاری نموونەیی (Perfect Seller)' : i18n.language === 'ar' ? 'بائع متميز' : 'Perfect Seller'} />
                            )}
                          </button>
                        )}

                        {Boolean(selectingItem.sourceCode || selectingItem.customFields?.sourceCode || (selectingItem.title && selectingItem.title.startsWith('SRC-'))) && (
                          <button
                            type="button"
                            onClick={() => {
                              const code = selectingItem.sourceCode || selectingItem.customFields?.sourceCode || selectingItem.title;
                              safeCopyToClipboard(code);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-mono hover:bg-indigo-500/20 transition-all cursor-pointer"
                            title={i18n.language === 'ku' ? 'کۆپیکردنی کۆدی سەرچاوە' : i18n.language === 'ar' ? 'نسخ كود المصدر' : 'Copy Code'}
                          >
                            <span>#{selectingItem.sourceCode || selectingItem.customFields?.sourceCode || selectingItem.title}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compact Product Gallery if more than 1 image exists */}
                  {selectingItem.imageUrls && selectingItem.imageUrls.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {selectingItem.imageUrls.map((url, idx) => (
                        <div key={url + idx} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/20 shrink-0">
                          {isVideoUrl(url) ? (
                            <video src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                              setSelectingItem(prev => prev ? { ...prev, imageUrl: url } : null);
                            }} autoPlay loop muted playsInline />
                          ) : (
                            <img src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                              setSelectingItem(prev => prev ? { ...prev, imageUrl: url } : null);
                            }} alt="" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Owner Post Controls */}
                  {(() => {
                    const isOwner = Boolean(
                      user && user.id && (selectingItem.userId === user.id || selectingItem.sellerId === user.id)
                    );
                    if (!isOwner) return null;

                    return (
                      <div className={clsx(
                        "p-3 rounded-2xl border flex items-center justify-between gap-2 mt-1 transition-colors",
                        (theme === 'dark' || theme === 'midnight')
                          ? "bg-slate-900/60 border-slate-800"
                          : "bg-slate-50 border-slate-200"
                      )}>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{i18n.language === 'ku' ? 'بەڕێوەبردنی پۆست' : i18n.language === 'ar' ? 'إدارة المنشور' : 'Manage post'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const itemToEdit = selectingItem;
                              setSelectingItem(null);
                              setEditingFullItem(itemToEdit);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-white" />
                            <span>{i18n.language === 'ku' ? 'دەستکاری' : i18n.language === 'ar' ? 'تعديل' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await handleDelete(selectingItem.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1 border border-rose-500/20 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{i18n.language === 'ku' ? 'سڕینەوە' : i18n.language === 'ar' ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Size Selection (Only if distinct sizes exist) */}
                {selectingItem.sizes && selectingItem.sizes.filter(s => s && s.trim() !== '' && s !== 'قەبارەی ئاسایی' && s !== 'Standard' && s !== 'ئاسایی').length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {i18n.language === 'ku' ? 'قەبارە (سایز)' : i18n.language === 'ar' ? 'المقاس' : 'Select Size'}
                    </label>
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowSizeDropdown(!showSizeDropdown);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
                        className={clsx(
                          "w-full px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between border-2 shadow-md relative z-10 cursor-pointer",
                          (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                            ? "bg-slate-950 border-white/20 text-white hover:border-amber-400"
                            : "bg-white border-slate-300 text-slate-900 hover:border-indigo-500 shadow-xs"
                        )}
                      >
                        <span className="font-bold">{selectedSize || (i18n.language === 'ku' ? 'هەڵبژاردنی قەبارە' : i18n.language === 'ar' ? 'اختر المقاس' : 'Choose Size')}</span>
                        <Layers className={clsx("w-4 h-4 text-amber-400 transition-transform", showSizeDropdown && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {showSizeDropdown && selectingItem.sizes && selectingItem.sizes.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={clsx(
                              "absolute z-[600] w-full mt-2 rounded-2xl border overflow-hidden shadow-2xl divide-y",
                              (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                                ? "bg-slate-900 border-white/20 divide-white/10 text-white"
                                : "bg-white border-slate-300 divide-slate-100 text-slate-900"
                            )}
                          >
                            {selectingItem.sizes.map(size => (
                              <button
                                key={size}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedSize(size);
                                  setShowSizeDropdown(false);
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                }}
                                className={clsx(
                                  "w-full px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer",
                                  selectedSize === size 
                                    ? "text-amber-400 bg-amber-400/15 font-black" 
                                    : (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                                      ? "text-slate-100 hover:text-white hover:bg-white/10" 
                                      : "text-slate-800 hover:text-black hover:bg-slate-100"
                                )}
                              >
                                <span>{size}</span>
                                {selectedSize === size && <Check className="w-4 h-4 text-amber-400 stroke-[2.5]" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Color Selection (Only if colors exist) */}
                {selectingItem.colors && selectingItem.colors.filter(c => c && c.trim() !== '').length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {i18n.language === 'ku' ? 'ڕەنگ' : i18n.language === 'ar' ? 'اللون' : 'Select Color'}
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowColorDropdown(!showColorDropdown);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                        }}
                        className={clsx(
                          "w-full px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between border-2 shadow-md relative z-10 cursor-pointer",
                          (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                            ? "bg-slate-950 border-white/20 text-white hover:border-amber-400"
                            : "bg-white border-slate-300 text-slate-900 hover:border-indigo-500 shadow-xs"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {selectedColor && (
                            <div 
                              className="w-4 h-4 rounded-full border border-white/30 shadow-xs" 
                              style={{ backgroundColor: COMMON_COLORS.find(c => (c.name?.toLowerCase() || '') === (selectedColor?.toLowerCase() || '') || (c.ku?.toLowerCase() || '') === (selectedColor?.toLowerCase() || '') || (c.id?.toLowerCase() || '') === (selectedColor?.toLowerCase() || ''))?.hex || (selectedColor?.startsWith('#') ? selectedColor : '#64748b') }} 
                            />
                          )}
                          <span className="font-bold">{selectedColor || (i18n.language === 'ku' ? 'هەڵبژاردنی ڕەنگ' : i18n.language === 'ar' ? 'اختر اللون' : 'Choose Color')}</span>
                        </div>
                        <Layers className={clsx("w-4 h-4 text-amber-400 transition-transform", showColorDropdown && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {showColorDropdown && selectingItem.colors && selectingItem.colors.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={clsx(
                              "absolute z-[600] w-full mt-2 rounded-2xl border overflow-hidden shadow-2xl divide-y",
                              (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                                ? "bg-slate-900 border-white/20 divide-white/10 text-white"
                                : "bg-white border-slate-300 divide-slate-100 text-slate-900"
                            )}
                          >
                            {selectingItem.colors.map(colorName => {
                              if (!colorName) return null;
                              const colorConst = COMMON_COLORS.find(c => 
                                (c.name?.toLowerCase() || '') === colorName.toLowerCase() || 
                                (c.ku?.toLowerCase() || '') === colorName.toLowerCase() ||
                                (c.id?.toLowerCase() || '') === colorName.toLowerCase()
                              );
                              const hex = colorConst?.hex || (colorName.startsWith('#') ? colorName : '#64748b');

                              return (
                                <button
                                  key={colorName}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedColor(colorName);
                                    setShowColorDropdown(false);
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className={clsx(
                                    "w-full px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-4 cursor-pointer",
                                    selectedColor === colorName 
                                      ? "text-amber-400 bg-amber-400/15 font-black" 
                                      : (theme === 'dark' || theme === 'midnight' || theme === 'tokyo' || theme === 'emerald' || theme === 'royal' || theme === 'sunset')
                                        ? "text-slate-100 hover:text-white hover:bg-white/10" 
                                        : "text-slate-800 hover:text-black hover:bg-slate-100"
                                  )}
                                >
                                  <div className="w-6 h-6 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: hex }} />
                                  <span className="flex-1 text-left">{colorName}</span>
                                  {selectedColor === colorName && <Check className="w-4 h-4 text-amber-400 stroke-[2.5]" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Final Price with Delivery Breakdown Card */}
                {(() => {
                  const isKurdish = i18n.language === 'ku';
                  const isArabic = i18n.language === 'ar';
                  
                  const rawPrice = Number(selectingItem.price || 0);
                  const itemPriceIqd = rawPrice >= 1000 ? rawPrice : rawPrice * 1500;
                  const deliveryFeeIqd = 4000;
                  const finalTotalIqd = itemPriceIqd + deliveryFeeIqd;

                  return (
                    <div className={clsx(
                      "p-4 rounded-2xl border my-3 space-y-2.5 shadow-xs transition-colors",
                      (theme === 'dynamic' || theme === 'raining' || theme === 'dark' || theme === 'midnight') 
                        ? "bg-slate-900/90 border-slate-800 text-slate-200" 
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    )}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 text-xs font-bold">
                        <span className={clsx("flex items-center gap-1.5 font-extrabold uppercase tracking-wide", (theme === 'dark' || theme === 'midnight') ? "text-emerald-400" : "text-emerald-600")}>
                          <Truck className="w-4 h-4" />
                          <span>{isKurdish ? 'تێچووی کۆتایی و گەیاندن' : isArabic ? 'السعر النهائي مع التوصيل' : 'Final Price with Delivery'}</span>
                        </span>
                        <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-black border", (theme === 'dark' || theme === 'midnight') ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                          {isKurdish ? 'گەیاندنی خێرا' : isArabic ? 'توصيل سريع' : 'Fast Delivery'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs font-medium">
                        <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                          <span>{isKurdish ? 'نرخی کاڵا:' : isArabic ? 'سعر المنتج:' : 'Item Price:'}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{itemPriceIqd.toLocaleString()} {isKurdish ? 'دینار' : isArabic ? 'د.ع' : 'IQD'}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                          <span>{isKurdish ? 'تێچووی گەیاندن:' : isArabic ? 'أجور التوصيل:' : 'Delivery Fee:'}</span>
                          <span className={clsx("font-bold font-mono", (theme === 'dark' || theme === 'midnight') ? "text-emerald-400" : "text-emerald-600")}>{deliveryFeeIqd.toLocaleString()} {isKurdish ? 'دینار' : isArabic ? 'د.ع' : 'IQD'}</span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-dashed border-slate-200 dark:border-white/10 flex justify-between items-center">
                        <span className="font-black text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          {isKurdish ? 'کۆی گشتی لەگەڵ گەیاندن:' : isArabic ? 'المجموع النهائي مع التوصيل:' : 'Grand Total with Delivery:'}
                        </span>
                        <span className={clsx("text-base sm:text-lg font-black font-mono", (theme === 'dark' || theme === 'midnight') ? "text-emerald-400" : "text-emerald-600")}>
                          {finalTotalIqd.toLocaleString()} {isKurdish ? 'دینار' : isArabic ? 'د.ع' : 'IQD'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Primary Actions: Add to Cart & Direct Buy */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await addToCart(selectingItem, selectedSize, selectedColor, true);
                    }}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/20 border border-indigo-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ShoppingBasket className="w-4 h-4 text-white shrink-0" />
                    <span>{i18n.language === 'ku' ? 'خستنە نێو سەبەتە' : i18n.language === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart'}</span>
                  </button>

                  <a
                    href={(() => {
                      const rawPrice = Number(selectingItem.price || 0);
                      const itemPriceIqd = rawPrice >= 1000 ? rawPrice : rawPrice * 1500;
                      const deliveryFeeIqd = 4000;
                      const userPts = Number(user?.loyaltyPoints || 0);
                      const maxLoyaltyDiscountIqd = Math.min(userPts * 100, Math.floor(itemPriceIqd * 0.5));
                      const pointsToRedeem = directBuyUseLoyalty ? Math.floor(maxLoyaltyDiscountIqd / 100) : 0;
                      const loyaltyDiscountIqd = directBuyUseLoyalty ? maxLoyaltyDiscountIqd : 0;
                      const finalTotalIqd = Math.max(0, itemPriceIqd + deliveryFeeIqd - loyaltyDiscountIqd);
                      const pointsWillEarn = Math.floor(Math.max(0, itemPriceIqd - loyaltyDiscountIqd) / 1000);
                      const rawPhone = selectingItem.sellerPhone || (user as any)?.phone || '9647746573763';
                      let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                      if (cleanPhone.startsWith('07')) cleanPhone = '964' + cleanPhone.substring(1);
                      else if (cleanPhone.startsWith('7') && cleanPhone.length === 10) cleanPhone = '964' + cleanPhone;

                      const isKurdish = i18n.language === 'ku';
                      const isArabic = i18n.language === 'ar';

                      let orderMsg = '';
                      if (isKurdish) {
                        orderMsg = `🛍️ *داواکاری کڕینی نوێ لە ڕێگەی پلاتفۆرمی Payv*\n\n` +
                          `📦 *زانیاری کاڵا:*\n` +
                          `• ناوی کاڵا: ${selectingItem.title}\n` +
                          `• کۆدی کاڵا: #${selectingItem.id.slice(-8)}\n` +
                          `• نرخی کاڵا: ${itemPriceIqd.toLocaleString()} دینار\n` +
                          `• تێچووی گەیاندن: ${deliveryFeeIqd.toLocaleString()} دینار\n` +
                          (loyaltyDiscountIqd > 0 ? `• داشکاندنی خاڵەکان: -${loyaltyDiscountIqd.toLocaleString()} دینار (${pointsToRedeem} خاڵ بەکارهات)\n` : '') +
                          `• *کۆی گشتی لەگەڵ گەیاندن:* ${finalTotalIqd.toLocaleString()} دینار\n` +
                          `• خاڵی وەفاداری بەدەستهاتوو: +${pointsWillEarn} خاڵ\n` +
                          (selectedSize ? `• قەبارە (سایز): ${selectedSize}\n` : '') +
                          (selectedColor ? `• ڕەنگ: ${selectedColor}\n` : '') +
                          (selectingItem.category ? `• بەش/پۆلێن: ${selectingItem.category}\n` : '') +
                          (selectingItem.userName ? `• فرۆشیار: ${selectingItem.userName}\n` : '') +
                          `\n👤 *زانیاری کڕیار:*\n` +
                          `• ناوی کڕیار: ${user?.name || 'کڕیار'}\n` +
                          (user?.phone ? `• ژمارەی پەیوەندی: ${user.phone}\n` : '') +
                          (user?.city || user?.address ? `• شار / ناونیشان: ${user.city || user.address}\n` : '') +
                          `\n🔗 *بەستەری کاڵا:*\n${typeof window !== 'undefined' ? window.location.origin : ''}/?item=${selectingItem.id}\n\n` +
                          `سڵاو، دەمەوێت ئەم بەرهەمە بکڕم بە نرخی کۆتایی (${finalTotalIqd.toLocaleString()} دینار) لەگەڵ گەیاندن، تکایە ڕێکاری ناردنم بۆ دیاری بکەن.`;
                      } else if (isArabic) {
                        orderMsg = `🛍️ *طلب شراء جديد عبر Payv Marketplace*\n\n` +
                          `📦 *تفاصيل المنتج:*\n` +
                          `• اسم المنتج: ${selectingItem.title}\n` +
                          `• كود المنتج: #${selectingItem.id.slice(-8)}\n` +
                          `• سعر المنتج: ${itemPriceIqd.toLocaleString()} د.ع\n` +
                          `• أجور التوصيل: ${deliveryFeeIqd.toLocaleString()} د.ع\n` +
                          (loyaltyDiscountIqd > 0 ? `• خصم نقاط المكافأة: -${loyaltyDiscountIqd.toLocaleString()} د.ع (${pointsToRedeem} نقطة)\n` : '') +
                          `• *المجموع النهائي مع التوصيل:* ${finalTotalIqd.toLocaleString()} د.ع\n` +
                          `• نقاط المكافأة المكتسبة: +${pointsWillEarn} نقطة\n` +
                          (selectedSize ? `• المقاس: ${selectedSize}\n` : '') +
                          (selectedColor ? `• اللون: ${selectedColor}\n` : '') +
                          (selectingItem.category ? `• القسم: ${selectingItem.category}\n` : '') +
                          (selectingItem.userName ? `• التاجر: ${selectingItem.userName}\n` : '') +
                          `\n👤 *بيانات المشتري:*\n` +
                          `• الاسم: ${user?.name || 'مشتري'}\n` +
                          (user?.phone ? `• الهاتف: ${user.phone}\n` : '') +
                          (user?.city || user?.address ? `• المدينة / العنوان: ${user.city || user.address}\n` : '') +
                          `\n🔗 *رابط المنتج:*\n${typeof window !== 'undefined' ? window.location.origin : ''}/?item=${selectingItem.id}\n\n` +
                          `مرحباً، أود شراء هذا المنتج بالمجموع النهائي (${finalTotalIqd.toLocaleString()} د.ع) مع التوصيل، يرجى تأكيد الطلب.`;
                      } else {
                        orderMsg = `🛍️ *New Order via Payv Marketplace*\n\n` +
                          `📦 *Product Details:*\n` +
                          `• Item: ${selectingItem.title}\n` +
                          `• Code: #${selectingItem.id.slice(-8)}\n` +
                          `• Item Price: ${itemPriceIqd.toLocaleString()} IQD\n` +
                          `• Delivery Fee: ${deliveryFeeIqd.toLocaleString()} IQD\n` +
                          (loyaltyDiscountIqd > 0 ? `• Loyalty Discount: -${loyaltyDiscountIqd.toLocaleString()} IQD (${pointsToRedeem} pts)\n` : '') +
                          `• *Grand Total with Delivery:* ${finalTotalIqd.toLocaleString()} IQD\n` +
                          `• Points Earned: +${pointsWillEarn} Loyalty Points\n` +
                          (selectedSize ? `• Size: ${selectedSize}\n` : '') +
                          (selectedColor ? `• Color: ${selectedColor}\n` : '') +
                          (selectingItem.category ? `• Category: ${selectingItem.category}\n` : '') +
                          (selectingItem.userName ? `• Seller: ${selectingItem.userName}\n` : '') +
                          `\n👤 *Buyer Details:*\n` +
                          `• Name: ${user?.name || 'Customer'}\n` +
                          (user?.phone ? `• Phone: ${user.phone}\n` : '') +
                          (user?.city || user?.address ? `• City / Location: ${user.city || user.address}\n` : '') +
                          `\n🔗 *Item Link:*\n${typeof window !== 'undefined' ? window.location.origin : ''}/?item=${selectingItem.id}\n\n` +
                          `Hello, I would like to purchase this product for a grand total of ${finalTotalIqd.toLocaleString()} IQD with delivery. Please arrange delivery.`;
                      }

                      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderMsg)}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      try {
                        const rawPrice = Number(selectingItem.price || 0);
                        const itemPriceIqd = rawPrice >= 1000 ? rawPrice : rawPrice * 1500;
                        const deliveryFeeIqd = 4000;
                        const userPts = Number(user?.loyaltyPoints || 0);
                        const maxLoyaltyDiscountIqd = Math.min(userPts * 100, Math.floor(itemPriceIqd * 0.5));
                        const pointsToRedeem = directBuyUseLoyalty ? Math.floor(maxLoyaltyDiscountIqd / 100) : 0;
                        const loyaltyDiscountIqd = directBuyUseLoyalty ? maxLoyaltyDiscountIqd : 0;
                        const finalTotalIqd = Math.max(0, itemPriceIqd + deliveryFeeIqd - loyaltyDiscountIqd);
                        const pointsWillEarn = Math.floor(Math.max(0, itemPriceIqd - loyaltyDiscountIqd) / 1000);
                        const orderId = `ORD-${Date.now()}`;

                        // 1. Record in orders history with loyalty points
                        await db.createOrder({
                          id: orderId,
                          _id: orderId,
                          userId: user?.id || 'sandbox-id',
                          buyerId: user?.id || 'sandbox-id',
                          customerName: user?.name || 'Customer',
                          phone: user?.phone || '',
                          city: user?.city || user?.address || 'Kurdistan',
                          location: user?.city || user?.address || 'Kurdistan',
                          totalPrice: finalTotalIqd,
                          total: finalTotalIqd,
                          subtotalPrice: itemPriceIqd,
                          deliveryFee: "4,000 Dinar",
                          pointsRedeemed: pointsToRedeem,
                          discountIqd: loyaltyDiscountIqd,
                          pointsEarned: pointsWillEarn,
                          status: 'pending',
                          sellerId: selectingItem.userId,
                          sellerName: selectingItem.userName,
                          sellerPhone: selectingItem.sellerPhone,
                          items: [
                            {
                              id: selectingItem.id,
                              title: selectingItem.title,
                              price: itemPriceIqd,
                              quantity: 1,
                              size: selectedSize || '',
                              color: selectedColor || '',
                              imageUrl: selectingItem.imageUrls?.[0] || selectingItem.imageUrl
                            }
                          ],
                          createdAt: new Date().toISOString()
                        });

                        // 2. Dispatch events to notify App.tsx & UI
                        window.dispatchEvent(new CustomEvent('orders_updated'));
                      } catch (err) {
                        console.warn("Order recording error:", err);
                      }
                    }}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-700/20 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-white shrink-0" />
                    <span>{i18n.language === 'ku' ? 'کڕینی ڕاستەوخۆ' : i18n.language === 'ar' ? 'شراء مباشر' : 'Direct Buy'}</span>
                  </a>

                  {/* Loyalty Points Redemption Toggle */}
                  {Number(user?.loyaltyPoints || 0) > 0 && (() => {
                    const rawP = Number(selectingItem.price || 0);
                    const itemPIqd = rawP >= 1000 ? rawP : rawP * 1500;
                    const userPts = Number(user?.loyaltyPoints || 0);
                    const maxDiscIqd = Math.min(userPts * 100, Math.floor(itemPIqd * 0.5));
                    const ptsToUse = Math.floor(maxDiscIqd / 100);

                    return (
                      <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-1.5 text-xs text-left rtl:text-right">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                            <span className="font-bold text-amber-900 dark:text-amber-200">
                              {i18n.language === 'ku' ? 'خاڵەکانی وەفاداری (پۆینت):' : 'Loyalty Points:'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-200 font-mono font-black text-[11px]">
                              {userPts.toLocaleString()} pts
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={directBuyUseLoyalty} 
                              onChange={(e) => setDirectBuyUseLoyalty(e.target.checked)} 
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                          <span>
                            {directBuyUseLoyalty 
                              ? (i18n.language === 'ku' ? `داشکاندنی ${maxDiscIqd.toLocaleString()} دینار جێبەجێکرا (${ptsToUse} خاڵ).` : `Discount of ${maxDiscIqd.toLocaleString()} IQD applied.`)
                              : (i18n.language === 'ku' ? `داشکاندنی تا ${maxDiscIqd.toLocaleString()} دینار وەربگرە بە خاڵەکانت.` : `Get up to ${maxDiscIqd.toLocaleString()} IQD discount.`)}
                          </span>
                          {directBuyUseLoyalty && (
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                              -{maxDiscIqd.toLocaleString()} IQD
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Social-Commerce Workflows: Gift Crowdfund & Shared Cart */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                  <button
                    type="button"
                    onClick={() => {
                      const itemToGift = { ...selectingItem };
                      setSelectingItem(null);
                      window.dispatchEvent(new CustomEvent('open_gift_crowdfund', {
                        detail: { product: itemToGift }
                      }));
                    }}
                    className={clsx(
                      "py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border",
                      theme === 'dark' || theme === 'midnight'
                        ? "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-pink-400"
                        : "bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700"
                    )}
                  >
                    <Gift className="w-4 h-4 text-pink-500 shrink-0" />
                    <span className="truncate">{i18n.language === 'ku' ? '🎁 دیاری بە کۆمەڵ' : i18n.language === 'ar' ? '🎁 هدية جماعية' : '🎁 Group Gift'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const itemPrice = Number(selectingItem.price || 0);
                        const initialItem = {
                          id: `sci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          itemId: selectingItem.id,
                          title: selectingItem.title,
                          price: itemPrice >= 1000 ? itemPrice / 1500 : itemPrice,
                          quantity: 1,
                          size: selectedSize || '',
                          color: selectedColor || '',
                          imageUrl: selectingItem.imageUrls?.[0] || selectingItem.imageUrl || '',
                          addedByUserId: user?.id || 'guest',
                          addedByUserName: user?.name || 'Guest User',
                          addedAt: Date.now(),
                          sellerId: selectingItem.userId,
                          sellerName: selectingItem.userName,
                          sellerPhone: selectingItem.sellerPhone
                        };
                        setSelectingItem(null);
                        const newCart = await db.createSharedCart(
                          {
                            id: user?.id || 'guest',
                            name: user?.name || 'Guest Host',
                            phone: user?.phone || ''
                          },
                          [initialItem]
                        );
                        window.dispatchEvent(new CustomEvent('open_shared_cart', {
                          detail: { cartId: newCart.id }
                        }));
                      } catch (e) {
                        console.error('Failed to create shared cart from product:', e);
                      }
                    }}
                    className={clsx(
                      "py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border",
                      theme === 'dark' || theme === 'midnight'
                        ? "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-indigo-400"
                        : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
                    )}
                  >
                    <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="truncate">{i18n.language === 'ku' ? '🛒 سەبەتەی هاوبەش' : i18n.language === 'ar' ? '🛒 سلة مشتركة' : '🛒 Shared Cart'}</span>
                  </button>
                </div>

                {/* Reviews Section */}
                <div className="pt-6 border-t border-white/10">
                  <ReviewSystem 
                    itemId={selectingItem.id}
                    sellerId={selectingItem.userId}
                    theme={theme}
                    currentUser={user}
                    item={selectingItem}
                    onReviewAdded={handleReviewAdded}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Seller Profile dialog overlay - Instagram Style */}
      {activeSeller && (
        <InstagramPublicProfileModal
          sellerId={activeSeller.id}
          currentUser={user}
          onClose={() => setActiveSeller(null)}
          onSelectItem={(item) => {
            setActiveSeller(null);
            setSelectingItem(item);
          }}
          onOpenMessaging={(targetSellerId, itemContext) => {
            setActiveSeller(null);
            if (onOpenMessaging) {
              onOpenMessaging(targetSellerId, itemContext);
            }
          }}
          onRequireAuth={onRequireAuth}
          fallbackInfo={{
            name: activeSeller.name,
            phone: activeSeller.phone,
            avatar: activeSeller.avatar,
            username: activeSeller.username,
            bio: activeSeller.bio,
            location: activeSeller.city,
            isPublic: activeSeller.isPublic,
            followers: activeSeller.followers,
            isVerified: activeSeller.isVerified
          }}
        />
      )}

      {/* Price Update Modal */}
      <AnimatePresence>
        {editingPriceItem && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPriceItem(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={clsx(
                "relative w-full max-w-md rounded-3xl border p-6 shadow-2xl z-[610]",
                theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between flex-row-reverse mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={clsx("font-extrabold text-base sm:text-lg", textPrimary[theme as keyof typeof textPrimary])}>
                      {i18n.language === 'ku' ? 'نوێکردنەوەی نرخی کاڵا' : i18n.language === 'ar' ? 'تحديث سعر المنتج' : 'Update Item Price'}
                    </h3>
                    <p className={clsx("text-xs truncate max-w-[200px]", textSecondary[theme as keyof typeof textSecondary])}>
                      {editingPriceItem.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPriceItem(null)}
                  className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={clsx("block text-xs font-bold mb-1.5", textSecondary[theme as keyof typeof textSecondary])}>
                    {i18n.language === 'ku' ? 'نرخی نوێ (بە دینار IQD)' : i18n.language === 'ar' ? 'السعر الجديد (بالدينار IQD)' : 'New Price (in Dinar / IQD)'}
                  </label>
                  <input
                    type="number"
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(e.target.value)}
                    placeholder="e.g. 15000"
                    className={clsx(
                      "w-full px-4 py-3 rounded-2xl border text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                      theme === 'dark' ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex gap-2.5 items-start">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">
                      {i18n.language === 'ku' ? 'ئاگادارکردنەوەی بەکارهێنەران 🔔' : i18n.language === 'ar' ? 'تنبيه قائمة المتابعة 🔔' : 'Real-time Watchlist Alert 🔔'}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {i18n.language === 'ku'
                        ? `${editingPriceItem.saves?.length || 0} بەکارهێنەر ئەم کاڵایەیان خستۆتە لیستی چاودێرییەوە. لەکاتی پاشەکەوتکردندا ئاگاداری ڕاستەوخۆیان بۆ دەچێت!`
                        : i18n.language === 'ar'
                        ? `قام ${editingPriceItem.saves?.length || 0} مستخدم بإضافة هذا المنتج لقائمة المتابعة. سيصلهم إشعار فوري عند تحديث السعر!`
                        : `${editingPriceItem.saves?.length || 0} user(s) added this item to their Watchlist. Updating the price will automatically trigger an in-app notification to all watchers!`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPriceItem(null)}
                    className="flex-1 py-3 rounded-2xl border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    {i18n.language === 'ku' ? 'پاشگەزبوونەوە' : i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const numericIQD = Number(newPriceInput);
                      if (!numericIQD || numericIQD <= 0) {
                        setToast({ message: i18n.language === 'ku' ? 'تکایە نرخێکی دروست بنووسە' : i18n.language === 'ar' ? 'يرجى إدخال سعر صحيح' : 'Please enter a valid price', type: 'error' });
                        return;
                      }
                      const usdPrice = numericIQD / 1500;
                      setIsUpdatingPrice(true);

                      const result = await db.updateMarketplaceItemPrice(
                        editingPriceItem.id,
                        usdPrice,
                        user?.id || 'seller-id',
                        user?.name || 'Seller'
                      );

                      setIsUpdatingPrice(false);
                      setEditingPriceItem(null);

                      if (result.success) {
                        setToast({
                          message: i18n.language === 'ku'
                            ? `نرخەکە نوێکرایەوە! ${result.notifiedCount} بەکارهێنەر ئاگادارکرانەوە 🔔`
                            : i18n.language === 'ar'
                            ? `تم تحديث السعر! تم إشعار ${result.notifiedCount} من المتابعين 🔔`
                            : `Price updated! Notified ${result.notifiedCount} watcher(s) 🔔`,
                          type: 'success'
                        });
                        loadItems();
                      }
                    }}
                    disabled={isUpdatingPrice}
                    className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Tag className="w-4 h-4" />
                    <span>{i18n.language === 'ku' ? 'پاشەکەوتکردن و ئاگادارکردنەوە' : i18n.language === 'ar' ? 'حفظ وإشعار المتابعين' : 'Save & Notify Watchers'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Full Post & Price Modal */}
      <EditPostModal
        isOpen={!!editingFullItem}
        item={editingFullItem}
        currentUser={user}
        theme={theme}
        onClose={() => setEditingFullItem(null)}
        onSuccess={(updatedItem, notifiedCount) => {
          setItems((prev) =>
            prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
          );
          if (selectingItem?.id === updatedItem.id) {
            setSelectingItem(updatedItem);
          }
          setToast({
            message:
              i18n.language === 'ku'
                ? `پۆستەکە بە سەرکەوتوویی نوێکرایەوە! ${
                    notifiedCount > 0
                      ? `(${notifiedCount} چاودێر ئاگادارکرانەوە 🔔)`
                      : ''
                  }`
                : i18n.language === 'ar'
                ? `تم تحديث المنشور بنجاح! ${
                    notifiedCount > 0
                      ? `(تم إشعار ${notifiedCount} من المتابعين 🔔)`
                      : ''
                  }`
                : `Post updated successfully! ${
                    notifiedCount > 0
                      ? `(${notifiedCount} watchers notified 🔔)`
                      : ''
                  }`,
            type: 'success',
          });
          loadItems();
        }}
      />

      {/* UI Components */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        title={i18n.language === 'ku' ? 'دڵنیابوونەوە لە سڕینەوە' : i18n.language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
        message={
          deleteAction === 'all' 
            ? (i18n.language === 'ku' ? 'ئایا دڵنیای لە سڕینەوەی هەموو پۆستەکان؟ ئەم کارە ناگەڕێتەوە.' : i18n.language === 'ar' ? 'هل أنت متأكد من مسح كافة المنشورات؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to CLEAR ALL posts? This cannot be undone.')
            : deleteAction === 'video'
            ? (i18n.language === 'ku' ? 'ئایا دڵنیای لە سڕینەوەی ئەم ڤیدیۆیە؟' : i18n.language === 'ar' ? 'هل أنت متأكد من حذف هذا الفيديو؟' : 'Are you sure you want to delete this video?')
            : deleteAction === 'primary'
            ? (i18n.language === 'ku' ? 'ئایا دڵنیای لە سڕینەوەی ئەم وێنەیە؟' : i18n.language === 'ar' ? 'هل أنت متأكد من حذف هذه الصورة الرئيسية؟' : 'Are you sure you want to delete this primary image?')
            : deleteAction === 'gallery'
            ? (i18n.language === 'ku' ? 'ئایا دڵنیای لە سڕینەوەی ئەم وێنەی گەلەرییە؟' : i18n.language === 'ar' ? 'هل أنت متأكد من حذف صورة المعرض هذه؟' : 'Are you sure you want to delete this gallery image?')
            : (i18n.language === 'ku' ? 'ئایا دڵنیای لە سڕینەوەی ئەم بابەتە؟' : i18n.language === 'ar' ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this item?')
        }
        confirmLabel={i18n.language === 'ku' ? 'سڕینەوە' : i18n.language === 'ar' ? 'حذف' : 'Delete'}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteId(null);
          setDeleteAction(null);
          setDeleteTargetIdx(null);
        }}
        type="danger"
      />

      <ConfirmationDialog
        isOpen={!!banConfirmUser}
        title={i18n.language === 'ku' ? 'سڕینەوە و بایکۆتکردنی هەژمار' : i18n.language === 'ar' ? 'حظر وحذف الحساب' : 'Ban and Delete Account'}
        message={
          i18n.language === 'ku'
            ? `ئایا دڵنیایت لە سڕینەوەی هەژمار و تەواوی کاڵاکانی (${banConfirmUser?.name}) و بایکۆتکردنی؟`
            : i18n.language === 'ar'
            ? `هل أنت متأكد من حذف حساب (${banConfirmUser?.name}) وجميع منتجاته وحظره؟`
            : `Are you sure you want to delete account and all items of (${banConfirmUser?.name}) and ban them?`
        }
        confirmLabel={i18n.language === 'ku' ? 'سڕینەوە و بایکۆت' : i18n.language === 'ar' ? 'حظر وحذف' : 'Ban & Delete'}
        onConfirm={confirmBanUser}
        onCancel={() => setBanConfirmUser(null)}
        type="danger"
      />

      <ItemReviewsModal
        isOpen={!!viewingReviewsItem}
        onClose={() => setViewingReviewsItem(null)}
        item={viewingReviewsItem}
        currentUser={user}
        theme={theme}
        onReviewAdded={() => {
          loadItems(true);
        }}
      />
     
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

            {/* Live Stream Viewing Modal (TikTok Style) */}
            <AnimatePresence>
              {selectedLiveSession && (
                <motion.div 
                  drag={isLiveMinimized}
                  dragMomentum={false}
                  dragElastic={0.12}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className={clsx(
                    isLiveMinimized
                      ? "fixed bottom-24 right-4 sm:right-6 z-[99999] w-36 sm:w-44 aspect-[9/16] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-red-500/90 bg-slate-950 cursor-grab active:cursor-grabbing touch-none select-none flex flex-col"
                      : "fixed inset-x-0 inset-y-0 bg-black/95 backdrop-blur-xl z-[99999] flex flex-col items-center justify-center p-0 sm:p-4 overscroll-contain transition-all duration-300"
                  )}
                >
                  {/* Active Gift Animation Overlay */}
                  <AnimatePresence>
                    {activeGift && !isLiveMinimized && (
                      <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.5 }}
                        animate={{ opacity: 1, y: -250, scale: 2.5 }}
                        exit={{ opacity: 0, scale: 3 }}
                        className="absolute z-[400] flex flex-col items-center pointer-events-none"
                      >
                        <span className="text-9xl drop-shadow-[0_0_40px_rgba(255,255,255,1)]">{activeGift.icon}</span>
                        <motion.span 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="text-white font-black text-3xl uppercase tracking-[0.4em] mt-6 bg-gradient-to-r from-yellow-400 via-rose-500 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
                        >
                          {activeGift.name}
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    className={clsx(
                      isLiveMinimized
                        ? "w-full h-full flex flex-col relative"
                        : "w-full h-full sm:h-auto sm:max-w-md sm:aspect-[9/19] bg-slate-950 sm:rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col sm:border sm:border-white/10"
                    )}
                  >
              {/* Header Overlay */}
              <div className={clsx(
                "z-20 flex items-center justify-between flex-row-reverse bg-gradient-to-b from-black/80 to-transparent",
                isLiveMinimized ? "absolute top-2 inset-x-2 p-0 pointer-events-auto" : "absolute top-0 inset-x-0 p-4"
              )}>
                {isLiveMinimized ? (
                  <>
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
                        title={i18n.language === 'ku' ? 'گەورەکردنەوە' : i18n.language === 'ar' ? 'تكبير' : 'Maximize'}
                      >
                        <Maximize2 className="w-3 h-3 text-emerald-400" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLiveSession(null);
                          setIsLiveMinimized(false);
                        }} 
                        className="w-6 h-6 rounded-full bg-red-600/85 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md active:scale-90 cursor-pointer transition-transform"
                        title={i18n.language === 'ku' ? 'داخستن' : i18n.language === 'ar' ? 'إغلاق' : 'Close'}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div 
                      onClick={() => {
                        handleOpenSellerProfile(selectedLiveSession.broadcasterId, {
                          name: selectedLiveSession.broadcasterName,
                          avatar: selectedLiveSession.broadcasterAvatar,
                          location: selectedLiveSession.location
                        });
                      }}
                      className="flex items-center gap-2 sm:gap-3 truncate cursor-pointer group pointer-events-auto"
                      title={i18n.language === 'ku' ? 'بینینی پرۆفایلی فرۆشیار' : i18n.language === 'ar' ? 'عرض ملف التاجر' : 'View seller profile'}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-red-600 to-pink-500 shrink-0 group-hover:scale-105 transition-transform">
                        <img 
                          src={selectedLiveSession.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLiveSession.broadcasterId}`} 
                          className="w-full h-full rounded-full object-cover" 
                          alt="" 
                        />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-white text-xs font-black tracking-tight truncate group-hover:text-amber-300 transition-colors">
                          {db.sanitizeBrandName ? db.sanitizeBrandName(selectedLiveSession.broadcasterName) : selectedLiveSession.broadcasterName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter animate-pulse">
                            LIVE
                          </span>
                          <span className="text-white/70 text-[9px] font-bold flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            {viewerCount}
                          </span>
                          <span className="text-emerald-300 text-[9px] font-bold flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="truncate max-w-[100px]">{selectedLiveSession.location || 'هەولێر'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
                      <button
                        onClick={() => setIsLiveMinimized(true)}
                        className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white border border-white/10 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title={i18n.language === 'ku' ? 'بچووککردنەوە' : i18n.language === 'ar' ? 'تصغير' : 'Minimize'}
                      >
                        <Minimize2 className="w-4 h-4 text-white/80" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedLiveSession(null);
                          setIsLiveMinimized(false);
                        }}
                        className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Video Area */}
              <div className="flex-1 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 relative flex items-center justify-center overflow-hidden">
                {/* Ambient Animated Live Studio Glow Backdrop (Guarantees no black screen) */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-950/40 to-rose-950/50 pointer-events-none" />
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

                {/* Background Poster while loading */}
                <img
                  src={selectedLiveSession.currentFrame || selectedLiveSession.featuredImage || selectedLiveSession.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLiveSession.broadcasterId}`}
                  alt=""
                  className="w-full h-full object-cover absolute inset-0 z-1 filter brightness-95 scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLiveSession.broadcasterId}`;
                  }}
                />

                {/* Continuous Live Video Player */}
                {(() => {
                  const raw = (selectedLiveSession as any).streamUrl || (selectedLiveSession as any).videoUrl;
                  const effectiveVideo = (raw && typeof raw === 'string' && !raw.includes('flower') && !raw.includes('friday') && !raw.includes('mixkit') && raw.trim().length > 0)
                    ? raw
                    : DEFAULT_LIVE_BROADCAST_VIDEO;
                  return (
                    <video 
                      src={effectiveVideo} 
                      poster={selectedLiveSession.currentFrame || selectedLiveSession.featuredImage || selectedLiveSession.broadcasterAvatar}
                      autoPlay 
                      loop 
                      playsInline 
                      webkit-playsinline="true"
                      x5-video-player-type="h5-page"
                      x5-video-player-fullscreen="true"
                      x5-playsinline="true"
                      muted={isLiveAudioMuted}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== DEFAULT_LIVE_BROADCAST_VIDEO) {
                          target.src = DEFAULT_LIVE_BROADCAST_VIDEO;
                          target.play().catch(() => {});
                        } else if (target.src !== FALLBACK_LIVE_BROADCAST_VIDEO) {
                          target.src = FALLBACK_LIVE_BROADCAST_VIDEO;
                          target.play().catch(() => {});
                        }
                      }}
                      className="w-full h-full object-cover relative z-5"
                    />
                  );
                })()}

                {/* Minimal Floating Sound Control overlay */}
                <button
                  type="button"
                  onClick={() => setIsLiveAudioMuted(!isLiveAudioMuted)}
                  className="absolute top-16 right-4 z-30 p-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-black/80 transition-all cursor-pointer shadow-lg"
                  title={isLiveAudioMuted ? (i18n.language === 'ku' ? 'دەنگ چالاک بکە' : i18n.language === 'ar' ? 'تشغيل الصوت' : 'Unmute') : (i18n.language === 'ku' ? 'بێدەنگکردن' : i18n.language === 'ar' ? 'كتم الصوت' : 'Mute')}
                >
                  {isLiveAudioMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </button>
                 
                 {/* Floating Hearts Animation Container */}
                 <div className="absolute inset-0 pointer-events-none overflow-hidden z-10" />

                 {/* Pinned Product Card */}
                 {pinnedProduct && (
                   <motion.div 
                     initial={{ x: -100, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     className="absolute bottom-24 left-4 right-4 z-30"
                   >
                     <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
                        <img src={pinnedProduct.imageUrls[0]} className="w-16 h-16 rounded-xl object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white text-[10px] font-black truncate uppercase">{pinnedProduct.title}</h5>
                          <p className="text-emerald-400 text-xs font-black">{pinnedProduct.price.toLocaleString()} IQD</p>
                        </div>
                        <button className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30">
                          {i18n.language === 'ku' ? 'کڕین' : i18n.language === 'ar' ? 'شراء' : 'BUY'}
                        </button>
                     </div>
                   </motion.div>
                 )}
              </div>

              {/* Comments Section */}
              <div className="h-48 px-4 py-2 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end pointer-events-none">
                 <div className="space-y-1.5 overflow-y-auto no-scrollbar pointer-events-auto max-h-full pb-4">
                    <AnimatePresence mode="popLayout">
                      {liveComments.map((comment, cIdx) => (
                        <motion.div 
                          key={`${comment.id || 'comment'}-${cIdx}`}
                          layout
                          initial={{ opacity: 0, x: -20, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -20, scale: 0.9 }}
                          className="flex flex-col bg-black/40 backdrop-blur-md px-3 py-1 rounded-2xl border border-white/5 w-fit shadow-lg"
                        >
                          <span className="text-white/60 text-[8px] font-black uppercase tracking-tighter mb-0.5">{comment.userName}</span>
                          <span className="text-white text-[11px] leading-tight font-medium drop-shadow-md">{comment.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
              </div>

              {/* Input Area */}
              <div className="flex flex-col bg-black/40 backdrop-blur-md">
                {/* TikTok Style Gift Panel */}
                <div className="px-4 py-3 border-b border-white/5 bg-white/5 pointer-events-auto">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
                    {GIFTS.map((gift) => (
                      <motion.button
                        key={gift.id}
                        whileHover={{ scale: 1.1, y: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleSendGift(gift)}
                        className="flex flex-col items-center gap-1.5 min-w-[70px] bg-gradient-to-b from-white/10 to-transparent rounded-2xl p-2.5 border border-white/10 transition-all shadow-xl hover:shadow-indigo-500/20 active:bg-white/20"
                      >
                        <span className="text-3xl filter drop-shadow-md">{gift.icon}</span>
                        <span className="text-[9px] text-white/80 font-black uppercase tracking-widest">{gift.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="p-4 flex items-center gap-3">
                  <input 
                    type="text"
                    placeholder={i18n.language === 'ku' ? 'کۆمێنت بنوسە...' : i18n.language === 'ar' ? 'أضف تعليقاً...' : 'Add a comment...'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (!newComment.trim() || !user) return;
                        db.addLiveComment({
                          sessionId: selectedLiveSession.id,
                          broadcasterId: selectedLiveSession.broadcasterId,
                          userId: user.id,
                          userName: user.name || 'Anonymous',
                          userAvatar: user.avatar || '',
                          text: newComment.trim()
                        });
                        setNewComment("");
                      }
                    }}
                    className="flex-1 bg-white/10 border border-white/10 rounded-full px-5 py-2.5 text-white text-xs placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button 
                    onClick={() => {
                      if (!newComment.trim() || !user) return;
                      db.addLiveComment({
                        sessionId: selectedLiveSession.id,
                        broadcasterId: selectedLiveSession.broadcasterId,
                        userId: user.id,
                        userName: user.name || 'Anonymous',
                        userAvatar: user.avatar || '',
                        text: newComment.trim()
                      });
                      setNewComment("");
                    }}
                    className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 active:scale-90 transition-transform"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Smooth Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-2xl backdrop-blur-md border border-indigo-400/30 transition-all duration-300 hover:scale-110 active:scale-95 group flex items-center gap-2 cursor-pointer"
          >
            <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-black hidden sm:inline">{i18n.language === 'ku' ? 'سەرەوە' : i18n.language === 'ar' ? 'للأعلى' : 'Top'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 🚀 Store Optimization Hub Modal */}
      <AnimatePresence>
        {showOptimizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptimizeModal(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={clsx(
                "relative z-10 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border overflow-hidden",
                theme === 'royal'
                  ? "bg-gradient-to-b from-[#0e1730] to-[#080d1e] border-amber-400/40 text-white"
                  : isDarkTheme
                  ? "bg-slate-900 border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      {t('Store Optimization')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {i18n.language === 'ku'
                        ? 'فرۆشگاکەت بپشکنە و ئەنجامی زیاتر و فرۆشی زیاتر بەدەستبهێنە'
                        : i18n.language === 'ar'
                        ? 'فحص أداء المتجر ورفع معدل التحويل والمبيعات'
                        : 'Actionable recommendations to maximize your store conversion rate.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOptimizeModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Store Health Score Gauge */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-amber-500 dark:text-amber-400">
                    86%
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-amber-500">
                      {i18n.language === 'ku' ? 'ئاستی ڕێکخستنی فرۆشگا' : i18n.language === 'ar' ? 'درجة تحسين المتجر' : 'Store Health Score'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {i18n.language === 'ku' ? 'زۆر باشە! لە سەرووی ٨٠٪ی فرۆشگاکانی دیکەیت' : 'High ranking! Outperforming 80% of stores'}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {i18n.language === 'ku' ? 'بەهێز' : 'Optimized'}
                </span>
              </div>

              {/* Actionable Checklist */}
              <div className="space-y-3 mb-6">
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="font-bold">
                      {i18n.language === 'ku' ? 'وێنەی کوالێتی بەرز و فرە گۆشە (HD Media)' : 'High-Resolution Photos & Angles'}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {i18n.language === 'ku' ? 'زیادکردنی لایەنی کەم ٣ وێنە بۆ هەر بەرهەمێک' : 'Each listed item has rich image gallery & specs'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="font-bold">
                      {i18n.language === 'ku' ? 'پەیوەندی و گفتوگۆی ڕاستەوخۆ (Live Chat & WhatsApp)' : 'Live Chat & WhatsApp Orders'}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {i18n.language === 'ku' ? 'وەڵامدانەوەی خێرای کڕیاران و پەیوەندیکردنی ڕاستەوخۆ' : 'Fast customer inquiries & instant WhatsApp orders'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="font-bold">
                      {i18n.language === 'ku' ? 'گەیاندنی خێرا (٤٠٠٠ دینار)' : 'Fast City Delivery Guarantee'}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      {i18n.language === 'ku' ? 'گەیاندنی پارێزگاکان چالاککراوە' : 'Direct courier network connected'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptimizeModal(false);
                    setToast({
                      message: i18n.language === 'ku' ? 'پڕۆفایلی فرۆشگاکەت بە سەرکەوتوویی باشتر کرا!' : 'Store optimization applied successfully!',
                      type: 'success'
                    });
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102 active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{i18n.language === 'ku' ? 'جێبەجێکردنی باشترسازییەکان' : 'Apply Optimizations'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptimizeModal(false);
                    if (user) {
                      onOpenProfile?.();
                    } else {
                      onRequireAuth?.();
                    }
                  }}
                  className="py-3 px-4 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-400 transition-colors cursor-pointer"
                >
                  {i18n.language === 'ku' ? 'فرۆشگاکەم' : 'My Store'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📷 Product QR & Barcode Scanner Modal */}
      <ProductQrScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        items={items}
        currentUser={user}
        onSelectItem={(item) => {
          setShowQrScanner(false);
          setSelectingItem(item);
        }}
        onAddToCart={(item) => {
          if (onTriggerPet) onTriggerPet();
          addToCart(item, '', '', true);
        }}
        onOpenMessaging={onOpenMessaging}
        onOpenProfile={(sellerId) => handleOpenSellerProfile(sellerId)}
        onSearchCode={(code) => {
          setSearchQuery(code);
          setShowQrScanner(false);
        }}
        theme={theme}
      />
    </div>
  );
}
