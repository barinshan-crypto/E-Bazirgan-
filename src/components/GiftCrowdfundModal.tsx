import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  Heart, 
  Truck, 
  Sparkles, 
  Send, 
  Clock, 
  Users, 
  MapPin, 
  Phone, 
  AlertCircle,
  X,
  CreditCard,
  MessageSquareHeart,
  PartyPopper
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, GiftCrowdfundPool, MarketplaceItem, User } from '../lib/db';
import { safeCopyToClipboard } from '../lib/clipboard';

interface GiftCrowdfundModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId?: string | null;
  targetProduct?: MarketplaceItem | null;
  user: User | null;
  onRequireAuth: () => void;
}

export default function GiftCrowdfundModal({
  isOpen,
  onClose,
  poolId,
  targetProduct,
  user,
  onRequireAuth
}: GiftCrowdfundModalProps) {
  const { i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const isAr = i18n.language === 'ar';

  const [pool, setPool] = useState<GiftCrowdfundPool | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Creation Form state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientCity, setRecipientCity] = useState<string>('Erbil');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [occasionTitle, setOccasionTitle] = useState<string>('جەژنی لەدایکبوون 🎂');
  const [customNote, setCustomNote] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Contribution state
  const [contribAmount, setContribAmount] = useState<number>(15000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [contribName, setContribName] = useState<string>('');
  const [contribPhone, setContribPhone] = useState<string>('');
  const [contribMessage, setContribMessage] = useState<string>('');
  const [contribPaymentMethod, setContribPaymentMethod] = useState<'fastpay' | 'fib' | 'zaincash' | 'cod_pledge'>('fastpay');
  const [submittingContrib, setSubmittingContrib] = useState<boolean>(false);
  const [celebrateSuccess, setCelebrateSuccess] = useState<boolean>(false);

  // Pre-fill defaults
  useEffect(() => {
    if (targetProduct) {
      if (targetProduct.sizes && targetProduct.sizes.length > 0) {
        setSelectedSize(targetProduct.sizes[0]);
      }
      if (targetProduct.colors && targetProduct.colors.length > 0) {
        setSelectedColor(targetProduct.colors[0]);
      }
    }
    if (user) {
      setContribName(user.name || '');
      setContribPhone(user.phone || '');
    }
  }, [targetProduct, user]);

  // Load pool or subscribe to updates
  useEffect(() => {
    if (!isOpen) return;

    if (poolId) {
      setLoading(true);
      const unsubscribe = db.onGiftPoolChange(poolId, (updatedPool) => {
        setPool(updatedPool);
        setLoading(false);
      });
      return () => unsubscribe();
    } else if (targetProduct) {
      setIsCreating(true);
      setPool(null);
      setLoading(false);
    }
  }, [isOpen, poolId, targetProduct]);

  if (!isOpen) return null;

  const currentPriceIQD = targetProduct 
    ? Math.round(Number(targetProduct.price || 0) * 1500)
    : (pool?.productPrice || 0);

  const shippingFeeIQD = 4000;
  const targetTotalIQD = pool ? pool.targetAmount : (currentPriceIQD + shippingFeeIQD);
  const currentTotalIQD = pool ? pool.currentAmount : 0;
  const remainingIQD = Math.max(0, targetTotalIQD - currentTotalIQD);
  const percentFunded = targetTotalIQD > 0 ? Math.min(100, Math.round((currentTotalIQD / targetTotalIQD) * 100)) : 0;
  const isFullyFunded = percentFunded >= 100;

  const shareableUrl = pool ? `${window.location.origin}/?giftPool=${pool.id}` : '';

  const handleQuickShare = async () => {
    if (!pool || !shareableUrl) return;
    const shareTitle = isKu
      ? `🎁 دیاری بە کۆمەڵ: ${pool.productTitle}`
      : isAr
      ? `🎁 هدية جماعية: ${pool.productTitle}`
      : `🎁 Group Gift: ${pool.productTitle}`;

    const shareText = isKu
      ? `🎁 هاوڕێیان! با پێکەوە بەشدار بین لە کڕینی دیاری (${pool.productTitle}) بۆ ئازیزی دڵمان ${pool.recipientName}: \n${shareableUrl}`
      : isAr
      ? `🎁 أصدقائي! دعونا نساهم معاً في شراء هدية (${pool.productTitle}) لـ ${pool.recipientName}: \n${shareableUrl}`
      : `🎁 Friends! Let's contribute together for a gift (${pool.productTitle}) for ${pool.recipientName}: \n${shareableUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareableUrl
        });
        return;
      } catch (e) {
        // User cancelled or share unavailable, fall through to copy
      }
    }

    // Fallback: Copy to clipboard
    const success = await safeCopyToClipboard(shareableUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProduct) return;
    if (!recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim()) {
      alert(isKu ? 'تکایە زانیارییەکانی وەرگر بە تەواوی پڕبکەرەوە' : 'Please fill recipient details');
      return;
    }

    setLoading(true);
    try {
      const newPool = await db.createGiftPool({
        productId: targetProduct.id,
        productTitle: targetProduct.title,
        productPrice: currentPriceIQD,
        productImage: targetProduct.imageUrls?.[0] || targetProduct.imageUrl || '',
        shippingFee: shippingFeeIQD,
        targetAmount: targetTotalIQD,
        creatorId: user?.id || 'guest',
        creatorName: user?.name || (isKu ? 'کڕیار' : 'Customer'),
        creatorPhone: user?.phone || '',
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientCity,
        recipientAddress: recipientAddress.trim(),
        occasionTitle,
        customNote: customNote.trim(),
        selectedSize: selectedSize || undefined,
        selectedColor: selectedColor || undefined,
        sellerId: targetProduct.userId,
        sellerName: targetProduct.userName
      });

      setPool(newPool);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pool) return;

    const finalAmount = customAmountStr ? parseInt(customAmountStr, 10) : contribAmount;
    if (!finalAmount || finalAmount <= 0) {
      alert(isKu ? 'تکایە بڕی پشکداربوون دیاری بکە' : 'Please specify contribution amount');
      return;
    }

    if (!contribName.trim()) {
      alert(isKu ? 'تکایە ناوی خۆت بنووسە' : 'Please enter your name');
      return;
    }

    setSubmittingContrib(true);
    try {
      const result = await db.addGiftContribution(pool.id, {
        contributorName: contribName.trim(),
        contributorPhone: contribPhone.trim(),
        amount: finalAmount,
        message: contribMessage.trim(),
        paymentMethod: contribPaymentMethod,
        avatarUrl: user?.avatar
      });

      if (result) {
        setPool(result.pool);
        setCelebrateSuccess(true);
        setCustomAmountStr('');
        setContribMessage('');
        setTimeout(() => setCelebrateSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingContrib(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[750] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-xl bg-[#F9FAFB] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-[#1F2937]"
      >
        {/* Soft Minimalist Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#1F2937]">
                {isKu ? 'پشکداربوون لە دیاری (Crowdfunding)' : isAr ? 'المساهمة في هدية جماعية' : 'Group Gift Crowdfunding'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isKu ? 'کۆکردنەوەی پارەی دیاری بەشێوەی هاوبەش لەگەڵ هاوڕێیان' : 'Crowdfund a gift with friends & family'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>{isKu ? 'بارکردنی زانیارییەکان...' : 'Loading pool details...'}</span>
            </div>
          ) : isCreating ? (
            /* CREATE POOL VIEW */
            <form onSubmit={handleCreatePool} className="space-y-4">
              {/* Product Preview Card */}
              {targetProduct && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-3.5 shadow-sm">
                  <img
                    src={targetProduct.imageUrls?.[0] || targetProduct.imageUrl || ''}
                    alt={targetProduct.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 bg-slate-50"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#1F2937] truncate">{targetProduct.title}</h4>
                    <p className="text-xs font-bold text-indigo-600 font-mono mt-0.5">
                      {currentPriceIQD.toLocaleString()} IQD
                    </p>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      +{shippingFeeIQD.toLocaleString()} IQD {isKu ? 'گەیاندن' : 'Delivery'}
                    </span>
                  </div>
                </div>
              )}

              {/* Form Fields: Recipient Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {isKu ? '📍 زانیارییەکانی وەرگری دیاری (Recipient)' : '📍 Recipient & Delivery Details'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {isKu ? 'ناوی وەرگر:' : 'Recipient Name:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={isKu ? 'ناوی هاوڕێ/ئازیز' : 'e.g. Sara Ahmed'}
                      className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {isKu ? 'ژمارەی تەلەفۆنی وەرگر:' : 'Recipient Phone:'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="0750XXXXXXX"
                      className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {isKu ? 'شار:' : 'City:'}
                    </label>
                    <select
                      value={recipientCity}
                      onChange={(e) => setRecipientCity(e.target.value)}
                      className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Erbil">{isKu ? 'هەولێر (Erbil)' : 'Erbil'}</option>
                      <option value="Sulaymaniyah">{isKu ? 'سلێمانی (Sulaymaniyah)' : 'Sulaymaniyah'}</option>
                      <option value="Duhok">{isKu ? 'دهۆک (Duhok)' : 'Duhok'}</option>
                      <option value="Kirkuk">{isKu ? 'کەرکووک (Kirkuk)' : 'Kirkuk'}</option>
                      <option value="Halabja">{isKu ? 'هەڵەبجە (Halabja)' : 'Halabja'}</option>
                      <option value="Baghdad">{isKu ? 'بەغدا (Baghdad)' : 'Baghdad'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {isKu ? 'بۆنە:' : 'Occasion:'}
                    </label>
                    <input
                      type="text"
                      value={occasionTitle}
                      onChange={(e) => setOccasionTitle(e.target.value)}
                      placeholder={isKu ? 'جەژنی لەدایکبوون، دەرچوون...' : 'Birthday, Graduation...'}
                      className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {isKu ? 'ناونیشانی تەواوی وەرگر:' : 'Delivery Full Address:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder={isKu ? 'گەڕەک، کۆڵان، نزیک شوێنێکی ناسراو' : 'District, Street, Landmark'}
                    className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Target Calculation Summary */}
              <div className="p-4 bg-[#EEF2FF] border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-700 font-bold block">
                    {isKu ? 'کۆی ئامانجی دیاری (کاڵا + گەیاندن):' : 'Total Target (Product + Delivery):'}
                  </span>
                  <span className="text-lg font-black text-indigo-950 font-mono">
                    {targetTotalIQD.toLocaleString()} IQD
                  </span>
                </div>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isKu ? 'دروستکردنی لینکی دیاری' : 'Create Gift Link'}</span>
                </button>
              </div>
            </form>
          ) : pool ? (
            /* ACTIVE POOL & CONTRIBUTION VIEW */
            <div className="space-y-5">
              {/* Product Header & Occasion */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-start gap-4 shadow-sm">
                <img
                  src={pool.productImage}
                  alt={pool.productTitle}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-100 bg-slate-50 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black border border-indigo-100 mb-1">
                    <Gift className="w-3 h-3" />
                    <span>{pool.occasionTitle || 'دیاری هاوبەش'}</span>
                  </div>
                  <h3 className="text-sm font-black text-[#1F2937] truncate">{pool.productTitle}</h3>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{isKu ? 'بۆ:' : 'For:'} <strong className="text-indigo-900">{pool.recipientName}</strong></span>
                    <span>•</span>
                    <span>{pool.recipientCity}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Status */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700">
                      {isFullyFunded 
                        ? (isKu ? '🎉 ئامانج پڕبووەوە (Fully Funded)' : '🎉 Fully Funded!') 
                        : (isKu ? 'ئاستی کۆکردنەوە:' : 'Funding Progress:')}
                    </span>
                    <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      {percentFunded}%
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {currentTotalIQD.toLocaleString()} / {targetTotalIQD.toLocaleString()} IQD
                  </span>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentFunded}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      isFullyFunded
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    {isKu ? 'ماوە:' : 'Remaining:'}{' '}
                    <strong className="text-rose-600 font-mono font-black">{remainingIQD.toLocaleString()} IQD</strong>
                  </span>
                  <span>
                    {pool.contributions?.length || 0} {isKu ? 'بەشداربوو' : 'Contributors'}
                  </span>
                </div>
              </div>

              {/* Quick Share Box */}
              <div className="p-4 bg-[#F0FDF4] border border-emerald-100 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  {isKu ? 'لینکی پشکداربوون بۆ هاوڕێیان بنێرە:' : 'Share gift contribution link with friends:'}
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleQuickShare}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copied ? (isKu ? 'کۆپیکرا!' : 'Copied!') : (isKu ? 'بەشکردنی خێرا (Quick Share)' : 'Quick Share')}</span>
                  </button>
                </div>
              </div>

              {/* Contribute Section (If not fully funded) */}
              {!isFullyFunded ? (
                <form onSubmit={handleContribute} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      {isKu ? 'پشکداربوون لە کڕینی ئەم دیارییە:' : 'Contribute to this Gift:'}
                    </h4>
                  </div>

                  {/* Preset Quick Amounts */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                      {isKu ? 'بڕی پشک دیاری بکە:' : 'Select Contribution Amount:'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10000, 20000, 35000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setContribAmount(amt);
                            setCustomAmountStr('');
                          }}
                          className={`py-2 rounded-xl text-xs font-black font-mono transition-all border ${
                            contribAmount === amt && !customAmountStr
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {amt.toLocaleString()} IQD
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount */}
                    <div className="mt-2">
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        value={customAmountStr}
                        onChange={(e) => setCustomAmountStr(e.target.value)}
                        placeholder={isKu ? 'یان بڕێکی تر بنووسە بە IQD...' : 'Or enter custom amount (IQD)...'}
                        className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Contributor Name & Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {isKu ? 'ناوی بەشداربوو:' : 'Your Name:'}
                      </label>
                      <input
                        type="text"
                        required
                        value={contribName}
                        onChange={(e) => setContribName(e.target.value)}
                        placeholder={isKu ? 'ناوی خۆت' : 'Your name'}
                        className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {isKu ? 'شێوازی دانان:' : 'Payment Method:'}
                      </label>
                      <select
                        value={contribPaymentMethod}
                        onChange={(e: any) => setContribPaymentMethod(e.target.value)}
                        className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500"
                      >
                        <option value="fastpay">FastPay</option>
                        <option value="fib">FIB Direct</option>
                        <option value="zaincash">ZainCash</option>
                        <option value="cod_pledge">{isKu ? 'بەشداربوون لە کاتی گەیاندن (Pledge)' : 'Cash Pledge'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isKu ? 'پەیامی پیرۆزبایی بۆ وەرگر (ئارەزوومەندانە):' : 'Wish note / message for recipient (optional):'}
                    </label>
                    <textarea
                      rows={2}
                      value={contribMessage}
                      onChange={(e) => setContribMessage(e.target.value)}
                      placeholder={isKu ? 'پیرۆزت بێت ئازیزم، هیوای سەرکەوتن...' : 'Happy birthday! Wishing you the best...'}
                      className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingContrib}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isKu ? 'پشتڕاستکردنەوە و بەشداربوون' : 'Confirm Contribution'}</span>
                  </button>
                </form>
              ) : (
                /* FULLY FUNDED SUCCESS BANNER */
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                    <PartyPopper className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-emerald-900">
                    {isKu ? 'دیارییەکە بە تەواوی کۆکرایەوە و داواکارییەکە تۆمارکرا!' : 'Fully Funded! Order has been placed.'}
                  </h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    {isKu
                      ? `داواکارییەکە ڕاستەوخۆ دەگەیەنرێتە ناونیشانی ${pool.recipientName} لە ${pool.recipientCity}.`
                      : `The order will be delivered directly to ${pool.recipientName} at ${pool.recipientCity}.`}
                  </p>
                </div>
              )}

              {/* Contributors & Wish Messages List */}
              {pool.contributions && pool.contributions.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <MessageSquareHeart className="w-4 h-4 text-pink-500" />
                    {isKu ? 'پەیام و پشکی بەشداربووان:' : 'Wishes & Contributors:'}
                  </h4>

                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {pool.contributions.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                            {c.contributorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#1F2937]">{c.contributorName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {c.message && (
                              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2 mt-1 leading-relaxed">
                                “{c.message}”
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-black font-mono text-emerald-600 shrink-0">
                          +{c.amount.toLocaleString()} IQD
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
