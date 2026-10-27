import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Camera, Send, Loader2, Trash2 } from 'lucide-react';
import { db, User, MarketplaceItem, Review } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: (newReview?: Review) => void;
  user: User | null;
  item: MarketplaceItem | null;
  theme: string;
}

export default function ReviewModal({ isOpen, onClose, user, item, theme }: ReviewModalProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageProcessing, setImageProcessing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !item) return null;

  const currentTheme = theme || 'dark';

  const bgBar = {
    dark: 'bg-slate-900/95 border-white/15 text-white shadow-2xl shadow-black/70',
    white: 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/40',
    emerald: 'bg-emerald-950/95 border-emerald-500/30 text-emerald-50 shadow-2xl shadow-black/60',
    colorful: 'bg-slate-900/95 border-indigo-500/30 text-white shadow-2xl shadow-indigo-950/50',
    raz: 'bg-ef-bg/95 border-ef-pink/40 text-ef-text shadow-2xl',
    sunset: 'bg-orange-950/95 border-orange-500/30 text-orange-50 shadow-2xl',
    midnight: 'bg-slate-950/95 border-indigo-500/30 text-indigo-50 shadow-2xl',
    cyberpunk: 'bg-black/95 border-[#00ff00]/40 text-[#00ff00] shadow-2xl',
    adv: 'bg-yellow-400 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
  };

  const inputBg = {
    dark: 'bg-white/10 text-white placeholder-slate-400 border-white/10 focus:border-amber-400',
    white: 'bg-slate-100 text-slate-900 placeholder-slate-500 border-slate-200 focus:border-indigo-500',
    emerald: 'bg-white/10 text-white placeholder-emerald-200/50 border-emerald-500/20 focus:border-emerald-400',
    colorful: 'bg-white/10 text-white placeholder-slate-400 border-white/10 focus:border-indigo-400',
    raz: 'bg-white/10 text-ef-text placeholder-ef-text/50 border-ef-pink/30 focus:border-ef-violet',
    sunset: 'bg-white/10 text-white placeholder-orange-200/50 border-orange-500/20 focus:border-orange-400',
    midnight: 'bg-white/10 text-white placeholder-indigo-200/50 border-indigo-500/20 focus:border-indigo-400',
    cyberpunk: 'bg-black text-[#00ff00] placeholder-[#00ff00]/50 border-[#00ff00]/30 focus:border-[#00ff00]',
    adv: 'bg-white text-black placeholder-gray-500 border-2 border-black'
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(isKurdish ? 'تکایە تەنها وێنە هەڵبژێرە' : isArabic ? 'يرجى اختيار صورة فقط' : 'Please upload an image file');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setImageProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          const compressed = await compressBase64Image(rawBase64, 300, 0.65);
          setImageUrl(compressed);
        } catch (err: any) {
          console.error("Compression failed:", err);
          setError(isKurdish ? 'هەڵە لە وێنەدا' : 'Failed to process image');
          setTimeout(() => setError(null), 3000);
        } finally {
          setImageProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Image processing error');
      setImageProcessing(false);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError(isKurdish ? 'پێویستە چوونەژوورەوە بکەیت' : isArabic ? 'يجب تسجيل الدخول أولاً' : 'Sign in required');
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!comment.trim()) {
      setError(isKurdish ? 'کۆمێنت بنووسە' : isArabic ? 'اكتب تعليقاً' : 'Write a comment');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const newReview = await db.addReview({
        itemId: item.id,
        userId: user.id,
        userName: user.name || 'Anonymous',
        userAvatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        rating,
        comment: comment.trim(),
        imageUrl: imageUrl || undefined,
      });
      setComment('');
      setImageUrl('');
      setRating(5);
      onClose(newReview);
    } catch (err: any) {
      setError(err.message || 'Error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div key="review-slim-modal-container">
      <div 
        key="review-modal-backdrop"
        className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        dir={isKurdish || isArabic ? 'rtl' : 'ltr'}
      />

      {/* Slim Toolbar Container floating near bottom */}
      <AnimatePresence>
        <motion.div
          key="review-modal-motion-bar"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-3 sm:bottom-6 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-[99999] pointer-events-auto"
          dir={isKurdish || isArabic ? 'rtl' : 'ltr'}
        >
        <div className={clsx(
          "w-full rounded-2xl sm:rounded-full p-2 sm:p-2.5 border backdrop-blur-xl relative transition-all",
          bgBar[currentTheme as keyof typeof bgBar]
        )}>
          {/* Subtle error tooltip float */}
          {error && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-lg whitespace-nowrap animate-bounce">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
            {/* Top row on mobile: Item title + Stars + Close */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 shrink-0 px-1 sm:px-0">
              {/* Stars selection */}
              <div className="flex items-center gap-0.5 bg-black/15 sm:bg-transparent px-2 sm:px-0 py-1 sm:py-0 rounded-full">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isGold = hoverRating !== null ? starVal <= hoverRating : starVal <= rating;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      aria-label={`${starVal} stars`}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(starVal)}
                      className="p-0.5 hover:scale-115 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Star
                        className={clsx(
                          "w-4 h-4 sm:w-4.5 sm:h-4.5 transition-colors",
                          isGold ? "text-amber-400 fill-amber-400 drop-shadow-xs" : "text-slate-500/50"
                        )}
                      />
                    </button>
                  );
                })}
                <span className="text-[11px] font-mono font-black text-amber-400 ml-1">
                  {hoverRating !== null ? hoverRating : rating}★
                </span>
              </div>

              {/* Truncated Item name & Close on mobile */}
              <div className="flex sm:hidden items-center gap-2">
                <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1 rounded-full hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Middle: Slim single-line text input */}
            <div className="flex-1 w-full min-w-0 flex items-center gap-1.5">
              <input
                type="text"
                value={comment}
                maxLength={300}
                required
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isKurdish 
                    ? "سەرنج یان کۆمێنتێک بنووسە..." 
                    : isArabic 
                    ? "اكتب رأيك أو تعليقك..." 
                    : "Write your review..."
                }
                className={clsx(
                  "flex-1 h-9 px-3 text-xs rounded-xl sm:rounded-full border focus:outline-none transition-all",
                  inputBg[currentTheme as keyof typeof inputBg]
                )}
              />

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Small photo attach button / mini preview */}
              {imageUrl ? (
                <div className="relative group shrink-0">
                  <img
                    src={imageUrl}
                    alt="Mini preview"
                    className="w-8 h-8 rounded-lg object-cover border border-amber-400 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title={isKurdish ? 'سڕینەوەی وێنە' : 'Remove image'}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={imageProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  title={isKurdish ? 'بارکردنی وێنەی بچووک' : isArabic ? 'إرفاق صورة مصغرة' : 'Attach small photo'}
                  className={clsx(
                    "w-9 h-9 rounded-xl sm:rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95",
                    "border-white/10 hover:border-amber-400/50 bg-white/5 hover:bg-amber-400/10 text-slate-300 hover:text-amber-400"
                  )}
                >
                  {imageProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={submitting || imageProcessing}
                className={clsx(
                  "h-9 px-3 rounded-xl sm:rounded-full font-black text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer",
                  "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 disabled:opacity-50"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className={clsx("w-3.5 h-3.5", isKurdish || isArabic ? "rotate-180" : "")} />
                    <span className="hidden xs:inline">{isKurdish ? 'ناردن' : isArabic ? 'إرسال' : 'Send'}</span>
                  </>
                )}
              </button>

              {/* Close Button on Desktop */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                title={isKurdish ? 'داخستن' : 'Close'}
                className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
