import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User as UserIcon, 
  Camera, 
  Upload, 
  Edit3, 
  Save, 
  Package, 
  ShoppingBag, 
  Heart, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Lock, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Eye, 
  Clock, 
  Truck, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Sparkles, 
  ExternalLink, 
  AtSign, 
  FileText,
  Search,
  Tag,
  Store,
  RefreshCw,
  Zap,
  Users,
  UserMinus,
  UserCheck,
  Video,
  Film,
  Play,
  Radio,
  MessageSquare,
  MessageCircle,
  Send,
  ShieldAlert,
  Shield,
  BarChart3,
  TrendingUp,
  Bell,
  Flag,
  AlertTriangle,
  Palette,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Calendar,
  Home,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Coins,
  Award,
  Gift,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { detectLocalTimeTheme, LocalTimeThemeInfo } from '../lib/themeTimeDetector';
import { 
  User, 
  MarketplaceItem, 
  Order, 
  AccountingTransaction, 
  db, 
  getBumpRuleForCategory, 
  isPostExpired, 
  SellerProfile, 
  LiveSession, 
  LiveReport,
  ItemReport,
  UserStrike,
  AdminActivityLog,
  checkIsAdmin,
  normalizePhoneKey,
  isSamePhoneNumber 
} from '../lib/db';
import { IRAQ_CITIES, DEFAULT_LIVE_BROADCAST_VIDEO, FALLBACK_LIVE_BROADCAST_VIDEO } from '../lib/constants';
import { compressBase64Image } from '../lib/imageCompressor';
import { showBrowserPushNotification } from '../lib/pushNotifications';
import { AccountingModule } from './AccountingModule';
import SellerDashboard from './SellerDashboard';
import { BumpModal } from './BumpModal';
import { AdminSalesVolumeChart } from './AdminSalesVolumeChart';
import { ConfirmationDialog } from './UI';
import StoreAnalytics from './StoreAnalytics';
import EBazirganLogo from './EBazirganLogo';
import ReviewModal from './ReviewModal';
import clsx from 'clsx';

interface UserProfileProps {
  user: User;
  items: MarketplaceItem[];
  orders: Order[];
  initialSection?: 'profile' | 'seller' | 'accounting';
  onUpdateProfile: (updatedUser: User) => Promise<void>;
  onSelectItem?: (item: MarketplaceItem) => void;
  onAddItem?: () => void;
  onEditItem?: (item: MarketplaceItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteAccount?: (userId: string, targetUser?: User) => Promise<void>;
  onSignOut?: () => void | Promise<void>;
  onToggleLikeItem?: (itemId: string) => void;
  onOpenTrackOrder?: (orderId: string) => void;
  onSelectLiveSession?: (session: LiveSession) => void;
  onOpenMessages?: () => void;
  onClose?: () => void;
  theme?: string;
  onThemeChange?: (newTheme: string) => void;
  isAutoTimeTheme?: boolean;
  onToggleAutoTimeTheme?: (enabled: boolean) => void;
  localTimeInfo?: LocalTimeThemeInfo;
  onOpenSellerDashboard?: () => void;
}

export default function UserProfile({
  user,
  items,
  orders,
  initialSection = 'profile',
  onUpdateProfile,
  onSelectItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onDeleteAccount,
  onSignOut,
  onToggleLikeItem,
  onOpenTrackOrder,
  onSelectLiveSession,
  onOpenMessages,
  onClose,
  theme = 'rainbow',
  onThemeChange,
  isAutoTimeTheme = true,
  onToggleAutoTimeTheme,
  localTimeInfo,
  onOpenSellerDashboard
}: UserProfileProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';
  const tr = (ku: string, ar: string, en: string) => {
    if (isKurdish) return ku;
    if (isArabic) return ar;
    return en;
  };

  const [activeSection, setActiveSection] = useState<'profile' | 'seller' | 'accounting'>(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const [activeTab, setActiveTab] = useState<'listed' | 'purchased' | 'liked' | 'followed' | 'broadcasts' | 'analytics' | 'edit' | 'admin' | 'loyalty'>('listed');
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [bumpModalItem, setBumpModalItem] = useState<MarketplaceItem | null>(null);

  // Admin moderation state - Strictly locked to super admin or E-BAZIRGAN direct
  const isAdmin = checkIsAdmin(user);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [allPlatformItems, setAllPlatformItems] = useState<MarketplaceItem[]>([]);
  const [allPlatformOrders, setAllPlatformOrders] = useState<Order[]>([]);
  const [allPlatformTransactions, setAllPlatformTransactions] = useState<AccountingTransaction[]>([]);
  const [liveReportsList, setLiveReportsList] = useState<LiveReport[]>([]);
  const [itemReportsList, setItemReportsList] = useState<ItemReport[]>([]);
  const [userStrikesList, setUserStrikesList] = useState<UserStrike[]>([]);
  const [adminActivityLogsList, setAdminActivityLogsList] = useState<AdminActivityLog[]>([]);
  const [adminReportTypeSection, setAdminReportTypeSection] = useState<'live' | 'items' | 'strikes' | 'audit'>('live');

  // Strike / Warning Dialog State
  const [strikeModalOpen, setStrikeModalOpen] = useState(false);
  const [targetUserForStrike, setTargetUserForStrike] = useState<{ id: string; name: string; phone?: string; context?: string } | null>(null);
  const [strikeLevel, setStrikeLevel] = useState<1 | 2 | 3>(1);
  const [strikeReason, setStrikeReason] = useState<string>('قسە یان ڕەفتاری نەشیاو');
  const [strikeMessage, setStrikeMessage] = useState<string>('');
  const [submittingStrike, setSubmittingStrike] = useState(false);

  // Single-item delete & violation warning modals state for Super Admin
  const [itemToDeleteModal, setItemToDeleteModal] = useState<MarketplaceItem | null>(null);
  const [itemNotifySellerOnDelete, setItemNotifySellerOnDelete] = useState(true);
  const [itemDeleteReason, setItemDeleteReason] = useState('سەرپێچی لە یاساکانی بازاڕ و فرۆشتن');
  const [itemForViolationModal, setItemForViolationModal] = useState<MarketplaceItem | null>(null);
  const [violationModalReason, setViolationModalReason] = useState('زانیاری یان وێنەی نادروست و فێڵاوی');
  const [violationModalMessage, setViolationModalMessage] = useState('');
  const [violationModalAction, setViolationModalAction] = useState<'warn_only' | 'delete_and_warn' | 'strike_and_delete'>('warn_only');
  const [violationModalStrikeLevel, setViolationModalStrikeLevel] = useState<1 | 2 | 3>(1);
  const [violationRecipientPhone, setViolationRecipientPhone] = useState<string>('');
  const [violationRecipientName, setViolationRecipientName] = useState<string>('');
  const [isProcessingItemAction, setIsProcessingItemAction] = useState(false);
  const [adminItemCategoryFilter, setAdminItemCategoryFilter] = useState<string>('all');

  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSubTab, setAdminSubTab] = useState<'analytics' | 'users' | 'items' | 'reports' | 'security'>('analytics');
  const [adminReportStatusFilter, setAdminReportStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [adminUserBadgeFilter, setAdminUserBadgeFilter] = useState<'all' | 'unverified' | 'verified' | 'perfect_seller' | 'trusted' | 'rewarded' | 'banned' | 'admin'>('all');
  const [adminUserSort, setAdminUserSort] = useState<'newest' | 'items' | 'name'>('newest');
  
  // 🏅 Trusted Seller Seal & 🎁 Admin Rewards state
  const [awardModalSeller, setAwardModalSeller] = useState<User | null>(null);
  const [awardAmount, setAwardAmount] = useState<number>(25000);
  const [awardCurrency, setAwardCurrency] = useState<'IQD' | 'USD' | 'POINTS'>('IQD');
  const [awardReason, setAwardReason] = useState<string>('فرۆشیاری ڕاستگۆ و خاوەن ئەمانەت و ڕەوشتی بەرز');
  const [awardAutoGrantSeal, setAwardAutoGrantSeal] = useState<boolean>(true);
  const [isSubmittingAward, setIsSubmittingAward] = useState<boolean>(false);
  
  // Security & Protection Controls
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('payv_app_maintenance') === 'true';
  });
  const [blacklistedPhones, setBlacklistedPhones] = useState<string[]>(['07500000000', '07700000000']);
  const [newBlacklistInput, setNewBlacklistInput] = useState('');
  const [securityLogs, setSecurityLogs] = useState<{ id: string; action: string; time: string; type: 'ban' | 'delete' | 'security' | 'verify' | 'badge' }[]>([
    { id: '1', action: 'ئادمن ئاسیۆن کراوە بە ئەدمینی باڵا', time: new Date().toLocaleTimeString(), type: 'security' },
    { id: '2', action: 'دەستپێکردنی سیستەمی پاراستنی ئاسایش', time: new Date().toLocaleTimeString(), type: 'verify' }
  ]);

  const addSecurityLog = (action: string, type: 'ban' | 'delete' | 'security' | 'verify' | 'badge') => {
    setSecurityLogs(prev => [
      { id: Date.now().toString(), action, time: new Date().toLocaleTimeString(), type },
      ...prev.slice(0, 20)
    ]);
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'pending' | 'resolved' | 'dismissed') => {
    try {
      await db.updateLiveReportStatus(reportId, status);
      setLiveReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      const statusText = status === 'resolved' ? 'چارەسەرکراو' : status === 'dismissed' ? 'ڕەتکرایەوە' : 'چاوەڕوانکراو';
      showToast(isKurdish ? `دۆخی ڕاپۆرت گۆڕدرا بۆ: ${statusText}` : `Report status updated to ${status}`, 'success');
      addSecurityLog(`دۆخی ڕاپۆرتی لایڤ نوێکرایەوە بۆ (${statusText}): ${reportId}`, 'security');
    } catch (err) {
      console.error("Failed to update report status:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە گۆڕینی دۆخی ڕاپۆرت' : 'Failed to update report status', 'error');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await db.deleteLiveReport(reportId);
      setLiveReportsList(prev => prev.filter(r => r.id !== reportId));
      showToast(isKurdish ? 'ڕاپۆرتەکە بە سەرکەوتوویی سڕایەوە' : 'Report deleted successfully', 'success');
      addSecurityLog(`ڕاپۆرتی لایڤ سڕایەوە: ${reportId}`, 'delete');
    } catch (err) {
      console.error("Failed to delete report:", err);
      showToast(isKurdish ? 'کێشەیەک لە سڕینەوەی ڕاپۆرت ڕوویدا' : 'Failed to delete report', 'error');
    }
  };

  const handleTerminateLiveStreamFromReport = async (report: LiveReport) => {
    try {
      await db.endLiveSessionByAdmin(report.sessionId);
      await db.updateLiveReportStatus(report.id, 'resolved');
      setLiveReportsList(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
      showToast(isKurdish ? `پەخشی ڕاستەوخۆی (${report.sessionTitle || 'لایڤ'}) بە دەسەڵاتی ئەدمین کۆتایی پێهێنرا و لە لیستەکە لابرا.` : `Live stream terminated and removed by admin.`, 'success');
      addSecurityLog(`وەستاندنی پەخشی لایڤ لەسەر ڕاپۆرت: ${report.sessionTitle} (پەخشکەر: ${report.broadcasterName})`, 'delete');
    } catch (err) {
      console.error("Failed to terminate live stream:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە کۆتاییهێنان بە پەخش' : 'Failed to terminate stream', 'error');
    }
  };

  const handleBanBroadcasterFromReport = async (report: LiveReport) => {
    try {
      const targetUser = allUsersList.find(u => u.id === report.broadcasterId);
      if (targetUser) {
        await handleToggleBanUser(targetUser);
      } else {
        const bannedUserObj: User = {
          id: report.broadcasterId,
          name: report.broadcasterName,
          email: '',
          isBanned: true
        };
        await db.updateUser(bannedUserObj);
        setAllUsersList(prev => [...prev.filter(u => u.id !== report.broadcasterId), bannedUserObj]);
        showToast(isKurdish ? `پەخشکەر (${report.broadcasterName}) بە سەرکەوتوویی بایکۆتکرا.` : `Broadcaster (${report.broadcasterName}) banned successfully.`, 'info');
        addSecurityLog(`بایکۆتکردنی پەخشکەر بە هۆی سەرپێچی لایڤ: ${report.broadcasterName}`, 'ban');
      }
      await db.updateLiveReportStatus(report.id, 'resolved');
      setLiveReportsList(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      console.error("Failed to ban broadcaster:", err);
      showToast(isKurdish ? 'کێشەیەک لە بایکۆتکردنی پەخشکەر ڕوویدا' : 'Failed to ban broadcaster', 'error');
    }
  };

  const handleToggleBanUser = async (targetUser: User) => {
    const isBannedNow = !targetUser.isBanned;
    try {
      const updated = { ...targetUser, isBanned: isBannedNow };
      await db.updateUser(updated);
      setAllUsersList(prev => prev.map(u => u.id === targetUser.id ? updated : u));
      const logText = `${isBannedNow ? 'بایکۆتکرا' : 'بایکۆت لابرا'}: ${targetUser.name} (${targetUser.phone || targetUser.email || 'N/A'})`;
      addSecurityLog(logText, 'ban');
      showToast(
        isKurdish 
          ? `هەژماری (${targetUser.name}) بە سەرکەوتوویی ${isBannedNow ? 'سڕکرا و بایکۆتکرا' : 'چالاککرایەوە'}` 
          : `User (${targetUser.name}) ${isBannedNow ? 'banned' : 'unbanned'} successfully`, 
        isBannedNow ? 'info' : 'success'
      );
    } catch (err) {
      console.error("Failed to toggle ban user:", err);
      showToast(isKurdish ? 'کێشەیەک لە بایکۆتکردن ڕوویدا' : 'Failed to update ban state', 'error');
    }
  };

  const handleToggleVerifyUser = async (targetUser: User) => {
    const isVerifiedNow = !targetUser.isVerified;
    try {
      const updated = { ...targetUser, isVerified: isVerifiedNow };
      await db.updateSellerVerification(targetUser.id, isVerifiedNow);
      await db.updateUser(updated);
      setAllUsersList(prev => prev.map(u => u.id === targetUser.id ? updated : u));

      // If updating currently logged in user, refresh parent state
      if (user && (user.id === targetUser.id || (user.phone && targetUser.phone && user.phone.replace(/\D/g, '') === targetUser.phone.replace(/\D/g, '')))) {
        await onUpdateProfile(updated);
      }

      addSecurityLog(`بەیجی پشڕاستکردنەوە ${isVerifiedNow ? 'بەخشرا بە فرۆشیار' : 'لابرا لە فرۆشیار'}: ${targetUser.name}`, 'verify');
      showToast(
        isKurdish 
          ? `بەیجی پشڕاستکردنەوە (Verified) بە سەرکەوتوویی ${isVerifiedNow ? 'بەخشرا بە فرۆشیار' : 'لە فرۆشیار لابرا'}` 
          : `Verification badge ${isVerifiedNow ? 'granted to seller successfully' : 'removed'}`, 
        'success'
      );
    } catch (err) {
      console.error("Failed to toggle verify user:", err);
      showToast(isKurdish ? 'کێشەیەک لە نوێکردنەوەی بەیجی فرۆشیار ڕوویدا' : 'Failed to update verification', 'error');
    }
  };

  const handleTogglePerfectSeller = async (targetUser: User) => {
    const isPerfectNow = !targetUser.isPerfectSeller;
    try {
      const updated: User = { 
        ...targetUser, 
        isPerfectSeller: isPerfectNow,
        perfectSellerAt: isPerfectNow ? Date.now() : undefined
      };
      await db.updateSellerPerfectStatus(targetUser.id, isPerfectNow);
      await db.updateUser(updated);
      setAllUsersList(prev => prev.map(u => u.id === targetUser.id ? updated : u));

      // Keep user detail modal synced if open
      setSelectedUserDetailModal(prev => (prev && prev.id === targetUser.id) ? updated : prev);

      // If updating currently logged in user, refresh parent state
      if (user && (user.id === targetUser.id || (user.phone && targetUser.phone && user.phone.replace(/\D/g, '') === targetUser.phone.replace(/\D/g, '')))) {
        await onUpdateProfile(updated);
      }

      addSecurityLog(
        `بەیجی فرۆشیاری نموونەیی (Perfect Seller) ${isPerfectNow ? 'بەخشرا بە فرۆشیار' : 'لابرا لە فرۆشیار'}: ${targetUser.name}`, 
        'badge'
      );
      showToast(
        isKurdish 
          ? `بەیجی فرۆشیاری نموونەیی (Perfect Seller) بە سەرکەوتوویی ${isPerfectNow ? 'بەخشرا بە فرۆشیار 🌟' : 'لە فرۆشیار لابرا'}` 
          : `Perfect Seller badge ${isPerfectNow ? 'granted to seller successfully 🌟' : 'removed'}`, 
        'success'
      );
    } catch (err) {
      console.error("Failed to toggle perfect seller badge:", err);
      showToast(isKurdish ? 'کێشەیەک لە نوێکردنەوەی بەیجی فرۆشیاری نموونەیی ڕوویدا' : 'Failed to update perfect seller status', 'error');
    }
  };

  const handleToggleTrustedSeller = async (targetUser: User) => {
    const isTrustedNow = !targetUser.isTrustedSeller;
    try {
      const updated: User = { 
        ...targetUser, 
        isTrustedSeller: isTrustedNow,
        trustedSellerAt: isTrustedNow ? Date.now() : undefined,
        trustedSealTitle: isTrustedNow ? 'مۆری باوەڕپێکراوی فەرمی' : undefined
      };
      await db.updateSellerTrustedSeal(targetUser.id, isTrustedNow);
      await db.updateUser(updated);
      setAllUsersList(prev => prev.map(u => u.id === targetUser.id ? updated : u));

      // Keep user detail modal synced if open
      setSelectedUserDetailModal(prev => (prev && prev.id === targetUser.id) ? updated : prev);

      // If updating currently logged in user, refresh parent state
      if (user && (user.id === targetUser.id || (user.phone && targetUser.phone && user.phone.replace(/\D/g, '') === targetUser.phone.replace(/\D/g, '')))) {
        await onUpdateProfile(updated);
      }

      addSecurityLog(
        `مۆری باوەڕپێکراو (Trusted Seal) ${isTrustedNow ? 'بەخشرا بە فرۆشیاری ڕاستگۆ' : 'لابرا لە فرۆشیار'}: ${targetUser.name}`, 
        'badge'
      );
      showToast(
        isKurdish 
          ? `مۆری باوەڕپێکراو (Trusted Seal) بە سەرکەوتوویی ${isTrustedNow ? 'بەخشرا بە فرۆشیار 🏅' : 'لە فرۆشیار لابرا'}` 
          : `Official Trusted Seal ${isTrustedNow ? 'granted to seller successfully 🏅' : 'removed'}`, 
        'success'
      );
    } catch (err) {
      console.error("Failed to toggle trusted seller seal:", err);
      showToast(isKurdish ? 'کێشەیەک لە نوێکردنەوەی مۆری باوەڕپێکراو ڕوویدا' : 'Failed to update trusted seal', 'error');
    }
  };

  const handleOpenAwardModal = (targetUser: User) => {
    setAwardModalSeller(targetUser);
    setAwardAmount(25000);
    setAwardCurrency('IQD');
    setAwardReason('فرۆشیاری ڕاستگۆ و خاوەن ئەمانەت و ڕەوشتی بەرز');
    setAwardAutoGrantSeal(!targetUser.isTrustedSeller);
  };

  const handleGrantRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardModalSeller) return;
    if (awardAmount <= 0) {
      showToast(isKurdish ? 'تکایە بڕی پاداشت دیاری بکە' : 'Please specify reward amount', 'error');
      return;
    }

    setIsSubmittingAward(true);
    try {
      const res = await db.grantSellerReward(awardModalSeller.id, {
        amount: awardAmount,
        currency: awardCurrency,
        reason: awardReason.trim() || 'فرۆشیاری ڕاستگۆ و متمانەپێکراو',
        adminEmail: user?.email || 'admin@e-bazirgan.com',
        autoGrantSeal: awardAutoGrantSeal
      });

      if (res.success) {
        // Update user in allUsersList
        const updatedUsers = allUsersList.map(u => {
          if (u.id === awardModalSeller.id) {
            const currentRewards = u.adminRewards || [];
            return {
              ...u,
              adminRewards: [res.reward, ...currentRewards],
              loyaltyPoints: awardCurrency === 'POINTS' ? (u.loyaltyPoints || 0) + awardAmount : (u.loyaltyPoints || 0),
              ...(awardAutoGrantSeal ? { isTrustedSeller: true, trustedSellerAt: Date.now(), trustedSealTitle: 'مۆری باوەڕپێکراوی فەرمی' } : {})
            };
          }
          return u;
        });
        setAllUsersList(updatedUsers);

        if (selectedUserDetailModal && selectedUserDetailModal.id === awardModalSeller.id) {
          const curRewards = selectedUserDetailModal.adminRewards || [];
          setSelectedUserDetailModal({
            ...selectedUserDetailModal,
            adminRewards: [res.reward, ...curRewards],
            loyaltyPoints: awardCurrency === 'POINTS' ? (selectedUserDetailModal.loyaltyPoints || 0) + awardAmount : (selectedUserDetailModal.loyaltyPoints || 0),
            ...(awardAutoGrantSeal ? { isTrustedSeller: true, trustedSellerAt: Date.now() } : {})
          });
        }

        const currText = awardCurrency === 'POINTS' ? 'خاڵ' : awardCurrency === 'USD' ? '$' : 'IQD';
        addSecurityLog(
          `پاداشتی ڕاستگۆیی (${awardAmount.toLocaleString()} ${currText}) بەخشرا بە: ${awardModalSeller.name}`,
          'security'
        );

        showToast(
          isKurdish 
            ? `پاداشتی تایبەت (${awardAmount.toLocaleString()} ${currText}) بە سەرکەوتوویی بەخشرا بە فرۆشیار (${awardModalSeller.name})! 🎁` 
            : `Reward (${awardAmount.toLocaleString()} ${currText}) granted successfully to ${awardModalSeller.name}! 🎁`,
          'success'
        );
        setAwardModalSeller(null);
      }
    } catch (err) {
      console.error("Failed to grant reward:", err);
      showToast(isKurdish ? 'هەڵەیەک ڕوویدا لە بەخشینی پاداشت' : 'Failed to grant reward', 'error');
    } finally {
      setIsSubmittingAward(false);
    }
  };

  const handleToggleFeatureItem = async (targetItem: MarketplaceItem) => {
    const isFeaturedNow = !targetItem.isFeatured;
    try {
      const updated = { ...targetItem, isFeatured: isFeaturedNow, last_bumped_at: Date.now() };
      await db.saveMarketplaceItem(updated);
      setAllPlatformItems(prev => prev.map(i => i.id === targetItem.id ? updated : i));
      showToast(isKurdish ? `کاڵاکە ${isFeaturedNow ? 'خرایە لوتکەی تا تایبەتەکان' : 'لە لوتکە لابرا'}` : `Item ${isFeaturedNow ? 'featured' : 'unfeatured'}`, 'success');
    } catch (err) {
      console.error("Failed to feature item:", err);
    }
  };

  const handleToggleMaintenanceMode = () => {
    const nextState = !maintenanceMode;
    setMaintenanceMode(nextState);
    localStorage.setItem('payv_app_maintenance', String(nextState));
    addSecurityLog(`دۆخی سەرپەرشتی و پاراستنی ئاسایشی ئەپەکە ${nextState ? 'چالاککرا' : 'کوژێنرایەوە'}`, 'security');
    showToast(isKurdish ? `دۆخی پاراستنی ئاسایشی ئەپەکە ${nextState ? 'چالاککرا (Maintenance Active)' : 'کوژێنرایەوە'}` : `Maintenance mode ${nextState ? 'enabled' : 'disabled'}`, 'info');
  };

  const handleAddBlacklistPhone = () => {
    if (!newBlacklistInput.trim()) return;
    const cleanPhone = newBlacklistInput.trim();
    if (blacklistedPhones.includes(cleanPhone)) return;
    setBlacklistedPhones(prev => [...prev, cleanPhone]);
    setNewBlacklistInput('');
    addSecurityLog(`ژمارە مۆبایل خرایە لیستی ڕەشەوە: ${cleanPhone}`, 'security');
    showToast(isKurdish ? 'ژمارەکە خرایە لیستی بایکۆتکراوانەوە' : 'Phone added to blacklist', 'success');
  };

  const handleRemoveBlacklistPhone = (phoneToRemove: string) => {
    setBlacklistedPhones(prev => prev.filter(p => p !== phoneToRemove));
    addSecurityLog(`ژمارە مۆبایل لە لیستی ڕەش لابرا: ${phoneToRemove}`, 'security');
    showToast(isKurdish ? 'ژمارەکە لە لیستی ڕەش لابرا' : 'Phone removed from blacklist', 'info');
  };

  const handleOpenStrikeModal = (
    target: { id: string; name: string; phone?: string; context?: string },
    defaultLevel: 1 | 2 | 3 = 1,
    defaultReason: string = 'قسە یان ڕەفتاری نەشیاو'
  ) => {
    setTargetUserForStrike(target);
    setStrikeLevel(defaultLevel);
    setStrikeReason(defaultReason);
    setStrikeMessage(
      defaultLevel === 1
        ? `ئەمە یەکەم ئاگادارکردنەوەی فەرمییە لەسەر پابەندنەبوون بە ڕێساکانی بەکارهێنان (${defaultReason}). تکایە پابەندی یاساکان بە.`
        : defaultLevel === 2
        ? `ئاگاداری کۆتایی! دووبارەبوونەوەی سەرپێچی دەبێتە هۆی سڕکردن و بایکۆتکردنی هەمیشەیی هەژمارەکەت لە E-BAZIRGAN.`
        : `بەهۆی سەرپێچیی دووبارە یان مەترسیدار (${defaultReason})، هەژمارەکەت ڕاگیرا و سڕکرا.`
    );
    setStrikeModalOpen(true);
  };

  const handleSubmitStrike = async () => {
    if (!targetUserForStrike) return;
    setSubmittingStrike(true);
    try {
      await db.issueUserStrike(
        { id: targetUserForStrike.id, name: targetUserForStrike.name, phone: targetUserForStrike.phone },
        {
          level: strikeLevel,
          reason: strikeReason,
          message: strikeMessage || 'پابەندبوون بە ڕێنماییەکان و یاساکانی کۆمەڵگە.',
          adminEmail: user.email || 'afsun2026app@gmail.com'
        }
      );

      if (strikeLevel === 3) {
        setAllUsersList(prev => prev.map(u => u.id === targetUserForStrike.id ? { ...u, isBanned: true } : u));
      }

      showToast(
        isKurdish 
          ? `وریارکردنەوەی ئاستی ${strikeLevel} بۆ (${targetUserForStrike.name}) بە سەرکەوتوویی لە فایەربەیس تۆمارکرا و نێردرا.` 
          : `Strike level ${strikeLevel} issued and sent to user successfully.`,
        'success'
      );
      setStrikeModalOpen(false);
      setTargetUserForStrike(null);
    } catch (err) {
      console.error("Failed to issue strike:", err);
      showToast(isKurdish ? 'کێشەیەک لە ناردنی وریارکردنەوە ڕوویدا' : 'Failed to issue strike', 'error');
    } finally {
      setSubmittingStrike(false);
    }
  };

  const handleUpdateItemReportStatus = async (reportId: string, status: 'pending' | 'resolved' | 'dismissed') => {
    try {
      await db.updateItemReportStatus(reportId, status);
      setItemReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      const statusText = status === 'resolved' ? 'چارەسەرکراو' : status === 'dismissed' ? 'ڕەتکرایەوە' : 'چاوەڕوانکراو';
      showToast(isKurdish ? `دۆخی ڕاپۆرتی کاڵا گۆڕدرا بۆ: ${statusText}` : `Item report status updated to ${status}`, 'success');
      addSecurityLog(`دۆخی ڕاپۆرتی کاڵا نوێکرایەوە بۆ (${statusText}): ${reportId}`, 'security');
    } catch (err) {
      console.error("Failed to update item report status:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە گۆڕینی دۆخی ڕاپۆرت' : 'Failed to update item report status', 'error');
    }
  };

  const handleDeleteItemReport = async (reportId: string) => {
    try {
      await db.deleteItemReport(reportId);
      setItemReportsList(prev => prev.filter(r => r.id !== reportId));
      showToast(isKurdish ? 'ڕاپۆرتی کاڵا بە سەرکەوتوویی سڕایەوە' : 'Item report deleted', 'success');
    } catch (err) {
      console.error("Failed to delete item report:", err);
    }
  };

  const handleRemoveOffendingItemFromReport = async (report: ItemReport) => {
    try {
      await db.adminRemoveMarketplaceItem(report.itemId, `سڕینەوە لەسەر بنەمای ڕاپۆرتی سەرپێچی: ${report.reason}`, user.email);
      await db.updateItemReportStatus(report.id, 'resolved');
      setItemReportsList(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
      setAllPlatformItems(prev => prev.filter(i => i.id !== report.itemId));
      showToast(isKurdish ? `کاڵای (${report.itemTitle}) سڕایەوە و ئاگاداری بۆ فرۆشیار نێردرا.` : `Item removed and takedown notice dispatched.`, 'success');
    } catch (err) {
      console.error("Failed to remove item:", err);
      showToast(isKurdish ? 'کێشەیەک لە سڕینەوەی کاڵا ڕوویدا' : 'Failed to remove item', 'error');
    }
  };

  useEffect(() => {
    // Only load full platform data if user is genuinely admin AND has opened the admin tab
    if (activeTab === 'admin' && isAdmin) {
      db.getUsers().then(u => setAllUsersList(u)).catch(console.error);
      db.getMarketplaceItems().then(i => setAllPlatformItems(i)).catch(console.error);
      db.getOrders().then(o => setAllPlatformOrders(o)).catch(console.error);
      db.getAllAccountingTransactions().then(t => setAllPlatformTransactions(t)).catch(console.error);
      
      const unsubLiveReports = db.onLiveReportsChange((reports) => {
        setLiveReportsList(reports);
      });
      const unsubItemReports = db.onItemReportsChange((reports) => {
        setItemReportsList(reports);
      });
      const unsubStrikes = db.onUserStrikesChange((strikes) => {
        setUserStrikesList(strikes);
      });
      const unsubAdminLogs = db.onAdminActivityLogsChange((logs) => {
        setAdminActivityLogsList(logs);
      });

      return () => {
        if (typeof unsubLiveReports === 'function') unsubLiveReports();
        if (typeof unsubItemReports === 'function') unsubItemReports();
        if (typeof unsubStrikes === 'function') unsubStrikes();
        if (typeof unsubAdminLogs === 'function') unsubAdminLogs();
      };
    }
  }, [activeTab, isAdmin]);

  // Modal state for deletions (Zero reliance on window.confirm/alert)
  const [showSelfDeleteConfirm, setShowSelfDeleteConfirm] = useState(false);
  const [adminTargetToDelete, setAdminTargetToDelete] = useState<User | null>(null);
  const [selectedUserDetailModal, setSelectedUserDetailModal] = useState<User | null>(null);
  const [showDeleteDemosConfirm, setShowDeleteDemosConfirm] = useState(false);
  const [showPurgeOldAccountsConfirm, setShowPurgeOldAccountsConfirm] = useState(false);
  const [isDeletingSelf, setIsDeletingSelf] = useState(false);
  const [isPurgingOldAccounts, setIsPurgingOldAccounts] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleInitiateSelfDelete = () => {
    const cleanDigits = (user.phone || '').replace(/\D/g, '');
    const isMasterAdmin = user.id === 'admin-07501222253' || cleanDigits === '07501222253' || cleanDigits === '7501222253' || cleanDigits === '07746573763' || cleanDigits === '7746573763' || cleanDigits === '9647746573763' || user.email?.toLowerCase() === 'afsun2026app@gmail.com';
    if (isMasterAdmin) {
      showToast(isKurdish 
        ? 'هەژماری سەرەکی بەڕێوەبەر (07501222253) پارێزراوە لە سڕینەوە بە هیچ جۆرێک سڕینەوەی بۆ ناکرێت.' 
        : 'Primary Admin Account (07501222253) is strictly protected and cannot be deleted.',
        'error'
      );
      return;
    }
    setShowSelfDeleteConfirm(true);
  };

  const handleConfirmSelfDelete = async () => {
    setShowSelfDeleteConfirm(false);
    setIsDeletingSelf(true);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount(user.id, user);
      } else {
        await db.deleteAccount(user.id, user);
        localStorage.removeItem('payv_custom_user_id');
        localStorage.removeItem('payv_cached_user');
        localStorage.removeItem('payv_last_active_phone');
        localStorage.setItem('payv_signed_out', 'true');
        onClose?.();
      }
      showToast(isKurdish ? 'هەژمارەکەت بە سەرکەوتوویی سڕایەوە.' : 'Your account has been deleted.', 'success');
    } catch (err) {
      console.error("Failed to delete account:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە سڕینەوەی هەژمار' : 'Failed to delete account', 'error');
    } finally {
      setIsDeletingSelf(false);
    }
  };

  const handleInitiateDeleteUserAccount = (targetUser: User) => {
    const cleanDigits = (targetUser.phone || targetUser.name || '').replace(/\D/g, '');
    const cleanEmail = (targetUser.email || '').trim().toLowerCase();
    if (
      targetUser.id === 'admin-07501222253' || 
      cleanDigits === '07501222253' || 
      cleanDigits === '7501222253' || 
      cleanDigits === '9647501222253' ||
      cleanEmail === 'afsun2026app@gmail.com'
    ) {
      showToast(isKurdish ? 'هەژماری سەرەکی بەڕێوەبەر (07501222253) بە پارێزراوی دەمێنێتەوە.' : 'Primary Admin account (07501222253) is protected.', 'info');
      return;
    }
    setAdminTargetToDelete(targetUser);
  };

  const handleConfirmAdminDeleteUser = async () => {
    if (!adminTargetToDelete) return;
    const target = adminTargetToDelete;
    setAdminTargetToDelete(null);
    setSelectedUserDetailModal(null);
    setIsDeletingUser(true);
    try {
      const freshUsers = await db.deleteAccount(target.id, target);
      setAllUsersList(freshUsers);
      setAllPlatformItems(prev => prev.filter(i => i.userId !== target.id && i.sellerId !== target.id));
      if (onDeleteAccount) {
        await onDeleteAccount(target.id, target);
      }
      addSecurityLog(`سڕینەوەی یەکجاری پڕۆفایلی کاربەر: ${target.name || target.phone || target.id} (ID: ${target.id})`, 'delete');
      showToast(isKurdish ? 'هەژمارەکە و تەواوی کاڵاکانی بە سەرکەوتوویی سڕانەوە!' : 'Account and items deleted successfully!', 'success');
    } catch (err) {
      console.error("Failed to delete user account:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە سڕینەوەی هەژمار' : 'Failed to delete account', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handlePurgeOldAccounts = async () => {
    setShowPurgeOldAccountsConfirm(false);
    setIsPurgingOldAccounts(true);
    try {
      const targets = allUsersList.filter(u => {
        const cleanPhone = (u.phone || '').replace(/\D/g, '');
        const isMaster = u.id === 'admin-07501222253' || cleanPhone === '07501222253' || cleanPhone === '7501222253' || cleanPhone === '9647501222253' || u.email?.toLowerCase() === 'afsun2026app@gmail.com';
        const isSelf = user && (u.id === user.id || (user.phone && cleanPhone === user.phone.replace(/\D/g, '')));
        return !isMaster && !isSelf;
      });

      if (targets.length === 0) {
        showToast(isKurdish ? 'هیچ هەژمارێکی تر نەدۆزرایەوە بۆ سڕینەوە.' : 'No other accounts found to delete.', 'info');
        setIsPurgingOldAccounts(false);
        return;
      }

      for (const t of targets) {
        await db.deleteAccount(t.id, t);
      }

      if (onDeleteAccount) {
        await onDeleteAccount('purge_batch_completed');
      }

      const freshUsers = await db.getUsers();
      setAllUsersList(freshUsers);
      const targetIds = new Set(targets.map(t => t.id));
      setAllPlatformItems(prev => prev.filter(i => !targetIds.has(i.userId) && !targetIds.has(i.sellerId || '')));
      addSecurityLog(`سڕینەوەی ${targets.length} هەژماری کۆن لە ئەدمین پانێڵ`, 'delete');
      showToast(isKurdish ? `سەرکەوتووانە (${targets.length}) هەژماری کۆن سڕانەوە!` : `Successfully purged (${targets.length}) old accounts!`, 'success');
    } catch (err) {
      console.error("Failed to purge accounts:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە پاککردنەوەی هەژمارەکان' : 'Failed to purge accounts', 'error');
    } finally {
      setIsPurgingOldAccounts(false);
    }
  };

  const handleInitiateDeleteItem = (item: MarketplaceItem) => {
    setItemToDeleteModal(item);
    setItemNotifySellerOnDelete(true);
    setItemDeleteReason('سەرپێچی لە ڕێنمایی و یاساکانی بازاڕ');
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDeleteModal) return;
    setIsProcessingItemAction(true);
    try {
      if (itemNotifySellerOnDelete) {
        await db.adminRemoveMarketplaceItem(
          itemToDeleteModal.id,
          itemDeleteReason || 'سەرپێچی لە یاساکانی بازاڕ و فرۆشتن',
          user.email
        );
      } else {
        await db.deleteMarketplaceItem(itemToDeleteModal.id);
      }
      setAllPlatformItems(prev => prev.filter(i => i.id !== itemToDeleteModal.id));
      if (onDeleteItem) onDeleteItem(itemToDeleteModal.id);
      addSecurityLog(`سڕینەوەی یەک بە یەکی کاڵای (${itemToDeleteModal.title})`, 'delete');
      showToast(
        isKurdish 
          ? `کاڵای (${itemToDeleteModal.title}) بە سەرکەوتوویی لە بازاڕ سڕایەوە!` 
          : `Item (${itemToDeleteModal.title}) deleted from marketplace!`, 
        'success'
      );
      setItemToDeleteModal(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      showToast(isKurdish ? 'کێشەیەک لە سڕینەوەی کاڵا ڕوویدا' : 'Failed to delete item', 'error');
    } finally {
      setIsProcessingItemAction(false);
    }
  };

  const handleOpenItemViolationModal = (item: MarketplaceItem) => {
    setItemForViolationModal(item);
    setViolationRecipientPhone(item.sellerPhone || '');
    setViolationRecipientName(item.userName || '');
    const initialReason = 'زانیاری یان وێنەی نادروست و فێڵاوی';
    setViolationModalReason(initialReason);
    setViolationModalAction('warn_only');
    setViolationModalStrikeLevel(1);
    const sellerDisplay = item.userName || 'فرۆشیاری بەڕێز';
    setViolationModalMessage(
      `ئاگاداری فەرمی لە سەرپەرشتیاری E-BAZIRGAN:\nبەڕێز ${sellerDisplay}، سەبارەت بە کاڵای (${item.title}):\nئەم بەرهەمە سەرپێچی لە ڕێساکانی بازاڕ تێدایە لەبەر (${initialReason}). تکایە دەستبەجێ زانیارییەکان چاک بکە یان کاڵاکە لاببە تا تووشی سڕکردنی هەژمار نەبیتەوە.`
    );
  };

  const handleSelectViolationReason = (reason: string) => {
    setViolationModalReason(reason);
    if (itemForViolationModal) {
      const sellerDisplay = violationRecipientName || itemForViolationModal.userName || 'فرۆشیاری بەڕێز';
      setViolationModalMessage(
        `ئاگاداری فەرمی لە سەرپەرشتیاری E-BAZIRGAN:\nبەڕێز ${sellerDisplay}، سەبارەت بە کاڵای (${itemForViolationModal.title}):\nئەم بەرهەمە سەرپێچی لە ڕێساکانی بازاڕ تێدایە لەبەر (${reason}). تکایە دەستبەجێ زانیارییەکان چاک بکە یان کاڵاکە لاببە تا تووشی سڕکردنی هەژمار نەبیتەوە.`
      );
    }
  };

  const handleSubmitItemViolation = async () => {
    if (!itemForViolationModal) return;
    setIsProcessingItemAction(true);
    try {
      const shouldDelete = violationModalAction === 'delete_and_warn' || violationModalAction === 'strike_and_delete';
      const shouldStrike = violationModalAction === 'strike_and_delete';

      const cleanPhone = (violationRecipientPhone || '').replace(/\D/g, '');
      const matchedUser = cleanPhone ? allUsersList.find(u => (u.phone || '').replace(/\D/g, '') === cleanPhone) : null;
      const targetUserId = matchedUser?.id || itemForViolationModal.userId || itemForViolationModal.sellerId || 'unknown_seller';

      const enrichedItem: MarketplaceItem = {
        ...itemForViolationModal,
        userId: targetUserId,
        sellerId: targetUserId,
        userName: violationRecipientName || matchedUser?.name || itemForViolationModal.userName,
        sellerPhone: violationRecipientPhone || itemForViolationModal.sellerPhone
      };

      await db.adminSendItemViolationNotice(enrichedItem, {
        reason: violationModalReason,
        message: violationModalMessage,
        strikeLevel: shouldStrike ? violationModalStrikeLevel : undefined,
        deleteItem: shouldDelete,
        adminEmail: user.email || 'afsun2026app@gmail.com'
      });

      // Also trigger real browser push notification
      showBrowserPushNotification({
        title: `⚠️ ئاگاداری سەرپێچی فەرمی E-BAZIRGAN`,
        body: violationModalMessage.slice(0, 120),
        data: { itemId: itemForViolationModal.id }
      });

      if (shouldDelete) {
        setAllPlatformItems(prev => prev.filter(i => i.id !== itemForViolationModal.id));
        if (onDeleteItem) onDeleteItem(itemForViolationModal.id);
      }

      addSecurityLog(
        `ناردنی نامەی سەرپێچی بۆ فرۆشیاری (${itemForViolationModal.title}): ${violationModalReason}`,
        shouldDelete ? 'delete' : 'security'
      );

      showToast(
        isKurdish
          ? `نامەی ئاگاداری سەرپێچی بە سەرکەوتوویی بۆ فرۆشیار تۆمارکرا و نێردرا${shouldDelete ? ' و کاڵاکەش سڕایەوە!' : '!'}`
          : `Violation notice dispatched to seller successfully${shouldDelete ? ' and item deleted!' : '!'}`,
        'success'
      );
      setItemForViolationModal(null);
    } catch (err) {
      console.error("Failed to send violation notice:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە ناردنی ئاگاداری سەرپێچی' : 'Failed to send violation notice', 'error');
    } finally {
      setIsProcessingItemAction(false);
    }
  };

  const handleDeletePlatformItem = async (targetItemId: string, targetTitle: string) => {
    try {
      await db.deleteMarketplaceItem(targetItemId);
      setAllPlatformItems(prev => prev.filter(i => i.id !== targetItemId));
      if (onDeleteItem) onDeleteItem(targetItemId);
      showToast(isKurdish ? 'کاڵاکە بە سەرکەوتوویی لە بازار سڕایەوە!' : 'Item deleted from marketplace!', 'success');
    } catch (err) {
      console.error("Failed to delete item:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە سڕینەوەی کاڵا' : 'Failed to delete item', 'error');
    }
  };

  const handleInitiateDeleteDemoItems = () => {
    setShowDeleteDemosConfirm(true);
  };

  const handleConfirmDeleteDemoItems = async () => {
    setShowDeleteDemosConfirm(false);
    try {
      const count = await db.deleteDemoItems();
      db.getMarketplaceItems().then(setAllPlatformItems);
      showToast(isKurdish ? `${count} کاڵای دیمۆ سڕانەوە!` : `Deleted ${count} demo items!`, 'success');
    } catch (err) {
      console.error("Failed to delete demo items:", err);
      showToast(isKurdish ? 'کێشەیەک ڕوویدا لە سڕینەوەی دیمۆکان' : 'Failed to delete demo items', 'error');
    }
  };

  // Followed sellers & Archived Live Broadcasts state
  const [followedSellers, setFollowedSellers] = useState<SellerProfile[]>([]);
  const [userBroadcasts, setUserBroadcasts] = useState<LiveSession[]>([]);
  const [activeReplaySession, setActiveReplaySession] = useState<LiveSession | null>(null);

  useEffect(() => {
    if (user) {
      db.getSellers().then(sellers => {
        const followed = sellers.filter(s => s.followers && Array.isArray(s.followers) && s.followers.includes(user.id));
        setFollowedSellers(followed);
      }).catch(() => {});

      const unsubLive = db.onUserLiveSessionsChange(user.id, (sessions) => {
        setUserBroadcasts(sessions);
      });
      return () => unsubLive();
    }
  }, [user, activeTab]);

  const handleUnfollowSeller = async (sellerId: string) => {
    if (!user) return;
    try {
      await db.toggleFollowSeller(sellerId, user.id);
      setFollowedSellers(prev => prev.filter(s => s.id !== sellerId));
      showToast(isKurdish ? 'فرۆشگاکە لە شوێنکەوتووەکان لابرا' : 'Unfollowed account', 'info');
    } catch (err) {
      console.error("Failed to unfollow seller:", err);
    }
  };

  const handleDeleteBroadcast = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      setUserBroadcasts(prev => prev.filter(s => s.id !== sessionId));
      await db.deleteLiveSession(sessionId);
      showToast(isKurdish ? 'پەخشە ئەرشیفکراوەکە بە سەرکەوتوویی سڕایەوە' : 'Archived broadcast deleted', 'success');
    } catch (err) {
      console.error("Failed to delete broadcast:", err);
      showToast(isKurdish ? 'کێشەیەک لە سڕینەوەی پەخش ڕوویدا' : 'Failed to delete broadcast', 'error');
    }
  };

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Edit form states initialized with current user properties
  const [username, setUsername] = useState(user.username || user.name.toLowerCase().replace(/\s+/g, '_'));
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [showPhoneToPublic, setShowPhoneToPublic] = useState<boolean>(user.showPhoneToPublic !== false);
  const [city, setCity] = useState(user.city || 'Erbil');
  const [address, setAddress] = useState(user.address || '');
  const [category, setCategory] = useState(user.category || 'Direct Sourcing & Farm Products');
  const [isPublic, setIsPublic] = useState<boolean>(user.isPublic !== false);
  const [broadcastRetentionDays, setBroadcastRetentionDays] = useState<number>(user.broadcastRetentionDays || 30);

  useEffect(() => {
    if (user?.id) {
      setAvatar(user.avatar || '');
    }
  }, [user?.id]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for orders to allow instant deletion and clearing
  const [localOrders, setLocalOrders] = useState<Order[]>(() => {
    let deletedIds = new Set<string>();
    try {
      const raw = localStorage.getItem('payv_deleted_order_ids');
      if (raw) deletedIds = new Set(JSON.parse(raw));
    } catch (e) {}
    return (orders || []).filter(o => !deletedIds.has((o as any)._id || o.id));
  });
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [reviewingItem, setReviewingItem] = useState<MarketplaceItem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  useEffect(() => {
    let deletedIds = new Set<string>();
    try {
      const raw = localStorage.getItem('payv_deleted_order_ids');
      if (raw) deletedIds = new Set(JSON.parse(raw));
    } catch (e) {}
    const cleanOrders = (orders || []).filter(o => {
      const idVal = (o as any)._id || o.id;
      return !deletedIds.has(idVal);
    });
    setLocalOrders(cleanOrders);
  }, [orders]);

  // Items listed by this user
  const userListings = useMemo(() => {
    return items.filter(item => {
      const isOwner = Boolean(
        item.userId === user.id ||
        (item.sellerId && item.sellerId === user.id) ||
        (user.phone && item.sellerPhone && user.phone.replace(/\D/g, '') === item.sellerPhone.replace(/\D/g, '')) ||
        (user.email === 'afsun2026app@gmail.com' && item.userId === 'sandbox-id')
      );
      return isOwner;
    });
  }, [items, user]);

  // Items purchased by this user
  const userOrders = useMemo(() => {
    let deletedIds = new Set<string>();
    try {
      const raw = localStorage.getItem('payv_deleted_order_ids');
      if (raw) deletedIds = new Set(JSON.parse(raw));
    } catch (e) {}

    return localOrders.filter(ord => {
      const ordId = (ord as any)._id || ord.id;
      if (ordId && deletedIds.has(ordId)) return false;
      return (
        ord.userId === user.id || 
        (ord as any).buyerId === user.id ||
        (user.phone && (ord as any).phone === user.phone) ||
        (user.email && ((ord as any).email === user.email || (ord as any).customerEmail === user.email))
      );
    });
  }, [localOrders, user]);

  // Orders received for this user's boutique store items
  const sellerStoreOrders = useMemo(() => {
    const listingIds = new Set(userListings.map(l => l.id));
    return localOrders.filter(ord => {
      const hasSellerListing = ord.items && Array.isArray(ord.items) && ord.items.some(it => 
        listingIds.has(it.itemId) || 
        (it as any).sellerId === user.id ||
        (user.businessName && it.sellerName && it.sellerName.trim().toLowerCase() === user.businessName.trim().toLowerCase())
      );
      return (
        hasSellerListing ||
        (ord as any).sellerId === user.id ||
        (ord as any).shopOwnerId === user.id
      );
    });
  }, [localOrders, userListings, user]);

  const handleDeleteSingleOrder = async (orderId: string) => {
    // 1. Immediately remove from local UI state
    setLocalOrders(prev => prev.filter(o => o.id !== orderId && (o as any)._id !== orderId));

    // 2. Permanently record in localStorage blacklist
    try {
      const raw = localStorage.getItem('payv_deleted_order_ids');
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(orderId)) {
        list.push(orderId);
        localStorage.setItem('payv_deleted_order_ids', JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Error saving deleted order id:", e);
    }

    // 3. Delete from DB, Firestore & Backend
    await db.deleteOrder(orderId);

    // 4. Notify app listeners
    window.dispatchEvent(new CustomEvent('orders_updated'));
  };

  const handleClearAllOrders = async () => {
    setIsClearingOrders(true);
    try {
      const targetIds = localOrders.map(o => (o as any)._id || o.id).filter(Boolean);
      try {
        const raw = localStorage.getItem('payv_deleted_order_ids');
        const list = raw ? JSON.parse(raw) : [];
        const combined = Array.from(new Set([...list, ...targetIds]));
        localStorage.setItem('payv_deleted_order_ids', JSON.stringify(combined));
      } catch (e) {}

      setLocalOrders([]);
      await db.clearUserOrders(user.id, user.phone, user.email, user.name);
      window.dispatchEvent(new CustomEvent('orders_updated'));
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Error clearing orders:", err);
    } finally {
      setIsClearingOrders(false);
    }
  };

  // Items liked/saved by this user
  const likedItems = useMemo(() => {
    return items.filter(item => 
      item.likes && Array.isArray(item.likes) && item.likes.includes(user.id)
    );
  }, [items, user]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      if (phone.trim()) {
        const existingUser = await db.findUserByPhone(phone.trim(), user.id);
        if (existingUser && existingUser.id !== user.id) {
          showToast(
            isKurdish
              ? `ئەم ژمارە مۆبایلە (${phone.trim()}) پێشتر بۆ هەژمارێکی تر تۆمارکراوە! بۆ پاراستنی ئاسایش، هەر ژمارەیەک تەنها دەتوانێت یەک هەژماری هەبێت.`
              : `This phone number (${phone.trim()}) is already registered to another account! For security, only ONE account is permitted per phone number.`,
            'error'
          );
          setSaving(false);
          return;
        }
      }

      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');

      const updated: User = {
        ...user,
        name: name.trim(),
        username: cleanUsername || user.name.toLowerCase().replace(/\s+/g, '_'),
        bio: bio.trim(),
        avatar: avatar.trim(),
        phone: phone.trim(),
        city,
        address: address.trim(),
        category,
        isPublic,
        showPhoneToPublic,
        broadcastRetentionDays
      };

      await onUpdateProfile(updated);
      setSaveSuccess(true);
      showToast(
        isKurdish ? 'گۆڕانکارییەکانی پرۆفایل بە سەرکەوتوویی پاشەکەوت کران' : 'Profile successfully saved!',
        'success'
      );
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('listed');
      }, 1200);
    } catch (err) {
      console.error("Error saving user profile:", err);
      showToast(
        isKurdish ? 'هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن' : 'Error saving profile',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler - auto-saves image immediately
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = (reader.result as string) || '';
          if (!rawBase64) return;
          const compressed = await compressBase64Image(rawBase64, 500, 0.85);
          const finalAvatar = compressed || rawBase64;
          setAvatar(finalAvatar);

          const updated: User = {
            ...user,
            name: name.trim() || user.name,
            username: username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '') || user.username,
            bio: bio.trim(),
            avatar: finalAvatar,
            phone: phone.trim() || user.phone,
            city,
            address: address.trim(),
            category,
            isPublic,
            showPhoneToPublic,
            broadcastRetentionDays
          };

          await onUpdateProfile(updated);

          showToast(
            isKurdish 
              ? 'وێنەی پرۆفایل بە سەرکەوتوویی بارکرا و پاشەکەوت کرا!' 
              : 'Profile photo uploaded and saved successfully!',
            'success'
          );
        } catch (err) {
          console.error("Error saving avatar file:", err);
          showToast(
            isKurdish ? 'هەڵەیەک ڕوویدا لە بارکردنی وێنەکە' : 'Error saving profile photo',
            'error'
          );
        }
      };
      reader.onerror = () => {
        showToast(
          isKurdish ? 'هەڵەیەک ڕوویدا لە خوێندنەوەی پەڕگە' : 'Error reading file',
          'error'
        );
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Filter listings based on search
  const filteredListings = useMemo(() => {
    if (!searchQuery) return userListings;
    return userListings.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userListings, searchQuery]);

  const isRoyal = theme === 'royal';

  return (
    <div className={clsx(
      "w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-6xl rounded-none sm:rounded-3xl p-3 sm:p-5 shadow-2xl relative flex flex-col overflow-hidden space-y-3 font-sans antialiased",
      isRoyal 
        ? "bg-[#060a16] border-0 sm:border sm:border-amber-400/30 text-white shadow-black/90" 
        : "bg-slate-50/95 sm:bg-white border-0 sm:border sm:border-slate-200/80 text-slate-900"
    )}>
      
      {/* Top Header Bar - Minimal single-row mobile & desktop layout */}
      <div className={clsx(
        "flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 shrink-0 rounded-2xl shadow-xs gap-2 min-h-[50px]",
        isRoyal 
          ? "bg-[#091124] border border-amber-400/20 text-white" 
          : "border border-slate-200/80 bg-white"
      )}>
        {/* Right side in RTL (start): Return Home + Profile Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0",
                isRoyal
                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80"
              )}
              title={tr('گەڕانەوە بۆ ماڵەوە', 'الرجوع للرئيسية', 'Return to Home')}
              aria-label="Return to Home"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <ArrowRight className="w-3 h-3 rtl:rotate-0 ltr:rotate-180 shrink-0" />
              <span className="whitespace-nowrap font-black">
                {tr('ماڵەوە', 'الرئيسية', 'Home')}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <div className={clsx(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-xl p-0.5 shadow-2xs shrink-0",
              isRoyal ? "bg-gradient-to-tr from-amber-500 to-amber-300" : "bg-gradient-to-tr from-indigo-500 to-teal-400"
            )}>
              <div className={clsx(
                "w-full h-full rounded-[0.6rem] flex items-center justify-center overflow-hidden",
                isRoyal ? "bg-[#060a16]" : "bg-white"
              )}>
                {avatar || user.avatar ? (
                  <img src={avatar || user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className={clsx("w-3.5 h-3.5", isRoyal ? "text-amber-400" : "text-indigo-600")} />
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className={clsx("font-black text-xs sm:text-sm tracking-tight truncate max-w-[130px] sm:max-w-[220px]", isRoyal ? "text-amber-300" : "text-slate-900")}>
                {user.name}
              </h3>
              <p className={clsx("text-[9px] sm:text-[10px] font-mono font-semibold truncate", isRoyal ? "text-slate-400" : "text-slate-500")}>
                ID: #{user.id.slice(-8)}
              </p>
            </div>
          </div>
        </div>

        {/* Left side in RTL (end): Logo + SignOut + Close X */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className={clsx("hidden lg:flex items-center gap-1.5 pr-2 border-r", isRoyal ? "border-slate-700" : "border-slate-200")}>
            <EBazirganLogo size={20} variant="icon" />
            <span className={clsx("text-xs font-black uppercase tracking-wider", isRoyal ? "text-amber-300" : "text-slate-900")}>
              E-BAZIRGAN
            </span>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className={clsx(
                "flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0",
                isRoyal
                  ? "bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white"
                  : "bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800"
              )}
              title={tr('دەرچوون لە هەژمار (Sign Out)', 'تسجيل الخروج', 'Sign Out')}
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap font-bold text-[11px]">
                {tr('دەرچوون', 'خروج', 'Sign Out')}
              </span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className={clsx(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0 active:scale-90",
                isRoyal ? "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/80"
              )}
              aria-label="Close"
              title={tr('داخستن', 'إغلاق', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className={clsx(
        "flex-grow overflow-y-auto pr-0.5 space-y-3 sm:space-y-4 custom-scrollbar min-h-0",
        isRoyal ? "text-slate-200" : "text-slate-700"
      )}>
        
        {/* Toast Alert Notification */}
        {toastMsg && (
          <div className={clsx(
            "p-3 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-sm animate-in fade-in slide-in-from-top-2",
            toastMsg.type === 'success' && "bg-emerald-100 text-emerald-950 border-emerald-300",
            toastMsg.type === 'error' && "bg-rose-100 text-rose-950 border-rose-300",
            toastMsg.type === 'info' && "bg-sky-100 text-sky-950 border-sky-300"
          )}>
            <span>{toastMsg.msg}</span>
            <button onClick={() => setToastMsg(null)} className="p-0.5 hover:bg-black/5 rounded cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Triple Section Switcher (Profile vs Seller Hub vs Accounting) - Minimal Segmented Control */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner gap-1">
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={clsx(
              "py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs",
              activeSection === 'profile'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/40 dark:text-slate-400"
            )}
          >
            <UserIcon className="w-3.5 h-3.5 font-black text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{tr('١. پرۆفایل', '١. الملف الشخصي', '1. Profile')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('seller')}
            className={clsx(
              "py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs",
              activeSection === 'seller'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/40 dark:text-slate-400"
            )}
          >
            <Store className="w-3.5 h-3.5 font-black text-amber-500 shrink-0" />
            <span className="truncate">{tr('٢. داشبۆردی فرۆشیار', '٢. لوحة البائع', '2. Seller Hub')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('accounting')}
            className={clsx(
              "py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs",
              activeSection === 'accounting'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/40 dark:text-slate-400"
            )}
          >
            <Tag className="w-3.5 h-3.5 font-black text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{tr('٣. ژمێریاری', '٣. المحاسبة', '3. Accounting')}</span>
          </button>
        </div>

        {/* SECTION 2: SELLER DASHBOARD (WHEN SELECTED) */}
        {activeSection === 'seller' ? (
          <div className="space-y-4">
            <SellerDashboard
              user={user}
              items={items}
              orders={orders}
              onRefreshData={() => {
                window.dispatchEvent(new CustomEvent('orders_updated'));
              }}
              onAddItem={onAddItem}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onUpdateOrderStatus={async (orderId, newStatus) => {
                await db.updateOrderStatus(orderId, newStatus);
                setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
              }}
              onClose={() => setActiveSection('profile')}
            />
          </div>
        ) : activeSection === 'accounting' ? (
          /* SECTION 3: ACCOUNTING & SALES (WHEN SELECTED) */
          <div className="space-y-4">
            <AccountingModule 
              user={user} 
              i18n={i18n} 
              onShowToast={(msg, type) => showToast(msg, type)} 
            />
          </div>
        ) : (
          /* SECTION 1: USER PROFILE & ACTIVITIES */
          <div className="space-y-3 sm:space-y-4">
            {/* Banner & User Main Info Card - Minimalist Executive Layout */}
            <div className={clsx(
              "relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-3.5 sm:p-4 shadow-xs",
              isRoyal ? "bg-[#091124] border-amber-400/20 text-white" : ""
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                
                {/* Avatar and Identity */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Avatar container with (+) upload button */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-400 shadow-sm">
                      <div className="w-full h-full rounded-[0.9rem] bg-white overflow-hidden flex items-center justify-center relative">
                        {avatar || user.avatar ? (
                          <img 
                            src={avatar || user.avatar} 
                            alt={user.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon className="w-7 h-7 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Corner (+) Plus Button for Upload */}
                    <label 
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white cursor-pointer transition-all active:scale-90 z-20"
                      title={tr('گۆڕینی وێنەی پرۆفایل', 'تغيير صورة الحساب', 'Change Photo')}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                    </label>
                  </div>

                  {/* User Meta Information */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {user.name}
                      </h2>
                      {user.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                          <CheckCircle2 className="w-3 h-3 text-sky-600 shrink-0" />
                          <span>{tr('پشڕاستکراو', 'موثق', 'Verified')}</span>
                        </span>
                      )}
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                          SUPER ADMIN
                        </span>
                      )}
                      {user.isPerfectSeller && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          <span>{tr('فرۆشیاری نموونەیی', 'متميز', 'Perfect')}</span>
                        </span>
                      )}
                      {user.isTrustedSeller && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <Award className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{tr('مۆری باوەڕپێکراو', 'ختم الثقة', 'Trusted')}</span>
                        </span>
                      )}
                    </div>

                    {/* Handle and details */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        @{user.username || user.name.toLowerCase().replace(/\s+/g, '_')}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{user.phone || '0750 XXX XXXX'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{user.city || 'Erbil'}</span>
                      </span>
                      {user.category && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{user.category}</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Bio text without oversized quotes */}
                    {user.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-normal pt-0.5 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Profile Actions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveSection('seller')}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span>{tr('🏪 داشبۆردی فرۆشیار', '🏪 لوحة البائع', '🏪 Seller Hub')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{tr('دەستکاری', 'تعديل', 'Edit Profile')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Activity & Action Sub-Tabs Tray - Horizontal Scroll on Mobile, Sleek Segmented Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 shrink-0 border-b border-slate-200/80 pb-2">
              {/* Tab 1: Listed */}
              <button
                type="button"
                onClick={() => setActiveTab('listed')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'listed'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                )}
              >
                <Package className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('کاڵاکانم', 'إعلاناتي', 'Listed')}</span>
                <span className={clsx("px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeTab === 'listed' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                  {userListings.length}
                </span>
              </button>

              {/* Tab 1.5: Analytics */}
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'analytics'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('ئاماری فرۆشگا', 'تحليلات المتجر', 'Analytics')}</span>
              </button>

              {/* Tab 2: Purchases */}
              <button
                type="button"
                onClick={() => setActiveTab('purchased')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'purchased'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('داواکارییەکان', 'الطلبات', 'Purchases')}</span>
                <span className={clsx("px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeTab === 'purchased' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                  {userOrders.length}
                </span>
              </button>

              {/* Tab 3: Favorites */}
              <button
                type="button"
                onClick={() => setActiveTab('liked')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'liked'
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                )}
              >
                <Heart className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('دڵخواز', 'المفضلة', 'Liked')}</span>
                <span className={clsx("px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeTab === 'liked' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                  {likedItems.length}
                </span>
              </button>

              {/* Tab 4: Stores */}
              <button
                type="button"
                onClick={() => setActiveTab('followed')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'followed'
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                )}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('شوێنکەوتوو', 'المتاجر المتابعة', 'Stores')}</span>
                <span className={clsx("px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeTab === 'followed' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                  {followedSellers.length}
                </span>
              </button>

              {/* Tab 4.5: Broadcasts */}
              <button
                type="button"
                onClick={() => setActiveTab('broadcasts')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'broadcasts'
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                )}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('پەخشەکانم', 'بثوثي', 'Live Streams')}</span>
                <span className={clsx("px-1.5 py-0.2 rounded-full text-[10px] font-mono", activeTab === 'broadcasts' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                  {userBroadcasts.length}
                </span>
              </button>

              {/* Tab: Loyalty */}
              <button
                type="button"
                onClick={() => setActiveTab('loyalty')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95",
                  activeTab === 'loyalty'
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-white hover:bg-slate-100 text-amber-900 border border-amber-300"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('خاڵەکان', 'نقاط المكافأة', 'Points')}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-amber-100 text-amber-950">
                  {Number(user.loyaltyPoints) || 0}
                </span>
              </button>

              {/* Tab 5: Messages */}
              {onOpenMessages && (
                <button
                  type="button"
                  onClick={onOpenMessages}
                  className="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                  <span>{tr('پەیامەکانم', 'الرسائل', 'Inbox')}</span>
                </button>
              )}

              {/* Tab 6: Admin Panel (If Admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95",
                    activeTab === 'admin'
                      ? "bg-rose-600 text-white ring-2 ring-rose-400/50"
                      : "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300"
                  )}
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{tr('پانێڵی ئەدمین', 'لوحة الإدارة', 'Admin Panel')}</span>
                </button>
              )}
            </div>

        {/* TAB 1: LISTED ITEMS */}
        {activeTab === 'listed' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-purple-200/90 p-3.5 sm:p-4 rounded-2xl shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                <input
                  type="text"
                  placeholder={tr('گەڕان لە پۆستەکانم...', 'البحث في إعلاناتي...', 'Search my listings...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs"
                />
              </div>

              {onAddItem && (
                <button
                  onClick={onAddItem}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{tr('زیادکردنی کاڵای نوێ', 'إضافة إعلان جديد', 'Add New Item')}</span>
                </button>
              )}
            </div>

            {filteredListings.length === 0 ? (
              <div className="text-center py-8 sm:py-10 bg-white border border-dashed border-purple-300 rounded-2xl space-y-3 shadow-xs">
                <Package className="w-10 h-10 text-purple-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {tr('هیچ کاڵایەکی بڵاوکراوەت نییە.', 'لم تقم بإضافة أي إعلانات حتى الآن.', 'You have not listed any items yet.')}
                </p>
                {onAddItem && (
                  <button
                    onClick={onAddItem}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs hover:bg-emerald-500 transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{tr('یەکەم کاڵا بڵاوبکەرەوە', 'انشر إعلانك الأول', 'Publish First Listing')}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredListings.map((item, idx) => {
                  const lastBump = item.last_bumped_at || item.lastBumpedAt || 0;
                  const isBumpedRecently = lastBump > 0 && (Date.now() - lastBump < 24 * 60 * 60 * 1000);
                  const isExpired = isPostExpired(item);
                  const rule = getBumpRuleForCategory(item.category);
                  const bumpCount = item.bump_count ?? item.bumpCount ?? 0;

                  return (
                    <div
                      key={`${item.id || 'item'}-${idx}`}
                      className="bg-white/95 border border-purple-100 hover:border-amber-400 rounded-2xl p-3.5 space-y-3 transition-all shadow-sm hover:shadow-md group relative overflow-hidden flex flex-col justify-between"
                    >
                      <div 
                        className="relative h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer"
                        onClick={() => onSelectItem && onSelectItem(item)}
                      >
                        <img 
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=300'} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <span className="absolute top-2 left-2 bg-slate-900/85 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10 uppercase shadow-xs">
                          {item.category}
                        </span>

                        {isBumpedRecently && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse">
                            <Zap className="w-3 h-3 fill-slate-950" />
                            {tr('لە لوتکەدایە', 'في المقدمة', 'Bumped Top')}
                          </span>
                        )}

                        {isExpired && !isBumpedRecently && (
                          <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            {tr('کۆن بووە', 'منتهي الصلاحية', 'Expired')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 
                            onClick={() => onSelectItem && onSelectItem(item)}
                            className="text-xs font-bold text-slate-900 truncate cursor-pointer hover:text-amber-600 transition-colors"
                            title={item.title}
                          >
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {bumpCount}/{rule.maxBumps} {tr('سەرەوە', 'ترقية', 'bumps')}
                          </span>
                        </div>

                        <p className="text-sm sm:text-base font-black text-amber-700 font-mono">
                          {item.price?.toLocaleString()} IQD
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2.5 text-[10px]">
                          <span className="flex items-center gap-1 font-mono font-bold" title={tr('بینینەکان', 'المشاهدات', 'Views')}>
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            {item.analytics?.views || 12}
                          </span>
                          <span className="flex items-center gap-1 font-mono font-bold text-rose-600" title={tr('دڵخوازەکان', 'الإعجابات', 'Likes')}>
                            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                            {item.likes?.length || 0}
                          </span>
                          <span className="flex items-center gap-1 text-indigo-600 font-mono font-bold" title={tr('چاودێران', 'المتابعون', 'Watchers')}>
                            <Bell className="w-3.5 h-3.5 text-indigo-600" />
                            {item.saves?.length || 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onEditItem && (
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                              title={tr('دەستکاری پۆست و گۆڕینی نرخ', 'تعديل السعر والإعلان', 'Edit Post & Price')}
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{tr('دەستکاری', 'تعديل', 'Edit')}</span>
                            </button>
                          )}
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg transition-all cursor-pointer border border-rose-200"
                              title={tr('سڕینەوەی پۆست', 'حذف الإعلان', 'Delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PURCHASED ITEMS / ORDERS */}
        {activeTab === 'purchased' && (
          <div className="space-y-4">
            {/* Header with Title and Clear History Action */}
            <div className="bg-white/90 border border-purple-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      {tr('مێژووی داواکارییەکان', 'سجل الطلبات والمشتريات', 'Order History')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {userOrders.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {tr('تەواوی داواکارییەکان و کڕینەکانی پێشووت لێرە دەبینیت', 'جميع طلباتك ومشترياتك السابقة مسجلة هنا', 'All your past orders and purchases are listed here')}
                  </p>
                </div>
              </div>

              {userOrders.length > 0 && (
                <div>
                  {showClearConfirm ? (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-300 p-1.5 rounded-xl">
                      <span className="text-xs text-rose-800 font-bold px-2">
                        {tr('دڵنیایت لە سڕینەوەی هەموو مێژوو؟', 'هل أنت متأكد من مسح السجل؟', 'Clear all history?')}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllOrders}
                        disabled={isClearingOrders}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isClearingOrders ? tr('دەسڕدرێتەوە...', 'جاري الحذف...', 'Clearing...') : tr('بەڵێ، بسڕەوە', 'نعم، احذف', 'Yes, Clear')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        {tr('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black border border-rose-300 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>{tr('بەتاڵکردنەوەی مێژوو', 'مسح سجل الطلبات', 'Clear Order History')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {userOrders.length === 0 ? (
              <div className="text-center py-12 bg-white/80 border border-dashed border-purple-200 rounded-2xl space-y-3 shadow-xs">
                <ShoppingBag className="w-12 h-12 text-purple-300 mx-auto" />
                <p className="text-sm font-bold text-slate-500">
                  {tr('هیچ داواکارییەک لە لایەن تۆوە نەکراوە یان مێژووەکە بەتاڵکراوەتەوە.', 'لا توجد أي طلبات سابقة في سجلك.', 'You have no orders in your history.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {userOrders.map((ord, idx) => {
                  const orderId = (ord as any)._id || ord.id || 'ORD-101';
                  const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

                  return (
                    <div
                      key={`${orderId}-${idx}`}
                      className="bg-white/95 border border-purple-100 hover:border-indigo-300 rounded-2xl p-4 space-y-3 shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-indigo-700">
                            #{orderId.slice(-8)}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {dateStr}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shadow-2xs",
                            ord.status === 'delivered' && "bg-emerald-100 text-emerald-900 border-emerald-300",
                            ord.status === 'shipped' && "bg-sky-100 text-sky-900 border-sky-300",
                            ord.status === 'processing' && "bg-indigo-100 text-indigo-900 border-indigo-300",
                            ord.status === 'pending' && "bg-amber-100 text-amber-900 border-amber-300",
                            ord.status === 'cancelled' && "bg-rose-100 text-rose-900 border-rose-300"
                          )}>
                            {ord.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                            <span>{ord.status || 'Pending'}</span>
                          </span>

                          {/* Delete Single Order Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleOrder(orderId)}
                            title={tr('سڕینەوەی ئەم داواکارییە لە مێژوو', 'حذف هذا الطلب من السجل', 'Delete order from history')}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items summary */}
                      <div className="space-y-2">
                        {ord.items && ord.items.map((it: any, itemIdx: number) => {
                          const targetItem: MarketplaceItem = items.find(i => i.id === it.itemId) || {
                            id: it.itemId || `purchased_${orderId}_${itemIdx}`,
                            title: it.title || 'Marketplace Item',
                            description: it.description || '',
                            price: it.price || 0,
                            imageUrl: it.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=100',
                            category: it.category || 'purchased',
                            postType: 'marketplace' as const,
                            userId: it.sellerId || (ord as any).sellerId || '',
                            userName: it.sellerName || '',
                            likes: [],
                            saves: [],
                            createdAt: Date.now()
                          };

                          return (
                            <div key={itemIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <img 
                                  src={it.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=100'} 
                                  alt={it.title} 
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">{it.title || 'Marketplace Item'}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    Qty: {it.quantity || 1} x {it.price?.toLocaleString()} IQD
                                    {it.size ? ` • ${it.size}` : ''}
                                    {it.color ? ` • ${it.color}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingItem(targetItem);
                                    setShowReviewModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                  title={tr('هەڵسەنگاندن و کۆمێنت بۆ ئەم کاڵایە', 'تقييم ومراجعة هذا المنتج', 'Rate & review this item')}
                                >
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                                  <span>{tr('هەڵسەنگاندن', 'تقييم', 'Rate Item')}</span>
                                </button>
                                <span className="font-mono font-bold text-amber-700">
                                  {((it.price || 0) * (it.quantity || 1)).toLocaleString()} IQD
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="font-mono">
                          <span className="text-[10px] text-slate-500 font-sans block">{tr('کۆی داواکاری', 'المجموع الكلي', 'Order Total')}</span>
                          <span className="font-black text-amber-800 text-sm sm:text-base">{(ord.total || (ord as any).totalPrice || 0).toLocaleString()} IQD</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setTrackingOrderId(prev => prev === orderId ? null : orderId);
                            if (onOpenTrackOrder) onOpenTrackOrder(orderId);
                          }}
                          className={clsx(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                            trackingOrderId === orderId
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                          )}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{tr('بەدواداچوونی گەیاندن', 'تتبع الشحنة', 'Track My Order')}</span>
                          {trackingOrderId === orderId ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Track My Order: Interactive Timeline View */}
                      {trackingOrderId === orderId && (
                        <div className="mt-3 pt-3 border-t border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-slate-50 p-3.5 rounded-xl space-y-3.5 border border-indigo-100/80 animate-in fade-in duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-900">
                                  {tr('بەدواداچوونی بار و گەیاندن', 'تتبع حالة الشحنة المباشرة', 'Live Shipment Timeline')}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  #{orderId}
                                </p>
                              </div>
                            </div>

                            <span className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                              ord.status === 'delivered' && "bg-emerald-100 text-emerald-900 border-emerald-300",
                              ord.status === 'shipped' && "bg-sky-100 text-sky-900 border-sky-300",
                              (ord.status === 'processing' || ord.status === 'confirmed') && "bg-indigo-100 text-indigo-900 border-indigo-300",
                              ord.status === 'pending' && "bg-amber-100 text-amber-900 border-amber-300",
                              ord.status === 'cancelled' && "bg-rose-100 text-rose-900 border-rose-300"
                            )}>
                              {ord.status || 'Pending'}
                            </span>
                          </div>

                          {/* 4-Step Timeline: Pending -> Confirmed -> Shipped -> Delivered */}
                          <div className="relative pl-1 sm:pl-2 py-1">
                            {(() => {
                              const steps = [
                                {
                                  key: 'pending',
                                  title: tr('داواکاری تۆمارکرا (Pending)', 'تم استلام الطلب', 'Order Placed (Pending)'),
                                  desc: tr('داواکارییەکەت بە سەرکەوتوویی لە لایەن فرۆشیارەوە وەرگیرا', 'تم تسجيل طلبك وبانتظار التجهيز', 'Order received and recorded in system'),
                                  icon: Clock,
                                  time: ord.createdAt
                                },
                                {
                                  key: 'confirmed',
                                  title: tr('پشتڕاستکرایەوە (Confirmed)', 'تم تأكيد الطلب', 'Order Confirmed'),
                                  desc: tr('داواکاری پشتڕاستکرایەوە و کاڵاکان ئامادەکران', 'تمت مراجعة الطلب وتجهيز الصندوق', 'Items verified and prepared for dispatch'),
                                  icon: CheckCircle2,
                                  time: (ord.status === 'confirmed' || ord.status === 'processing' || ord.status === 'shipped' || ord.status === 'delivered') ? ord.updatedAt : null
                                },
                                {
                                  key: 'shipped',
                                  title: tr('لە ڕێگایە (Shipped)', 'الشحنة في الطريق', 'In Transit (Shipped)'),
                                  desc: tr('سپێردراوە بە مەندووب یان تەکسی گەیاندن و بەڕێوەیە', 'الشحنة تم تسليمها إلى شركة التوصيل', 'Handed to delivery courier and on the way'),
                                  icon: Truck,
                                  time: (ord.status === 'shipped' || ord.status === 'delivered') ? ord.updatedAt : null
                                },
                                {
                                  key: 'delivered',
                                  title: tr('گەیەندراوە (Delivered)', 'تم الاستلام بنجاح', 'Delivered'),
                                  desc: tr('کاڵاکە بە سەرکەوتوویی گەیەندراوەتە دەست کڕیار', 'تم تسليم الشحنة للزبون بنجاح', 'Order delivered successfully to recipient'),
                                  icon: PackageCheck,
                                  time: ord.status === 'delivered' ? ord.updatedAt : null
                                }
                              ];

                              // Status mapping
                              let currentIdx = 0;
                              if (ord.status === 'delivered') currentIdx = 3;
                              else if (ord.status === 'shipped') currentIdx = 2;
                              else if (ord.status === 'confirmed' || ord.status === 'processing') currentIdx = 1;
                              else if (ord.status === 'cancelled') currentIdx = -1;

                              return (
                                <div className="space-y-4">
                                  {steps.map((step, sIdx) => {
                                    const isCompleted = currentIdx >= sIdx;
                                    const isCurrent = currentIdx === sIdx;
                                    const StepIcon = step.icon;

                                    return (
                                      <div key={step.key} className="flex items-start gap-3 relative group">
                                        {/* Timeline Line Connector */}
                                        {sIdx < steps.length - 1 && (
                                          <div 
                                            className={clsx(
                                              "absolute left-3.5 sm:left-4 top-8 w-0.5 h-10 transition-colors duration-300",
                                              currentIdx > sIdx ? "bg-emerald-500" : "bg-slate-200"
                                            )}
                                          />
                                        )}

                                        {/* Status Dot / Icon */}
                                        <div className={clsx(
                                          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all shadow-xs",
                                          isCompleted
                                            ? (isCurrent 
                                                ? "bg-indigo-600 text-white ring-4 ring-indigo-100" 
                                                : "bg-emerald-500 text-white")
                                            : "bg-slate-100 text-slate-400 border border-slate-300"
                                        )}>
                                          <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>

                                        {/* Step Content */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                          <div className="flex items-center justify-between gap-1">
                                            <h5 className={clsx(
                                              "text-xs font-black",
                                              isCurrent ? "text-indigo-950" : isCompleted ? "text-slate-800" : "text-slate-400"
                                            )}>
                                              {step.title}
                                            </h5>
                                            {step.time && (
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(step.time).toLocaleDateString(isKurdish ? 'ku-IQ' : 'en-US', { month: 'short', day: 'numeric' })}
                                              </span>
                                            )}
                                          </div>
                                          <p className={clsx(
                                            "text-[11px] leading-relaxed mt-0.5",
                                            isCompleted ? "text-slate-600" : "text-slate-400"
                                          )}>
                                            {step.desc}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Extra Courier & Destination Meta Card */}
                          {(ord.courierName || ord.courierPhone || ord.estimatedDelivery || ord.city || ord.address) && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 text-xs space-y-1.5 shadow-2xs">
                              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                <Truck className="w-3 h-3 text-indigo-600" />
                                <span>{tr('زانیارییەکانی گەیاندن:', 'بيانات التوصيل والمندوب:', 'Delivery & Courier Details:')}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                                {ord.courierName && (
                                  <div>
                                    <span className="text-slate-400 font-normal">{tr('مەندووب: ', 'المندوب: ', 'Courier: ')}</span>
                                    <span className="font-bold text-slate-800">{ord.courierName}</span>
                                  </div>
                                )}
                                {ord.courierPhone && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400 font-normal">{tr('پەیوەندی: ', 'الهاتف: ', 'Tel: ')}</span>
                                    <a 
                                      href={`tel:${ord.courierPhone}`}
                                      className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="w-2.5 h-2.5" />
                                      <span>{ord.courierPhone}</span>
                                    </a>
                                  </div>
                                )}
                                {ord.estimatedDelivery && (
                                  <div>
                                    <span className="text-slate-400 font-normal">{tr('کاتی مەزەندەکراو: ', 'الموعد التقريبي: ', 'Est. Arrival: ')}</span>
                                    <span className="font-bold text-slate-800">{ord.estimatedDelivery}</span>
                                  </div>
                                )}
                                {(ord.city || ord.address) && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{ord.city ? `${ord.city} - ` : ''}{ord.address || ''}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIKED ITEMS */}
        {activeTab === 'liked' && (
          <div className="space-y-4">
            {likedItems.length === 0 ? (
              <div className="text-center py-12 bg-white/80 border border-dashed border-rose-200 rounded-2xl space-y-3 shadow-xs">
                <Heart className="w-12 h-12 text-rose-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">
                  {tr('هیچ کاڵایەکت لە دڵخوازەکان پاشەکەوت نەکردووە.', 'لم تقم بحفظ أي منتجات في المفضلة بعد.', 'You have not liked or saved any items yet.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {likedItems.map((item, idx) => (
                  <div
                    key={`${item.id || 'item'}-${idx}`}
                    className="bg-white/95 border border-purple-100 hover:border-rose-300 rounded-2xl p-3.5 space-y-3 transition-all shadow-sm hover:shadow-md group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div 
                      className="relative h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer"
                      onClick={() => onSelectItem && onSelectItem(item)}
                    >
                      <img 
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=300'} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <span className="absolute top-2 left-2 bg-slate-900/85 text-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10 uppercase shadow-xs">
                        {item.category}
                      </span>

                      {/* Unlike button */}
                      {onToggleLikeItem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLikeItem(item.id);
                          }}
                          className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white text-rose-600 rounded-full transition-all shadow-md cursor-pointer active:scale-90"
                          title={tr('لابردن لە دڵخوازەکان', 'إزالة من المفضلة', 'Remove from Liked')}
                        >
                          <Heart className="w-4 h-4 fill-rose-600" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <h4 
                        onClick={() => onSelectItem && onSelectItem(item)}
                        className="text-xs font-bold text-slate-900 truncate cursor-pointer hover:text-rose-600 transition-colors"
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <p className="text-sm sm:text-base font-black text-amber-700 font-mono">
                        {item.price?.toLocaleString()} IQD
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                      <span className="text-[10px] text-slate-500 truncate">
                        {tr('فرۆشیار', 'البائع', 'Seller')}: {item.userName || 'Verified Partner'}
                      </span>
                      <button
                        onClick={() => onSelectItem && onSelectItem(item)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{tr('بینین', 'عرض', 'View Item')}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3.5: FOLLOWED STORES & ACCOUNTS */}
        {activeTab === 'followed' && (
          <div className="space-y-4">
            {followedSellers.length === 0 ? (
              <div className="text-center py-12 bg-white/80 border border-dashed border-purple-200 rounded-2xl space-y-3 shadow-xs">
                <Users className="w-12 h-12 text-purple-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">
                  {tr('هیچ ئەکاونت و فرۆشگایەکت شوێن نەکەوتووە.', 'أنت لا تتابع أي متاجر أو حسابات حتى الآن.', 'You are not following any stores or accounts yet.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {followedSellers.map((seller, idx) => (
                  <div
                    key={`${seller.id || 'seller'}-${idx}`}
                    className="bg-white/95 border border-purple-100 hover:border-purple-300 rounded-2xl p-4 space-y-3 transition-all shadow-sm hover:shadow-md group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={seller.logoUrl || seller.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.id}`}
                          alt={seller.businessName}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-400"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {seller.businessName || 'Verified Store'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{seller.city || 'Erbil'}</span>
                          {seller.followers && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-purple-700 font-mono font-bold">
                                {seller.followers.length} {tr('شوێنکەوتوو', 'متابع', 'Followers')}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
                          <Bell className="w-3 h-3 text-emerald-600 animate-pulse" />
                          <span>{tr('ئاگاداری (Push Alert)ی کاڵای نوێ چالاکە', 'تنبيهات المنتجات الجديدة مفعلة', 'Push alerts for new products active')}</span>
                        </div>
                      </div>
                    </div>

                    {seller.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {seller.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUnfollowSeller(seller.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title={tr('لابردنی شوێنکەوتن', 'إلغاء المتابعة', 'Unfollow')}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>{tr('لابردنی شوێنکەوتن', 'إلغاء المتابعة', 'Unfollow')}</span>
                      </button>

                      {seller.contactPhone && (
                        <a
                          href={`https://wa.me/${seller.contactPhone.replace(/[\s\+]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{tr('پەیوەندی', 'تواصل', 'Contact')}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3.6: MY LIVE BROADCASTS & REPLAYS */}
        {activeTab === 'broadcasts' && (
          <div className="space-y-4">
            <div className="bg-white/90 border border-red-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      {tr('پەخشە ڕاستەوخۆکان و ئەرشیفکراوەکانم', 'بثوثي المباشرة والمؤرشفة', 'My Live Streams & Broadcasts')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-200">
                      {userBroadcasts.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {tr('لێرە دەتوانیت تەواوی پەخشەکانت بەڕێوەبەریت، سەیریان بکەیتەوە، یاخود بسڕیتەوە', 'يمكنك إدارة أو إعادة مشاهدة أو حذف أي بث قمت به من هنا', 'Manage, replay, or delete your broadcasts')}
                  </p>
                </div>
              </div>
            </div>

            {userBroadcasts.length === 0 ? (
              <div className="text-center py-12 bg-white/80 border border-dashed border-red-200 rounded-2xl space-y-3 shadow-xs">
                <Radio className="w-12 h-12 text-red-300 mx-auto" />
                <p className="text-sm font-bold text-slate-600">
                  {tr('هیچ پەخشێکی ڕاستەوخۆت تۆمار نەکردووە.', 'ليس لديك أي بثوث مباشرة مسجلة.', 'You have no recorded live streams yet.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userBroadcasts.map((sess, idx) => (
                  <div
                    key={sess.id || idx}
                    className="bg-white/95 border border-slate-200 hover:border-red-400 rounded-2xl p-3.5 space-y-3 transition-all shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-200">
                      <img
                        src={sess.currentFrame || sess.featuredImage || sess.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sess.broadcasterId}`}
                        alt={sess.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                        <Radio className="w-2.5 h-2.5" />
                        {sess.isReplay ? 'REPLAY' : 'LIVE'}
                      </span>
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Users className="w-3 h-3 text-red-400" />
                        {sess.viewerCount || 1}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {sess.title || sess.featuredTitle || 'Live Stream'}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{sess.location || 'Erbil'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open_live_stream_feed', { detail: { sessionId: sess.id } }));
                        }}
                        className="flex-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{tr('سەیرکردنەوە', 'مشاهدة', 'Watch')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteBroadcast(sess.id);
                        }}
                        className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                        title={tr('سڕینەوەی پەخش', 'حذف البث', 'Delete Stream')}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold text-rose-700 hidden sm:inline">{tr('سڕینەوە', 'حذف', 'Delete')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: STORE PERFORMANCE & SALES ANALYTICS (RECHARTS) */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <StoreAnalytics
              orders={sellerStoreOrders}
              storeName={user.businessName || (isKurdish ? `فرۆشگای ${user.name}` : `${user.name}'s Boutique`)}
              userListings={userListings}
              user={user}
            />
          </div>
        )}

        {/* TAB: LOYALTY POINTS & REWARDS HUB */}
        {activeTab === 'loyalty' && (() => {
          const currentPoints = Number(user.loyaltyPoints) || 0;
          const discountIqdValue = currentPoints * 100;
          const tier = db.getLoyaltyTier(currentPoints);
          const history = user.pointsHistory || [];
          const progressPercent = Math.min(100, Math.round((currentPoints / tier.nextThreshold) * 100));
          const pointsNeeded = Math.max(0, tier.nextThreshold - currentPoints);

          return (
            <div className="space-y-5 animate-fade-in">
              {/* Header Title */}
              <div className="bg-white/95 border border-amber-200/80 rounded-3xl p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{tr('سیستەمی خاڵەکانی وەفاداری و پاداشت', 'نظام نقاط المكافآت والولاء', 'Loyalty Points & Rewards')}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                        {tr(tier.nameKu, tier.nameAr, tier.name)}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {tr(
                        'لە هەر کڕینێکدا خاڵی نوێ بەدەستبهێنە و بۆ داشکاندنی ڕاستەوخۆ لە کڕینەکانی داهاتووتدا بەکاریان بهێنە.',
                        'اكسب نقاطاً في كل عملية شراء واستخدمها للحصول على خصومات فورية في مشترياتك القادمة.',
                        'Earn loyalty points on every purchase and redeem them for instant discounts on future orders.'
                      )}
                    </p>
                  </div>
                </div>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{tr('سەردانی بازاڕ و کڕین', 'تسوق في البازار', 'Shop to Earn')}</span>
                  </button>
                )}
              </div>

              {/* VIP Tier & Current Balance Hero Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-amber-300/60 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7">
                {/* Background Atmosphere */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left Column: Points & Value */}
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300">
                      <span className="text-base">{tier.icon}</span>
                      <span>{tr(tier.nameKu, tier.nameAr, tier.name)}</span>
                    </div>

                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                        {tr('خاڵە بەردەستەکانی ئێستات:', 'رصيدك الحالي من النقاط:', 'Available Points Balance:')}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                          {currentPoints.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-amber-400/90 font-mono uppercase tracking-wider">
                          {tr('خاڵی پاداشت', 'نقطة مكافأة', 'Loyalty Points')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-slate-300 font-medium">
                        {tr('بەهای داشکاندنی داهاتوو:', 'قيمة الخصم المستحق مستقبلاً:', 'Future Discount Value:')}
                      </span>
                      <span className="font-black font-mono text-emerald-400 text-sm">
                        {discountIqdValue.toLocaleString()} {tr('دینار', 'دينار', 'IQD')}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Progress to Next Tier */}
                  <div className="md:w-72 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">{tr('ئاستی داهاتوو:', 'المستوى التالي:', 'Next VIP Tier:')}</span>
                      <span className="text-amber-400 font-mono">{progressPercent}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {pointsNeeded > 0 ? (
                        tr(
                          `پێویستت بە ${pointsNeeded.toLocaleString()} خاڵی ترە بۆ گەیشتن بە ئاستی باڵاتر.`,
                          `تحتاج إلى ${pointsNeeded.toLocaleString()} نقطة إضافية للوصول إلى المستوى الأعلى.`,
                          `${pointsNeeded.toLocaleString()} more points needed to unlock next tier.`
                        )
                      ) : (
                        tr('تۆ لە بەرزترین ئاستی VIP دایت! پیرۆزە ✨', 'أنت في أعلى مستوى VIP! تهانينا ✨', 'You are at the highest VIP tier! Congrats ✨')
                      )}
                    </p>

                    <div className="pt-1.5 border-t border-white/10 text-[10px] text-amber-200/90 font-medium">
                      ★ {tr(tier.perksKu, tier.perksAr, 'Exclusive discounts & perks')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Step Interactive Explanation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white/95 border border-slate-200 space-y-2 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
                    ١
                  </div>
                  <h4 className="text-xs font-black text-slate-900">
                    {tr('کۆکردنەوە لە کڕیندا', 'كسب النقاط من المشتريات', 'Earn from Orders')}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {tr(
                      'بۆ هەر ١,٠٠٠ دینار کڕین لە بازاڕ، ١ خاڵی پاداشت وەردەگریت (نموونە: کڕینی ٣٠,٠٠٠ دینار = ٣٠ خاڵ).',
                      'لكل ١,٠٠٠ دينار تشتري به من البازار تكسب نقطة واحدة (مثال: طلب بـ ٣٠,٠٠٠ دينار = ٣٠ نقطة).',
                      'Earn 1 loyalty point for every 1,000 IQD spent on items in the marketplace.'
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/95 border border-slate-200 space-y-2 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                    ٢
                  </div>
                  <h4 className="text-xs font-black text-slate-900">
                    {tr('داشکاندنی داهاتوو', 'خصم نقدي مباشر مستقبلاً', 'Future Cash Discounts')}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {tr(
                      'هەر ١٠ خاڵی وەفاداری = ١,٠٠٠ دینار داشکاندنی ڕاستەوخۆیە لەسەر کڕینەکانی داهاتووت.',
                      'كل ١٠ نقاط = ١,٠٠٠ دينار خصم مباشر على مشترياتك القادمة (نقطة واحدة = ١٠٠ دينار).',
                      'Every 10 points = 1,000 IQD instant cash discount on future purchases.'
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/95 border border-slate-200 space-y-2 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                    ٣
                  </div>
                  <h4 className="text-xs font-black text-slate-900">
                    {tr('بەکارهێنانی بە یەک کلیک', 'استخدام الخصم بنقرة واحدة', 'Apply in 1-Click')}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {tr(
                      'لە کاتی کڕین لە سەبەتەدا، بژاردەی «بەکارهێنانی خاڵەکان» هەڵبژێرە تا داشکاندنەکە لە کۆی وەسڵەکەت دابشکێت.',
                      'عند الدفع في السلة، حدد خيار "استخدام النقاط" لتطبيق الخصم فوراً على إجمالي الفاتورة.',
                      'Check "Use Loyalty Points" at checkout to instantly apply your discount.'
                    )}
                  </p>
                </div>
              </div>

              {/* Transactions History */}
              <div className="bg-white/95 border border-purple-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      {tr('تۆماری خاڵەکانی پاداشت', 'سجل حركات النقاط والمكافآت', 'Points Transactions History')}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {history.length} {tr('جووڵە', 'حركة', 'records')}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {tr('هێشتا هیچ تۆمارێکی خاڵ نییە', 'لا توجد حركات نقاط مسجلة بعد', 'No loyalty points recorded yet')}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      {tr(
                        'کاتێک یەکەم کاڵا لە بازاڕ دەکڕیت، خاڵەکانت لێرە دەردەکەون و دەتوانیت بۆ کڕینی داهاتوو بەکاریان بهێنیت.',
                        'عند إتمام أول عملية شراء، ستظهر نقاطك هنا لتستفيد منها في مشترياتك القادمة.',
                        'Once you place your first order, your earned points will appear here for future discounts.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {history.map((tx) => {
                      const isEarned = tx.type === 'earned';
                      return (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl border border-slate-200 hover:border-amber-300 bg-slate-50/70 hover:bg-white flex items-center justify-between gap-3 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={clsx(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              isEarned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {isEarned ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">
                                {tr(tx.descriptionKu || tx.description, tx.descriptionAr || tx.description, tx.description)}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                                {tx.orderId && <span>• #{tx.orderId}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={clsx(
                              "text-xs sm:text-sm font-black font-mono block",
                              isEarned ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {isEarned ? `+${tx.amount}` : tx.amount} {tr('خاڵ', 'نقطة', 'pts')}
                            </span>
                            {tx.discountIqd && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {isEarned ? `~${tx.discountIqd.toLocaleString()} IQD` : `-${tx.discountIqd.toLocaleString()} IQD`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 4: EDIT PROFILE FORM */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSubmit} className="bg-white/95 border border-purple-200/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-md relative">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-slate-900 text-sm sm:text-base font-black uppercase tracking-wider">
                  {tr('دەستکاریکردنی زانیارییەکانی هەژمار', 'تعديل بيانات الحساب والملف الشخصي', 'Edit Profile Information')}
                </h4>
                <p className="text-xs text-slate-500">
                  {tr('زانیارییەکانت بنووسە بۆ بەرزکردنەوەی متمانەی کڕیاران.', 'قم بتحديث الاسم والنبذة وبيانات التواصل لتعزيز الموثوقية.', 'Update your username, avatar, bio, and business credentials.')}
                </p>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs font-bold">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{tr('پرۆفایلەکەت بە سەرکەوتوویی نوێکرایەوە!', 'تم تحديث ملفك الشخصي بنجاح!', 'Your profile was successfully updated!')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              {/* Profile Picture Management Card */}
              <div className="space-y-3 md:col-span-2 lg:col-span-3 p-4 bg-slate-50 border border-indigo-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>{tr('وێنەی پرۆفایل', 'صورة الملف الشخصي', 'Profile Picture')}</span>
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={async () => {
                        setAvatar('');
                        const updated: User = { ...user, avatar: '' };
                        await onUpdateProfile(updated);
                        showToast(
                          tr('وێنەی پرۆفایل سڕایەوە و پاشەکەوت کرا', 'تم حذف صورة الملف الشخصي وحفظ التغييرات', 'Profile picture removed and saved'),
                          'info'
                        );
                      }}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>{tr('سڕینەوەی وێنە', 'حذف الصورة', 'Remove Photo')}</span>
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Avatar Image with (+) Plus Button attached */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-emerald-400 to-indigo-500 shadow-md">
                      <div className="w-full h-full rounded-[0.9rem] bg-slate-100 overflow-hidden flex items-center justify-center relative">
                        {avatar ? (
                          <img 
                            src={avatar} 
                            alt={name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Corner (+) Plus Button for Upload */}
                    <label 
                      className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-gradient-to-tr from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-slate-950 rounded-full flex items-center justify-center shadow-md border-2 border-white cursor-pointer transition-all active:scale-90"
                      title={tr('بارکردنی وێنەی نوێ', 'رفع صورة جديدة', 'Upload Photo')}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                    </label>
                  </div>

                  {/* Direct Link input */}
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      {tr('یاخود بەستەری (URL) وێنە لێرە بنووسە:', 'أو الصق رابط الصورة المباشر:', 'Or paste Image URL directly:')}
                    </label>
                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500">
                      {tr('کلیک لەسەر دوگمەی پرتەقاڵی (+) بکە بۆ دانانی وێنە لە مۆبایلەکەتەوە.', 'اضغط على زر (+) لاختيار صورة من جهازك.', 'Tap the (+) plus button to pick a photo from your device.')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {tr('ناوی تەواو', 'الاسم الكامل', 'Full Display Name')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  placeholder="e.g. Havalan Kurdistan"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{tr('ناوی بەکارهێنەر (یوزەرنەیم)', 'اسم المستخدم (@handle)', 'Username (@handle)')}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-2xs"
                    placeholder="username"
                  />
                </div>
              </div>

              {/* Operating City */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {tr('شار', 'المدينة', 'Operating City')}
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  {IRAQ_CITIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.en} ({isKurdish ? c.ku : isArabic ? c.ar : c.en})
                    </option>
                  ))}
                </select>
              </div>

              {/* Partner Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {tr('پۆلێن', 'التصنيف التجاري', 'Industry Category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="Direct Sourcing & Farm Products">{tr('بەرهەمی کێڵگە و ڕاستەوخۆ', 'توريد مباشر ومنتجات زراعية', 'Direct Sourcing & Farm Products')}</option>
                  <option value="Handmade & Artisan">{tr('دەستکرد و پیشەیی', 'أعمال يدوية وحرفية', 'Handmade & Artisan')}</option>
                  <option value="Local Business & Boutique">{tr('بازرگانی ناوخۆیی و بۆتیک', 'تجارة محلية وبوتيك', 'Local Business & Boutique')}</option>
                  <option value="Factory & Manufacturing">{tr('کارگە و دروستکردن', 'مصانع وإنتاج صناعي', 'Factory & Manufacturing')}</option>
                  <option value="Wholesale & Distribution">{tr('کۆفرۆشی و دابەشکردن', 'جملة وتوزيع', 'Wholesale & Distribution')}</option>
                  <option value="Logistics & Transporter">{tr('گواستنەوە و لۆجستی', 'شحن ولوجستيات', 'Logistics & Transporter')}</option>
                </select>
              </div>

              {/* Full Sourcing Address */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {tr('ناونیشان', 'العنوان التفصيلي', 'Full Address')}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  placeholder={tr('شەقام، گەڕەک، شار', 'الشارع، الحي، المدينة', 'Street, District, City')}
                />
              </div>

              {/* Bio Field */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>{tr('دەربارەی من (بایۆ)', 'نبذة عن الحساب (بايو)', 'User Bio & Summary')}</span>
                  <span className="text-[10px] font-mono text-slate-400">{bio.length}/200</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 resize-none shadow-2xs"
                  placeholder={tr('دەربارەی کار و چالاکییەکانت یان ئەزموونت بنووسە...', 'اكتب نبذة مختصرة عن نشاطك ومنتجاتك وخبراتك...', 'Share a brief bio about your products, business, or interests...')}
                />
              </div>

              {/* Phone Number & Display Details */}
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl md:col-span-2 lg:col-span-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {tr('ژمارەی مۆبایل و پەیوەندی', 'رقم الهاتف والتواصل', 'Phone Number & Contact')}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-700">
                    <input
                      type="checkbox"
                      checked={showPhoneToPublic}
                      onChange={(e) => setShowPhoneToPublic(e.target.checked)}
                      className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>{tr('نیشاندانی ژمارە لەسەر بڵاوکراوەکان', 'إظهار الرقم في الإعلانات للعامة', 'Show phone on posts')}</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  placeholder="0750 XXX XXXX"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {tr(
                    'کاتێک ئەم بەشە چالاک دەکەیت، کڕیاران لە بڵاوکراوەکانتدا ژمارەی مۆبایلەکەت دەبینن تا بە شێوەی پەیوەندی یان واتسئەپ ئاسانتر پەیوەندیت پێوە بکەن.',
                    'عند التفعيل، سيتمكن المشترون من رؤية رقم هاتفك في إعلاناتك للتواصل السريع عبر الاتصال أو الواتساب.',
                    'When enabled, buyers will see your contact phone number on your posts to reach you via call or WhatsApp.'
                  )}
                </p>
              </div>

              {/* Public Visibility Toggle & Privacy Guarantees */}
              <div className="space-y-3 md:col-span-2 lg:col-span-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      {isPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-rose-600" />}
                      <span>{tr('دیاریبوونی پرۆفایل بۆ گشتی', 'ظهور الملف الشخصي للعامة', 'Public Profile Visibility')}</span>
                    </label>
                    <p className="text-xs text-slate-600">
                      {isPublic 
                        ? tr('پرۆفایلی گشتی و پۆستەکانی بازاڕکردنت بۆ هەمووان دیار دەبێت.', 'ملفك الشخصي وإعلاناتك معروضة لكافة الزوار والمستخدمين.', 'Your public profile and marketplace posts are visible to all users.')
                        : tr('پرۆفایلەکەت بە تەواوی شاراوەیە و لە بازاڕدا دەرناکەوێت.', 'ملفك الشخصي مخفي ولا يظهر في السوق العام.', 'Your profile is private and hidden from the public marketplace.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0",
                      isPublic ? 'bg-emerald-600' : 'bg-slate-400'
                    )}
                  >
                    <span className={clsx(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </button>
                </div>

                {/* Privacy Rule Box */}
                <div className="p-3.5 bg-white border border-emerald-300 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{tr('ڕێسای پاراستنی نهێنی و داتای گشتی:', 'سياسة الخصوصية ونطاق البيانات العامة:', 'Data Privacy & Public Scope:')}</span>
                  </div>
                  <ul className="space-y-1 text-slate-700 leading-relaxed list-disc list-inside">
                    <li>
                      <strong className="text-emerald-800">{tr('ئەوانەی گشتین:', 'البيانات العامة:', 'Publicly Visible:')}</strong> {tr('تەنیا ناوی بازرگانی، وێنە، شار، بەیج، و کاڵا چالاکەکانی بازاڕ.', 'اسم المتجر، الصورة، المدينة، الشارات، والإعلانات النشطة فقط.', 'Only business name, avatar, city, badges, and active marketplace items.')}
                    </li>
                    <li>
                      <strong className="text-rose-800">{tr('ئەوانەی بە تەواوی نهێنین:', 'البيانات الخاصة والمحمية تماماً:', 'Strictly Private:')}</strong> {tr('بەشی ژمێریاری، تۆماری قەرز، کڕین و داواکارییەکان، و هەموو داتای ناوەکی.', 'سجل المحاسبة، الديون، المشتريات، والبيانات الحسابية الداخلية.', 'Accounting, debt records, personal orders, and internal profile management.')}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Theme & Automatic Local-Time Color Shifting Settings */}
              <div className="space-y-4 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/60 p-4 sm:p-5 rounded-2xl border border-indigo-200/80 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-indigo-950 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-600" />
                      <span>{tr('ڕێکخستنی شێوازی ڕەنگ و کاتی ناوخۆیی', 'إعدادات ألوان الثيم والتوقيت المحلي', 'Theme & Local-Time Auto-Shift')}</span>
                    </label>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {tr(
                        'سیستەم بەپێی کاتی ناوخۆیی کاتژمێرەکەت (ڕۆژ: ڕەنگاوڕەنگ وردە وردە دەگۆڕێت، زەردەپەڕ: خۆرئاوابوون، شەو: تۆکیۆ) شێوازەکە بە ئۆتۆماتیک دەگۆڕێت.',
                        'يقوم النظام بتكييف المظهر تلقائياً مع توقيتك المحلي (النهار: قوس قزح متغير تدريجياً، الغروب: الشفق، الليل: طوكيو).',
                        'Automatically shifts themes based on your local time (Daytime: Gradual Rainbow, Sunset: Dusk, Night: Tokyo).'
                      )}
                    </p>
                  </div>

                  {/* Auto Toggle Switch */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-indigo-900">
                      {isAutoTimeTheme 
                        ? tr('ئۆتۆماتیک (چالاکە)', 'تلقائي (مفعل)', 'Active (Auto)') 
                        : tr('دەستی (ناچالاکە)', 'يدوي (معطل)', 'Manual')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !isAutoTimeTheme;
                        onToggleAutoTimeTheme?.(nextVal);
                        localStorage.setItem('payv_auto_time_theme', nextVal ? 'true' : 'false');
                        if (nextVal) {
                          const info = detectLocalTimeTheme();
                          onThemeChange?.(info.theme);
                          localStorage.setItem('payv_active_theme', info.theme);
                        }
                      }}
                      className={clsx(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0",
                        isAutoTimeTheme ? 'bg-indigo-600' : 'bg-slate-400'
                      )}
                      aria-label="Toggle Auto Theme Shift"
                    >
                      <span className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                        isAutoTimeTheme ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>
                </div>

                {/* Status bar showing local clock and current daylight phase */}
                {(() => {
                  const currentInfo = localTimeInfo || detectLocalTimeTheme();
                  return (
                    <div className="p-3 bg-white/95 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span className="font-bold text-slate-700">{tr('کاتی ئێستای کاتژمێرت:', 'وقتك المحلي الآن:', 'Your Local Time:')}</span>
                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                          {currentInfo.formattedTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="text-sm">
                          {currentInfo.period === 'daytime' ? '☀️' : currentInfo.period === 'sunset' ? '🌅' : '🌃'}
                        </span>
                        <span>
                          {currentInfo.period === 'daytime' && tr('کاتی ڕۆژ (پەلکەزێڕینەی ڕەنگاڵەیی)', 'فترة النهار (قوس قزح متعدد الألوان)', 'Daytime (Rainbow)')}
                          {currentInfo.period === 'sunset' && tr('زەردەپەڕ و خۆرئاوابوون', 'شفق الغروب', 'Golden Sunset')}
                          {currentInfo.period === 'night' && tr('کاتی شەو (تۆکیۆ)', 'فترة الليل (طوكيو)', 'Night (Tokyo)')}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Theme Palette Buttons (Manual Selection) */}
                <div className="pt-2 border-t border-indigo-100/70">
                  <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider block mb-2">
                    {tr('هەڵبژاردنی ڕەنگ بە دەستی:', 'اختيار الثيم يدوياً:', 'Manual Theme Selection:')}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                    {[
                      {
                        id: 'royal',
                        label: 'Royal Dark & Gold',
                        labelKu: 'تاریکی شاهانە (ڕەش، نیلی، ئاڵتوونی)',
                        labelAr: 'الأسود والنيلي والذهبي الملكي',
                        sub: '👑 Black, Navy & 24K Gold',
                        color: 'bg-gradient-to-r from-slate-950 via-blue-950 to-amber-500'
                      },
                      {
                        id: 'monochrome',
                        label: 'Monochrome & Gold',
                        labelKu: 'مۆنۆکرۆم (ڕەش، سپی، هێڵی زێڕین)',
                        labelAr: 'مونوكروم (أسود، أبيض، خطوط ذهبية)',
                        sub: '⚪ Pure B&W Text, Icons & 24K Gold Ribbon',
                        color: 'bg-gradient-to-r from-black via-zinc-400 via-white to-amber-500'
                      },
                      {
                        id: 'rainbow',
                        label: 'Gradual Rainbow',
                        labelKu: 'ڕەنگاوڕەنگی جوڵاو (وردە وردە دەگۆڕێت)',
                        labelAr: 'قوس قزح متعدد الألوان',
                        sub: '☀️ Daytime (06:00 - 18:00)',
                        color: 'bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-500'
                      },
                      {
                        id: 'wavy',
                        label: 'Dynamic Motion Wavy',
                        labelKu: 'شەپۆلاوی جوڵاو (تەواوی شاشە)',
                        labelAr: 'أمواج حركية ديناميكية',
                        sub: '🌊 Full Screen Motion',
                        color: 'bg-gradient-to-r from-pink-500 via-indigo-500 via-teal-400 to-amber-400'
                      },
                      {
                        id: 'sunset',
                        label: 'Golden Sunset',
                        labelKu: 'زەردەپەڕ (خۆرئاوابوون)',
                        labelAr: 'شفق الغروب الذهبي',
                        sub: '🌅 Sunset (18:00 - 21:00)',
                        color: 'bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600'
                      },
                      {
                        id: 'tokyo',
                        label: 'Tokyo Night',
                        labelKu: 'تۆکیۆ (شەوانە)',
                        labelAr: 'طوكيو الليلية',
                        sub: '🌃 Night (21:00 - 06:00)',
                        color: 'bg-gradient-to-r from-indigo-900 via-purple-900 to-teal-800'
                      },
                      {
                        id: 'aurora',
                        label: 'Aurora Borealis',
                        labelKu: 'شەبەنگی ئاورۆرا (تیشکی باکوور)',
                        labelAr: 'الشفق القطبي (أورورا)',
                        sub: '🌌 Northern Mystic Glow',
                        color: 'bg-gradient-to-r from-emerald-400 via-teal-300 via-cyan-400 to-indigo-500'
                      }
                    ].map((th) => {
                      const isSelected = theme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            onThemeChange?.(th.id);
                            localStorage.setItem('payv_active_theme', th.id);
                            if (th.id === 'wavy') {
                              onToggleAutoTimeTheme?.(false);
                              localStorage.setItem('payv_auto_time_theme', 'false');
                            }
                          }}
                          className={clsx(
                            "p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer",
                            isSelected 
                              ? "bg-white border-indigo-500 shadow-sm ring-2 ring-indigo-400/50" 
                              : "bg-white/70 border-slate-200 hover:border-indigo-300 hover:bg-white"
                          )}
                        >
                          <div className={clsx("w-3.5 h-3.5 rounded-full border border-white/60 shrink-0 shadow-2xs", th.color)} />
                          <div className="min-w-0">
                            <span className="text-xs font-bold block text-slate-900 truncate">
                              {isKurdish ? th.labelKu : th.label}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {th.sub}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? tr('پاشەکەوت دەکرێت...', 'جاري الحفظ...', 'Saving...') : tr('پاشەکەوتکردنی گۆڕانکارییەکان', 'حفظ التعديلات', 'Save Changes')}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: ADMIN MODERATION & SECURITY PANEL */}
        {activeTab === 'admin' && isAdmin && (
          <div className="bg-white/90 border border-rose-200 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl relative backdrop-blur-md">
            {/* Admin Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-200/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-2xl text-rose-600 shadow-sm">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wider">
                      {tr('پانێڵی بەڕێوەبەرایەتی و ئاسایشی ئەپەکە', 'لوحة الإدارة والأمان للتطبيق', 'Admin Moderation & App Security')}
                    </h3>
                    <span className="bg-rose-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-2xs">
                      SUPER ADMIN
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {tr(
                      'دەسەڵاتی سەرەکی ئەدمین بۆ بایکۆتکردن، پشڕاستکردنەوە، بەڕێوەبردنی ئاسایش و سڕینەوەی سەرپێچیکاران.',
                      'الصلاحيات الإدارية الكاملة للحظر والتوثيق وإدارة أمان التطبيق ومراقبة الإعلانات.',
                      'Full administrator authority for banning, verification badges, security logs, and item moderation.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenStrikeModal({ id: '', name: tr('دیاریکردنی بەکارهێنەر', 'تحديد المستخدم', 'Select User'), phone: '07746573763' }, 1, 'سەرپێچی لە ڕێساکانی بەکارهێنان')}
                  className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{tr('+ ناردنی ئاگاداری / سزا', '+ إرسال إنذار مباشر', '+ Issue Warning / Strike')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitiateDeleteDemoItems}
                  className="px-3.5 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>{tr('پاککردنەوەی کاڵا دیمۆکان', 'مسح كافة المنتجات التجريبية', 'Purge All Demo Items')}</span>
                </button>
              </div>
            </div>

            {/* Search & Sub-tabs - Horizontally scrollable and responsive on mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar py-1 flex-nowrap">
                <button
                  type="button"
                  onClick={() => setAdminSubTab('analytics')}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs",
                    adminSubTab === 'analytics'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tr('شیکاری فرۆش', 'تحليلات المبيعات', 'Analytics')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubTab('users')}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs",
                    adminSubTab === 'users'
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tr(`هەژمارەکان (${allUsersList.length})`, `المستخدمين (${allUsersList.length})`, `Users (${allUsersList.length})`)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubTab('items')}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs",
                    adminSubTab === 'items'
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tr(`کاڵاکان (${allPlatformItems.length})`, `المنتجات (${allPlatformItems.length})`, `Items (${allPlatformItems.length})`)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubTab('reports')}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs relative",
                    adminSubTab === 'reports'
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="whitespace-nowrap">{tr(`ڕاپۆرتەکان (${liveReportsList.length})`, `البلاغات (${liveReportsList.length})`, `Reports (${liveReportsList.length})`)}</span>
                  {liveReportsList.filter(r => r.status === 'pending').length > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono animate-pulse">
                      {liveReportsList.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubTab('security')}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs",
                    adminSubTab === 'security'
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tr('ئاسایش و لۆگەکان', 'الأمان وسجلات الرقابة', 'Security & Logs')}</span>
                </button>
              </div>

              {adminSubTab !== 'security' && adminSubTab !== 'analytics' && (
                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                  <input
                    type="text"
                    placeholder={tr('گەڕان بەدوای ناوی یان مۆبایل...', 'البحث بالاسم أو الهاتف...', 'Search user or item...')}
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-400 shadow-2xs"
                  />
                </div>
              )}
            </div>

            {/* SUB-TAB 0: DAILY SALES VOLUME RECHARTS ANALYTICS */}
            {adminSubTab === 'analytics' && (
              <AdminSalesVolumeChart
                orders={allPlatformOrders.length > 0 ? allPlatformOrders : orders}
                transactions={allPlatformTransactions}
                items={allPlatformItems.length > 0 ? allPlatformItems : items}
                users={allUsersList}
                isKurdish={isKurdish}
                onRefresh={async () => {
                  const [o, t] = await Promise.all([
                    db.getOrders().catch(() => []),
                    db.getAllAccountingTransactions().catch(() => [])
                  ]);
                  setAllPlatformOrders(o);
                  setAllPlatformTransactions(t);
                }}
              />
            )}

            {/* SUB-TAB 1: USERS LIST & BAN/VERIFY/ROLE */}
            {adminSubTab === 'users' && (() => {
              const unverifiedCount = allUsersList.filter(u => !u.isVerified && u.role !== 'admin').length;
              const verifiedCount = allUsersList.filter(u => u.isVerified).length;
              const perfectSellerCount = allUsersList.filter(u => u.isPerfectSeller).length;
              const trustedCount = allUsersList.filter(u => u.isTrustedSeller).length;
              const rewardedCount = allUsersList.filter(u => u.adminRewards && u.adminRewards.length > 0).length;
              const bannedCount = allUsersList.filter(u => u.isBanned).length;
              const adminCount = allUsersList.filter(u => u.role === 'admin' || u.email?.trim()?.toLowerCase() === 'afsun2026app@gmail.com').length;

              const query = adminSearchQuery.trim().toLowerCase();
              const queryCleanPhone = adminSearchQuery.replace(/\D/g, '');

              const filteredUsers = allUsersList.filter(u => {
                // Filter by badge / status
                if (adminUserBadgeFilter === 'unverified' && (u.isVerified || u.role === 'admin')) return false;
                if (adminUserBadgeFilter === 'verified' && !u.isVerified) return false;
                if (adminUserBadgeFilter === 'perfect_seller' && !u.isPerfectSeller) return false;
                if (adminUserBadgeFilter === 'trusted' && !u.isTrustedSeller) return false;
                if (adminUserBadgeFilter === 'rewarded' && (!u.adminRewards || u.adminRewards.length === 0)) return false;
                if (adminUserBadgeFilter === 'banned' && !u.isBanned) return false;
                if (adminUserBadgeFilter === 'admin' && u.role !== 'admin' && u.email?.trim()?.toLowerCase() !== 'afsun2026app@gmail.com') return false;

                // Search query match
                if (!query) return true;

                const nameMatch = u.name?.toLowerCase().includes(query);
                const usernameMatch = u.username?.toLowerCase().replace(/^@/, '').includes(query.replace(/^@/, ''));
                const emailMatch = u.email?.toLowerCase().includes(query);
                const cityMatch = u.city?.toLowerCase().includes(query);
                const categoryMatch = u.category?.toLowerCase().includes(query);

                let phoneMatch = false;
                if (u.phone) {
                  const uDigits = u.phone.replace(/\D/g, '');
                  if (queryCleanPhone && (uDigits.includes(queryCleanPhone) || queryCleanPhone.includes(uDigits))) phoneMatch = true;
                  if (u.phone.toLowerCase().includes(query)) phoneMatch = true;
                }

                return nameMatch || usernameMatch || emailMatch || cityMatch || categoryMatch || phoneMatch;
              }).sort((a, b) => {
                if (adminUserSort === 'items') {
                  const countA = allPlatformItems.filter(i => i.userId === a.id || i.sellerId === a.id).length;
                  const countB = allPlatformItems.filter(i => i.userId === b.id || i.sellerId === b.id).length;
                  return countB - countA;
                }
                if (adminUserSort === 'name') {
                  return (a.name || '').localeCompare(b.name || '');
                }
                return 0;
              });

              return (
                <div className="space-y-4">
                  {/* Dedicated Search & Badge Finder Bar */}
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-3xl border border-indigo-500/20 shadow-xl space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">
                            {tr('گەڕان و بەڕێوەبردنی بەیجی هەژمارەکان', 'البحث وإدارة شارات التوثيق للمستخدمين', 'Search & Verify Badges Management')}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {tr('بە ئاسانی هەر هەژمارێک بدۆزەرەوە و بەیجی پشڕاستکردنەوە (Verified Badge) پێ ببەخشە', 'ابحث عن أي حساب بسهولة لمنحه شارة التوثيق أو إدارتها', 'Find any account easily to grant or manage verification badge')}
                          </p>
                        </div>
                      </div>

                      {/* Sort dropdown */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                          {tr('ڕیزکردن:', 'الترتيب:', 'Sort:')}
                        </span>
                        <select
                          value={adminUserSort}
                          onChange={(e) => setAdminUserSort(e.target.value as any)}
                          className="bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="newest">{tr('نوێترین', 'الأحدث', 'Newest')}</option>
                          <option value="items">{tr('زۆرترین کاڵا', 'الأكثر نشراً', 'Most Items')}</option>
                          <option value="name">{tr('ئەلفوبێ (A-Z)', 'أبجدياً (A-Z)', 'Alphabetical (A-Z)')}</option>
                        </select>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={tr(
                          'گەڕان بەدوای ناو، ژمارەی مۆبایل (0750...)، یوزەرنەیم (@...)، یان شار...',
                          'البحث بالاسم، رقم الهاتف (0750...)، اسم المستخدم (@...)، أو المدينة...',
                          'Search by name, phone (0750...), username (@...), or city...'
                        )}
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-white/15 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 shadow-inner"
                      />
                      {adminSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAdminSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-all cursor-pointer"
                          title={tr('سڕینەوەی گەڕان', 'مسح البحث', 'Clear search')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Badges / Status Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('all')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'all'
                            ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                        )}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{tr('هەموو هەژمارەکان', 'جميع الحسابات', 'All Users')}</span>
                        <span className="bg-black/20 px-1.5 py-0.2 rounded-full text-[9px]">
                          {allUsersList.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('unverified')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'unverified'
                            ? "bg-amber-400 text-amber-950 font-black shadow-md shadow-amber-400/20"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                        )}
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>{tr('بێ بەیج (پێویست بە پشڕاستکردنەوە)', 'بدون شارة (بانتظار التوثيق)', 'Unverified (Need Badge)')}</span>
                        <span className="bg-black/20 px-1.5 py-0.2 rounded-full text-[9px] text-amber-300 font-black">
                          {unverifiedCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('verified')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'verified'
                            ? "bg-emerald-400 text-emerald-950 font-black shadow-md shadow-emerald-400/20"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                        )}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{tr('خاوەن بەیجی فەرمی', 'الموثقين بالشارة', 'Verified Badges')}</span>
                        <span className="bg-black/20 px-1.5 py-0.2 rounded-full text-[9px] text-emerald-300 font-black">
                          {verifiedCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('perfect_seller')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'perfect_seller'
                            ? "bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-black shadow-md shadow-amber-400/30"
                            : "bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-400/20"
                        )}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{tr('فرۆشیاری نموونەیی (Perfect)', 'المتميزين (Perfect)', 'Perfect Sellers')}</span>
                        <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[9px] text-amber-300 font-black">
                          {perfectSellerCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('trusted')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'trusted'
                            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30"
                            : "bg-slate-800 text-teal-300 hover:bg-slate-700 border border-teal-500/20"
                        )}
                      >
                        <Award className="w-3.5 h-3.5 text-teal-300" />
                        <span>{tr('مۆری باوەڕپێکراو', 'ختم الثقة (Trusted)', 'Trusted Seal')}</span>
                        <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[9px] text-teal-200 font-black">
                          {trustedCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('rewarded')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'rewarded'
                            ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-md shadow-purple-500/30"
                            : "bg-slate-800 text-purple-300 hover:bg-slate-700 border border-purple-500/20"
                        )}
                      >
                        <Gift className="w-3.5 h-3.5 text-purple-400" />
                        <span>{tr('پاداشتکراوان', 'المكافئين', 'Rewarded')}</span>
                        <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[9px] text-purple-200 font-black">
                          {rewardedCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('banned')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'banned'
                            ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                        )}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>{tr('بایکۆتکراو', 'المحظورين', 'Banned')}</span>
                        <span className="bg-black/20 px-1.5 py-0.2 rounded-full text-[9px]">
                          {bannedCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminUserBadgeFilter('admin')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                          adminUserBadgeFilter === 'admin'
                            ? "bg-indigo-400 text-indigo-950 font-black shadow-md shadow-indigo-400/20"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5"
                        )}
                      >
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{tr('بەڕێوەبەران', 'المدراء', 'Admins')}</span>
                        <span className="bg-black/20 px-1.5 py-0.2 rounded-full text-[9px]">
                          {adminCount}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Results Count Bar & Purge Old Accounts */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600 px-1">
                    <span className="font-bold">
                      {tr(
                        `نیشاندانی (${filteredUsers.length}) لە کۆی (${allUsersList.length}) هەژمار`,
                        `عرض (${filteredUsers.length}) من أصل (${allUsersList.length}) حساب`,
                        `Showing (${filteredUsers.length}) of (${allUsersList.length}) accounts`
                      )}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {allUsersList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowPurgeOldAccountsConfirm(true)}
                          disabled={isPurgingOldAccounts}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title={tr('سڕینەوەی هەموو هەژمارە کۆن یان تاقیکارییەکان جگە لە ئەدمینی سەرەکی', 'حذف كافة الحسابات التجريبية أو القديمة', 'Purge old / test accounts')}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>{isPurgingOldAccounts ? (isKurdish ? 'دەسڕدرێتەوە...' : 'Purging...') : tr('پاککردنەوەی هەژمارە کۆنەکان', 'تنظيف الحسابات القديمة', 'Purge Old Accounts')}</span>
                        </button>
                      )}

                      {adminSearchQuery && (
                        <span className="text-[11px] text-indigo-600 font-bold">
                          {tr(`ئەنجامی گەڕان: "${adminSearchQuery}"`, `النتائج: "${adminSearchQuery}"`, `Results: "${adminSearchQuery}"`)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User Cards Grid */}
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 text-slate-500 space-y-2">
                      <Users className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold">
                        {tr('هیچ بەکارهێنەرێک بەم پێوەرانە نەدۆزرایەوە.', 'لم يتم العثور على أي مستخدمين مطابقين.', 'No users found matching query.')}
                      </p>
                      {adminSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAdminSearchQuery('')}
                          className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {tr('سڕینەوەی گەڕان و پیشاندانی هەمووان', 'مسح البحث وإظهار الكل', 'Clear search and show all')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredUsers.map((u) => {
                        const cleanUPhone = (u.phone || '').replace(/\D/g, '');
                        const isMasterAccount = u.id === 'admin-07501222253' || cleanUPhone === '07501222253' || cleanUPhone === '7501222253' || cleanUPhone === '9647501222253';
                        const isCurrentActiveUser = user && (user.id === u.id || (user.phone && cleanUPhone && user.phone.replace(/\D/g, '') === cleanUPhone));
                        const isTargetAdmin = u.role === 'admin' || u.isAdmin || isMasterAccount;
                        const userItemCount = allPlatformItems.filter(i => i.userId === u.id || i.sellerId === u.id).length;

                        return (
                          <div
                            key={u.id}
                            className={clsx(
                              "border rounded-3xl p-4 space-y-3 shadow-xs transition-all",
                              u.isBanned 
                                ? "bg-rose-50/80 border-rose-300 ring-1 ring-rose-300" 
                                : u.isVerified
                                ? "bg-emerald-50/30 border-emerald-300/70 hover:border-emerald-400 hover:shadow-md"
                                : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                  <img
                                    src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                                    alt={u.name}
                                    onClick={() => setSelectedUserDetailModal(u)}
                                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-200 shrink-0 cursor-pointer hover:ring-indigo-500 hover:scale-105 transition-all shadow-xs"
                                    title={tr('کلیک بکە بۆ بینینی پرۆفایل و بەڕێوەبردنی ئەم هەژمارە', 'انقر لعرض الملف الشخصي وإدارة الحساب', 'Click to view profile & manage this account')}
                                  />
                                  {u.isVerified && (
                                    <div 
                                      className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white shadow-xs"
                                      title={tr('خاوەن بەیجی فەرمی', 'موثق', 'Verified')}
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </div>
                                  )}
                                  {u.isPerfectSeller && (
                                    <div 
                                      className="absolute -top-1 -right-1 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 rounded-full p-0.5 border-2 border-white shadow-xs animate-pulse"
                                      title={tr('فرۆشیاری نموونەیی (Perfect Seller)', 'بائع متميز', 'Perfect Seller')}
                                    >
                                      <Star className="w-2.5 h-2.5 fill-slate-950" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 
                                      onClick={() => setSelectedUserDetailModal(u)}
                                      className="text-xs font-black text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
                                      title={tr('کلیک بکە بۆ بینینی پرۆفایل و بەڕێوەبردنی ئەم هەژمارە', 'انقر لعرض الملف الشخصي وإدارة الحساب', 'Click to view profile & manage this account')}
                                    >
                                      {u.name}
                                    </h4>
                                    {isCurrentActiveUser && (
                                      <span className="bg-indigo-100 text-indigo-900 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-300">
                                        {tr('ئەژماری تۆیە (YOU)', 'حسابك الحالي', 'YOU')}
                                      </span>
                                    )}
                                    {isMasterAccount && (
                                      <span className="bg-amber-100 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-300">
                                        SUPER ADMIN
                                      </span>
                                    )}
                                    {!isMasterAccount && isTargetAdmin && (
                                      <span className="bg-purple-100 text-purple-900 text-[8px] font-black px-1.5 py-0.5 rounded border border-purple-300">
                                        ADMIN
                                      </span>
                                    )}
                                    {u.isVerified ? (
                                      <span className="bg-emerald-100 text-emerald-900 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-0.5 shadow-2xs">
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        <span>{tr('پشڕاستکراو (VERIFIED)', 'موثق', 'VERIFIED')}</span>
                                      </span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                        {tr('بێ بەیج', 'بدون شارة', 'No Badge')}
                                      </span>
                                    )}
                                    {u.isPerfectSeller && (
                                      <span className="bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 text-amber-950 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5 shadow-2xs">
                                        <Star className="w-3 h-3 text-amber-600 fill-amber-500 animate-pulse" />
                                        <span>{tr('فرۆشیاری نموونەیی (PERFECT)', 'بائع متميز', 'PERFECT SELLER')}</span>
                                      </span>
                                    )}
                                    {u.isTrustedSeller && (
                                      <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-teal-400 flex items-center gap-1 shadow-md shadow-emerald-500/25">
                                        <Award className="w-3 h-3 text-amber-300" />
                                        <span>{tr('مۆری باوەڕپێکراو (TRUSTED)', 'شارة موثوق', 'TRUSTED SEAL')}</span>
                                      </span>
                                    )}
                                    {u.adminRewards && u.adminRewards.length > 0 && (
                                      <span className="bg-purple-100 text-purple-900 text-[8px] font-black px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-0.5 shadow-2xs">
                                        <Gift className="w-3 h-3 text-purple-600" />
                                        <span>{u.adminRewards.length} {tr('پاداشت', 'مكافأة', 'Rewards')}</span>
                                      </span>
                                    )}
                                    {u.isBanned && (
                                      <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        BANNED
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-indigo-700 font-mono font-bold truncate mt-0.5">
                                    {u.phone || 'No phone'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">
                                    @{u.username || 'user'} • {u.city || 'Erbil'} • {u.category || 'Merchant'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAdminSubTab('items');
                                        setAdminSearchQuery(u.name || u.phone || u.id);
                                      }}
                                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                                    >
                                      <Package className="w-3 h-3" />
                                      <span>{userItemCount} {tr('کاڵا (بینین)', 'منتج (عرض)', 'items (view)')}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* User Action Tools */}
                            {!isMasterAccount && (
                              <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-slate-100 flex-wrap">
                                {/* Verify Badge Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleVerifyUser(u)}
                                  className={clsx(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                                    u.isVerified
                                      ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200"
                                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                                  )}
                                  title={u.isVerified ? tr('لابردنی بەیج', 'إزالة الشارة', 'Remove Badge') : tr('بەخشینی بەیجی پشڕاستکردنەوە', 'منح شارة التوثيق', 'Grant Verification Badge')}
                                >
                                  {u.isVerified ? (
                                    <>
                                      <X className="w-3.5 h-3.5 text-rose-500" />
                                      <span>{tr('لابردنی بەیج', 'إزالة الشارة', 'Remove Badge')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                                      <span>{tr('✨ بەخشینی بەیج', '✨ منح شارة التوثيق', '✨ Grant Badge')}</span>
                                    </>
                                  )}
                                </button>

                                 {/* Perfect Seller Badge Toggle */}
                                 <button
                                   type="button"
                                   onClick={() => handleTogglePerfectSeller(u)}
                                   className={clsx(
                                     "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                                     u.isPerfectSeller
                                       ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                                       : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                                   )}
                                   title={u.isPerfectSeller ? tr('لابردنی بەیجی فرۆشیاری نموونەیی', 'إزالة شارة البائع المتميز', 'Remove Perfect Seller Badge') : tr('بەخشینی بەیجی فرۆشیاری نموونەیی', 'منح شارة البائع المتميز', 'Grant Perfect Seller Badge')}
                                 >
                                   {u.isPerfectSeller ? (
                                     <>
                                       <X className="w-3.5 h-3.5 text-rose-500" />
                                       <span>{tr('لابردنی بەیجی نایاب', 'إزالة الشارة', 'Remove Perfect')}</span>
                                     </>
                                   ) : (
                                     <>
                                       <Star className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                                       <span>{tr('⭐ بەیجی نایاب', '⭐ شارة متميز', '⭐ Perfect Badge')}</span>
                                     </>
                                   )}
                                 </button>

                                 {/* 🏅 Trusted Seller Seal Toggle (مۆری باوەڕپێکراو) */}
                                 <button
                                   type="button"
                                   onClick={() => handleToggleTrustedSeller(u)}
                                   className={clsx(
                                     "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                                     u.isTrustedSeller
                                       ? "bg-teal-50 text-teal-900 border border-teal-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                                       : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md shadow-emerald-600/25"
                                  )}
                                  title={u.isTrustedSeller ? tr('لابردنی مۆری باوەڕپێکراو', 'إزالة ختم الثقة', 'Remove Trusted Seal') : tr('بەخشینی مۆری باوەڕپێکراو بۆ فرۆشیاری ڕاستگۆ', 'منح ختم الثقة للبائع الصادق', 'Grant Official Trusted Seal')}
                                >
                                  {u.isTrustedSeller ? (
                                    <>
                                      <X className="w-3.5 h-3.5 text-rose-500" />
                                      <span>{tr('لابردنی مۆر', 'إزالة الختم', 'Remove Seal')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Award className="w-3.5 h-3.5 text-amber-300" />
                                      <span>{tr('🏅 مۆری باوەڕپێکراو', '🏅 ختم الثقة', '🏅 Trusted Seal')}</span>
                                    </>
                                  )}
                                </button>

                                {/* 🎁 Grant Reward Action (پاداشت بدەنە فرۆشیار ڕاستگۆکان) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAwardModal(u)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20 active:scale-95"
                                  title={tr('بەخشینی پاداشتی تایبەتی ئەدمین بۆ فرۆشیار', 'منح مكافأة مالية أو نقاط للبائع الصادق', 'Grant Admin Reward / Bonus')}
                                >
                                  <Gift className="w-3.5 h-3.5 text-amber-300" />
                                  <span>{tr('🎁 بەخشینی پاداشت', '🎁 منح مكافأة', '🎁 Grant Reward')}</span>
                                </button>

                                {/* Issue Strike / Warning Action */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenStrikeModal({ id: u.id, name: u.name, phone: u.phone, context: `بەکارهێنەری پەسەندکراو: ${u.name}` }, 1, 'سەرپێچی لە ڕێساکانی بەکارهێنان')}
                                  className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-2xs active:scale-95"
                                  title={tr('ناردنی ئاگاداری فەرمی یان سزای بەکارهێنەر', 'توجيه إنذار رسمي أو عقوبة للمستخدم', 'Issue Strike / Warning')}
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>{tr('وریارکردنەوە / سزا', 'توجيه إنذار', 'Warn / Strike')}</span>
                                </button>

                                {/* Ban / Unban Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleBanUser(u)}
                                  className={clsx(
                                    "px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                                    u.isBanned
                                      ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-2xs"
                                      : "bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200"
                                  )}
                                >
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>{u.isBanned ? tr('چالاککردنەوە', 'إلغاء الحظر', 'Unban') : tr('سڕکردن و بایکۆت', 'حظر المستخدم', 'Ban User')}</span>
                                </button>

                                {/* View Full Profile Modal */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserDetailModal(u)}
                                  className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 shadow-2xs active:scale-95"
                                  title={tr('بینینی تەواوی پرۆفایل و زانیاری بەکارهێنەر', 'عرض الملف الشخصي والتفاصيل', 'View Full Profile Details')}
                                >
                                  <Eye className="w-3 h-3 text-indigo-600" />
                                  <span>{tr('پرۆفایل', 'الملف', 'Profile')}</span>
                                </button>

                                {/* Delete Account Permanently */}
                                <button
                                  type="button"
                                  onClick={() => handleInitiateDeleteUserAccount(u)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                                  title={tr('سڕینەوەی ئەم هەژمارە و کاڵاکانی بە یەکجاری', 'حذف هذا الحساب وإعلاناته نهائياً', 'Permanently delete this user account and items')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{tr('سڕینەوەی هەژمار', 'حذف الحساب', 'Delete Account')}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SUB-TAB 2: PLATFORM ITEMS & MODERATION */}
            {adminSubTab === 'items' && (() => {
              const query = adminSearchQuery.trim().toLowerCase();
              const filteredItems = allPlatformItems.filter(i => {
                const matchesSearch = !query || 
                  i.title?.toLowerCase().includes(query) ||
                  i.category?.toLowerCase().includes(query) ||
                  i.userName?.toLowerCase().includes(query) ||
                  i.sellerPhone?.includes(query);

                if (!matchesSearch) return false;

                if (adminItemCategoryFilter === 'featured') return i.isFeatured;
                if (adminItemCategoryFilter === 'sourcing') return i.postType === 'sourcing';
                if (adminItemCategoryFilter === 'marketplace') return i.postType !== 'sourcing';
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Category & Status Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAdminItemCategoryFilter('all')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          adminItemCategoryFilter === 'all'
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        )}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{tr(`هەموو کاڵاکان (${allPlatformItems.length})`, `كافة المنتجات (${allPlatformItems.length})`, `All Items (${allPlatformItems.length})`)}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminItemCategoryFilter('featured')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          adminItemCategoryFilter === 'featured'
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{tr(`تایبەتکراوەکان (${allPlatformItems.filter(i => i.isFeatured).length})`, `المميزة (${allPlatformItems.filter(i => i.isFeatured).length})`, `Featured (${allPlatformItems.filter(i => i.isFeatured).length})`)}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminItemCategoryFilter('sourcing')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          adminItemCategoryFilter === 'sourcing'
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        )}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{tr(`سەرچاوە و بەرهەمەکان (${allPlatformItems.filter(i => i.postType === 'sourcing').length})`, `التوريد المباشر (${allPlatformItems.filter(i => i.postType === 'sourcing').length})`, `Sourcing (${allPlatformItems.filter(i => i.postType === 'sourcing').length})`)}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminItemCategoryFilter('marketplace')}
                        className={clsx(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          adminItemCategoryFilter === 'marketplace'
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                        )}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{tr(`بازاڕی گشتی (${allPlatformItems.filter(i => i.postType !== 'sourcing').length})`, `السوق العام (${allPlatformItems.filter(i => i.postType !== 'sourcing').length})`, `Marketplace (${allPlatformItems.filter(i => i.postType !== 'sourcing').length})`)}</span>
                      </button>
                    </div>

                    {adminSearchQuery && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-indigo-700 font-bold">
                          {tr(`گەڕان: "${adminSearchQuery}" (${filteredItems.length})`, `البحث: "${adminSearchQuery}" (${filteredItems.length})`, `Search: "${adminSearchQuery}" (${filteredItems.length})`)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAdminSearchQuery('')}
                          className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                        >
                          {tr('سڕینەوەی فلتەر', 'إلغاء التصفية', 'Clear')}
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 text-slate-500 space-y-2">
                      <Package className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold">
                        {tr('هیچ کاڵایەک بەپێی ئەم گەڕانە نەدۆزرایەوە.', 'لم يتم العثور على أي منتجات مطابقة.', 'No items match your criteria.')}
                      </p>
                      {adminSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAdminSearchQuery('')}
                          className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {tr('پیشاندانی هەموو کاڵاکان', 'عرض جميع المنتجات', 'Show all items')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {filteredItems.map((item) => {
                        const cleanSellerPhone = (item.sellerPhone || '').replace(/\D/g, '');
                        const waSellerNumber = cleanSellerPhone.startsWith('964') 
                          ? cleanSellerPhone 
                          : cleanSellerPhone.startsWith('0') 
                          ? `964${cleanSellerPhone.slice(1)}` 
                          : `964${cleanSellerPhone}`;

                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-200 hover:border-rose-300 rounded-3xl p-3.5 space-y-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                          >
                            {/* Product Header */}
                            <div className="flex items-start gap-3">
                              <div className="relative shrink-0">
                                <img
                                  src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200'}
                                  alt={item.title}
                                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                                />
                                {item.isFeatured && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-1 shadow-xs" title="Featured">
                                    <Sparkles className="w-3 h-3" />
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={clsx(
                                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                                    item.postType === 'sourcing' 
                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                      : "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                  )}>
                                    {item.postType === 'sourcing' ? tr('سەرچاوە', 'توريد', 'Sourcing') : tr('بازاڕ', 'سوق', 'Market')}
                                  </span>
                                  {item.category && (
                                    <span className="text-[9px] text-slate-500 font-bold truncate max-w-[110px]">
                                      • {item.category}
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-xs font-black text-slate-900 truncate" title={item.title}>
                                  {item.title}
                                </h5>

                                <p className="text-xs font-black text-amber-700 font-mono">
                                  {item.price?.toLocaleString()} IQD
                                </p>
                              </div>
                            </div>

                            {/* Seller & Info Row */}
                            <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-600 font-bold truncate">
                                  <span className="text-slate-400">{tr('فرۆشیار:', 'البائع:', 'Seller:')} </span>
                                  <span className="text-slate-900 font-black">{item.userName || tr('دیارینەکراو', 'غير محدد', 'Anonymous')}</span>
                                </p>
                                {item.sellerPhone && (
                                  <p className="font-mono text-indigo-700 font-bold truncate mt-0.5">
                                    {item.sellerPhone}
                                  </p>
                                )}
                              </div>

                              {cleanSellerPhone && (
                                <a
                                  href={`https://wa.me/${waSellerNumber}?text=${encodeURIComponent(`سڵاو، لەبارەی کاڵاکەت لە E-BAZIRGAN (${item.title}): `)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title={tr('پەیوەندی لە واتسئەپ', 'تواصل عبر واتساب', 'Contact on WhatsApp')}
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                </a>
                              )}
                            </div>

                            {/* Admin Action Buttons */}
                            <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                              {/* 1. Send Violation Warning / Notice */}
                              <button
                                type="button"
                                onClick={() => handleOpenItemViolationModal(item)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all flex-1 justify-center"
                                title={tr('ناردنی نامەی ئاگاداری فەرمی لە کاتی سەرپێچی ئەم کاڵایە', 'إرسال إنذار رسمي بمخالفة هذا المنتج', 'Send violation warning to seller')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{tr('ئاگاداری سەرپێچی', 'إنذار مخالفة', 'Warn / Strike')}</span>
                              </button>

                              {/* 2. One-by-One Delete with Confirmation */}
                              <button
                                type="button"
                                onClick={() => handleInitiateDeleteItem(item)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all flex-1 justify-center"
                                title={tr('سڕینەوەی دانە بە دانەی ئەم کاڵایە لە بازاڕ', 'حذف هذا المنتج نهائياً من السوق', 'Delete this item permanently')}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>{tr('سڕینەوە', 'حذف', 'Delete')}</span>
                              </button>

                              {/* 3. Pin / Feature Item */}
                              <button
                                type="button"
                                onClick={() => handleToggleFeatureItem(item)}
                                className={clsx(
                                  "p-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer shrink-0 border",
                                  item.isFeatured
                                    ? "bg-amber-400 text-slate-950 border-amber-500 shadow-2xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                                )}
                                title={item.isFeatured ? tr('لابردنی تایبەتکراو', 'إلغاء التمييز', 'Unpin') : tr('خستنە لوتکە', 'تمييز الإعلان', 'Pin')}
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SUB-TAB: REPORTS & MODERATION DASHBOARD */}
            {adminSubTab === 'reports' && (
              <div className="space-y-4">
                {/* Reports Header & Main Category Switcher */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Flag className="w-4 h-4 text-rose-600" />
                        <span>{tr('ناوەندی کۆنترۆڵ، ڕاپۆرتەکان و سزاکانی بەکارهێنەران', 'مركز الرقابة والبلاغات وإدارة العقوبات', 'Moderation, Reports & User Strikes Center')}</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {tr(
                          'پێداچوونەوەی ڕاپۆرتی لایڤ و کاڵاکان، ناردنی وریارکردنەوەی فەرمی (Strikes)، و سڕکردنی هەژمارە سەرپێچیکارەکان بەپێی فایەربەیس.',
                          'مراجعة بلاغات البث والمنتجات، إصدار الإنذارات الرسمية للمستخدمين، وتطبيق الحظر الإداري.',
                          'Review live & marketplace reports, issue official strikes, and moderate user accounts with Firestore synchronization.'
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenStrikeModal({ id: '', name: tr('دیارینەکراو', 'غير محدد', 'Select User') }, 1, 'سەرپێچی لە ڕێساکانی بەکارهێنان')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{tr('+ تۆمارکردنی سزای نوێ', '+ إصدار إنذار جديد', '+ Issue New Strike')}</span>
                    </button>
                  </div>

                  {/* Section Switcher Tabs */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAdminReportTypeSection('live')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        adminReportTypeSection === 'live'
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{tr('ڕاپۆرتی لایڤ', 'بلاغات البث', 'Live Reports')}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{liveReportsList.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminReportTypeSection('items')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        adminReportTypeSection === 'items'
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{tr('ڕاپۆرتی کاڵاکان', 'بلاغات المنتجات', 'Item Reports')}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{itemReportsList.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminReportTypeSection('strikes')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        adminReportTypeSection === 'strikes'
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{tr('سزاکان و وریارکردنەوەکان', 'الإنذارات والعقوبات', 'Strikes & Warnings')}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{userStrikesList.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminReportTypeSection('audit')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        adminReportTypeSection === 'audit'
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{tr('تۆماری چاودێری (Audit)', 'سجل الإجراءات الرقابية', 'Audit Trail')}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{adminActivityLogsList.length}</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 1: LIVE STREAM REPORTS */}
                {adminReportTypeSection === 'live' && (() => {
                  const filteredLive = liveReportsList.filter(r => {
                    if (adminReportStatusFilter !== 'all' && r.status !== adminReportStatusFilter) return false;
                    if (!adminSearchQuery) return true;
                    const q = adminSearchQuery.toLowerCase();
                    return (
                      r.sessionTitle?.toLowerCase().includes(q) ||
                      r.broadcasterName?.toLowerCase().includes(q) ||
                      r.reportedByUserName?.toLowerCase().includes(q) ||
                      r.reason?.toLowerCase().includes(q) ||
                      r.details?.toLowerCase().includes(q)
                    );
                  });

                  if (filteredLive.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-1">
                        <Video className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>{tr('هیچ ڕاپۆرتێکی پەخشی ڕاستەوخۆ نییە.', 'لا توجد بلاغات للبث المباشر حالياً.', 'No live stream reports found.')}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredLive.map((report) => (
                        <div
                          key={report.id}
                          className={clsx(
                            "bg-white border rounded-2xl p-4 space-y-3 shadow-xs transition-all",
                            report.status === 'pending' ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black border font-mono uppercase tracking-wider",
                                report.status === 'pending' && "bg-rose-100 text-rose-800 border-rose-300 animate-pulse",
                                report.status === 'resolved' && "bg-emerald-100 text-emerald-800 border-emerald-300",
                                report.status === 'dismissed' && "bg-slate-100 text-slate-700 border-slate-300"
                              )}>
                                {report.status === 'pending' ? tr('چاوەڕوانی پێداچوونەوە', 'قيد المراجعة', 'Pending Review') :
                                 report.status === 'resolved' ? tr('چارەسەرکراو', 'تمت المعالجة', 'Resolved') :
                                 tr('ڕەتکراوەتەوە', 'مرفوض', 'Dismissed')}
                              </span>
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                {report.reason}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                {tr('پەخش و پەخشکەر', 'المذيع والبث', 'Broadcaster & Stream')}
                              </span>
                              <div className="flex items-center gap-2">
                                {report.broadcasterAvatar ? (
                                  <img src={report.broadcasterAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-300" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                    {report.broadcasterName?.charAt(0) || 'B'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h5 className="font-black text-slate-900 text-xs truncate">{report.broadcasterName}</h5>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">ID: {report.broadcasterId}</p>
                                </div>
                              </div>
                              <div className="pt-1 text-[11px] text-slate-700">
                                <span className="font-bold text-slate-900">{tr('ناونیشانی لایڤ:', 'عنوان البث:', 'Stream Title:')} </span>
                                <span>{report.sessionTitle || tr('پەخشی ڕاستەوخۆ', 'بث مباشر', 'Live Stream')}</span>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                {tr('زانیاری ڕاپۆرتکەر', 'بيانات المبلغ', 'Reporter Details')}
                              </span>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800">{report.reportedByUserName}</span>
                                {report.reportedByUserPhone && (
                                  <span className="text-[10px] text-indigo-600 font-mono">{report.reportedByUserPhone}</span>
                                )}
                              </div>
                              {report.details && (
                                <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 italic">
                                  "{report.details}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleTerminateLiveStreamFromReport(report)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>{tr('وەستاندنی پەخش', 'إيقاف البث', 'Terminate Stream')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenStrikeModal(
                                  { id: report.broadcasterId, name: report.broadcasterName, context: `پەخشی لایڤ: ${report.sessionTitle}` },
                                  1,
                                  report.reason
                                )}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{tr('وریارکردنەوە / سزا', 'توجيه إنذار', 'Issue Strike')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleBanBroadcasterFromReport(report)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                                <span>{tr('بایکۆتکردنی پەخشکەر', 'حظر المذيع', 'Ban Broadcaster')}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {report.status !== 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{tr('چارەسەرکرا', 'تم الحل', 'Resolved')}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* SECTION 2: MARKETPLACE ITEM REPORTS */}
                {adminReportTypeSection === 'items' && (() => {
                  const filteredItems = itemReportsList.filter(r => {
                    if (adminReportStatusFilter !== 'all' && r.status !== adminReportStatusFilter) return false;
                    if (!adminSearchQuery) return true;
                    const q = adminSearchQuery.toLowerCase();
                    return (
                      r.itemTitle?.toLowerCase().includes(q) ||
                      r.sellerName?.toLowerCase().includes(q) ||
                      r.reportedByUserName?.toLowerCase().includes(q) ||
                      r.reason?.toLowerCase().includes(q) ||
                      r.details?.toLowerCase().includes(q)
                    );
                  });

                  if (filteredItems.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-1">
                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>{tr('هیچ ڕاپۆرتێکی کاڵا تۆمارنەکراوە.', 'لا توجد بلاغات مسجلة عن المنتجات.', 'No marketplace item reports recorded.')}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredItems.map((report) => (
                        <div
                          key={report.id}
                          className={clsx(
                            "bg-white border rounded-2xl p-4 space-y-3 shadow-xs transition-all",
                            report.status === 'pending' ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black border font-mono uppercase tracking-wider",
                                report.status === 'pending' && "bg-rose-100 text-rose-800 border-rose-300 animate-pulse",
                                report.status === 'resolved' && "bg-emerald-100 text-emerald-800 border-emerald-300",
                                report.status === 'dismissed' && "bg-slate-100 text-slate-700 border-slate-300"
                              )}>
                                {report.status === 'pending' ? tr('چاوەڕوانی پێداچوونەوە', 'قيد المراجعة', 'Pending Review') :
                                 report.status === 'resolved' ? tr('چارەسەرکراو', 'تمت المعالجة', 'Resolved') :
                                 tr('ڕەتکراوەتەوە', 'مرفوض', 'Dismissed')}
                              </span>
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                {report.reason}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                {tr('زانیاری کاڵا و فرۆشیار', 'بيانات المنتج والبائع', 'Item & Seller Details')}
                              </span>
                              <div className="flex items-center gap-3">
                                {report.itemImage && (
                                  <img src={report.itemImage} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-black text-slate-900 text-xs truncate">{report.itemTitle}</h5>
                                  <p className="text-[10px] text-slate-600 font-bold">
                                    {report.itemPrice ? `${report.itemPrice.toLocaleString()} IQD` : ''} • فرۆشیار: {report.sellerName}
                                  </p>
                                  {report.sellerPhone && (
                                    <p className="text-[10px] text-indigo-700 font-mono font-bold">{report.sellerPhone}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                                {tr('زانیاری ڕاپۆرتکەر و تێبینی', 'بيانات المبلغ والملاحظات', 'Reporter & Details')}
                              </span>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800">{report.reportedByUserName}</span>
                                {report.reportedByUserPhone && (
                                  <span className="text-[10px] text-indigo-600 font-mono">{report.reportedByUserPhone}</span>
                                )}
                              </div>
                              {report.details && (
                                <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 italic">
                                  "{report.details}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveOffendingItemFromReport(report)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{tr('سڕینەوەی کاڵا لە بازاڕ', 'حذف الإعلان المخالف', 'Remove Offending Item')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenStrikeModal(
                                  { id: report.sellerId, name: report.sellerName, phone: report.sellerPhone, context: `کاڵا: ${report.itemTitle}` },
                                  1,
                                  report.reason
                                )}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{tr('ناردنی وریارکردنەوە بۆ فرۆشیار', 'توجيه إنذار للبائع', 'Warn Seller')}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {report.status !== 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemReportStatus(report.id, 'resolved')}
                                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{tr('چارەسەرکرا', 'تم الحل', 'Resolved')}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteItemReport(report.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* SECTION 3: USER STRIKES & OFFICIAL WARNINGS */}
                {adminReportTypeSection === 'strikes' && (() => {
                  if (userStrikesList.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold space-y-1">
                        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>{tr('هیچ سزایەک یان وریارکردنەوەیەک تۆمارنەکراوە.', 'لا توجد إنذارات أو عقوبات مسجلة حالياً.', 'No user strikes or warnings registered.')}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {userStrikesList.map((st) => (
                        <div
                          key={st.id}
                          className={clsx(
                            "bg-white border rounded-2xl p-4 space-y-3 shadow-xs transition-all",
                            st.level === 3 ? "border-rose-300 bg-rose-50/30" : st.level === 2 ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black border font-mono uppercase tracking-wider",
                                st.level === 1 && "bg-amber-100 text-amber-800 border-amber-300",
                                st.level === 2 && "bg-orange-100 text-orange-800 border-orange-300",
                                st.level === 3 && "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                              )}>
                                {st.level === 1 ? tr('ئاستی ١: ئاگاداری فەرمی', 'إنذار أول', 'Strike 1 (Warning)') :
                                 st.level === 2 ? tr('ئاستی ٢: وریارکردنەوەی توند', 'إنذار ثاني نهائي', 'Strike 2 (Severe)') :
                                 tr('ئاستی ٣: سڕکردن و بایکۆت', 'إنذار ثالث (حظر دائم)', 'Strike 3 (Ban)')}
                              </span>
                              <span className="font-bold text-slate-800 text-xs">
                                {st.userName}
                              </span>
                              {st.userPhone && (
                                <span className="text-[10px] text-indigo-600 font-mono font-bold">({st.userPhone})</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(st.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{tr('هۆکاری سەرپێچی:', 'سبب المخالفة:', 'Reason:')} {st.reason}</span>
                              <span className="text-[10px] text-slate-500 font-mono">ئەدمین: {st.issuedByAdminEmail}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                              "{st.message}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* SECTION 4: AUDIT ACTIVITY LOGS */}
                {adminReportTypeSection === 'audit' && (
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-2xs">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>{tr('تۆماری کردارە ئیداری و چاودێرییەکان لە فایەربەیس', 'سجل النشاطات الإدارية المباشر', 'Real-time Admin Audit Trail')}</span>
                    </h5>

                    {adminActivityLogsList.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center italic">
                        {tr('تۆماری چالاکی نییە.', 'لا توجد سجلات حالياً.', 'No audit records yet.')}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {adminActivityLogsList.map((log) => (
                          <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-mono text-[9px] font-bold rounded">
                                  {log.actionType}
                                </span>
                                <span className="font-bold text-slate-900">{log.description}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {log.adminEmail}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: SECURITY CONTROLS & AUDIT LOGS */}
            {adminSubTab === 'security' && (
              <div className="space-y-5">
                {/* Security Feature 1: Maintenance Mode Toggle */}
                <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span>{tr('دۆخی چاکسازی و وەستاندنی نوێکاری', 'وضع الصيانة وإيقاف النشر المؤقت', 'App Maintenance Lock')}</span>
                    </h4>
                    <p className="text-[10px] text-slate-600">
                      {tr(
                        'لە کاتی چالاککردندا، سیستەمەکە ڕێگری دەکات لە سپام و پۆستی نوێ لە کاتی هێرش یان چاکسازیدا.',
                        'عند التفعيل، يتم قفل إضافة إعلانات جديدة مؤقتاً لحماية المنصة أثناء الصيانة أو الهجمات.',
                        'Locks new user posts and limits public actions during security maintenance or spam floods.'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMaintenanceMode}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shrink-0",
                      maintenanceMode
                        ? "bg-rose-600 text-white shadow-rose-300 animate-pulse"
                        : "bg-emerald-600 text-white shadow-emerald-200"
                    )}
                  >
                    {maintenanceMode 
                      ? tr('چالاکە (Active)', 'مفعل (نشط)', 'Lock Active') 
                      : tr('ناچالاکە (Disabled)', 'معطل', 'Lock Inactive')}
                  </button>
                </div>

                {/* Security Feature 2: Phone Blacklist Management */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-2xs">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>{tr('لیستی بایکۆتکراوانی تەلەفۆن', 'القائمة السوداء لأرقام الهواتف المحظورة', 'Blacklisted Phone Numbers')}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={tr('ژمارەی مۆبایل بنووسە... (0750XXXXXXX)', 'أدخل رقم الهاتف للحظر... (0750XXXXXXX)', 'Enter phone to block... (0750XXXXXXX)')}
                      value={newBlacklistInput}
                      onChange={(e) => setNewBlacklistInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddBlacklistPhone}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                      {tr('خستنە لیست', 'إضافة للحظر', 'Add to Blacklist')}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {blacklistedPhones.map(phone => (
                      <span key={phone} className="bg-rose-100 text-rose-900 text-xs font-mono font-bold px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1.5">
                        <span>{phone}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlacklistPhone(phone)}
                          className="hover:text-rose-600 font-bold p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Security Feature 3: Live Security Audit Trail */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-2xs">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>{tr('تۆماری کردارە ئاسایشییەکان', 'سجل النشاطات والإجراءات الأمنية', 'Security Audit Trail')}</span>
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {securityLogs.map(log => (
                      <div key={log.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{log.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACCOUNT DELETION ZONE (AT THE BOTTOM OF PROFILE) */}
        {/* Sign Out Card */}
        {onSignOut && (
          <div className={clsx(
            "mt-8 p-4 sm:p-5 rounded-2xl border space-y-3 shadow-xs",
            isRoyal 
              ? "bg-[#091124] border-amber-400/20 text-white" 
              : "bg-amber-50/70 border-amber-200/80 text-slate-800"
          )}>
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2.5 rounded-xl shrink-0",
                  isRoyal ? "bg-amber-400/10 border border-amber-400/30 text-amber-400" : "bg-amber-100 border border-amber-300 text-amber-700"
                )}>
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={clsx("text-xs font-black uppercase tracking-wider", isRoyal ? "text-amber-300" : "text-amber-900")}>
                    {tr('دەرچوون لە هەژمار', 'تسجيل الخروج من الحساب', 'Sign Out of Account')}
                  </h4>
                  <p className={clsx("text-xs mt-0.5", isRoyal ? "text-slate-300" : "text-slate-600")}>
                    {tr(
                      'دەتوانیت لەم ئامێرە بچیتە دەرەوە و دواتر لە هەر کاتێکدا بێت بە ژمارەی مۆبایلەکەت بگەڕێیتەوە.',
                      'يمكنك تسجيل الخروج بأمان من هذا الجهاز والعودة برقم هاتفك في أي وقت.',
                      'Safely sign out from this device and log back in anytime with your phone number.'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className={clsx(
                  "px-4 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95 shrink-0",
                  isRoyal
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                )}
              >
                <LogOut className="w-4 h-4" />
                <span>{tr('دەرچوون (Sign Out)', 'تسجيل الخروج', 'Sign Out')}</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 p-5 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                {tr('ناوچەی سڕینەوەی هەژمار', 'منطقة حذف الحساب نهائياً', 'Account Deletion Zone')}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {tr(
                  'بە سڕینەوەی هەژمارەکەت، تەواوی زانیارییەکانت و کاڵا بڵاوکراوەکانت بە یەکجارەکی دەسڕێنەوە.',
                  'عند حذف حسابك، سيتم مسح كافة بياناتك وإعلاناتك بشكل دائم لا يمكن التراجع عنه.',
                  'Permanently delete your user account and all your uploaded items.'
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-rose-200 flex-wrap gap-3">
            <span className="text-[10px] text-slate-500 font-mono">ID: #{user.id}</span>
            <button
              type="button"
              onClick={handleInitiateSelfDelete}
              disabled={isDeletingSelf}
              className={clsx(
                "px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer active:scale-95",
                isDeletingSelf && "opacity-60 cursor-not-allowed"
              )}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeletingSelf ? (isKurdish ? 'دەسڕێتەوە...' : 'Deleting...') : tr('سڕینەوەی هەژمارەکەم', 'حذف حسابي نهائياً', 'Permanently Delete My Account')}</span>
            </button>
          </div>
        </div>
          </div>
        )}

        {/* Self Account Deletion Confirmation Modal */}
        <ConfirmationDialog
          isOpen={showSelfDeleteConfirm}
          type="danger"
          title={isKurdish ? 'سڕینەوەی یەکجارەکی هەژمار' : isArabic ? 'حذف الحساب نهائياً' : 'Permanently Delete Account'}
          message={isKurdish 
            ? 'ئایا دڵنیایت لە سڕینەوەی یەکجارەکی هەژمارەکەت؟ تەواوی کاڵاکانت، زانیارییەکانت و هەژمارەکەت بە یەکجارەکی دەسڕێنەوە و ناگەڕێتەوە.' 
            : isArabic 
            ? 'هل أنت متأكد من حذف حسابك نهائياً؟ سيتم مسح كافة إعلاناتك وبياناتك ولا يمكن استرجاعها.' 
            : 'Are you sure you want to permanently delete your account? All your uploaded items and profile data will be permanently erased.'}
          confirmLabel={isKurdish ? 'بەڵێ، هەژمارەکەم بسڕەوە' : isArabic ? 'نعم، احذف الحساب' : 'Yes, Delete My Account'}
          cancelLabel={isKurdish ? 'پاشگەزبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
          onConfirm={handleConfirmSelfDelete}
          onCancel={() => setShowSelfDeleteConfirm(false)}
        />

        {/* Admin Delete User Account Confirmation Modal */}
        <ConfirmationDialog
          isOpen={!!adminTargetToDelete}
          type="danger"
          title={isKurdish ? 'سڕینەوەی هەژماری بەکارهێنەر' : isArabic ? 'حذف حساب المستخدم' : 'Delete User Account'}
          message={isKurdish 
            ? `ئایا دڵنیایت لە سڕینەوەی یەکجارەکی هەژمار و تەواوی کاڵاکانی (${adminTargetToDelete?.name || adminTargetToDelete?.phone || adminTargetToDelete?.id})؟ سەرجەم داتاکان لە Firestore بە تەواوی دەسڕێنەوە.` 
            : isArabic 
            ? `هل أنت متأكد من حذف حساب وإعلانات (${adminTargetToDelete?.name || adminTargetToDelete?.phone || adminTargetToDelete?.id}) نهائياً؟ سيتم مسح كافة البيانات من Firestore.` 
            : `Are you sure you want to permanently delete user account and all items for (${adminTargetToDelete?.name || adminTargetToDelete?.phone || adminTargetToDelete?.id})? All data will be purged from Firestore.`}
          confirmLabel={isKurdish ? 'بەڵێ، بە یەکجاری بیسڕەوە' : isArabic ? 'نعم، احذف الحساب' : 'Yes, Delete Permanently'}
          cancelLabel={isKurdish ? 'پاشگەزبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
          onConfirm={handleConfirmAdminDeleteUser}
          onCancel={() => setAdminTargetToDelete(null)}
        />

        {/* User Profile Inspection & Management Modal */}
        {selectedUserDetailModal && (
          <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl space-y-0 text-right animate-in fade-in zoom-in duration-150">
              {/* Header Banner */}
              <div className="relative bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-6 text-white flex flex-col items-center justify-center text-center">
                <button
                  type="button"
                  onClick={() => setSelectedUserDetailModal(null)}
                  className="absolute top-4 left-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  title={tr('داخستن', 'إغلاق', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="relative mb-3">
                  <img
                    src={selectedUserDetailModal.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUserDetailModal.id}`}
                    alt={selectedUserDetailModal.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl"
                  />
                  {selectedUserDetailModal.isVerified && (
                    <div 
                      className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-md"
                      title={tr('خاوەن بەیجی فەرمی', 'موثق', 'Verified')}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  {selectedUserDetailModal.isPerfectSeller && (
                    <div 
                      className="absolute -top-1 -right-1 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 rounded-full p-1 border-2 border-white shadow-md animate-bounce"
                      title={tr('فرۆشیاری نموونەیی (Perfect Seller)', 'بائع متميز', 'Perfect Seller')}
                    >
                      <Star className="w-3 h-3 fill-slate-950" />
                    </div>
                  )}
                </div>

                <h3 className="text-base font-black text-white">{selectedUserDetailModal.name}</h3>
                <p className="text-xs text-purple-200 font-mono mt-0.5">@{selectedUserDetailModal.username || 'user'}</p>

                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                  {selectedUserDetailModal.isVerified ? (
                    <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{tr('پشڕاستکراو (Verified)', 'موثق', 'Verified')}</span>
                    </span>
                  ) : (
                    <span className="bg-white/10 border border-white/20 text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {tr('بێ بەیج', 'بدون شارة', 'Unverified')}
                    </span>
                  )}

                  {selectedUserDetailModal.isPerfectSeller && (
                    <span className="bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{tr('فرۆشیاری نموونەیی (Perfect)', 'بائع متميز', 'Perfect Seller')}</span>
                    </span>
                  )}

                  {selectedUserDetailModal.isBanned && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      BANNED
                    </span>
                  )}

                  <span className="bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {selectedUserDetailModal.role === 'admin' ? 'ADMIN' : (selectedUserDetailModal.category || 'Customer')}
                  </span>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Contact & Info Grid */}
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-slate-500 font-bold">{tr('ژمارەی مۆبایل:', 'رقم الهاتف:', 'Phone Number:')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-indigo-700">{selectedUserDetailModal.phone || 'No phone'}</span>
                      {selectedUserDetailModal.phone && (
                        <a
                          href={`tel:${selectedUserDetailModal.phone}`}
                          className="p-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                          title={tr('پەیوەندی تەلەفۆنی', 'اتصال هاتف', 'Call Phone')}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {selectedUserDetailModal.email && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-slate-500 font-bold">{tr('ئیمەیڵ:', 'البريد الإلكتروني:', 'Email:')}</span>
                      <span className="font-mono text-slate-800 font-bold truncate max-w-[200px]">{selectedUserDetailModal.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-slate-500 font-bold">{tr('شار / ناونیشان:', 'المدينة / العنوان:', 'City / Location:')}</span>
                    <span className="font-bold text-slate-800">{selectedUserDetailModal.city || 'کوردستان'}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-slate-500 font-bold">{tr('ژمارەی ناسنامە (ID):', 'المعرف (ID):', 'User ID:')}</span>
                    <span className="font-mono text-[10px] text-slate-500">{selectedUserDetailModal.id}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <span className="text-indigo-900 font-bold">{tr('کاڵا بڵاوکراوەکان:', 'المنتجات المنشورة:', 'Published Items:')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const targetUser = selectedUserDetailModal;
                        setSelectedUserDetailModal(null);
                        setAdminSubTab('items');
                        setAdminSearchQuery(targetUser.name || targetUser.phone || targetUser.id);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                    >
                      <Package className="w-3 h-3" />
                      <span>{allPlatformItems.filter(i => i.userId === selectedUserDetailModal.id || i.sellerId === selectedUserDetailModal.id).length} {tr('کاڵا (نیشاندان)', 'منتج (عرض)', 'items (show)')}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Moderation Toggles */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVerifyUser(selectedUserDetailModal)}
                    className={clsx(
                      "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                      selectedUserDetailModal.isVerified
                        ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{selectedUserDetailModal.isVerified ? tr('لابردنی بەیج', 'إزالة الشارة', 'Remove Badge') : tr('بەخشینی بەیج', 'منح الشارة', 'Grant Badge')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePerfectSeller(selectedUserDetailModal)}
                    className={clsx(
                      "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                      selectedUserDetailModal.isPerfectSeller
                        ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-rose-50 hover:text-rose-700"
                        : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                    )}
                    title={selectedUserDetailModal.isPerfectSeller ? tr('لابردنی بەیجی نموونەیی', 'إزالة شارة التميز', 'Remove Perfect Seller Badge') : tr('بەخشینی بەیجی فرۆشیاری نموونەیی', 'منح شارة البائع المتميز', 'Grant Perfect Seller Badge')}
                  >
                    <Star className={clsx("w-3.5 h-3.5", selectedUserDetailModal.isPerfectSeller ? "text-amber-700 fill-amber-700" : "text-slate-950 fill-slate-950")} />
                    <span>{selectedUserDetailModal.isPerfectSeller ? tr('لابردنی بەیجی نایاب', 'إزالة الشارة', 'Remove Perfect') : tr('⭐ بەیجی نموونەیی', '⭐ شارة متميز', '⭐ Perfect Badge')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBanUser(selectedUserDetailModal)}
                    className={clsx(
                      "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                      selectedUserDetailModal.isBanned
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200"
                    )}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{selectedUserDetailModal.isBanned ? tr('چالاککردنەوە', 'إلغاء الحظر', 'Unban') : tr('سڕکردن', 'حظر', 'Ban')}</span>
                  </button>

                  {/* 🏅 Trusted Seal Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleTrustedSeller(selectedUserDetailModal)}
                    className={clsx(
                      "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95",
                      selectedUserDetailModal.isTrustedSeller
                        ? "bg-teal-100 text-teal-900 border border-teal-300 hover:bg-rose-50 hover:text-rose-700"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20"
                    )}
                    title={selectedUserDetailModal.isTrustedSeller ? tr('لابردنی مۆری باوەڕپێکراو', 'إزالة ختم الثقة', 'Remove Trusted Seal') : tr('بەخشینی مۆری باوەڕپێکراو', 'منح ختم الثقة', 'Grant Trusted Seal')}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>{selectedUserDetailModal.isTrustedSeller ? tr('لابردنی مۆری فەرمی', 'إزالة الختم', 'Remove Seal') : tr('🏅 مۆری باوەڕپێکراو', '🏅 ختم الثقة', '🏅 Trusted Seal')}</span>
                  </button>

                  {/* 🎁 Grant Admin Reward */}
                  <button
                    type="button"
                    onClick={() => {
                      const tgt = selectedUserDetailModal;
                      setSelectedUserDetailModal(null);
                      handleOpenAwardModal(tgt);
                    }}
                    className="col-span-1 sm:col-span-2 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20 active:scale-95"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-300" />
                    <span>{tr('🎁 بەخشینی پاداشتی تایبەتی ئەدمین', '🎁 منح مكافأة خاصة للبائع', '🎁 Award Honest Merchant')}</span>
                  </button>
                </div>

                {/* Danger Deletion Zone */}
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5">
                  <div>
                    <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>{tr('سڕینەوەی هەمیشەیی هەژمار', 'حذف الحساب نهائياً', 'Permanent Account Deletion')}</span>
                    </h4>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {tr(
                        'تەواوی پرۆفایل، زانیارییەکان و کاڵاکانی ئەم بەکارهێنەرە لە Firestore و کۆگا دەسڕدرێنەوە.',
                        'سيتم مسح ملف المستخدم وكافة إعلاناته وبياناته نهائياً من قاعدة البيانات.',
                        'All profile data, store items, and listings for this user will be completely purged from Firestore.'
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const uToDelete = selectedUserDetailModal;
                      setSelectedUserDetailModal(null);
                      handleInitiateDeleteUserAccount(uToDelete);
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{tr('سڕینەوەی ئەم هەژمارە بە یەکجاری', 'حذف هذا الحساب نهائياً', 'Permanently Delete This Account')}</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUserDetailModal(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {tr('داخستن', 'إغلاق', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Purge Demo Items Confirmation Modal */}
        <ConfirmationDialog
          isOpen={showDeleteDemosConfirm}
          type="warning"
          title={isKurdish ? 'پاککردنەوەی کاڵا دیمۆکان' : isArabic ? 'مسح المنتجات التجريبية' : 'Purge Demo Items'}
          message={isKurdish 
            ? 'ئایا دڵنیایت لە سڕینەوەی هەموو کاڵا و وێنە دیمۆ و نموونەییەکان لە سیستەم؟' 
            : isArabic 
            ? 'هل أنت متأكد من حذف كافة المنتجات والصور التجريبية (Demo)؟' 
            : 'Are you sure you want to delete all demo and sample items from the platform?'}
          confirmLabel={isKurdish ? 'سڕینەوەی دیمۆکان' : isArabic ? 'مسح الآن' : 'Purge Demo Items'}
          cancelLabel={isKurdish ? 'پاشگەزبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
          onConfirm={handleConfirmDeleteDemoItems}
          onCancel={() => setShowDeleteDemosConfirm(false)}
        />

        {/* Admin Purge Old User Accounts Confirmation Modal */}
        <ConfirmationDialog
          isOpen={showPurgeOldAccountsConfirm}
          type="danger"
          title={isKurdish ? 'پاککردنەوەی هەژمارە کۆنەکان' : isArabic ? 'تنظيف الحسابات القديمة' : 'Purge Old Accounts'}
          message={isKurdish 
            ? 'ئایا دڵنیایت لە سڕینەوەی هەموو هەژمارە کۆن و تاقیکارییەکان جگە لە هەژماری سەرەکی بەڕێوەبەر؟ ئەم کردارە کاڵا و پرۆفایلی ئەو هەژمارانە بە یەکجاری دەسڕێتەوە.' 
            : isArabic 
            ? 'هل أنت متأكد من حذف كافة الحسابات القديمة والتجريبية باستثناء حساب المدير الرئيسي؟' 
            : 'Are you sure you want to permanently delete all old/test user accounts and their items except the primary admin?'}
          confirmLabel={isKurdish ? 'بەڵێ، هەموویان بسڕەوە' : isArabic ? 'نعم، احذف الكل' : 'Yes, Purge Accounts'}
          cancelLabel={isKurdish ? 'پاشگەزبوونەوە' : isArabic ? 'إلغاء' : 'Cancel'}
          onConfirm={handlePurgeOldAccounts}
          onCancel={() => setShowPurgeOldAccountsConfirm(false)}
        />

        {/* Replay Video Player Modal */}
        {activeReplaySession && (
          <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl space-y-0 relative">
              <div className="p-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" />
                  <h3 className="text-xs font-black text-white truncate">
                    {activeReplaySession.title || activeReplaySession.featuredTitle || (isKurdish ? 'پەخشی ڕاستەوخۆی پاشەکەوتکراو' : 'Saved Live Replay')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReplaySession(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                  src={activeReplaySession.videoUrl || activeReplaySession.streamUrl || DEFAULT_LIVE_BROADCAST_VIDEO}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  poster={activeReplaySession.featuredImage || activeReplaySession.broadcasterAvatar}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== DEFAULT_LIVE_BROADCAST_VIDEO) {
                      target.src = DEFAULT_LIVE_BROADCAST_VIDEO;
                      target.play().catch(() => {});
                    } else if (target.src !== FALLBACK_LIVE_BROADCAST_VIDEO) {
                      target.src = FALLBACK_LIVE_BROADCAST_VIDEO;
                      target.play().catch(() => {});
                    }
                  }}
                />
              </div>

              <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>{isKurdish ? 'تۆمارکراوی پەخشی ڕاستەوخۆ' : 'Live Stream Recording'}</span>
                <span className="text-purple-300 font-bold">
                  {isKurdish ? `بینەران: ${activeReplaySession.viewerCount || 0}` : `Viewers: ${activeReplaySession.viewerCount || 0}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Strike / Warning Modal for Admin Moderation */}
        {strikeModalOpen && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl space-y-0 text-right animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black">
                      {tr('تۆمارکردن و ناردنی سزای بەکارهێنەر', 'إصدار إنذار أو عقوبة للمستخدم', 'Issue User Strike & Warning')}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {tr('تۆمارکردن لە فایەربەیس و ناردنی ئاگاداری ڕاستەوخۆ', 'حفظ في Firestore وإرسال تنبيه فوري', 'Logged to Firebase and dispatched as official notification')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStrikeModalOpen(false);
                    setTargetUserForStrike(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Target User Selector/Display */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">
                    {tr('بەکارهێنەری مەبەست:', 'المستخدم المستهدف:', 'Target User:')}
                  </label>
                  {targetUserForStrike?.id ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{targetUserForStrike.name}</span>
                        {targetUserForStrike.phone && (
                          <span className="text-[10px] text-indigo-700 font-mono font-bold block">{targetUserForStrike.phone}</span>
                        )}
                        {targetUserForStrike.context && (
                          <span className="text-[10px] text-slate-500 block">{targetUserForStrike.context}</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                        ID: {targetUserForStrike.id}
                      </span>
                    </div>
                  ) : (
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-400"
                      onChange={(e) => {
                        const found = allUsersList.find(u => u.id === e.target.value);
                        if (found) {
                          setTargetUserForStrike({ id: found.id, name: found.name, phone: found.phone });
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {tr('-- بەکارهێنەرێک هەڵبژێرە --', '-- اختر مستخدماً من القائمة --', '-- Select a user --')}
                      </option>
                      {allUsersList.filter(u => u.role !== 'admin' && u.email !== user.email).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.phone || u.email || 'No phone'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Strike Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">
                    {tr('ئاستی سزا و وریارکردنەوە:', 'مستوى العقوبة:', 'Strike Severity Level:')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        level: 1 as const,
                        label: tr('ئاستی ١ (ئاگاداری)', 'إنذار 1', 'Level 1 (Notice)'),
                        desc: tr('ئاگاداری سەرەتایی', 'تنبيه أولي', 'Initial Warning'),
                        color: strikeLevel === 1 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      },
                      {
                        level: 2 as const,
                        label: tr('ئاستی ٢ (توند)', 'إنذار 2', 'Level 2 (Final)'),
                        desc: tr('ئاگاداری کۆتایی', 'إنذار نهائي', 'Final Warning'),
                        color: strikeLevel === 2 ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      },
                      {
                        level: 3 as const,
                        label: tr('ئاستی ٣ (بایکۆت)', 'حظر فوري', 'Level 3 (Ban)'),
                        desc: tr('سڕکردنی هەژمار', 'حظر وإيقاف الحساب', 'Suspend & Ban Account'),
                        color: strikeLevel === 3 ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }
                    ].map((btn) => (
                      <button
                        key={btn.level}
                        type="button"
                        onClick={() => {
                          setStrikeLevel(btn.level);
                          setStrikeMessage(
                            btn.level === 1
                              ? `ئەمە یەکەم ئاگادارکردنەوەی فەرمییە لەسەر پابەندنەبوون بە ڕێساکانی بەکارهێنان (${strikeReason}). تکایە پابەندی یاساکان بە.`
                              : btn.level === 2
                              ? `ئاگاداری کۆتایی! دووبارەبوونەوەی سەرپێچی دەبێتە هۆی سڕکردن و بایکۆتکردنی هەمیشەیی هەژمارەکەت لە E-BAZIRGAN.`
                              : `بەهۆی سەرپێچیی دووبارە یان مەترسیدار (${strikeReason})، هەژمارەکەت ڕاگیرا و سڕکرا.`
                          );
                        }}
                        className={clsx(
                          "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                          btn.color
                        )}
                      >
                        <span className="font-black text-xs block">{btn.label}</span>
                        <span className="text-[9px] opacity-80 block">{btn.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">
                    {tr('هۆکاری فەرمی:', 'سبب المخالفة:', 'Violation Reason:')}
                  </label>
                  <select
                    value={strikeReason}
                    onChange={(e) => {
                      setStrikeReason(e.target.value);
                      setStrikeMessage(
                        strikeLevel === 1
                          ? `ئەمە یەکەم ئاگادارکردنەوەی فەرمییە لەسەر پابەندنەبوون بە ڕێساکانی بەکارهێنان (${e.target.value}). تکایە پابەندی یاساکان بە.`
                          : strikeLevel === 2
                          ? `ئاگاداری کۆتایی! دووبارەبوونەوەی سەرپێچی دەبێتە هۆی سڕکردن و بایکۆتکردنی هەمیشەیی هەژمارەکەت لە E-BAZIRGAN.`
                          : `بەهۆی سەرپێچیی دووبارە یان مەترسیدار (${e.target.value})، هەژمارەکەت ڕاگیرا و سڕکرا.`
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-400"
                  >
                    <option value="قسە یان ڕەفتاری نەشیاو">قسە یان ڕەفتاری نەشیاو (Inappropriate conduct)</option>
                    <option value="فێڵکردن و نرخی ساختە">فێڵکردن و نرخی ساختە (Fraud / Price manipulation)</option>
                    <option value="کاڵای قەدەغەکراو">کاڵای قەدەغەکراو (Prohibited goods)</option>
                    <option value="سپام یان پەخشی بێزارکەر">سپام یان پەخشی بێزارکەر (Spam / Harassment)</option>
                    <option value="شکاندنی مەرجەکانی بەکارهێنان">شکاندنی مەرجەکانی بەکارهێنان (Terms Violation)</option>
                  </select>
                </div>

                {/* Message Input */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">
                    {tr('دەقی ئاگاداری ڕاستەوخۆ بۆ بەکارهێنەر:', 'نص التنبيه الموجه للمستخدم:', 'Direct Warning Message to User:')}
                  </label>
                  <textarea
                    rows={3}
                    value={strikeMessage}
                    onChange={(e) => setStrikeMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-400"
                    placeholder={tr('دەقی پەیام بنووسە...', 'أدخل نص الرسالة...', 'Write message...')}
                  />
                </div>

                {/* Preview Box */}
                <div className={clsx(
                  "p-3 rounded-xl border text-xs space-y-1",
                  strikeLevel === 3 ? "bg-rose-50 border-rose-200 text-rose-900" : strikeLevel === 2 ? "bg-orange-50 border-orange-200 text-orange-900" : "bg-amber-50 border-amber-200 text-amber-900"
                )}>
                  <div className="flex items-center gap-1.5 font-black text-[11px]">
                    <Bell className="w-3.5 h-3.5" />
                    <span>{tr('پێشبینینی ئاگاداری بۆ بەکارهێنەر:', 'معاينة التنبيه لدى المستخدم:', 'Notification Preview:')}</span>
                  </div>
                  <p className="text-[11px] font-medium italic">
                    "{strikeMessage || 'پەیامی وریارکردنەوە'}"
                  </p>
                </div>

                {/* Real-World External Action (WhatsApp / SMS) */}
                {(() => {
                  const targetPhone = targetUserForStrike?.phone || '';
                  const cleanPhone = targetPhone.replace(/\D/g, '');
                  const waNumber = cleanPhone.startsWith('964') 
                    ? cleanPhone 
                    : cleanPhone.startsWith('0') 
                    ? `964${cleanPhone.slice(1)}` 
                    : cleanPhone ? `964${cleanPhone}` : '';

                  return (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>{tr('ناردنی ڕاستەقینە بۆ مۆبایل (WhatsApp / SMS):', 'الإرسال الفعلي للهاتف:', 'Real Mobile Delivery:')}</span>
                        </span>
                        {targetPhone && (
                          <span className="text-[10px] text-emerald-800 font-mono font-bold">
                            {targetPhone}
                          </span>
                        )}
                      </div>

                      {waNumber ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(strikeMessage)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{tr('ناردنی دەستبەجێ بە واتسئەپ', 'إرسال عبر واتساب', 'Send via WhatsApp')}</span>
                          </a>

                          <a
                            href={`sms:${cleanPhone}?body=${encodeURIComponent(strikeMessage)}`}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{tr('ناردنی SMS', 'إرسال SMS', 'Send SMS')}</span>
                          </a>

                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-700 font-bold">
                          {tr('بۆ ئەم بەکارهێنەرە ژمارە مۆبایل دیاری نەکراوە بۆ واتسئەپ.', 'لا يوجد رقم هاتف محدد لهذا المستخدم لإرسال واتساب.', 'No phone number available for WhatsApp.')}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStrikeModalOpen(false);
                    setTargetUserForStrike(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {tr('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitStrike}
                  disabled={!targetUserForStrike?.id || submittingStrike}
                  className={clsx(
                    "px-4 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95",
                    strikeLevel === 3 ? "bg-rose-600 hover:bg-rose-700" : strikeLevel === 2 ? "bg-orange-500 hover:bg-orange-600" : "bg-amber-600 hover:bg-amber-700",
                    (!targetUserForStrike?.id || submittingStrike) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {submittingStrike ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>{submittingStrike ? tr('دەنێردرێت...', 'جارٍ الإرسال...', 'Dispatching...') : tr('ناردن و تۆمارکردنی سزا', 'تطبيق وإرسال الإنذار', 'Issue Strike Now')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: ONE-BY-ONE ITEM DELETE CONFIRMATION MODAL */}
        {/* ------------------------------------------------------------- */}
        {itemToDeleteModal && (
          <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl space-y-0 text-right animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      {tr('سڕینەوەی کاڵا لە بازاڕ', 'حذف المنتج نهائياً', 'Delete Marketplace Item')}
                    </h3>
                    <p className="text-[10px] text-rose-200">
                      {tr('دەسەڵاتی سوپەر ئەدمین بۆ چاودێری بازاڕ', 'صلاحيات المدير العام لمراقبة المحتوى', 'Super Admin Moderation')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setItemToDeleteModal(null)}
                  disabled={isProcessingItemAction}
                  className="p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Item Summary Card */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <img
                    src={itemToDeleteModal.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200'}
                    alt={itemToDeleteModal.title}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {itemToDeleteModal.title}
                    </h4>
                    <p className="text-xs font-black text-amber-700 font-mono">
                      {itemToDeleteModal.price?.toLocaleString()} IQD
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {tr('فرۆشیار:', 'البائع:', 'Seller:')} <span className="font-bold text-slate-800">{itemToDeleteModal.userName || 'Verified Partner'}</span>
                    </p>
                  </div>
                </div>

                {/* Warning Text */}
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{tr('ئایا دڵنیایت لە سڕینەوەی ئەم کاڵایە؟', 'هل أنت متأكد من حذف هذا المنتج؟', 'Confirm Permanent Deletion')}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {tr(
                      'ئەم کاڵایە بە یەکجاری لە تەواوی بازاڕ، داتابەیسی Firestore و بەشی کڕین دەسڕدرێتەوە.',
                      'سيتم مسح هذا المنتج نهائياً من قاعدة بيانات Firestore والسوق العام.',
                      'This item will be permanently removed from Firestore and public marketplace listings.'
                    )}
                  </p>
                </div>

                {/* Notify Seller Option */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={itemNotifySellerOnDelete}
                      onChange={(e) => setItemNotifySellerOnDelete(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-black text-slate-800">
                      {tr('ناردنی نامەی ئاگاداری سەرپێچی بۆ فرۆشیار', 'إرسال إشعار بالمخالفة للبائع', 'Send takedown & violation notification to seller')}
                    </span>
                  </label>

                  {itemNotifySellerOnDelete && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] text-slate-500 font-bold">
                        {tr('هۆکاری سڕینەوە دیاری بکە:', 'اختر سبب الحذف:', 'Select removal reason:')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'سەرپێچی لە ڕێنماییەکانی بازاڕ',
                          'کاڵای قەدەغەکراو یان نایاسایی',
                          'نرخی ناڕاست و هەڵخەڵەتێنەر',
                          'وێنە یان زانیاری نادروست',
                          'ڕیکلامی دووبارە یان سپام'
                        ].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setItemDeleteReason(reason)}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                              itemDeleteReason === reason
                                ? "bg-rose-600 text-white shadow-2xs"
                                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                            )}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemToDeleteModal(null)}
                  disabled={isProcessingItemAction}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {tr('پاشگەزبوونەوە', 'إلغاء', 'Cancel')}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteItem}
                  disabled={isProcessingItemAction}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isProcessingItemAction ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isProcessingItemAction ? tr('دەسڕدرێتەوە...', 'جارٍ الحذف...', 'Deleting...') : tr('بەڵێ، کاڵاکە بسڕەوە', 'نعم، احذف المنتج', 'Yes, Delete Item')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: SEND VIOLATION NOTICE / WARNING TO ITEM SELLER */}
        {/* ------------------------------------------------------------- */}
        {itemForViolationModal && (
          <div className="fixed inset-0 z-[125] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl space-y-0 text-right animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-amber-600 via-rose-600 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-amber-200">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                      {tr('ناردنی نامەی ئاگاداری سەرپێچی بۆ فرۆشیار', 'إرسال إنذار مخالفة رسمي للبائع', 'Send Violation Notice to Seller')}
                    </h3>
                    <p className="text-[10px] text-amber-100">
                      {tr('کۆنترۆڵی فەرمی سەرپێچییەکانی بازاڕی E-BAZIRGAN', 'الرقابة الرسمية على إعلانات السوق', 'Official Marketplace Moderation')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setItemForViolationModal(null)}
                  disabled={isProcessingItemAction}
                  className="p-1.5 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Offending Item Preview */}
                <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                  <img
                    src={itemForViolationModal.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=200'}
                    alt={itemForViolationModal.title}
                    className="w-14 h-14 rounded-xl object-cover border border-amber-300 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {itemForViolationModal.title}
                    </h4>
                    <p className="text-xs font-black text-amber-800 font-mono">
                      {itemForViolationModal.price?.toLocaleString()} IQD
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span>{tr('فرۆشیار:', 'البائع:', 'Seller:')} <b>{itemForViolationModal.userName || 'Verified Partner'}</b></span>
                      {itemForViolationModal.sellerPhone && (
                        <span className="font-mono text-indigo-700 font-bold">({itemForViolationModal.sellerPhone})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason Pills Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 block">
                    {tr('جۆری سەرپێچی دیاری بکە:', 'نوع المخالفة:', 'Select Violation Reason:')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[
                      { id: '1', reason: 'زانیاری یان وێنەی نادروست و فێڵاوی', label: '⚠️ وێنە یان زانیاری نادروست' },
                      { id: '2', reason: 'کاڵای قەدەغەکراو یان نایاسایی', label: '🚫 کاڵای قەدەغەکراو یان نایاسایی' },
                      { id: '3', reason: 'دەستکاریکردنی نرخ یان نرخی ناڕاست', label: '💰 نرخی ناڕاست یان فێڵاوی' },
                      { id: '4', reason: 'کاڵای دووبارە یان بڵاوکردنەوەی سپام', label: '📢 کاڵای دووبارە یان سپام' },
                      { id: '5', reason: 'ناوەڕۆک یان قسەی نەشیاو و بێڕێزی', label: '🔞 ناوەڕۆکی نەشیاو' },
                      { id: '6', reason: 'سەرپێچی لە مەرجەکانی بازاڕ و فرۆشتن', label: '🛑 سەرپێچی لە یاساکانی بازاڕ' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectViolationReason(item.reason)}
                        className={clsx(
                          "px-2.5 py-2 rounded-xl text-[11px] font-bold text-right transition-all border cursor-pointer",
                          violationModalReason === item.reason
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Choices */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 block">
                    {tr('کرداری پێویست لەگەڵ کاڵاکە:', 'الإجراء المطلوب اتخاذه:', 'Action to Take:')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setViolationModalAction('warn_only')}
                      className={clsx(
                        "p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1",
                        violationModalAction === 'warn_only'
                          ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                        <span>{tr('تەنها ئاگاداری', 'تنبيه فقط', 'Warn Only')}</span>
                      </span>
                      <span className="text-[10px] text-slate-600 leading-tight">
                        {tr('کاڵاکە دەمێنێتەوە، بەڵام ئاگاداری فەرمی بۆ فرۆشیار دەچێت.', 'يبقى المنتج مع توجيه إنذار رسمي للبائع.', 'Keep item, send warning to seller.')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViolationModalAction('delete_and_warn')}
                      className={clsx(
                        "p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1",
                        violationModalAction === 'delete_and_warn'
                          ? "bg-rose-50 border-rose-400 ring-2 ring-rose-400"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span className="text-xs font-black text-rose-950 flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>{tr('سڕینەوە + ئاگاداری', 'حذف + تنبيه', 'Delete & Warn')}</span>
                      </span>
                      <span className="text-[10px] text-slate-600 leading-tight">
                        {tr('کاڵاکە لە بازاڕ دەسڕدرێتەوە و هۆکارەکەی پێڕادەگەیەنرێت.', 'حذف المنتج نهائياً وإعلام البائع بالسبب.', 'Remove item and notify seller.')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViolationModalAction('strike_and_delete')}
                      className={clsx(
                        "p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1",
                        violationModalAction === 'strike_and_delete'
                          ? "bg-purple-50 border-purple-400 ring-2 ring-purple-400"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span className="text-xs font-black text-purple-950 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                        <span>{tr('سڕینەوە + سزای Strike', 'حذف + إنذار رسمي', 'Strike & Ban')}</span>
                      </span>
                      <span className="text-[10px] text-slate-600 leading-tight">
                        {tr('کاڵا دەسڕدرێتەوە و خاڵی سزای سەرپێچی تۆمار دەکرێت.', 'حذف الإعلان وتسجيل عقوبة رسمية في حسابه.', 'Purge item and record strike on account.')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Strike Level (if strike selected) */}
                {violationModalAction === 'strike_and_delete' && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                    <label className="text-xs font-black text-purple-900 block">
                      {tr('ئاستی سزای سەرپێچی (Strike Level):', 'مستوى العقوبة:', 'Strike Severity Level:')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { level: 1 as const, label: 'ئاستی ١ (سەرەتایی)', desc: 'وریارکردنەوەی فەرمی' },
                        { level: 2 as const, label: 'ئاستی ٢ (توند)', desc: 'ئاگاداری کۆتایی' },
                        { level: 3 as const, label: 'ئاستی ٣ (سڕکردن)', desc: 'بایکۆتکردنی هەژمار' }
                      ].map((s) => (
                        <button
                          key={s.level}
                          type="button"
                          onClick={() => setViolationModalStrikeLevel(s.level)}
                          className={clsx(
                            "p-2 rounded-xl text-center border transition-all cursor-pointer",
                            violationModalStrikeLevel === s.level
                              ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200"
                          )}
                        >
                          <span className="text-xs font-black block">{s.label}</span>
                          <span className="text-[9px] opacity-80 block">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                    <span>{tr('دەقی نامەی ئاگاداری بۆ فرۆشیار:', 'نص رسالة التنبيه:', 'Warning Message Text:')}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{tr('دەتوانی دەستکاری بکەیت', 'قابل للتعديل', 'Editable')}</span>
                  </label>
                  <textarea
                    rows={4}
                    value={violationModalMessage}
                    onChange={(e) => setViolationModalMessage(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white leading-relaxed"
                    placeholder={tr('دەقی نامەی سەرپێچی لێرە بنووسە...', 'أدخل نص رسالة المخالفة هنا...', 'Enter message here...')}
                  />
                </div>

                {/* Real-World Contact & Phone Number Section for Actual Delivery */}
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-indigo-600" />
                      <span>{tr('ژمارەی مۆبایلی فرۆشیار بۆ ناردنی ڕاستەقینە:', 'رقم هاتف البائع للإرسال الفعلي:', 'Seller Phone for Real Delivery:')}</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {tr('دەتوانیت هەر ژمارەیەک بنووسیت', 'يمكنك كتابة أي رقم', 'Editable for any number')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={violationRecipientPhone}
                        onChange={(e) => setViolationRecipientPhone(e.target.value)}
                        placeholder="07746573763 یان 0750..."
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setViolationRecipientPhone('07746573763')}
                      className="px-2.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-xl text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                      title="بەکارھێنانی ژمارەی بەڕێوەبەر بۆ تاقیکردنەوە"
                    >
                      {tr('ژمارەی بەڕێوەبەر (07746573763)', 'رقم الإدارة', 'Use 07746573763')}
                    </button>
                  </div>

                  {/* Direct Real Delivery Actions Bar */}
                  {(() => {
                    const cleanPhone = (violationRecipientPhone || '').replace(/\D/g, '');
                    const waNumber = cleanPhone.startsWith('964') 
                      ? cleanPhone 
                      : cleanPhone.startsWith('0') 
                      ? `964${cleanPhone.slice(1)}` 
                      : cleanPhone ? `964${cleanPhone}` : '';

                    return (
                      <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-2">
                        {waNumber ? (
                          <>
                            <a
                              href={`https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(violationModalMessage)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{tr('ناردنی ڕاستەوخۆ بە واتسئەپ', 'إرسال فعلي عبر واتساب', 'Send via WhatsApp')}</span>
                            </a>

                            <a
                              href={`sms:${cleanPhone}?body=${encodeURIComponent(violationModalMessage)}`}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>{tr('ناردنی SMS', 'إرسال SMS', 'Send SMS')}</span>
                            </a>

                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                              title={tr('پەیوەندی تەلەفۆنی', 'اتصال', 'Call')}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </>
                        ) : (
                          <p className="text-[10px] text-amber-700 font-bold">
                            {tr('تکایە ژمارەی مۆبایل بنووسە بۆ ناردنی ڕاستەقینە لە ڕێگەی واتسئەپ یان SMS.', 'يرجى كتابة رقم الهاتف للإرسال الفعلي عبر واتساب أو الرسائل.', 'Enter a phone number to send via WhatsApp or SMS.')}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemForViolationModal(null)}
                  disabled={isProcessingItemAction}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {tr('داخستن', 'إلغاء', 'Close')}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitItemViolation}
                  disabled={isProcessingItemAction}
                  className={clsx(
                    "px-4 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50",
                    violationModalAction === 'strike_and_delete' 
                      ? "bg-purple-600 hover:bg-purple-700"
                      : violationModalAction === 'delete_and_warn'
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  )}
                >
                  {isProcessingItemAction ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isProcessingItemAction 
                      ? tr('دەنێردرێت...', 'جارٍ الإرسال...', 'Dispatching...') 
                      : tr('ناردنی فەرمی بۆ فرۆشیار', 'إرسال الإنذار للبائع', 'Dispatch Official Notice')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🎁 Award Honest Seller Modal (پاداشت و مۆری باوەڕپێکراو بۆ فرۆشیاری ڕاستگۆ) */}
        {awardModalSeller && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[550] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl space-y-0 text-right animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-2xl shadow-inner">
                    🎁
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-1.5">
                      <span>{tr('بەخشینی پاداشت بە فرۆشیاری ڕاستگۆ', 'منح مكافأة للبائع الصادق', 'Award Honest Merchant')}</span>
                      <Award className="w-4 h-4 text-amber-300" />
                    </h4>
                    <p className="text-xs text-emerald-100">
                      {awardModalSeller.name} • {awardModalSeller.phone || '0750...'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAwardModalSeller(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleGrantRewardSubmit} className="p-5 sm:p-6 space-y-4">
                {/* Reward Type Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-2">
                    {tr('جۆری پاداشت', 'نوع المكافأة', 'Reward Type')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAwardCurrency('IQD');
                        setAwardAmount(25000);
                      }}
                      className={clsx(
                        "p-2.5 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer",
                        awardCurrency === 'IQD'
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <span>{tr('دینار (IQD)', 'دينار عراقي', 'IQD')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAwardCurrency('POINTS');
                        setAwardAmount(5000);
                      }}
                      className={clsx(
                        "p-2.5 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer",
                        awardCurrency === 'POINTS'
                          ? "bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Gift className="w-4 h-4 text-purple-600" />
                      <span>{tr('خاڵی پاداشت', 'نقاط المكافأة', 'Points')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAwardCurrency('USD');
                        setAwardAmount(20);
                      }}
                      className={clsx(
                        "p-2.5 rounded-xl border text-xs font-black transition-all flex flex-col items-center gap-1 cursor-pointer",
                        awardCurrency === 'USD'
                          ? "bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>{tr('دۆلار ($ USD)', 'دولار أمريكي', 'USD ($)')}</span>
                    </button>
                  </div>
                </div>

                {/* Amount presets */}
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-2">
                    {tr('بڕی پاداشت', 'مبلغ المكافأة', 'Reward Amount')}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {awardCurrency === 'IQD' && [10000, 25000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAwardAmount(amt)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          awardAmount === amt
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {amt.toLocaleString()} IQD
                      </button>
                    ))}
                    {awardCurrency === 'POINTS' && [1000, 2500, 5000, 10000].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setAwardAmount(pts)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          awardAmount === pts
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {pts.toLocaleString()} {tr('خاڵ', 'نقطة', 'pts')}
                      </button>
                    ))}
                    {awardCurrency === 'USD' && [10, 20, 50, 100].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAwardAmount(d)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          awardAmount === d
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        ${d}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={awardAmount}
                    onChange={(e) => setAwardAmount(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="بڕی پاداشت..."
                  />
                </div>

                {/* Reason presets and input */}
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-2">
                    {tr('هۆکاری بەخشینی پاداشت (وەسف)', 'سبب منح المكافأة', 'Reason for Reward')}
                  </label>
                  <div className="space-y-1 mb-2">
                    {[
                      'فرۆشیاری ڕاستگۆ و خاوەن ئەمانەت و ڕەوشتی بەرز',
                      'پابەندبوون بە کوالێتی بەرز و ڕاستگۆیی لە وەسفی کاڵاکان',
                      'خزمەتگوزاری نایاب و ڕازیبوونی سەرجەم کڕیارەکان',
                      'پاداشتی دەستخۆشی ئەدمین وەک نموونەی بازرگانی باوەڕپێکراو'
                    ].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAwardReason(r)}
                        className="w-full text-right p-1.5 text-[11px] rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-950 text-slate-700 transition-colors block truncate border border-transparent hover:border-emerald-200 cursor-pointer"
                      >
                        • {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={awardReason}
                    onChange={(e) => setAwardReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="هۆکار بنووسە..."
                  />
                </div>

                {/* Auto-grant Trusted Seal checkbox */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">
                        {tr('پێدانی "مۆری باوەڕپێکراو" هاوکات لەگەڵ پاداشت', 'منح "ختم الثقة" تلقائياً مع المكافأة', 'Also Grant Official "Trusted Seal"')}
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        {tr('مۆرێکی زێڕین و سەوز بۆ پرۆفایل و کاڵاکانی فرۆشیار زیاد دەکات', 'يضيف شارة الختم الموثوق لجميع إعلانات البائع', 'Adds trusted merchant badge to all seller listings')}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={awardAutoGrantSeal}
                    onChange={(e) => setAwardAutoGrantSeal(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Submit & Cancel */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAwardModalSeller(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    {tr('پەشیمانبوونەوە', 'إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAward}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingAward ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Gift className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{tr('پەسەندکردن و بەخشینی پاداشت', 'تأكيد ومنح المكافأة', 'Confirm & Grant Reward')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Smart Bump Modal */}
        <BumpModal
          item={bumpModalItem}
          isOpen={!!bumpModalItem}
          onClose={() => setBumpModalItem(null)}
          onSuccess={(updated) => {
            showToast(isKurdish ? 'پۆستەکە بە سەرکەوتوویی خرایە لوتکە!' : 'Post bumped to top successfully!', 'success');
          }}
          i18nLanguage={i18n.language}
        />

        {/* Buyer Item Review & Rating Modal */}
        {showReviewModal && reviewingItem && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setReviewingItem(null);
              showToast(isKurdish ? 'هەڵسەنگاندنەکەت بە سەرکەوتوویی تۆمارکرا!' : isArabic ? 'تم حفظ التقييم بنجاح!' : 'Review saved successfully!', 'success');
            }}
            user={user}
            item={reviewingItem}
            theme={theme.includes('dark') || theme === 'black' ? 'dark' : 'white'}
          />
        )}

        {/* Bottom Quick Return to Home Footer Bar */}
        {onClose && (
          <div className="pt-4 pb-2 flex items-center justify-center border-t border-purple-200/40 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                "flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 shadow-md",
                isRoyal 
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20" 
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/25"
              )}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>{tr('گەڕانەوە بۆ پەڕەی سەرەکی (ماڵەوە)', 'الرجوع للصفحة الرئيسية', 'Return to Home Page')}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
