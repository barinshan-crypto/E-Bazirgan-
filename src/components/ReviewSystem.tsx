import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, ChevronDown, ChevronUp, Image as ImageIcon, X, ZoomIn, Camera, Send, Loader2 } from 'lucide-react';
import { db, User, Review, MarketplaceItem } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ReviewSystemProps {
  itemId: string;
  sellerId: string;
  theme: string;
  currentUser: User | null;
  item?: MarketplaceItem;
  onReviewAdded?: () => void;
}

export default function ReviewSystem({ itemId, sellerId, theme, currentUser, item, onReviewAdded }: ReviewSystemProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Instagram-Style Inline Input State (NO 2nd MODAL/WINDOW!)
  const [commentInput, setCommentInput] = useState('');
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [attachedImage, setAttachedImage] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await db.getReviews(itemId);
      setReviews(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();

    const handleGlobalReviewAdded = (e: any) => {
      const detail = e.detail;
      if (detail && detail.itemId === itemId) {
        if (detail.review) {
          setReviews(prev => [detail.review, ...prev.filter(r => r.id !== detail.review.id)]);
        } else {
          fetchReviews();
        }
      }
    };

    window.addEventListener('payv_review_added', handleGlobalReviewAdded);
    return () => window.removeEventListener('payv_review_added', handleGlobalReviewAdded);
  }, [itemId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage({ text: isKurdish ? 'تەنها وێنە دابنێ' : 'Only image files allowed', isError: true });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsProcessingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          const compressed = await compressBase64Image(rawBase64, 400, 0.7);
          setAttachedImage(compressed);
        } catch {
          setToastMessage({ text: isKurdish ? 'هەڵە لە وێنەدا' : 'Image error', isError: true });
          setTimeout(() => setToastMessage(null), 3000);
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingImage(false);
    }
  };

  const handleSubmitInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setToastMessage({ 
        text: isKurdish ? 'تکایە سەرەتا بچۆ ژوورەوە' : isArabic ? 'يجب تسجيل الدخول أولاً' : 'Sign in required', 
        isError: true 
      });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (!commentInput.trim()) {
      setToastMessage({ 
        text: isKurdish ? 'تکایە کۆمێنتێک بنووسە' : isArabic ? 'اكتب تعليقاً' : 'Please write a comment', 
        isError: true 
      });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const newReview = await db.addReview({
        itemId,
        userId: currentUser.id,
        userName: currentUser.name || (isKurdish ? 'کڕیار' : 'Customer'),
        userAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
        rating: ratingInput,
        comment: commentInput.trim(),
        imageUrl: attachedImage || undefined,
      });

      setReviews(prev => [newReview, ...prev.filter(r => r.id !== newReview.id)]);
      setCommentInput('');
      setAttachedImage('');
      setRatingInput(5);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setToastMessage({ 
        text: isKurdish ? 'کۆمێنت و هەڵسەنگاندنەکەت بڵاوکرایەوە! ⭐' : isArabic ? 'تم نشر تعليقك وتقييمك! ⭐' : 'Review posted! ⭐', 
        isError: false 
      });
      setTimeout(() => setToastMessage(null), 3500);

      if (onReviewAdded) onReviewAdded();
    } catch (err: any) {
      setToastMessage({ 
        text: err.message || (isKurdish ? 'نەتوانرا بنێردرێت' : 'Failed to post'), 
        isError: true 
      });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (r: number) => {
    if (isKurdish) {
      if (r === 5) return '٥★ نایاب';
      if (r === 4) return '٤★ زۆر باش';
      if (r === 3) return '٣★ باش';
      if (r === 2) return '٢★ مامناوەند';
      return '١★ لاواز';
    }
    if (isArabic) {
      if (r === 5) return '٥★ ممتاز';
      if (r === 4) return '٤★ جيد جداً';
      if (r === 3) return '٣★ جيد';
      if (r === 2) return '٢★ مقبول';
      return '١★ ضعيف';
    }
    return `${r}★`;
  };

  const currentTheme = theme || 'dark';

  const textPrimary = {
    dark: 'text-white',
    white: 'text-slate-900',
    emerald: 'text-emerald-50',
    colorful: 'text-slate-900',
    raz: 'text-ef-text',
    sunset: 'text-orange-50',
    midnight: 'text-indigo-50',
    cyberpunk: 'text-[#00ff00]',
    adv: 'text-black font-black uppercase'
  };

  const textSecondary = {
    dark: 'text-slate-400',
    white: 'text-slate-600',
    emerald: 'text-emerald-200/60',
    colorful: 'text-slate-700',
    raz: 'text-ef-text/60',
    sunset: 'text-orange-200/60',
    midnight: 'text-indigo-300/60',
    cyberpunk: 'text-[#00ff00]/60',
    adv: 'text-black/80'
  };

  const borderSecondary = {
    dark: 'border-white/5',
    white: 'border-slate-100',
    emerald: 'border-emerald-500/10',
    colorful: 'border-white/50',
    raz: 'border-ef-pink/20',
    sunset: 'border-orange-500/10',
    midnight: 'border-indigo-500/10',
    cyberpunk: 'border-[#00ff00]/10',
    adv: 'border-black'
  };

  const roundedBackground = {
    dark: 'bg-white/5',
    white: 'bg-slate-50',
    emerald: 'bg-emerald-500/10',
    colorful: 'bg-white/40',
    raz: 'bg-ef-shimmer/10',
    sunset: 'bg-orange-500/10',
    midnight: 'bg-indigo-500/10',
    cyberpunk: 'bg-[#00ff00]/5',
    adv: 'bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
  };

  // Aggregates safely (no NaN)
  const validReviews = reviews.filter(r => r && typeof r.rating === 'number' && !isNaN(r.rating));
  const totalStars = validReviews.reduce((sum, r) => sum + Math.max(1, Math.min(5, Number(r.rating) || 5)), 0);
  const averageRating = validReviews.length > 0 ? (totalStars / validReviews.length) : 5.0;

  const distribution = [0, 0, 0, 0, 0]; // 5 to 1
  validReviews.forEach(r => {
    const starIdx = 5 - Math.round(Number(r.rating) || 5);
    if (starIdx >= 0 && starIdx < 5) {
      distribution[starIdx]++;
    }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className={clsx("text-xs font-black uppercase tracking-widest", textSecondary[currentTheme as keyof typeof textSecondary])}>
            {isKurdish 
              ? `کۆمێنت و هەڵسەنگاندن (${reviews.length})` 
              : isArabic 
              ? `التقييمات والتعليقات (${reviews.length})` 
              : `Product Reviews (${reviews.length})`}
          </h3>
        </div>

        <span className="text-amber-500 font-mono font-black text-xs flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
          {averageRating.toFixed(1)} / 5
        </span>
      </div>

      {/* Instagram-Style Slim Inline Rating & Comment Bar (NO 2ND MODAL!) */}
      <div className={clsx(
        "p-3 rounded-2xl border transition-all",
        roundedBackground[currentTheme as keyof typeof roundedBackground],
        borderSecondary[currentTheme as keyof typeof borderSecondary]
      )}>
        {toastMessage && (
          <div className={clsx(
            "mb-2 text-xs font-bold px-3 py-1.5 rounded-xl text-center animate-fade-in",
            toastMessage.isError ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          )}>
            {toastMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmitInline} className="space-y-2">
          {/* Star selector row */}
          <div className="flex items-center justify-between px-1">
            <span className={clsx("text-xs font-bold flex items-center gap-1", textSecondary[currentTheme as keyof typeof textSecondary])}>
              <span>{isKurdish ? 'ئەستێرە هەڵبژێرە:' : 'Select Rating:'}</span>
              <span className="text-amber-500 font-mono font-black text-xs">
                {getRatingLabel(hoverRating !== null ? hoverRating : ratingInput)}
              </span>
            </span>

            {/* 5 Clickable Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isActive = hoverRating !== null ? starVal <= hoverRating : starVal <= ratingInput;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRatingInput(starVal)}
                    className="p-0.5 hover:scale-120 active:scale-95 transition-transform cursor-pointer"
                    title={`${starVal} stars`}
                  >
                    <Star
                      className={clsx(
                        "w-4.5 h-4.5 transition-colors",
                        isActive ? "text-amber-400 fill-amber-400 drop-shadow-xs" : "text-slate-400/40"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slim input row */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {attachedImage ? (
              <div className="relative shrink-0">
                <img
                  src={attachedImage}
                  alt="Attachment"
                  className="w-9 h-9 rounded-xl object-cover border border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAttachedImage('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessingImage}
                onClick={() => fileInputRef.current?.click()}
                title={isKurdish ? 'وێنەی کاڵا هاوپێچ بکە' : 'Attach photo'}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 hover:border-amber-400/50 bg-white/5 hover:bg-amber-400/10 text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
              >
                {isProcessingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Sleek Instagram text input */}
            <input
              type="text"
              value={commentInput}
              maxLength={300}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={
                isKurdish 
                  ? 'کۆمێنتێک بنووسە (بە ١ کلیک دەگات)...' 
                  : isArabic 
                  ? 'اكتب تعليقاً وتقييماً...' 
                  : 'Write a review comment...'
              }
              className="flex-1 h-9 px-3 text-xs rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all"
            />

            {/* 1-Click Send Button */}
            <button
              type="submit"
              disabled={isSubmitting || !commentInput.trim()}
              className="h-9 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className={clsx("w-3.5 h-3.5", isKurdish || isArabic ? "rotate-180" : "")} />
                  <span>{isKurdish ? 'ناردن' : isArabic ? 'إرسال' : 'Send'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="h-20 flex items-center justify-center">
          <span className="text-[10px] text-slate-500 animate-pulse font-bold tracking-widest uppercase">
            {isKurdish ? 'باردەکرێت...' : isArabic ? 'جاري التحميل...' : 'Loading Reviews...'}
          </span>
        </div>
      ) : reviews.length === 0 ? (
        <div className={clsx("p-5 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2", borderSecondary[currentTheme as keyof typeof borderSecondary])}>
          <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400">
            <Star className="w-5 h-5" />
          </div>
          <p className={clsx("text-xs font-medium", textSecondary[currentTheme as keyof typeof textSecondary])}>
            {isKurdish 
              ? 'هێشتا هیچ هەڵسەنگاندنێک بۆ ئەم کاڵایە نییە. لە سەرەوە ئەستێرە و کۆمێنت بنووسە!' 
              : isArabic 
              ? 'لا توجد تقييمات لهذا المنتج بعد. اكتب أول تقييم بالأعلى!' 
              : 'No ratings yet for this item. Be the first to share your experience above!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Average & Star Bars block */}
          <div className={clsx("p-4 rounded-3xl grid grid-cols-3 gap-4 items-center", roundedBackground[currentTheme as keyof typeof roundedBackground])}>
            <div className="text-center col-span-1 border-r border-white/5 pr-2">
              <span className={clsx("text-3xl font-black block tracking-tighter leading-none mb-1", textPrimary[currentTheme as keyof typeof textPrimary])}>
                {averageRating.toFixed(1)}
              </span>
              <div className="flex justify-center mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={`avg-star-${i}`} 
                    className={clsx(
                      "w-3 h-3", 
                      i < Math.round(averageRating) ? "text-yellow-400 fill-yellow-400" : "text-slate-600"
                    )} 
                  />
                ))}
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-500">
                {reviews.length} {isKurdish ? 'هەڵسەنگاندن' : isArabic ? 'تقييم' : 'ratings'}
              </span>
            </div>

            <div className="col-span-2 space-y-1">
              {distribution.map((count, i) => {
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={`dist-row-${i}`} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-bold min-w-[8px]">{5 - i}</span>
                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />
                    <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold min-w-[12px] text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive reviews list with Expand/Collapse */}
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {(isExpanded ? reviews : reviews.slice(0, 3)).map((review, rIdx) => (
                <motion.div
                  key={`${review.id || 'review'}-${rIdx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={clsx(
                    "p-3.5 rounded-2xl flex items-start gap-3 border",
                    borderSecondary[currentTheme as keyof typeof borderSecondary]
                  )}
                >
                  <img 
                    src={review.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userId}`} 
                    className="w-9 h-9 rounded-full bg-white/10 shrink-0 border border-white/10" 
                    alt="" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={clsx("text-xs font-bold truncate", textPrimary[currentTheme as keyof typeof textPrimary])}>
                        {review.userName}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                        {new Date(review.createdAt).toLocaleDateString()} {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={`star-${review.id || rIdx}-${i}`} 
                            className={clsx(
                              "w-3 h-3", 
                              i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-600"
                            )} 
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-amber-400">
                        {review.rating}/5
                      </span>
                    </div>

                    <p className={clsx("text-xs leading-relaxed break-words font-medium", textSecondary[currentTheme as keyof typeof textSecondary])}>
                      {review.comment}
                    </p>

                    {/* Small Attached Image Preview */}
                    {review.imageUrl && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(review.imageUrl || null)}
                          className="group relative inline-block rounded-xl overflow-hidden border border-white/15 hover:border-amber-400/60 transition-all cursor-zoom-in shadow-sm"
                        >
                          <img 
                            src={review.imageUrl} 
                            alt="Review attachment" 
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] text-white px-1 rounded-xs font-mono">
                            {isKurdish ? 'وێنە' : 'Photo'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {reviews.length > 3 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2.5 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors border border-dashed border-white/10 rounded-xl cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>{isKurdish ? 'کەمکردنەوەی پێداچوونەوەکان' : isArabic ? 'عرض أقل' : 'Show Less Reviews'}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>{isKurdish ? `بینینی هەموو (${reviews.length}) پێداچوونەوەکە` : isArabic ? `عرض جميع التقييمات (${reviews.length})` : `See All ${reviews.length} Reviews`}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lightbox / Zoom modal for review images */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-lg max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={previewImage} 
                alt="Enlarged review photo" 
                className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-white/20 shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <span className="text-white/70 text-xs mt-3 font-medium">
                {isKurdish ? 'وێنەی کاڵا لە لایەن کڕیارەوە' : isArabic ? 'صورة المنتج المرفقة من المشتري' : 'Customer attached review photo'}
              </span>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
