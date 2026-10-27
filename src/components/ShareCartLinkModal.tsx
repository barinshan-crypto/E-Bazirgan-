import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Share2,
  Copy,
  Check,
  X,
  Send
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SharedCartItem } from '../lib/db';
import { safeCopyToClipboard } from '../lib/clipboard';

interface ShareCartLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  items: SharedCartItem[];
  totalIQD: number;
  onOpenSharedCartView?: () => void;
}

export default function ShareCartLinkModal({
  isOpen,
  onClose,
  shareUrl,
  items,
  totalIQD,
}: ShareCartLinkModalProps) {
  const { i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const isAr = i18n.language === 'ar';

  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    const ok = await safeCopyToClipboard(shareUrl);
    if (ok) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    const intro = isKu
      ? `سڵاو! ئەمە لینکی ئەو کاڵایانەی سەبەتەکەمە کە بۆ تۆم هەڵبژاردوون، دەتوانیت لێرەوە بیانبینیت:\n${shareUrl}`
      : isAr
      ? `مرحباً! هذا رابط المنتجات التي اخترتها لك من السلة، يمكنك مشاهدتها هنا:\n${shareUrl}`
      : `Hi! Here is the link to the cart items I selected for you:\n${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(intro)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 !z-[9999999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col text-slate-900 dark:text-white my-auto"
      >
        {/* Header - Simple & Clean */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isKu ? 'هاوبەشکردنی سەبەتە' : isAr ? 'مشاركة السلة' : 'Share Cart'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {items.length} {isKu ? 'کاڵا لەم لیستەدایە' : isAr ? 'مواد محددة' : 'items'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Primary Action: Direct WhatsApp Send */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
            <span>{isKu ? 'ناردن بە وەتسئەپ' : isAr ? 'إرسال عبر واتساب' : 'Share via WhatsApp'}</span>
          </button>

          {/* Clean Link Input with Copy Button */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isKu ? 'لینکی سەبەتە:' : isAr ? 'رابط السلة:' : 'Cart Link:'}
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={shareUrl}
                className="flex-1 bg-transparent px-2.5 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 select-all focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="py-2 px-3.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 shadow-sm"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? (isKu ? 'کۆپیکرا' : 'Copied') : (isKu ? 'کۆپیکردن' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* Simple Product List Preview */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>{isKu ? 'کاڵاکانی ناو سەبەتە' : isAr ? 'المحتويات' : 'Items'}</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                {totalIQD.toLocaleString()} {isKu ? 'دینار' : isAr ? 'دينار' : 'IQD'}
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-9 h-9 rounded-xl object-cover bg-white border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {item.quantity}x • {(Math.round((item.price || 0) * 1500)).toLocaleString()} {isKu ? 'دینار' : 'IQD'}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                    {(Math.round((item.price || 0) * 1500 * (item.quantity || 1))).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
