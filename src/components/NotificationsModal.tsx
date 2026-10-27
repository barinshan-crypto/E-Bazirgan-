import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, TrendingDown, X, CheckCheck, Trash2, Tag, ArrowRight, Clock, Store, Sparkles, ExternalLink, MessageCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { PriceUpdateNotification } from '../lib/db';
import { useTranslation } from 'react-i18next';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PriceUpdateNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectItem: (itemId: string) => void;
  theme: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectItem,
  theme
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [activeFilter, setActiveFilter] = useState<'all' | 'new_product' | 'price_update' | 'story_comment' | 'admin_warning'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'new_product') return n.type === 'new_product';
    if (activeFilter === 'price_update') return n.type === 'price_update';
    if (activeFilter === 'story_comment') return n.type === 'story_comment';
    if (activeFilter === 'admin_warning') return n.type === 'admin_warning' || n.type === 'admin_notice';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const newProductCount = notifications.filter(n => n.type === 'new_product').length;
  const priceUpdateCount = notifications.filter(n => n.type === 'price_update').length;
  const storyCommentCount = notifications.filter(n => n.type === 'story_comment').length;
  const warningCount = notifications.filter(n => n.type === 'admin_warning' || n.type === 'admin_notice').length;

  const isLight = theme === 'light' || theme === 'colorful' || theme === 'rainbow';
  const isRoyal = theme === 'royal';

  const textPrimary = {
    royal: 'text-amber-300',
    dark: 'text-white',
    sunset: 'text-amber-100',
    midnight: 'text-indigo-100',
    cyberpunk: 'text-[#00ff00]',
    emerald: 'text-emerald-100',
    raz: 'text-white',
    light: 'text-slate-900',
    colorful: 'text-slate-900',
    rainbow: 'text-slate-900'
  }[theme] || (isLight ? 'text-slate-900' : 'text-white');

  const textSecondary = {
    royal: 'text-white/80',
    dark: 'text-slate-400',
    sunset: 'text-amber-200/60',
    midnight: 'text-indigo-200/60',
    cyberpunk: 'text-[#00ff00]/60',
    emerald: 'text-emerald-200/60',
    raz: 'text-slate-300',
    light: 'text-slate-600',
    colorful: 'text-slate-600',
    rainbow: 'text-slate-600'
  }[theme] || (isLight ? 'text-slate-600' : 'text-slate-400');

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return isKurdish ? 'ئێستا' : isArabic ? 'الآن' : 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${isKurdish ? 'خولەک پێش ئێستا' : isArabic ? 'دقيقة' : 'm ago'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${isKurdish ? 'کاتژمێر پێش ئێستا' : isArabic ? 'ساعة' : 'h ago'}`;
    const days = Math.floor(hours / 24);
    return `${days} ${isKurdish ? 'ڕۆژ پێش ئێستا' : isArabic ? 'يوم' : 'd ago'}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-[610]",
            theme === 'royal' ? "bg-[#060a16]/95 border-amber-400/30 text-white shadow-2xl shadow-black/80" :
            theme === 'tokyo' ? "bg-slate-950/95 border-indigo-500/40 text-indigo-100" :
            theme === 'sunset' ? "bg-amber-950/90 border-amber-500/30 text-amber-100" :
            theme === 'wavy' ? "bg-white/95 border-teal-200 text-slate-900" :
            "bg-white border-slate-200 text-slate-900"
          )}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-row-reverse gap-3 bg-black/20">
            <div className="flex items-center gap-2.5">
              <div className={clsx(
                "relative p-2 rounded-2xl border",
                isRoyal ? "bg-amber-400/10 border-amber-400/30 text-amber-300" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              )}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className={clsx("font-extrabold text-base sm:text-lg tracking-tight", textPrimary)}>
                  {isKurdish ? 'ئاگادارییەکانی فرۆشگا و نرخ' : isArabic ? 'إشعارات المتاجر والأسعار' : 'Store & Price Alerts'}
                </h3>
                <p className={clsx("text-[11px]", textSecondary)}>
                  {unreadCount > 0 
                    ? (isKurdish ? `${unreadCount} ئاگاداری نەخوێندراوەتەوە` : isArabic ? `${unreadCount} إشعار غير مقروء` : `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`)
                    : (isKurdish ? 'سەرجەم ئاگادارییەکان خوێندراونەتەوە' : isArabic ? 'جميع الإشعارات مقروءة' : 'All caught up!')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 bg-black/10 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                activeFilter === 'all'
                  ? (isRoyal ? "bg-amber-400 text-slate-950 font-black shadow-xs" : "bg-indigo-600 text-white shadow-xs")
                  : "bg-white/5 hover:bg-white/10 text-white/80"
              )}
            >
              <span>{isKurdish ? 'گشت' : isArabic ? 'الكل' : 'All'}</span>
              <span className="text-[10px] opacity-75 font-mono">({notifications.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('new_product')}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeFilter === 'new_product'
                  ? (isRoyal ? "bg-amber-400 text-slate-950 font-black shadow-xs" : "bg-emerald-600 text-white shadow-xs")
                  : "bg-white/5 hover:bg-white/10 text-white/80"
              )}
            >
              <Sparkles className={clsx("w-3.5 h-3.5", activeFilter === 'new_product' && isRoyal ? "text-slate-950" : "text-amber-400")} />
              <span>{isKurdish ? 'کاڵای نوێی فرۆشگا' : isArabic ? 'منتجات المتاجر المتابعة' : 'Followed Stores'}</span>
              {newProductCount > 0 && <span className="text-[10px] opacity-75 font-mono">({newProductCount})</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('price_update')}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeFilter === 'price_update'
                  ? (isRoyal ? "bg-amber-400 text-slate-950 font-black shadow-xs" : "bg-emerald-600 text-white shadow-xs")
                  : "bg-white/5 hover:bg-white/10 text-white/80"
              )}
            >
              <TrendingDown className={clsx("w-3.5 h-3.5", activeFilter === 'price_update' && isRoyal ? "text-slate-950" : "text-emerald-400")} />
              <span>{isKurdish ? 'داشکاندن و چاودێری نرخ' : isArabic ? 'مراقبة الأسعار والتخفيضات' : 'Price Watch & Drops'}</span>
              {priceUpdateCount > 0 && <span className="text-[10px] opacity-75 font-mono">({priceUpdateCount})</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('story_comment')}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeFilter === 'story_comment'
                  ? (isRoyal ? "bg-amber-400 text-slate-950 font-black shadow-xs" : "bg-purple-600 text-white shadow-xs")
                  : "bg-white/5 hover:bg-white/10 text-white/80"
              )}
            >
              <MessageCircle className={clsx("w-3.5 h-3.5", activeFilter === 'story_comment' && isRoyal ? "text-slate-950" : "text-amber-400")} />
              <span>{isKurdish ? 'کۆمێنتی چیرۆک' : isArabic ? 'تعليقات الستوري' : 'Story Comments'}</span>
              {storyCommentCount > 0 && <span className="text-[10px] opacity-75 font-mono">({storyCommentCount})</span>}
            </button>

            {warningCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter('admin_warning')}
                className={clsx(
                  "px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                  activeFilter === 'admin_warning'
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>{isKurdish ? 'ئاگاداری دەستەی چاودێری' : isArabic ? 'تحذيرات الإدارة' : 'Official Warnings'}</span>
                <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">({warningCount})</span>
              </button>
            )}
          </div>

          {/* Controls Bar */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between gap-2 bg-white/5 text-xs">
              <button
                onClick={onMarkAllAsRead}
                disabled={unreadCount === 0}
                className={clsx(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer",
                  unreadCount > 0 ? "text-indigo-400 hover:bg-indigo-500/10" : "text-slate-500 opacity-50 cursor-not-allowed"
                )}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'خوێندنەوەی گشت' : isArabic ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
              </button>

              <button
                onClick={onClearAll}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-all font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'پاککردنەوە' : isArabic ? 'مسح الكل' : 'Clear All'}</span>
              </button>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                  <Bell className="w-8 h-8 opacity-40" />
                </div>
                <h4 className={clsx("font-bold text-sm mb-1", textPrimary)}>
                  {isKurdish ? 'هیچ ئاگادارییەک نییە' : isArabic ? 'لا توجد إشعارات' : 'No notifications'}
                </h4>
                <p className={clsx("text-xs max-w-xs", textSecondary)}>
                  {activeFilter === 'price_update'
                    ? (isKurdish 
                        ? 'هیچ ئاگادارییەکی دابەزینی نرخ نییە. لە لیستی کاڵاکاندا کلیک لەسەر دوگمەی (چاودێری نرخ 🔔) بکە تا هەر کاتێک نرخ دابەزی دەستبەجێ ئاگادارت بکەینەوە.' 
                        : isArabic 
                        ? 'لا توجد إشعارات تخفيض أسعار حالياً. انقر على زر (مراقبة السعر 🔔) في قائمة المنتجات لتصلك إشعارات فورية عند انخفاض السعر.' 
                        : 'No price drop alerts yet. Click the Price Watch (🔔) button on any product in the marketplace list to receive instant notifications when prices drop.')
                    : (isKurdish 
                        ? 'کاتێک شوێنی فرۆشگایەک دەکەویت یان کاڵایەک دادەنێیت لە چاودێری، بە دانانی هەر بەرهەمێکی نوێ یان گۆڕینی نرخ ئاگاداری دەستبەجێت بۆ دێت.' 
                        : isArabic 
                        ? 'عند متابعة المتاجر أو مراقبة المنتجات، ستتلقى إشعارات فورية عند إضافة منتجات جديدة أو تخفيض الأسعار.'
                        : 'Follow stores and add items to your watchlist to receive instant alerts whenever new products are added or prices drop!')}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif, idx) => {
                const isAdminWarning = notif.type === 'admin_warning' || notif.type === 'admin_notice';
                const isNewProduct = notif.type === 'new_product';
                const isStoryComment = notif.type === 'story_comment';
                const isPriceDrop = notif.newPrice < notif.oldPrice;

                // Extract clean comment text without messy prefixes
                let cleanComment = notif.message || '';
                if (cleanComment.includes(': ')) {
                  cleanComment = cleanComment.split(': ').slice(1).join(': ');
                }
                if (!cleanComment && notif.itemTitle) {
                  cleanComment = notif.itemTitle.replace(/^کۆمێنت لەسەر ستۆری[^:]*:\s*"?/, '').replace(/"?$/, '');
                }

                return (
                  <motion.div
                    key={`${notif.id || 'notif'}-${idx}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => {
                      onMarkAsRead(notif.id);
                      if (isStoryComment) {
                        window.dispatchEvent(new CustomEvent('payv_open_story', { detail: { storyId: notif.itemId } }));
                      } else if (notif.itemId && !isAdminWarning) {
                        onSelectItem(notif.itemId);
                      }
                      if (!isAdminWarning) onClose();
                    }}
                    className={clsx(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer relative group flex gap-3 items-center",
                      notif.read
                        ? (isRoyal ? "bg-[#060a16]/60 border-white/10 hover:bg-[#060a16] text-white/70" : isLight ? "bg-slate-50 border-slate-200 hover:bg-slate-100" : "bg-white/5 border-white/5 hover:bg-white/10 opacity-75")
                        : isAdminWarning
                        ? (notif.strikeLevel === 3
                            ? (isLight ? "bg-rose-50 border-rose-300 shadow-md shadow-rose-500/10 ring-1 ring-rose-400" : "bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-500/20")
                            : isLight ? "bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-400" : "bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10")
                        : isRoyal
                        ? "bg-[#091124] border-amber-400/30 hover:border-amber-400/60 shadow-lg shadow-black/40 text-white"
                        : isStoryComment
                        ? (isLight ? "bg-purple-50/90 border-purple-200 hover:bg-purple-100/90 shadow-sm" : "bg-purple-500/15 border-purple-500/30 hover:bg-purple-500/20 shadow-lg shadow-purple-500/5")
                        : isNewProduct
                        ? (isLight ? "bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100/90 shadow-sm" : "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/5")
                        : (isLight ? "bg-indigo-50/90 border-indigo-200 hover:bg-indigo-100/90 shadow-sm" : "bg-indigo-500/15 border-indigo-500/30 hover:bg-indigo-500/20 shadow-lg shadow-indigo-500/5")
                    )}
                  >
                    {!notif.read && (
                      <span className={clsx(
                        "absolute top-3 right-3 w-2.5 h-2.5 rounded-full",
                        isAdminWarning ? "bg-rose-500 ring-2 ring-rose-400/50 animate-ping" : isRoyal ? "bg-amber-400 ring-2 ring-amber-300/40" : isStoryComment ? "bg-purple-500 ring-2 ring-purple-400/40" : isNewProduct ? "bg-emerald-500 ring-2 ring-emerald-400/40" : "bg-indigo-500 ring-2 ring-indigo-400/40"
                      )} />
                    )}

                    {/* Thumbnail / Icon */}
                    <div className={clsx(
                      "relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center",
                      isAdminWarning
                        ? (notif.strikeLevel === 3 ? "bg-rose-600/20 border-rose-500/50 text-rose-500" : "bg-amber-600/20 border-amber-500/50 text-amber-500")
                        : isLight ? "border-slate-200 bg-slate-100" : "border-white/10 bg-black/40"
                    )}>
                      {isAdminWarning ? (
                        notif.strikeLevel === 3 ? <ShieldAlert className="w-7 h-7 text-rose-500 animate-bounce" /> : <AlertTriangle className="w-7 h-7 text-amber-500" />
                      ) : notif.itemImageUrl ? (
                        <img src={notif.itemImageUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isStoryComment ? <MessageCircle className="w-6 h-6 text-purple-500" /> : isNewProduct ? <Store className="w-6 h-6 text-emerald-500" /> : <Tag className="w-6 h-6 text-indigo-500" />}
                        </div>
                      )}
                      {isStoryComment && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      {isAdminWarning ? (
                        /* Admin Warning / Strike UI */
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                              notif.strikeLevel === 3 
                                ? "bg-rose-500 text-white" 
                                : "bg-amber-500 text-slate-950 font-bold"
                            )}>
                              <AlertTriangle className="w-3 h-3" />
                              {notif.strikeLevel ? `ئاستی سەرپێچی ${notif.strikeLevel}/3` : 'ئاگاداری بەڕێوەبەر'}
                            </span>
                            <span className={clsx(
                              "text-[10px] flex items-center gap-1 ml-auto font-medium",
                              isLight ? "text-slate-500" : "text-slate-400"
                            )}>
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <h4 className={clsx(
                            "font-black text-xs sm:text-sm mb-1",
                            notif.strikeLevel === 3 ? "text-rose-500 dark:text-rose-400" : "text-amber-600 dark:text-amber-300"
                          )}>
                            {notif.itemTitle}
                          </h4>

                          {notif.warningReason && (
                            <p className={clsx(
                              "text-xs font-bold mb-1",
                              isLight ? "text-slate-800" : "text-slate-200"
                            )}>
                              هۆکار: <span className="font-normal opacity-90">{notif.warningReason}</span>
                            </p>
                          )}

                          {notif.message && (
                            <p className={clsx(
                              "text-xs p-2 rounded-xl mb-1.5 border font-medium leading-relaxed",
                              isLight ? "bg-slate-100/80 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-300"
                            )}>
                              "{notif.message}"
                            </p>
                          )}

                          {notif.actionRequired && (
                            <p className={clsx(
                              "text-[11px] font-semibold flex items-center gap-1",
                              notif.strikeLevel === 3 ? "text-rose-400" : "text-amber-400"
                            )}>
                              ℹ️ {notif.actionRequired}
                            </p>
                          )}
                        </div>
                      ) : isStoryComment ? (
                        /* Clean & Direct Story Comment Layout */
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                              <span className={clsx(
                                "font-bold text-xs truncate",
                                isLight ? "text-purple-900" : "text-purple-300"
                              )}>
                                {notif.sellerName || (isKurdish ? 'بەکارهێنەر' : 'User')}
                              </span>
                            </div>
                            <span className={clsx(
                              "text-[10px] flex items-center gap-1 shrink-0 font-medium",
                              isLight ? "text-slate-500" : "text-slate-400"
                            )}>
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <p className={clsx(
                            "text-sm font-black leading-snug break-words",
                            isLight ? "text-slate-900" : "text-white"
                          )}>
                            {cleanComment || (isKurdish ? 'کۆمێنتێک لەسەر چیرۆک' : 'Commented on story')}
                          </p>
                        </div>
                      ) : (
                        /* Standard Products / Price Drop Layout */
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {isNewProduct ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                                {isKurdish ? 'کاڵای نوێی فرۆشگا' : isArabic ? 'منتج جديد' : 'New Product'}
                              </span>
                            ) : (
                              <>
                                {notif.isPriceWatch && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                    <BellRing className="w-3 h-3 text-amber-400" />
                                    {isKurdish ? 'چاودێری نرخ' : isArabic ? 'مراقبة السعر' : 'Price Watch'}
                                  </span>
                                )}
                                <span className={clsx(
                                  "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                                  isPriceDrop 
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                )}>
                                  {isPriceDrop ? <TrendingDown className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                                  {isPriceDrop 
                                    ? (isKurdish ? 'داشکاندنی نرخ' : isArabic ? 'تخفيض السعر' : 'Price Drop')
                                    : (isKurdish ? 'گۆڕانکاری نرخ' : isArabic ? 'تحديث السعر' : 'Price Updated')}
                                </span>
                                {isPriceDrop && (notif.dropPercentage || (notif.oldPrice > 0 && Math.round(((notif.oldPrice - notif.newPrice) / notif.oldPrice) * 100) > 0)) && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white shadow-xs">
                                    -%{notif.dropPercentage || Math.round(((notif.oldPrice - notif.newPrice) / notif.oldPrice) * 100)}
                                  </span>
                                )}
                              </>
                            )}

                            <span className={clsx(
                              "text-[10px] flex items-center gap-1 ml-auto font-medium",
                              isLight ? "text-slate-500" : "text-slate-400"
                            )}>
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <h4 className={clsx("font-extrabold text-xs sm:text-sm truncate mb-1", textPrimary)}>
                            {notif.itemTitle}
                          </h4>

                          {isNewProduct ? (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                                <span>{(notif.newPrice * 1500).toLocaleString()} IQD</span>
                                <span className={clsx("text-[10px] font-normal", isLight ? "text-slate-500" : "text-slate-400")}>(${notif.newPrice})</span>
                              </div>
                              {notif.sellerName && (
                                <span className={clsx(
                                  "text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-md border",
                                  isLight ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                                )}>
                                  <Store className="w-3 h-3" />
                                  {notif.sellerName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                                <span className={clsx("line-through text-[11px]", isLight ? "text-slate-400" : "text-slate-500")}>
                                  {(notif.oldPrice * 1500).toLocaleString()} IQD
                                </span>
                                <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className={clsx(
                                  "font-black text-sm",
                                  isPriceDrop ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                )}>
                                  {(notif.newPrice * 1500).toLocaleString()} IQD
                                </span>
                                {isPriceDrop && (notif.oldPrice - notif.newPrice > 0) && (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    {isKurdish 
                                      ? `سەودا: ${((notif.oldPrice - notif.newPrice) * 1500).toLocaleString()} دینار` 
                                      : isArabic 
                                      ? `توفير: ${((notif.oldPrice - notif.newPrice) * 1500).toLocaleString()} د.ع` 
                                      : `Save ${((notif.oldPrice - notif.newPrice) * 1500).toLocaleString()} IQD`}
                                  </span>
                                )}
                              </div>
                              {notif.message && (
                                <p className={clsx(
                                  "text-[11px] mt-1.5 px-2 py-1 rounded-lg border leading-tight",
                                  isLight ? "bg-slate-100/80 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-slate-300"
                                )}>
                                  {notif.message}
                                </p>
                              )}
                            </div>
                          )}

                          {notif.sellerName && !isNewProduct && (
                            <p className={clsx("text-[10px] mt-1 flex items-center gap-1", isLight ? "text-slate-500" : "text-slate-400")}>
                              <Store className="w-3 h-3" />
                              {isKurdish ? `فرۆشگا: ${notif.sellerName}` : isArabic ? `المتجر: ${notif.sellerName}` : `Store: ${notif.sellerName}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={clsx(
                      "self-center p-2 rounded-xl transition-all",
                      isLight ? "bg-slate-200/70 group-hover:bg-slate-300 text-slate-700" : "bg-white/5 group-hover:bg-white/10 text-slate-400 group-hover:text-white"
                    )}>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
