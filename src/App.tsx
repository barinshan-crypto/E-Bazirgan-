import * as htmlToImage from 'html-to-image';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, firestore, googleProvider } from './lib/firebase';
import { Toast, ConfirmationDialog } from './components/UI';
import { getFriendlyAuthErrorMessage, logAuthDiagnostic } from './lib/authErrors';

import { 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  ShoppingBag, 
  ShoppingCart,
  ShoppingBasket, 
  Compass, 
  MapPin, 
  Store, 
  Globe, 
  Palette, 
  User as UserIcon, 
  Menu, 
  Search, 
  Plus, 
  Target, 
  Truck, 
  Bot, 
  Sparkles, 
  CheckCircle, 
  X,
  Heart,
  Phone,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Info,
  ArrowRight,
  ArrowLeft,
  Settings,
  Edit3,
  Save,
  History,
  RefreshCw,
  FileText,
  Check,
  Lock,
  Shield,
  ShieldCheck,
  Share2,
  Copy,
  Printer,
  Radio,
  Coins,
  LogOut,
  LogIn,
  UserPlus,
  AlertTriangle,
  Minus,
  Trash2,
  Calendar,
  Zap,
  Users,
  Users as UsersIcon,
  Camera,
  Upload,
  BarChart3,
  TrendingUp,
  DollarSign,
  Video,
  Mic,
  Volume2,
  Music,
  Tv,
  Calculator,
  Bell,
  Gift,
  ZoomIn,
  Maximize2,
  Sun,
  Moon,
  Clock,
  Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { db, User, MarketplaceItem, BasketItem, SharedCartItem, LiveSession, PriceUpdateNotification, checkIsAdmin, DEFAULT_ADMIN_USER, sanitizeBrandName } from './lib/db';
import { NotificationsModal } from './components/NotificationsModal';
import InstagramPublicProfileModal from './components/InstagramPublicProfileModal';
import { showBrowserPushNotification } from './lib/pushNotifications';
import { AccountingModule } from './components/AccountingModule';
import LegalFooter from './components/LegalFooter';
import UserProfile from './components/UserProfile';
import { EditPostModal } from './components/EditPostModal';
import { MessagingInbox } from './components/MessagingInbox';
import GiftCrowdfundModal from './components/GiftCrowdfundModal';
import SharedCartModal from './components/SharedCartModal';
import ShareCartLinkModal from './components/ShareCartLinkModal';
import { safeCopyToClipboard } from './lib/clipboard';
import EBazirganLogo from './components/EBazirganLogo';
import { LazyBasketImage } from './components/LazyBasketImage';
import { SlickInstallPrompt } from './components/SlickInstallPrompt';
import SellerDashboard from './components/SellerDashboard';

const BasketItemRow = React.memo(({ 
  item, 
  user,
  theme, 
  ct, 
  onUpdateQuantity, 
  onUpdateAttributes,
  t,
  i18n,
  isSelected = false,
  onToggleSelect
}: { 
  item: BasketItem, 
  user?: User | null,
  theme: string, 
  ct: any, 
  onUpdateQuantity: (id: string, qty: number) => void,
  onUpdateAttributes: (id: string, color: string, size: string) => void,
  t: any,
  i18n: any,
  isSelected?: boolean,
  onToggleSelect?: (id: string) => void,
  key?: any
}) => {
  const [localSize, setLocalSize] = useState(item.size || '');
  const [localColor, setLocalColor] = useState(item.color || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const productImgSrc = item.imageUrl || (item as any).image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300';

  useEffect(() => {
    setLocalSize(item.size || '');
    setLocalColor(item.color || '');
  }, [item.size, item.color]);

  const debouncedUpdate = (newColor: string, newSize: string) => {
    setIsSaving(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await onUpdateAttributes(item.id, newColor, newSize);
      setIsSaving(false);
    }, 1000);
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onUpdateQuantity(item.id, 0);
    }, 250);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl group/swipe select-none">
      {/* Background Swipe Delete Action Bar */}
      <div 
        onClick={triggerDelete}
        className="absolute inset-0 bg-red-600 rounded-2xl flex items-center justify-end px-5 text-white cursor-pointer shadow-inner z-0"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-white animate-bounce" />
          <span className="font-black text-xs sm:text-sm">
            {i18n.language === 'ku' ? 'سڕینەوە' : i18n.language === 'ar' ? 'حذف' : 'Delete'}
          </span>
        </div>
      </div>

      {/* Foreground Draggable / Swipable Item Card with vibrant blue-to-green gradient matching the theme */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={{ left: 0.25, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70 || info.velocity.x < -250) {
            triggerDelete();
          }
        }}
        animate={isDeleting ? { x: -350, opacity: 0, height: 0, marginBottom: 0, padding: 0 } : { x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={clsx(
          "p-3 sm:p-4 rounded-2xl flex items-start gap-2.5 sm:gap-3 text-xs transition-all relative z-10 touch-pan-y shadow-xs",
          "bg-white text-slate-900 font-bold",
          isSelected 
            ? "border-2 border-indigo-600 ring-2 ring-indigo-500/20 shadow-md" 
            : "border border-slate-200 hover:border-slate-300 shadow-xs"
        )}
      >
        {/* Selection Checkbox */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect?.(item.id);
          }}
          className={clsx(
            "mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border-2 active:scale-90 shadow-2xs",
            isSelected
              ? "bg-indigo-600 border-indigo-600 text-white font-black"
              : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-transparent"
          )}
          title={isSelected 
            ? (i18n.language === 'ku' ? 'لابردنی هەڵبژاردن' : i18n.language === 'ar' ? 'إلغاء التحديد' : 'Deselect') 
            : (i18n.language === 'ku' ? 'هەڵبژاردنی ئەم کاڵایە' : i18n.language === 'ar' ? 'تحديد هذا العنصر' : 'Select this item')}
          aria-label="Select cart item"
        >
          <Check className={clsx("w-3.5 h-3.5 stroke-[3.5]", isSelected ? "opacity-100" : "opacity-0")} />
        </button>

        {/* Clickable Zoomable Image Thumbnail with IntersectionObserver Lazy Loading */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(true);
          }}
          title={i18n.language === 'ku' ? 'گەورەکردنی وێنە' : i18n.language === 'ar' ? 'تكبير الصورة' : 'Click to zoom image'}
          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 shadow-xs cursor-zoom-in group/img"
        >
          <LazyBasketImage 
            src={productImgSrc} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
          />
          {/* Zoom In Badge Overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
          </div>
          <div className="absolute bottom-1 right-1 p-0.5 rounded bg-black/60 text-white/90 pointer-events-none">
            <Maximize2 className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Integrated details area */}
        <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch py-0.5">
          {/* Top Row: Title, Shop & Delete button */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[240px] text-slate-900">
                {item.title}
              </h3>
              {item.sellerName && (
                <p className="text-[10px] text-indigo-600 font-bold mt-0.5 truncate max-w-[160px]">
                  {i18n.language === 'ku' ? '🏪 فرۆشگا: ' : i18n.language === 'ar' ? '🏪 المتجر: ' : '🏪 Shop: '} {item.sellerName}
                </p>
              )}
            </div>

            {/* Trash button */}
            <button 
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerDelete();
              }}
              aria-label="Remove from basket"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer relative z-[50] shadow-xs active:scale-90 border border-slate-200 shrink-0"
              title={i18n.language === 'ku' ? "سڕینەوە لە سەبەتە" : i18n.language === 'ar' ? "حذف من السلة" : "Remove from basket"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Pricing Row - Clean, NO DUPLICATION! */}
          {(() => {
            const hasDiscount = Boolean(
              (item as any).resalePrice && 
              Number((item as any).resalePrice) > 0 && 
              Number((item as any).resalePrice) < Number(item.price)
            );
            const effectivePrice = hasDiscount ? Number((item as any).resalePrice) : Number(item.price);
            const effectivePriceIqd = effectivePrice * 1500;
            const originalPriceIqd = Number(item.price) * 1500;

            return (
              <>
                <div className="my-1.5 flex flex-wrap items-baseline gap-2">
                  {hasDiscount ? (
                    <>
                      <span className="font-black text-xs sm:text-sm font-mono text-indigo-600">
                        {effectivePriceIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                      </span>
                      <span className="text-[11px] line-through text-slate-400 font-mono">
                        {originalPriceIqd.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-md">
                        🏷️ {i18n.language === 'ku' ? 'داشکاندن' : i18n.language === 'ar' ? 'تخفيض' : 'Discount'}
                      </span>
                    </>
                  ) : (
                    <span className="font-black text-xs sm:text-sm font-mono text-slate-900">
                      {effectivePriceIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                    </span>
                  )}
                </div>

                {/* Size / Color Options - Only show when present to avoid duplicate text */}
                {((item.availableSizes && item.availableSizes.length > 1) || (item.availableColors && item.availableColors.length > 1) || (item.size && item.size !== 'std') || item.color) && (
                  <div 
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="py-1 flex flex-wrap items-center gap-1.5 text-[10px]"
                  >
                    {item.availableSizes && item.availableSizes.length > 1 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-600 font-bold">{i18n.language === 'ku' ? 'قەبارە:' : i18n.language === 'ar' ? 'المقاس:' : 'Size:'}</span>
                        <select
                          value={localSize}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalSize(val);
                            debouncedUpdate(localColor, val);
                          }}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-300 rounded-md text-[10px] text-slate-900 font-bold"
                        >
                          {item.availableSizes.map(s => (
                            <option key={s} value={s} className="bg-white text-slate-900">{s}</option>
                          ))}
                        </select>
                      </div>
                    ) : (item.size && item.size !== 'std') ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-bold">
                        {i18n.language === 'ku' ? 'قەبارە: ' : i18n.language === 'ar' ? 'المقاس: ' : 'Size: '}{item.size}
                      </span>
                    ) : null}

                    {item.availableColors && item.availableColors.length > 1 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-600 font-bold">{i18n.language === 'ku' ? 'ڕەنگ:' : i18n.language === 'ar' ? 'اللون:' : 'Color:'}</span>
                        <select
                          value={localColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalColor(val);
                            debouncedUpdate(val, localSize);
                          }}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-300 rounded-md text-[10px] text-slate-900 font-bold"
                        >
                          {item.availableColors.map(c => (
                            <option key={c} value={c} className="bg-white text-slate-900">{c}</option>
                          ))}
                        </select>
                      </div>
                    ) : item.color ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] text-slate-700 font-bold">
                        {i18n.language === 'ku' ? 'ڕەنگ: ' : i18n.language === 'ar' ? 'اللون: ' : 'Color: '}{item.color}
                      </span>
                    ) : null}

                    {isSaving && (
                      <RefreshCw className="w-2.5 h-2.5 text-indigo-500 animate-spin ms-auto" />
                    )}
                  </div>
                )}

                {/* Action Row: Distinct, un-clipped Quantity Selector + Line Item Total */}
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2 mt-1">
                  <div 
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-slate-100 px-1.5 py-1 rounded-xl border border-slate-200 shadow-2xs shrink-0"
                  >
                    <button 
                      type="button" 
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (item.quantity <= 1) {
                          triggerDelete();
                        } else {
                          onUpdateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      aria-label="Decrease quantity"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-slate-200 active:scale-90 text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-200 shadow-2xs"
                      title="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    
                    <span className="font-black font-mono text-xs sm:text-sm px-2 text-slate-900 min-w-[26px] text-center shrink-0">
                      {item.quantity}
                    </span>

                    <button 
                      type="button" 
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUpdateQuantity(item.id, item.quantity + 1);
                      }}
                      aria-label="Increase quantity"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-slate-200 active:scale-90 text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-200 shadow-2xs"
                      title="Increase"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Total calculation for this line item */}
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      {i18n.language === 'ku' ? 'کۆی گشتی' : i18n.language === 'ar' ? 'المجموع' : 'Total'}
                    </span>
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-600">
                      {(effectivePriceIqd * item.quantity).toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </motion.div>

      {/* Click-to-Zoom Full-Size Image Overlay Modal */}
      <AnimatePresence>
        {isZoomed && (
          <div 
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-[350] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-slate-950/90 border border-white/20 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col items-center gap-4"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-colors border border-white/10 cursor-pointer shadow-lg"
                aria-label="Close zoomed image"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Full-Size Image Display */}
              <div className="relative w-full max-h-[70vh] rounded-2xl overflow-hidden bg-slate-900/80 flex items-center justify-center border border-white/10">
                <img 
                  src={productImgSrc} 
                  alt={item.title}
                  className="w-full h-auto max-h-[68vh] object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Image Info Footer */}
              <div className="w-full flex items-center justify-between gap-3 text-white px-2">
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm sm:text-base text-white truncate">{item.title}</h4>
                  {item.sellerName && (
                    <p className="text-xs text-teal-400 font-bold mt-0.5">
                      {item.sellerName}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono font-black text-sm sm:text-base text-emerald-400">
                  {(Number(item.price) * 1500).toLocaleString()} IQD
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
import { IRAQ_CITIES } from './lib/constants';
import SourcingHub from './components/SourcingHub';
import Marketplace from './components/Marketplace';
import LiveStreamsFeed from './components/LiveStreamsFeed';
import StoreAnalytics from './components/StoreAnalytics';
import { GlobalLivePlayer } from './components/GlobalLivePlayer';
import { compressBase64Image } from './lib/imageCompressor';

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><circle cx='12' cy='8' r='5'/><path d='M12 14c-4 0-7 2.5-7 5v1h14v-1c0-2.5-3-5-7-5z'/></svg>";

import { detectLocalTimeTheme, LocalTimeThemeInfo } from './lib/themeTimeDetector';
import DynamicMotionWavyScreen from './components/DynamicMotionWavyScreen';

  const THEMES = [
    { 
      id: 'royal', 
      label: 'EB Luxury Gold Silk', 
      labelKu: 'کەنڤاسی شاهانەی نیلی، ڕەش و شریتی زێڕینی ٢٤ عەیار', 
      labelAr: 'كانفاس EB الملكي الفاخر (نيلي، أسود وشريط ذهبي)', 
      color: 'bg-gradient-to-r from-black via-[#0b0c26] to-amber-500 border-amber-400',
      icon: '👑',
      timeSlot: 'all-day'
    },
    { 
      id: 'rainbow', 
      label: 'Delicate Water Rainbow', 
      labelKu: 'ڕەنگاوڕەنگی ناسک (جووڵەی نەرم وەک ئاو)', 
      labelAr: 'قوس قزح الهادئ بانسيابية الماء', 
      color: 'bg-gradient-to-r from-pink-300 via-amber-200 via-sky-300 to-purple-300 border-white/60',
      icon: '🌊',
      timeSlot: 'daytime'
    }
  ];

const CENTRAL_LOGISTICS_WHATSAPP = "9647746573763";

export default function App() {
  const { t, i18n } = useTranslation();
  
  // App States
  const [activeTab, setActiveTab] = useState<'sourcing' | 'marketplace' | 'lives'>('sourcing');
  const [profileInitialSection, setProfileInitialSection] = useState<'profile' | 'seller' | 'accounting'>('profile');
  // Auto local-time theme tracking engine
  const [isAutoTimeTheme, setIsAutoTimeTheme] = useState<boolean>(false);

  const [localTimeInfo, setLocalTimeInfo] = useState<LocalTimeThemeInfo>(() => detectLocalTimeTheme());
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('payv_active_theme');
    if (savedTheme) {
      return savedTheme;
    }
    return 'royal';
  };

  const [theme, setTheme] = useState(getInitialTheme());
  const [viewingInstagramProfileId, setViewingInstagramProfileId] = useState<string | null>(null);
  const [viewingInstagramProfileFallback, setViewingInstagramProfileFallback] = useState<any>(null);

  const handleOpenPublicProfile = (userId: string, fallbackInfo?: any) => {
    setViewingInstagramProfileId(userId);
    setViewingInstagramProfileFallback(fallbackInfo || null);
  };

  const [user, setUser] = useState<User | null>(() => {
    return db.getCurrentUser();
  });
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot' | 'whatsapp_otp'>('login');
  const [waPhone, setWaPhone] = useState<string>('');
  const [waOtpCode, setWaOtpCode] = useState<string>('');
  const [sentWaOtp, setSentWaOtp] = useState<string | null>(null);
  const [waOtpCountdown, setWaOtpCountdown] = useState<number>(0);
  const [isSendingWaOtp, setIsSendingWaOtp] = useState<boolean>(false);
  const [waOtpStep, setWaOtpStep] = useState<'input_phone' | 'input_code'>('input_phone');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [bottomTab, setBottomTab] = useState<'orders' | 'accounting' | 'saved' | 'posts' | 'admin'>('accounting');
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [registeredDuplicatePhone, setRegisteredDuplicatePhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [basketCount, setBasketCount] = useState(0);
  const [activeLiveCount, setActiveLiveCount] = useState(0);
  
  // Notifications state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<PriceUpdateNotification[]>([]);
  const [targetSelectedItemId, setTargetSelectedItemId] = useState<string | null>(null);
  const prevNotifsRef = useRef<PriceUpdateNotification[]>([]);

  // In-App Direct Messaging States
  const [showMessagingInbox, setShowMessagingInbox] = useState(false);
  const [targetMessagingSellerId, setTargetMessagingSellerId] = useState<string | null>(null);
  const [targetMessagingItemContext, setTargetMessagingItemContext] = useState<{ id: string; title: string; imageUrl?: string; price: number } | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Edit Item Modal State
  const [editingProfileItem, setEditingProfileItem] = useState<MarketplaceItem | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    const unsub = db.subscribeToUserConversations(user.id, (convs) => {
      const totalUnread = convs.reduce((acc, c) => {
        if (c.unreadCount && user.id && c.unreadCount[user.id]) {
          return acc + c.unreadCount[user.id];
        }
        return acc;
      }, 0);
      setUnreadMessagesCount(totalUnread);
    });

    return () => unsub();
  }, [user?.id]);

  // Minimalist Basket / Checkout States
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartItems, setCartItems] = useState<BasketItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCreatingSharedCart, setIsCreatingSharedCart] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutCity, setCheckoutCity] = useState('Erbil');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [latestPlacedOrder, setLatestPlacedOrder] = useState<any>(null);
  const [currentWhatsappUrl, setCurrentWhatsappUrl] = useState<string | null>(null);
  const [useLoyaltyPointsDiscount, setUseLoyaltyPointsDiscount] = useState<boolean>(false);

  // Cart Bulk Selection & Actions States
  const [selectedCartItemIds, setSelectedCartItemIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState<boolean>(false);
  const [bulkRemoveType, setBulkRemoveType] = useState<'selected' | 'all'>('selected');

  // Direct checkout link receipt viewer
  const [publicOrderView, setPublicOrderView] = useState<any>(null);
  const [loadingPublicOrder, setLoadingPublicOrder] = useState(false);
  const [publicOrderError, setPublicOrderError] = useState<string | null>(null);

  // Workflow A: Group Gift Crowdfunding States
  const [showGiftCrowdfundModal, setShowGiftCrowdfundModal] = useState<boolean>(false);
  const [activeGiftPoolId, setActiveGiftPoolId] = useState<string | null>(null);
  const [activeGiftTargetProduct, setActiveGiftTargetProduct] = useState<MarketplaceItem | null>(null);

  // Workflow B: Shared Cart Shopping States
  const [showSharedCartModal, setShowSharedCartModal] = useState<boolean>(false);
  const [activeSharedCartId, setActiveSharedCartId] = useState<string | null>(null);
  const [showShareCartLinkModal, setShowShareCartLinkModal] = useState<boolean>(false);
  const [shareCartLinkData, setShareCartLinkData] = useState<{
    url: string;
    items: SharedCartItem[];
    totalIQD: number;
    cartId: string;
  } | null>(null);

  // Live Stream Deep Linking & Global PiP Floating Player
  const [activeLiveStreamId, setActiveLiveStreamId] = useState<string | null>(null);
  const [globalLiveSession, setGlobalLiveSession] = useState<LiveSession | null>(null);
  const [isGlobalLiveMinimized, setIsGlobalLiveMinimized] = useState<boolean>(false);
  const [autoOpenLiveStudio, setAutoOpenLiveStudio] = useState<boolean>(false);

  useEffect(() => {
    const lang = i18n.language || 'ku';
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ku' || lang === 'ar') ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewOrderId = urlParams.get('view-order') || urlParams.get('order');
    const encodedData = urlParams.get('orderData');

    // Handle Live Stream URL param
    const liveStreamParam = urlParams.get('live') || urlParams.get('stream') || urlParams.get('broadcast');
    if (liveStreamParam) {
      setActiveLiveStreamId(liveStreamParam);
      setActiveTab('lives');
    }

    const handleOpenLiveStream = (e: any) => {
      const sessionId = e.detail?.sessionId;
      if (sessionId) {
        setActiveLiveStreamId(sessionId);
        setActiveTab('lives');
      }
    };
    window.addEventListener('open_live_stream_feed', handleOpenLiveStream);

    // Handle Gift Crowdfunding URL param
    const giftPoolParam = urlParams.get('giftPool') || urlParams.get('giftCrowdfund') || urlParams.get('gift');
    if (giftPoolParam) {
      setActiveGiftPoolId(giftPoolParam);
      setShowGiftCrowdfundModal(true);
    }

    // Handle Shared Cart URL param (supports sharedCart, scart, cartShare, and shareCart)
    const sharedCartParam = urlParams.get('sharedCart') || urlParams.get('scart') || urlParams.get('cartShare') || urlParams.get('shareCart');
    if (sharedCartParam) {
      setActiveSharedCartId(sharedCartParam);
      setShowSharedCartModal(true);
    }

    if (viewOrderId) {
      setLoadingPublicOrder(true);
      setPublicOrderView(null);
      setPublicOrderError(null);
      
      const loadOrderDetails = async () => {
        // 1. Try Server API
        try {
          const res = await fetch(`/api/payv/get-order/${viewOrderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.order) {
              setPublicOrderView(data.order);
              setLoadingPublicOrder(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn("API order fetch failed, attempting client-side fallbacks:", apiErr);
        }

        // 2. Try Client-Side Firestore
        try {
          const { db } = await import('./lib/db');
          const fsOrder = await db.getOrder(viewOrderId);
          if (fsOrder) {
            setPublicOrderView(fsOrder);
            setLoadingPublicOrder(false);
            return;
          }
        } catch (fsErr) {
          console.warn("Client-side Firestore order fetch failed:", fsErr);
        }

        // 3. Try LocalStorage by Order ID
        try {
          const localStored = localStorage.getItem(`payv_order_${viewOrderId}`);
          if (localStored) {
            const parsed = JSON.parse(localStored);
            if (parsed) {
              setPublicOrderView(parsed);
              setLoadingPublicOrder(false);
              return;
            }
          }
        } catch (locErr) {}

        // 4. Try Encoded orderData parameter fallback
        if (encodedData) {
          try {
            const decoded = JSON.parse(decodeURIComponent(atob(encodedData)));
            if (decoded) {
              setPublicOrderView(decoded);
              setLoadingPublicOrder(false);
              return;
            }
          } catch (decErr) {}
        }

        // 5. Try latest placed order from local storage
        try {
          const latestLocal = localStorage.getItem('payv_latest_order');
          if (latestLocal) {
            const parsed = JSON.parse(latestLocal);
            if (parsed && (parsed._id === viewOrderId || parsed.id === viewOrderId)) {
              setPublicOrderView(parsed);
              setLoadingPublicOrder(false);
              return;
            }
          }
        } catch (lErr) {}

        // All attempts exhausted
        setPublicOrderError(i18n.language === 'ku' ? 'داواکارییەکە نەدۆزرایەوە یان بەستەرەکە هەڵەیە' : 'Order not found or invalid link');
        setLoadingPublicOrder(false);
      };

      loadOrderDetails();
    }

    return () => {
      window.removeEventListener('open_live_stream_feed', handleOpenLiveStream);
    };
  }, [i18n.language]);

  const [isCapturing, setIsCapturing] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const saveReceiptAsImage = async () => {
    if (!invoiceRef.current) return;
    setIsCapturing(true);
    try {
      // Ensure images are loaded and fonts are ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await htmlToImage.toPng(invoiceRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          borderRadius: '0'
        }
      });

      const link = document.createElement('a');
      link.download = `E-BAZIRGAN-Receipt-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      triggerCompanionReaction('happy', i18n.language === 'ku' ? "وێنەی وەسڵەکە پاشەکەوت کرا!" : "Receipt photo saved successfully!");
    } catch (err) {
      console.error("Failed to capture receipt:", err);
    } finally {
      setIsCapturing(false);
    }
  };
  const fetchCartItems = async () => {
    const activeUserId = user?.id || db.getCurrentUser()?.id || localStorage.getItem('payv_custom_user_id') || 'guest';
    setLoadingCart(true);
    try {
      const items = await db.getBasket(activeUserId);
      setCartItems(items);
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setBasketCount(totalCount);
    } catch (err) {
      console.error("Failed to load cart items:", err);
      try {
        const localBasket = JSON.parse(localStorage.getItem('basket') || '[]');
        const filtered = localBasket.filter((b: any) => b.userId === activeUserId || !b.userId);
        setCartItems(filtered);
        setBasketCount(filtered.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0));
      } catch {}
    } finally {
      setLoadingCart(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const notifs = await db.getNotifications(user.id);
      setNotifications(notifs);
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    const currentUserId = user?.id || 'guest_user';
    const unsub = db.onNotificationsChange(currentUserId, (notifs) => {
      // Detect new incoming notifications to trigger native browser push alert
      const prevIds = new Set(prevNotifsRef.current.map(n => n.id));
      const newUnread = notifs.filter(n => !n.read && !prevIds.has(n.id));

      if (prevNotifsRef.current.length > 0 && newUnread.length > 0) {
        newUnread.forEach(n => {
          const isKurdish = i18n.language === 'ku';
          const isArabic = i18n.language === 'ar';
          if (n.type === 'story_comment') {
            showBrowserPushNotification({
              title: isKurdish ? `💬 کۆمێنتی نوێ لەسەر ستۆری` : isArabic ? `💬 تعليق جديد على الستوري` : `💬 New Story Comment`,
              body: n.message || n.itemTitle,
              icon: n.itemImageUrl || '/favicon.ico',
              data: { itemId: n.itemId, type: 'story_comment' }
            });
          } else if (n.type === 'new_product') {
            showBrowserPushNotification({
              title: isKurdish 
                ? `✨ کاڵای نوێ لە (${n.sellerName || 'فرۆشگا'})` 
                : isArabic 
                ? `✨ منتج جديد من (${n.sellerName || 'المتجر'})` 
                : `✨ New item from ${n.sellerName || 'Store'}`,
              body: `${n.itemTitle} - ${(n.newPrice * 1500).toLocaleString()} IQD ($${n.newPrice})`,
              icon: n.itemImageUrl || '/favicon.ico',
              data: { itemId: n.itemId, type: 'new_product' }
            });
          } else {
            showBrowserPushNotification({
              title: isKurdish 
                ? (n.isPriceWatch ? `🔔 چاودێری نرخ: داشکاندنی ${n.itemTitle}` : `🏷️ داشکاندنی نرخ: ${n.itemTitle}`) 
                : isArabic 
                ? (n.isPriceWatch ? `🔔 مراقبة السعر: تخفيض ${n.itemTitle}` : `🏷️ تحديث السعر: ${n.itemTitle}`) 
                : (n.isPriceWatch ? `🔔 Price Watch: ${n.itemTitle} dropped!` : `🏷️ Price drop on ${n.itemTitle}`),
              body: `${(n.newPrice * 1500).toLocaleString()} IQD (was ${(n.oldPrice * 1500).toLocaleString()} IQD)`,
              icon: n.itemImageUrl || '/favicon.ico',
              data: { itemId: n.itemId, type: 'price_update' }
            });
          }
        });
      }

      prevNotifsRef.current = notifs;
      setNotifications(notifs);
    });
    return () => unsub();
  }, [user?.id, i18n.language]);

  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCartItems();
    };
    const handleOrdersUpdated = () => {
      if (user) fetchUserOrders(user);
    };

    const handleOpenGiftCrowdfund = (e: any) => {
      const detail = e.detail;
      if (detail?.poolId) {
        setActiveGiftPoolId(detail.poolId);
        setActiveGiftTargetProduct(null);
      } else if (detail?.product) {
        setActiveGiftTargetProduct(detail.product);
        setActiveGiftPoolId(null);
      }
      setShowGiftCrowdfundModal(true);
    };

    const handleOpenSharedCart = (e: any) => {
      const detail = e.detail;
      if (detail?.cartId) {
        setActiveSharedCartId(detail.cartId);
      }
      setShowSharedCartModal(true);
    };

    window.addEventListener('cart_updated', handleCartUpdated);
    window.addEventListener('orders_updated', handleOrdersUpdated);
    window.addEventListener('open_gift_crowdfund', handleOpenGiftCrowdfund);
    window.addEventListener('open_shared_cart', handleOpenSharedCart);

    return () => {
      window.removeEventListener('cart_updated', handleCartUpdated);
      window.removeEventListener('orders_updated', handleOrdersUpdated);
      window.removeEventListener('open_gift_crowdfund', handleOpenGiftCrowdfund);
      window.removeEventListener('open_shared_cart', handleOpenSharedCart);
    };
  }, [user]);

  useEffect(() => {
    if (showCartModal) {
      fetchCartItems();
      const activeUser = user || db.getCurrentUser();
      if (activeUser) {
        setCheckoutName(activeUser.name || '');
        setCheckoutPhone(activeUser.phone || '');
        setCheckoutCity(activeUser.city || 'Erbil');
        setCheckoutAddress(activeUser.address || '');
      }
      setCheckoutSuccess(false);
      setCurrentWhatsappUrl(null);
      setSelectedCartItemIds([]);
    }
  }, [showCartModal, user]);

  useEffect(() => {
    setSelectedCartItemIds(prev => {
      const validIds = new Set(cartItems.map(i => i.id));
      const filtered = prev.filter(id => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [cartItems]);

  useEffect(() => {
    const unsubscribe = db.onLiveSessionsChange((sessions) => {
      setActiveLiveCount(sessions.length);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleSelectCartItem = (id: string) => {
    setSelectedCartItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAllCartItems = () => {
    if (cartItems.length === 0) return;
    if (selectedCartItemIds.length === cartItems.length) {
      setSelectedCartItemIds([]);
    } else {
      setSelectedCartItemIds(cartItems.map(item => item.id));
    }
  };

  const handleConfirmBulkRemove = async () => {
    setShowBulkRemoveConfirm(false);
    setIsBulkDeleting(true);
    try {
      if (bulkRemoveType === 'all') {
        await db.clearBasket(user?.id || 'guest');
        setCartItems([]);
        setSelectedCartItemIds([]);
        setToast({
          message: i18n.language === 'ku' ? 'تەواوی کاڵاکانی سەبەتە سڕانەوە!' : i18n.language === 'ar' ? 'تم تفريغ السلة بالكامل!' : 'Cart cleared completely!',
          type: 'info'
        });
        triggerCompanionReaction('happy', i18n.language === 'ku' ? 'سەبەتەکەت بەتاڵ کرایەوە!' : 'Cart cleared!');
      } else {
        const idsToDelete = [...selectedCartItemIds];
        await db.removeMultipleFromBasket(idsToDelete);
        setCartItems(prev => prev.filter(item => !idsToDelete.includes(item.id)));
        setSelectedCartItemIds([]);
        setToast({
          message: i18n.language === 'ku' 
            ? `(${idsToDelete.length}) کاڵای دەستنیشانکراو بە سەرکەوتوویی سڕانەوە!` 
            : i18n.language === 'ar' 
            ? `تم حذف (${idsToDelete.length}) عناصر محددة بنجاح!` 
            : `(${idsToDelete.length}) selected items removed successfully!`,
          type: 'success'
        });
        triggerCompanionReaction('happy', i18n.language === 'ku' ? 'کاڵاکان سڕانەوە!' : 'Items removed!');
      }
      await fetchCartItems();
    } catch (err) {
      console.error("Failed to bulk remove items:", err);
      setToast({
        message: i18n.language === 'ku' ? 'کێشەیەک ڕوویدا لە کاتی سڕینەوەی کاڵاکان!' : i18n.language === 'ar' ? 'حدث خطأ أثناء الحذف!' : 'Error during bulk removal',
        type: 'error'
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAddToSharedCart = async (targetItemIds?: string[]) => {
    const ids = targetItemIds && targetItemIds.length > 0 ? targetItemIds : selectedCartItemIds;
    const targetItems = ids.length > 0 ? cartItems.filter(item => ids.includes(item.id)) : cartItems;
    if (targetItems.length === 0) {
      setToast({
        message: i18n.language === 'ku' ? 'تکایە سەرەتا کاڵاکان دەستنیشان بکە!' : i18n.language === 'ar' ? 'يرجى تحديد العناصر أولاً!' : 'Please select items first!',
        type: 'info'
      });
      return;
    }

    setIsCreatingSharedCart(true);
    try {
      const itemsToShare: SharedCartItem[] = targetItems.map(item => ({
        id: `sci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemId: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        size: item.size || '',
        color: item.color || '',
        imageUrl: item.imageUrl || '',
        addedByUserId: user?.id || 'guest',
        addedByUserName: checkoutName || user?.name || (i18n.language === 'ku' ? 'کڕیار' : 'Shopper'),
        addedAt: Date.now()
      }));

      if (activeSharedCartId) {
        await db.addMultipleItemsToSharedCart(activeSharedCartId, itemsToShare);
        setShowCartModal(false);
        setShowSharedCartModal(true);
        setToast({
          message: i18n.language === 'ku' 
            ? `(${itemsToShare.length}) کاڵا زیادکران بۆ سەبەتەی هاوبەشی بەردەست!` 
            : i18n.language === 'ar' 
            ? `تمت إضافة (${itemsToShare.length}) عناصر إلى السلة المشتركة الحالية!` 
            : `(${itemsToShare.length}) items added to existing shared cart!`,
          type: 'success'
        });
      } else {
        const newCart = await db.createSharedCart(
          {
            id: user?.id || 'guest',
            name: checkoutName || user?.name || (i18n.language === 'ku' ? 'کڕیار' : 'Shopper'),
            phone: checkoutPhone || user?.phone || ''
          },
          itemsToShare,
          checkoutAddress ? {
            recipientName: checkoutName || user?.name || '',
            recipientPhone: checkoutPhone || '',
            city: checkoutCity || 'Erbil',
            address: checkoutAddress
          } : undefined
        );
        setShowCartModal(false);
        setActiveSharedCartId(newCart.id);
        setShowSharedCartModal(true);
        setToast({
          message: i18n.language === 'ku' 
            ? `سەبەتەی هاوبەش بە (${itemsToShare.length}) کاڵا بە سەرکەوتوویی دروستکرا!` 
            : i18n.language === 'ar' 
            ? `تم إنشاء سلة مشتركة بـ (${itemsToShare.length}) عناصر!` 
            : `Shared cart created with (${itemsToShare.length}) items!`,
          type: 'success'
        });
      }
      setSelectedCartItemIds([]);
      triggerCompanionReaction('happy', i18n.language === 'ku' ? 'سەبەتەی هاوبەش ئامادەیە!' : 'Shared cart is ready!');
    } catch (err) {
      console.error("Failed to add items to shared cart:", err);
      setToast({
        message: i18n.language === 'ku' ? 'کێشەیەک ڕوویدا لە دروستکردنی سەبەتەی هاوبەش!' : i18n.language === 'ar' ? 'فشل إنشاء السلة المشتركة!' : 'Failed to create shared cart',
        type: 'error'
      });
    } finally {
      setIsCreatingSharedCart(false);
    }
  };

  const handleShareSelectedCart = async (targetItemIds?: string[]) => {
    const ids = targetItemIds && targetItemIds.length > 0 ? targetItemIds : selectedCartItemIds;
    const targetItems = ids.length > 0 ? cartItems.filter(item => ids.includes(item.id)) : cartItems;
    if (targetItems.length === 0) {
      setToast({
        message: i18n.language === 'ku' ? 'تکایە سەرەتا کاڵاکان دەستنیشان بکە!' : i18n.language === 'ar' ? 'يرجى تحديد العناصر أولاً!' : 'Please select items first!',
        type: 'info'
      });
      return;
    }

    setIsCreatingSharedCart(true);
    try {
      const itemsToShare: SharedCartItem[] = targetItems.map(item => ({
        id: `sci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemId: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        size: item.size || '',
        color: item.color || '',
        imageUrl: item.imageUrl || '',
        addedByUserId: user?.id || 'guest',
        addedByUserName: checkoutName || user?.name || (i18n.language === 'ku' ? 'کڕیار' : 'Shopper'),
        addedAt: Date.now()
      }));

      const totalIQD = itemsToShare.reduce((sum, item) => {
        const p = (item as any).resalePrice && Number((item as any).resalePrice) > 0 
          ? Number((item as any).resalePrice) 
          : Number(item.price || 0);
        return sum + Math.round(p * 1500 * (item.quantity || 1));
      }, 0);

      const newCart = await db.createSharedCart(
        {
          id: user?.id || 'guest',
          name: checkoutName || user?.name || (i18n.language === 'ku' ? 'کڕیار' : 'Shopper'),
          phone: checkoutPhone || user?.phone || ''
        },
        itemsToShare,
        checkoutAddress ? {
          recipientName: checkoutName || user?.name || '',
          recipientPhone: checkoutPhone || '',
          city: checkoutCity || 'Erbil',
          address: checkoutAddress
        } : undefined
      );

      const publicShareUrl = `${window.location.origin}/?sharedCart=${newCart.id}`;
      await safeCopyToClipboard(publicShareUrl);

      setActiveSharedCartId(newCart.id);
      setShareCartLinkData({
        url: publicShareUrl,
        items: itemsToShare,
        totalIQD,
        cartId: newCart.id
      });
      setShowShareCartLinkModal(true);

      setToast({
        message: i18n.language === 'ku' 
          ? `لینکی گشتی سەبەتەی دەستنیشانکراو دروستکرا و کۆپیکرا!` 
          : i18n.language === 'ar' 
          ? `تم إنشاء ونسخ الرابط العام للسلة المحددة بنجاح!` 
          : `Unique public URL generated & copied to clipboard!`,
        type: 'success'
      });
      triggerCompanionReaction('happy', i18n.language === 'ku' ? 'لینکی سەبەتە ئامادەیە!' : 'Share URL ready!');
    } catch (err) {
      console.error("Failed to share selected cart:", err);
      setToast({
        message: i18n.language === 'ku' ? 'کێشەیەک ڕوویدا لە دروستکردنی لینکی هاوبەشکردن!' : i18n.language === 'ar' ? 'فشل إنشاء رابط السلة!' : 'Failed to generate share URL',
        type: 'error'
      });
    } finally {
      setIsCreatingSharedCart(false);
    }
  };

  const handleUpdateCartQuantity = async (basketId: string, newQty: number) => {
    // Optimistic update for UI responsiveness
    setCartItems(prev => {
      if (newQty <= 0) {
        return prev.filter(item => item.id !== basketId);
      }
      return prev.map(item => item.id === basketId ? { ...item, quantity: newQty } : item);
    });

    await db.updateBasketQuantity(basketId, newQty);
    await fetchCartItems();
    triggerCompanionReaction('happy', i18n.language === 'ku' ? "سەبەتەکەت نوێکرایەوە!" : "Your basket has been successfully updated!");
  };

  const handleUpdateCartAttributes = async (basketId: string, color: string, size: string) => {
    // Optimistic update
    setCartItems(prev => prev.map(item => item.id === basketId ? { ...item, color, size } : item));
    await db.updateBasketAttributes(basketId, color, size);
    await fetchCartItems();
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0 || isPlacingOrder) return;

    setIsPlacingOrder(true);
    try {
      const isKu = i18n.language === 'ku';
      const isAr = i18n.language === 'ar';
      
      const activeUser = user || {
        id: 'guest_' + Date.now(),
        name: checkoutName || 'Customer',
        phone: checkoutPhone || '',
        businessName: '',
        email: '',
        address: checkoutAddress || '',
        city: checkoutCity || 'Erbil'
      };

      const getItemEffectivePrice = (i: BasketItem) => {
        if ((i as any).resalePrice && Number((i as any).resalePrice) > 0 && Number((i as any).resalePrice) < Number(i.price)) {
          return Number((i as any).resalePrice);
        }
        return Number(i.price);
      };
      const subtotal = cartItems.reduce((sum, i) => sum + (getItemEffectivePrice(i) * i.quantity), 0);
      const subtotalIqd = subtotal * 1500;
      const userLoyaltyPoints = Number(user?.loyaltyPoints) || 0;
      const maxLoyaltyDiscountIqd = Math.min(userLoyaltyPoints * 100, Math.floor(subtotalIqd * 0.5));
      const pointsToRedeem = useLoyaltyPointsDiscount ? Math.floor(maxLoyaltyDiscountIqd / 100) : 0;
      const loyaltyDiscountIqd = useLoyaltyPointsDiscount ? maxLoyaltyDiscountIqd : 0;
      const finalGrandTotalIqd = (subtotalIqd + 4000) - loyaltyDiscountIqd;
      const pointsWillEarn = Math.floor(Math.max(0, subtotalIqd - loyaltyDiscountIqd) / 1000);

      const rawShopName = editStoreName || activeUser.businessName || (isKu ? `فرۆشگای ${activeUser.name || 'ئی-بازرگان'}` : isAr ? `متجر ${activeUser.name || 'إي-بازركان'}` : `${activeUser.name || 'E-BAZIRGAN'}'s Store`);
      const shopName = sanitizeBrandName(rawShopName) || (isKu ? 'فرۆشگای ئی-بازرگان' : isAr ? 'متجر إي-بازركان المباشر' : 'E-BAZIRGAN Direct');
      const shopAddressVal = activeUser.address || editAddress || 'Not Specified';

      const orderIdVal = `ord_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

      const orderPayload = {
        _id: orderIdVal,
        id: orderIdVal,
        userId: activeUser.id,
        buyerId: activeUser.id,
        customerName: checkoutName || activeUser.name,
        customerEmail: activeUser.email || '',
        phone: checkoutPhone || activeUser.phone,
        address: checkoutAddress,
        location: checkoutCity,
        items: cartItems.map(i => ({
          ...i,
          price: getItemEffectivePrice(i),
          sellerName: sanitizeBrandName(i.sellerName || i.userName || shopName),
          userName: sanitizeBrandName(i.userName || shopName)
        })),
        totalPrice: finalGrandTotalIqd,
        total: finalGrandTotalIqd,
        subtotalPrice: subtotalIqd,
        deliveryFee: "4,000 Dinar",
        pointsRedeemed: pointsToRedeem,
        discountIqd: loyaltyDiscountIqd,
        pointsEarned: pointsWillEarn,
        status: 'Pending',
        shopAddress: shopAddressVal,
        shopName: shopName,
        createdAt: new Date().toISOString()
      };

      const appOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://payv.vercel.app';
      const orderLink = `${appOrigin}/?view-order=${orderIdVal}`;

      // WhatsApp Text Generation
      const itemsListText = (orderPayload.items || []).map((item: any, idx: number) => {
        let itemStr = isKu 
          ? `📦 *کاڵای #${idx + 1}:* ${item.title}` 
          : isAr 
          ? `📦 *المنتج #${idx + 1}:* ${item.title}` 
          : `📦 *Item #${idx + 1}:* ${item.title}`;
        const rawItemShop = item.sellerName || item.userName || orderPayload.shopName;
        const itemShop = sanitizeBrandName(rawItemShop) || (isKu ? 'فرۆشگای ئی-بازرگان' : isAr ? 'متجر إي-بازركان' : 'E-BAZIRGAN Direct');
        if (itemShop) {
          itemStr += isKu ? `\n   • 🏪 فرۆشگا: ${itemShop}` : isAr ? `\n   • 🏪 المتجر: ${itemShop}` : `\n   • 🏪 Shop: ${itemShop}`;
          if (item.sellerPhone) itemStr += isKu ? `\n   • 📞 مۆبایل: ${item.sellerPhone}` : isAr ? `\n   • 📞 الهاتف: ${item.sellerPhone}` : `\n   • 📞 Phone: ${item.sellerPhone}`;
          if (item.sellerAddress) itemStr += isKu ? `\n   • 📍 ناونیشان: ${item.sellerAddress}` : isAr ? `\n   • 📍 العنوان: ${item.sellerAddress}` : `\n   • 📍 Address: ${item.sellerAddress}`;
        }
        if (item.size) itemStr += isKu ? `\n   • قەبارە: ${item.size}` : isAr ? `\n   • المقاس: ${item.size}` : `\n   • Size: ${item.size}`;
        if (item.color) itemStr += isKu ? `\n   • ڕەنگ: ${item.color}` : isAr ? `\n   • اللون: ${item.color}` : `\n   • Color: ${item.color}`;
        itemStr += isKu 
          ? `\n   • دانە: ${item.quantity} x ${(Number(item.price || 0) * 1500).toLocaleString()} دینار`
          : isAr
          ? `\n   • العدد: ${item.quantity} x ${(Number(item.price || 0) * 1500).toLocaleString()} دينار`
          : `\n   • Qty: ${item.quantity} x ${(Number(item.price || 0) * 1500).toLocaleString()} IQD`;
        return itemStr;
      }).join('\n\n');

      const cleanOrderShop = sanitizeBrandName(orderPayload.shopName) || (isKu ? 'فرۆشگای ئی-بازرگان' : isAr ? 'متجر إي-بازركان' : 'E-BAZIRGAN Direct');

      const orderText = isKu 
        ? `🛒 *داواکارییەکی نوێی کڕین لە بازاڕی ئێ-بازرگان (E-BAZIRGAN)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 *زانیاری کڕیار:*\n` +
          `• ناو: ${orderPayload.customerName}\n` +
          `• مۆبایل: ${orderPayload.phone}\n` +
          `• شار/شوێن: ${orderPayload.location}\n` +
          `• ناونیشان: ${orderPayload.address}\n\n` +
          `🏪 *زانیاری فرۆشیار و سەرچاوە:*\n` +
          `• فرۆشگا: ${cleanOrderShop}\n` +
          `• ناونیشان: ${orderPayload.shopAddress || orderPayload.location || 'کوردستان'}\n\n` +
          `🔗 *بینینی وردەکاری داواکاری:*\n` +
          `${orderLink}\n\n` +
          `📦 *کاڵا داواکراوەکان:*\n` +
          `${itemsListText}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 *نرخ و گەیاندن:*\n` +
          `• کۆی کاڵاکان: ${subtotalIqd.toLocaleString()} دینار\n` +
          `• کرێی گەیاندن: 4,000 دینار\n` +
          (loyaltyDiscountIqd > 0 ? `• داشکاندنی خاڵەکان: -${loyaltyDiscountIqd.toLocaleString()} دینار (${pointsToRedeem} خاڵ)\n` : '') +
          `• کۆی گشتی: ${finalGrandTotalIqd.toLocaleString()} دینار - پارەدان لەکاتی وەرگرتن\n` +
          `• خاڵی پاداشتی بەدەستهاتوو: +${pointsWillEarn} خاڵ بۆ ئەم کڕینە\n\n` +
          `⚡️ _شێوازی پارەدان: پارەدان لەکاتی وەرگرتن_`
        : isAr
        ? `🛒 *طلب شراء جديد من منصة إي-بازركان (E-BAZIRGAN)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 *معلومات المشتري:*\n` +
          `• الاسم: ${orderPayload.customerName}\n` +
          `• رقم الهاتف: ${orderPayload.phone}\n` +
          `• المدينة / المحافظة: ${orderPayload.location}\n` +
          `• العنوان التفصيلي: ${orderPayload.address}\n\n` +
          `🏪 *معلومات البائع والمتجر:*\n` +
          `• المتجر: ${cleanOrderShop}\n` +
          `• العنوان: ${orderPayload.shopAddress || orderPayload.location || 'العراق'}\n\n` +
          `🔗 *رابط تفاصيل الطلب:*\n` +
          `${orderLink}\n\n` +
          `📦 *المنتجات المطلوبة:*\n` +
          `${itemsListText}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 *الأسعار والتوصيل:*\n` +
          `• مجموع المنتجات: ${subtotalIqd.toLocaleString()} دينار\n` +
          `• كلفة التوصيل: 4,000 دينار\n` +
          (loyaltyDiscountIqd > 0 ? `• خصم نقاط الولاء: -${loyaltyDiscountIqd.toLocaleString()} دينار (${pointsToRedeem} نقطة)\n` : '') +
          `• المبلغ الإجمالي: ${finalGrandTotalIqd.toLocaleString()} دينار - الدفع عند الاستلام\n` +
          `• نقاط المكافأة المكتسبة: +${pointsWillEarn} نقطة\n\n` +
          `⚡️ _طريقة الدفع: الدفع عند الاستلام_`
        : `🛒 *NEW E-BAZIRGAN SOURCING ORDER*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 *BUYER INFORMATION:*\n` +
          `• Name: ${orderPayload.customerName}\n` +
          `• Phone: ${orderPayload.phone}\n` +
          `• City/Location: ${orderPayload.location}\n` +
          `• Address: ${orderPayload.address}\n\n` +
          `🏪 *SELLER / BOUTIQUE INFO:*\n` +
          `• Shop: ${cleanOrderShop}\n` +
          `• Address: ${orderPayload.shopAddress || orderPayload.location || 'Kurdistan'}\n\n` +
          `🔗 *VIEW ORDER DETAILS:*\n` +
          `${orderLink}\n\n` +
          `📦 *ORDERED BAZAAR ITEMS:*\n` +
          `${itemsListText}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 *PRICING & DELIVERY:*\n` +
          `• Subtotal Items: ${subtotalIqd.toLocaleString()} IQD\n` +
          `• Delivery Fee: 4,000 Dinar\n` +
          (loyaltyDiscountIqd > 0 ? `• Loyalty Discount: -${loyaltyDiscountIqd.toLocaleString()} IQD (${pointsToRedeem} pts)\n` : '') +
          `• Total Due: ${finalGrandTotalIqd.toLocaleString()} IQD Cash on Delivery\n` +
          `• Points Earned: +${pointsWillEarn} Loyalty Points\n\n` +
          `⚡️ _Payment Mode: Cash on Delivery_`;

      const whatsappUrl = `https://wa.me/${CENTRAL_LOGISTICS_WHATSAPP}?text=${encodeURIComponent(orderText)}`;
      setCurrentWhatsappUrl(whatsappUrl);

      // Create order in DB with loyalty points awarding & redemption
      try {
        await db.createOrder(orderPayload);
      } catch (dbErr) {
        console.warn("createOrder error:", dbErr);
      }

      // Instant UI transition - zero waiting for network
      setLatestPlacedOrder(orderPayload);
      setCheckoutSuccess(true);
      setCartItems([]);
      setBasketCount(0);
      setIsPlacingOrder(false);

      // Instant redirect try within user gesture window
      try {
        const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.location.assign(whatsappUrl);
          }
        }
      } catch (e) {
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.location.assign(whatsappUrl);
        }
      }

      triggerCompanionReaction('happy', 
        isKu ? "داواکارییەکەت تۆمارکرا و نێردرا بۆ واتسئەپ!" : isAr ? "تم تسجيل طلبك بنجاح وإرساله إلى واتساب!" : "Sourcing order registered & sent to WhatsApp!"
      );

      // Background asynchronous storage and synchronization
      try {
        localStorage.setItem(`payv_order_${orderIdVal}`, JSON.stringify(orderPayload));
        localStorage.setItem(`payv_latest_order`, JSON.stringify(orderPayload));
      } catch (storageErr) {
        console.warn("Storage sync error:", storageErr);
      }

      // Background clear basket
      db.clearBasket(activeUser.id).catch(e => console.warn("Background clearBasket:", e));
      try { fetchUserOrders(activeUser); } catch (e) {}

      // Background server API save with timeout guard
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          await fetch('/api/payv/insert-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload),
            signal: controller.signal
          });
          clearTimeout(timer);
        } catch (apiErr) {
          console.warn("Background server order save notice:", apiErr);
        }
      })().catch(() => {});

      // Background client Firestore sync with timeout guard
      (async () => {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { firestore } = await import('./lib/firebase');
          await Promise.race([
            setDoc(doc(firestore, 'orders', orderIdVal), orderPayload, { merge: true }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          console.log("Client Firestore background sync complete for:", orderIdVal);
        } catch (fsErr) {
          console.warn("Client Firestore background notice:", fsErr);
        }
      })().catch(() => {});

    } catch (err) {
      console.error("Critical error in place order:", err);
      triggerCompanionReaction('idle', i18n.language === 'ku' ? "هەڵەیەک ڕوویدا لە کاتی ناردنی داواکاری" : "An error occurred while placing the order.");
      setIsPlacingOrder(false);
    }
  };

  const handleCopyOrderDetails = async (order: any) => {
    if (!order) return;
    try {
      const subtotal = (order.subtotalPrice || 0) * 1500;
      const total = subtotal + 3000;
      const itemsList = (order.items || []).map((item: any, idx: number) => 
        `📦 #${idx + 1}: ${item.title} (Qty: ${item.quantity} x ${(Number(item.price || 0) * 1500).toLocaleString()} IQD)`
      ).join('\n');

      const text = `🛒 E-BAZIRGAN ORDER DETAILS\n` +
        `👤 Buyer: ${order.customerName}\n` +
        `📞 Phone: ${order.phone}\n` +
        `📍 City: ${order.location}\n` +
        `🏠 Address: ${order.address}\n\n` +
        `📦 Items:\n${itemsList}\n\n` +
        `💰 Total: ${total.toLocaleString()} IQD COD\n` +
        `🔗 Invoice: ${window.location.origin}/?view-order=${order._id || order.id || ''}`;

      await safeCopyToClipboard(text);
      triggerCompanionReaction('happy', i18n.language === 'ku' ? "زانیارییەکان کۆپی کران!" : "Order details copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Dropdown States
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Onboarding Modal States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardName, setOnboardName] = useState('');
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardCity, setOnboardCity] = useState('Erbil');
  const [onboardAddress, setOnboardAddress] = useState('');
  const [onboardStoreName, setOnboardStoreName] = useState('');
  const [onboardError, setOnboardError] = useState('');

  // Companion state
  const [scoutMessage, setScoutMessage] = useState('Welcome back! I am your E-BAZIRGAN AI Scout. Tap any photo or start a live stream to identify local Kurdish crafts or directly source farm products!');
  const [scoutExpression, setScoutExpression] = useState<'idle' | 'happy' | 'thinking'>('idle');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'old' | 'all' | 'item' | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const safeSetLocalStorage = (key: string, value: any) => {
    try {
      const dataToStore = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, dataToStore);
    } catch (e) {
      console.warn(`safeSetLocalStorage failed for key ${key} (QuotaExceeded handled):`, e);
      try {
        localStorage.removeItem('payv_marketplace_items');
        localStorage.removeItem('payv_notifications');
        const dataToStore = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, dataToStore);
      } catch (_) {
        // Prevent throwing quota exceptions
      }
    }
  };

  // Authenticate and listen to Firebase Authentication state change
  useEffect(() => {
    // 0. Synchronous instant restoration: if user is stored in localStorage, restore state immediately
    const immediateUser = db.getCurrentUser();
    if (immediateUser && !user) {
      setUser(immediateUser);
      checkIsAdmin(immediateUser);
      safeSetLocalStorage('payv_custom_user_id', immediateUser.id);
      safeSetLocalStorage('payv_cached_user', immediateUser);
      updateBasketCount(immediateUser.id);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const isSignedOut = localStorage.getItem('payv_signed_out') === 'true';
      if (isSignedOut) {
        setUser(null);
        setBasketCount(0);
        return;
      }

      // Retrieve cached user for session restoration
      let cachedUser = db.getCurrentUser();

      // If cachedUser is missing from memory, check if payv_last_active_phone or payv_custom_user_id is saved
      if (!cachedUser) {
        const lastPhone = localStorage.getItem('payv_last_active_phone');
        const customUid = localStorage.getItem('payv_custom_user_id');
        if (lastPhone) {
          try {
            const matched = await db.findUserByPhone(lastPhone);
            if (matched) {
              cachedUser = matched;
              safeSetLocalStorage('payv_cached_user', matched);
              safeSetLocalStorage('payv_custom_user_id', matched.id);
              safeSetLocalStorage('payv_profile_completed', 'true');
            }
          } catch (_) {}
        } else if (customUid) {
          try {
            const uDoc = await getDoc(doc(firestore, 'users', customUid));
            if (uDoc.exists()) {
              cachedUser = uDoc.data() as User;
              safeSetLocalStorage('payv_cached_user', cachedUser);
              safeSetLocalStorage('payv_profile_completed', 'true');
            }
          } catch (_) {}
        }
      }

      if (firebaseUser) {
        localStorage.removeItem('payv_signed_out');
        try {
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            checkIsAdmin(userData);
            if (cachedUser && cachedUser.avatar && cachedUser.avatar !== DEFAULT_AVATAR && (!userData.avatar || userData.avatar === DEFAULT_AVATAR)) {
              userData.avatar = cachedUser.avatar;
            }
            if (cachedUser) {
              if (!userData.phone && cachedUser.phone) userData.phone = cachedUser.phone;
              if (!userData.address && cachedUser.address) userData.address = cachedUser.address;
              if (!userData.city && cachedUser.city) userData.city = cachedUser.city;
              if (!userData.category && cachedUser.category) userData.category = cachedUser.category;
            }
            setUser(userData);
            safeSetLocalStorage('payv_custom_user_id', firebaseUser.uid);
            safeSetLocalStorage('payv_cached_user', userData);
            if (userData.phone) safeSetLocalStorage('payv_last_active_phone', userData.phone);
            safeSetLocalStorage('payv_profile_completed', 'true');
            updateBasketCount(userData.id);
            
            // Sync form fields if editing profile
            setEditName(userData.name || '');
            setEditEmail(userData.email || '');
            setEditPhone(userData.phone || '');
            setEditCity(userData.city || 'Erbil');
            setEditAddress(userData.address || '');
            setEditCategory(userData.category || 'Direct Sourcing & Farm Products');
            return;
          }
        } catch (error) {
          console.error("Failed to load user profile document from Firestore:", error);
        }

        // Check if there is a valid cached custom user for this specific browser
        if (cachedUser) {
          checkIsAdmin(cachedUser);
          setUser(cachedUser);
          safeSetLocalStorage('payv_custom_user_id', cachedUser.id);
          safeSetLocalStorage('payv_cached_user', cachedUser);
          if (cachedUser.phone) safeSetLocalStorage('payv_last_active_phone', cachedUser.phone);
          safeSetLocalStorage('payv_profile_completed', 'true');
          updateBasketCount(cachedUser.id);
          setEditName(cachedUser.name || '');
          setEditEmail(cachedUser.email || '');
          setEditPhone(cachedUser.phone || '');
          setEditCity(cachedUser.city || 'Erbil');
          setEditAddress(cachedUser.address || '');
          setEditCategory(cachedUser.category || 'Direct Sourcing & Farm Products');

          if (firebaseUser.email) {
            try {
              await setDoc(doc(firestore, 'users', firebaseUser.uid), { ...cachedUser, id: firebaseUser.uid, email: firebaseUser.email }, { merge: true });
            } catch (_) {}
          }
          return;
        }

        // If user document does not exist and it's an authenticated user with an email and NO cached profile:
        if (firebaseUser.email) {
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'E-BAZIRGAN Partner',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || DEFAULT_AVATAR,
            phone: '',
            address: '',
            city: 'Erbil',
            category: 'Direct Sourcing & Farm Products'
          };
          if (firebaseUser.email === 'afsun2026app@gmail.com') {
            newUser.role = 'admin';
            newUser.isAdmin = true;
          }
          await setDoc(doc(firestore, 'users', firebaseUser.uid), newUser, { merge: true });
          setUser(newUser);
          safeSetLocalStorage('payv_custom_user_id', firebaseUser.uid);
          safeSetLocalStorage('payv_cached_user', newUser);
          safeSetLocalStorage('payv_profile_completed', 'true');
          updateBasketCount(firebaseUser.uid);
          setEditName(newUser.name);
          setEditEmail(newUser.email);
          setEditPhone(newUser.phone || '');
          setEditCity(newUser.city || 'Erbil');
          setEditAddress(newUser.address || '');
          setEditCategory(newUser.category || 'Direct Sourcing & Farm Products');
          return;
        }

        // Anonymous visitor without a registered profile -> guest mode
        setUser(null);
        setBasketCount(0);
      } else {
        // Preserved persistent session when logged in via phone, custom account or stored credentials
        if (cachedUser && !isSignedOut) {
          checkIsAdmin(cachedUser);
          setUser(cachedUser);
          safeSetLocalStorage('payv_custom_user_id', cachedUser.id);
          safeSetLocalStorage('payv_cached_user', cachedUser);
          if (cachedUser.phone) safeSetLocalStorage('payv_last_active_phone', cachedUser.phone);
          safeSetLocalStorage('payv_profile_completed', 'true');
          updateBasketCount(cachedUser.id);
          setEditName(cachedUser.name || '');
          setEditEmail(cachedUser.email || '');
          setEditPhone(cachedUser.phone || '');
          setEditCity(cachedUser.city || 'Erbil');
          setEditAddress(cachedUser.address || '');
          setEditCategory(cachedUser.category || 'Direct Sourcing & Farm Products');
        } else {
          setUser(null);
          setBasketCount(0);
        }
      }
    });

    // Automatically purge old demo items / Payv demo accounts
    db.deleteDemoItems().catch(console.error);

    return () => unsubscribe();
  }, []);

  // Listen for user verification & profile updates in real time
  useEffect(() => {
    const handleUserSync = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const targetId = detail.id || detail.userId;
      if (user && user.id === targetId) {
        setUser((prev) => {
          if (!prev) return null;
          const updated = {
            ...prev,
            ...(typeof detail.isVerified === 'boolean' ? { isVerified: detail.isVerified } : {}),
            ...(detail.name ? { name: detail.name } : {}),
            ...(detail.avatar ? { avatar: detail.avatar } : {}),
          };
          safeSetLocalStorage('payv_cached_user', updated);
          return updated;
        });
      }
    };

    window.addEventListener('payv_user_verified', handleUserSync as EventListener);
    window.addEventListener('payv_user_updated', handleUserSync as EventListener);
    return () => {
      window.removeEventListener('payv_user_verified', handleUserSync as EventListener);
      window.removeEventListener('payv_user_updated', handleUserSync as EventListener);
    };
  }, [user?.id]);

  // User Profile Dashboard / Editing States
  const [profileActiveTab, setProfileActiveTab] = useState<'dashboard' | 'edit' | 'orders' | 'store' | 'accounts' | 'analytics' | 'admin'>('dashboard');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('Erbil');
  const [editAddress, setEditAddress] = useState('');
  const [editCategory, setEditCategory] = useState('Direct Sourcing & Farm Products');
  const [editIsPublic, setEditIsPublic] = useState<boolean>(true);
  const [editStoreName, setEditStoreName] = useState('');
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<MarketplaceItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Store customisation states
  const [editStoreTheme, setEditStoreTheme] = useState<'gold' | 'neon' | 'sunset' | 'emerald' | 'minimalist'>('gold');
  const [editStoreWelcome, setEditStoreWelcome] = useState('');
  const [editStoreFeature, setEditStoreFeature] = useState('Direct Sourcing');
  const [editStoreLayout, setEditStoreLayout] = useState<'grid' | 'list'>('grid');
  const [editSellerPhone, setEditSellerPhone] = useState('');

  // Multi-accounts manager states
  const [allAccounts, setAllAccounts] = useState<User[]>([]);
  const [newAccName, setNewAccName] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccPhone, setNewAccPhone] = useState('');
  const [newAccCity, setNewAccCity] = useState('Erbil');
  const [newAccAddress, setNewAccAddress] = useState('');
  const [newAccCategory, setNewAccCategory] = useState('Direct Sourcing & Farm Products');
  const [newAccUploadedAvatar, setNewAccUploadedAvatar] = useState('');
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState<number>(1);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const isAdmin = checkIsAdmin(user);

  // Fetch live active user count from Firestore
  useEffect(() => {
    db.getActiveUserCount().then(count => {
      if (count && count > 0) {
        setActiveUserCount(count);
      }
    }).catch(e => console.warn("Could not load active user count:", e));

    if (isAdmin) {
      db.getUsers().then(users => {
        setAllUsers(users);
      });
    }
  }, [user, isAdmin]);

  const fetchUserOrders = async (targetUser?: User | null) => {
    const activeUser = targetUser || user;
    if (!activeUser) return;
    setLoadingOrders(true);
    try {
      let ordersList: any[] = [];
      const response = await fetch('/api/payv/get-orders').catch(() => null);
      if (response && response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.success && Array.isArray(data.orders)) {
          ordersList = data.orders;
        }
      }

      if (ordersList.length === 0) {
        ordersList = await db.getOrders();
      }

      let deletedIds = new Set<string>();
      try {
        const raw = localStorage.getItem('payv_deleted_order_ids');
        if (raw) deletedIds = new Set(JSON.parse(raw));
      } catch (e) {}

      const filtered = ordersList.filter((ord: any) => {
        const ordId = (ord as any)._id || ord.id;
        if (ordId && deletedIds.has(ordId)) return false;

        const userPhoneClean = activeUser.phone ? activeUser.phone.replace(/[\s+-]/g, '') : '';
        const ordPhoneClean = (ord.phone || ord.buyerPhone || ord.customerPhone || '').replace(/[\s+-]/g, '');
        
        const isPhoneMatch = userPhoneClean && ordPhoneClean && (userPhoneClean.includes(ordPhoneClean) || ordPhoneClean.includes(userPhoneClean));
        const isNameMatch = activeUser.name && (ord.customerName || ord.buyerName) && (ord.customerName || ord.buyerName).toLowerCase().trim() === activeUser.name.toLowerCase().trim();
        const isEmailMatch = activeUser.email && (ord.customerEmail || ord.buyerEmail) && (ord.customerEmail || ord.buyerEmail).toLowerCase().trim() === activeUser.email.toLowerCase().trim();
        const isUserMatch = ord.userId === activeUser.id || ord.sellerId === activeUser.id;

        return isPhoneMatch || isNameMatch || isEmailMatch || isUserMatch;
      });

      setUserOrders(filtered);
    } catch (err) {
      console.warn("User orders load notice:", err);
      const fallbackOrders = await db.getOrders();
      let deletedIds = new Set<string>();
      try {
        const raw = localStorage.getItem('payv_deleted_order_ids');
        if (raw) deletedIds = new Set(JSON.parse(raw));
      } catch (e) {}
      setUserOrders((fallbackOrders || []).filter(o => !deletedIds.has((o as any)._id || o.id)));
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      if (showProfileModal && user) {
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditPhone(user.phone || '');
        setEditCity(user.city || 'Erbil');
        setEditAddress(user.address || '');
        setEditUserAvatar(user.avatar || '');
        setEditIsPublic(user.isPublic !== false);
        setProfileSaveSuccess(false);

        // Fetch seller profile
        try {
          const profile = await db.getSellerProfile(user.id);
          if (profile) {
            setEditStoreName(sanitizeBrandName(profile.businessName));
            setEditStoreTheme(profile.storeTheme || 'gold');
            setEditStoreWelcome(profile.welcomeMessage || '');
            setEditStoreFeature(profile.storeFeature || 'Direct Sourcing');
            setEditStoreLayout(profile.storeLayout || 'grid');
            setEditSellerPhone(profile.contactPhone || user.phone || '');
          } else {
            const defaultStore = i18n.language === 'ku' ? `فرۆشگای ${user.name || 'ئی-بازرگان'}` : `${user.name || 'E-BAZIRGAN'}'s Store`;
            setEditStoreName(sanitizeBrandName(defaultStore));
            setEditStoreTheme('gold');
            setEditStoreWelcome('');
            setEditStoreFeature('Direct Sourcing');
            setEditStoreLayout('grid');
            setEditSellerPhone(user.phone || '');
          }
        } catch (e) {
          const defaultStore = i18n.language === 'ku' ? `فرۆشگای ${user.name || 'ئی-بازرگان'}` : `${user.name || 'E-BAZIRGAN'}'s Store`;
          setEditStoreName(sanitizeBrandName(defaultStore));
          setEditStoreTheme('gold');
          setEditStoreWelcome('');
          setEditStoreFeature('Direct Sourcing');
          setEditStoreLayout('grid');
          setEditSellerPhone(user.phone || '');
        }

        // Load all accounts
        try {
          const accounts = await db.getUsers();
          setAllAccounts(accounts);
        } catch (e) {
          console.warn("Failed to load accounts:", e);
        }

        // Fetch orders
        fetchUserOrders(user);
        db.getMarketplaceItems().then(items => setAllItems(items)).catch(err => console.warn("Error loading items:", err));
      }
    };
    loadProfileData();
  }, [showProfileModal, user]);

  // Load user's saved items or posts from marketplace
  useEffect(() => {
    if (showProfileModal && user) {
      if (bottomTab === 'saved') {
        setLoadingSaved(true);
        db.getMarketplaceItems()
          .then(items => {
            const filtered = items.filter(i => i.saves && i.saves.includes(user.id));
            setSavedItems(filtered);
          })
          .catch(err => console.error("Error loading saved items:", err))
          .finally(() => setLoadingSaved(false));
      } else if (bottomTab === 'posts') {
        setLoadingPosts(true);
        db.getMarketplaceItems()
          .then(items => {
            const isAdminUser = checkIsAdmin(user);
            const filtered = items.filter(i => i.userId === user.id || (isAdminUser && i.userId === 'sandbox-id'));
            setMyPosts(filtered);
          })
          .catch(err => console.error("Error loading my posts:", err))
          .finally(() => setLoadingPosts(false));
      }
    }
  }, [showProfileModal, bottomTab, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const defaultAvatar = DEFAULT_AVATAR;
    const updatedUser: User = {
      ...user,
      name: editName,
      email: editEmail,
      phone: editPhone,
      city: editCity,
      address: editAddress,
      category: editCategory,
      isPublic: editIsPublic,
      avatar: editUserAvatar || defaultAvatar
    };

    // Save user info
    db.saveCurrentUser(updatedUser);
    setUser(updatedUser);
    safeSetLocalStorage('payv_cached_user', updatedUser);
    safeSetLocalStorage('payv_custom_user_id', updatedUser.id);
    localStorage.removeItem('payv_signed_out');

    // Update or add Seller Profile too
    const fallbackStore = i18n.language === 'ku' ? `فرۆشگای ${editName || 'ئی-بازرگان'}` : `${editName || 'E-BAZIRGAN'}'s Store`;
    const updatedProfile = {
      businessName: sanitizeBrandName(editStoreName.trim() || fallbackStore),
      contactPhone: editSellerPhone || editPhone,
      bio: i18n.language === 'ku' ? 'دابەشکەری فەرمی و فرۆشگای خۆماڵی لە ناوچەکە.' : i18n.language === 'ar' ? 'موزع معتمد ومتجر محلي في المنطقة.' : 'Verified direct distributor and local boutique in the region.',
      address: editAddress,
      location: editCity,
      rating: 4.8,
      storeTheme: editStoreTheme,
      welcomeMessage: editStoreWelcome,
      storeFeature: editStoreFeature,
      storeLayout: editStoreLayout,
      logoUrl: editUserAvatar || defaultAvatar
    };
    await db.addSellerProfile(updatedProfile, user.id);

    setProfileSaveSuccess(true);
    triggerCompanionReaction('happy', i18n.language === 'ku' ? "پرۆفایلەکەت بە سەرکەوتوویی نوێکرایەوە!" : "Your profile dashboard has been successfully updated!");
    setTimeout(() => {
      setProfileSaveSuccess(false);
    }, 3000);
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!onboardName.trim()) {
      setOnboardError(i18n.language === 'ku' ? 'تکایە ناوی تەواو بنووسە' : i18n.language === 'ar' ? 'يرجى كتابة الاسم الكامل' : 'Please enter your full name');
      return;
    }
    if (!onboardPhone.trim() || onboardPhone.length < 8) {
      setOnboardError(i18n.language === 'ku' ? 'ژمارەی تەلەفۆن بە دروستی بنووسە' : i18n.language === 'ar' ? 'يرجى إدخال رقم الهاتف بشكل صحيح' : 'Please enter a valid phone number');
      return;
    }
    if (!onboardAddress.trim()) {
      setOnboardError(i18n.language === 'ku' ? 'تکایە ناونیشانی تەواو بنووسە' : i18n.language === 'ar' ? 'يرجى كتابة العنوان بالكامل' : 'Please enter a full address');
      return;
    }

    setOnboardError('');

    const updatedUser: User = {
      ...user,
      name: onboardName,
      phone: onboardPhone,
      address: onboardAddress,
      city: onboardCity
    };

    // Save user info
    db.saveCurrentUser(updatedUser);
    setUser(updatedUser);
    safeSetLocalStorage('payv_cached_user', updatedUser);
    safeSetLocalStorage('payv_custom_user_id', updatedUser.id);
    localStorage.removeItem('payv_signed_out');

    // Prepopulate/register Seller Profile so they have it instantly
    const onboardFallbackStore = i18n.language === 'ku' ? `فرۆشگای ${onboardName || 'ئی-بازرگان'}` : `${onboardName || 'E-BAZIRGAN'}'s Store`;
    const initialProfile = {
      businessName: sanitizeBrandName(onboardStoreName.trim() || onboardFallbackStore),
      contactPhone: onboardPhone,
      bio: i18n.language === 'ku' ? 'دابەشکەری فەرمی و فرۆشگای خۆماڵی لە ناوچەکە.' : i18n.language === 'ar' ? 'موزع معتمد ومتجر محلي في المنطقة.' : 'Verified direct distributor and local boutique in the region.',
      address: onboardAddress,
      location: onboardCity,
      rating: 4.8
    };
    await db.addSellerProfile(initialProfile, user.id);

    setShowOnboarding(false);
    triggerCompanionReaction('happy', i18n.language === 'ku' ? "ناونیشان و دوکانی تۆ بە سەرکەوتوویی تۆمار کران! چیتر پێویست بە داخلکردنەوە ناکات." : "Your profile and store registered successfully!");
  };

  const updateBasketCount = async (userId: string) => {
    try {
      const items = await db.getBasket(userId);
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setBasketCount(totalCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchAccount = async (userId: string) => {
    localStorage.removeItem('payv_signed_out');
    const targetUser = db.switchAccount(userId);
    setUser(targetUser);
    safeSetLocalStorage('payv_custom_user_id', targetUser.id);
    safeSetLocalStorage('payv_cached_user', targetUser);
    await updateBasketCount(targetUser.id);
    const accounts = await db.getUsers();
    setAllAccounts(accounts);
    triggerCompanionReaction('happy', i18n.language === 'ku' ? "بە سەرکەوتوویی گۆڕدرا بۆ ئەژماری تر!" : "Switched to user account successfully!");
    // Sync local edit states
    setEditName(targetUser.name);
    setEditEmail(targetUser.email);
    setEditPhone(targetUser.phone || '');
    setEditCity(targetUser.city || 'Erbil');
    setEditAddress(targetUser.address || '');
    // Sync store states
    try {
      const profile = await db.getSellerProfile(targetUser.id);
      if (profile) {
        setEditStoreName(sanitizeBrandName(profile.businessName));
        setEditStoreTheme(profile.storeTheme || 'gold');
        setEditStoreWelcome(profile.welcomeMessage || '');
        setEditStoreFeature(profile.storeFeature || 'Direct Sourcing');
        setEditStoreLayout(profile.storeLayout || 'grid');
      } else {
        const defaultStore = i18n.language === 'ku' ? `فرۆشگای ${targetUser.name || 'ئی-بازرگان'}` : `${targetUser.name || 'E-BAZIRGAN'}'s Store`;
        setEditStoreName(sanitizeBrandName(defaultStore));
        setEditStoreTheme('gold');
        setEditStoreWelcome('');
        setEditStoreFeature('Direct Sourcing');
        setEditStoreLayout('grid');
      }
    } catch (e) {
      const defaultStore = i18n.language === 'ku' ? `فرۆشگای ${targetUser.name || 'ئی-بازرگان'}` : `${targetUser.name || 'E-BAZIRGAN'}'s Store`;
      setEditStoreName(sanitizeBrandName(defaultStore));
    }
    fetchUserOrders(targetUser);
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    logAuthDiagnostic('sign_in_google', 'start');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      logAuthDiagnostic('sign_in_google', 'success', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      });

      localStorage.removeItem('payv_signed_out');

      // Fetch or initialize user profile in Firestore
      let userProfile: User;
      try {
        const uDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
        if (uDoc.exists()) {
          userProfile = uDoc.data() as User;
        } else {
          userProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'E-BAZIRGAN Partner',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || DEFAULT_AVATAR,
            phone: '',
            address: '',
            city: 'Erbil',
            category: 'Direct Sourcing & Farm Products'
          };
          if (firebaseUser.email === 'afsun2026app@gmail.com') {
            userProfile.role = 'admin';
            userProfile.isAdmin = true;
          }
          await setDoc(doc(firestore, 'users', firebaseUser.uid), userProfile, { merge: true });
        }
      } catch (fsErr) {
        logAuthDiagnostic('sign_in_google', 'fallback', { notice: 'Firestore fetch fallback to basic profile' }, fsErr);
        userProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'E-BAZIRGAN Partner',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || DEFAULT_AVATAR,
          phone: '',
          address: '',
          city: 'Erbil',
          category: 'Direct Sourcing & Farm Products'
        };
      }

      checkIsAdmin(userProfile);
      await db.saveCurrentUser(userProfile);
      setUser(userProfile);

      safeSetLocalStorage('payv_custom_user_id', firebaseUser.uid);
      safeSetLocalStorage('payv_cached_user', userProfile);
      if (userProfile.phone) safeSetLocalStorage('payv_last_active_phone', userProfile.phone);
      safeSetLocalStorage('payv_profile_completed', 'true');
      updateBasketCount(firebaseUser.uid);

      setEditName(userProfile.name);
      setEditEmail(userProfile.email);
      setEditPhone(userProfile.phone || '');
      setEditCity(userProfile.city || 'Erbil');
      setEditAddress(userProfile.address || '');
      setEditCategory(userProfile.category || 'Direct Sourcing & Farm Products');

      setShowProfileModal(false);
      setToast({
        message: i18n.language === 'ku'
          ? `بەخێربێیت ${userProfile.name}! لە ڕێگەی Google چووەژوورەوە.`
          : i18n.language === 'ar'
          ? `مرحباً بك ${userProfile.name}! تم تسجيل الدخول عبر Google بنجاح.`
          : `Welcome ${userProfile.name}! Signed in with Google.`,
        type: 'success'
      });
      triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیت!" : "Welcome back!");

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      logAuthDiagnostic('sign_in_google', 'failed', {}, err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err, (i18n.language as any) || 'ku');
      setAuthError(friendlyMsg);
      triggerCompanionReaction('idle', i18n.language === 'ku' ? "کێشەیەک لە چوونەژوورەوەی گووگڵ ڕوویدا" : "Google Sign-in failed. Please retry.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    const inputVal = signInEmail.trim();
    logAuthDiagnostic('sign_in_email', 'start', { inputVal });

    // Fast path: if input looks like a phone number or password is left empty, check by phone directly
    const isLikelyPhone = !inputVal.includes('@') || /^[0-9+]+$/.test(inputVal.replace(/[\s-]/g, ''));
    if (isLikelyPhone || !signInPassword.trim()) {
      try {
        const matchedByPhone = await db.findUserByPhone(inputVal);
        if (matchedByPhone) {
          logAuthDiagnostic('sign_in_phone', 'success', { phone: inputVal, matchedId: matchedByPhone.id });
          localStorage.removeItem('payv_signed_out');
          safeSetLocalStorage('payv_custom_user_id', matchedByPhone.id);
          safeSetLocalStorage('payv_cached_user', matchedByPhone);
          safeSetLocalStorage('payv_last_active_phone', matchedByPhone.phone || inputVal);
          safeSetLocalStorage('payv_profile_completed', 'true');
          await db.saveCurrentUser(matchedByPhone);

          setUser(matchedByPhone);
          await updateBasketCount(matchedByPhone.id);

          setEditName(matchedByPhone.name);
          setEditEmail(matchedByPhone.email);
          setEditPhone(matchedByPhone.phone || '');
          setEditCity(matchedByPhone.city || 'Erbil');
          setEditAddress(matchedByPhone.address || '');
          setEditCategory(matchedByPhone.category || 'Direct Sourcing & Farm Products');

          const freshItems = await db.getMarketplaceItems();
          setAllItems(freshItems);
          const isAdminUser = checkIsAdmin(matchedByPhone);
          setMyPosts(freshItems.filter(i => i.userId === matchedByPhone.id || (isAdminUser && i.userId === 'sandbox-id')));

          setShowProfileModal(false);
          setToast({
            message: i18n.language === 'ku' ? `بەخێربێیتەوە ${matchedByPhone.name}! هەژمارەکەت کرایەوە.` : `Welcome back ${matchedByPhone.name}! Logged in successfully.`,
            type: 'success'
          });
          triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیتەوە!" : "Welcome back!");
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
          setIsAuthLoading(false);
          return;
        }
      } catch (phoneErr) {
        logAuthDiagnostic('sign_in_phone', 'fallback', { inputVal }, phoneErr);
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
      logAuthDiagnostic('sign_in_email', 'success', { uid: userCredential.user.uid, email: userCredential.user.email });
      triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیتەوە!" : "Welcome back!");
      setShowProfileModal(false);
    } catch (err: any) {
      logAuthDiagnostic('sign_in_email', 'failed', { inputVal }, err);

      // Check if signInEmail is actually a phone number or if user exists by phone number
      try {
        const matchedByPhone = await db.findUserByPhone(signInEmail);
        if (matchedByPhone) {
          logAuthDiagnostic('sign_in_phone', 'fallback', { phone: signInEmail, matchedId: matchedByPhone.id });
          localStorage.removeItem('payv_signed_out');
          safeSetLocalStorage('payv_custom_user_id', matchedByPhone.id);
          safeSetLocalStorage('payv_cached_user', matchedByPhone);
          safeSetLocalStorage('payv_last_active_phone', matchedByPhone.phone || '');
          safeSetLocalStorage('payv_profile_completed', 'true');
          await db.saveCurrentUser(matchedByPhone);

          setUser(matchedByPhone);
          await updateBasketCount(matchedByPhone.id);

          setEditName(matchedByPhone.name);
          setEditEmail(matchedByPhone.email);
          setEditPhone(matchedByPhone.phone || '');
          setEditCity(matchedByPhone.city || 'Erbil');
          setEditAddress(matchedByPhone.address || '');
          setEditCategory(matchedByPhone.category || 'Direct Sourcing & Farm Products');

          const freshItems = await db.getMarketplaceItems();
          setAllItems(freshItems);
          const isAdminUser = checkIsAdmin(matchedByPhone);
          setMyPosts(freshItems.filter(i => i.userId === matchedByPhone.id || (isAdminUser && i.userId === 'sandbox-id')));

          setShowProfileModal(false);
          setToast({
            message: i18n.language === 'ku' ? `بەخێربێیتەوە ${matchedByPhone.name}! هەژمارەکەت کرایەوە.` : `Welcome back ${matchedByPhone.name}! Logged in successfully.`,
            type: 'success'
          });
          triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیتەوە!" : "Welcome back!");
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
          setIsAuthLoading(false);
          return;
        }
      } catch (_) {}

      const friendlyMsg = getFriendlyAuthErrorMessage(err, (i18n.language as any) || 'ku');
      setAuthError(friendlyMsg);
      triggerCompanionReaction('idle', i18n.language === 'ku' ? "کێشەیەک هەیە لە چوونەژوورەوە" : "Access denied. Check credentials.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // WhatsApp OTP Countdown Timer
  useEffect(() => {
    let timer: any;
    if (waOtpCountdown > 0) {
      timer = setTimeout(() => setWaOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [waOtpCountdown]);

  const handleSendWhatsAppOtp = async (phoneToUse?: string) => {
    const raw = (phoneToUse || waPhone).trim();
    if (!raw || raw.length < 8) {
      setAuthError(i18n.language === 'ku' ? 'تکایە ژمارەی مۆبایل بە دروستی بنووسە (وەک 0750XXXXXXX)' : 'Please enter a valid phone number (e.g. 0750XXXXXXX)');
      return;
    }
    setAuthError('');
    setIsSendingWaOtp(true);
    logAuthDiagnostic('sign_in_whatsapp', 'start', { targetPhone: raw });

    try {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setSentWaOtp(generatedCode);
      setWaOtpCountdown(60);
      setWaOtpStep('input_code');

      const cleanNumber = raw.replace(/\D/g, '');
      const intlPhone = cleanNumber.startsWith('0') 
        ? '964' + cleanNumber.substring(1) 
        : (cleanNumber.startsWith('964') ? cleanNumber : '964' + cleanNumber);

      const msgText = `*پەیڤ مارکێت - E-BAZIRGAN*\nکۆدی دڵنیابوونەوەی هەژمارەکەت: *${generatedCode}*\n(ئەم کۆدە بۆ دڵنیابوونەوەی چوونەژوورەوە یان دروستکردنی هەژمارە)`;
      const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msgText)}`;

      try {
        window.open(waUrl, '_blank');
      } catch (_) {}

      logAuthDiagnostic('sign_in_whatsapp', 'success', { phone: raw, codeGenerated: true });
      setToast({
        message: i18n.language === 'ku' 
          ? `کۆدی دڵنیابوونەوەی وەتسئەپ ئامادەکرا: ${generatedCode}` 
          : `WhatsApp verification code generated: ${generatedCode}`,
        type: 'success'
      });
    } catch (err) {
      logAuthDiagnostic('sign_in_whatsapp', 'failed', { targetPhone: raw }, err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err, (i18n.language as any) || 'ku');
      setAuthError(friendlyMsg);
    } finally {
      setIsSendingWaOtp(false);
    }
  };

  const handleVerifyWhatsAppOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const entered = waOtpCode.trim();
    if (!entered || !sentWaOtp || entered !== sentWaOtp.trim()) {
      setIsAuthLoading(false);
      setAuthError(i18n.language === 'ku' ? 'کۆدی داخڵکراو هەڵەیە، تکایە دڵنیابەرەوە' : 'Invalid OTP code. Please check and retry.');
      return;
    }

    try {
      const targetPhone = waPhone.trim();
      logAuthDiagnostic('sign_in_whatsapp', 'start', { stage: 'verify', targetPhone });
      let loggedUser = await db.findUserByPhone(targetPhone);

      if (!loggedUser) {
        // Create new account automatically with this verified phone
        const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        loggedUser = {
          id: newId,
          name: `بەکارهێنەر (${targetPhone.slice(-4)})`,
          email: `${targetPhone.replace(/\D/g, '')}@payv.market`,
          phone: targetPhone,
          role: 'buyer',
          city: 'Erbil',
          address: 'کوردستان',
          category: 'Direct Sourcing & Farm Products',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newId}`,
          createdAt: Date.now()
        } as User;
        await db.saveCurrentUser(loggedUser);
      }

      localStorage.removeItem('payv_signed_out');
      safeSetLocalStorage('payv_custom_user_id', loggedUser.id);
      safeSetLocalStorage('payv_cached_user', loggedUser);
      safeSetLocalStorage('payv_last_active_phone', loggedUser.phone || targetPhone);
      safeSetLocalStorage('payv_profile_completed', 'true');
      await db.saveCurrentUser(loggedUser);

      setUser(loggedUser);
      await updateBasketCount(loggedUser.id);

      setEditName(loggedUser.name);
      setEditEmail(loggedUser.email);
      setEditPhone(loggedUser.phone || '');
      setEditCity(loggedUser.city || 'Erbil');
      setEditAddress(loggedUser.address || '');
      setEditCategory(loggedUser.category || 'Direct Sourcing & Farm Products');

      const freshItems = await db.getMarketplaceItems();
      setAllItems(freshItems);
      const isAdminUser = checkIsAdmin(loggedUser);
      setMyPosts(freshItems.filter(i => i.userId === loggedUser!.id || (isAdminUser && i.userId === 'sandbox-id')));

      setShowProfileModal(false);
      setSentWaOtp(null);
      setWaOtpCode('');
      setWaOtpStep('input_phone');

      logAuthDiagnostic('sign_in_whatsapp', 'success', { loggedUserId: loggedUser.id });
      setToast({
        message: i18n.language === 'ku' 
          ? `بە سەرکەوتوویی لە ڕێگەی وەتسئەپ چووەژوورەوە! بەخێربێیت ${loggedUser.name}` 
          : `Signed in via WhatsApp successfully! Welcome ${loggedUser.name}`,
        type: 'success'
      });
      triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیت!" : "Welcome!");

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err) {
      logAuthDiagnostic('sign_in_whatsapp', 'failed', {}, err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err, (i18n.language as any) || 'ku');
      setAuthError(friendlyMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const validateRealPhone = (phone: string): { isValid: boolean; formatted: string; error?: string } => {
    if (!phone) return { isValid: false, formatted: '', error: i18n.language === 'ku' ? 'تکایە ژمارەی مۆبایل بنووسە!' : 'Phone number is required!' };
    const clean = phone.replace(/[^\d+]/g, '');
    const digitsOnly = clean.replace(/^\+/, '');
    
    // Checks Iraqi mobile format (07xx, 7xx, 9647xx)
    const isIraqiFormat = /^(?:07|7|9647|009647)[0-9]{8,9}$/.test(digitsOnly);
    if (!isIraqiFormat) {
      return {
        isValid: false,
        formatted: clean,
        error: i18n.language === 'ku' 
          ? 'تکایە ژمارەی مۆبایلی دروستی عێراقی بنووسە! (نموونە: 07501234567)' 
          : 'Please enter a valid Iraqi phone number! (e.g., 07501234567)'
      };
    }
    
    let formattedNumber = digitsOnly;
    if (formattedNumber.startsWith('07')) {
      formattedNumber = '964' + formattedNumber.slice(1);
    } else if (formattedNumber.startsWith('7')) {
      formattedNumber = '964' + formattedNumber;
    }
    return { isValid: true, formatted: formattedNumber };
  };

  const handleCustomSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccPhone.trim() || !newAccAddress.trim()) {
      setAuthError(i18n.language === 'ku' ? "تکایە هەموو کێڵگەکان پڕبکەرەوە." : "All fields are required.");
      return;
    }

    const phoneValidation = validateRealPhone(newAccPhone);
    if (!phoneValidation.isValid) {
      setAuthError(phoneValidation.error || (i18n.language === 'ku' ? "ژمارەی مۆبایل نادروستە!" : "Invalid phone number!"));
      return;
    }

    setAuthError('');
    setIsAuthLoading(true);
    setRegisteredDuplicatePhone(null);
    logAuthDiagnostic('sign_up', 'start', { name: newAccName, phone: newAccPhone });

    try {
      localStorage.removeItem('payv_signed_out');

      // 1. If an account with this phone already exists: RESTORE IT AND LOG IN!
      const existingUser = await db.findUserByPhone(newAccPhone);
      if (existingUser) {
        if (newAccName.trim()) existingUser.name = newAccName.trim();
        if (newAccCity) existingUser.city = newAccCity;
        if (newAccAddress.trim()) existingUser.address = newAccAddress.trim();
        if (newAccCategory) existingUser.category = newAccCategory;

        checkIsAdmin(existingUser);
        await db.saveCurrentUser(existingUser);

        localStorage.removeItem('payv_signed_out');
        safeSetLocalStorage('payv_custom_user_id', existingUser.id);
        safeSetLocalStorage('payv_cached_user', existingUser);
        safeSetLocalStorage('payv_last_active_phone', existingUser.phone || newAccPhone.trim());
        safeSetLocalStorage('payv_profile_completed', 'true');

        setUser(existingUser);
        await updateBasketCount(existingUser.id);

        setEditName(existingUser.name);
        setEditEmail(existingUser.email);
        setEditPhone(existingUser.phone || '');
        setEditCity(existingUser.city || 'Erbil');
        setEditAddress(existingUser.address || '');
        setEditCategory(existingUser.category || 'Direct Sourcing & Farm Products');

        setShowAddAccountForm(false);
        setShowProfileModal(false);

        logAuthDiagnostic('sign_up', 'fallback', { existingRestored: true, id: existingUser.id });
        setToast({
          message: i18n.language === 'ku' 
            ? `بەخێربێیتەوە ${existingUser.name}! پڕۆفایلەکەت دۆزرایەوە و چالاککرا.` 
            : `Welcome back ${existingUser.name}! Your profile was restored and activated.`,
          type: 'success'
        });
        triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیتەوە! هەژمارەکەت کرایەوە." : "Welcome back!");
        if (pendingAction) {
          pendingAction();
          setPendingAction(null);
        }
        setIsAuthLoading(false);
        return;
      }

      // 2. If no existing account for this phone, create brand new account
      let uid = '';
      try {
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      } catch (authErr) {
        logAuthDiagnostic('sign_up', 'fallback', { reason: 'Anonymous auth failed, generated custom UID' }, authErr);
        uid = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      }

      const freshUser: User = {
        id: uid,
        name: newAccName.trim(),
        email: `${phoneValidation.formatted}@e-bazirgan.app`,
        phone: newAccPhone.trim(),
        city: newAccCity,
        address: newAccAddress.trim(),
        category: newAccCategory,
        avatar: DEFAULT_AVATAR
      };

      if (checkIsAdmin(freshUser)) {
        freshUser.role = 'admin';
        freshUser.isAdmin = true;
      }

      // Save user document in Firestore and local DB
      await db.saveCurrentUser(freshUser);
      await db.addAccount(freshUser);
      
      // Save in localStorage for persistence
      safeSetLocalStorage('payv_custom_user_id', uid);
      safeSetLocalStorage('payv_cached_user', freshUser);
      safeSetLocalStorage('payv_last_active_phone', freshUser.phone || '');
      safeSetLocalStorage('payv_profile_completed', 'true');
      localStorage.removeItem('payv_signed_out');

      setUser(freshUser);
      await updateBasketCount(uid);

      // Sync form inputs
      setEditName(freshUser.name);
      setEditEmail(freshUser.email);
      setEditPhone(freshUser.phone || '');
      setEditCity(freshUser.city || 'Erbil');
      setEditAddress(freshUser.address || '');
      setEditCategory(freshUser.category || 'Direct Sourcing & Farm Products');

      const defaultStoreName = i18n.language === 'ku' ? `فرۆشگای ${freshUser.name || 'ئی-بازرگان'}` : `${freshUser.name || 'E-BAZIRGAN'}'s Store`;
      setEditStoreName(sanitizeBrandName(defaultStoreName));
      setEditStoreTheme('gold');
      setEditStoreWelcome('');
      setEditStoreFeature('Direct Sourcing');
      setEditStoreLayout('grid');

      // Create its seller profile automatically
      await db.addSellerProfile({
        businessName: sanitizeBrandName(defaultStoreName),
        contactPhone: freshUser.phone,
        bio: i18n.language === 'ku' ? 'دابەشکەری فەرمی و فرۆشگای خۆماڵی لە ناوچەکە.' : i18n.language === 'ar' ? 'موزع معتمد ومتجر محلي في المنطقة.' : 'Verified direct distributor and local boutique in the region.',
        address: freshUser.address,
        location: freshUser.city,
        rating: 4.8,
        storeTheme: 'gold',
        welcomeMessage: '',
        storeFeature: 'Direct Sourcing',
        storeLayout: 'grid'
      }, uid);

      // Reset inputs & close modal cleanly
      setNewAccName('');
      setNewAccPhone('');
      setNewAccCity('Erbil');
      setNewAccAddress('');
      setNewAccCategory('Direct Sourcing & Farm Products');
      setShowAddAccountForm(false);
      setShowProfileModal(false);

      logAuthDiagnostic('sign_up', 'success', { userId: uid, name: freshUser.name });
      setToast({
        message: i18n.language === 'ku'
          ? `پیرۆزە! هەژمارەکەت (${freshUser.name}) بە سەرکەوتوویی دروستکرا.`
          : `Congratulations! Your account (${freshUser.name}) was created successfully.`,
        type: 'success'
      });

      triggerCompanionReaction('happy', i18n.language === 'ku' ? "هەژمارەکەت بە سەرکەوتوویی دروستکرا!" : "Account created successfully!");
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      logAuthDiagnostic('sign_up', 'failed', {}, err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err, (i18n.language as any) || 'ku');
      setAuthError(friendlyMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDeleteAccount = async (targetId: string, targetUserObj?: User) => {
    if (targetId === 'purge_batch_completed') {
      try {
        const freshUsers = await db.getUsers();
        setAllAccounts(freshUsers);
        const freshItems = await db.getMarketplaceItems();
        setAllItems(freshItems);
      } catch (_) {}
      return;
    }
    try {
      const updatedList = await db.deleteAccount(targetId, targetUserObj);
      setAllAccounts(updatedList);
      setAllItems(prev => prev.filter(i => i.userId !== targetId && i.sellerId !== targetId));
      
      // If we deleted our own active account, sign out completely
      const isSelf = user && (
        user.id === targetId || 
        (targetUserObj && targetUserObj.id === user.id) || 
        (user.phone && targetUserObj?.phone && user.phone.replace(/\D/g, '') === targetUserObj.phone.replace(/\D/g, ''))
      );

      if (isSelf) {
        localStorage.removeItem('payv_custom_user_id');
        localStorage.removeItem('payv_cached_user');
        localStorage.removeItem('payv_last_active_phone');
        localStorage.setItem('payv_signed_out', 'true');
        setUser(null);
        setShowProfileModal(false);
        setBasketCount(0);
        setCartItems([]);
        try {
          await signOut(auth);
        } catch (_) {}
        setToast({
          message: i18n.language === 'ku' ? 'هەژمارەکەت بە سەرکەوتوویی بە یەکجاری سڕایەوە.' : 'Your account has been deleted successfully.',
          type: 'success'
        });
        triggerCompanionReaction('happy', i18n.language === 'ku' ? "هەژمارەکەت بە سەرکەوتوویی سڕایەوە." : "Account deleted successfully.");
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageDropdown(false);
    triggerCompanionReaction('happy', `Language updated successfully!`);
  };

  const triggerCompanionReaction = (expr: 'idle' | 'happy' | 'thinking', msg: string) => {
    setScoutExpression(expr);
    setScoutMessage(msg);
  };

  const notifyBasketAdded = () => {
    if (user) {
      updateBasketCount(user.id);
      triggerCompanionReaction('happy', "Fantastic choice! Sourced item added directly to your standard door-to-door cargo queue.");
    }
  };

  // Theme-specific overall containers - Dynamic Adaptable Canvas
  const bgContainers: Record<string, string> = {
    royal: "bg-[#030308]/90 text-white min-h-screen pb-24 scroll-smooth selection:bg-amber-400/30",
    dark: "bg-[#030308] text-white min-h-screen pb-24 scroll-smooth selection:bg-amber-400/30",
    midnight: "bg-[#050914] text-white min-h-screen pb-24 scroll-smooth selection:bg-blue-400/30",
    tokyo: "bg-[#070512] text-indigo-100 min-h-screen pb-24 scroll-smooth selection:bg-indigo-500/30",
    sunset: "bg-[#120614] text-orange-100 min-h-screen pb-24 scroll-smooth selection:bg-orange-500/30",
    aurora: "bg-[#04120e] text-emerald-100 min-h-screen pb-24 scroll-smooth selection:bg-emerald-500/30",
    monochrome: "bg-[#f8f9fa] text-slate-900 min-h-screen pb-24 scroll-smooth selection:bg-slate-900/20",
    rainbow: "bg-[#fbfaf8] text-slate-900 min-h-screen pb-24 scroll-smooth selection:bg-pink-500/20",
    wavy: "bg-[#faf9f6] text-slate-900 min-h-screen pb-24 scroll-smooth selection:bg-teal-500/20",
    white: "bg-white text-slate-900 min-h-screen pb-24 scroll-smooth selection:bg-indigo-500/20",
    light: "bg-white text-slate-900 min-h-screen pb-24 scroll-smooth selection:bg-indigo-500/20"
  };

  const bgStyles: Record<string, React.CSSProperties> = {
    white: {},
    light: {},
    royal: {},
    dark: {},
    midnight: {},
    tokyo: {},
    sunset: {},
    aurora: {},
    rainbow: {},
    wavy: {},
    monochrome: {}
  };

  const cleanWhiteCheckout = {
    backdrop: "bg-black/40 backdrop-blur-sm",
    modal: "bg-white border border-slate-200 text-slate-900 shadow-2xl",
    input: "bg-slate-50 border border-slate-300 text-slate-900 focus:border-indigo-500",
    select: "bg-slate-50 border border-slate-300 text-slate-900 focus:border-indigo-500",
    label: "text-slate-900 font-black",
    subLabel: "text-slate-600 font-bold",
    card: "bg-slate-50 border border-slate-200 text-slate-900 shadow-xs",
    subtotalCard: "bg-indigo-50/70 border border-indigo-100",
    title: "text-slate-900 font-black",
    highlight: "text-indigo-600 font-black",
    qtyBtn: "bg-slate-100 hover:bg-slate-200 text-slate-800",
    qtyText: "text-slate-900 font-black",
    confirmBtn: "bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white shadow-lg shadow-teal-500/25",
    closeBtn: "text-slate-400 hover:text-slate-600",
    successCard: "bg-emerald-50 border border-emerald-200",
    successText: "text-emerald-950"
  };

  const luxuryDarkCheckout = {
    backdrop: "bg-black/75 backdrop-blur-md",
    modal: "bg-[#060a16] border border-amber-400/40 text-white shadow-2xl shadow-black",
    input: "bg-[#030611] border border-amber-400/40 text-white focus:border-amber-300 placeholder-slate-400",
    select: "bg-[#030611] border border-amber-400/40 text-white focus:border-amber-300",
    label: "text-amber-300 font-black",
    subLabel: "text-slate-300 font-bold",
    card: "bg-[#0b1024] border border-amber-400/25 text-white shadow-xs",
    subtotalCard: "bg-amber-950/30 border border-amber-400/30",
    title: "text-white font-black",
    highlight: "text-amber-400 font-black",
    qtyBtn: "bg-[#141b36] hover:bg-[#1e274d] text-white",
    qtyText: "text-amber-300 font-black",
    confirmBtn: "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/25",
    closeBtn: "text-slate-400 hover:text-white",
    successCard: "bg-emerald-950/40 border border-emerald-500/40",
    successText: "text-emerald-200"
  };

  const checkoutTheme: Record<string, any> = {
    white: cleanWhiteCheckout,
    light: cleanWhiteCheckout,
    royal: luxuryDarkCheckout,
    dark: luxuryDarkCheckout,
    midnight: luxuryDarkCheckout,
    tokyo: luxuryDarkCheckout,
    sunset: luxuryDarkCheckout,
    aurora: luxuryDarkCheckout,
    rainbow: cleanWhiteCheckout,
    wavy: cleanWhiteCheckout,
    monochrome: cleanWhiteCheckout
  };

  const navbarClasses: Record<string, string> = {
    royal: "bg-[#060a16]/85 border-b border-amber-400/30 text-white backdrop-blur-xl shadow-lg shadow-black/60",
    dark: "bg-slate-950/85 border-b border-slate-800 text-white backdrop-blur-xl shadow-lg",
    midnight: "bg-[#060a18]/85 border-b border-blue-500/30 text-blue-100 backdrop-blur-xl shadow-lg",
    tokyo: "bg-[#0a071a]/85 border-b border-indigo-500/30 text-indigo-100 backdrop-blur-xl shadow-lg",
    sunset: "bg-[#180a1c]/85 border-b border-orange-500/30 text-orange-100 backdrop-blur-xl shadow-lg",
    aurora: "bg-[#051612]/85 border-b border-emerald-500/30 text-emerald-100 backdrop-blur-xl shadow-lg",
    monochrome: "bg-white/90 border-b border-slate-300 text-slate-900 backdrop-blur-xl shadow-sm",
    rainbow: "bg-white/75 border-b border-pink-200/60 text-slate-900 backdrop-blur-xl shadow-sm",
    wavy: "bg-white/80 border-b border-teal-200/60 text-slate-900 backdrop-blur-xl shadow-sm",
    white: "bg-white/95 border-b border-slate-200 text-slate-900 backdrop-blur-md shadow-xs",
    light: "bg-white/95 border-b border-slate-200 text-slate-900 backdrop-blur-md shadow-xs"
  };

  const textPrimary: Record<string, string> = {
    royal: 'text-white font-black drop-shadow-xs',
    dark: 'text-white font-black',
    midnight: 'text-blue-100 font-black',
    tokyo: 'text-indigo-100 font-black',
    sunset: 'text-orange-100 font-black',
    aurora: 'text-emerald-100 font-black',
    monochrome: 'text-slate-950 font-black',
    rainbow: 'text-slate-950 font-black',
    wavy: 'text-slate-900 font-black',
    white: 'text-slate-900 font-black',
    light: 'text-slate-900 font-black'
  };

  const handleRequireAuth = (action?: () => void) => {
    let currentUser = user;
    if (!currentUser) {
      const restored = db.getCurrentUser();
      if (restored) {
        setUser(restored);
        currentUser = restored;
      }
    }

    if (currentUser) {
      if (action) {
        action();
      }
    } else {
      if (action) {
        setPendingAction(() => action);
      }
      setShowProfileModal(true);
      triggerCompanionReaction('thinking', i18n.language === 'ku' ? "تکایە سەرەتا بچۆ ژوورەوە یان ئەژمار دروست بکە!" : "Authentication is required. Please sign in or register to proceed.");
    }
  };

  const handleGuestSignIn = async () => {
    localStorage.removeItem('payv_signed_out');
    
    const adminUser: User = DEFAULT_ADMIN_USER;

    try {
      await setDoc(doc(firestore, 'users', adminUser.id), adminUser, { merge: true });
    } catch (e) {
      console.log("Firestore admin user save skipped or offline:", e);
    }

    setUser(adminUser);
    safeSetLocalStorage('payv_cached_user', adminUser);
    await updateBasketCount(adminUser.id);
    
    setEditName(adminUser.name);
    setEditEmail(adminUser.email);
    setEditPhone(adminUser.phone || '');
    setEditCity(adminUser.city || 'Erbil');
    setEditAddress(adminUser.address || '');
    setEditStoreName(adminUser.name);
    setEditStoreTheme('gold');
    setEditStoreWelcome('بەخێربێن بۆ هەژماری فەرمی E-BAZIRGAN Direct (07501222253)');
    setEditStoreFeature('Direct Sourcing');
    setEditStoreLayout('grid');

    try {
      await db.addSellerProfile({
        businessName: adminUser.name,
        contactPhone: adminUser.phone,
        bio: 'سەرۆکی بەڕێوەبەرایەتی پلاتفۆرمی E-BAZIRGAN | Primary Admin Account 07501222253',
        address: adminUser.address,
        location: adminUser.city,
        rating: 5.0,
        storeTheme: 'gold',
        welcomeMessage: 'بەخێربێن بۆ هەژماری فەرمی E-BAZIRGAN Direct (07501222253)',
        storeFeature: 'Direct Sourcing',
        storeLayout: 'grid'
      }, adminUser.id);
    } catch (e) {
      console.log("Seller profile creation skipped:", e);
    }

    setSignInEmail('');
    setSignInPassword('');
    setAuthError('');
    
    triggerCompanionReaction('happy', i18n.language === 'ku' ? "بەخێربێیتەوە! چوونەژوورەوەی ساندبۆکس سەرکەوتوو بوو." : "Welcome back! Sandbox account is now active.");
    
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleSignOut = async () => {
    localStorage.setItem('payv_signed_out', 'true');
    localStorage.removeItem('payv_custom_user_id');
    localStorage.removeItem('payv_cached_user');
    localStorage.removeItem('payv_last_active_phone');
    setShowProfileModal(false);
    try {
      await signOut(auth);
      setUser(null);
      setBasketCount(0);
      setCartItems([]);
      setProfileActiveTab('dashboard');
      setToast({
        message: i18n.language === 'ku' ? 'بە سەرکەوتوویی لە هەژمارەکەت چوویتە دەرەوە (Sign Out).' : 'You have successfully signed out.',
        type: 'success'
      });
      triggerCompanionReaction('idle', i18n.language === 'ku' ? "دەرچووی لە ئەژمارەکەت." : "You have successfully signed out of your profile.");
    } catch (err) {
      console.error("Sign out failed:", err);
      setUser(null);
    }
  };

  const ct = checkoutTheme[theme as keyof typeof checkoutTheme] || checkoutTheme.white || checkoutTheme.royal;
  const isDarkTheme = theme === 'dark' || theme === 'royal' || theme === 'midnight' || theme === 'tokyo' || theme === 'sunset' || theme === 'aurora';

  return (
    <div className={clsx("transition-colors duration-500 relative min-h-screen", isDarkTheme && "dark", bgContainers[theme as keyof typeof bgContainers])} style={bgStyles[theme as keyof typeof bgStyles]}>
      {/* Full-screen dynamic motion wavy visual effect across the screen */}
      <DynamicMotionWavyScreen theme={theme} />
      
      {/* Primary Top Header Navigation Bar - Single Streamlined Responsive Row */}
      <nav 
        dir="ltr"
        className={clsx(
          "sticky top-0 z-[100] backdrop-blur-md border-b transition-all duration-300 px-2 sm:px-4 md:px-6 py-1.5 sm:py-2.5 flex items-center justify-between gap-1 sm:gap-3 w-full box-border max-w-full overflow-hidden",
          navbarClasses[theme as keyof typeof navbarClasses]
        )}
      >
        {/* 1. Left Side Branding - Logo and Bold E-BAZIRGAN Brand */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 selection:bg-transparent cursor-pointer group" onClick={() => setActiveTab('sourcing')}>
          <div className="shrink-0 group-hover:scale-105 transition-transform duration-200">
            <EBazirganLogo size={33} variant="badge" />
          </div>

          <div className="flex flex-col leading-none">
            <span className={clsx(
              "text-sm sm:text-base md:text-xl font-black tracking-tight uppercase font-sans select-none drop-shadow-2xs",
              isDarkTheme 
                ? "text-amber-300 drop-shadow-[0_1px_8px_rgba(251,191,36,0.3)]" 
                : "text-slate-950 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
            )}>
              E-BAZIRGAN
            </span>
            <span className={clsx(
              "text-[6px] sm:text-[7.5px] font-black tracking-[0.16em] sm:tracking-[0.25em] uppercase select-none hidden xs:inline-block leading-none mt-0.5",
              isDarkTheme ? "text-amber-400/90" : "text-amber-700"
            )}>
              DIRECT LOGISTICS
            </span>
          </div>
        </div>

        {/* 2. Right Side Controls - Language, Theme Toggle, Bell, Basket, Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 pr-0.5">
          {/* Language Dropper */}
          <div className="relative shrink-0">
            <button 
              type="button"
              onClick={() => { setShowLanguageDropdown(!showLanguageDropdown); }}
              aria-label="Select language"
              className={clsx(
                "p-1.5 sm:px-2 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer",
                isDarkTheme 
                  ? "bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300" 
                  : "bg-white/50 border border-white/60 hover:bg-white/70 text-slate-800 shadow-xs"
              )}
            >
              <Globe className={clsx("w-3.5 h-3.5 shrink-0", isDarkTheme ? "text-slate-400" : "text-slate-600")} />
              <span className="hidden md:inline truncate max-w-[60px]">{i18n.language === 'ku' ? 'کوردی' : i18n.language === 'ar' ? 'العربية' : 'EN'}</span>
            </button>
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-2xl z-[120] space-y-1">
                <button onClick={() => handleLanguageChange('en')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer">
                  🇺🇸 English
                </button>
                <button onClick={() => handleLanguageChange('ku')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer">
                  ☀️ کوردی
                </button>
                <button onClick={() => handleLanguageChange('ar')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer">
                  🇮🇶 العربية
                </button>
              </div>
            )}
          </div>

          {/* Theme Palette Button - Direct 1-Click Toggle across all themes */}
          <button 
            type="button"
            onClick={() => {
              const themeCycle = ['royal', 'monochrome', 'rainbow', 'sunset', 'tokyo', 'aurora', 'wavy'];
              const currentIndex = themeCycle.indexOf(theme);
              const nextTheme = themeCycle[(currentIndex + 1) % themeCycle.length] || 'royal';
              setTheme(nextTheme);
              localStorage.setItem('payv_active_theme', nextTheme);
              const themeNamesKu: Record<string, string> = {
                royal: 'کەنڤاسی شاهانەی نیلی، ڕەش و شریتی زێڕین چالاک کرا!',
                monochrome: 'تیمی مۆنۆکرۆمی ڕەش و سپی لەگەڵ شریتی زێڕین چالاک کرا!',
                rainbow: 'ڕەنگی نەرمی پەلکەزێڕینە (Rainbow Flow) چالاک کرا!',
                sunset: 'تیمی زەردەپەڕ و خۆرئاوابوون (Sunset Glow) چالاک کرا!',
                tokyo: 'تیمی شەوانەی تۆکیۆ (Tokyo Night) چالاک کرا!',
                aurora: 'تیمی شەبەنگی ئاورۆرا (Aurora Borealis) چالاک کرا!',
                wavy: 'تیمی شەپۆلاوی جوڵاو (Wavy Motion) چالاک کرا!'
              };
              triggerCompanionReaction(
                'happy', 
                themeNamesKu[nextTheme] || 'ڕەنگی باکگراوند گۆڕدرا!'
              );
            }}
            title={i18n.language === 'ku' ? `شێوازی ڕەنگ: ${theme} (داگرتن بۆ گۆڕین)` : `Theme: ${theme} (Click to switch)`}
            aria-label="Switch background theme"
            className={clsx(
              "p-1.5 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm active:scale-95",
              isDarkTheme 
                ? "bg-white/5 border-white/10 hover:bg-white/15 text-slate-300" 
                : "bg-white/70 border-[#e9e9e7] hover:bg-white text-slate-800 shadow-xs"
            )}
          >
            <Palette className={clsx("w-3.5 h-3.5 shrink-0", isDarkTheme ? "text-amber-400" : "text-indigo-600")} />
            <div className={clsx(
              "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white/70 shadow-xs shrink-0", 
              theme === 'royal' 
                ? "bg-gradient-to-r from-black via-[#0b0c26] to-amber-400" 
                : theme === 'monochrome'
                ? "bg-gradient-to-r from-black via-white to-amber-500"
                : theme === 'sunset'
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600"
                : theme === 'tokyo'
                ? "bg-gradient-to-r from-indigo-900 via-cyan-500 to-pink-500"
                : theme === 'aurora'
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
                : theme === 'wavy'
                ? "bg-gradient-to-r from-teal-400 via-amber-300 to-teal-600"
                : "bg-gradient-to-r from-amber-200 via-emerald-200 to-sky-200"
            )} />
            <span className={clsx("hidden lg:inline text-[11px] font-bold max-w-[90px] truncate", isDarkTheme ? "text-amber-300" : "text-slate-800")}>
              {theme === 'royal' ? 'EB Gold Silk' : 
               theme === 'monochrome' ? 'Monochrome' : 
               theme === 'sunset' ? 'Sunset Glow' :
               theme === 'tokyo' ? 'Tokyo Night' :
               theme === 'aurora' ? 'Aurora Glow' :
               theme === 'wavy' ? 'Wavy Waves' :
               'Rainbow'}
            </span>
          </button>

          {/* In-App Notifications Bell Icon Button */}
          <button 
            type="button"
            onClick={() => {
              fetchNotifications();
              setShowNotificationsModal(true);
            }}
            aria-label="Open notifications"
            className={clsx(
              "relative p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer shrink-0",
              isDarkTheme 
                ? "bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white" 
                : "bg-white/50 border border-white/60 hover:bg-white/70 text-slate-700 hover:text-slate-950 shadow-xs"
            )}
            title="Notifications & Watchlist Price Alerts"
          >
            <Bell className={clsx("w-3.5 h-3.5 sm:w-4 sm:h-4", isDarkTheme ? "text-amber-400" : "text-indigo-600")} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 text-[8px] font-black text-white rounded-full flex items-center justify-center animate-pulse shadow-md">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {/* Shopping Cart Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fetchCartItems();
              setShowCartModal(true);
            }}
            aria-label="Open cart"
            className={clsx(
              "relative min-w-[34px] min-h-[34px] sm:min-w-[40px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 z-20 active:scale-95 shadow-sm",
              isDarkTheme 
                ? "bg-white/5 border border-white/10 hover:bg-white/15 text-slate-300 hover:text-white" 
                : theme === 'rainbow'
                ? "bg-white/80 border border-pink-200 hover:bg-white text-slate-800 shadow-xs hover:border-pink-300"
                : "bg-white/50 border border-white/60 hover:bg-white/70 text-slate-700 hover:text-slate-950 shadow-xs"
            )}
            title="Basket & Checkout"
          >
            <ShoppingBasket className={clsx("w-3.5 h-3.5 sm:w-4 sm:h-4", isDarkTheme ? "text-amber-400" : "text-indigo-600")} />
            {basketCount > 0 && (
              <span className={clsx(
                "absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[8.5px] font-black rounded-full flex items-center justify-center shadow-md pointer-events-none ring-1.5 ring-white/60",
                isDarkTheme ? "bg-amber-400 text-slate-950" : "bg-gradient-to-r from-pink-500 to-rose-500 text-white"
              )}>
                {basketCount}
              </span>
            )}
          </button>

          {/* Profile User Icon button - Guaranteed 100% visible avatar with comfortable spacing */}
          <button 
            type="button"
            onClick={() => setShowProfileModal(true)}
            aria-label={user ? "Open user profile" : "Sign in or sign up"}
            className={clsx(
              "rounded-full transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-md active:scale-95 z-20",
              user 
                ? "w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-amber-400 ring-offset-1 ring-offset-black/30 bg-slate-800 overflow-hidden hover:ring-amber-300" 
                : "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/30 hover:bg-amber-400/30 text-amber-200"
            )}
            title={user ? "Sourcing Profile" : "Sign In / Sign Up"}
          >
            {user && user.avatar ? (
              <img 
                src={user.avatar} 
                className="w-full h-full rounded-full object-cover aspect-square block shrink-0" 
                alt="User Profile" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-indigo-300" />
            )}
            {!user && (
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider hidden xs:inline px-0.5 text-amber-300">
                {i18n.language === 'ku' ? 'چوونەژوورەوە' : 'Sign In'}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Primary content area container - Expanded for richer, more spacious presence */}
      <main className="relative z-10 max-w-[1680px] w-full mx-auto px-3 sm:px-6 md:px-12 lg:px-16 py-4 md:py-6">
        {/* Top Inspirational Slogan & Navigation Toolbar (Hidden during Live Streams) */}
        {activeTab !== 'lives' && activeTab !== 'livestreams' && (
          <>
            <div className="w-full text-center py-2 mb-3 select-none">
              <p className={clsx(
                "text-sm sm:text-base md:text-lg font-black tracking-tight flex items-center justify-center gap-2 transition-colors select-none",
                isDarkTheme 
                  ? "text-amber-300 drop-shadow-[0_2px_12px_rgba(251,191,36,0.4)]" 
                  : "text-[#800020] drop-shadow-sm"
              )}>
                <Sparkles className={clsx("w-4 h-4 sm:w-5 sm:h-5 animate-pulse shrink-0 drop-shadow", isDarkTheme ? "text-amber-400" : "text-amber-500")} />
                <span className="select-none">
                  {i18n.language === 'ku' 
                    ? 'ئیمپراتۆریەتی بازرگانیت دابمەزرێنە؛ بێبەرامبەرە و هەمیشە پێکەوە براوەین!' 
                    : i18n.language === 'ar'
                    ? 'ابنِ إمبراطوريتك التجارية؛ مجاناً ودائماً نربح معاً!'
                    : "Build your own business empire; it's free, and we always win together!"}
                </span>
                <Sparkles className={clsx("w-4 h-4 sm:w-5 sm:h-5 animate-pulse shrink-0 hidden sm:inline drop-shadow", isDarkTheme ? "text-amber-400" : "text-amber-500")} />
              </p>
            </div>

            {/* Top Floating Navigation Toolbar - Clear Translucent Glass ("بە رەنگی شووشە روون") */}
            <div className="w-full mb-6 flex justify-center sticky top-[56px] sm:top-[70px] z-[95] py-2">
              <nav className={clsx(
                "rounded-[2.25rem] p-2 sm:p-2.5 flex items-center justify-between gap-2 sm:gap-4 max-w-xl md:max-w-2xl w-full transition-all duration-300",
                theme === 'rainbow'
                  ? "bg-white/45 dark:bg-white/15 backdrop-blur-2xl border-2 border-pink-200/70 dark:border-pink-400/40 shadow-[0_8px_32px_0_rgba(244,114,182,0.22),inset_0_1px_2px_0_rgba(255,255,255,0.8)]"
                  : isDarkTheme
                  ? "bg-[#060a16]/85 backdrop-blur-2xl border-2 border-amber-400/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.7),inset_0_1px_2px_0_rgba(251,191,36,0.2)]"
                  : "bg-white/20 dark:bg-white/10 backdrop-blur-2xl border-2 border-white/40 dark:border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.25),inset_0_1px_2px_0_rgba(255,255,255,0.4)]"
              )}>
                <button 
                  type="button"
                  onClick={() => { setActiveTab('sourcing'); triggerCompanionReaction('idle', 'Switched to Direct Sourcing Hub.'); }}
                  aria-label="Sourcing Panel"
                  className={clsx(
                    "flex flex-col items-center gap-1.5 py-2.5 px-3 sm:px-5 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer flex-1 relative",
                    activeTab === 'sourcing' 
                      ? (isDarkTheme
                          ? "text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 border-2 border-amber-200 shadow-[0_4px_16px_rgba(251,191,36,0.35)] backdrop-blur-2xl font-black"
                          : theme === 'rainbow'
                          ? "text-indigo-950 bg-gradient-to-r from-pink-200/90 via-purple-200/90 to-sky-200/90 border-2 border-white/95 shadow-[0_4px_16px_rgba(236,72,153,0.3)] backdrop-blur-2xl font-black"
                          : "text-indigo-950 bg-white/35 border-2 border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.7)] backdrop-blur-2xl font-black")
                      : (isDarkTheme
                          ? "text-white/80 hover:text-white hover:bg-white/10 font-bold"
                          : theme === 'rainbow'
                          ? "text-slate-800 hover:text-slate-950 hover:bg-white/30 font-black"
                          : "text-slate-800/80 hover:text-slate-950 hover:bg-white/20 font-black")
                  )}
                >
                  <Compass className={clsx(
                    "w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-colors", 
                    activeTab === 'sourcing' 
                      ? (isDarkTheme ? "text-slate-950" : theme === 'rainbow' ? "text-indigo-800 drop-shadow-sm" : "text-indigo-700") 
                      : isDarkTheme ? "text-amber-400" : "text-slate-700"
                  )} />
                  <span className={clsx("text-xs sm:text-base font-black tracking-wide truncate max-w-[100px] sm:max-w-none", activeTab === 'sourcing' && isDarkTheme ? "text-slate-950" : isDarkTheme ? "text-white" : "text-slate-900")}>
                    {i18n.language === 'ku' ? 'سەرچاوە' : i18n.language === 'ar' ? 'التوريد' : t('Sourcing Panel')}
                  </span>
                </button>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('marketplace'); triggerCompanionReaction('idle', 'Browsing verified direct sourced marketplace.'); }}
                  aria-label="Marketplace"
                  className={clsx(
                    "flex flex-col items-center gap-1.5 py-2.5 px-3 sm:px-5 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer flex-1",
                    activeTab === 'marketplace' 
                      ? (isDarkTheme
                          ? "text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 border-2 border-amber-200 shadow-[0_4px_16px_rgba(251,191,36,0.35)] backdrop-blur-2xl font-black"
                          : theme === 'rainbow'
                          ? "text-purple-950 bg-gradient-to-r from-amber-200/90 via-pink-200/90 to-purple-200/90 border-2 border-white/95 shadow-[0_4px_16px_rgba(245,158,11,0.3)] backdrop-blur-2xl font-black"
                          : "text-amber-950 bg-white/35 border-2 border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.7)] backdrop-blur-2xl font-black")
                      : (isDarkTheme
                          ? "text-white/80 hover:text-white hover:bg-white/10 font-bold"
                          : theme === 'rainbow'
                          ? "text-slate-800 hover:text-slate-950 hover:bg-white/30 font-black"
                          : "text-slate-800/80 hover:text-slate-950 hover:bg-white/20 font-black")
                  )}
                >
                  <ShoppingBag className={clsx(
                    "w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-colors", 
                    activeTab === 'marketplace' 
                      ? (isDarkTheme ? "text-slate-950" : theme === 'rainbow' ? "text-purple-800 drop-shadow-sm" : "text-amber-700") 
                      : isDarkTheme ? "text-amber-400" : "text-slate-700"
                  )} />
                  <span className={clsx("text-xs sm:text-base font-black tracking-wide truncate max-w-[100px] sm:max-w-none", activeTab === 'marketplace' && isDarkTheme ? "text-slate-950" : isDarkTheme ? "text-white" : "text-slate-900")}>
                    {i18n.language === 'ku' ? 'بازاڕەکان' : i18n.language === 'ar' ? 'الأسواق' : t('Marketplace')}
                  </span>
                </button>

                <button 
                  type="button"
                  onClick={() => { setActiveTab('lives'); triggerCompanionReaction('idle', 'Browsing live broadcasts.'); }}
                  aria-label="Live Streams"
                  className={clsx(
                    "flex flex-col items-center gap-1.5 py-2.5 px-3 sm:px-5 rounded-2xl transition-all hover:scale-[1.02] cursor-pointer flex-1 relative",
                    activeTab === 'lives' 
                      ? (isDarkTheme
                          ? "text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 border-2 border-amber-200 shadow-[0_4px_16px_rgba(251,191,36,0.35)] backdrop-blur-2xl font-black"
                          : theme === 'rainbow'
                          ? "text-rose-950 bg-gradient-to-r from-rose-200/90 via-pink-200/90 to-purple-200/90 border-2 border-white/95 shadow-[0_4px_16px_rgba(244,63,94,0.3)] backdrop-blur-2xl font-black"
                          : "text-rose-950 bg-white/35 border-2 border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.7)] backdrop-blur-2xl font-black")
                      : (isDarkTheme
                          ? "text-white/80 hover:text-white hover:bg-white/10 font-bold"
                          : theme === 'rainbow'
                          ? "text-slate-800 hover:text-slate-950 hover:bg-white/30 font-black"
                          : "text-slate-800/80 hover:text-slate-950 hover:bg-white/20 font-black")
                  )}
                >
                  <Radio className={clsx("w-5 h-5 sm:w-6 sm:h-6 shrink-0 animate-pulse text-red-500", activeTab === 'lives' && isDarkTheme ? "text-slate-950" : activeTab === 'lives' ? "text-rose-600" : isDarkTheme ? "text-red-400" : "text-slate-700")} />
                  <span className="absolute top-1 right-2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className={clsx("text-xs sm:text-base font-black tracking-wide truncate max-w-[100px] sm:max-w-none", activeTab === 'lives' && isDarkTheme ? "text-slate-950" : isDarkTheme ? "text-white" : "text-slate-900")}>
                    {i18n.language === 'ku' ? 'پەخشە ڕاستەوخۆکان' : i18n.language === 'ar' ? 'البثوث المباشرة' : 'Live Streams'}
                  </span>
                </button>
              </nav>
            </div>
      </>
    )}

        {/* Active Tab View routers */}
        <div className={activeTab === 'sourcing' ? 'block space-y-8' : 'hidden'}>
          <SourcingHub 
            user={user} 
            theme={theme} 
            autoOpenLiveStudio={autoOpenLiveStudio}
            onSearchChange={(search) => { setSearchQuery(search); }}
            onSwitchToMarketplace={() => setActiveTab('marketplace')}
            onOpenSellerProfile={handleOpenPublicProfile}
            onTriggerPet={notifyBasketAdded}
            onRequireAuth={handleRequireAuth}
          />
        </div>

        <div className={activeTab === 'marketplace' ? 'block' : 'hidden'}>
          <Marketplace 
            user={user} 
            onRequireAuth={handleRequireAuth} 
            theme={theme}
            initialSearchQuery={searchQuery}
            targetSelectedItemId={targetSelectedItemId}
            onClearTargetSelectedItemId={() => setTargetSelectedItemId(null)}
            onOpenLiveSession={(session) => {
              setGlobalLiveSession(session);
              setIsGlobalLiveMinimized(false);
            }}
            onOpenSeller={(sellerId) => {
              triggerCompanionReaction('happy', "Opening certified merchant profile overlay.");
            }}
            onOpenSellerProfile={handleOpenPublicProfile}
            onOpenMessaging={(sellerId, itemCtx) => {
              setTargetMessagingSellerId(sellerId);
              setTargetMessagingItemContext(itemCtx || null);
              setShowMessagingInbox(true);
            }}
            onOpenProfile={() => {
              setProfileInitialSection('profile');
              setShowProfileModal(true);
            }}
            onTriggerPet={notifyBasketAdded}
            onDelete={(id) => {
              setDeleteAction('item');
              setDeleteId(id);
            }}
            onOpenSellerDashboard={() => {
              setProfileInitialSection('seller');
              setShowProfileModal(true);
            }}
          />
        </div>

        <div className={activeTab === 'lives' ? 'block' : 'hidden'}>
          <LiveStreamsFeed
            user={user}
            theme={theme}
            initialSessionId={activeLiveStreamId}
            onRequireAuth={handleRequireAuth}
            onOpenLiveSession={(session) => {
              setGlobalLiveSession(session);
              setIsGlobalLiveMinimized(false);
            }}
            onOpenSellerProfile={handleOpenPublicProfile}
            onBack={() => setActiveTab('marketplace')}
            onStartOwnLive={() => {
              setAutoOpenLiveStudio(true);
              setActiveTab('sourcing');
              triggerCompanionReaction('happy', 'Opening live streaming studio in Sourcing Panel.');
            }}
          />
        </div>
      </main>

      {/* Global Instagram-Style Public Profile Modal */}
      {viewingInstagramProfileId && (
        <InstagramPublicProfileModal
          sellerId={viewingInstagramProfileId}
          currentUser={user}
          onClose={() => {
            setViewingInstagramProfileId(null);
            setViewingInstagramProfileFallback(null);
          }}
          onSelectItem={(item) => {
            setViewingInstagramProfileId(null);
            setTargetSelectedItemId(item.id);
            setActiveTab('marketplace');
          }}
          onOpenMessaging={(targetSellerId, itemContext) => {
            setViewingInstagramProfileId(null);
            setTargetMessagingSellerId(targetSellerId);
            setTargetMessagingItemContext(itemContext || null);
            setShowMessagingInbox(true);
          }}
          onRequireAuth={handleRequireAuth}
          fallbackInfo={viewingInstagramProfileFallback}
        />
      )}

      {/* User Profile Sourcing Dashboard & Edit Modal - Full Screen */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-950 flex items-stretch justify-center p-0 overflow-hidden overscroll-contain">
          {user ? (
            <UserProfile
              user={user}
              items={allItems}
              orders={userOrders}
              initialSection={profileInitialSection}
              onUpdateProfile={async (updatedUser) => {
                await db.saveCurrentUser(updatedUser);
                setUser(updatedUser);
                safeSetLocalStorage('payv_cached_user', updatedUser);
                safeSetLocalStorage('payv_custom_user_id', updatedUser.id);
                if (updatedUser.phone) safeSetLocalStorage('payv_last_active_phone', updatedUser.phone);
                safeSetLocalStorage('payv_profile_completed', 'true');
                localStorage.removeItem('payv_signed_out');
                setToast({ message: i18n.language === 'ku' ? 'پرۆفایل بە سەرکەوتوویی پاشەکەوت کرا' : 'Profile successfully saved!', type: 'success' });
              }}
              onSelectItem={(item) => {
                setShowProfileModal(false);
              }}
              onAddItem={() => {
                setShowProfileModal(false);
              }}
              onDeleteItem={async (itemId) => {
                const target = allItems.find(i => i.id === itemId);
                const isOwner = Boolean(
                  user && target && (
                    target.userId === user.id ||
                    target.sellerId === user.id ||
                    (user.phone && target.sellerPhone && user.phone.replace(/\D/g, '') === target.sellerPhone.replace(/\D/g, '')) ||
                    (user.name && target.userName && user.name.trim().toLowerCase() === target.userName.trim().toLowerCase())
                  )
                );
                const isSuperAdmin = Boolean(user && (user.phone === '07501222253' || user.phone === '07746573763' || (user.phone && user.phone.replace(/\D/g, '').endsWith('7746573763')) || user.email === 'afsun2026app@gmail.com' || (user as any).role === 'admin'));
                if (!isOwner && !isSuperAdmin) {
                  setToast({ 
                    message: i18n.language === 'ku' ? 'تەنها دەتوانی پۆستی خۆت بسڕیتەوە! هەر کاربەرێک خاوەنی پڕۆفایلی خۆیەتی.' : 'You can only delete your own posts!', 
                    type: 'error' 
                  });
                  return;
                }
                await db.deleteMarketplaceItem(itemId);
                setAllItems(prev => prev.filter(i => i.id !== itemId));
                setToast({ message: i18n.language === 'ku' ? 'کاڵاکە سڕایەوە' : 'Item deleted', type: 'info' });
              }}
              onToggleLikeItem={async (itemId) => {
                if (user) {
                  await db.toggleMarketplaceLike(itemId, user.id);
                  setAllItems(prev => prev.map(i => {
                    if (i.id === itemId) {
                      const likes = i.likes || [];
                      const updatedLikes = likes.includes(user.id) ? likes.filter(id => id !== user.id) : [...likes, user.id];
                      return { ...i, likes: updatedLikes };
                    }
                    return i;
                  }));
                }
              }}
              onOpenMessages={() => {
                setShowProfileModal(false);
                setShowMessagingInbox(true);
              }}
              onEditItem={(item) => {
                setEditingProfileItem(item);
              }}
              onOpenSellerDashboard={() => {
                setProfileInitialSection('seller');
              }}
              onDeleteAccount={handleDeleteAccount}
              onSignOut={async () => {
                setShowProfileModal(false);
                await handleSignOut();
                setToast({
                  message: i18n.language === 'ku' ? "بە سەرکەوتوویی لە هەژمارەکەت دەرچوویت." : i18n.language === 'ar' ? "تم تسجيل الخروج من حسابك بنجاح." : "Signed out successfully.",
                  type: 'info'
                });
              }}
              onClose={() => setShowProfileModal(false)}
              theme={theme}
              onThemeChange={(newTheme) => {
                setTheme(newTheme);
                localStorage.setItem('payv_active_theme', newTheme);
              }}
              isAutoTimeTheme={isAutoTimeTheme}
              onToggleAutoTimeTheme={(enabled) => {
                setIsAutoTimeTheme(enabled);
                localStorage.setItem('payv_auto_time_theme', enabled ? 'true' : 'false');
                if (enabled) {
                  const info = detectLocalTimeTheme();
                  setTheme(info.theme);
                  localStorage.setItem('payv_active_theme', info.theme);
                }
              }}
              localTimeInfo={localTimeInfo}
            />
          ) : (
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 150) setShowProfileModal(false);
              }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-3 sm:p-6 max-w-md w-full shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden space-y-3 sm:space-y-4"
            >
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1 flex-shrink-0 cursor-grab active:cursor-grabbing" />
              
              <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-2 sm:pb-3 shrink-0 bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-indigo-500/15 p-4 rounded-t-3xl border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center border border-teal-300/30 shadow-lg shadow-teal-500/20">
                    <UserIcon className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xs sm:text-sm tracking-tight">
                      {i18n.language === 'ku' ? 'چوونەژوورەوەی بەکارهێنەر' : 'User Portal'}
                    </h3>
                    <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest font-mono">
                      SECURE PORTAL
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)} 
                  className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-full transition-all cursor-pointer"
                  aria-label="Close portal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                {/* Tabs for Login vs Register vs WhatsApp OTP */}
                <div className="flex gap-2 sm:gap-3 border-b border-white/5 pb-2 mb-3 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    className={clsx(
                      "text-[10px] font-black uppercase tracking-[0.15em] pb-1.5 transition-all relative cursor-pointer whitespace-nowrap",
                      authTab === 'login' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-slate-500 hover:text-white"
                    )}
                  >
                    {i18n.language === 'ku' ? 'چوونەژوورەوە' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('register'); setAuthError(''); }}
                    className={clsx(
                      "text-[10px] font-black uppercase tracking-[0.15em] pb-1.5 transition-all relative cursor-pointer whitespace-nowrap",
                      authTab === 'register' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-slate-500 hover:text-white"
                    )}
                  >
                    {i18n.language === 'ku' ? 'هەژماری نوێ' : 'Register'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('whatsapp_otp');
                      setAuthError('');
                      if (signInEmail && !signInEmail.includes('@')) {
                        setWaPhone(signInEmail);
                      } else if (newAccPhone) {
                        setWaPhone(newAccPhone);
                      }
                    }}
                    className={clsx(
                      "text-[10px] font-black uppercase tracking-[0.15em] pb-1.5 transition-all relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                      authTab === 'whatsapp_otp' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-slate-500 hover:text-white"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{i18n.language === 'ku' ? 'کۆدی وەتسئەپ' : 'WhatsApp OTP'}</span>
                  </button>
                </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar pb-2">
                {/* 1-Click Google Sign-In Button */}
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 active:scale-98 font-bold text-xs rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg shadow-white/5 border border-slate-200 disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>
                    {i18n.language === 'ku' 
                      ? 'چوونەژوورەوە بە هەژماری Google' 
                      : i18n.language === 'ar' 
                      ? 'تسجيل الدخول باستخدام Google' 
                      : 'Sign in with Google'}
                  </span>
                </button>

                <div className="relative my-2 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                  <span className="relative bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                    {i18n.language === 'ku' ? 'یاخود' : i18n.language === 'ar' ? 'أو' : 'OR'}
                  </span>
                </div>

                {/* Rich Diagnostic Error Banner */}
                {authError && (
                  <div className="p-3.5 bg-red-950/70 border border-red-500/40 text-red-200 text-xs rounded-2xl flex flex-col gap-2.5 shadow-lg animate-fade-in">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{authError}</span>
                    </div>

                    {/* Quick Recovery Alternative Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-red-500/20">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('whatsapp_otp');
                          setAuthError('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{i18n.language === 'ku' ? 'تاقیکردنەوە بە وەتسئەپ' : 'Try WhatsApp OTP'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setAuthError('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{i18n.language === 'ku' ? 'بە مۆبایل/ئیمەیڵ' : 'Use Phone/Email'}</span>
                      </button>
                    </div>

                    {registeredDuplicatePhone && (
                      <div className="space-y-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('login');
                            setSignInEmail(registeredDuplicatePhone);
                            setAuthError('');
                            setRegisteredDuplicatePhone(null);
                          }}
                          className="w-full py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {i18n.language === 'ku'
                              ? `چوونەژوورەوە بەم ژمارەیە (${registeredDuplicatePhone})`
                              : i18n.language === 'ar'
                              ? `تسجيل الدخول بهذا الرقم (${registeredDuplicatePhone})`
                              : `Sign In with (${registeredDuplicatePhone})`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {authTab === 'whatsapp_otp' ? (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
                        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-300 text-xs">
                            {i18n.language === 'ku' ? 'تەئکیدکردنەوە لە ڕێگەی وەتسئەپ (WhatsApp OTP)' : 'Direct WhatsApp OTP Verification'}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {i18n.language === 'ku'
                              ? 'ژمارەی مۆبایلەکەت بنووسە بۆ وەرگرتنی کۆدی ٦ ژمارەیی دڵنیابوونەوە بە وەتسئەپ بەبێ پێویستی بە SMS یان پاسۆرد.'
                              : 'Enter your phone number to receive a 6-digit OTP code directly via WhatsApp without SMS or password requirements.'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {i18n.language === 'ku' ? 'ژمارەی مۆبایل (عێراق / هەرێمی کوردستان)' : 'Phone Number (Iraq / Kurdistan)'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={waPhone}
                            onChange={(e) => {
                              setWaPhone(e.target.value);
                              if (authError) setAuthError('');
                            }}
                            placeholder="0750XXXXXXX"
                            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500 font-mono shadow-inner"
                          />
                          <button
                            type="button"
                            disabled={isSendingWaOtp || waOtpCountdown > 0 || !waPhone.trim()}
                            onClick={() => handleSendWhatsAppOtp()}
                            className={clsx(
                              "px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                              waOtpCountdown > 0
                                ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-white/5"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
                            )}
                          >
                            {isSendingWaOtp ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MessageCircle className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {waOtpCountdown > 0 
                                ? `${waOtpCountdown}s` 
                                : (i18n.language === 'ku' ? 'ناردنی کۆد' : 'Send OTP')}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Code preview with quick-fill & copy */}
                      {sentWaOtp && (
                        <div className="p-3 bg-slate-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 shadow-inner">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[11px] text-slate-300 font-medium">
                              {i18n.language === 'ku' ? 'کۆد:' : 'Code:'}
                            </span>
                            <span className="font-mono font-black text-sm text-emerald-400 tracking-widest bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                              {sentWaOtp}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setWaOtpCode(sentWaOtp);
                                safeCopyToClipboard(sentWaOtp);
                                setToast({
                                  message: i18n.language === 'ku' ? 'کۆد داخڵکرا!' : 'Code filled!',
                                  type: 'success'
                                });
                              }}
                              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{i18n.language === 'ku' ? 'داخڵکردنی خێرا' : 'Quick Fill'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppOtp()}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all cursor-pointer"
                              title="Open WhatsApp"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 6-digit OTP verification form */}
                      <form onSubmit={handleVerifyWhatsAppOtp} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {i18n.language === 'ku' ? 'کۆدی ٦ ژمارەیی داخڵ بکە' : 'Enter 6-Digit Code'}
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={waOtpCode}
                            onChange={(e) => setWaOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-mono text-emerald-300 placeholder-slate-700 focus:outline-none focus:border-emerald-500 shadow-inner"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isAuthLoading || waOtpCode.length < 6}
                          className={clsx(
                            "w-full py-3.5 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer",
                            waOtpCode.length >= 6 && !isAuthLoading
                              ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                          )}
                        >
                          {isAuthLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                          <span>{i18n.language === 'ku' ? 'تەئکیدکردنەوە و چوونەژوورەوە' : 'Verify & Enter Hub'}</span>
                        </button>
                      </form>
                    </div>
                  ) : authTab === 'login' ? (
                    <form onSubmit={handleEmailSignIn} className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {i18n.language === 'ku' ? 'ئیمەیڵ یان ژمارەی مۆبایل' : i18n.language === 'ar' ? 'البريد أو رقم الهاتف' : 'Email Address or Phone'}
                          </label>
                          <input
                            type="text"
                            required
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-inner font-mono"
                            placeholder={i18n.language === 'ku' ? "ئیمەیڵ یان 0750XXXXXXX" : "Email or 0750XXXXXXX"}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {i18n.language === 'ku' ? 'وشەی تێپەڕ (ئارەزوومەندانە بۆ مۆبایل)' : i18n.language === 'ar' ? 'كلمة المرور (اختياري للهاتف)' : 'Password (Optional for Phone)'}
                          </label>
                          <input
                            type="password"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 shadow-inner"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isAuthLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAuthLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        <span>{i18n.language === 'ku' ? 'بچۆ ژوورەوە' : 'Access Hub'}</span>
                      </button>

                      <div className="relative my-3 text-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                        <span className="relative bg-slate-900 px-2 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                          {i18n.language === 'ku' ? 'یاخود' : 'OR'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('whatsapp_otp');
                          if (signInEmail && !signInEmail.includes('@')) {
                            setWaPhone(signInEmail);
                          }
                        }}
                        className="w-full py-3 px-4 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>{i18n.language === 'ku' ? 'چوونەژوورەوەی خێرا بە وەتسئەپ (WhatsApp OTP)' : 'Fast Sign In via WhatsApp OTP'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCustomSignUp} className="space-y-4 animate-fade-in text-left">
                      <div className="space-y-3.5">
                        
                        {/* Full Name field */}
                        <div className="space-y-1">
                          <label htmlFor="newAccName" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {i18n.language === 'ku' ? 'ناوی تەواو' : i18n.language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                          </label>
                          <input
                            id="newAccName"
                            type="text"
                            required
                            value={newAccName}
                            onChange={(e) => setNewAccName(e.target.value)}
                            placeholder={i18n.language === 'ku' ? 'نامۆ کامەران' : i18n.language === 'ar' ? 'أحمد محمد' : 'e.g. Namo Kamaran'}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 shadow-inner"
                          />
                        </div>

                        {/* Phone Number field */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label htmlFor="newAccPhone" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {i18n.language === 'ku' ? 'ژمارەی مۆبایل' : i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                            </label>
                            <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              {i18n.language === 'ku' ? 'تەنها ۱ هەژمار بۆ هەر ژمارەیەک' : '1 Account per Phone'}
                            </span>
                          </div>
                          <input
                            id="newAccPhone"
                            type="tel"
                            required
                            value={newAccPhone}
                            onChange={(e) => {
                              setNewAccPhone(e.target.value);
                              if (registeredDuplicatePhone) setRegisteredDuplicatePhone(null);
                              if (authError) setAuthError('');
                            }}
                            placeholder="+964 750 000 0000"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
                          />
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {i18n.language === 'ku'
                              ? 'پاراستنی ئاسایش: هەر ژمارەیەکی مۆبایل تەنها بۆ دروستکردنی ۱ هەژمار بەکاردێت.'
                              : i18n.language === 'ar'
                              ? 'حماية الأمان: كل رقم هاتف يمكنه إنشاء حساب واحد فقط في النظام.'
                              : 'Security: Only 1 account is permitted per phone number.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* City dropdown */}
                          <div className="space-y-1">
                            <label htmlFor="newAccCity" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {i18n.language === 'ku' ? 'شار' : i18n.language === 'ar' ? 'المدينة' : 'Sourcing Location (City)'}
                            </label>
                            <select
                              id="newAccCity"
                              aria-label={i18n.language === 'ku' ? 'شار' : i18n.language === 'ar' ? 'المدينة' : 'Sourcing Location (City)'}
                              value={newAccCity}
                              onChange={(e) => setNewAccCity(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                            >
                              {IRAQ_CITIES.map(city => (
                                <option key={city.id} value={city.id}>
                                  {city.en} ({i18n.language === 'ku' ? city.ku : i18n.language === 'ar' ? city.ar : city.en})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Partner Category dropdown */}
                          <div className="space-y-1">
                            <label htmlFor="newAccCategory" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {i18n.language === 'ku' ? 'پۆلێنی هاوبەش' : i18n.language === 'ar' ? 'فئة الشريك' : 'Partner Category'}
                            </label>
                            <select 
                              id="newAccCategory"
                              aria-label={i18n.language === 'ku' ? 'پۆلێنی هاوبەش' : i18n.language === 'ar' ? 'فئة الشريك' : 'Partner Category'}
                              value={newAccCategory}
                              onChange={(e) => setNewAccCategory(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                            >
                              <option value="Handmade & Artisan">
                                {i18n.language === 'ku' ? 'کارە دەستی و هونەرییەکان' : 'Handmade & Artisan'}
                              </option>
                              <option value="Local Business & Boutique">
                                {i18n.language === 'ku' ? 'پیشەی ناوخۆ' : 'Local Business & Boutique'}
                              </option>
                              <option value="Local Farm & Agriculture">
                                {i18n.language === 'ku' ? 'کێڵگە و کشتوکاڵ' : 'Local Farm & Agriculture'}
                              </option>
                              <option value="Factory & Manufacturing">
                                {i18n.language === 'ku' ? 'کارگە و بەرهەمهێنان' : 'Factory & Manufacturing'}
                              </option>
                              <option value="Wholesale & Distribution">
                                {i18n.language === 'ku' ? 'کۆفرۆش و دابەشکار' : 'Wholesale & Distribution'}
                              </option>
                              <option value="Logistics & Transporter">
                                {i18n.language === 'ku' ? 'گواستنەوە و لۆجستی' : 'Logistics & Transporter'}
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Address text input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {i18n.language === 'ku' ? 'ناونیشانی تەواو' : i18n.language === 'ar' ? 'العنوان الكامل بالتفصيل' : 'Full Address'}
                          </label>
                          <input
                            type="text"
                            required
                            value={newAccAddress}
                            onChange={(e) => setNewAccAddress(e.target.value)}
                            placeholder={i18n.language === 'ku' ? 'ناونیشانی دوکان یان شوێنی دابینکردن' : i18n.language === 'ar' ? 'عنوان المحل أو مستودع التوريد' : 'e.g. 100 Meter Road, Near Erbil Citadel'}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 shadow-inner"
                          />
                        </div>

                      </div>

                      <button
                        type="submit"
                        disabled={isAuthLoading}
                        className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAuthLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        <span>
                          {i18n.language === 'ku' 
                            ? 'تۆمارکردن و چالاککردن' 
                            : i18n.language === 'ar' 
                            ? 'تسجيل وتفعيل الحساب' 
                            : 'JOIN NETWORK'}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    )}

      {/* Public Order Link Receipt Viewer Modal */}
      {loadingPublicOrder && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md text-white">
          <div className="space-y-3 text-center">
            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-widest font-mono font-bold text-slate-300">Retrieving Sourcing Consignment...</p>
          </div>
        </div>
      )}

      {publicOrderError && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 mx-auto">
              <X className="text-rose-400 w-8 h-8" />
            </div>
            <h3 className="text-white font-black text-xl">Order Not Found</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{publicOrderError}</p>
            <button 
              onClick={() => {
                setPublicOrderError(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-all"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      )}

      {publicOrderView && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl overflow-y-auto overscroll-contain">
          {/* Background decoration */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

          <motion.div 
            ref={invoiceRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) {
                setPublicOrderView(null);
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={clsx("rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl relative space-y-6 my-8 border border-white/10 flex flex-col max-h-[92vh]", ct.modal)}
          >
            {/* Pull handle */}
            <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto mb-1 flex-shrink-0" />
            
            {/* Header */}
            <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20 shadow-inner">
                  <Truck className="text-teal-400 w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className={clsx("text-lg sm:text-xl font-black tracking-tight uppercase", ct.title)}>
                    {i18n.language === 'ku' ? 'وەسڵی گواستنەوەی E-BAZIRGAN' : 'E-BAZIRGAN Logistics Receipt'}
                  </h3>
                  <p className={clsx("text-[10px] uppercase font-black tracking-widest font-mono", ct.highlight)}>
                    Consignment Verified Gateway
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setPublicOrderView(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }} 
                aria-label="Close invoice"
                className={clsx("p-2 rounded-full transition-all cursor-pointer hover:bg-white/10", ct.closeBtn)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Status Badge */}
              <div className="text-center py-2">
                <span className="text-[11px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-1 rounded-full shadow-lg">
                  {publicOrderView.status || (i18n.language === 'ku' ? 'لە پڕۆسەی ئامادەکردندایە' : 'READY FOR PICK PACK')}
                </span>
                <p className="text-[9px] text-slate-500 font-mono mt-2 tracking-tighter uppercase font-bold">
                  Consignment ID: {publicOrderView._id || publicOrderView.id}
                </p>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={clsx("p-4 rounded-2xl border border-white/5 space-y-2.5", ct.card)}>
                  <p className={clsx("text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-1 mb-2", ct.label)}>🏪 Source Boutique</p>
                  <p className="flex justify-between items-center"><span className={clsx(ct.subLabel, "text-[10px]")}>Shop:</span> <span className="font-bold text-white text-xs">{publicOrderView.shopName || 'Boutique'}</span></p>
                  <p className="flex justify-between items-start gap-4"><span className={clsx(ct.subLabel, "text-[10px]")}>Location:</span> <span className="text-slate-300 text-[10px] text-right">{publicOrderView.shopAddress || 'Not Specified'}</span></p>
                </div>

                <div className={clsx("p-4 rounded-2xl border border-white/5 space-y-2.5", ct.card)}>
                  <p className={clsx("text-[9px] font-black uppercase tracking-widest border-b border-white/5 pb-1 mb-2", ct.label)}>👤 Buyer Details</p>
                  <p className="flex justify-between items-center"><span className={clsx(ct.subLabel, "text-[10px]")}>Name:</span> <span className="font-bold text-white text-xs">{publicOrderView.customerName}</span></p>
                  <p className="flex justify-between items-center"><span className={clsx(ct.subLabel, "text-[10px]")}>City:</span> <span className="font-bold text-indigo-400 text-xs">{publicOrderView.location}</span></p>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <p className={clsx("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", ct.label)}>
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  Sourced Items
                </p>
                <div className="space-y-2">
                  {publicOrderView.items && publicOrderView.items.map((item: any, i: number) => (
                    <div key={i} className={clsx("flex items-center gap-3 p-3 rounded-2xl border border-white/5", ct.card)}>
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/5 overflow-hidden shrink-0 shadow-inner">
                        <img 
                          src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Qty: {item.quantity} × {(Number(item.price || 0) * 1500).toLocaleString()} IQD</p>
                        {(item.size || item.color) && (
                          <p className="text-[9px] text-teal-400/80 font-bold uppercase tracking-wide mt-0.5">
                            {item.size} {item.color && ` • ${item.color}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Footer */}
              <div className={clsx("p-5 rounded-3xl space-y-3", ct.successCard)}>
                <div className="flex justify-between items-center text-xs">
                  <span className={ct.subLabel}>Subtotal:</span>
                  <span className="font-bold text-white">{(Number(publicOrderView.totalPrice || 0) * 1500).toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={ct.subLabel}>Logistics Fee (COD):</span>
                  <span className="font-bold text-teal-400">3,000 Dinar</span>
                </div>
                <div className="h-px bg-white/5 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-slate-400">Total Payable:</span>
                  <span className="text-lg font-black text-white">{(Number(publicOrderView.totalPrice || 0) * 1500 + 3000).toLocaleString()} IQD</span>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-[0.2em]">Cash on Delivery Protocol Active</p>
                </div>
              </div>
            </div>

            {/* Print / Action */}
            <div className="flex gap-3">
              <button 
                onClick={saveReceiptAsImage}
                disabled={isCapturing}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5 shadow-xl disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {isCapturing ? 'Saving...' : 'Save Receipt Photo'}
              </button>
              <button 
                onClick={() => {
                  setPublicOrderView(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/30"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Minimalist Shopping Cart & Checkout Modal - Guaranteed Topmost Overlay */}
      <AnimatePresence>
        {showCartModal && (
          <div 
            id="shopping-cart-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCartModal(false);
              }
            }}
            className="fixed inset-0 !z-[999999] w-screen h-[100dvh] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden bg-slate-900/40 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-4xl h-[94dvh] max-h-[94dvh] flex flex-col rounded-3xl overflow-hidden shadow-2xl relative border bg-white text-slate-900 border-slate-200"
            >
              <div className="w-full h-full flex flex-col p-3.5 sm:p-6 overflow-hidden relative z-10 bg-white text-slate-900">
            {/* Header - Simple, clean, balanced top bar */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0 gap-3 border-slate-200">
              {/* Back / Close button */}
              <button 
                type="button"
                onClick={() => setShowCartModal(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold shrink-0"
                title={i18n.language === 'ku' ? 'گەڕانەوە' : i18n.language === 'ar' ? 'رجوع' : 'Back'}
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600 rtl:rotate-180" />
                <span>{i18n.language === 'ku' ? 'گەڕانەوە' : i18n.language === 'ar' ? 'رجوع' : 'Back'}</span>
              </button>

              {/* Title & Item Counter */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <ShoppingBasket className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
                    {i18n.language === 'ku' ? 'سەبەتەی کڕین' : i18n.language === 'ar' ? 'سلة الشراء' : 'Shopping Basket'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold font-mono">
                    {basketCount}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button 
                type="button" 
                onClick={() => setShowCartModal(false)} 
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer active:scale-95 shrink-0"
                aria-label="Close basket modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkoutSuccess ? (
              /* Success screen with beautiful complete receipt details */
              <div className="space-y-4 animate-fade-in max-h-[75vh] overflow-y-auto pr-1">
                <div className="py-2 text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 text-emerald-400 font-black animate-pulse" />
                  </div>
                  <div>
                    <h4 className={clsx("font-extrabold text-sm sm:text-base tracking-tight uppercase", ct.successText)}>
                      {i18n.language === 'ku' ? 'بارکردنی خۆکار سەرکەوتوو بوو!' : 'Logistics Sourced Successfully!'}
                    </h4>
                    <p className={clsx("font-mono font-bold text-[9px] uppercase tracking-wider mt-0.5", ct.highlight)}>
                      {i18n.language === 'ku' ? 'ڕەوانەکرا بۆ کارگۆی لۆجستی وەتسئەپ' : 'Auto-transmitted to WhatsApp Logistics Gateway'}
                    </p>
                  </div>
                </div>

                {currentWhatsappUrl && (
                  <div className="px-2">
                    <a
                      href={currentWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer text-center animate-pulse"
                    >
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.023-5.101-2.883-6.963C16.593 1.952 14.124.93 11.5.93c-5.44 0-9.863 4.421-9.867 9.855-.001 1.745.457 3.447 1.328 4.966L1.99 21.054l5.485-1.437c1.365.744 2.822 1.137 4.306 1.137zm10.516-7.393c-.29-.145-1.71-.845-1.973-.94-.262-.097-.453-.145-.642.145-.19.29-.733.94-.897 1.129-.164.19-.327.21-.617.065-.29-.145-1.223-.45-2.33-1.437-.86-.767-1.442-1.716-1.61-2.006-.17-.29-.018-.447.127-.591.13-.13.29-.339.436-.508.145-.17.194-.29.29-.484.097-.194.048-.363-.024-.508-.073-.145-.642-1.549-.88-2.12-.23-.557-.464-.48-.642-.489-.166-.008-.354-.01-.543-.01-.19 0-.498.071-.758.354-.26.29-1.002.977-1.002 2.383 0 1.407 1.023 2.767 1.167 2.961.145.19 2.012 3.074 4.876 4.314.68.295 1.213.471 1.626.602.684.218 1.306.187 1.8.113.55-.082 1.71-.699 1.952-1.375.242-.676.242-1.256.17-1.375-.072-.12-.26-.19-.55-.335z"/>
                      </svg>
                      <span>
                        {i18n.language === 'ku' 
                          ? 'ناردنی داواکاری بۆ واتسئەپ' 
                          : i18n.language === 'ar'
                          ? 'إرسال الطلب إلى واتساب'
                          : 'Send Order to WhatsApp'}
                      </span>
                    </a>
                    
                    {/* Fallback Copy, Share & Receipt Buttons */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <button
                        onClick={() => handleCopyOrderDetails(latestPlacedOrder)}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{i18n.language === 'ku' ? 'کۆپی' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={async () => {
                          const orderId = latestPlacedOrder._id || `ORD-${Date.now().toString().slice(-6)}`;
                          const publicUrl = `${window.location.origin}/order/${orderId}`;
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: `E-BAZIRGAN Order #${orderId}`,
                                text: `Order details for ${latestPlacedOrder.customerName}`,
                                url: publicUrl,
                              });
                            } catch (err) {
                              await safeCopyToClipboard(publicUrl);
                              triggerCompanionReaction('happy', i18n.language === 'ku' ? 'بەستەری داواکاری کۆپی کرایە تێکست' : 'Public Order URL copied!');
                            }
                          } else {
                            await safeCopyToClipboard(publicUrl);
                            triggerCompanionReaction('happy', i18n.language === 'ku' ? 'بەستەری داواکاری کۆپی کرایە تێکست' : 'Public Order URL copied!');
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{i18n.language === 'ku' ? 'هاوبەشکردن' : 'Share'}</span>
                      </button>
                      <button
                        onClick={saveReceiptAsImage}
                        disabled={isCapturing}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isCapturing ? 'Saving...' : (i18n.language === 'ku' ? 'وێنە' : 'Receipt')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {latestPlacedOrder && (
                  <div ref={invoiceRef} className={clsx("rounded-2xl p-4 space-y-4 text-xs font-sans", ct.successCard)}>
                    {/* Consignment Header */}
                    <div className="border-b border-white/5 pb-2.5 flex justify-between items-center">
                      <div>
                        <p className={clsx("text-[10px] font-bold uppercase tracking-widest font-mono", ct.label)}>E-BAZIRGAN Logistics Receipt</p>
                        <p className={clsx("text-[9px] mt-0.5", ct.subLabel)}>ID: {latestPlacedOrder._id || `ORD-${Date.now().toString().slice(-6)}`}</p>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                        AUTO-DISPATCHED
                      </span>
                    </div>

                    {/* Buyer Information */}
                    <div className="space-y-1.5">
                      <p className={clsx("text-[9px] font-bold uppercase tracking-widest font-mono", ct.label)}>👤 Buyer Consignment</p>
                      <div className={clsx("p-2.5 rounded-xl space-y-1 text-[11px]", ct.card)}>
                        <p><span className={clsx(ct.subLabel, "font-medium")}>Name:</span> <span className="font-bold">{latestPlacedOrder.customerName}</span></p>
                        <p><span className={clsx(ct.subLabel, "font-medium")}>Phone:</span> <span className="font-mono">{latestPlacedOrder.phone}</span></p>
                        <p><span className={clsx(ct.subLabel, "font-medium")}>City:</span> <span>{latestPlacedOrder.location}</span></p>
                        <p><span className={clsx(ct.subLabel, "font-medium")}>Address:</span> <span>{latestPlacedOrder.address}</span></p>
                        
                        {/* Delivery Estimation based on selected city */}
                        {(() => {
                          const city = (latestPlacedOrder.location || '').toLowerCase();
                          let estText = '24 - 48 Hours';
                          if (city.includes('erbil') || city.includes('هەولێر') || city.includes('أربيل')) {
                            estText = i18n.language === 'ku' ? '24 کاتژمێر (گەیاندنی خێرا)' : 'Within 24 Hours';
                          } else if (city.includes('sulaymaniyah') || city.includes('سلێمانی')) {
                            estText = i18n.language === 'ku' ? '24 - 36 کاتژمێر' : '24 - 36 Hours';
                          } else if (city.includes('duhok') || city.includes('دهۆک') || city.includes('halabja') || city.includes('دەڵەبجە')) {
                            estText = i18n.language === 'ku' ? '36 - 48 کاتژمێر' : '36 - 48 Hours';
                          } else {
                            estText = i18n.language === 'ku' ? '2 - 3 ڕۆژ' : '2 - 3 Days';
                          }
                          return (
                            <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                              <span>🚚 {i18n.language === 'ku' ? 'کاتژمێری مەزەندەکراوی گەیاندن:' : 'Estimated Delivery:'}</span>
                              <span className="font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">{estText}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Shop Information */}
                    <div className="space-y-1.5">
                      <p className={clsx("text-[9px] font-bold uppercase tracking-widest font-mono", ct.label)}>🏪 Source Boutique</p>
                      <div className={clsx("p-2.5 rounded-xl space-y-1 text-[11px]", ct.card)}>
                        <p><span className={clsx(ct.subLabel, "font-medium")}>{i18n.language === 'ku' ? 'ناوی دوکان:' : 'Shop Name:'}</span> <span className="font-bold">{latestPlacedOrder.shopName}</span></p>
                        <p><span className={clsx(ct.subLabel, "font-medium")}>{i18n.language === 'ku' ? 'ناونیشان:' : 'Location:'}</span> <span>{latestPlacedOrder.shopAddress}</span></p>
                      </div>
                    </div>

                    {/* Ordered Items with details */}
                    <div className="space-y-2">
                      <p className={clsx("text-[9px] font-bold uppercase tracking-widest font-mono", ct.label)}>📦 Ordered Bazaar Items</p>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {latestPlacedOrder.items && latestPlacedOrder.items.map((item: any, i: number) => (
                          <div key={i} className={clsx("p-3 rounded-xl flex items-center justify-between gap-3", ct.card)}>
                            <div className="flex flex-col min-w-0">
                              <p className="font-bold truncate text-xs">{item.title}</p>
                              {(item.sellerName || item.userName) && (
                                <p className="text-[10px] text-teal-400 font-bold mt-0.5">
                                  🏪 {i18n.language === 'ku' ? 'دوکان:' : i18n.language === 'ar' ? 'المتجر:' : 'Shop:'} {item.sellerName || item.userName}
                                </p>
                              )}
                              {(item.size || item.color) && (
                                <p className={clsx("text-[9px] mt-0.5", ct.subLabel)}>
                                  {item.size && `${i18n.language === 'ku' ? 'قەبارە:' : 'Size:'} ${item.size}`} {item.color && `${i18n.language === 'ku' ? 'ڕەنگ:' : 'Color:'} ${item.color}`}
                                </p>
                              )}
                              <p className={clsx("text-[10px] mt-0.5 font-mono", ct.subLabel)}>
                                {i18n.language === 'ku' ? 'دانە:' : 'Qty:'} {item.quantity} x {(Number(item.price) * 1500).toLocaleString()} IQD
                              </p>
                            </div>
                            <span className={clsx("font-bold font-mono shrink-0", ct.highlight)}>{(Number(item.price) * Number(item.quantity) * 1500).toLocaleString()} IQD</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculations */}
                    {(() => {
                      const subtotalUsd = Number(latestPlacedOrder.subtotalPrice || 0);
                      const subtotalIqd = subtotalUsd * 1500;
                      const deliveryIqd = 4000;
                      const grandTotalIqd = subtotalIqd + deliveryIqd;

                      return (
                        <div className={clsx("p-2.5 rounded-xl font-mono text-[11px] space-y-1", ct.subtotalCard)}>
                          <div className="flex justify-between">
                            <span className={ct.subLabel}>{i18n.language === 'ku' ? 'کۆی کاڵاکان:' : i18n.language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                            <span className="font-bold">{subtotalIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={ct.subLabel}>{i18n.language === 'ku' ? 'تێچووی گەیاندن:' : i18n.language === 'ar' ? 'أجور التوصيل:' : 'Delivery Fee:'}</span>
                            <span className="text-teal-400 font-bold">4,000 {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                          </div>
                          <div className="h-px bg-white/5 my-1" />
                          <div className="flex justify-between text-xs">
                            <span className="font-extrabold font-sans">{i18n.language === 'ku' ? 'کۆی گشتی:' : i18n.language === 'ar' ? 'المجموع الكلي:' : 'Grand Total:'}</span>
                            <span className={clsx("font-black flex flex-col items-end", ct.highlight)}>
                              <span>{grandTotalIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Print & Return Controls */}
                    <div className="pt-2 text-center space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <Printer className="w-4 h-4 text-indigo-600" />
                        <span>{i18n.language === 'ku' ? 'چاپکردنی پسوڵەی گواستنەوە' : i18n.language === 'ar' ? 'طباعة فاتورة الشحن' : 'Print Invoice PDF'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutSuccess(false);
                          setLatestPlacedOrder(null);
                          setShowCartModal(false);
                        }}
                        className={clsx("w-full py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg", ct.confirmBtn)}
                      >
                        {i18n.language === 'ku' ? 'باشە، بگەڕێوە بۆ بازاڕ' : i18n.language === 'ar' ? 'متابعة التسوق' : 'Continue Sourcing'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : loadingCart ? (
              /* Loading screen */
              <div className="py-16 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className={clsx("text-[10px] uppercase font-mono tracking-widest", ct.subLabel)}>
                  {i18n.language === 'ku' ? 'بارکردنی کاڵاکان...' : i18n.language === 'ar' ? 'جاري تحميل السلة...' : 'Accessing basket items...'}
                </p>
              </div>
            ) : cartItems.length === 0 ? (
              /* Empty state */
              <div className="py-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <p className={clsx("text-sm font-bold", ct.label)}>
                  {i18n.language === 'ku' ? 'سەبەتەکەت بەتاڵە' : i18n.language === 'ar' ? 'سلة الشراء فارغة' : 'Your sourcing basket is empty'}
                </p>
                <p className={clsx("text-xs max-w-xs mx-auto", ct.subLabel)}>
                  {i18n.language === 'ku' 
                    ? 'بڕۆ بەشی بازاڕەکان و کاڵا پەسەندکراوەکانت بۆ کڕینی ڕاستەوخۆ دەستنیشان بکە.' 
                    : i18n.language === 'ar'
                    ? 'تصفح البازار والمنتجات الزراعية المميزة وقم بإضافتها هنا.'
                    : 'Add hand-crafted products or premium local harvests to your basket to begin direct delivery.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setShowCartModal(false); setActiveTab('marketplace'); }}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-slate-200"
                >
                  {i18n.language === 'ku' ? 'سەردانی بازاڕ بکە' : i18n.language === 'ar' ? 'زيارة البازار' : 'Browse Marketplace'}
                </button>
              </div>
            ) : (
              /* Cart content and checkout form */
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {/* Items list with Bulk Selection & Actions */}
                <div className="space-y-2.5">
                  {/* Compact, Clean Selection & Action Toolbar */}
                  <div className="flex items-center justify-between gap-2 py-2 px-1 border-b border-slate-200 text-xs">
                    {/* Select All Toggle */}
                    <button
                      type="button"
                      onClick={handleSelectAllCartItems}
                      className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold transition-all cursor-pointer select-none"
                    >
                      <div className={clsx(
                        "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                        cartItems.length > 0 && selectedCartItemIds.length === cartItems.length
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : selectedCartItemIds.length > 0
                          ? "bg-indigo-100 border-indigo-500 text-indigo-600"
                          : "border-slate-300 bg-slate-50"
                      )}>
                        {cartItems.length > 0 && selectedCartItemIds.length === cartItems.length && (
                          <Check className="w-3 h-3 stroke-[3]" />
                        )}
                        {cartItems.length > 0 && selectedCartItemIds.length > 0 && selectedCartItemIds.length < cartItems.length && (
                          <div className="w-2 h-0.5 bg-indigo-600 rounded-full" />
                        )}
                      </div>
                      <span>
                        {cartItems.length > 0 && selectedCartItemIds.length === cartItems.length
                          ? (i18n.language === 'ku' ? 'هەمووی لابدە' : i18n.language === 'ar' ? 'إلغاء الكل' : 'Deselect All')
                          : (i18n.language === 'ku' ? 'هەڵبژاردنی هەمووی' : i18n.language === 'ar' ? 'تحديد الكل' : 'Select All')}
                      </span>
                    </button>

                    {/* Contextual Actions */}
                    <div className="flex items-center gap-2">
                      {selectedCartItemIds.length > 0 ? (
                        <>
                          <button
                            type="button"
                            disabled={isCreatingSharedCart}
                            onClick={() => handleShareSelectedCart(selectedCartItemIds)}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{i18n.language === 'ku' ? 'هاوبەشکردن' : i18n.language === 'ar' ? 'مشاركة' : 'Share'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBulkDeleting}
                            onClick={() => {
                              setBulkRemoveType('selected');
                              setShowBulkRemoveConfirm(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{i18n.language === 'ku' ? 'سڕینەوە' : i18n.language === 'ar' ? 'حذف' : 'Delete'}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setBulkRemoveType('all');
                            setShowBulkRemoveConfirm(true);
                          }}
                          disabled={isBulkDeleting || cartItems.length === 0}
                          className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{i18n.language === 'ku' ? 'بەتاڵکردنی سەبەتە' : i18n.language === 'ar' ? 'تفريغ السلة' : 'Clear Basket'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => (
                      <BasketItemRow 
                        key={`${item.id || 'cart'}-${idx}`} 
                        item={item} 
                        user={user}
                        theme={theme} 
                        ct={ct} 
                        onUpdateQuantity={handleUpdateCartQuantity}
                        onUpdateAttributes={handleUpdateCartAttributes}
                        t={t}
                        i18n={i18n}
                        isSelected={selectedCartItemIds.includes(item.id)}
                        onToggleSelect={handleToggleSelectCartItem}
                      />
                    ))}
                  </div>
                </div>

                {/* Secure Direct Cargo checkout form */}
                <form onSubmit={handlePlaceOrder} className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="space-y-2.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <span>{i18n.language === 'ku' ? 'زانیاری گەیاندن' : i18n.language === 'ar' ? 'معلومات التوصيل' : 'Delivery Information'}</span>
                    </h4>

                    {/* Pre-filled info card with high-contrast, accessible inputs */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-slate-900 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{i18n.language === 'ku' ? 'ناوی وەرگر:' : i18n.language === 'ar' ? 'اسم المستلم:' : 'Recipient Name:'}</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            value={checkoutName}
                            onChange={(e) => setCheckoutName(e.target.value)}
                            placeholder={i18n.language === 'ku' ? 'ناوی وەرگر بنووسە' : i18n.language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                            className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-white text-slate-900 border border-slate-300 focus:border-indigo-500 focus:outline-none transition-all shadow-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{i18n.language === 'ku' ? 'ژمارەی مۆبایل:' : i18n.language === 'ar' ? 'رقم الهاتف:' : 'Phone Number:'}</span>
                          </label>
                          <input 
                            type="tel" 
                            required
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            placeholder="0750XXXXXXX"
                            className="w-full h-10 px-3 rounded-xl text-xs font-bold font-mono bg-white text-slate-900 border border-slate-300 focus:border-indigo-500 focus:outline-none transition-all text-left shadow-xs"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-1 col-span-1 sm:col-span-2">
                          <label htmlFor="checkoutCity" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{i18n.language === 'ku' ? 'شار:' : i18n.language === 'ar' ? 'المدينة:' : 'City:'}</span>
                          </label>
                          <select 
                            id="checkoutCity"
                            aria-label="Consignment City"
                            value={checkoutCity}
                            onChange={(e) => setCheckoutCity(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-white text-slate-900 border border-slate-300 focus:border-indigo-500 focus:outline-none transition-all shadow-xs"
                          >
                            {IRAQ_CITIES.map(city => (
                              <option key={city.id} value={city.id}>
                                {i18n.language === 'ku' ? city.ku : i18n.language === 'ar' ? city.ar : city.en} ({city.en})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 col-span-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{i18n.language === 'ku' ? 'ناونیشان:' : i18n.language === 'ar' ? 'العنوان:' : 'Address:'}</span>
                          </label>
                          <input 
                            type="text" 
                            required
                            value={checkoutAddress}
                            onChange={(e) => setCheckoutAddress(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl text-xs font-bold bg-white text-slate-900 border border-slate-300 focus:border-indigo-500 focus:outline-none transition-all shadow-xs"
                            placeholder={i18n.language === 'ku' ? 'گەڕەک، کۆڵان یان نیشانەی دیار' : i18n.language === 'ar' ? 'الحي، الشارع، نقطة دالة' : 'District, street, near landmark'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment option selector */}
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-emerald-900">
                        {i18n.language === 'ku' ? 'پارەدان لە کاتی وەرگرتن (کاش)' : i18n.language === 'ar' ? 'الدفع عند الاستلام' : 'Cash On Delivery'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">COD</span>
                  </div>

                  {/* Loyalty Points Redemption Toggle */}
                  {Number(user?.loyaltyPoints || 0) > 0 && (() => {
                    const getItemEffectivePrice = (i: BasketItem) => {
                      if ((i as any).resalePrice && Number((i as any).resalePrice) > 0 && Number((i as any).resalePrice) < Number(i.price)) {
                        return Number((i as any).resalePrice);
                      }
                      return Number(i.price);
                    };
                    const subtotalUsd = cartItems.reduce((sum, i) => sum + (getItemEffectivePrice(i) * i.quantity), 0);
                    const subtotalIqd = subtotalUsd * 1500;
                    const userPts = Number(user?.loyaltyPoints || 0);
                    const maxDiscountIqd = Math.min(userPts * 100, Math.floor(subtotalIqd * 0.5));
                    const ptsToUse = Math.floor(maxDiscountIqd / 100);

                    return (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                            <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                              {i18n.language === 'ku' ? 'خاڵەکانی وەفاداری (پۆینت):' : i18n.language === 'ar' ? 'نقاط المكافأة (الولاء):' : 'Loyalty Points:'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-200 font-mono font-black text-xs">
                              {userPts.toLocaleString()} pts
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={useLoyaltyPointsDiscount} 
                              onChange={(e) => setUseLoyaltyPointsDiscount(e.target.checked)} 
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                          {useLoyaltyPointsDiscount 
                            ? (i18n.language === 'ku' 
                                ? `داشکاندنی ${maxDiscountIqd.toLocaleString()} دینار جێبەجێکرا بە بەکارهێنانی ${ptsToUse} خاڵ.` 
                                : `تم تطبيق خصم ${maxDiscountIqd.toLocaleString()} دينار باستخدام ${ptsToUse} نقطة.`)
                            : (i18n.language === 'ku' 
                                ? `ئەتوانیت تا ${maxDiscountIqd.toLocaleString()} دینار داشکاندن وەربگریت بە خاڵەکانت.` 
                                : `يمكنك الحصول على خصم حتى ${maxDiscountIqd.toLocaleString()} دينار بنقاطك.`)}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Checkout calculations card */}
                  {(() => {
                    const getItemEffectivePrice = (i: BasketItem) => {
                      if ((i as any).resalePrice && Number((i as any).resalePrice) > 0 && Number((i as any).resalePrice) < Number(i.price)) {
                        return Number((i as any).resalePrice);
                      }
                      return Number(i.price);
                    };
                    const subtotalUsd = cartItems.reduce((sum, i) => sum + (getItemEffectivePrice(i) * i.quantity), 0);
                    const subtotalIqd = subtotalUsd * 1500;
                    const deliveryIqd = 4000;
                    const userPts = Number(user?.loyaltyPoints || 0);
                    const maxDiscountIqd = Math.min(userPts * 100, Math.floor(subtotalIqd * 0.5));
                    const appliedDiscountIqd = useLoyaltyPointsDiscount ? maxDiscountIqd : 0;
                    const grandTotalIqd = Math.max(0, subtotalIqd + deliveryIqd - appliedDiscountIqd);
                    const pointsWillEarn = Math.floor(Math.max(0, subtotalIqd - appliedDiscountIqd) / 1000);

                    return (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-900 shadow-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>{i18n.language === 'ku' ? 'کۆی کاڵاکان:' : i18n.language === 'ar' ? 'مجموع المواد:' : 'Subtotal Items:'}</span>
                          <span className="font-bold font-mono text-slate-900">{subtotalIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>{i18n.language === 'ku' ? 'تێچووی گەیاندن:' : i18n.language === 'ar' ? 'أجور التوصيل:' : 'Delivery Fee:'}</span>
                          <span className="font-bold text-emerald-600 font-mono">٤,٠٠٠ {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                        </div>
                        {appliedDiscountIqd > 0 && (
                          <div className="flex justify-between items-center text-amber-600 font-bold">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>{i18n.language === 'ku' ? 'داشکاندنی خاڵەکانی وەفاداری:' : i18n.language === 'ar' ? 'خصم نقاط المكافأة:' : 'Loyalty Discount:'}</span>
                            </span>
                            <span className="font-mono font-black">-{appliedDiscountIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}</span>
                          </div>
                        )}
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="flex justify-between items-center text-sm font-black text-slate-900">
                          <span>{i18n.language === 'ku' ? 'کۆی گشتی:' : i18n.language === 'ar' ? 'المجموع الكلي:' : 'Grand Total:'}</span>
                          <span className="text-base font-black text-emerald-600 font-mono">
                            {grandTotalIqd.toLocaleString()} {i18n.language === 'ku' ? 'دینار' : i18n.language === 'ar' ? 'دينار' : 'IQD'}
                          </span>
                        </div>
                        {pointsWillEarn > 0 && (
                          <div className="pt-1 flex items-center justify-end gap-1 text-[11px] text-amber-600 font-bold">
                            <span>✨ {i18n.language === 'ku' ? `+${pointsWillEarn} خاڵی پاداشت وەردەگریت دوای کڕین` : `+${pointsWillEarn} نقطة مكافأة ستضاف لحسابك`}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Submit & Share Buttons */}
                  <div className="pt-1 space-y-2">
                    <button 
                      type="submit"
                      disabled={isPlacingOrder}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-sm rounded-2xl border border-emerald-500 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20"
                    >
                      {isPlacingOrder ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{i18n.language === 'ku' ? 'تۆمارکردن...' : i18n.language === 'ar' ? 'جاري التسجيل...' : 'Processing...'}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 text-white" />
                          <span>
                            {i18n.language === 'ku' ? 'تەواوکردنی داواکاری' : i18n.language === 'ar' ? 'تأكيد الطلب' : 'Complete Order'}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Share Cart Button */}
                    <button
                      type="button"
                      disabled={isCreatingSharedCart}
                      onClick={() => handleShareSelectedCart(selectedCartItemIds.length > 0 ? selectedCartItemIds : undefined)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-indigo-700 font-bold text-xs rounded-2xl border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingSharedCart ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          <span>{i18n.language === 'ku' ? 'دروستکردنی بەستەر...' : 'Creating link...'}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {selectedCartItemIds.length > 0
                              ? (i18n.language === 'ku' 
                                  ? `هاوبەشکردنی (${selectedCartItemIds.length}) کاڵای دەستنیشانکراو` 
                                  : i18n.language === 'ar' 
                                  ? `مشاركة (${selectedCartItemIds.length}) عناصر محددة` 
                                  : `Share (${selectedCartItemIds.length}) Selected Items`)
                              : (i18n.language === 'ku' 
                                  ? 'هاوبەشکردنی سەبەتە لەگەڵ هاوڕێیان' 
                                  : i18n.language === 'ar' 
                                  ? 'مشاركة السلة مع الأصدقاء' 
                                  : 'Share Cart with Friends')}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Dynamic First-Time User Onboarding / Profile & Store Maker Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          {/* Ambient light leaks for extra luxury */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) setShowOnboarding(false);
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-900/90 border-2 border-amber-500/20 rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl relative overflow-hidden backdrop-blur-xl my-8 font-sans flex flex-col max-h-[92vh]"
          >
            {/* Pull handle */}
            <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto mb-4 flex-shrink-0 cursor-grab active:cursor-grabbing" />
            
            {/* Top golden-to-indigo shine bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-teal-400 to-indigo-500" />

            {/* Skip button at top-right */}
            <button 
              type="button" 
              onClick={() => setShowOnboarding(false)} 
              aria-label="Skip onboarding"
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/5 font-bold text-xs flex items-center gap-1"
            >
              <span>Skip</span>
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 rotate-6 hover:rotate-0 transition-transform duration-300">
                <Truck className="w-8 h-8 text-slate-950" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  {i18n.language === 'ku' ? 'بەخێربێیت بۆ پلاتفۆرمی نیشتمانی E-BAZIRGAN' : i18n.language === 'ar' ? 'مرحباً بك في منصة E-BAZIRGAN الوطنية' : 'E-BAZIRGAN National Marketplace'}
                </h3>
                <p className="text-amber-400/90 text-xs tracking-wider uppercase font-mono font-bold">
                  Profile Maker & Direct Sourcing Setup
                </p>
              </div>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                {i18n.language === 'ku' ? 'تکایە زانیارییەکانت بنووسە بۆ چالاککردنی پرۆفایل و دوکانی خۆت بە شێوەیەکی خۆکار بۆ سەرچاوەدان و کڕینی بێ کێشە.' : i18n.language === 'ar' ? 'يرجى كتابة معلوماتك لتفعيل ملفك الشخصي ومتجرك تلقائياً وتسهيل طلبات التوصيل المباشر.' : 'Please enter your information to automatically activate your direct profile and store for seamless sourcing & ordering.'}
              </p>
            </div>

            {/* Quick Language choice inside Onboarding */}
            <div className="mt-5 flex items-center justify-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/5 max-w-xs mx-auto text-[9px]">
              <span className="text-slate-500 font-bold ml-1.5 uppercase">Language:</span>
              <button type="button" onClick={() => handleLanguageChange('ku')} className={clsx("px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold", i18n.language === 'ku' ? "bg-amber-400 text-slate-950 shadow" : "text-slate-400 hover:text-white hover:bg-white/5")}>☀️ کوردی</button>
              <button type="button" onClick={() => handleLanguageChange('en')} className={clsx("px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold", i18n.language === 'en' ? "bg-indigo-500 text-white shadow" : "text-slate-400 hover:text-white hover:bg-white/5")}>🇺🇸 EN</button>
              <button type="button" onClick={() => handleLanguageChange('ar')} className={clsx("px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold", i18n.language === 'ar' ? "bg-teal-500 text-white shadow" : "text-slate-400 hover:text-white hover:bg-white/5")}>🇮🇶 العربية</button>
            </div>

            <form onSubmit={handleCompleteOnboarding} className="mt-6 space-y-4 text-left">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  {i18n.language === 'ku' ? 'ناوی تەواو (ناوی سیانی) *' : i18n.language === 'ar' ? 'الاسم الكامل *' : 'Your Full Name *'}
                </label>
                <input 
                  type="text"
                  required
                  placeholder={i18n.language === 'ku' ? 'نموونە: هێمن خالد عومەر' : 'e.g. Hemin Khalid Omer'}
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder:text-slate-600 transition-all font-sans"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  {i18n.language === 'ku' ? 'ژمارەی تەلەفۆن (مۆبایلی جێگیر) *' : i18n.language === 'ar' ? 'رقم الهاتف (الخلوي) *' : 'Phone Number (Mobile Check) *'}
                </label>
                <input 
                  type="tel"
                  required
                  placeholder="e.g. +964 770 123 4567"
                  value={onboardPhone}
                  onChange={(e) => setOnboardPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/40 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder:text-slate-600 transition-all font-mono"
                />
              </div>

              {/* Grid for city & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label htmlFor="onboardCity" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                    {i18n.language === 'ku' ? 'شار / ناوچە *' : i18n.language === 'ar' ? 'المدينة / المنطقة *' : 'City / Consignment Region *'}
                  </label>
                  <select 
                    id="onboardCity"
                    aria-label={i18n.language === 'ku' ? 'شار / ناوچە *' : i18n.language === 'ar' ? 'المدينة / المنطقة *' : 'City / Consignment Region *'}
                    value={onboardCity}
                    onChange={(e) => setOnboardCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                  >
                    {IRAQ_CITIES.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.en} ({i18n.language === 'ku' ? city.ku : i18n.language === 'ar' ? city.ar : city.en})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                    {i18n.language === 'ku' ? 'ناوی فرۆشگاکەت (ئارەزوومەندانە)' : i18n.language === 'ar' ? 'اسم متجرك الخاص (اختياري)' : 'Your Boutique/Shop Name (Optional)'}
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Kurd Sourced Direct"
                    value={onboardStoreName}
                    onChange={(e) => setOnboardStoreName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder:text-slate-600 transition-all"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  {i18n.language === 'ku' ? 'ناونیشانی تەواوی ماڵ یان ئۆفیس (شەقام، ژمارەی خانوو) *' : i18n.language === 'ar' ? 'العنوان التفصيلي للبيت أو العمل *' : 'Full Street Address (Neighborhood, House number) *'}
                </label>
                <textarea 
                  required
                  rows={2}
                  placeholder={i18n.language === 'ku' ? 'ناونیشانی تەواو بنووسە بۆ خێراکردنی گواستنەوەی کاڵاکانت' : 'e.g. Gulan Street 45, Near Empire Towers'}
                  value={onboardAddress}
                  onChange={(e) => setOnboardAddress(e.target.value)}
                  className="w-full px-4 py-2 bg-black/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder:text-slate-600 transition-all resize-none"
                />
              </div>

              {onboardError && (
                <p className="text-red-400 text-[10px] font-bold text-center bg-red-950/40 border border-red-500/20 py-2 rounded-xl font-sans animate-pulse">
                  ⚠️ {onboardError}
                </p>
              )}

              <div className="space-y-2 pt-2">
                <button 
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-teal-400 via-amber-400 to-indigo-500 hover:from-teal-500 hover:to-indigo-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xl shadow-indigo-500/10 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{i18n.language === 'ku' ? 'تۆمارکردن و دەستپێکردن' : i18n.language === 'ar' ? 'حفظ والبدء فوراً' : 'Activate E-BAZIRGAN Profile'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                </button>

                <button 
                  type="button"
                  onClick={() => setShowOnboarding(false)}
                  className="w-full py-2 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white transition-all text-[11px] font-bold uppercase tracking-wider rounded-xl cursor-pointer text-center"
                >
                  {i18n.language === 'ku' ? 'ئێستا نا، دواتر دەیڕێکبخەم' : i18n.language === 'ar' ? 'ليس الآن، سأقوم بتهيئة ذلك لاحقاً' : 'Skip & Explore Marketplace'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Print-only Invoice document */}
      {(publicOrderView || latestPlacedOrder) && (
        <div id="payv-printable-invoice">
          <div className="invoice-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '-0.05em', color: '#1e293b' }}>E-BAZIRGAN SOURCING</h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 'bold' }}>
                  Official E-Commerce Marketplace Invoice
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>CONSIGNMENT INVOICE</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>
                  ID: {(publicOrderView || latestPlacedOrder)._id || (publicOrderView || latestPlacedOrder).id || 'ORD-NEW'}
                </p>
              </div>
            </div>
          </div>

          <div className="invoice-grid">
            <div className="invoice-card">
              <h3 style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>🏪 SENDER (SOURCE BOUTIQUE)</h3>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>{(publicOrderView || latestPlacedOrder).shopName || 'Boutique Partner'}</p>
              <p style={{ margin: 0, color: '#334155' }}>{(publicOrderView || latestPlacedOrder).shopAddress || 'Erbil, Kurdistan Region'}</p>
            </div>
            <div className="invoice-card">
              <h3 style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>👤 RECEIVER (CUSTOMER DETAILS)</h3>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>{(publicOrderView || latestPlacedOrder).customerName}</p>
              <p style={{ margin: '0 0 4px 0', color: '#334155' }}>Phone: <strong>{(publicOrderView || latestPlacedOrder).phone}</strong></p>
              <p style={{ margin: '0 0 4px 0', color: '#334155' }}>City: <strong>{(publicOrderView || latestPlacedOrder).location}</strong></p>
              <p style={{ margin: 0, color: '#334155' }}>Address: {(publicOrderView || latestPlacedOrder).address}</p>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ padding: '10px' }}>Item Description</th>
                <th style={{ width: '130px', padding: '10px' }}>Variant (Size / Color)</th>
                <th style={{ width: '70px', textAlign: 'center', padding: '10px' }}>Qty</th>
                <th style={{ width: '100px', textAlign: 'right', padding: '10px' }}>Price</th>
                <th style={{ width: '100px', textAlign: 'right', padding: '10px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {((publicOrderView || latestPlacedOrder).items || []).map((item: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {(item.imageUrl || item.image) && (
                        <img 
                          src={item.imageUrl || item.image} 
                          alt={item.title} 
                          className="print-thumb"
                          style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      )}
                      <div>
                        <strong style={{ fontSize: '12px', color: '#0f172a' }}>{item.title}</strong>
                        {(item.sellerName || item.userName) && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            🏪 Shop: {item.sellerName || item.userName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px', fontSize: '11px', color: '#334155' }}>
                    {item.size && <div>Size: <strong>{item.size}</strong></div>}
                    {item.color && <div>Color: <strong>{item.color}</strong></div>}
                    {!item.size && !item.color && <span style={{ color: '#94a3b8' }}>Standard</span>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>{(Number(item.price) * 1500).toLocaleString()} IQD</td>
                  <td style={{ textAlign: 'right', padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{(Number(item.price) * Number(item.quantity) * 1500).toLocaleString()} IQD</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '30px' }}>
            <div style={{ maxWidth: '45%', fontSize: '10px', color: '#475569', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INVOICE NOTES & CONDITIONS:</p>
              <p style={{ margin: 0 }}>This is an official consignment receipt generated via the E-BAZIRGAN Sourcing Platform. Please present this invoice to your Pick Pack logistics driver upon shipment collection. Ensure item barcodes are clearly scanned.</p>
            </div>
            {(() => {
              const subVal = Number(
                publicOrderView?.subtotalPrice || 
                (publicOrderView?.totalPrice ? publicOrderView.totalPrice - 2 : 0) || 
                latestPlacedOrder?.subtotalPrice || 
                (latestPlacedOrder?.totalPrice ? latestPlacedOrder.totalPrice - 2 : 0) || 
                0
              );
              const subIqd = subVal * 1500;
              const totalIqd = subIqd + 3000;
              return (
                <div className="invoice-total-box" style={{ width: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                    <span style={{ color: '#475569' }}>Sourced Goods Subtotal:</span>
                    <strong style={{ color: '#334155' }}>{subIqd.toLocaleString()} IQD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px' }}>
                    <span style={{ color: '#475569' }}>Delivery Fee (COD):</span>
                    <span style={{ color: '#0f766e', fontWeight: 'bold' }}>3,000 Dinar</span>
                  </div>
                  <div style={{ borderTop: '1.5px solid #1e293b', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                    <span style={{ color: '#1e293b' }}>Grand Cargo Total:</span>
                    <span style={{ color: '#4f46e5', fontSize: '14px' }}>{totalIqd.toLocaleString()} Dinar</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="invoice-footer">
            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#1e293b', letterSpacing: '0.05em' }}>E-BAZIRGAN SOURCING & PREMIUM COURIER SERVICE</p>
            <p style={{ margin: 0 }}>OFFICIAL CONSIGNMENT RECEIPT • VERIFIED BY E-BAZIRGAN GATEWAY</p>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          theme={theme}
        />
      )}
      <ConfirmationDialog
        isOpen={showDeleteAccountModal}
        theme={theme}
        title={i18n.language === 'ku' ? 'دڵنیابوونەوە لە سڕینەوەی هەژمار' : i18n.language === 'ar' ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
        message={
          i18n.language === 'ku'
            ? 'ئایا دڵنیای لە سڕینەوەی هەژمارەکەت؟'
            : i18n.language === 'ar'
            ? 'هل أنت متأكد من رغبتك في حذف حسابك؟'
            : 'Are you sure you want to delete your account?'
        }
        confirmLabel={i18n.language === 'ku' ? 'بەڵێ، بسڕەوە' : i18n.language === 'ar' ? 'نعم، احذف' : 'Yes, Delete'}
        cancelLabel={i18n.language === 'ku' ? 'پاشگەزبوونەوە' : i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
        type="danger"
        onCancel={() => setShowDeleteAccountModal(false)}
        onConfirm={async () => {
          setShowDeleteAccountModal(false);
          if (!user) return;
          try {
            await deleteDoc(doc(firestore, 'users', user.id));
            await handleDeleteAccount(user.id);
            setShowProfileModal(false);
            setToast({
              message: i18n.language === 'ku' ? "هەژمارەکەت بە سەرکەوتوویی سڕایەوە." : i18n.language === 'ar' ? "تم حذف حسابك بنجاح." : "Account deleted successfully.",
              type: 'success'
            });
            triggerCompanionReaction('happy', i18n.language === 'ku' ? "هەژمارەکەت بە سەرکەوتوویی سڕایەوە." : i18n.language === 'ar' ? "تم حذف حسابك بنجاح." : "Account deleted successfully.");
          } catch (err) {
            console.error("Account deletion failed:", err);
            handleSignOut();
          }
        }}
      />
      <ConfirmationDialog
        isOpen={!!deleteId}
        theme={theme}
        title={i18n.language === 'ku' ? 'دڵنیای لە سڕینەوە؟' : i18n.language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Confirm Deletion'}
        message={
          deleteAction === 'all' 
            ? (i18n.language === 'ku' ? 'هەموو پۆستەکان دەسڕێنەوە و ئەم کارە ناگەڕێتەوە!' : i18n.language === 'ar' ? 'سيتم مسح كافة المنشورات نهائياً ولا يمكن التراجع!' : 'ALL posts will be permanently deleted!')
            : (deleteAction === 'demos'
              ? (i18n.language === 'ku' ? 'هەموو پۆستە نموونەییەکان (Demo) دەسڕێنەوە.' : i18n.language === 'ar' ? 'سيتم مسح كافة المنشورات التجريبية (Demo).' : 'All demo marketplace posts will be permanently removed.')
              : (deleteAction === 'my-all'
                ? (i18n.language === 'ku' ? 'هەموو پۆستەکانت دەسڕێنەوە و ناگەڕێتەوە!' : i18n.language === 'ar' ? 'سيتم مسح كافة منشوراتك نهائياً!' : 'All your posts will be permanently deleted!')
                : (deleteAction === 'old'
                  ? (i18n.language === 'ku' ? 'پۆستە کۆنەکان (٣٠ ڕۆژ بەسەرچوو) دەسڕێنەوە.' : i18n.language === 'ar' ? 'سيتم مسح المنشورات القديمة (أكثر من 30 يوماً).' : 'All posts older than 30 days will be deleted.')
                  : (i18n.language === 'ku' ? 'ئەم پۆستە بە هەمیشەیی دەسڕێتەوە.' : i18n.language === 'ar' ? 'سيتم مسح هذا المنشور نهائياً.' : 'This item will be permanently removed.'))))
        }
        confirmLabel={i18n.language === 'ku' ? 'سڕینەوە' : i18n.language === 'ar' ? 'حذف' : 'Delete'}
        cancelLabel={i18n.language === 'ku' ? 'پاشگەزبوونەوە' : i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
        onConfirm={async () => {
          if (!deleteId) return;
          const action = deleteAction;
          const targetId = deleteId;
          setDeleteId(null);
          setDeleteAction(null);

          try {
            if (action === 'all') {
              setToast({ message: i18n.language === 'ku' ? 'سڕینەوە دەستیپێکرد...' : i18n.language === 'ar' ? 'جاري المسح...' : 'Clearing...', type: 'info' });
              await db.deleteAllMarketplaceItems();
              setToast({ message: i18n.language === 'ku' ? 'هەموو سڕانەوە' : i18n.language === 'ar' ? 'تم مسح الكل' : 'All cleared', type: 'success' });
            } else if (action === 'demos') {
              setToast({ message: i18n.language === 'ku' ? 'سڕینەوەی دیمۆکان...' : i18n.language === 'ar' ? 'جاري مسح المنشورات التجريبية...' : 'Cleaning demos...', type: 'info' });
              const count = await db.deleteDemoItems();
              setToast({ message: i18n.language === 'ku' ? `${count} پۆستی دیمۆ سڕانەوە` : i18n.language === 'ar' ? `تم مسح ${count} منشور تجريبي` : `${count} demo items deleted`, type: 'success' });
            } else if (action === 'my-all') {
              if (!user) return;
              setToast({ message: i18n.language === 'ku' ? 'سڕینەوەی پۆستەکانت...' : i18n.language === 'ar' ? 'جاري مسح منشوراتك...' : 'Clearing your posts...', type: 'info' });
              const items = await db.getMarketplaceItems();
              const isAdminUser = checkIsAdmin(user);
              const userItems = items.filter(i => i.userId === user.id || (isAdminUser && i.userId === 'sandbox-id'));
              
              for (const item of userItems) {
                await db.deleteMarketplaceItem(item.id);
              }
              setToast({ message: i18n.language === 'ku' ? 'پۆستەکانت سڕانەوە' : i18n.language === 'ar' ? 'تم مسح منشوراتك' : 'Your posts cleared', type: 'success' });
            } else if (action === 'old') {
              setToast({ message: i18n.language === 'ku' ? 'پاککردنەوەی کۆنەکان...' : i18n.language === 'ar' ? 'جاري التنظيف...' : 'Cleaning...', type: 'info' });
              const count = await db.deleteOldMarketplaceItems(30);
              setToast({ message: i18n.language === 'ku' ? `${count} پۆستی کۆن سڕانەوە` : i18n.language === 'ar' ? `تم مسح ${count} منشور قديم` : `${count} posts deleted`, type: 'success' });
            } else {
              const items = await db.getMarketplaceItems();
              const targetItem = items.find(i => i.id === targetId);
              const isAdminUser = checkIsAdmin(user);
              const isOwner = Boolean(user && user.id && targetItem && (targetItem.userId === user.id || targetItem.sellerId === user.id));
              
              if (targetItem && !isOwner && !isAdminUser) {
                setToast({ message: i18n.language === 'ku' ? 'تەنها دەتوانی پۆستی خۆت بسڕیتەوە' : i18n.language === 'ar' ? 'يمكنك فقط حذف منشورك الخاص!' : 'You can only delete your own posts!', type: 'error' });
                return;
              }
              await db.deleteMarketplaceItem(targetId);
              setToast({ message: i18n.language === 'ku' ? 'سڕایەوە' : i18n.language === 'ar' ? 'تم الحذف' : 'Deleted', type: 'success' });
            }

            // Refresh lists for all delete actions
            const freshItems = await db.getMarketplaceItems();
            setAllItems(freshItems);
            if (user) {
              const isAdminUser = checkIsAdmin(user);
              setMyPosts(freshItems.filter(i => i.userId === user.id || (isAdminUser && i.userId === 'sandbox-id')));
            }
          } catch (err) {
            setToast({ message: 'Error: ' + (err as Error).message, type: 'error' });
          }
        }}
        onCancel={() => {
          setDeleteId(null);
          setDeleteAction(null);
        }}
        type="danger"
      />

      {/* Bulk Cart Remove Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showBulkRemoveConfirm}
        theme={theme}
        type="danger"
        title={bulkRemoveType === 'all' 
          ? (i18n.language === 'ku' ? 'سڕینەوەی تەواوی سەبەتە' : i18n.language === 'ar' ? 'تفريغ السلة بالكامل' : 'Clear Entire Cart') 
          : (i18n.language === 'ku' ? 'سڕینەوەی کاڵا دەستنیشانکراوەکان' : i18n.language === 'ar' ? 'حذف المواد المحددة' : 'Remove Selected Items')}
        message={bulkRemoveType === 'all'
          ? (i18n.language === 'ku' 
              ? `ئایا دڵنیایت لە سڕینەوەی سەرجەم (${cartItems.length}) کاڵای ناو سەبەتەکەت؟ ئەم کارە ناگەڕێتەوە.` 
              : i18n.language === 'ar' 
              ? `هل أنت متأكد من رغبتك في حذف كافة (${cartItems.length}) المواد من سلة التسوق؟` 
              : `Are you sure you want to remove all (${cartItems.length}) items from your shopping cart?`)
          : (i18n.language === 'ku' 
              ? `ئایا دڵنیایت لە سڕینەوەی (${selectedCartItemIds.length}) کاڵای دەستنیشانکراو لە سەبەتەکەت؟` 
              : i18n.language === 'ar' 
              ? `هل أنت متأكد من حذف (${selectedCartItemIds.length}) عناصر محددة من السلة؟` 
              : `Are you sure you want to remove the (${selectedCartItemIds.length}) selected items from your cart?`)}
        confirmLabel={bulkRemoveType === 'all'
          ? (i18n.language === 'ku' ? 'بەڵێ، هەمووی بسڕەوە' : i18n.language === 'ar' ? 'نعم، تفريغ الكل' : 'Yes, Clear All')
          : (i18n.language === 'ku' ? 'بەڵێ، بیسڕەوە' : i18n.language === 'ar' ? 'نعم، احذف' : 'Yes, Remove')}
        cancelLabel={i18n.language === 'ku' ? 'پاشگەزبوونەوە' : i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
        onConfirm={handleConfirmBulkRemove}
        onCancel={() => setShowBulkRemoveConfirm(false)}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onMarkAsRead={async (notifId) => {
          const effectiveUserId = user?.id || 'guest_user';
          await db.markNotificationAsRead(notifId, effectiveUserId);
          setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
        }}
        onMarkAllAsRead={async () => {
          const effectiveUserId = user?.id || 'guest_user';
          await db.markAllNotificationsAsRead(effectiveUserId);
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}
        onClearAll={async () => {
          const effectiveUserId = user?.id || 'guest_user';
          await db.clearNotifications(effectiveUserId);
          setNotifications([]);
        }}
        onSelectItem={(itemId) => {
          setTargetSelectedItemId(itemId);
          setActiveTab('marketplace');
        }}
        theme={theme}
      />

      {/* In-App Direct Messaging Inbox Modal */}
      <MessagingInbox
        isOpen={showMessagingInbox}
        onClose={() => {
          setShowMessagingInbox(false);
          setTargetMessagingSellerId(null);
          setTargetMessagingItemContext(null);
        }}
        currentUser={user}
        onRequireAuth={(cb) => {
          setPendingAction(() => cb);
          setShowProfileModal(true);
        }}
        initialTargetSellerId={targetMessagingSellerId}
        initialItemContext={targetMessagingItemContext}
        onViewItem={(itemId) => {
          setShowMessagingInbox(false);
          setActiveTab('marketplace');
        }}
        theme={theme}
      />

      {/* Edit Full Post & Price Modal from User Profile */}
      <EditPostModal
        isOpen={!!editingProfileItem}
        item={editingProfileItem}
        currentUser={user}
        theme={theme}
        onClose={() => setEditingProfileItem(null)}
        onSuccess={async (updatedItem, notifiedCount) => {
          setAllItems((prev) =>
            prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
          );
          if (user) {
            const isAdminUser = checkIsAdmin(user);
            setMyPosts((prev) =>
              prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
            );
          }
          setToast({
            message:
              i18n.language === 'ku'
                ? `پۆستەکە بە سەرکەوتوویی نوێکرایەوە! ${
                    notifiedCount > 0
                      ? `(${notifiedCount} چاودێر ئاگادارکرانەوە 🔔)`
                      : ''
                  }`
                : i18n.language === 'ar'
                ? `تم تحديث المنشور بنجاح! ${
                    notifiedCount > 0
                      ? `(تم إشعار ${notifiedCount} من المهتمين 🔔)`
                      : ''
                  }`
                : `Post updated successfully! ${
                    notifiedCount > 0
                      ? `(${notifiedCount} watchers notified 🔔)`
                      : ''
                  }`,
            type: 'success',
          });
        }}
      />

      {/* Group Gift Crowdfunding Modal (Workflow A) */}
      <GiftCrowdfundModal
        isOpen={showGiftCrowdfundModal}
        onClose={() => {
          setShowGiftCrowdfundModal(false);
          setActiveGiftPoolId(null);
          setActiveGiftTargetProduct(null);
        }}
        poolId={activeGiftPoolId}
        targetProduct={activeGiftTargetProduct}
        user={user}
        onRequireAuth={() => {
          setPendingAction(() => () => setShowGiftCrowdfundModal(true));
          setShowProfileModal(true);
        }}
      />

      {/* Shared Cart Shopping Modal (Workflow B) */}
      <SharedCartModal
        isOpen={showSharedCartModal}
        onClose={() => {
          setShowSharedCartModal(false);
          setActiveSharedCartId(null);
        }}
        cartId={activeSharedCartId}
        user={user}
        onRequireAuth={() => {
          setPendingAction(() => () => setShowSharedCartModal(true));
          setShowProfileModal(true);
        }}
        onExploreMore={() => {
          setActiveTab('marketplace');
        }}
        onItemsImportedToCart={(count) => {
          fetchCartItems();
          setToast({
            message: i18n.language === 'ku' 
              ? `(${count}) کاڵا لە سەبەتەی هاوبەشەوە زیادکرا بۆ ناو سەبەتەکەت!` 
              : i18n.language === 'ar' 
              ? `تمت إضافة (${count}) عناصر إلى سلتك بنجاح!` 
              : `(${count}) items imported into your basket!`,
            type: 'success'
          });
        }}
      />

      {/* Share Cart Unique Public URL & Copy List Modal */}
      {shareCartLinkData && (
        <ShareCartLinkModal
          isOpen={showShareCartLinkModal}
          onClose={() => setShowShareCartLinkModal(false)}
          shareUrl={shareCartLinkData.url}
          items={shareCartLinkData.items}
          totalIQD={shareCartLinkData.totalIQD}
          onOpenSharedCartView={() => {
            setActiveSharedCartId(shareCartLinkData.cartId);
            setShowSharedCartModal(true);
          }}
        />
      )}

      {/* Global Floating Picture-in-Picture Live Stream Player */}
      <GlobalLivePlayer
        session={globalLiveSession}
        isMinimized={isGlobalLiveMinimized}
        onMinimize={() => setIsGlobalLiveMinimized(true)}
        onMaximize={() => setIsGlobalLiveMinimized(false)}
        onClose={() => {
          setGlobalLiveSession(null);
          setIsGlobalLiveMinimized(false);
        }}
        user={user}
        onRequireAuth={handleRequireAuth}
        onOpenSellerProfile={(sellerId) => {
          triggerCompanionReaction('happy', "Opening merchant profile overlay.");
        }}
        onSelectItem={(item) => {
          setTargetSelectedItemId(item.id);
          setActiveTab('marketplace');
          setIsGlobalLiveMinimized(true);
        }}
      />

      {/* Slick Minimalist Scroll-Triggered Install to Home Screen Floating Tool */}
      <SlickInstallPrompt 
        theme={theme} 
        onInstalled={() => {
          triggerCompanionReaction('happy', i18n.language === 'ku' ? "ئەپڵیکەیشنەکە بە سەرکەوتوویی دامەزرا لەسەر شاشەکەت!" : i18n.language === 'ar' ? "تم تثبيت التطبيق بنجاح على الشاشة الرئيسية!" : "App installed successfully to your home screen!");
        }} 
      />
    </div>
  );
}
