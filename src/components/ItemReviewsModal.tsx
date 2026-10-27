import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Send, Camera, Trash2, ZoomIn, MessageSquare, Check, Loader2 } from 'lucide-react';
import { db, User, Review, MarketplaceItem } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface ItemReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
  currentUser: User | null;
  theme: string;
  onReviewAdded?: () => void;
}

export default function ItemReviewsModal({
  isOpen,
  onClose,
  item,
  currentUser,
  theme,
  onReviewAdded
}: ItemReviewsModalProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Instagram-style inline input state
  const [commentInput, setCommentInput] = useState('');
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [attachedImage, setAttachedImage] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Lightbox preview for photos
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const fetchReviews = async () => {
    if (!item) return;
    try {
      setLoading(true);
      const data = await db.getReviews(item.id);
      setReviews(data);
    } catch (e) {
      console.error("Failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      fetchReviews();
      setCommentInput('');
      setAttachedImage('');
      setRatingInput(5);
      setErrorMsg(null);
    }
  }, [isOpen, item?.id]);

  // Real-time listener
  useEffect(() => {
    if (!item) return;
    const handleReviewAdded = (e: any) => {
      const detail = e.detail;
      if (detail && detail.itemId === item.id) {
        if (detail.review) {
          setReviews(prev => [detail.review, ...prev.filter(r => r.id !== detail.review.id)]);
        } else {
          fetchReviews();
        }
      }
    };
    window.addEventListener('payv_review_added', handleReviewAdded);
    return () => window.removeEventListener('payv_review_added', handleReviewAdded);
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const currentTheme = theme || 'dark';
  const isLight = currentTheme === 'white' || currentTheme === 'bubbles' || currentTheme === 'wavy' || currentTheme === 'rainbow';

  // Safe average calculation (prevents NaN)
  const validReviews = reviews.filter(r => r && typeof r.rating === 'number' && !isNaN(r.rating));
  const totalStars = validReviews.reduce((sum, r) => sum + Math.max(1, Math.min(5, Number(r.rating) || 5)), 0);
  const avgRating = validReviews.length > 0 ? (totalStars / validReviews.length) : 5.0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(isKurdish ? 'تەنها وێنە دابنێ' : 'Only image files allowed');
      setTimeout(() => setErrorMsg(null), 3000);
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
          setErrorMsg(isKurdish ? 'هەڵە لە وێنەدا' : 'Image error');
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg(isKurdish ? 'تکایە سەرەتا بچۆ ژوورەوە' : isArabic ? 'يجب تسجيل الدخول' : 'Sign in required');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (!commentInput.trim()) {
      setErrorMsg(isKurdish ? 'تکایە کۆمێنتێک بنووسە' : isArabic ? 'اكتب تعليقاً' : 'Write a comment');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newReview = await db.addReview({
        itemId: item.id,
        userId: currentUser.id,
        userName: currentUser.name || (isKurdish ? 'کڕیار' : 'Customer'),
        userAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
        rating: ratingInput,
        comment: commentInput.trim(),
        imageUrl: attachedImage || undefined,
      });

      // Optimistically prepend
      setReviews(prev => [newReview, ...prev.filter(r => r.id !== newReview.id)]);
      setCommentInput('');
      setAttachedImage('');
      setRatingInput(5);

      setSuccessToast(isKurdish ? 'کۆمێنتەکەت بڵاوکرایەوە! ✨' : isArabic ? 'تم نشر تعليقك! ✨' : 'Review posted! ✨');
      setTimeout(() => setSuccessToast(null), 3000);

      if (onReviewAdded) onReviewAdded();

      // Scroll comments to top
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(err.message || (isKurdish ? 'نەتوانرا بنێردرێت' : 'Failed to post'));
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (r: number) => {
    if (isKurdish) {
      if (r === 5) return 'نایاب (٥★)';
      if (r === 4) return 'زۆر باش (٤★)';
      if (r === 3) return 'باش (٣★)';
      if (r === 2) return 'مامناوەند (٢★)';
      return 'لاواز (١★)';
    }
    if (isArabic) {
      if (r === 5) return 'ممتاز (٥★)';
      if (r === 4) return 'جيد جداً (٤★)';
      if (r === 3) return 'جيد (٣★)';
      if (r === 2) return 'مقبول (٢★)';
      return 'ضعيف (١★)';
    }
    return `${r} Stars`;
  };

  const modalContent = (
    <div key="instagram-reviews-sheet-wrapper" className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99998]"
      />

      {/* Instagram-style Sheet Container */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        dir={isKurdish || isArabic ? 'rtl' : 'ltr'}
        className={clsx(
          "relative w-full sm:max-w-lg h-[86vh] sm:h-[80vh] flex flex-col z-[99999] overflow-hidden",
          "rounded-t-3xl sm:rounded-3xl border shadow-2xl",
          isLight 
            ? "bg-white border-slate-200 text-slate-900" 
            : "bg-slate-950/95 border-white/10 text-white shadow-black/80"
        )}
      >
        {/* Top Drag Handle Bar (Mobile) */}
        <div className="w-12 h-1.5 rounded-full bg-slate-400/40 mx-auto mt-2.5 mb-1 sm:hidden shrink-0 cursor-pointer" onClick={onClose} />

        {/* Clean Instagram-style Header */}
        <div className={clsx(
          "flex items-center justify-between px-4 py-3 border-b shrink-0",
          isLight ? "border-slate-100 bg-slate-50/70" : "border-white/10 bg-white/5"
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-10 h-10 rounded-xl object-cover border border-amber-400/30 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h3 className={clsx("font-black text-sm truncate", isLight ? "text-slate-900" : "text-white")}>
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-500 font-black flex items-center gap-1 font-mono">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-slate-400">•</span>
                <span className={clsx("font-bold", isLight ? "text-slate-600" : "text-slate-300")}>
                  {reviews.length} {isKurdish ? 'کۆمێنت و هەڵسەنگاندن' : isArabic ? 'تعليق وتقييم' : 'reviews'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0",
              isLight ? "hover:bg-slate-200 text-slate-500 hover:text-slate-800" : "hover:bg-white/10 text-slate-400 hover:text-white"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Toast Alerts */}
        {errorMsg && (
          <div className="px-4 py-2 bg-red-500/15 border-b border-red-500/20 text-red-500 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}
        {successToast && (
          <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/20 text-emerald-400 text-xs font-bold text-center animate-fade-in">
            {successToast}
          </div>
        )}

        {/* Scrollable Comments List (Instagram Style) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div ref={commentsEndRef} />

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              <span className="text-xs text-slate-400 font-bold">
                {isKurdish ? 'کۆمێنتەکان باردەکرێن...' : 'Loading comments...'}
              </span>
            </div>
          ) : reviews.length === 0 ? (
            <div className={clsx(
              "py-16 px-4 text-center rounded-2xl flex flex-col items-center justify-center gap-2.5",
              isLight ? "bg-slate-50 text-slate-500" : "bg-white/5 text-slate-400"
            )}>
              <div className="w-12 h-12 rounded-full bg-amber-400/15 flex items-center justify-center text-amber-400 mb-1">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold">
                {isKurdish ? 'هێشتا هیچ کۆمێنتێک نییە' : isArabic ? 'لا توجد تعليقات بعد' : 'No comments yet'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {isKurdish 
                  ? 'یەکەم کەس بە کە لە خوارەوە ئەستێرە و کۆمێنت دەنوسێت بەبێ هیچ هەنگاوێکی زیادە!' 
                  : isArabic 
                  ? 'كن أول من يكتب تعليقاً وتقييماً بالأسفل!' 
                  : 'Be the first to share your thoughts and star rating below!'}
              </p>
            </div>
          ) : (
            reviews.map((rev, idx) => (
              <div
                key={rev.id || `rev-${idx}`}
                className={clsx(
                  "p-3 rounded-2xl border transition-all flex items-start gap-3",
                  isLight 
                    ? "bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/60" 
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
              >
                <img
                  src={rev.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rev.userId}`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-amber-400/40 shrink-0 mt-0.5 bg-slate-800"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  {/* User name + Stars + Date */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={clsx("text-xs font-black truncate", isLight ? "text-slate-900" : "text-white")}>
                      {rev.userName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={clsx(
                            "w-3 h-3",
                            s <= (Number(rev.rating) || 5)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300 dark:text-slate-700"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-amber-500 font-mono">
                      {rev.rating}/5
                    </span>
                  </div>

                  {/* Comment text (High Contrast & Clear) */}
                  <p className={clsx(
                    "text-xs leading-relaxed break-words font-medium",
                    isLight ? "text-slate-900" : "text-slate-100"
                  )}>
                    {rev.comment}
                  </p>

                  {/* Attached photo thumbnail */}
                  {rev.imageUrl && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(rev.imageUrl || null)}
                        className="relative group rounded-xl overflow-hidden border border-amber-400/40 inline-block shadow-xs cursor-zoom-in"
                      >
                        <img
                          src={rev.imageUrl}
                          alt="Review attachment"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Fixed Instagram-Style Bottom Input Form (ONE-CLICK SEND!) */}
        <div className={clsx(
          "border-t p-3 shrink-0 backdrop-blur-md",
          isLight ? "border-slate-200 bg-white" : "border-white/10 bg-slate-950"
        )}>
          {/* Star selector bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 px-1">
            <span className={clsx("text-xs font-bold flex items-center gap-1", isLight ? "text-slate-700" : "text-slate-300")}>
              <span>{isKurdish ? 'ئەستێرە بدە:' : 'Your Rating:'}</span>
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
                    className="p-1 hover:scale-120 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Star
                      className={clsx(
                        "w-5 h-5 transition-colors",
                        isActive ? "text-amber-400 fill-amber-400 filter drop-shadow-xs" : "text-slate-400/40"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Row: Avatar + Text Input + Photo + One-Click Send */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Thumbnail preview if user selected an image */}
            {attachedImage ? (
              <div className="relative shrink-0">
                <img
                  src={attachedImage}
                  alt="Mini attach"
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
                className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all cursor-pointer",
                  isLight 
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900" 
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                )}
              >
                {isProcessingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Camera className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            {/* Single-line sleek Instagram input */}
            <div className="flex-1 min-w-0 relative">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                maxLength={300}
                placeholder={
                  isKurdish
                    ? 'کۆمێنتێک بنووسە...'
                    : isArabic
                    ? 'اكتب تعليقاً...'
                    : 'Write a review comment...'
                }
                className={clsx(
                  "w-full h-10 px-3.5 text-xs rounded-2xl border focus:outline-none transition-all",
                  isLight 
                    ? "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500" 
                    : "bg-white/10 border-white/10 text-white placeholder-slate-400 focus:border-amber-400"
                )}
              />
            </div>

            {/* ONE-CLICK SEND BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting || !commentInput.trim()}
              className={clsx(
                "h-10 px-4 rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className={clsx("w-3.5 h-3.5", isKurdish || isArabic ? "rotate-180" : "")} />
                  <span>{isKurdish ? 'ناردن' : isArabic ? 'إرسال' : 'Send'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>

      {/* Lightbox / Zoom modal */}
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
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Enlarged review"
                className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-white/20 shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
