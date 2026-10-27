import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Camera, 
  ShoppingBag, 
  Heart, 
  X, 
  Trash2, 
  Sparkles, 
  Check, 
  Clock, 
  Volume2, 
  VolumeX, 
  UploadCloud, 
  MessageCircle, 
  Send,
  MessageSquare,
  Flame,
  ThumbsUp,
  Smile
} from 'lucide-react';
import { db, User, DailyStory, MarketplaceItem, StoryComment } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import { ConfirmationDialog } from './UI';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface DailyStoriesTrayProps {
  user: User | null;
  theme?: string;
  onRequireAuth: (action?: () => void) => void;
  onOpenItemModal?: (item: MarketplaceItem) => void;
  onOpenMessaging?: (sellerId: string, itemContext?: any) => void;
  onOpenSellerProfile?: (sellerId: string, fallbackInfo?: any) => void;
  myItems?: MarketplaceItem[];
}

const QUICK_REACTIONS = ['🔥', '❤️', '😍', '👏', '😮', '😂', '💯', '🛍️'];

export default function DailyStoriesTray({
  user,
  theme = 'dark',
  onRequireAuth,
  onOpenItemModal,
  onOpenMessaging,
  onOpenSellerProfile,
  myItems = []
}: DailyStoriesTrayProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ku' || i18n.language === 'ar';
  
  const [stories, setStories] = useState<DailyStory[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Story Viewer State
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);

  // Story Comments State
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [showCommentsList, setShowCommentsList] = useState(false);
  const [commentSentSuccess, setCommentSentSuccess] = useState(false);

  // Add Story Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploadMediaUrl, setUploadMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  // Load Stories
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const fetchStories = async () => {
      setLoading(true);
      const res = await db.getDailyStories();
      setStories(res);
      setLoading(false);
    };

    fetchStories();
    unsubscribe = db.onDailyStoriesChange((updated) => {
      setStories(updated);
    });

    const handleLocalUpdate = () => {
      fetchStories();
    };
    window.addEventListener('payv_stories_updated', handleLocalUpdate);

    const handleOpenStoryEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ storyId: string }>;
      const storyId = customEvent.detail?.storyId;
      if (!storyId) return;
      
      db.getDailyStories().then((allStories) => {
        const targetStory = allStories.find(s => s.id === storyId);
        if (targetStory) {
          setStories(prev => {
            if (!prev.some(s => s.id === storyId)) {
              return [targetStory, ...prev];
            }
            return prev;
          });
        }
        setActiveStoryGroupIndex(0);
        setActiveStoryItemIndex(0);
        setProgressPercent(0);
        setIsPaused(false);
      });
    };
    window.addEventListener('payv_open_story', handleOpenStoryEvent);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('payv_stories_updated', handleLocalUpdate);
      window.removeEventListener('payv_open_story', handleOpenStoryEvent);
    };
  }, []);

  // Group stories by seller
  const sellerStoryGroups = useMemo(() => {
    const map = new Map<string, {
      sellerId: string;
      sellerName: string;
      sellerAvatar?: string;
      sellerPhone?: string;
      stories: DailyStory[];
      allViewed: boolean;
      latestCreatedAt: number;
    }>();

    const currentUserId = user?.id || '';

    stories.forEach(story => {
      if (!map.has(story.sellerId)) {
        map.set(story.sellerId, {
          sellerId: story.sellerId,
          sellerName: story.sellerName || 'فرۆشیار',
          sellerAvatar: story.sellerAvatar,
          sellerPhone: story.sellerPhone,
          stories: [],
          allViewed: true,
          latestCreatedAt: story.createdAt
        });
      }

      const group = map.get(story.sellerId)!;
      group.stories.push(story);
      if (story.createdAt > group.latestCreatedAt) {
        group.latestCreatedAt = story.createdAt;
      }

      const isViewedByMe = currentUserId ? (story.views?.includes(currentUserId) ?? false) : false;
      if (!isViewedByMe) {
        group.allViewed = false;
      }
    });

    // Convert map to array and sort unviewed first, then by latest timestamp
    return Array.from(map.values()).sort((a, b) => {
      if (a.allViewed !== b.allViewed) {
        return a.allViewed ? 1 : -1;
      }
      return b.latestCreatedAt - a.latestCreatedAt;
    });
  }, [stories, user?.id]);

  const activeGroup = activeStoryGroupIndex !== null ? sellerStoryGroups[activeStoryGroupIndex] : null;
  const currentStory = activeGroup ? activeGroup.stories[activeStoryItemIndex] : null;

  // Auto-scroll to bottom of comments when comments list opens or changes
  useEffect(() => {
    if (showCommentsList && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showCommentsList, currentStory?.comments?.length]);

  // Story Progress Timer
  useEffect(() => {
    if (!currentStory || isPaused) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    // Mark as viewed
    if (user?.id && currentStory.id) {
      db.viewDailyStory(currentStory.id, user.id);
    }

    const duration = currentStory.mediaType === 'video' ? 14000 : 7000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    setProgressPercent(0);

    progressTimerRef.current = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [activeStoryGroupIndex, activeStoryItemIndex, isPaused, currentStory?.id]);

  const handleNextStory = () => {
    if (!activeGroup) return;
    if (activeStoryItemIndex < activeGroup.stories.length - 1) {
      setActiveStoryItemIndex(prev => prev + 1);
      setProgressPercent(0);
    } else {
      // Go to next seller group if available
      if (activeStoryGroupIndex !== null && activeStoryGroupIndex < sellerStoryGroups.length - 1) {
        setActiveStoryGroupIndex(prev => (prev !== null ? prev + 1 : null));
        setActiveStoryItemIndex(0);
        setProgressPercent(0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const handlePrevStory = () => {
    if (activeStoryItemIndex > 0) {
      setActiveStoryItemIndex(prev => prev - 1);
      setProgressPercent(0);
    } else if (activeStoryGroupIndex !== null && activeStoryGroupIndex > 0) {
      const prevGroup = sellerStoryGroups[activeStoryGroupIndex - 1];
      setActiveStoryGroupIndex(activeStoryGroupIndex - 1);
      setActiveStoryItemIndex(prevGroup.stories.length - 1);
      setProgressPercent(0);
    }
  };

  const openStoryViewer = (groupIndex: number) => {
    setActiveStoryGroupIndex(groupIndex);
    setActiveStoryItemIndex(0);
    setProgressPercent(0);
    setIsPaused(false);
    setShowCommentsList(false);
  };

  const closeStoryViewer = () => {
    setActiveStoryGroupIndex(null);
    setActiveStoryItemIndex(0);
    setProgressPercent(0);
    setIsPaused(false);
    setShowCommentsList(false);
  };

  // Like story
  const handleLikeStory = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!currentStory) return;

    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 1000);
    await db.likeDailyStory(currentStory.id, user.id, user.name || user.email || 'بەکارهێنەر');
  };

  const [showDeleteStoryConfirm, setShowDeleteStoryConfirm] = useState(false);

  // Delete own story
  const handleDeleteStory = () => {
    if (!currentStory || !user) return;
    if (currentStory.sellerId !== user.id && user.role !== 'admin') return;
    setShowDeleteStoryConfirm(true);
  };

  const confirmDeleteStory = async () => {
    if (!currentStory) return;
    setShowDeleteStoryConfirm(false);
    await db.deleteDailyStory(currentStory.id);
    handleNextStory();
  };

  // Direct Buy Trigger
  const handleDirectBuyProduct = () => {
    if (!currentStory?.product) return;
    
    const prod = currentStory.product;
    const itemToOpen: MarketplaceItem = {
      id: prod.id,
      userId: currentStory.sellerId,
      sellerId: currentStory.sellerId,
      userName: currentStory.sellerName,
      userAvatar: currentStory.sellerAvatar,
      sellerPhone: prod.sellerPhone || currentStory.sellerPhone,
      title: prod.title,
      description: currentStory.caption || 'لە چیرۆکی ۲٤ کاتژمێرییەوە بینراوە',
      price: prod.price,
      imageUrl: prod.imageUrl || currentStory.mediaUrl,
      category: 'general',
      createdAt: currentStory.createdAt,
      postType: 'marketplace',
      sourceCode: prod.sourceCode
    };

    closeStoryViewer();
    if (onOpenItemModal) {
      onOpenItemModal(itemToOpen);
    }
  };

  // Send Story Comment / Reaction Handler (Optimistic & Real-time)
  const handleSendComment = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : commentText).trim();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!currentStory || !textToSend) return;

    // Trigger floating reaction animation if an emoji was sent
    if (QUICK_REACTIONS.includes(textToSend)) {
      setFloatingReaction(textToSend);
      setTimeout(() => setFloatingReaction(null), 1200);
    }

    const optimisticComment: StoryComment = {
      id: `temp_${Date.now()}`,
      storyId: currentStory.id,
      userId: user.id,
      userName: user.name || user.email || (i18n.language === 'ku' ? 'بەکارهێنەر' : 'User'),
      userAvatar: user.avatar,
      text: textToSend,
      createdAt: Date.now()
    };

    // 1. Optimistic instant local state update
    setStories(prevStories => 
      prevStories.map(st => {
        if (st.id === currentStory.id) {
          return {
            ...st,
            comments: [...(st.comments || []), optimisticComment]
          };
        }
        return st;
      })
    );

    setIsSendingComment(true);
    setCommentText('');
    setCommentSentSuccess(true);
    setTimeout(() => setCommentSentSuccess(false), 2500);

    try {
      await db.addStoryComment(currentStory.id, {
        userId: user.id,
        userName: user.name || user.email || (i18n.language === 'ku' ? 'بەکارهێنەر' : 'User'),
        userAvatar: user.avatar,
        text: textToSend
      });
    } catch (err) {
      console.error("Comment submit error:", err);
    } finally {
      setIsSendingComment(false);
    }
  };

  // Open Direct Message Chat with Seller
  const handleOpenDirectChat = () => {
    if (!currentStory) return;
    if (!user) {
      onRequireAuth();
      return;
    }
    closeStoryViewer();
    if (onOpenMessaging) {
      onOpenMessaging(currentStory.sellerId, {
        id: currentStory.product?.id || currentStory.id,
        title: currentStory.product?.title || (currentStory.caption ? currentStory.caption.slice(0, 30) : 'چیرۆکی ۲٤ کاتژمێری'),
        imageUrl: currentStory.mediaUrl || currentStory.product?.imageUrl,
        price: currentStory.product?.price || 0
      });
    }
  };

  // File Upload Handler with compression
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    try {
      if (file.type.startsWith('video/')) {
        if (file.size > 12 * 1024 * 1024) {
          setUploadError(i18n.language === 'ku' 
            ? 'قەبارەی ڤیدیۆ زۆر گەورەیە (زیاترە لە ١٢ مێگابایت). تکایە ڤیدیۆیەکی کورتتر هەڵبژێرە.' 
            : 'Video is too large (over 12MB). Please select a shorter video.');
          return;
        }
        setMediaType('video');
        const reader = new FileReader();
        reader.onload = () => {
          setUploadMediaUrl((reader.result as string) || '');
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('image/')) {
        setMediaType('image');
        const reader = new FileReader();
        reader.onload = async () => {
          const raw = (reader.result as string) || '';
          if (raw) {
            const compressed = await compressBase64Image(raw, 900, 0.75);
            setUploadMediaUrl(compressed || raw);
          }
        };
        reader.readAsDataURL(file);
      } else {
        setUploadError(i18n.language === 'ku' ? 'تکایە تەنها وێنە یان ڤیدیۆ دیاری بکە' : 'Please select an image or video');
      }
    } catch (err) {
      console.error("Story file select error:", err);
    } finally {
      e.target.value = '';
    }
  };

  // Submit Story (Instant local dispatch + firestore async save)
  const handlePublishStory = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    if (!uploadMediaUrl) {
      setUploadError(i18n.language === 'ku' ? 'تکایە وێنە یان ڤیدیۆیەک هەڵبژێرە' : 'Please upload an image or video');
      return;
    }

    setIsSubmitting(true);
    setUploadError('');

    try {
      let linkedProduct = undefined;
      if (selectedProductId) {
        const found = myItems.find(i => i.id === selectedProductId);
        if (found) {
          linkedProduct = {
            id: found.id,
            title: found.title,
            price: found.price,
            imageUrl: found.imageUrls?.[0] || found.imageUrl,
            sourceCode: found.sourceCode,
            sellerPhone: found.sellerPhone || user.phone
          };
        }
      }

      await db.addDailyStory({
        sellerId: user.id,
        sellerName: user.name || user.email || 'فرۆشیاری پەیڤ',
        sellerAvatar: user.avatar,
        sellerPhone: user.phone,
        mediaUrl: uploadMediaUrl,
        mediaType,
        caption: caption.trim(),
        product: linkedProduct
      });

      setIsAddModalOpen(false);
      setUploadMediaUrl('');
      setCaption('');
      setSelectedProductId('');
    } catch (err: any) {
      setUploadError(err?.message || (i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە بڵاوکردنەوەی چیرۆک' : 'Failed to publish story'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* 🌟 Top Stories Bar */}
      <div className={clsx(
        "rounded-3xl p-3 sm:p-4 border shadow-lg backdrop-blur-xl transition-all relative overflow-hidden",
        theme === 'tokyo' || theme === 'midnight' || theme === 'dark'
          ? "bg-slate-900/80 border-white/10"
          : theme === 'sunset'
          ? "bg-orange-950/60 border-orange-500/20"
          : theme === 'wavy'
          ? "bg-white/90 border-teal-200 shadow-teal-500/5"
          : "bg-white/95 border-slate-200"
      )}>
        {/* Title Bar */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className={clsx(
              "text-xs sm:text-sm font-black tracking-wide flex items-center gap-1.5",
              theme === 'dark' ? "text-white" : "text-slate-900"
            )}>
              {i18n.language === 'ku' ? '⚡ چیرۆک و ڤیدیۆی ۲٤ کاتژمێری' : '⚡ 24h Daily Stories'}
            </span>
          </div>
        </div>

        {/* Stories Horizontal Tray */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-1">
          {/* Add Story Button */}
          <button
            type="button"
            onClick={() => {
              if (!user) {
                onRequireAuth(() => setIsAddModalOpen(true));
              } else {
                setIsAddModalOpen(true);
              }
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            title={i18n.language === 'ku' ? 'چیرۆکی نوێ دابنێ' : 'Add New Story'}
          >
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-0.5 border-2 border-dashed border-indigo-400/50 group-hover:border-indigo-400 transition-all flex items-center justify-center bg-slate-950/40">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md group-hover:scale-105 transition-transform">
                {user?.avatar ? (
                  <img src={user.avatar} alt="User" className="w-full h-full object-cover opacity-85 group-hover:opacity-100" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-slate-900 shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
            <span className={clsx(
              "text-[11px] font-bold tracking-tight max-w-[70px] truncate text-center",
              theme === 'dark' ? "text-slate-200" : "text-slate-700"
            )}>
              {i18n.language === 'ku' ? '+ چیرۆک' : '+ Add Story'}
            </span>
          </button>

          {/* Seller Story Avatars */}
          {sellerStoryGroups.map((group, gIdx) => {
            const hasUnviewed = !group.allViewed;
            const firstStory = group.stories[0];

            return (
              <button
                key={group.sellerId}
                type="button"
                onClick={() => openStoryViewer(gIdx)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                {/* Ring & Avatar */}
                <div className={clsx(
                  "relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-105",
                  hasUnviewed
                    ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 shadow-md shadow-rose-500/20 animate-pulse"
                    : "bg-slate-700/60 opacity-80"
                )}>
                  <div className="w-full h-full rounded-full overflow-hidden p-[2px] bg-slate-950">
                    <img
                      src={group.sellerAvatar || firstStory?.mediaUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={group.sellerName}
                      className="w-full h-full object-cover rounded-full group-hover:rotate-2 transition-transform"
                    />
                  </div>

                  {/* Story Count Badge */}
                  {group.stories.length > 1 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow">
                      {group.stories.length}
                    </span>
                  )}

                  {/* Has Linked Product Indicator */}
                  {group.stories.some(s => s.product) && (
                    <div className="absolute -bottom-1 -left-1 bg-emerald-600 text-white rounded-full p-1 border-2 border-slate-900 shadow">
                      <ShoppingBag className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Seller Name */}
                <span className={clsx(
                  "text-[11px] font-bold tracking-tight max-w-[72px] truncate text-center",
                  hasUnviewed 
                    ? (theme === 'dark' ? "text-white font-black" : "text-slate-900 font-black") 
                    : "text-slate-400"
                )}>
                  {group.sellerName.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {sellerStoryGroups.length === 0 && !loading && (
            <div className="text-xs text-slate-500 font-medium py-4 px-2">
              {i18n.language === 'ku' ? 'هیچ چیرۆکێک نییە ئێستا، یەکەم کەس بە چیرۆک دابنێ!' : 'No stories yet, be the first to add one!'}
            </div>
          )}
        </div>
      </div>

      {/* 📱 FULL-SCREEN INSTAGRAM-STYLE STORY VIEWER MODAL */}
      <AnimatePresence>
        {activeGroup && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none"
          >
            {/* Main Phone-Styled Story Container */}
            <div className="relative w-full h-[100dvh] sm:h-[92vh] max-w-md sm:rounded-[2.5rem] overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/10">
              
              {/* Media Background (Image or Video) */}
              <div 
                className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center cursor-pointer"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                onDoubleClick={handleLikeStory}
              >
                {currentStory.mediaType === 'video' ? (
                  <video
                    ref={videoRef}
                    src={currentStory.mediaUrl}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentStory.mediaUrl}
                    alt="Story media"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Subtle top and bottom dark gradient for high readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-transparent to-black/95 pointer-events-none" />
              </div>

              {/* Tap Left / Right Navigation Zones */}
              <div className="absolute inset-0 z-10 flex">
                <div 
                  className="w-1/3 h-full" 
                  onClick={(e) => { e.stopPropagation(); handlePrevStory(); }} 
                />
                <div 
                  className="w-2/3 h-full" 
                  onClick={(e) => { e.stopPropagation(); handleNextStory(); }} 
                />
              </div>

              {/* Floating Heart Animation on Double Tap */}
              <AnimatePresence>
                {showHeartAnim && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.6, opacity: 1 }}
                    exit={{ scale: 2.2, opacity: 0 }}
                    className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                  >
                    <Heart className="w-28 h-28 text-rose-500 fill-rose-500 drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Quick Reaction Animation */}
              <AnimatePresence>
                {floatingReaction && (
                  <motion.div
                    initial={{ scale: 0.5, y: 100, opacity: 0 }}
                    animate={{ scale: 2, y: -80, opacity: 1 }}
                    exit={{ scale: 2.5, y: -160, opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none text-7xl"
                  >
                    {floatingReaction}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 🔝 TOP HEADER: Progress Bars & Seller Details */}
              <div className="relative z-20 p-4 space-y-3 shrink-0">
                {/* Story Segments Progress Bars */}
                <div className="flex gap-1.5 w-full">
                  {activeGroup.stories.map((story, sIdx) => {
                    let fill = 0;
                    if (sIdx < activeStoryItemIndex) fill = 100;
                    else if (sIdx === activeStoryItemIndex) fill = progressPercent;
                    
                    return (
                      <div key={`${story.id || 'story'}-${sIdx}`} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all ease-linear"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Seller Info Bar */}
                <div className="flex items-center justify-between">
                  <div 
                    onClick={() => {
                      if (onOpenSellerProfile && currentStory.sellerId) {
                        closeStoryViewer();
                        onOpenSellerProfile(currentStory.sellerId, {
                          name: currentStory.sellerName,
                          avatar: currentStory.sellerAvatar
                        });
                      }
                    }}
                    className="flex items-center gap-3 cursor-pointer group/author hover:opacity-90 transition-opacity"
                    title={i18n.language === 'ku' ? 'بینینی فرۆشگای ئەم فرۆشیارە' : 'View seller store'}
                  >
                    <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 to-amber-400 group-hover/author:scale-105 transition-transform">
                      <img
                        src={currentStory.sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={currentStory.sellerName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white leading-tight drop-shadow group-hover/author:underline">
                          {currentStory.sellerName}
                        </span>
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                          24h
                        </span>
                      </div>
                      <span className="text-[10px] text-white/70 font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {Math.max(1, Math.round((currentStory.expiresAt - Date.now()) / (1000 * 60 * 60)))} {i18n.language === 'ku' ? 'کاتژمێری ماوە' : 'hours left'}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Sound toggle, Direct chat, Delete, Close) */}
                  <div className="flex items-center gap-2">
                    {currentStory.mediaType === 'video' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                        className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Direct message shortcut */}
                    {onOpenMessaging && user?.id !== currentStory.sellerId && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenDirectChat(); }}
                        className="p-2 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white backdrop-blur-md cursor-pointer transition-all"
                        title={i18n.language === 'ku' ? 'نامەی ڕاستەوخۆ' : 'Direct Message'}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    {(user?.id === currentStory.sellerId || user?.role === 'admin') && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteStory(); }}
                        className="p-2 rounded-full bg-rose-600/80 text-white hover:bg-rose-600 backdrop-blur-md cursor-pointer"
                        title={i18n.language === 'ku' ? 'سڕینەوەی چیرۆک' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); closeStoryViewer(); }}
                      className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md cursor-pointer"
                      title="داخستن"
                    >
                      <X className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 🔻 BOTTOM CONTROLS, PRODUCT CARD & INSTAGRAM-STYLE REPLY BAR */}
              <div className="relative z-20 p-4 space-y-2.5 shrink-0 pb-6">
                {/* Caption (if any) */}
                {currentStory.caption && (
                  <p className="text-xs sm:text-sm font-semibold text-white/95 leading-relaxed bg-black/40 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-white/10 max-h-20 overflow-y-auto">
                    {currentStory.caption}
                  </p>
                )}

                {/* 🛍️ Product Purchase Card Attached to Story */}
                {currentStory.product && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border-2 border-emerald-500/50 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentStory.product.imageUrl || currentStory.mediaUrl}
                        alt="Product"
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">
                            {currentStory.product.title}
                          </span>
                          {currentStory.product.sourceCode && (
                            <span className="text-[9px] bg-slate-800 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                              {currentStory.product.sourceCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm sm:text-base font-black text-emerald-400">
                            ${currentStory.product.price}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-300 font-bold">
                            ({(currentStory.product.price * 1530).toLocaleString()} د.ع)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BIG GREEN "کڕین" (BUY) BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDirectBuyProduct(); }}
                      className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 shrink-0 transform active:scale-95 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 stroke-[3]" />
                      <span>{i18n.language === 'ku' ? 'کڕین' : 'BUY'}</span>
                    </button>
                  </motion.div>
                )}

                {/* 💬 Instagram-Style Quick Reactions Bar */}
                <div 
                  className="flex items-center justify-between gap-1 px-1 py-1 overflow-x-auto no-scrollbar"
                  onClick={(e) => e.stopPropagation()}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendComment(emoji)}
                      className="text-lg sm:text-xl p-1.5 rounded-full hover:bg-white/20 active:scale-125 transition-transform cursor-pointer"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* 💬 Instagram-Style Interactive Comment Input Bar & Story Actions */}
                <div className="space-y-2">
                  {/* Notification Confirmation Badge */}
                  {commentSentSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-xs font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 py-1.5 px-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 backdrop-blur-md"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{i18n.language === 'ku' ? 'وەڵامەکەت نێردرا و فرۆشیار ئاگادارکرایەوە 🔔' : 'Reply sent & seller alerted in inbox! 🔔'}</span>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Comment Input */}
                    <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => !showCommentsList && setIsPaused(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment();
                          }
                        }}
                        placeholder={i18n.language === 'ku' ? `وەڵامێک بنووسە بۆ ${currentStory.sellerName}...` : isRtl ? `رد على ${currentStory.sellerName}...` : `Send reply to ${currentStory.sellerName}...`}
                        className="w-full bg-black/60 backdrop-blur-md border border-white/25 rounded-full py-2.5 px-4 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-inner"
                      />
                      {commentText.trim() && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendComment();
                          }}
                          disabled={isSendingComment}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Comments Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCommentsList(!showCommentsList);
                        setIsPaused(!showCommentsList);
                      }}
                      className={clsx(
                        "p-2.5 rounded-full border backdrop-blur-md transition-all cursor-pointer relative shrink-0",
                        showCommentsList 
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30" 
                          : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                      )}
                      title="کۆمێنتەکان"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {(currentStory.comments?.length || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-black shadow">
                          {currentStory.comments?.length}
                        </span>
                      )}
                    </button>

                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleLikeStory(); }}
                      className={clsx(
                        "flex items-center gap-1.5 p-2.5 px-3.5 rounded-full border backdrop-blur-md transition-all cursor-pointer shrink-0",
                        user && currentStory.likes?.includes(user.id)
                          ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/30"
                          : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                      )}
                      title="دڵخوازی"
                    >
                      <Heart className={clsx("w-5 h-5", user && currentStory.likes?.includes(user.id) && "fill-white text-rose-500")} />
                      <span className="text-xs font-black">
                        {currentStory.likes?.length || 0}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 💬 Slide-up Comments Overlay */}
                <AnimatePresence>
                  {showCommentsList && (
                    <motion.div
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "100%", opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-x-0 bottom-0 max-h-[75vh] h-[65vh] bg-slate-950/95 backdrop-blur-2xl rounded-t-[2rem] border-t border-white/15 p-4 flex flex-col z-30 shadow-2xl pb-6"
                    >
                      {/* Sheet Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-indigo-400" />
                          <h4 className="font-extrabold text-sm text-white">
                            {i18n.language === 'ku' ? 'کۆمێنتەکان' : isRtl ? 'التعليقات' : 'Comments'} ({currentStory.comments?.length || 0})
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCommentsList(false);
                            setIsPaused(false);
                          }}
                          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Comments List */}
                      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                        {(!currentStory.comments || currentStory.comments.length === 0) ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <MessageCircle className="w-10 h-10 text-slate-600 mb-2" />
                            <p className="text-xs text-slate-400 font-medium">
                              {i18n.language === 'ku' 
                                ? 'هیچ کۆمێنتێک نییە. یەکەمین کەس بە کە بۆچوونی خۆت بنووسیت!' 
                                : 'No comments yet. Be the first to comment!'}
                            </p>
                          </div>
                        ) : (
                          currentStory.comments.map((comm, cIdx) => (
                            <div key={`${comm.id || 'comm'}-${cIdx}`} className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex gap-2.5 items-start">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold">
                                {comm.userAvatar ? (
                                  <img src={comm.userAvatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  comm.userName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-xs font-bold text-indigo-300 truncate">
                                    {comm.userName}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed break-words font-medium">
                                  {comm.text}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={commentsEndRef} />
                      </div>

                      {/* In-Sheet Comment Input */}
                      <div className="pt-2 border-t border-white/10 shrink-0 flex items-center gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendComment();
                            }
                          }}
                          placeholder={i18n.language === 'ku' ? 'کۆمێنتێک بنووسە...' : 'Write a comment...'}
                          className="flex-1 bg-black/50 border border-white/20 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendComment()}
                          disabled={!commentText.trim() || isSendingComment}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{i18n.language === 'ku' ? 'ناردن' : 'Send'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ "ADD STORY" MODAL (فۆڕمی دانانی چیرۆک) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={clsx(
                "w-full max-w-lg rounded-3xl p-6 border shadow-2xl overflow-hidden flex flex-col gap-4",
                theme === 'dark' || theme === 'midnight'
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b pb-3 border-slate-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">
                      {i18n.language === 'ku' ? 'دانانی چیرۆکی نوێ (۲٤ کاتژمێر)' : 'Create 24h Daily Story'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {i18n.language === 'ku' ? 'وێنە یان ڤیدیۆی ۲٤ کاتژمێری بڵاوبکەرەوە بۆ کڕیاران' : 'Share photo or video directly with buyers'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Media Zone */}
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {uploadMediaUrl ? (
                  <div className="relative rounded-2xl overflow-hidden h-48 bg-black flex items-center justify-center border border-indigo-500/40">
                    {mediaType === 'video' ? (
                      <video src={uploadMediaUrl} autoPlay loop muted className="w-full h-full object-cover" />
                    ) : (
                      <img src={uploadMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white hover:bg-black/90 backdrop-blur-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{i18n.language === 'ku' ? 'گۆڕین' : 'Change'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-44 rounded-2xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer p-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 text-white flex items-center justify-center shadow-lg">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-black text-indigo-400 block">
                        {i18n.language === 'ku' ? 'کلیک بکە بۆ دیاریکردنی وێنە یان ڤیدیۆ' : 'Tap to select photo or video'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {i18n.language === 'ku' ? 'کامێرا یان گەلەری مۆبایل' : 'Camera or Device gallery'}
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Caption Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {i18n.language === 'ku' ? 'وەسف یان ڕوونکردنەوە (ئارەزوومەندانە):' : 'Caption / Description (Optional):'}
                </label>
                <input
                  type="text"
                  placeholder={i18n.language === 'ku' ? 'وەک: مۆدێلی نوێ، نرخی تایبەت، گەیاندنی خێرا...' : 'e.g., Special discount, new stock...'}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950 text-white text-xs sm:text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Optional: Link to a product */}
              {myItems.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{i18n.language === 'ku' ? 'بەستنەوە بە بەرهەمێک بۆ کڕینی خێرا:' : 'Attach a product for 1-tap purchase:'}</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-950 text-white text-xs sm:text-sm focus:border-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="">{i18n.language === 'ku' ? '-- بەبێ بەرهەم --' : '-- None --'}</option>
                    {myItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title} (${item.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                  {uploadError}
                </div>
              )}

              {/* Publish Action Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePublishStory}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{i18n.language === 'ku' ? 'بڵاوکردنەوەی چیرۆک بۆ ۲٤ کاتژمێر 🚀' : 'Publish Story for 24 Hours 🚀'}</span>
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Story Confirmation Modal */}
      <ConfirmationDialog
        isOpen={showDeleteStoryConfirm}
        title={i18n.language === 'ku' ? 'سڕینەوەی چیرۆک' : 'Delete Story'}
        message={i18n.language === 'ku' ? 'ئایا دڵنیایت لە سڕینەوەی ئەم چیرۆکە؟ ئەم کارە ناگەڕێتەوە.' : 'Are you sure you want to delete this story?'}
        confirmLabel={i18n.language === 'ku' ? 'سڕینەوە' : 'Delete'}
        cancelLabel={i18n.language === 'ku' ? 'پاشگەزبوونەوە' : 'Cancel'}
        onConfirm={confirmDeleteStory}
        onCancel={() => setShowDeleteStoryConfirm(false)}
        type="danger"
      />
    </div>
  );
}
