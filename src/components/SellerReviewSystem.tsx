import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  CheckCircle2,
  Trash2,
  Sparkles,
  Plus,
  Filter,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { db, User, SellerReview, SellerProfile } from '../lib/db';

interface SellerReviewSystemProps {
  sellerId: string;
  sellerName?: string;
  sellerProfile?: SellerProfile | null;
  currentUser: User | null;
  isAdmin?: boolean;
  theme?: string;
  onRequireAuth?: (action?: () => void) => void;
  onRatingUpdated?: (newRating: number, totalCount: number) => void;
}

const REVIEW_TAGS = [
  { id: 'fast_delivery', ku: 'گەیاندنی خێرا', ar: 'توصيل سريع', en: 'Fast Delivery' },
  { id: 'high_quality', ku: 'کوالێتی نایاب', ar: 'جودة ممتازة', en: 'Top Quality' },
  { id: 'good_communication', ku: 'وەڵامدانەوەی خێرا', ar: 'استجابة سريعة', en: 'Quick Support' },
  { id: 'safe_packaging', ku: 'پێچانەوەی پارێزراو', ar: 'تغليف آمن', en: 'Safe Packaging' },
  { id: 'fair_price', ku: 'نرخی گونجاو', ar: 'سعر مناسب', en: 'Fair Price' },
  { id: 'as_described', ku: 'وەک وەسفەکەی', ar: 'مطابق للوصف', en: 'As Described' }
];

export const SellerReviewSystem: React.FC<SellerReviewSystemProps> = ({
  sellerId,
  sellerName = 'Seller',
  sellerProfile,
  currentUser,
  isAdmin = false,
  theme = 'dark',
  onRequireAuth,
  onRatingUpdated
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';
  const isDarkTheme = theme !== 'rainbow';

  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<number | 'all'>('all');
  
  // Review submission state
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSelfStore = currentUser?.id === sellerId;

  // Load reviews on mount or when seller changes
  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await db.getSellerReviews(sellerId);
      setReviews(data);
      if (data.length > 0 && onRatingUpdated) {
        const total = data.reduce((acc, r) => acc + r.rating, 0);
        onRatingUpdated(Number((total / data.length).toFixed(1)), data.length);
      }
    } catch (e) {
      console.error("Error loading seller reviews:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    const handleGlobalSellerReviewAdded = (e: any) => {
      const detail = e.detail;
      if (detail && detail.sellerId === sellerId) {
        if (detail.review) {
          setReviews(prev => [detail.review, ...prev.filter(r => r.id !== detail.review.id)]);
        } else {
          loadReviews();
        }
      }
    };

    window.addEventListener('payv_seller_review_added', handleGlobalSellerReviewAdded);
    return () => window.removeEventListener('payv_seller_review_added', handleGlobalSellerReviewAdded);
  }, [sellerId]);

  // Check if current user already submitted a review
  const myExistingReview = useMemo(() => {
    if (!currentUser) return null;
    return reviews.find(r => r.userId === currentUser.id) || null;
  }, [reviews, currentUser?.id]);

  // Aggregate calculations
  const metrics = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avgRating: 5.0,
        totalReviews: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recommendationRate: 100
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / total).toFixed(1));

    const breakdown = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    const percentages = {
      5: Math.round((breakdown[5] / total) * 100),
      4: Math.round((breakdown[4] / total) * 100),
      3: Math.round((breakdown[3] / total) * 100),
      2: Math.round((breakdown[2] / total) * 100),
      1: Math.round((breakdown[1] / total) * 100),
    };

    const positiveCount = breakdown[5] + breakdown[4];
    const recommendationRate = Math.round((positiveCount / total) * 100);

    return {
      avgRating: avg,
      totalReviews: total,
      breakdown,
      percentages,
      recommendationRate
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedFilter === 'all') return reviews;
    return reviews.filter(r => r.rating === selectedFilter);
  }, [reviews, selectedFilter]);

  const handleOpenWrite = () => {
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth(() => setIsWritingReview(true));
      }
      return;
    }
    if (isSelfStore) return;

    if (myExistingReview) {
      setRatingInput(myExistingReview.rating);
      setCommentInput(myExistingReview.comment);
      setSelectedTags(myExistingReview.tags || []);
    } else {
      setRatingInput(5);
      setCommentInput('');
      setSelectedTags([]);
    }
    setIsWritingReview(true);
  };

  const handleToggleTag = (tagLabel: string) => {
    setSelectedTags(prev =>
      prev.includes(tagLabel)
        ? prev.filter(t => t !== tagLabel)
        : [...prev, tagLabel]
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!commentInput.trim()) return;

    try {
      setIsSubmitting(true);
      await db.addSellerReview({
        sellerId,
        userId: currentUser.id,
        userName: currentUser.name || 'Anonymous Buyer',
        userAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
        rating: ratingInput,
        comment: commentInput.trim(),
        tags: selectedTags,
        verifiedBuyer: true
      });

      setToastMessage(
        isKurdish
          ? 'سوپاس! پێداچوونەوەکەت بە سەرکەوتوویی تۆمارکرا.'
          : isArabic
          ? 'شكراً لك! تم تسجيل تقييمك بنجاح.'
          : 'Thank you! Your seller review has been posted.'
      );
      setTimeout(() => setToastMessage(null), 3500);

      setIsWritingReview(false);
      await loadReviews();
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await db.deleteSellerReview(reviewId, sellerId);
      setToastMessage(
        isKurdish
          ? 'پێداچوونەوەکە سڕایەوە.'
          : isArabic
          ? 'تم حذف التقييم.'
          : 'Review removed.'
      );
      setTimeout(() => setToastMessage(null), 2500);
      await loadReviews();
    } catch (err) {
      console.error("Failed to delete review:", err);
    }
  };

  const handleToggleHelpful = (reviewId: string) => {
    setVotedReviews(prev => {
      const alreadyVoted = prev[reviewId];
      setHelpfulVotes(v => ({
        ...v,
        [reviewId]: (v[reviewId] || 0) + (alreadyVoted ? -1 : 1)
      }));
      return { ...prev, [reviewId]: !alreadyVoted };
    });
  };

  const getRatingFeedbackLabel = (rating: number) => {
    switch (rating) {
      case 5:
        return isKurdish ? '🌟 نایابە! فرۆشیارێکی تەواو جێی متمانەیە' : isArabic ? '🌟 ممتاز! تاجر موثوق للغاية' : '🌟 Excellent! Highly recommended seller';
      case 4:
        return isKurdish ? '😊 زۆر باشە، مامەڵەیەکی پاک و خاوێن' : isArabic ? '😊 جيد جداً، تجربة موفقة' : '😊 Very good! Satisfied overall';
      case 3:
        return isKurdish ? '🙂 مامناوەند، شایەنی سەرنجە' : isArabic ? '🙂 مقبول' : '🙂 Average experience';
      case 2:
        return isKurdish ? '😐 لە خوار چاوەڕوانییەوە بوو' : isArabic ? '😐 دون المستوى المتوقع' : '😐 Below expectations';
      case 1:
        return isKurdish ? '😞 خراپە، پێشنیار ناکرێت' : isArabic ? '😞 سيء، لا أنصح به' : '😞 Poor experience';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col space-y-4 text-start">
      {/* Toast alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUMMARY DISPLAY CARD */}
      <div className={clsx(
        "rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden",
        isDarkTheme 
          ? "bg-slate-950/60 border-white/10 text-white" 
          : "bg-slate-50 border-slate-200 text-slate-900"
      )}>
        {/* Background accent glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-5 justify-between relative z-10">
          {/* Main Average Score */}
          <div className="flex flex-col items-center sm:items-start justify-center min-w-[140px] text-center sm:text-start border-b sm:border-b-0 sm:border-r rtl:sm:border-r-0 rtl:sm:border-l border-white/10 pb-4 sm:pb-0 sm:pr-5 rtl:sm:pr-0 rtl:sm:pl-5">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-400 flex items-center gap-1">
              {metrics.avgRating.toFixed(1)}
              <Star className="w-7 h-7 sm:w-8 sm:h-8 fill-amber-400 text-amber-400 inline shrink-0 drop-shadow-md" />
            </span>

            {/* 5 stars graphic */}
            <div className="flex items-center gap-1 mt-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={clsx(
                    "w-4 h-4",
                    star <= Math.round(metrics.avgRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-600 fill-slate-800"
                  )}
                />
              ))}
            </div>

            <span className="text-xs font-bold text-slate-400 mt-2">
              {isKurdish
                ? `لە سەر بنەمای ${metrics.totalReviews} پێداچوونەوە`
                : isArabic
                ? `بناءً على ${metrics.totalReviews} تقييم`
                : `Based on ${metrics.totalReviews} buyer ratings`}
            </span>

            {metrics.totalReviews > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1.5 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>
                  {isKurdish
                    ? `${metrics.recommendationRate}٪ ڕازیبوون`
                    : isArabic
                    ? `${metrics.recommendationRate}% نسبة الرضا`
                    : `${metrics.recommendationRate}% Satisfaction`}
                </span>
              </span>
            )}
          </div>

          {/* Star Rating Breakdown Bars */}
          <div className="flex-1 w-full space-y-1.5 min-w-[180px]">
            {[5, 4, 3, 2, 1].map((starLevel) => {
              const count = metrics.breakdown[starLevel as keyof typeof metrics.breakdown];
              const pct = metrics.percentages[starLevel as keyof typeof metrics.percentages];
              const isSelected = selectedFilter === starLevel;

              return (
                <button
                  type="button"
                  key={starLevel}
                  onClick={() => setSelectedFilter(isSelected ? 'all' : starLevel)}
                  className={clsx(
                    "w-full flex items-center gap-2 text-xs py-1 px-2 rounded-xl transition-all cursor-pointer group",
                    isSelected 
                      ? "bg-amber-500/15 border border-amber-500/30" 
                      : "hover:bg-white/5"
                  )}
                  title={`Filter by ${starLevel} stars`}
                >
                  <span className="w-10 font-bold flex items-center gap-0.5 shrink-0 text-slate-400 group-hover:text-amber-300">
                    <span>{starLevel}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={clsx(
                        "h-full rounded-full",
                        starLevel >= 4 ? "bg-amber-400" : starLevel === 3 ? "bg-amber-500/80" : "bg-slate-500"
                      )}
                    />
                  </div>

                  <span className="w-12 text-right font-mono text-[11px] text-slate-400 group-hover:text-white shrink-0">
                    {count} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Indicator & CTA row */}
        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>{isKurdish ? 'فلتەر:' : isArabic ? 'تصفية:' : 'Filter:'}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                selectedFilter === 'all'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white/5 text-slate-400 hover:text-white"
              )}
            >
              {isKurdish ? 'هەموو' : isArabic ? 'الكل' : 'All'} ({metrics.totalReviews})
            </button>
            {[5, 4, 3].map(st => (
              <button
                type="button"
                key={st}
                onClick={() => setSelectedFilter(st)}
                className={clsx(
                  "px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
                  selectedFilter === st
                    ? "bg-amber-500 text-slate-950 font-black"
                    : "bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                <span>{st}</span>
                <Star className="w-2.5 h-2.5 fill-current" />
              </button>
            ))}
          </div>

          {/* Write / Edit review button */}
          {!isSelfStore ? (
            <button
              type="button"
              onClick={handleOpenWrite}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              {myExistingReview ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isKurdish ? 'دەستکاری پێداچوونەوەکەت' : isArabic ? 'تعديل تقييمك' : 'Edit Your Review'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isKurdish ? 'نووسینی پێداچوونەوە' : isArabic ? 'كتابة تقييم' : 'Write a Review'}</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              {isKurdish ? 'تۆ خاوەنی ئەم فرۆشگایەیت' : 'You own this store'}
            </span>
          )}
        </div>
      </div>

      {/* WRITE A REVIEW EXPANDABLE FORM */}
      <AnimatePresence>
        {isWritingReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmitReview}
              className={clsx(
                "rounded-2xl p-4 sm:p-5 border space-y-4",
                isDarkTheme 
                  ? "bg-slate-900 border-indigo-500/40 text-white shadow-xl shadow-indigo-500/10" 
                  : "bg-white border-indigo-400 text-slate-900 shadow-xl"
              )}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="font-black text-sm">
                    {isKurdish 
                      ? `پێداچوونەوە بۆ (${sellerName})` 
                      : isArabic 
                      ? `تقييم التاجر (${sellerName})` 
                      : `Rate & Review ${sellerName}`}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  {isKurdish ? 'داخستن' : isArabic ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              {/* Interactive 1-5 Star Picker */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-bold text-slate-400">
                  {isKurdish ? 'چەند ئەستێرە دەدەیت بەم فرۆشیارە؟' : isArabic ? 'كم نجمة تمنح هذا التاجر؟' : 'How many stars do you rate this seller?'}
                </span>
                
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const activeRating = hoverRating !== null ? hoverRating : ratingInput;
                    const isFilled = starVal <= activeRating;

                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRatingInput(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                        title={`${starVal} Stars`}
                      >
                        <Star
                          className={clsx(
                            "w-8 h-8 transition-colors duration-150",
                            isFilled
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                              : "text-slate-600 fill-slate-800"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs font-bold text-amber-300 min-h-[18px]">
                  {getRatingFeedbackLabel(hoverRating !== null ? hoverRating : ratingInput)}
                </p>
              </div>

              {/* Trait Tags Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {isKurdish ? 'تایبەتمەندییە دیارەکان (هەڵبژاردەی ئارەزوومەندانە):' : isArabic ? 'المميزات الإيجابية:' : 'Highlight Seller Qualities:'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REVIEW_TAGS.map((tag) => {
                    const label = isKurdish ? tag.ku : isArabic ? tag.ar : tag.en;
                    const isSelected = selectedTags.includes(label);

                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => handleToggleTag(label)}
                        className={clsx(
                          "px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1",
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs"
                            : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-white/10"
                        )}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {isKurdish ? 'ڕا و سەرنجت لەسەر فرۆشیار:' : isArabic ? 'تفاصيل تجربتك مع التاجر:' : 'Your Detailed Experience:'}
                </label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows={3}
                  required
                  placeholder={
                    isKurdish
                      ? 'بۆ نموونە: کاڵاکان بە کوالێتی بەرز و پێچانەوەی پارێزراو گەیشتن، هەڵسوکەوتی فرۆشیار زۆر بەڕێزانە بوو...'
                      : isArabic
                      ? 'مثال: كانت تجربة رائعة، المنتجات ذات جودة عالية والتوصيل سريع وتعامل التاجر محترم جداً...'
                      : 'Example: Great communication, fast dispatch, high item condition and respectful seller...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  {isKurdish ? 'پاشگەزبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !commentInput.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>{isKurdish ? 'تۆماردەکرێت...' : 'Submitting...'}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isKurdish ? 'بڵاوکردنەوەی پێداچوونەوە' : isArabic ? 'نشر التقييم' : 'Submit Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVIEWS LIST SECTION */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>{isKurdish ? 'پێداچوونەوەکان باردەکرێن...' : 'Loading reviews...'}</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-8 text-center p-6 rounded-2xl bg-slate-950/20 border border-white/5 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold">
              {selectedFilter === 'all'
                ? (isKurdish ? 'هیچ پێداچوونەوەیەک نەدۆزرایەوە.' : 'No reviews posted yet.')
                : (isKurdish ? `هیچ پێداچوونەوەیەکی ${selectedFilter} ئەستێرە نییە.` : `No ${selectedFilter}-star reviews found.`)}
            </p>
            {selectedFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                {isKurdish ? 'پیشاندانی هەموو پێداچوونەوەکان' : 'View all reviews'}
              </button>
            )}
          </div>
        ) : (
          filteredReviews.map((review, rIdx) => {
            const isMyReview = currentUser?.id === review.userId;
            const votesCount = (helpfulVotes[review.id] || 0) + (review.rating >= 4 ? 3 : 1);
            const hasVoted = votedReviews[review.id];

            return (
              <motion.div
                key={`${review.id || 'rev'}-${rIdx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5",
                  isMyReview 
                    ? "bg-indigo-950/30 border-indigo-500/30 text-white"
                    : (isDarkTheme 
                        ? "bg-slate-950/40 border-white/5 text-white" 
                        : "bg-white border-slate-200 text-slate-900")
                )}
              >
                {/* Header: User avatar, name, stars, date */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={review.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userId}`}
                      alt={review.userName}
                      className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0 bg-slate-800"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs truncate">{review.userName}</span>
                        {review.verifiedBuyer !== false && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{isKurdish ? 'کڕیاری پشتڕاستکراو' : isArabic ? 'مشتري مؤكد' : 'Verified Buyer'}</span>
                          </span>
                        )}
                        {isMyReview && (
                          <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full border border-indigo-500/30">
                            {isKurdish ? 'تۆ' : 'You'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {/* Rating Stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={clsx(
                                "w-3 h-3",
                                star <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-600 fill-slate-800"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(review.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Delete if author or admin */}
                  {(isMyReview || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      title={isKurdish ? 'سڕینەوەی پێداچوونەوە' : 'Delete review'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tags if present */}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {review.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Review comment text */}
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {review.comment}
                </p>

                {/* Helpfulness counter */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500">
                  <span className="italic">
                    {isKurdish ? 'پێداچوونەوەی ڕاستەقینەی کڕیار' : 'Verified customer feedback'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleHelpful(review.id)}
                    className={clsx(
                      "flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all cursor-pointer",
                      hasVoted
                        ? "text-indigo-400 bg-indigo-500/10 font-bold"
                        : "hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <ThumbsUp className={clsx("w-2.5 h-2.5", hasVoted && "fill-current")} />
                    <span>{isKurdish ? 'بەسوود بوو' : 'Helpful'} ({votesCount})</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SellerReviewSystem;
