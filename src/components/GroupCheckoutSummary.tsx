import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  User,
  ShoppingBag,
  MapPin,
  Phone,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Receipt,
  Sparkles,
  CreditCard,
  Building2,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SharedCart, SharedCartItem, User as UserModel } from '../lib/db';
import { safeCopyToClipboard } from '../lib/clipboard';

export interface ParticipantGroup {
  userId: string;
  userName: string;
  items: SharedCartItem[];
  itemCount: number;
  subtotalUSD: number;
  subtotalIQD: number;
  percentage: number;
  isOwner: boolean;
  isCurrentUser: boolean;
}

export interface GroupCheckoutSummaryProps {
  activeSharedCartItems: SharedCartItem[];
  cart: SharedCart | null;
  currentUser: UserModel | null;
  onUpdateDeliveryAddress?: (data: {
    address: string;
    city: string;
    recipientName: string;
    recipientPhone: string;
    deliveryNotes?: string;
    addressConfirmedByOwner?: boolean;
  }) => Promise<void> | void;
  onProceedToCheckout?: () => void;
  onRequireAuth?: () => void;
  isCheckingOut?: boolean;
}

export default function GroupCheckoutSummary({
  activeSharedCartItems,
  cart,
  currentUser,
  onUpdateDeliveryAddress,
  onProceedToCheckout,
  onRequireAuth,
  isCheckingOut = false
}: GroupCheckoutSummaryProps) {
  const { i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const isAr = i18n.language === 'ar';

  const isOwner = Boolean(
    (currentUser?.id && cart?.creatorId && currentUser.id === cart.creatorId) ||
    (!cart?.creatorId && currentUser)
  );

  // Address form states
  const [recipientName, setRecipientName] = useState<string>(cart?.recipientName || currentUser?.name || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(cart?.recipientPhone || currentUser?.phone || '');
  const [deliveryCity, setDeliveryCity] = useState<string>(cart?.deliveryCity || currentUser?.city || 'Erbil');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(cart?.deliveryAddress || currentUser?.address || '');
  const [deliveryNotes, setDeliveryNotes] = useState<string>(cart?.deliveryNotes || '');
  
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(!cart?.addressConfirmedByOwner && isOwner);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);
  const [addressSavedSuccess, setAddressSavedSuccess] = useState<boolean>(false);
  const [expandedParticipants, setExpandedParticipants] = useState<Record<string, boolean>>({});
  const [copiedSplit, setCopiedSplit] = useState<boolean>(false);

  // Sync state when cart prop updates
  useEffect(() => {
    if (cart) {
      if (cart.recipientName !== undefined) setRecipientName(cart.recipientName);
      if (cart.recipientPhone !== undefined) setRecipientPhone(cart.recipientPhone);
      if (cart.deliveryCity !== undefined) setDeliveryCity(cart.deliveryCity || 'Erbil');
      if (cart.deliveryAddress !== undefined) setDeliveryAddress(cart.deliveryAddress);
      if (cart.deliveryNotes !== undefined) setDeliveryNotes(cart.deliveryNotes || '');
      if (cart.addressConfirmedByOwner) {
        setIsEditingAddress(false);
      }
    }
  }, [cart]);

  // Financial Calculations
  const totalItemsUSD = activeSharedCartItems.reduce(
    (sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)),
    0
  );
  const totalItemsIQD = Math.round(totalItemsUSD * 1500);
  const shippingFeeIQD = activeSharedCartItems.length > 0 ? 4000 : 0;
  const grandTotalIQD = totalItemsIQD + shippingFeeIQD;

  // Group items by addedByUserId
  const participantGroupsMap: Record<string, ParticipantGroup> = {};

  activeSharedCartItems.forEach((item) => {
    const rawUserId = item.addedByUserId || (item.addedByUserName ? `user_${item.addedByUserName}` : 'guest_participant');
    const uName = item.addedByUserName || (isKu ? 'هاوبەشێک' : isAr ? 'مشارك' : 'Participant');

    if (!participantGroupsMap[rawUserId]) {
      participantGroupsMap[rawUserId] = {
        userId: rawUserId,
        userName: uName,
        items: [],
        itemCount: 0,
        subtotalUSD: 0,
        subtotalIQD: 0,
        percentage: 0,
        isOwner: Boolean(cart?.creatorId && rawUserId === cart.creatorId),
        isCurrentUser: Boolean(currentUser?.id && rawUserId === currentUser.id)
      };
    }

    participantGroupsMap[rawUserId].items.push(item);
    participantGroupsMap[rawUserId].itemCount += (item.quantity || 1);
    const itemSubUSD = Number(item.price || 0) * (item.quantity || 1);
    participantGroupsMap[rawUserId].subtotalUSD += itemSubUSD;
    participantGroupsMap[rawUserId].subtotalIQD += Math.round(itemSubUSD * 1500);
  });

  const participantGroups = Object.values(participantGroupsMap).map((group) => ({
    ...group,
    percentage: totalItemsUSD > 0 ? Math.round((group.subtotalUSD / totalItemsUSD) * 100) : 0
  }));

  const toggleParticipantExpand = (userId: string) => {
    setExpandedParticipants((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleConfirmAndSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim() || !deliveryAddress.trim()) {
      alert(isKu ? 'تکایە هەموو خانەکانی ناونیشان پڕبکەرەوە' : 'Please fill all required address fields');
      return;
    }

    setIsSavingAddress(true);
    try {
      if (onUpdateDeliveryAddress) {
        await onUpdateDeliveryAddress({
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          city: deliveryCity,
          address: deliveryAddress.trim(),
          deliveryNotes: deliveryNotes.trim(),
          addressConfirmedByOwner: true
        });
      }
      setIsEditingAddress(false);
      setAddressSavedSuccess(true);
      setTimeout(() => setAddressSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save unified address:", err);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCopyPaymentSplit = async () => {
    const lines = [
      isKu ? '🧾 پوختەی پارەدانی سەبەتەی هاوبەش (Shared Cart Split):' : '🧾 Shared Cart Payment Split Breakdown:',
      '----------------------------------------'
    ];

    participantGroups.forEach((p, idx) => {
      lines.push(
        `${idx + 1}. ${p.userName} (${p.itemCount} ${isKu ? 'کاڵا' : 'items'}): ${p.subtotalIQD.toLocaleString()} IQD (${p.percentage}%)`
      );
    });

    lines.push('----------------------------------------');
    lines.push(`${isKu ? 'کۆی کاڵاکان:' : 'Items Total:'} ${totalItemsIQD.toLocaleString()} IQD`);
    lines.push(`${isKu ? 'کرێی گەیاندنی یەکگرتوو:' : 'Unified Shipping:'} ${shippingFeeIQD.toLocaleString()} IQD`);
    lines.push(`${isKu ? 'کۆی گشتی بۆ پارەدان:' : 'Grand Total:'} ${grandTotalIQD.toLocaleString()} IQD`);
    if (cart?.deliveryAddress) {
      lines.push(`${isKu ? 'ناونیشانی وەرگر:' : 'Delivery to:'} ${cart.recipientName} (${cart.deliveryCity} - ${cart.deliveryAddress})`);
    }

    const success = await safeCopyToClipboard(lines.join('\n'));
    if (success) {
      setCopiedSplit(true);
      setTimeout(() => setCopiedSplit(false), 2500);
    }
  };

  const tr = (ku: string, ar: string, en: string) => {
    if (isKu) return ku;
    if (isAr) return ar;
    return en;
  };

  const cityOptions = [
    { value: 'Erbil', labelKu: 'هەولێر (Erbil)', labelAr: 'أربيل', labelEn: 'Erbil' },
    { value: 'Sulaymaniyah', labelKu: 'سلێمانی (Sulaymaniyah)', labelAr: 'السليمانية', labelEn: 'Sulaymaniyah' },
    { value: 'Duhok', labelKu: 'دهۆک (Duhok)', labelAr: 'دهوك', labelEn: 'Duhok' },
    { value: 'Kirkuk', labelKu: 'کەرکووک (Kirkuk)', labelAr: 'كركوك', labelEn: 'Kirkuk' },
    { value: 'Halabja', labelKu: 'هەڵەبجە (Halabja)', labelAr: 'حلبجة', labelEn: 'Halabja' },
    { value: 'Baghdad', labelKu: 'بەغدا (Baghdad)', labelAr: 'بغداد', labelEn: 'Baghdad' },
    { value: 'Basra', labelKu: 'بەسرە (Basra)', labelAr: 'البصرة', labelEn: 'Basra' },
    { value: 'Mosul', labelKu: 'مووسڵ (Mosul)', labelAr: 'الموصل', labelEn: 'Mosul' }
  ];

  return (
    <div className="space-y-4" id="group-checkout-summary-container">
      {/* 1. PARTICIPANT BREAKDOWN & RUNNING TOTALS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>{tr('پشکی بەشداربووان و بڕی پارەدان', 'تقسيم حصص المشتركين والمجاميع', 'Participant Running Totals')}</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {participantGroups.length} {tr('بەشدار', 'مشترك', 'participants')}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {tr(
                  'کۆی حیسابی جیاکراوەی هەر بەشداربوویەک لەگەڵ وردەکاری کاڵاکانی',
                  'المجموع المالي المحسوب لكل عضو مع تفاصيل منتجاته',
                  'Running calculated subtotal and items for each collaborator'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPaymentSplit}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title={tr('کۆپیکردنی پوختەی حیساب بۆ گروپ', 'نسخ تقسيم الحساب للمجموعة', 'Copy split summary')}
          >
            {copiedSplit ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedSplit ? tr('کۆپیکرا!', 'تم النسخ!', 'Copied!') : tr('کۆپیکردنی حیساب', 'نسخ الحساب', 'Copy Split')}</span>
          </button>
        </div>

        {/* Participant Cards Grid */}
        {participantGroups.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs font-bold space-y-1">
            <ShoppingBag className="w-6 h-6 mx-auto text-slate-300" />
            <p>{tr('هیچ کاڵایەک لە سەبەتەکەدا نییە.', 'لا توجد عناصر في السلة.', 'No items in shared cart.')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {participantGroups.map((group, idx) => {
              const isExpanded = Boolean(expandedParticipants[group.userId]);
              return (
                <div
                  key={group.userId}
                  className="border border-slate-200/90 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-all overflow-hidden"
                >
                  {/* Participant Header Row */}
                  <div
                    onClick={() => toggleParticipantExpand(group.userId)}
                    className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                        {group.userName ? group.userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {group.userName}
                          </span>
                          {group.isOwner && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-black px-1.5 py-0.2 rounded-md">
                              👑 {tr('خاوەنی سەبەتە', 'منشئ السلة', 'Cart Owner')}
                            </span>
                          )}
                          {group.isCurrentUser && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-1.5 py-0.2 rounded-md">
                              {tr('تۆ', 'أنت', 'You')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {group.itemCount} {tr('کاڵا', 'عنصر', 'items')} • {group.percentage}% {tr('لە کۆی گشتی', 'من الإجمالي', 'of total')}
                        </p>
                      </div>
                    </div>

                    {/* Running Subtotal & Expand Trigger */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-black text-indigo-700 font-mono">
                          {group.subtotalIQD.toLocaleString()} IQD
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ${group.subtotalUSD.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 bg-white border border-slate-200">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="w-full bg-slate-200 h-1">
                    <div
                      className="bg-indigo-600 h-1 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, group.percentage))}%` }}
                    />
                  </div>

                  {/* Expanded Items Breakdown */}
                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-slate-200 divide-y divide-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                        {tr('کاڵاکانی ئەم بەشداربووە:', 'منتجات هذا المشترك:', 'Items by this participant:')}
                      </span>
                      {group.items.map((item) => (
                        <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                            />
                            <div className="min-w-0">
                              <h5 className="font-bold text-slate-800 text-xs truncate">{item.title}</h5>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <span>{item.quantity}x</span>
                                <span>•</span>
                                <span>{(Math.round(item.price * 1500)).toLocaleString()} IQD</span>
                                {item.size && <span>• {item.size}</span>}
                                {item.color && <span>• {item.color}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono font-bold text-slate-800 text-xs shrink-0">
                            {(Math.round(item.price * (item.quantity || 1) * 1500)).toLocaleString()} IQD
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. CONSOLIDATED SHIPPING ADDRESS FORM (OWNER CONFIRMATION) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>{tr('ناونیشانی یەکگرتووی گەیاندن', 'عنوان التوصيل الموحد', 'Consolidated Shipping Address')}</span>
                {cart?.addressConfirmedByOwner ? (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{tr('پەسەندکراوە لەلایەن خاوەن', 'مؤكد من المنشئ', 'Confirmed by Owner')}</span>
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>{tr('چاوەڕوانی پەسەندکردن', 'قيد التأكيد', 'Awaiting Confirmation')}</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                {tr(
                  'هەموو کاڵاکانی بەشداربووان لە یەک پاکێجدا بۆ ئەم ناونیشانە یەکگرتووە بەڕێدەکرێن.',
                  'سيتم إرسال كافة منتجات المشاركين في طرد واحد موحد إلى هذا العنوان.',
                  'All items from all collaborators will be dispatched in a single unified parcel to this destination.'
                )}
              </p>
            </div>
          </div>

          {/* Edit toggle for owner */}
          {isOwner && !isEditingAddress && (
            <button
              type="button"
              onClick={() => setIsEditingAddress(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{tr('دەستکاریکردنی ناونیشان', 'تعديل العنوان', 'Edit Address')}</span>
            </button>
          )}
        </div>

        {/* Feedback alert when address is saved */}
        <AnimatePresence>
          {addressSavedSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {tr(
                  'ناونیشانی یەکگرتووی گەیاندن بە سەرکەوتوویی لە لایەن خاوەنی سەبەتە پەسەند و پاشەکەوت کرا!',
                  'تم تأكيد وحفظ عنوان التوصيل الموحد بنجاح من قبل منشئ السلة!',
                  'Consolidated delivery address successfully confirmed & saved to shared cart payload!'
                )}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Address Form or Read-Only Card */}
        {isEditingAddress && isOwner ? (
          <form onSubmit={handleConfirmAndSaveAddress} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {tr('ناوی تەواوی وەرگر:', 'اسم المستلم الرباعي:', 'Recipient Full Name:')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={tr('شەرمین حەسەن', 'شيرين حسن', 'Recipient Full Name')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 rtl:pr-9 rtl:pl-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {tr('ژمارەی مۆبایلی وەرگر:', 'رقم هاتف المستلم للتوصيل:', 'Recipient Phone Number:')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                  <input
                    type="tel"
                    required
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="0750 XXX XXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 rtl:pr-9 rtl:pl-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {tr('شار / پارێزگا:', 'المدينة / المحافظة:', 'City / Governorate:')}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                  <select
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 rtl:pr-9 rtl:pl-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    {cityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {isKu ? opt.labelKu : isAr ? opt.labelAr : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {tr('ناونیشانی تەواو (گەڕەک، شەقام، نزیک نیشانە):', 'العنوان المفصل (الحي، الشارع، أقرب نقطة دالة):', 'Detailed Street / Neighborhood Address:')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={tr('بەختیاری، شەقامی سەرەکی، نزیک فاستپەی', 'بختياري، الشارع العام، قرب نقطة دالة', 'District, Street name, Near Landmark')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {tr('تێبینی تایبەتی گەیاندن بۆ دلیڤەری (ئارەزوومەندانە):', 'ملاحظات وتوجيهات خاصة للسائق (اختياري):', 'Delivery Instructions / Notes (Optional):')}
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:right-3 rtl:left-auto" />
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder={tr('تکایە پێش گەیاندن پەیوەندی بکەن / لە کاتی دەوام لە باڵەخانە دەبم', 'يرجى الاتصال قبل الوصول / الاستلام في الدوام', 'Call before arrival / Leave at gate')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 rtl:pr-9 rtl:pl-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Owner action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {cart?.recipientName && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {tr('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}
                </button>
              )}
              <button
                type="submit"
                disabled={isSavingAddress}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingAddress ? (
                  <span>{tr('پاشەکەوت دەکرێت...', 'جاري الحفظ...', 'Saving...')}</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-indigo-200" />
                    <span>{tr('پەسەندکردن و پاشەکەوتکردن', 'تأكيد وحفظ العنوان', 'Confirm & Save Unified Address')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Read-only verified destination view */
          <div className="space-y-2.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-900">
                    {recipientName || (isKu ? 'دیاری نەکراوە' : 'Not set')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-indigo-600 font-bold">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{recipientPhone || '-'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-0.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-slate-900">{deliveryCity}</span>
                  {deliveryAddress && <span className="text-slate-600"> - {deliveryAddress}</span>}
                </div>
              </div>

              {deliveryNotes && (
                <div className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200/80 italic flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>"{deliveryNotes}"</span>
                </div>
              )}
            </div>

            {/* Non-owner advisory notice */}
            {!isOwner && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {tr(
                    `تەنها خاوەنی سەبەتە (${cart?.creatorName || 'منشئ السلة'}) دەسەڵاتی پەسەندکردن و دەستکاریکردنی ناونیشانی یەکگرتووی هەیە.`,
                    `فقط منشئ السلة (${cart?.creatorName || 'المالك'}) يمتلك صلاحية تأكيد وتعديل عنوان التوصيل الموحد.`,
                    `Only the cart creator (${cart?.creatorName || 'Owner'}) can modify or re-confirm the unified shipping address.`
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. CONSOLIDATED GRAND INVOICE & PROCEED TRIGGER */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-300" />
            <h4 className="text-xs sm:text-sm font-black tracking-wide">
              {tr('پوختەی حیساباتی کۆتایی (Unified Invoice)', 'الفاتورة الموحدة الإجمالية', 'Consolidated Order Invoice')}
            </h4>
          </div>
          <span className="text-[10px] bg-indigo-800/60 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded-full font-mono">
            {activeSharedCartItems.length} {tr('کاڵای تێکەڵ', 'عناصر مشتركة', 'items')}
          </span>
        </div>

        <div className="space-y-2 text-xs text-indigo-100">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">{tr('کۆی گشتی کاڵاکانی بەشداربووان:', 'مجموع أسعار المنتجات:', 'Items Subtotal:')}</span>
            <span className="font-mono font-bold text-white text-sm">{totalItemsIQD.toLocaleString()} IQD</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{tr('کرێی یەکگرتووی گەیاندن (تەنها جارێک بۆ هەمووان):', 'أجور التوصيل الموحد (مرة واحدة للكل):', 'Unified Delivery Fee (1x for all):')}</span>
            </span>
            <span className="font-mono font-bold text-emerald-300">{shippingFeeIQD.toLocaleString()} IQD</span>
          </div>

          <div className="border-t border-indigo-800/80 pt-2.5 flex justify-between items-center text-sm sm:text-base font-black text-white">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{tr('کۆی گشتی بۆ پارەدانی یەکجارەکی:', 'المبلغ الإجمالي الكلي للدفع:', 'Final Grand Total:')}</span>
            </span>
            <span className="font-mono text-emerald-400 text-lg">
              {grandTotalIQD.toLocaleString()} IQD
            </span>
          </div>
        </div>

        {/* Action button to proceed if provided */}
        {onProceedToCheckout && !isCheckingOut && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (!currentUser && onRequireAuth) {
                  onRequireAuth();
                  return;
                }
                if (!cart?.addressConfirmedByOwner && isOwner) {
                  setIsEditingAddress(true);
                  alert(
                    isKu
                      ? 'تکایە سەرەتا ناونیشانی یەکگرتوو پەسەند بکە لە خوارەوە.'
                      : 'Please confirm the unified delivery address above first.'
                  );
                  return;
                }
                onProceedToCheckout();
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {tr(
                  `پارەدانی یەکجارەکی بۆ هەمووان (${grandTotalIQD.toLocaleString()} IQD)`,
                  `الدفع الموحد لكافة المشاركين (${grandTotalIQD.toLocaleString()} د.ع)`,
                  `Proceed to Unified Checkout (${grandTotalIQD.toLocaleString()} IQD)`
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
