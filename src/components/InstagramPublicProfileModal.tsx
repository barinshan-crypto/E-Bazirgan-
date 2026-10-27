import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Grid,
  Film,
  Star,
  Phone,
  MessageSquare,
  Share2,
  CheckCircle2,
  MapPin,
  Lock,
  Globe,
  Heart,
  Eye,
  ShoppingBag,
  Layers,
  ArrowLeft,
  Check,
  Bell,
  Sparkles,
  ExternalLink,
  Package
} from 'lucide-react';
import clsx from 'clsx';
import { db, User, SellerProfile, MarketplaceItem } from '../lib/db';
import { useTranslation } from 'react-i18next';
import { SellerReviewSystem } from './SellerReviewSystem';

interface InstagramPublicProfileModalProps {
  sellerId: string;
  currentUser: User | null;
  onClose: () => void;
  onSelectItem?: (item: MarketplaceItem) => void;
  onOpenMessaging?: (sellerId: string, itemContext?: any) => void;
  onRequireAuth?: (action?: () => void) => void;
  fallbackInfo?: {
    name?: string;
    phone?: string;
    avatar?: string;
    location?: string;
    isVerified?: boolean;
    isPerfectSeller?: boolean;
    category?: string;
  };
}

export const InstagramPublicProfileModal: React.FC<InstagramPublicProfileModalProps> = ({
  sellerId,
  currentUser,
  onClose,
  onSelectItem,
  onOpenMessaging,
  onRequireAuth,
  fallbackInfo
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'reviews' | 'about'>('posts');
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [userPosts, setUserPosts] = useState<MarketplaceItem[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch full user and seller profile + posts
  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const [userDoc, sellerDoc, allItems] = await Promise.all([
          db.getUserById(sellerId).catch(() => null),
          db.getSellerProfile(sellerId).catch(() => null),
          db.getMarketplaceItems(false).catch(() => [])
        ]);

        if (!isMounted) return;

        setTargetUser(userDoc);
        setSellerProfile(sellerDoc);

        // Filter all posts authored by this user / seller
        const matchingPosts = (allItems || []).filter(item => 
          (item.userId === sellerId || item.sellerId === sellerId) && !item.isArchived
        );
        setUserPosts(matchingPosts);
      } catch (err) {
        console.error("Error loading Instagram profile data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, [sellerId]);

  // Derived user details
  const isVerified = Boolean(sellerProfile?.isVerified || targetUser?.isVerified || fallbackInfo?.isVerified);
  const isPerfectSeller = Boolean(sellerProfile?.isPerfectSeller || targetUser?.isPerfectSeller || fallbackInfo?.isPerfectSeller);
  const isPublic = targetUser ? (targetUser.isPublic !== false) : true;
  const isOwnProfile = currentUser?.id === sellerId;

  const displayName = sellerProfile?.businessName || targetUser?.name || fallbackInfo?.name || (isKurdish ? 'فرۆشیار' : isArabic ? 'التاجر' : 'Seller');
  const username = targetUser?.username || displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${sellerId.slice(0, 6)}`;
  const avatarUrl = sellerProfile?.logoUrl || targetUser?.avatar || fallbackInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerId}`;
  const bio = sellerProfile?.bio || targetUser?.bio || (isKurdish ? 'بەخێربێن بۆ پرۆفایلی فەرمی لە پلاتفۆرمی ئی-بازرگان.' : isArabic ? 'أهلاً بكم في الملف الشخصي الرسمي في منصة إي-بازركان.' : 'Welcome to official profile on E-BAZIRGAN platform.');
  const city = sellerProfile?.location || targetUser?.city || fallbackInfo?.location || (isKurdish ? 'کوردستان' : 'Kurdistan');
  const category = targetUser?.category || (sellerProfile as any)?.category || fallbackInfo?.category || (isKurdish ? 'بازرگانی گشتی' : isArabic ? 'تجارة عامة' : 'General Merchant');
  const phone = sellerProfile?.contactPhone || targetUser?.phone || fallbackInfo?.phone;
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';

  // Follower counts & state
  const followersList = sellerProfile?.followers || [];
  const isFollowing = currentUser?.id ? followersList.includes(currentUser.id) : false;
  const followersCount = followersList.length;
  const followingCount = targetUser?.followingCount || Math.max(Math.floor(followersCount * 0.4), 8);

  // Video reels
  const videoReels = useMemo(() => {
    return userPosts.filter(p => {
      const url = p.videoUrl || p.imageUrl || '';
      return p.videoUrl || /\.(mp4|webm|mov|m4v)($|\?)/i.test(url);
    });
  }, [userPosts]);

  // Handle follow / unfollow toggle
  const handleToggleFollow = async () => {
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth(() => handleToggleFollow());
      }
      return;
    }

    try {
      const nextFollowers = isFollowing
        ? followersList.filter(id => id !== currentUser.id)
        : [...followersList, currentUser.id];

      // Update local state immediately for instant feedback
      setSellerProfile(prev => prev ? { ...prev, followers: nextFollowers } : {
        id: sellerId,
        businessName: displayName,
        contactPhone: phone,
        logoUrl: avatarUrl,
        bio: bio,
        location: city,
        followers: nextFollowers,
        rating: 5.0,
        isVerified
      });

      // Persist in DB
      await db.toggleFollowSeller(currentUser.id, sellerId);

      const msg = isFollowing 
        ? (isKurdish ? 'لابردنی شوێنکەوتن' : isArabic ? 'تم إلغاء المتابعة' : 'Unfollowed') 
        : (isKurdish ? '🔔 شوێنکەوتیت! ئاگاداری کاڵای نوێ بۆ دێت' : isArabic ? '🔔 تمت المتابعة بنجاح' : '🔔 Following! Push alerts active');
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error("Follow toggle failed:", e);
    }
  };

  // Handle share profile link
  const handleShareProfile = () => {
    const url = `${window.location.origin}/?seller=${encodeURIComponent(sellerId)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setToastMessage(isKurdish ? 'لینکی پرۆفایل کۆپیکرا!' : isArabic ? 'تم نسخ رابط الملف الشخصي!' : 'Profile link copied!');
      setTimeout(() => {
        setIsCopied(false);
        setToastMessage(null);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full h-[100dvh] sm:h-[90vh] sm:max-h-[920px] max-w-2xl bg-white text-slate-900 sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden font-sans"
      >
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-full shadow-xl flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Instagram-Style Top Navigation Bar */}
        <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isKurdish ? 'داخستن' : isArabic ? 'إغلاق' : 'Close'}
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm text-slate-900">@{username}</span>
              {isVerified && (
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 fill-sky-500/20" />
              )}
              {isPerfectSeller && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 animate-pulse" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShareProfile}
              className="p-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isKurdish ? 'هاوبەشکردنی پرۆفایل' : isArabic ? 'مشاركة الملف' : 'Share Profile'}
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isKurdish ? 'داخستن' : isArabic ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar bg-white">
          {/* Header Info Section */}
          <div className="p-4 sm:p-6 pb-4 space-y-4">
            {/* Avatar & Key Metrics Bar (Instagram Layout) */}
            <div className="flex items-center justify-between gap-4">
              {/* Instagram Story Gradient Ring Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 shadow-md">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-xs" title="Online" />
              </div>

              {/* Three Instagram Stats Columns */}
              <div className="flex-1 flex items-center justify-around text-center">
                <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('posts')}>
                  <span className="block font-mono font-black text-base sm:text-lg text-slate-900">
                    {userPosts.length}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500">
                    {isKurdish ? 'پۆست' : isArabic ? 'المنشورات' : 'Posts'}
                  </span>
                </div>

                <div className="cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="block font-mono font-black text-base sm:text-lg text-slate-900">
                    {followersCount}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500">
                    {isKurdish ? 'شوێنکەوتوو' : isArabic ? 'المتابعون' : 'Followers'}
                  </span>
                </div>

                <div className="cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="block font-mono font-black text-base sm:text-lg text-slate-900">
                    {followingCount}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500">
                    {isKurdish ? 'شوێنکەوتە' : isArabic ? 'يتابع' : 'Following'}
                  </span>
                </div>

                <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('reviews')}>
                  <span className="font-mono font-black text-base sm:text-lg text-amber-500 flex items-center justify-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {(sellerProfile?.rating || 4.9).toFixed(1)}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500">
                    {isKurdish ? 'ڕا' : isArabic ? 'التقييم' : 'Rating'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Identity & Bio */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base sm:text-lg text-slate-900">
                  {displayName}
                </h2>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                    <CheckCircle2 className="w-3 h-3 text-sky-500" />
                    <span>{isKurdish ? 'پشڕاستکراو' : isArabic ? 'موثق' : 'Verified'}</span>
                  </span>
                )}
                {isPerfectSeller && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 text-amber-950 border border-amber-300 shadow-2xs">
                    <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                    <span>{isKurdish ? 'فرۆشیاری نموونەیی' : isArabic ? 'بائع متميز' : 'Perfect Seller'}</span>
                  </span>
                )}
                {isPublic ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Globe className="w-3 h-3" />
                    <span>{isKurdish ? 'گشتی' : isArabic ? 'عام' : 'Public'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3" />
                    <span>{isKurdish ? 'تایبەت' : isArabic ? 'خاص' : 'Private'}</span>
                  </span>
                )}
              </div>

              {category && (
                <p className="text-xs font-semibold text-indigo-600">
                  {category}
                </p>
              )}

              {bio && (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line pt-0.5">
                  {bio}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{city}</span>
                </span>
                {phone && (
                  <span className="flex items-center gap-1 font-mono text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{phone}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 pt-2">
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={clsx(
                    "flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95",
                    isFollowing
                      ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                  )}
                >
                  <Bell className={clsx("w-3.5 h-3.5", isFollowing ? "text-emerald-600 fill-emerald-600" : "text-white")} />
                  <span>
                    {isFollowing 
                      ? (isKurdish ? '✓ شوێنکەوتووی' : isArabic ? '✓ متابع' : '✓ Following') 
                      : (isKurdish ? '+ شوێنکەوتن' : isArabic ? '+ متابعة' : '+ Follow')}
                  </span>
                </button>
              )}

              {onOpenMessaging && !isOwnProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMessaging(sellerId);
                    onClose();
                  }}
                  className="flex-1 py-2 px-4 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isKurdish ? 'چات و نامە' : isArabic ? 'مراسلة' : 'Message'}</span>
                </button>
              )}

              {cleanPhone && (
                <a
                  href={`tel:${cleanPhone}`}
                  className="py-2 px-3.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                  title={isKurdish ? 'پەیوەندی' : isArabic ? 'اتصال' : 'Call'}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isKurdish ? 'پەیوەندی' : isArabic ? 'اتصال' : 'Call'}</span>
                </a>
              )}
            </div>
          </div>

          {/* 3. Instagram-Style 4-Tab Navigation */}
          <div className="flex border-b border-t border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={clsx(
                "flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer",
                activeTab === 'posts'
                  ? "border-slate-900 text-slate-900 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              )}
            >
              <Grid className="w-4 h-4" />
              <span>{isKurdish ? 'پۆستەکان' : isArabic ? 'المنشورات' : 'Posts'}</span>
              <span className="text-[10px] font-mono opacity-60">({userPosts.length})</span>
            </button>

            {videoReels.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('reels')}
                className={clsx(
                  "flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer",
                  activeTab === 'reels'
                    ? "border-slate-900 text-slate-900 font-black"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                )}
              >
                <Film className="w-4 h-4" />
                <span>{isKurdish ? 'ڕیڵز' : isArabic ? 'ريلز' : 'Reels'}</span>
                <span className="text-[10px] font-mono opacity-60">({videoReels.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={clsx(
                "flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer",
                activeTab === 'reviews'
                  ? "border-slate-900 text-slate-900 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              )}
            >
              <Star className="w-4 h-4" />
              <span>{isKurdish ? 'ڕا و پێداچوونەوە' : isArabic ? 'التقييمات' : 'Reviews'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={clsx(
                "flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer",
                activeTab === 'about'
                  ? "border-slate-900 text-slate-900 font-black"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              )}
            >
              <Package className="w-4 h-4" />
              <span>{isKurdish ? 'دەربارە' : isArabic ? 'حول' : 'About'}</span>
            </button>
          </div>

          {/* 4. Tab Content: Posts Grid / Private Screen */}
          <div className="p-1 sm:p-2">
            {/* Check Private Profile Barrier */}
            {!isPublic && !isOwnProfile ? (
              <div className="py-16 px-4 text-center max-w-sm mx-auto space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-10 h-10 text-slate-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-lg text-slate-900">
                    {isKurdish ? 'ئەم هەژمارە تایبەتە (Private Account)' : isArabic ? 'هذا الحساب خاص' : 'This Account is Private'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isKurdish 
                      ? 'پۆست و کاڵاکانی ئەم بەکارهێنەرە لە بینینی گشتی شاردراونەتەوە. دەتوانیت لە ڕێگەی چاتی تایبەتەوە پەیوەندی پێوە بکەیت.'
                      : isArabic 
                      ? 'منشورات ومنتجات هذا الحساب مخفية عن العرض العام. يمكنك مراسلته مباشرة عبر المحادثة.' 
                      : 'Posts and products from this account are private. You can send a direct message to contact the seller.'}
                  </p>
                </div>

                {onOpenMessaging && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenMessaging(sellerId);
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                  >
                    {isKurdish ? 'ناردنی نامە لە چات' : isArabic ? 'إرسال رسالة' : 'Send Message'}
                  </button>
                )}
              </div>
            ) : loading ? (
              <div className="grid grid-cols-3 gap-1 sm:gap-2 p-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activeTab === 'posts' ? (
              userPosts.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                    <Grid className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900">
                    {isKurdish ? 'هیچ پۆستێک بڵاونەکراوەتەوە' : isArabic ? 'لا توجد منشورات حتى الآن' : 'No posts yet'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {isKurdish ? 'ئەم بەکارهێنەرە هێشتا هیچ کاڵا یان پۆستێکی چالاکی دانەناوە.' : 'This user has not published any active posts yet.'}
                  </p>
                </div>
              ) : (
                /* INSTAGRAM 3-COLUMN SQUARE POSTS GRID */
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {userPosts.map(post => {
                    const thumbUrl = post.imageUrls?.[0] || post.imageUrl;
                    const rawPrice = Number(post.price || 0);
                    const priceIqd = rawPrice >= 1000 ? rawPrice : rawPrice * 1500;
                    const isVideo = Boolean(post.videoUrl || /\.(mp4|webm|mov)($|\?)/i.test(thumbUrl || ''));
                    const hasMultiImages = post.imageUrls && post.imageUrls.length > 1;

                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          if (onSelectItem) {
                            onSelectItem(post);
                            onClose();
                          }
                        }}
                        className="group relative aspect-square bg-slate-100 overflow-hidden rounded-md sm:rounded-xl cursor-pointer select-none"
                      >
                        {/* Thumbnail image or video poster */}
                        <img
                          src={thumbUrl}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top-Right Badges (Instagram Multi-photos or Video icon) */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10 pointer-events-none">
                          {hasMultiImages && (
                            <div className="p-1 rounded-md bg-black/60 backdrop-blur-xs text-white">
                              <Layers className="w-3 h-3" />
                            </div>
                          )}
                          {isVideo && (
                            <div className="p-1 rounded-md bg-black/60 backdrop-blur-xs text-white">
                              <Film className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Bottom-Left Price Badge */}
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white font-mono font-black text-[9px] sm:text-[10px] pointer-events-none">
                          {priceIqd.toLocaleString()} {isKurdish ? 'د.ع' : 'IQD'}
                        </div>

                        {/* Hover Overlay with Likes & Views (Instagram Style) */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 sm:gap-4 text-white font-black text-xs sm:text-sm">
                          <span className="flex items-center gap-1 drop-shadow">
                            <Heart className="w-4 h-4 fill-white text-white" />
                            <span>{(post.likes && post.likes.length) || 0}</span>
                          </span>
                          <span className="flex items-center gap-1 drop-shadow">
                            <Eye className="w-4 h-4 text-white" />
                            <span>{(post.views || 12).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === 'reels' ? (
              /* Instagram Reels 9:16 Portrait Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {videoReels.map(reel => (
                  <div
                    key={reel.id}
                    onClick={() => {
                      if (onSelectItem) {
                        onSelectItem(reel);
                        onClose();
                      }
                    }}
                    className="relative aspect-[9/16] rounded-xl bg-slate-900 overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={reel.imageUrl}
                      alt={reel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                      <p className="text-xs font-bold line-clamp-1">{reel.title}</p>
                      <span className="text-[10px] text-amber-300 font-mono font-black mt-0.5">
                        {Number(reel.price).toLocaleString()} IQD
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'reviews' ? (
              /* Reviews Tab */
              <div className="p-2 sm:p-4">
                <SellerReviewSystem
                  sellerId={sellerId}
                  sellerName={displayName}
                  sellerProfile={sellerProfile}
                  currentUser={currentUser}
                  isAdmin={Boolean(currentUser?.isAdmin)}
                  theme="light"
                  onRequireAuth={() => onRequireAuth?.()}
                  onRatingUpdated={(newRating, newCount) => {
                    setSellerProfile(prev => prev ? { ...prev, rating: newRating, reviewCount: newCount } : null);
                  }}
                />
              </div>
            ) : (
              /* About / Contact Tab */
              <div className="p-4 space-y-4 text-slate-800">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-black text-sm text-slate-900">
                    {isKurdish ? 'زانیاری پەیوەندی و دوکان' : isArabic ? 'معلومات المتجر والاتصال' : 'Store & Contact Information'}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">{isKurdish ? 'خاوەن هەژمار' : 'Account Owner'}:</span>
                      <span className="font-bold text-slate-900">{displayName}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">{isKurdish ? 'جۆری چالاکی' : 'Category'}:</span>
                      <span className="font-bold text-slate-900">{category}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">{isKurdish ? 'شار و ناونیشان' : 'City & Location'}:</span>
                      <span className="font-bold text-slate-900">{city}</span>
                    </div>
                    {phone && (
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                        <span className="text-slate-500">{isKurdish ? 'تەلەفۆن' : 'Phone'}:</span>
                        <a href={`tel:${cleanPhone}`} className="font-mono font-bold text-indigo-600 underline">
                          {phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InstagramPublicProfileModal;
