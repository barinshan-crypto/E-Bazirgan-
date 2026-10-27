import React, { useState, useEffect } from 'react';
import { MarketplaceItem, getBumpRuleForCategory, bumpMarketplaceItem, BumpRule } from '../lib/db';
import { Zap, Clock, AlertCircle, X, CheckCircle2, TrendingUp, PackageCheck, Layers } from 'lucide-react';
import clsx from 'clsx';

interface BumpModalProps {
  item: MarketplaceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedItem: MarketplaceItem) => void;
  i18nLanguage?: string;
}

export const BumpModal: React.FC<BumpModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
  i18nLanguage = 'ku',
}) => {
  if (!isOpen || !item) return null;

  const isKurdish = i18nLanguage === 'ku';
  const rule: BumpRule = getBumpRuleForCategory(item.category);

  const currentBumpCount = item.bump_count ?? item.bumpCount ?? 0;
  const lastBumpTime = item.last_bumped_at ?? item.lastBumpedAt ?? 0;
  const now = Date.now();

  const [price, setPrice] = useState<number>(item.price || 0);
  const [stockQuantity, setStockQuantity] = useState<number>(item.stockQuantity ?? 10);
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock'>(
    item.stockStatus || (item.stockQuantity === 0 ? 'out_of_stock' : 'in_stock')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Countdown timer logic
  const timeSinceLastBump = now - lastBumpTime;
  const isOnCooldown = lastBumpTime > 0 && timeSinceLastBump < rule.cooldownMs;
  const initialRemainingMs = isOnCooldown ? rule.cooldownMs - timeSinceLastBump : 0;
  
  const [remainingMs, setRemainingMs] = useState<number>(initialRemainingMs);

  useEffect(() => {
    if (!isOnCooldown) return;
    const interval = setInterval(() => {
      const currentDiff = rule.cooldownMs - (Date.now() - lastBumpTime);
      if (currentDiff <= 0) {
        setRemainingMs(0);
        clearInterval(interval);
      } else {
        setRemainingMs(currentDiff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastBumpTime, rule.cooldownMs, isOnCooldown]);

  const isMaxBumpsReached = currentBumpCount >= rule.maxBumps;
  const canBump = !isOnCooldown && !isMaxBumpsReached && remainingMs <= 0;

  const formatRemainingTime = (ms: number) => {
    if (ms <= 0) return '';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}ک ${mins}خ ${secs}چ`;
  };

  const handleConfirmBump = async () => {
    if (!canBump) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await bumpMarketplaceItem(item.id, {
        price,
        stockQuantity,
        stockStatus,
      });

      if (res.success && res.updatedItem) {
        setSuccessMsg(isKurdish ? res.messageKu : res.message);
        if (onSuccess) onSuccess(res.updatedItem);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1500);
      } else {
        setErrorMsg(isKurdish ? res.messageKu : res.message);
      }
    } catch (err: any) {
      setErrorMsg(isKurdish ? 'هەڵەیەک ڕوویدا لە خستنە سەرەوە' : 'An error occurred during post refresh');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-slate-200 overflow-hidden space-y-5">
        
        {/* Glow ambient background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Zap className="w-6 h-6 fill-slate-950 stroke-none" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{isKurdish ? 'خستنە سەرەوەی پۆست' : 'Smart Post Bump'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {rule.categoryType === 'farm_perishable' 
                    ? (isKurdish ? 'بەرهەمی کێڵگە' : 'Farm/Perishable')
                    : rule.categoryType === 'crafts_workshop' 
                    ? (isKurdish ? 'کار دەستی و پیشەسازی' : 'Crafts/Workshop')
                    : (isKurdish ? 'کاڵای گشتی' : 'General')}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKurdish ? 'پۆستەکەت دەباتەوە لوتکەی مارکێتپلەیس بە زانیاری نوێکراوەوە' : 'Push your post back to top of feed with fresh inventory'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Preview Card */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-white/10 p-3 rounded-2xl relative z-10">
          <img
            src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200'}
            alt={item.title}
            className="w-14 h-14 object-cover rounded-xl border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
            <p className="text-xs text-amber-400 font-mono font-black">{item.price?.toLocaleString()} IQD</p>
            <p className="text-[10px] text-slate-400">
              {isKurdish ? `بەش: ${item.category}` : `Category: ${item.category}`}
            </p>
          </div>
        </div>

        {/* Category Cooldown & Lifetime Bump Limit Banner */}
        <div className="p-4 bg-slate-950/90 border border-white/10 rounded-2xl space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Clock className="w-4 h-4" />
              {isKurdish ? rule.titleKu : rule.titleEn}
            </span>
          </div>

          {/* Bump Count Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>{isKurdish ? 'ڕێژەی خستنە سەرەوەی بەکارهاتوو:' : 'Lifetime bumps used:'}</span>
              <span className="text-emerald-300 font-mono font-bold">
                {currentBumpCount} / {rule.maxBumps} {isKurdish ? 'جار' : 'times'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className={clsx(
                  "h-full transition-all duration-500 rounded-full",
                  isMaxBumpsReached
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-emerald-400 to-teal-400"
                )}
                style={{ width: `${Math.min(100, (currentBumpCount / rule.maxBumps) * 100)}%` }}
              />
            </div>
          </div>

          {/* Cooldown Timer Status */}
          {remainingMs > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs font-bold text-rose-300 animate-pulse">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {isKurdish ? 'کاتی ماوە تا خستنە سەرەوەی دواتر:' : 'Cooldown remaining:'}
              </span>
              <span className="font-mono text-sm bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-500/30">
                {formatRemainingTime(remainingMs)}
              </span>
            </div>
          )}

          {isMaxBumpsReached && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {isKurdish
                  ? `تێپەڕاندنی زۆرترین ڕێژەی خستنە سەرەوە (${rule.maxBumps} جار). بۆ نوێکردنەوە پۆستی تازە دروستبکە.`
                  : `Maximum limit reached (${rule.maxBumps} bumps max). Create a new listing if needed.`}
              </span>
            </div>
          )}
        </div>

        {/* Requirement #2: Smart Update Dependency Section */}
        <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <PackageCheck className="w-4 h-4" />
            <span>{isKurdish ? 'نوێکردنەوەی زانیاری کاڵا بۆ خستنە سەرەوە (ئارەزوومەندانە):' : 'Update Stock & Price info for bump:'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Price Update */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isKurdish ? 'نرخی نوێ (IQD)' : 'Updated Price (IQD)'}
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isKurdish ? 'بڕی جەستەیی لە کۆگا (دانە)' : 'Stock Quantity (units)'}
              </label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStockQuantity(val);
                  if (val === 0) setStockStatus('out_of_stock');
                  else if (val <= 3) setStockStatus('low_stock');
                  else setStockStatus('in_stock');
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Stock Status Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              {isKurdish ? 'باری کۆگا (Stock Status)' : 'Stock Availability Status'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStockStatus('in_stock')}
                className={clsx(
                  "py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                  stockStatus === 'in_stock'
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    : "bg-slate-900 text-slate-400 border-white/5 hover:text-white"
                )}
              >
                {isKurdish ? 'لە کۆگادایە' : 'In Stock'}
              </button>
              <button
                type="button"
                onClick={() => setStockStatus('low_stock')}
                className={clsx(
                  "py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                  stockStatus === 'low_stock'
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-slate-900 text-slate-400 border-white/5 hover:text-white"
                )}
              >
                {isKurdish ? 'کەم ماوە' : 'Low Stock'}
              </button>
              <button
                type="button"
                onClick={() => setStockStatus('out_of_stock')}
                className={clsx(
                  "py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                  stockStatus === 'out_of_stock'
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : "bg-slate-900 text-slate-400 border-white/5 hover:text-white"
                )}
              >
                {isKurdish ? 'نەماوە' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs font-bold text-rose-300 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isKurdish ? 'داخستن' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={!canBump || isSubmitting}
            onClick={handleConfirmBump}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg cursor-pointer",
              canBump
                ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-emerald-500/20"
                : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
            )}
          >
            <Zap className={clsx("w-4 h-4", canBump && "fill-slate-950")} />
            <span>
              {isSubmitting
                ? (isKurdish ? 'لەپرۆسەی خستنە سەرەوەدایە...' : 'Bumping...')
                : (isKurdish ? 'پشتڕاستکردنەوە و خستنە سەرەوە 🚀' : 'Confirm & Bump to Top')}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
