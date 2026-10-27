import React, { useState, useEffect, useRef } from 'react';
import { Star, Send, Camera, X, MessageSquare, Loader2, Image as ImageIcon } from 'lucide-react';
import { db, Review, User } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface ItemReviewsPreviewProps {
  itemId: string;
  itemTitle?: string;
  currentUser: User | null;
  theme: string;
  onOpenReviews: () => void;
  onReviewAdded?: (newReview: Review) => void;
}

export default function ItemReviewsPreview({
  itemId,
  itemTitle,
  currentUser,
  theme,
  onOpenReviews,
  onReviewAdded
}: ItemReviewsPreviewProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  // Slim Instagram inline input state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentTheme = theme || 'dark';
  const isLight = currentTheme === 'white' || currentTheme === 'light' || currentTheme === 'bubbles' || currentTheme === 'wavy' || currentTheme === 'rainbow' || currentTheme === 'monochrome';

  // Load reviews on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRevs = () => {
      setLoading(true);
      db.getReviews(itemId).then((list) => {
        if (isMounted) {
          setReviews(list || []);
          setLoading(false);
        }
      }).catch(() => {
        if (isMounted) setLoading(false);
      });
    };

    fetchRevs();

    const handleGlobalReviewAdded = (e: any) => {
      const detail = e.detail;
      if (detail && detail.itemId === itemId) {
        if (detail.review) {
          setReviews(prev => [detail.review, ...prev.filter(r => r.id !== detail.review.id)]);
        } else {
          fetchRevs();
        }
      }
    };

    window.addEventListener('payv_review_added', handleGlobalReviewAdded);
    return () => {
      isMounted = false;
      window.removeEventListener('payv_review_added', handleGlobalReviewAdded);
    };
  }, [itemId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ text: isKurdish ? 'تەنها وێنە دابنێ' : 'Only image files allowed', isError: true });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setIsProcessingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          const compressed = await compressBase64Image(rawBase64, 400, 0.7);
          setImageUrl(compressed);
        } catch {
          setStatusMessage({ text: isKurdish ? 'هەڵە لە وێنەدا' : 'Image error', isError: true });
          setTimeout(() => setStatusMessage(null), 3000);
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
    e.stopPropagation();

    if (!currentUser) {
      setStatusMessage({ 
        text: isKurdish ? 'تکایە سەرەتا بچۆ ژوورەوە' : isArabic ? 'يجب تسجيل الدخول أولاً' : 'Sign in required', 
        isError: true 
      });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (!commentText.trim()) {
      setStatusMessage({ 
        text: isKurdish ? 'تکایە کۆمێنتێک بنووسە' : isArabic ? 'اكتب تعليقاً' : 'Please write a comment', 
        isError: true 
      });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const newReview = await db.addReview({
        itemId,
        userId: currentUser.id,
        userName: currentUser.name || (isKurdish ? 'کڕیار' : 'Customer'),
        userAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
        rating,
        comment: commentText.trim(),
        imageUrl: imageUrl || undefined,
      });

      // Optimistic update
      setReviews(prev => [newReview, ...prev.filter(r => r.id !== newReview.id)]);
      setCommentText('');
      setImageUrl('');
      setRating(5);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setStatusMessage({
        text: isKurdish ? 'کۆمێنت و هەڵسەنگاندنەکەت بڵاوکرایەوە! ⭐' : isArabic ? 'تم نشر تعليقك وتقييمك! ⭐' : 'Review posted! ⭐',
        isError: false
      });
      setTimeout(() => setStatusMessage(null), 3500);

      if (onReviewAdded) onReviewAdded(newReview);
    } catch (err: any) {
      setStatusMessage({
        text: err.message || (isKurdish ? 'نەتوانرا بنێردرێت' : 'Failed to post'),
        isError: true
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSubmitting(false);
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

  const latest = reviews.length > 0 ? reviews[0] : null;

  return (
    <div 
      className={clsx(
        "my-2.5 rounded-2xl border transition-all overflow-hidden",
        isLight
          ? "bg-slate-50/90 border-slate-200/90 shadow-2xs"
          : "bg-white/[0.04] border-white/10 shadow-2xs"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header showing Comments Count & Stars */}
      <div className={clsx(
        "px-3 py-2 flex items-center justify-between border-b text-[11px] font-bold",
        isLight ? "border-slate-200/80 bg-slate-100/70" : "border-white/5 bg-white/[0.02]"
      )}>
        <button
          type="button"
          onClick={onOpenReviews}
          className="flex items-center gap-1.5 hover:underline cursor-pointer group/hdr"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className={clsx("font-black", isLight ? "text-slate-800" : "text-slate-200")}>
            {isKurdish 
              ? `کۆمێنت و هەڵسەنگاندن (${reviews.length})` 
              : isArabic 
              ? `التعليقات والتقييمات (${reviews.length})` 
              : `Comments & Reviews (${reviews.length})`}
          </span>
        </button>

        {reviews.length > 0 && (
          <button
            type="button"
            onClick={onOpenReviews}
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 hover:underline cursor-pointer"
          >
            {isKurdish 
              ? `بینینی هەموو (${reviews.length})` 
              : isArabic 
              ? `عرض الكل (${reviews.length})` 
              : `View all (${reviews.length})`}
          </button>
        )}
      </div>

      {/* 2. Comments Display Area */}
      <div className="p-3 space-y-2">
        {loading && reviews.length === 0 ? (
          <div className="py-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>{isKurdish ? 'باردەکرێت...' : 'Loading...'}</span>
          </div>
        ) : latest ? (
          <div className="space-y-1.5">
            {/* Top comment card */}
            <div className="flex items-start gap-2.5">
              <img
                src={latest.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${latest.userId}`}
                alt=""
                className="w-7 h-7 rounded-full border border-amber-400/50 object-cover shrink-0 mt-0.5 bg-slate-800"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className={clsx("text-xs font-black truncate", isLight ? "text-slate-900" : "text-white")}>
                    {latest.userName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={clsx(
                            "w-2.5 h-2.5",
                            s <= (Number(latest.rating) || 5)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300 dark:text-slate-600"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-black text-amber-500">
                      {latest.rating}/5
                    </span>
                  </div>
                </div>

                {/* Comment Text - Clearly formatted and highly readable */}
                <p className={clsx(
                  "text-xs leading-relaxed font-medium break-words",
                  isLight ? "text-slate-800" : "text-slate-100"
                )}>
                  {latest.comment}
                </p>

                {/* Attached image if present */}
                {latest.imageUrl && (
                  <div className="mt-1.5">
                    <img
                      src={latest.imageUrl}
                      alt="Attachment"
                      onClick={onOpenReviews}
                      className="w-14 h-14 rounded-lg object-cover border border-amber-400/40 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </div>

            {reviews.length > 1 && (
              <button
                type="button"
                onClick={onOpenReviews}
                className={clsx(
                  "pt-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                )}
              >
                <span>
                  {isKurdish 
                    ? `💬 بینینی ${reviews.length - 1} کۆمێنتی تر...` 
                    : isArabic 
                    ? `💬 عرض ${reviews.length - 1} تعليقات أخرى...` 
                    : `💬 View ${reviews.length - 1} more comments...`}
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="py-2 text-center text-xs font-medium text-slate-400">
            <span>
              {isKurdish 
                ? '💬 هێشتا کۆمێنت نییە • یەکەم کەس بە ئەستێرە و کۆمێنت دابنێ!' 
                : isArabic 
                ? '💬 لا توجد تعليقات بعد • كن أول من يقيّم ويعلّق!' 
                : '💬 No comments yet • Be the first to rate & comment!'}
            </span>
          </div>
        )}

        {/* Status tooltip/toast */}
        {statusMessage && (
          <div className={clsx(
            "text-[11px] font-bold px-2.5 py-1 rounded-xl text-center transition-all animate-fade-in",
            statusMessage.isError 
              ? "bg-red-500/15 border border-red-500/30 text-red-400" 
              : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
          )}>
            {statusMessage.text}
          </div>
        )}

        {/* 3. Instagram-Style Slim Inline Rating & Comment Bar (ONE-CLICK SEND!) */}
        <form onSubmit={handleSubmitInline} className="pt-2 border-t border-white/5 space-y-1.5">
          {/* Star selector row */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <span>{isKurdish ? 'هەڵسەنگاندن:' : 'Rating:'}</span>
              <span className="text-amber-500 font-mono font-black text-xs">
                {getRatingLabel(hoverRating !== null ? hoverRating : rating)}
              </span>
            </div>

            {/* 5 Clickable Stars */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isActive = hoverRating !== null ? starVal <= hoverRating : starVal <= rating;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(starVal)}
                    className="p-0.5 hover:scale-120 active:scale-95 transition-transform cursor-pointer"
                    title={`${starVal} stars`}
                  >
                    <Star
                      className={clsx(
                        "w-4 h-4 transition-colors",
                        isActive ? "text-amber-400 fill-amber-400 drop-shadow-xs" : "text-slate-400/40"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slim input row */}
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo attach button / mini preview */}
            {imageUrl ? (
              <div className="relative shrink-0">
                <img
                  src={imageUrl}
                  alt="Attach"
                  className="w-8 h-8 rounded-lg object-cover border border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] cursor-pointer shadow"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessingImage}
                onClick={() => fileInputRef.current?.click()}
                title={isKurdish ? 'هاوپێچکردنی وێنە' : 'Attach photo'}
                className={clsx(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer",
                  isLight 
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500" 
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white"
                )}
              >
                {isProcessingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>
            )}

            {/* Instagram Single-Line Input */}
            <input
              type="text"
              value={commentText}
              maxLength={300}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                isKurdish
                  ? 'کۆمێنتێک بنووسە...'
                  : isArabic
                  ? 'اكتب تعليقاً...'
                  : 'Write a comment...'
              }
              className={clsx(
                "flex-1 h-8 px-3 text-xs rounded-xl border focus:outline-none transition-all",
                isLight 
                  ? "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400" 
                  : "bg-black/20 border-white/10 text-white placeholder-slate-400 focus:border-amber-400"
              )}
            />

            {/* 1-Click Send Button */}
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className={clsx(
                "h-8 px-3 rounded-xl font-black text-xs flex items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold"
              )}
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Send className={clsx("w-3 h-3", isKurdish || isArabic ? "rotate-180" : "")} />
                  <span>{isKurdish ? 'ناردن' : isArabic ? 'إرسال' : 'Send'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
