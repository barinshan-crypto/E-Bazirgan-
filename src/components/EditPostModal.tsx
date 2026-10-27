import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Tag, 
  Layers, 
  Palette, 
  Phone, 
  MapPin, 
  FileText, 
  Save, 
  Bell, 
  Check, 
  Sparkles, 
  DollarSign, 
  ShoppingBag,
  PackageCheck,
  AlertCircle,
  Globe,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { MarketplaceItem, User, db, checkIsAdmin } from '../lib/db';
import { IRAQ_CITIES } from '../lib/constants';
import clsx from 'clsx';

interface EditPostModalProps {
  isOpen: boolean;
  item: MarketplaceItem | null;
  currentUser: User | null;
  onClose: () => void;
  onSuccess: (updatedItem: MarketplaceItem, notifiedCount: number) => void;
  theme?: string;
}

const CATEGORIES = [
  { id: 'fashion', ku: 'پۆشاک و مۆدە', ar: 'الأزياء والموضة', en: 'Fashion & Style' },
  { id: 'electronics', ku: 'ئەلیکترۆنی و مۆبایل', ar: 'الإلكترونيات والموبايل', en: 'Electronics & Mobile' },
  { id: 'beauty', ku: 'جوانکاری و بۆن', ar: 'الجمال والعطور', en: 'Beauty & Fragrance' },
  { id: 'home', ku: 'ماڵ و کەلوپەل', ar: 'المنزل والأثاث', en: 'Home & Living' },
  { id: 'perfumes', ku: 'عەتر و بۆن', ar: 'العطور', en: 'Perfumes' },
  { id: 'watches', ku: 'کاتژمێر و ئێکسسوارات', ar: 'الساعات والإكسسوارات', en: 'Watches & Accessories' },
  { id: 'shoes', ku: 'پێڵاو و جانتا', ar: 'الأحذية والحقائب', en: 'Shoes & Bags' },
  { id: 'kids', ku: 'منداڵان و یاری', ar: 'الأطفال والألعاب', en: 'Kids & Toys' },
  { id: 'sports', ku: 'وەرزش و تەندروستی', ar: 'الرياضة والصحة', en: 'Sports & Fitness' },
  { id: 'general', ku: 'گشتی و هەمەجۆر', ar: 'عام ومتنوع', en: 'General & Misc' }
];

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  item,
  currentUser,
  onClose,
  onSuccess,
  theme = 'dark'
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [title, setTitle] = useState('');
  const [priceIQD, setPriceIQD] = useState('');
  const [resalePriceIQD, setResalePriceIQD] = useState('');
  const [showResalePriceToPublic, setShowResalePriceToPublic] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock'>('in_stock');
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setPriceIQD(String(Math.round((item.price || 0) * 1500)));
      setResalePriceIQD(item.resalePrice ? String(Math.round(item.resalePrice * 1500)) : '');
      setShowResalePriceToPublic(item.showResalePriceToPublic === true);
      setIsPublic(item.isPublic !== false);
      setCategory(item.category || 'general');
      setDescription(item.description || item.weight || '');
      setPhone(item.sellerPhone || currentUser?.phone || '');
      setLocation(item.location || currentUser?.city || 'Erbil');
      setSizesInput(item.sizes ? item.sizes.join(', ') : '');
      setColorsInput(item.colors ? item.colors.join(', ') : '');
      setStockStatus(item.stockStatus || 'in_stock');
      setErrorMsg(null);
    }
  }, [item, currentUser]);

  if (!isOpen || !item) return null;

  const originalPriceIQD = Math.round((item.price || 0) * 1500);
  const enteredPriceIQD = Number(priceIQD) || 0;
  const isPriceChanging = enteredPriceIQD > 0 && enteredPriceIQD !== originalPriceIQD;
  const watcherCount = item.saves?.length || 0;

  const isAdmin = checkIsAdmin(currentUser);
  const isOwner = Boolean(currentUser && (item.userId === currentUser.id || item.sellerId === currentUser.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      setErrorMsg(isKurdish ? 'تەنها خاوەنی ئەم پۆستە دەتوانێت دەستکاری بکات.' : 'Only the post owner can edit this item.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg(isKurdish ? 'تکایە ناونیشانی کاڵا بنووسە' : 'Please enter item title');
      return;
    }

    if (!enteredPriceIQD || enteredPriceIQD <= 0) {
      setErrorMsg(isKurdish ? 'تکایە نرخێکی دروست بە دینار بنووسە' : 'Please enter a valid price in IQD');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const usdPrice = enteredPriceIQD / 1500;
      const parsedResalePrice = Number(resalePriceIQD) > 0 ? Number(resalePriceIQD) / 1500 : undefined;

      const parsedSizes = sizesInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const parsedColors = colorsInput
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const updates: Partial<MarketplaceItem> = {
        title: title.trim(),
        price: usdPrice,
        resalePrice: parsedResalePrice,
        showResalePriceToPublic: Boolean(parsedResalePrice && showResalePriceToPublic),
        isPublic,
        category,
        description: description.trim(),
        weight: description.trim(), // fallback field
        sellerPhone: phone.trim() || undefined,
        location: location || undefined,
        sizes: parsedSizes.length > 0 ? parsedSizes : undefined,
        colors: parsedColors.length > 0 ? parsedColors : undefined,
        stockStatus
      };

      const result = await db.updateMarketplaceItem(
        item.id,
        updates,
        currentUser?.id || item.userId,
        currentUser?.name || item.userName
      );

      setIsSaving(false);

      if (result.success && result.item) {
        onSuccess(result.item, result.notifiedCount);
        onClose();
      } else {
        setErrorMsg(isKurdish ? 'هەڵەیەک ڕوویدا لە نوێکردنەوە' : 'Failed to update item');
      }
    } catch (err: any) {
      console.error("Error editing item:", err);
      setIsSaving(false);
      setErrorMsg(err?.message || (isKurdish ? 'هەڵەیەک ڕوویدا' : 'An error occurred'));
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="edit_post_modal_backdrop"
        className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="edit_post_modal_container"
          initial={{ scale: 0.93, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto",
            theme === 'dark' 
              ? "bg-slate-900 border-white/10 text-white" 
              : "bg-white border-slate-200 text-slate-900"
          )}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {isKurdish ? 'دەستکاری پۆست و نوێکردنەوەی نرخ' : isArabic ? 'تعديل المنشور وتحديث السعر' : 'Edit Post & Update Price'}
                </h3>
                <p className="text-xs text-slate-400">
                  {item.title}
                </p>
              </div>
            </div>

            <button
              id="edit_post_modal_close_btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
            
            {/* Watchlist Alerts Highlight Box */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
              <Bell className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-indigo-300">
                  {isKurdish ? 'سیستەمی ئاگاداری ڕاستەوخۆ (Watchlist Alerts)' : 'Real-time Watchlist Alerts'}
                </p>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {isKurdish
                    ? `کاتێک نرخەکە دەگۆڕیت، سەرجەم ${watcherCount} چاودێرانی ئەم کاڵایە لە بەشی ئاگادارییەکان ئاگادار دەکرێنەوە.`
                    : isArabic
                    ? `عند تحديث السعر، سيتم إرسال إشعار تلقائي لجميع المتابعين (${watcherCount} مستخدم) في قائمة الإشعارات.`
                    : `Changing the price will automatically send live notifications to all ${watcherCount} watcher(s)!`}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isKurdish ? 'ناونیشانی کاڵا' : isArabic ? 'عنوان المنتج' : 'Product Title'} *</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={isKurdish ? 'ناوی کاڵاکە...' : 'Product title...'}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Price Row (Main Price & Resale Price) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Selling Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{isKurdish ? 'نرخی فرۆشتن (دیناری عێراقی)' : isArabic ? 'سعر البيع (دينار عراقي)' : 'Selling Price (IQD)'} *</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={priceIQD}
                    onChange={(e) => setPriceIQD(e.target.value)}
                    required
                    min="1"
                    placeholder="25,000"
                    className="w-full ps-4 pe-14 py-3 bg-black/40 border-2 border-emerald-500/40 focus:border-emerald-400 rounded-2xl text-sm sm:text-base font-black text-emerald-300 focus:outline-none transition-all font-mono"
                  />
                  <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500/80 pointer-events-none select-none">
                    IQD
                  </span>
                </div>
                {isPriceChanging && (
                  <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {isKurdish 
                        ? `نرخ دەگۆڕدرێت لە ${originalPriceIQD.toLocaleString()} بۆ ${enteredPriceIQD.toLocaleString()} دینار 🔔`
                        : `Price changing from ${originalPriceIQD.toLocaleString()} to ${enteredPriceIQD.toLocaleString()} IQD 🔔`}
                    </span>
                  </p>
                )}
              </div>

              {/* Resale Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isKurdish ? 'نرخی داشکاندن / فرۆشتنەوە (ئیختیاری)' : isArabic ? 'سعر التخفيض / إعادة البيع' : 'Discount / Resale Price (Optional)'}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={resalePriceIQD}
                    onChange={(e) => setResalePriceIQD(e.target.value)}
                    placeholder="30,000"
                    className="w-full ps-4 pe-14 py-3 bg-black/30 border border-white/10 focus:border-teal-400 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none transition-all font-mono"
                  />
                  <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none select-none">
                    IQD
                  </span>
                </div>
              </div>
            </div>

            {/* Resale Price Visibility Toggle (Private to owner vs Public) */}
            {Number(resalePriceIQD) > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-purple-950/40 border border-purple-500/20 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className={clsx(
                      "p-2 rounded-xl mt-0.5 shrink-0",
                      showResalePriceToPublic ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    )}>
                      {showResalePriceToPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-white">
                          {isKurdish 
                            ? (showResalePriceToPublic ? 'نرخی فرۆشتنەوە: گشتی (Public)' : 'نرخی فرۆشتنەوە: تایبەت بە خۆت (Private)')
                            : isArabic
                            ? (showResalePriceToPublic ? 'سعر إعادة البيع: علني (Public)' : 'سعر إعادة البيع: خاص بك (Private)')
                            : (showResalePriceToPublic ? 'Resale Price: Public (All Viewers)' : 'Resale Price: Private (Owner Only)')
                          }
                        </p>
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          showResalePriceToPublic ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        )}>
                          {showResalePriceToPublic ? (isKurdish ? 'گشتی' : 'Public') : (isKurdish ? 'تایبەت' : 'Private')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {showResalePriceToPublic
                          ? (isKurdish 
                              ? 'سەرجەم کڕیاران و سەردانکەران لە بازاڕدا دەتوانن نرخی فرۆشتنەوە و قازانجەکە ببینن.' 
                              : isArabic
                              ? 'يمكن لجميع الزبائن في السوق رؤية سعر إعادة البيع وهامش الربح.'
                              : 'All shoppers and visitors in the marketplace can see the resale price and profit margin.')
                          : (isKurdish 
                              ? 'تەنها خۆت وەک خاوەنی پۆست لە هەژماری خۆتدا دەتوانیت نرخی فرۆشتنەوە ببینیت (لە بازاڕی گشتیدا شاراوەیە).' 
                              : isArabic
                              ? 'أنت فقط بصفتك المالك يمكنك رؤية سعر إعادة البيع (مخفي عن الزبائن في السوق العام).'
                              : 'Hidden from public shoppers; only revealed to you as the post owner in your profile and listings.')
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowResalePriceToPublic(!showResalePriceToPublic)}
                    className={clsx(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      showResalePriceToPublic ? 'bg-emerald-500' : 'bg-slate-700'
                    )}
                    role="switch"
                    aria-checked={showResalePriceToPublic}
                  >
                    <span
                      className={clsx(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                        showResalePriceToPublic ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* General Post Visibility Toggle */}
            <div className="p-3 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isPublic ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                <div>
                  <p className="text-xs font-bold text-white">
                    {isPublic 
                      ? (isKurdish ? 'پۆستی چالاک لە بازاڕ (Active Listing)' : 'Active Marketplace Listing')
                      : (isKurdish ? 'شاراوە / ڕەشنووس (Draft / Hidden)' : 'Draft / Hidden Listing')
                    }
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isPublic
                      ? (isKurdish ? 'پۆستەکە لە بازاڕ بۆ هەموان بەردەست دەبێت.' : 'Listing is visible in the public marketplace.')
                      : (isKurdish ? 'پۆستەکە لە بازاڕدا دەشاردرێتەوە و تەنیا لە پرۆفایلی خۆتدا دەمێنێتەوە.' : 'Listing is hidden from marketplace feeds.')
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={clsx(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  isPublic ? 'bg-indigo-600' : 'bg-slate-700'
                )}
                role="switch"
                aria-checked={isPublic}
              >
                <span
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Category & Location Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKurdish ? 'پۆلێن' : isArabic ? 'التصنيف' : 'Category'}</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                      {isKurdish ? cat.ku : isArabic ? cat.ar : cat.en}
                    </option>
                  ))}
                </select>
              </div>

              {/* City / Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isKurdish ? 'شار / شوێن' : isArabic ? 'المدينة' : 'City'}</span>
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {IRAQ_CITIES.map(c => (
                    <option key={c.id} value={c.en} className="bg-slate-900 text-white">
                      {isKurdish ? c.ku : isArabic ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKurdish ? 'دۆخی بەردەستبوون' : isArabic ? 'حالة التوفر' : 'Stock Status'}</span>
              </label>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as any)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="in_stock" className="bg-slate-900 text-emerald-400">
                  {isKurdish ? '✅ بەردەستە (In Stock)' : '✅ متوفر (In Stock)'}
                </option>
                <option value="low_stock" className="bg-slate-900 text-amber-400">
                  {isKurdish ? '⚠️ بڕێکی کەم ماوە (Low Stock)' : '⚠️ كمية محدودة (Low Stock)'}
                </option>
                <option value="out_of_stock" className="bg-slate-900 text-rose-400">
                  {isKurdish ? '❌ تەواو بووە (Out of Stock)' : '❌ غير متوفر (Out of Stock)'}
                </option>
              </select>
            </div>

            {/* Sizes & Colors (Comma separated) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isKurdish ? 'قەبارەکان (بە کۆما جیاکراوە)' : 'Sizes (comma separated)'}</span>
                </label>
                <input
                  type="text"
                  value={sizesInput}
                  onChange={(e) => setSizesInput(e.target.value)}
                  placeholder="S, M, L, XL, 42, 43"
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-pink-400" />
                  <span>{isKurdish ? 'ڕەنگەکان (بە کۆما جیاکراوە)' : 'Colors (comma separated)'}</span>
                </label>
                <input
                  type="text"
                  value={colorsInput}
                  onChange={(e) => setColorsInput(e.target.value)}
                  placeholder="Black, White, Red, Blue"
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-pink-500 transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isKurdish ? 'وەسف و زانیاری زیاتر' : isArabic ? 'الوصف والتفاصيل' : 'Description & Details'}</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={isKurdish ? 'زانیاری ورد لەسەر کاڵاکە بنووسە...' : 'Write detailed product information...'}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-all custom-scrollbar resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-3.5 rounded-2xl border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/5 transition-all cursor-pointer"
              >
                {isKurdish ? 'پاشگەزبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                id="edit_post_submit_btn"
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving 
                    ? (isKurdish ? 'پاشەکەوت دەکرێت...' : 'Saving...') 
                    : (isKurdish ? 'پاشەکەوتکردن و نوێکردنەوە' : isArabic ? 'حفظ وتحديث' : 'Save & Update')}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
