import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  Share2,
  Copy,
  Check,
  Plus,
  Minus,
  Trash2,
  Truck,
  Users,
  MapPin,
  Phone,
  User,
  CreditCard,
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  FileText,
  Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, SharedCart, SharedCartItem, User as UserModel } from '../lib/db';
import { safeCopyToClipboard } from '../lib/clipboard';
import GroupCheckoutSummary from './GroupCheckoutSummary';

interface SharedCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartId?: string | null;
  user: UserModel | null;
  onRequireAuth: () => void;
  onExploreMore?: () => void;
  onItemsImportedToCart?: (count: number) => void;
}

export default function SharedCartModal({
  isOpen,
  onClose,
  cartId,
  user,
  onRequireAuth,
  onExploreMore,
  onItemsImportedToCart
}: SharedCartModalProps) {
  const { i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const isAr = i18n.language === 'ar';

  const [activeCartId, setActiveCartId] = useState<string | null>(cartId || null);
  const [cart, setCart] = useState<SharedCart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedProductList, setCopiedProductList] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isCopyingAllToBasket, setIsCopyingAllToBasket] = useState<boolean>(false);
  const [addedAllSuccess, setAddedAllSuccess] = useState<boolean>(false);
  const [singleAddedMap, setSingleAddedMap] = useState<Record<string, boolean>>({});

  // Delivery destination state
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Erbil');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  // Checkout modal
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [payerName, setPayerName] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash_on_delivery');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (cartId) {
      setActiveCartId(cartId);
    }
  }, [cartId]);

  // Subscribe to shared cart updates
  useEffect(() => {
    if (!isOpen) return;

    if (activeCartId) {
      setLoading(true);
      const unsub = db.onSharedCartChange(activeCartId, (data) => {
        setCart(data);
        if (data) {
          setAddress(data.deliveryAddress || '');
          setCity(data.deliveryCity || 'Erbil');
          setRecipientName(data.recipientName || '');
          setRecipientPhone(data.recipientPhone || '');
          setDeliveryNotes(data.deliveryNotes || '');
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
      // Auto-create or fetch active local shared cart
      handleCreateNewCart();
    }
  }, [isOpen, activeCartId]);

  useEffect(() => {
    if (user) {
      setPayerName(user.name || '');
      setPayerPhone(user.phone || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleCreateNewCart = async () => {
    setLoading(true);
    try {
      const creator = {
        id: user?.id || 'guest',
        name: user?.name || (isKu ? 'کڕیار' : 'Shopper'),
        phone: user?.phone || ''
      };
      const newCart = await db.createSharedCart(creator, [], {
        address: user?.address || '',
        city: user?.city || 'Erbil',
        recipientName: user?.name || '',
        recipientPhone: user?.phone || ''
      });
      setActiveCartId(newCart.id);
      setCart(newCart);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const shareableUrl = activeCartId ? `${window.location.origin}/?sharedCart=${activeCartId}` : '';

  const handleQuickShare = async () => {
    if (!shareableUrl) return;
    const shareTitle = isKu ? '🛒 سەبەتەی هاوبەش - پەیڤ مارکێت' : isAr ? '🛒 السلة المشتركة - بايف ماركت' : '🛒 Shared Cart - PAYV Marketplace';
    const shareText = isKu
      ? `🛒 سەبەتەی هاوبەش: دەتوانیت بەم لینکە کاڵاکانت زیاد بکەیتە ئەم سەبەتەیەوە تا بەیەکەوە و بە یەک ناونیشان داوای بکەین:\n${shareableUrl}`
      : isAr
      ? `🛒 السلة المشتركة: يمكنك إضافة منتجاتك إلى هذه السلة المشتركة لنطلبها معاً إلى عنوان موحد:\n${shareableUrl}`
      : `🛒 Shared Cart: You can add your items to our shared cart so we order together to a single address:\n${shareableUrl}`;

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

  const handleCopyLinkOnly = async () => {
    if (!shareableUrl) return;
    const ok = await safeCopyToClipboard(shareableUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyProductList = async () => {
    if (!items || items.length === 0) return;
    const header = isKu 
      ? '🛒 لیستی کاڵاکانی سەبەتەی هاوبەش - پەیڤ مارکێت' 
      : isAr 
      ? '🛒 قائمة منتجات السلة المشتركة - بايف ماركت' 
      : '🛒 Shared Cart Product List - PAYV Marketplace';
    
    const lines = items.map((item, idx) => {
      const parts = [
        item.size ? (isKu ? `قیاس: ${item.size}` : `Size: ${item.size}`) : '',
        item.color ? (isKu ? `ڕەنگ: ${item.color}` : `Color: ${item.color}`) : '',
        `${isKu ? 'دانە:' : 'Qty:'} ${item.quantity || 1}`,
        `${Math.round((item.price || 0) * 1500 * (item.quantity || 1)).toLocaleString()} IQD`
      ].filter(Boolean).join(' | ');
      return `${idx + 1}. ${item.title}\n   (${parts})`;
    });

    const totalText = isKu 
      ? `کۆی گشتی کاڵاکان: ${itemsSubtotalIQD.toLocaleString()} دینار` 
      : isAr 
      ? `المجموع الفرعي: ${itemsSubtotalIQD.toLocaleString()} دينار` 
      : `Subtotal: ${itemsSubtotalIQD.toLocaleString()} IQD`;
    
    const linkLine = shareableUrl 
      ? `\n${isKu ? 'لینکی سەبەتە بۆ بینین و کۆپیکردن:' : 'Shared Cart Link to View & Copy:'}\n${shareableUrl}` 
      : '';

    const fullText = `${header}\n\n${lines.join('\n\n')}\n\n━━━━━━━━━━━━━━━\n${totalText}${linkLine}`;

    const ok = await safeCopyToClipboard(fullText);
    if (ok) {
      setCopiedProductList(true);
      setTimeout(() => setCopiedProductList(false), 2500);
    }
  };

  const handleCopyAllToMyBasket = async () => {
    if (!items || items.length === 0) return;
    setIsCopyingAllToBasket(true);
    try {
      const itemsToImport = items.map(item => ({
        itemId: item.itemId || item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity || 1,
        size: item.size || '',
        color: item.color || '',
        imageUrl: item.imageUrl || '',
        sellerName: item.addedByUserName || 'Shared Cart'
      }));

      await db.addMultipleToBasket(user?.id || 'guest', itemsToImport);
      setAddedAllSuccess(true);
      if (onItemsImportedToCart) {
        onItemsImportedToCart(items.length);
      }
      setTimeout(() => setAddedAllSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to copy items to user basket:", err);
    } finally {
      setIsCopyingAllToBasket(false);
    }
  };

  const handleCopySingleItemToBasket = async (item: SharedCartItem) => {
    try {
      await db.addMultipleToBasket(user?.id || 'guest', [{
        itemId: item.itemId || item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity || 1,
        size: item.size || '',
        color: item.color || '',
        imageUrl: item.imageUrl || '',
        sellerName: item.addedByUserName || 'Shared Cart'
      }]);
      setSingleAddedMap(prev => ({ ...prev, [item.id]: true }));
      if (onItemsImportedToCart) {
        onItemsImportedToCart(1);
      }
      setTimeout(() => {
        setSingleAddedMap(prev => ({ ...prev, [item.id]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to add single item to basket:", err);
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareableUrl) return;
    const text = isKu
      ? `سڵاو! ئەمەش لیستی ئەو کاڵایانەی کە لە پەیڤ مارکێت هەڵبژێردراوە. دەتوانیت لەم لینکەوە سەیری بکەیت و کۆپی بکەیتە ناو سەبەتەکەت:\n${shareableUrl}`
      : isAr
      ? `مرحباً! هذه قائمة المنتجات المختارة من بايف ماركت، يمكنك مشاهدتها ونسخها إلى سلتك عبر الرابط:\n${shareableUrl}`
      : `Hi! Here is the shared product list from PAYV Marketplace. You can view and copy it to your cart here:\n${shareableUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (!activeCartId) return;
    await db.updateSharedCartItemQuantity(activeCartId, itemId, newQty);
  };

  const handleUpdateDeliveryAddress = async (data: {
    address: string;
    city: string;
    recipientName: string;
    recipientPhone: string;
    deliveryNotes?: string;
    addressConfirmedByOwner?: boolean;
  }) => {
    if (!activeCartId) return;
    setAddress(data.address);
    setCity(data.city);
    setRecipientName(data.recipientName);
    setRecipientPhone(data.recipientPhone);
    if (data.deliveryNotes !== undefined) setDeliveryNotes(data.deliveryNotes);
    
    await db.updateSharedCartDelivery(activeCartId, data);
  };

  const handleFinalCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCartId) return;
    if (!address.trim() || !recipientName.trim() || !recipientPhone.trim()) {
      alert(isKu ? 'تکایە ناونیشانی یەکگرتووی گەیاندن پڕبکەرەوە پێش پارەدان' : 'Please fill unified delivery address first');
      return;
    }

    setCheckoutLoading(true);
    try {
      // Ensure address is synced
      await db.updateSharedCartDelivery(activeCartId, {
        address: address.trim(),
        city,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        deliveryNotes: deliveryNotes.trim(),
        addressConfirmedByOwner: true
      });

      const res = await db.checkoutSharedCart(
        activeCartId,
        {
          id: user?.id || 'guest_payer',
          name: payerName.trim() || recipientName.trim(),
          phone: payerPhone.trim() || recipientPhone.trim()
        },
        paymentMethod
      );

      if (res.success) {
        setOrderSuccessId(res.orderId);
        setIsCheckingOut(false);
      }
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const items = cart?.items || [];
  const itemsSubtotalUSD = items.reduce((sum, i) => sum + (Number(i.price || 0) * (i.quantity || 1)), 0);
  const itemsSubtotalIQD = Math.round(itemsSubtotalUSD * 1500);
  const shippingFeeIQD = items.length > 0 ? 4000 : 0;
  const grandTotalIQD = itemsSubtotalIQD + shippingFeeIQD;

  // Group items by contributor count
  const contributorNames = Array.from(new Set(items.map(i => i.addedByUserName || 'هاوبەشێک')));

  return (
    <div className="fixed inset-0 !z-[9999999] bg-slate-950/80 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-3xl bg-[#F8FAFC] rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto h-full sm:h-auto min-h-screen sm:min-h-0 max-h-none sm:max-h-[92vh] flex flex-col text-[#1F2937]"
      >
        {/* Header - Full screen mobile friendly top bar */}
        <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#1F2937]">
                  {isKu ? 'سەبەتەی هاوبەش (Shared Cart)' : isAr ? 'السلة المشتركة' : 'Shared Cart Shopping'}
                </h2>
                <span className="text-[10px] sm:text-xs bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{isKu ? 'هاوکات / Live Sync' : 'Live Sync'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                {isKu ? 'کڕینی بەکۆمەڵ بۆ یەک ناونیشان بە پشکی حیسابکراو بۆ هەر بەشدارێک' : 'Collaborative cart with unified delivery & participant cost breakdown'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-slate-200 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {orderSuccessId ? (
            /* Order Placed Success View */
            <div className="py-8 text-center space-y-3 bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-[#1F2937]">
                {isKu ? 'داواکاری سەبەتەی هاوبەش بە سەرکەوتوویی تۆمارکرا!' : 'Shared Cart Order Successfully Placed!'}
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                {isKu ? 'کۆدی داواکاری:' : 'Order ID:'} <strong>{orderSuccessId}</strong>
              </p>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 leading-relaxed max-w-md mx-auto text-right">
                {isKu
                  ? `داواکارییەکە لە یەک پاکێجدا بە کۆی (${grandTotalIQD.toLocaleString()} IQD) ئاراستەی ناونیشانی ${recipientName || 'وەرگر'} لە ${city} دەکرێت.`
                  : `Order placed for unified delivery to ${recipientName || 'Recipient'} in ${city}.`}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {isKu ? 'داخستن' : 'Close'}
              </button>
            </div>
          ) : (
            <>
              {/* Dynamic Link & Quick Share Box */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    {isKu ? 'لینکی سەبەتەی هاوبەش:' : isAr ? 'رابط السلة المشتركة:' : 'Shared Cart Public Link:'}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 font-mono bg-white/80 px-2 py-0.5 rounded-lg border border-indigo-100">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    {contributorNames.length} {isKu ? 'بەشدار' : 'Participants'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={shareableUrl}
                    className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] font-mono select-all focus:outline-none shadow-2xs text-left"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyLinkOnly}
                      className="flex-1 sm:flex-initial py-2 px-3 bg-white hover:bg-slate-50 border border-indigo-200 active:scale-95 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title={isKu ? 'کۆپیکردنی لینک' : 'Copy link'}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? (isKu ? 'کۆپیکرا!' : 'Copied!') : (isKu ? 'کۆپی' : 'Copy Link')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickShare}
                      className="flex-1 sm:flex-initial py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copied ? (isKu ? 'نێردرا!' : 'Shared!') : (isKu ? 'بەشکردن' : 'Share')}</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Viewing & Copy Actions: Copy Product List (Text) & Copy to My Cart */}
                <div className="pt-1 border-t border-indigo-100/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Button 1: Copy Product List (Formatted Text) */}
                  <button
                    type="button"
                    onClick={handleCopyProductList}
                    disabled={items.length === 0}
                    className="py-2 px-3 rounded-xl bg-white hover:bg-indigo-50/70 border border-indigo-200/80 text-indigo-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                    title={isKu ? 'کۆپیکردنی ناونیشان و نرخی هەموو کاڵاکان وەک دەق' : 'Copy formatted product list as text'}
                  >
                    {copiedProductList ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-black">{isKu ? 'لیست کۆپیکرا!' : isAr ? 'تم نسخ القائمة!' : 'List Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isKu ? 'کۆپیکردنی لیستی کاڵاکان' : isAr ? 'نسخ قائمة المنتجات' : 'Copy Product List'}</span>
                      </>
                    )}
                  </button>

                  {/* Button 2: Copy to My Cart (Add All items to user's basket) */}
                  <button
                    type="button"
                    onClick={handleCopyAllToMyBasket}
                    disabled={items.length === 0 || isCopyingAllToBasket}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                    title={isKu ? 'زیادکردنی هەموو ئەم کاڵایانە بۆ ناو سەبەتەی خۆم' : 'Copy all items to my own shopping cart'}
                  >
                    {addedAllSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span className="font-black">{isKu ? 'کۆپیکرا بۆ سەبەتەکەت!' : isAr ? 'تمت الإضافة لسلتك!' : 'Added to My Cart!'}</span>
                      </>
                    ) : isCopyingAllToBasket ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>{isKu ? 'کۆپیکردن بۆ ناو سەبەتەکەم' : isAr ? 'نسخ إلى سلتي' : 'Copy to My Cart'}</span>
                      </>
                    )}
                  </button>

                  {/* Button 3: WhatsApp Share */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    disabled={items.length === 0}
                    className="py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isKu ? 'ناردن بە واتسئەپ' : isAr ? 'إرسال عبر واتساب' : 'WhatsApp'}</span>
                  </button>
                </div>
              </div>

              {/* Items Management & Quantity Editor */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-indigo-600" />
                      <span>{isKu ? `کاڵاکانی ناو سەبەتە (${items.length})` : `Cart Items (${items.length})`}</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      • {itemsSubtotalIQD.toLocaleString()} IQD
                    </span>
                  </div>

                  {onExploreMore && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onExploreMore();
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isKu ? 'زیادکردنی کاڵای تر' : 'Add more items'}</span>
                    </button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-500 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl space-y-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-400">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-700">
                        {isKu ? 'هێشتا هیچ کاڵایەک زیاد نەکراوە بۆ ئەم سەبەتەیە' : isAr ? 'لم تتم إضافة أي عناصر إلى هذه السلة بعد' : 'No items added to this shared cart yet'}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {isKu 
                          ? 'دەتوانیت کاڵا لە مارکێت زیاد بکەیت، یان لە سەبەتەی سەرەکی کاڵاکانت دەستنیشان بکەیت و دوگمەی (هاوبەشکردنی سەبەتە) دابگریت تا بەیەکەوە لێرە دەربکەون.' 
                          : isAr
                          ? 'يمكنك إضافة منتجات من السوق، أو تحديد المنتجات في سلتك الرئيسية والضغط على (مشاركة السلة) لتظهر هنا معاً.'
                          : 'You can add items from the marketplace, or select items in your main cart and tap "Share Cart" to bundle them here.'}
                      </p>
                    </div>
                    {onExploreMore && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onExploreMore();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isKu ? 'گەڕان لە کاڵاکانی مارکێت' : isAr ? 'تصفح منتجات المتجر' : 'Browse Marketplace'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 bg-slate-50 shrink-0 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-[#1F2937] truncate">{item.title}</h5>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono font-bold text-indigo-600">
                                {(Math.round(item.price * 1500)).toLocaleString()} IQD
                              </span>
                              {item.size && <span>• {item.size}</span>}
                              {item.color && <span>• {item.color}</span>}
                            </div>
                            <span className="inline-block text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded mt-0.5 border border-indigo-100">
                              {isKu ? 'زیادکراوە لەلایەن:' : 'Added by:'} {item.addedByUserName}
                            </span>
                          </div>
                        </div>

                        {/* Controls: Add individual item to user's personal cart & Quantity controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Quick Add Single Item to My Cart */}
                          <button
                            type="button"
                            onClick={() => handleCopySingleItemToBasket(item)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black border border-indigo-200 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
                            title={isKu ? 'زیادکردن بۆ سەبەتەی خۆم' : 'Add to my own cart'}
                          >
                            {singleAddedMap[item.id] ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">{isKu ? 'زیادکرا!' : 'Added!'}</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3 text-indigo-600" />
                                <span>{isKu ? '+ سەبەتەم' : '+ Cart'}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-black w-5 text-center text-slate-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, 0)}
                            className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer flex items-center justify-center border border-rose-100"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GroupCheckoutSummary component renders here */}
              <GroupCheckoutSummary
                activeSharedCartItems={items}
                cart={cart}
                currentUser={user}
                onUpdateDeliveryAddress={handleUpdateDeliveryAddress}
                onProceedToCheckout={() => setIsCheckingOut(true)}
                onRequireAuth={onRequireAuth}
                isCheckingOut={isCheckingOut}
              />

              {/* Single Checkout Form Modal / Slide-down */}
              {isCheckingOut && items.length > 0 && (
                <form
                  onSubmit={handleFinalCheckout}
                  className="p-5 bg-white border-2 border-emerald-500 rounded-3xl space-y-4 shadow-xl"
                  id="final-group-checkout-form"
                >
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <h5 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>{isKu ? 'پارەدانی یەکجارەکی لەلایەن یەک کەسەوە (Single Payer Checkout)' : 'Single Payer Group Checkout'}</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {isKu ? 'داخستن' : 'Cancel'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isKu ? 'ناوی تەواوی پارەدەر:' : 'Payer Name:'}
                      </label>
                      <input
                        type="text"
                        required
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {isKu ? 'ژمارەی تەلەفۆنی پارەدەر:' : 'Payer Phone:'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(e.target.value)}
                        placeholder="0750 XXX XXXX"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isKu ? 'شێوازی پارەدان:' : 'Payment Method:'}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                    >
                      <option value="cash_on_delivery">{isKu ? 'پارەدان لەکاتی گەیاندن (Cash on Delivery)' : 'Cash on Delivery'}</option>
                      <option value="fastpay">FastPay Online (IQD)</option>
                      <option value="fib">FIB Direct Payment</option>
                      <option value="zaincash">ZainCash</option>
                    </select>
                  </div>

                  {/* Summary row */}
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs flex items-center justify-between font-bold text-emerald-950">
                    <span>{isKu ? 'بڕی تەواوی داواکاری بە کرێی گەیاندنەوە:' : 'Total Amount to Pay:'}</span>
                    <span className="font-mono text-emerald-700 text-sm font-black">{grandTotalIQD.toLocaleString()} IQD</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {isKu ? 'پاشگەزبوونەوە' : 'Back'}
                    </button>
                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {checkoutLoading ? (
                        <span>{isKu ? 'جێبەجێ دەکرێت...' : 'Processing...'}</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{isKu ? 'تۆمارکردنی داواکاری یەکگرتوو' : 'Place Consolidated Order'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

