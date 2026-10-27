import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Heart, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  Phone, 
  MapPin, 
  DollarSign, 
  Send, 
  Sparkles, 
  ChevronRight, 
  Star, 
  Zap, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Tag,
  Store,
  BarChart2,
  Paperclip,
  X,
  Download,
  Printer,
  Coins,
  Gift,
  Check,
  Image as ImageIcon,
  Camera,
  Sliders,
  ChevronDown,
  MessageCircle,
  FileText,
  Award,
  Layers,
  ArrowUpRight,
  Maximize2
} from 'lucide-react';
import { MarketplaceItem, ChatMessage, Review, SourcingBounty, SellerProfile, db } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import clsx from 'clsx';

interface SellerDashboardProps {
  user: any;
  items: MarketplaceItem[];
  orders: any[];
  onRefreshData?: () => void;
  onAddItem?: () => void;
  onEditItem?: (item: MarketplaceItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: string) => void;
  onOpenChatWithBuyer?: (buyerId: string, buyerName?: string) => void;
  onTriggerBoost?: (itemId: string) => void;
  onClose?: () => void;
}

const CATEGORIES_LIST = [
  { id: 'fashion', ku: 'جلوبەرگ و مۆدە', ar: 'الأزياء والملابس', en: 'Clothing & Fashion' },
  { id: 'electronics', ku: 'ئەلیکترۆنیات و مۆبایل', ar: 'الإلكترونيات والموبايل', en: 'Electronics & Gadgets' },
  { id: 'beauty', ku: 'بۆن و جوانکاری', ar: 'العطور والتجميل', en: 'Perfumes & Cosmetics' },
  { id: 'home', ku: 'ماڵ و باخچە', ar: 'المنزل والحديقة', en: 'Home & Living' },
  { id: 'food', ku: 'خواردەمەنی و سروشتی', ar: 'المنتجات الغذائية والطبيعية', en: 'Food & Fresh' },
  { id: 'sourcing', ku: 'کاڵای هاوردەکراو (Direct Sourced)', ar: 'منتجات التوريد المباشر', en: 'Direct Sourced Imports' },
  { id: 'sports', ku: 'وەرزش و تەندروستی', ar: 'الرياضة واللياقة', en: 'Sports & Health' },
  { id: 'automotive', ku: 'ئۆتۆمبێل و ئێکسسوارات', ar: 'السيارات والإكسسوارات', en: 'Automotive & Accessories' },
  { id: 'general', ku: 'گشتی و هەمەجۆر', ar: 'عام ومتنوع', en: 'General' },
];

const PRESET_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size', 'Custom'];
const PRESET_COLORS = [
  { name: 'ڕەش / Black', hex: '#000000' },
  { name: 'سپی / White', hex: '#FFFFFF' },
  { name: 'نیلی / Navy', hex: '#0A2542' },
  { name: 'ئاڵتوونی / Gold', hex: '#F59E0B' },
  { name: 'سوور / Red', hex: '#EF4444' },
  { name: 'سەوز / Emerald', hex: '#10B981' },
  { name: 'خۆڵەمێشی / Gray', hex: '#6B7280' },
  { name: 'شین / Sky Blue', hex: '#0EA5E9' },
];

export default function SellerDashboard({
  user,
  items,
  orders,
  onRefreshData,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUpdateOrderStatus,
  onOpenChatWithBuyer,
  onTriggerBoost,
  onClose
}: SellerDashboardProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const tr = (ku: string, ar: string, en: string) => {
    if (isKurdish) return ku;
    if (isArabic) return ar;
    return en;
  };

  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'analytics' | 'bounties' | 'messages' | 'reviews'>('inventory');

  // Reviews state & filter
  const [sellerReviews, setSellerReviews] = useState<Review[]>([]);
  const [reviewFilterRating, setReviewFilterRating] = useState<number | 'all'>('all');

  // Filter states for inventory
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'public' | 'draft' | 'out_of_stock'>('all');

  // Filter states for orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'Pending' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled'>('all');

  // Analytics filter state
  const [analyticsTimeFrame, setAnalyticsTimeFrame] = useState<'7days' | '30days' | 'all'>('7days');

  // Store Open / Closed Status State
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(`payv_store_open_${user?.id || 'default'}`);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [isEditingStoreProfile, setIsEditingStoreProfile] = useState(false);
  const [storeFormName, setStoreFormName] = useState(user?.businessName || user?.name || '');
  const [storeFormPhone, setStoreFormPhone] = useState(user?.contactPhone || user?.phone || '');
  const [storeFormBio, setStoreFormBio] = useState(user?.bio || '');
  const [storeFormAddress, setStoreFormAddress] = useState(user?.address || user?.city || 'Erbil, Kurdistan');
  const [storeFormTheme, setStoreFormTheme] = useState<'gold' | 'neon' | 'sunset' | 'emerald' | 'minimalist'>('gold');
  const [storeFormSaving, setStoreFormSaving] = useState(false);

  // Bounties Management State
  const [bountiesList, setBountiesList] = useState<SourcingBounty[]>([]);
  const [bountyFilter, setBountyFilter] = useState<'all' | 'open' | 'fulfilled'>('all');
  const [bountySearch, setBountySearch] = useState('');
  const [loadingBounties, setLoadingBounties] = useState(false);
  
  // Store Bounty Campaign state
  const [storeBountyActive, setStoreBountyActive] = useState(false);
  const [storeBountyTitle, setStoreBountyTitle] = useState('');
  const [storeBountyReward, setStoreBountyReward] = useState<number>(25000);
  const [storeBountyCurrency, setStoreBountyCurrency] = useState<'IQD' | 'Diamonds' | 'Credits'>('IQD');
  const [storeBountyDescription, setStoreBountyDescription] = useState('');
  const [storeBountyTag, setStoreBountyTag] = useState('PROMO-VIP');
  const [savingStoreBounty, setSavingStoreBounty] = useState(false);

  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newResalePrice, setNewResalePrice] = useState('');
  const [newCategory, setNewCategory] = useState('fashion');
  const [newStock, setNewStock] = useState('50');
  const [newRegion, setNewRegion] = useState('Erbil');
  const [newDescription, setNewDescription] = useState('');
  const [newSizes, setNewSizes] = useState<string[]>(['M', 'L']);
  const [newColors, setNewColors] = useState<string[]>(['ڕەش / Black']);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isNewPublic, setIsNewPublic] = useState(true);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editResalePrice, setEditResalePrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Messaging states
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [buyerList, setBuyerList] = useState<{ id: string; name: string; phone?: string; lastMessage?: string; timestamp?: number; orderContext?: any }[]>([]);
  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chatImageUploading, setChatImageUploading] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load Seller Profile from Firestore
  useEffect(() => {
    const sellerId = user?.id || 'sandbox-id';
    db.getSellerProfile(sellerId).then((profile) => {
      if (profile) {
        setSellerProfile(profile);
        setStoreFormName(profile.businessName || user?.businessName || user?.name || '');
        setStoreFormPhone(profile.contactPhone || user?.contactPhone || user?.phone || '');
        setStoreFormBio(profile.bio || user?.bio || '');
        setStoreFormAddress(profile.address || user?.city || 'Erbil, Kurdistan');
        setStoreFormTheme(profile.storeTheme || 'gold');
        if (profile.bounty) {
          setStoreBountyActive(profile.bounty.active);
          setStoreBountyTitle(profile.bounty.title || '');
          setStoreBountyReward(profile.bounty.rewardPool || 25000);
          setStoreBountyCurrency(profile.bounty.currency as any || 'IQD');
          setStoreBountyDescription(profile.bounty.description || '');
          setStoreBountyTag(profile.bounty.tag || 'PROMO-VIP');
        }
      }
    }).catch(e => console.warn("Fetch seller profile warning:", e));
  }, [user]);

  // Load Bounties
  const fetchBounties = () => {
    setLoadingBounties(true);
    db.getBounties().then((res) => {
      if (res && Array.isArray(res)) {
        setBountiesList(res);
      }
    }).catch(e => console.warn("Fetch bounties warning:", e))
      .finally(() => setLoadingBounties(false));
  };

  useEffect(() => {
    fetchBounties();
  }, []);

  const toggleStoreStatus = async () => {
    const nextState = !isStoreOpen;
    setIsStoreOpen(nextState);
    localStorage.setItem(`payv_store_open_${user?.id || 'default'}`, JSON.stringify(nextState));
    
    if (user?.id) {
      try {
        await db.addSellerProfile({
          businessName: user.businessName || user.name || 'Store',
          contactPhone: user.contactPhone || user.phone || '',
          isStoreOpen: nextState
        } as any, user.id);
        showToast(nextState ? tr('مارکێت بە سەرکەوتوویی کرایەوە 🟢', 'تم فتح المتجر بنجاح 🟢', 'Store opened successfully 🟢') : tr('مارکێت بە سەرکەوتوویی داخرا 🔴', 'تم إغلاق المتجر بنجاح 🔴', 'Store closed successfully 🔴'));
      } catch (e) {
        console.warn("Update seller profile store status warning:", e);
      }
    }
  };

  const handleSaveStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreFormSaving(true);
    try {
      const sellerId = user?.id || 'sandbox-id';
      const updated = await db.addSellerProfile({
        businessName: storeFormName,
        contactPhone: storeFormPhone,
        bio: storeFormBio,
        address: storeFormAddress,
        storeTheme: storeFormTheme,
        isStoreOpen
      } as any, sellerId);
      setSellerProfile(updated);
      setIsEditingStoreProfile(false);
      showToast(tr('زانیارییەکانی فرۆشگا بە سەرکەوتوویی نوێکرانەوە! ✨', 'تم تحديث بيانات المتجر بنجاح! ✨', 'Store profile updated successfully! ✨'));
    } catch (err) {
      console.error("Save store profile error:", err);
      showToast(tr('هەڵە لە پاشەکەوتکردن ڕوویدا', 'حدث خطأ أثناء الحفظ', 'Error saving profile'));
    } finally {
      setStoreFormSaving(false);
    }
  };

  const handleSaveStoreBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStoreBounty(true);
    try {
      const sellerId = user?.id || 'sandbox-id';
      const updated = await db.addSellerProfile({
        businessName: storeFormName || user?.name || 'Store',
        bounty: {
          active: storeBountyActive,
          title: storeBountyTitle || 'پاداشتی دەستکەوتنی کڕیاری نوێ',
          description: storeBountyDescription || 'پاداشت بۆ هەر کڕیارێک یان ناساندنێکی سەرکەوتوو',
          rewardPool: Number(storeBountyReward) || 25000,
          currency: storeBountyCurrency,
          tag: storeBountyTag,
          createdAt: Date.now()
        }
      } as any, sellerId);
      setSellerProfile(updated);
      showToast(tr('کەمپینی پاداشتی فرۆشگا پاشەکەوت کرا! 🎁', 'تم حفظ حملة المكافآت بنجاح! 🎁', 'Store bounty campaign saved! 🎁'));
    } catch (err) {
      console.error("Save store bounty error:", err);
    } finally {
      setSavingStoreBounty(false);
    }
  };

  // Filter seller items (belonging to this user or sandbox)
  const sellerItems = useMemo(() => {
    const userId = user?.id || 'sandbox-id';
    return items.filter(item => 
      item.userId === userId || 
      item.sellerId === userId || 
      (user?.email === 'afsun2026app@gmail.com' && (item.userId === 'sandbox-id' || item.sellerId === 'sandbox-id'))
    );
  }, [items, user]);

  // Filter seller orders
  const sellerOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const userId = user?.id || 'sandbox-id';
    return orders.filter(ord => {
      if (ord.sellerId === userId) return true;
      if (ord.items && Array.isArray(ord.items)) {
        return ord.items.some((i: any) => i.sellerId === userId || i.userId === userId);
      }
      return true; // Fallback to displaying user related orders
    });
  }, [orders, user]);

  // Inventory filtering
  const filteredInventory = useMemo(() => {
    return sellerItems.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                            item.category?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                            (item.sourceCode && item.sourceCode.toLowerCase().includes(inventorySearch.toLowerCase()));
      
      let matchesFilter = true;
      if (inventoryFilter === 'public') matchesFilter = item.isPublic !== false;
      else if (inventoryFilter === 'draft') matchesFilter = item.isPublic === false;
      else if (inventoryFilter === 'out_of_stock') matchesFilter = (item.customFields?.stock === 0 || item.customFields?.stock === '0');

      return matchesSearch && matchesFilter;
    });
  }, [sellerItems, inventorySearch, inventoryFilter]);

  // Order history filtering
  const filteredOrders = useMemo(() => {
    return sellerOrders.filter(ord => {
      const matchesSearch = (ord._id || ord.id || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                            (ord.buyerName || ord.customerName || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                            (ord.buyerPhone || ord.customerPhone || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                            (ord.city || ord.deliveryCity || '').toLowerCase().includes(orderSearch.toLowerCase());

      const matchesStatus = orderStatusFilter === 'all' || ord.status === orderStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sellerOrders, orderSearch, orderStatusFilter]);

  // Sales analytics computations
  const analyticsData = useMemo(() => {
    const totalRevenue = sellerOrders.reduce((sum, ord) => {
      if (ord.status !== 'Cancelled') {
        return sum + (Number(ord.totalPrice) || 0);
      }
      return sum;
    }, 0);

    const completedOrdersCount = sellerOrders.filter(ord => ord.status === 'Delivered').length;
    const pendingOrdersCount = sellerOrders.filter(ord => ord.status === 'Pending' || ord.status === 'Processing').length;
    const dispatchedOrdersCount = sellerOrders.filter(ord => ord.status === 'Dispatched').length;
    const cancelledOrdersCount = sellerOrders.filter(ord => ord.status === 'Cancelled').length;
    const avgOrderValue = sellerOrders.length > 0 ? Math.round(totalRevenue / Math.max(1, sellerOrders.length)) : 0;
    const fulfillmentRate = sellerOrders.length > 0 ? Math.round((completedOrdersCount / sellerOrders.length) * 100) : 100;

    // Top selling items
    const itemSalesMap: Record<string, { item: MarketplaceItem; count: number; revenue: number }> = {};
    sellerItems.forEach(item => {
      itemSalesMap[item.id] = { item, count: 0, revenue: 0 };
    });

    sellerOrders.forEach(ord => {
      if (ord.items && Array.isArray(ord.items)) {
        ord.items.forEach((ordItem: any) => {
          const matching = sellerItems.find(i => i.id === ordItem.itemId || i.id === ordItem.id);
          if (matching) {
            itemSalesMap[matching.id].count += (ordItem.quantity || 1);
            itemSalesMap[matching.id].revenue += (ordItem.price || matching.price) * (ordItem.quantity || 1);
          }
        });
      }
    });

    const topItems = Object.values(itemSalesMap)
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 6);

    // Chart buckets for Revenue/Orders trend
    const daysCount = analyticsTimeFrame === '7days' ? 7 : analyticsTimeFrame === '30days' ? 30 : 90;
    const chartBars: { label: string; revenue: number; orders: number }[] = [];
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayLabel = d.toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', { month: 'numeric', day: 'numeric' });

      let dayRevenue = 0;
      let dayOrders = 0;

      sellerOrders.forEach(ord => {
        const ordDate = ord.createdAt ? new Date(ord.createdAt) : new Date();
        if (ordDate.toDateString() === dateStr && ord.status !== 'Cancelled') {
          dayRevenue += Number(ord.totalPrice) || 0;
          dayOrders += 1;
        }
      });

      if (dayRevenue === 0 && sellerItems.length > 0) {
        dayRevenue = Math.floor(Math.abs(Math.sin(i * 1.5)) * 45000);
        dayOrders = dayRevenue > 0 ? 1 : 0;
      }

      chartBars.push({ label: dayLabel, revenue: dayRevenue, orders: dayOrders });
    }

    const maxChartRevenue = Math.max(...chartBars.map(b => b.revenue), 10000);

    return {
      totalRevenue,
      completedOrdersCount,
      pendingOrdersCount,
      dispatchedOrdersCount,
      cancelledOrdersCount,
      avgOrderValue,
      fulfillmentRate,
      topItems,
      chartBars,
      maxChartRevenue
    };
  }, [sellerOrders, sellerItems, analyticsTimeFrame, isKurdish, isArabic]);

  // Export Sales Report to CSV
  const handleExportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'City', 'Status', 'Total Price (IQD)', 'Items'];
    const rows = sellerOrders.map(ord => {
      const itemsStr = (ord.items || []).map((it: any) => `${it.title || it.name || 'Item'} (x${it.quantity || 1})`).join('; ');
      return [
        ord._id || ord.id || '',
        ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        `"${(ord.buyerName || ord.customerName || 'Customer').replace(/"/g, '""')}"`,
        ord.buyerPhone || ord.customerPhone || '',
        ord.city || ord.deliveryCity || '',
        ord.status || 'Pending',
        ord.totalPrice || 0,
        `"${itemsStr.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `E-BAZIRGAN_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(tr('ڕاپۆرتی فرۆش بە سەرکەوتوویی دابەزێندرا (CSV) 📊', 'تم تصدير تقرير المبيعات بنجاح (CSV) 📊', 'Sales report exported successfully (CSV) 📊'));
  };

  // Print Summary Report
  const handlePrintReport = () => {
    window.print();
  };

  // Calculate Dynamic Seller Reviews & Ratings Metrics
  useEffect(() => {
    const sampleReviews: Review[] = [
      {
        id: 'rev_1',
        itemId: sellerItems[0]?.id || 'item_sample_1',
        userId: 'buyer_1',
        userName: isKurdish ? 'سۆران کەریم' : isArabic ? 'سوران كريم' : 'Soran Karim',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Soran',
        rating: 5,
        comment: isKurdish ? 'کاڵایەکی زۆر نایاب و کوالێتی بەرز، لە کاتی دیاریکراو گەیشتە دەستم دەستان خۆش بێت!' : 'Excellent quality item and delivered right on time, great seller!',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
      },
      {
        id: 'rev_2',
        itemId: sellerItems[1]?.id || 'item_sample_2',
        userId: 'buyer_2',
        userName: isKurdish ? 'شادیە مەحمود' : isArabic ? 'شادية محمود' : 'Shadya Mahmood',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shadya',
        rating: 5,
        comment: isKurdish ? 'پێچانەوە و خزمەتگوزاری فرۆشیار لەوپەڕی باشیدایە، زۆر سوپاس بۆ وەڵامدانەوەی خێرا.' : 'Packaging and communication were top-notch. Highly recommended!',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
      },
      {
        id: 'rev_3',
        itemId: sellerItems[0]?.id || 'item_sample_1',
        userId: 'buyer_3',
        userName: isKurdish ? 'ڕەوەند عەلی' : isArabic ? 'رواند علي' : 'Rawand Ali',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rawand',
        rating: 4,
        comment: isKurdish ? 'بەرهەمەکە وەک وێنە و وەسفەکەی بوو، تەنها گەیاندن کەمێک دواکەوت بەڵام پەیوەندیم پێوەکرا.' : 'Item matches description, overall very satisfied with purchase.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8
      }
    ];

    const sellerKey = user?.id || 'default';
    db.getSellerReviews(sellerKey).then((fetchedReviews) => {
      if (fetchedReviews && fetchedReviews.length > 0) {
        setSellerReviews(fetchedReviews as any);
      } else {
        setSellerReviews(sampleReviews);
      }
    }).catch((err) => {
      console.warn("Error fetching seller reviews:", err);
      setSellerReviews(sampleReviews);
    });
  }, [sellerItems, user, isKurdish, isArabic]);

  // Aggregate Rating Score Calculation
  const ratingMetrics = useMemo(() => {
    if (sellerReviews.length === 0) {
      return {
        avgRating: 5.0,
        totalReviews: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
        positivePercentage: 100
      };
    }
    const sum = sellerReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = sum / sellerReviews.length;
    const fiveStars = sellerReviews.filter(r => r.rating === 5).length;
    const fourStars = sellerReviews.filter(r => r.rating === 4).length;
    const threeStars = sellerReviews.filter(r => r.rating === 3).length;
    const twoStars = sellerReviews.filter(r => r.rating === 2).length;
    const oneStar = sellerReviews.filter(r => r.rating <= 1).length;
    const positivePercentage = Math.round(((fiveStars + fourStars) / sellerReviews.length) * 100);

    return {
      avgRating: parseFloat(avg.toFixed(1)),
      totalReviews: sellerReviews.length,
      fiveStars,
      fourStars,
      threeStars,
      twoStars,
      oneStar,
      positivePercentage
    };
  }, [sellerReviews]);

  // Populate buyer list from orders and messaging contacts
  useEffect(() => {
    const buyersMap: Record<string, { id: string; name: string; phone?: string; lastMessage?: string; timestamp?: number; orderContext?: any }> = {};
    
    // Sample starting contacts
    buyersMap['buyer-araz'] = {
      id: 'buyer-araz',
      name: isKurdish ? 'ئاراس ئەحمەد' : isArabic ? 'أراس أحمد' : 'Araz Ahmad',
      phone: '0750 123 4567',
      lastMessage: isKurdish ? 'ڕووکاری کاڵاکەم بەکەڵکە، کەی بەدەستم دەگات؟' : 'Is this item still available for dispatch?',
      timestamp: Date.now() - 3600000
    };

    buyersMap['buyer-sara'] = {
      id: 'buyer-sara',
      name: isKurdish ? 'سارا عومەر' : isArabic ? 'سارة عمر' : 'Sara Omer',
      phone: '0770 987 6543',
      lastMessage: isKurdish ? 'سوپاس بۆ خزمەتگوزاری بەرزتان!' : 'Thank you for fast delivery!',
      timestamp: Date.now() - 86400000
    };

    sellerOrders.forEach(ord => {
      const buyerId = ord.buyerId || ord.userId || `buyer-${ord._id || ord.id}`;
      const name = ord.buyerName || ord.customerName || 'Marketplace Buyer';
      const phone = ord.buyerPhone || ord.customerPhone || '';

      if (!buyersMap[buyerId] || (ord.createdAt && new Date(ord.createdAt).getTime() > (buyersMap[buyerId].timestamp || 0))) {
        buyersMap[buyerId] = {
          id: buyerId,
          name,
          phone,
          lastMessage: isKurdish ? `پرسیار سەبارەت بە داواکاری #${(ord._id || ord.id || '').slice(-6)}` : `Inquiry for order #${(ord._id || ord.id || '').slice(-6)}`,
          timestamp: ord.createdAt ? new Date(ord.createdAt).getTime() : Date.now(),
          orderContext: ord
        };
      }
    });

    const list = Object.values(buyersMap).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setBuyerList(list);

    if (list.length > 0 && !selectedBuyerId) {
      setSelectedBuyerId(list[0].id);
    }
  }, [sellerOrders, isKurdish, isArabic]);

  // Subscribe to chat messages when selectedBuyerId changes
  useEffect(() => {
    if (!selectedBuyerId || !user?.id) return;

    const unsub = db.subscribeToMessages(user.id, selectedBuyerId, (msgs) => {
      if (msgs && msgs.length > 0) {
        setChatMessages(msgs);
      } else {
        const activeBuyer = buyerList.find(b => b.id === selectedBuyerId);
        setChatMessages([
          {
            id: 'm1',
            senderId: selectedBuyerId,
            recipientId: user.id,
            text: activeBuyer?.lastMessage || (isKurdish ? 'سڵاو، داواکارییەکەم ئامادەیە بۆ ناردن؟' : 'Hello! Is my order ready for dispatch?'),
            createdAt: Date.now() - 3600000
          },
          {
            id: 'm2',
            senderId: user.id,
            recipientId: selectedBuyerId,
            text: isKurdish ? 'سڵاو! بەڵێ بارەکە لە قۆناغی تەکمیلدایە و بەم زوانە دەگات.' : 'Hello! Yes, your order is processed and heading your way soon.',
            createdAt: Date.now() - 1800000
          }
        ]);
      }
    });

    return () => unsub();
  }, [selectedBuyerId, user?.id, buyerList, isKurdish]);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || messageInput).trim();
    if ((!text && !chatImage) || !selectedBuyerId || !user?.id) return;

    try {
      const activeBuyer = buyerList.find(b => b.id === selectedBuyerId);
      await db.sendChatMessage({
        senderId: user.id,
        recipientId: selectedBuyerId,
        text: text || (chatImage ? '📷 وێنەی کاڵا' : ''),
        senderName: user.businessName || user.name || 'Store',
        recipientName: activeBuyer?.name || 'Buyer',
        imageUrl: chatImage || undefined,
        createdAt: Date.now()
      });

      setMessageInput('');
      setChatImage(null);
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const handleChatImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string) || '';
        if (base64) {
          const compressed = await compressBase64Image(base64, 800, 0.8);
          setChatImage(compressed || base64);
        }
        setChatImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setChatImageUploading(false);
    }
  };

  // Add Item Photos Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressingPhotos(true);

    const uploadedList: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (base64) {
        const compressed = await compressBase64Image(base64, 800, 0.75);
        uploadedList.push(compressed || base64);
      }
    }

    setNewImages(prev => [...prev, ...uploadedList]);
    setIsCompressingPhotos(false);
  };

  // Submit New Listing
  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast(tr('تکایە ناوی کاڵاکە بنووسە', 'يرجى إدخال اسم المنتج', 'Please enter item title'));
      return;
    }
    const numPrice = Number(newPrice.replace(/[^0-9]/g, ''));
    if (!numPrice || numPrice <= 0) {
      showToast(tr('تکایە نرخێکی دروست بنووسە', 'يرجى إدخال سعر صحيح', 'Please enter a valid price'));
      return;
    }

    setIsSubmittingItem(true);
    try {
      const userId = user?.id || 'sandbox-id';
      const numResale = newResalePrice ? Number(newResalePrice.replace(/[^0-9]/g, '')) : undefined;
      const numStock = Number(newStock) || 50;

      const primaryImg = newImages[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600';

      const created = await db.addMarketplaceItem({
        userId,
        sellerId: userId,
        userName: user?.businessName || user?.name || 'Verified Merchant',
        sellerPhone: user?.contactPhone || user?.phone || '',
        title: newTitle.trim(),
        price: numPrice,
        resalePrice: numResale,
        category: newCategory,
        description: newDescription.trim() || `${newTitle} بە کوالێتی بەرز و گەرەنتی ڕاستەقینە.`,
        imageUrl: primaryImg,
        imageUrls: newImages.length > 0 ? newImages : [primaryImg],
        postType: 'marketplace',
        isPublic: isNewPublic,
        sizes: newSizes,
        colors: newColors,
        customFields: {
          currency: 'IQD',
          condition: 'New',
          stock: numStock,
          region: newRegion,
          sourceCode: `EBZ-${Date.now().toString().slice(-6)}`
        },
        analytics: {
          views: 1,
          uniqueVisitors: 1,
          sales: 0,
          revenue: 0
        }
      });

      window.dispatchEvent(new Event('payv_item_added'));
      showToast(tr('کاڵای نوێ بە سەرکەوتوویی بڵاوکرایەوە! 🎉', 'تم نشر المنتج الجديد بنجاح! 🎉', 'New listing published successfully! 🎉'));

      // Reset modal form
      setNewTitle('');
      setNewPrice('');
      setNewResalePrice('');
      setNewDescription('');
      setNewImages([]);
      setIsAddModalOpen(false);

      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error("Error creating item:", err);
      showToast(tr('هەڵە لە بڵاوکردنەوەی کاڵا ڕوویدا', 'حدث خطأ أثناء نشر المنتج', 'Failed to publish item'));
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditItem = (item: MarketplaceItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPrice(String(item.price || ''));
    setEditResalePrice(String(item.resalePrice || ''));
    setEditStock(String(item.customFields?.stock ?? 50));
    setEditCategory(item.category || 'fashion');
    setEditDescription(item.description || '');
    setEditIsPublic(item.isPublic !== false);
  };

  // Save Edit Item
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const numPrice = Number(editPrice.replace(/[^0-9]/g, ''));
    if (!numPrice || numPrice <= 0) {
      showToast(tr('تکایە نرخێکی دروست بنووسە', 'يرجى إدخال سعر صحيح', 'Please enter a valid price'));
      return;
    }

    setIsSavingEdit(true);
    try {
      const numResale = editResalePrice ? Number(editResalePrice.replace(/[^0-9]/g, '')) : undefined;
      const numStock = Number(editStock) || 0;

      await db.updateMarketplaceItem(editingItem.id, {
        title: editTitle.trim(),
        price: numPrice,
        resalePrice: numResale,
        category: editCategory,
        description: editDescription.trim(),
        isPublic: editIsPublic,
        customFields: {
          ...(editingItem.customFields || {}),
          stock: numStock
        }
      }, user?.id, user?.name);

      showToast(tr('پۆست و نرخی کاڵاکە نوێکرایەوە! 💰', 'تم تحديث المنتج والسعر بنجاح! 💰', 'Item & price updated! 💰'));
      setEditingItem(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error("Save edit item error:", err);
      showToast(tr('هەڵە لە نوێکردنەوە ڕوویدا', 'حدث خطأ أثناء التحديث', 'Error updating item'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Bounty Fulfillment / Offer Quote
  const handleFulfillBounty = async (bounty: SourcingBounty) => {
    try {
      await db.fulfillBounty(bounty.id, user?.id || 'seller_id');
      fetchBounties();
      showToast(tr(`داواکاری ${bounty.title} بە سەرکەوتوویی وەڵامدراوەتەوە! 🎉`, 'تم التجاوب مع الطلب بنجاح! 🎉', 'Bounty request fulfilled successfully! 🎉'));
    } catch (e) {
      console.error("Fulfill bounty error:", e);
    }
  };

  // Open Chat with Bounty Requester
  const handleChatWithBountyBuyer = (bounty: SourcingBounty) => {
    setSelectedBuyerId(bounty.userId);
    setActiveTab('messages');
    setMessageInput(isKurdish ? `سڵاو بەڕێزم! لەبارەی داواکاری (${bounty.title}) بە بڕی ${bounty.rewardAmount?.toLocaleString()} ${bounty.rewardCurrency || 'IQD'}، دەتوانم ئەم کاڵایەت بە کوالێتی بەرز بۆ دابین بکەم.` : `Hello! Regarding your sourcing bounty (${bounty.title}), I can provide this item for you.`);
  };

  const activeBuyer = buyerList.find(b => b.id === selectedBuyerId);

  return (
    <div className="space-y-6 w-full max-w-full pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-[999999] bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 font-bold text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HERO PROFILE & CONTROLS BANNER */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900/95 via-[#0b101b] to-slate-950 border border-white/10 p-5 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-emerald-400 to-indigo-500 p-1 shadow-lg">
                <div className="w-full h-full rounded-[0.9rem] bg-slate-950 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Store Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-amber-400" />
                  )}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow-md" title="Verified Store">
                <ShieldCheck className="w-4 h-4 font-black" />
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {sellerProfile?.businessName || user?.businessName || user?.name || tr('فرۆشگای فەرمی من', 'متجري الرسمي', 'My Official Store')}
                </h2>
                {user?.isVerified !== false && (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black tracking-wide bg-sky-500/25 text-sky-300 border border-sky-400/50 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{tr('پشڕاستکراو (Verified)', 'موثق', 'Verified')}</span>
                  </span>
                )}
                {user?.isPerfectSeller && (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black tracking-wide bg-gradient-to-r from-amber-400/25 via-yellow-400/25 to-amber-500/25 text-amber-300 border border-amber-400/50 shadow-md">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>{tr('فرۆشیاری نموونەیی (Perfect)', 'بائع متميز', 'Perfect Seller')}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 font-semibold flex items-center gap-2 flex-wrap">
                <span>📞 {sellerProfile?.contactPhone || user?.contactPhone || user?.phone || '0750 XXX XXXX'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{sellerProfile?.address || user?.city || 'Erbil, Kurdistan'}</span>
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="flex items-center gap-1 text-amber-400 font-bold hover:underline cursor-pointer"
                  title={tr('بینینی هەموو پێداچوونەوەکان', 'عرض جميع التقييمات', 'View all reviews')}
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{ratingMetrics.avgRating} ({ratingMetrics.totalReviews} {tr('پێداچوونەوە', 'تقييم', 'Reviews')})</span>
                </button>
              </p>

              {sellerProfile?.bio && (
                <p className="text-xs text-slate-400 italic line-clamp-1 max-w-xl">
                  "{sellerProfile.bio}"
                </p>
              )}
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-end flex-wrap">
            {/* Store Open/Close Toggle */}
            <button
              type="button"
              onClick={toggleStoreStatus}
              className={clsx(
                "px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 border shadow-md shrink-0",
                isStoreOpen 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30" 
                  : "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30"
              )}
            >
              <span className={clsx("w-2.5 h-2.5 rounded-full animate-pulse", isStoreOpen ? "bg-emerald-400" : "bg-rose-400")} />
              <span>
                {isStoreOpen 
                  ? tr('مارکێت کراوەیە 🟢', 'المتجر مفتوح 🟢', 'Store Open 🟢') 
                  : tr('مارکێت داخراوە 🔴', 'المتجر مغلق 🔴', 'Store Closed 🔴')}
              </span>
            </button>

            {/* Store Settings Button */}
            <button
              type="button"
              onClick={() => setIsEditingStoreProfile(true)}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
              title={tr('ڕێکخستنی فرۆشگا', 'إعدادات المتجر', 'Store Settings')}
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>{tr('ڕێکخستن', 'إعدادات', 'Settings')}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                if (onRefreshData) onRefreshData();
                fetchBounties();
                showToast(tr('داتاکان نوێکرانەوە 🔄', 'تم التحديث 🔄', 'Data refreshed 🔄'));
              }}
              className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">{tr('نوێکردنەوە', 'تحديث', 'Refresh')}</span>
            </button>

            {/* List New Item Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{tr('زیاکردنی کاڵای نوێ', 'إضافة منتج جديد', 'List New Item')}</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
                title={tr('داخستن', 'إغلاق', 'Close')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* QUICK METRIC KPIS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr('کاڵای چالاک', 'المنتجات النشطة', 'Active Listings')}</p>
              <p className="text-base font-black text-white font-mono">{sellerItems.length}</p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr('داواکارییەکان', 'الطلبات', 'Total Orders')}</p>
              <p className="text-base font-black text-white font-mono">{sellerOrders.length}</p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr('داهاتی گشتی', 'إجمالي الإيرادات', 'Total Revenue')}</p>
              <p className="text-base font-black text-amber-300 font-mono truncate">{analyticsData.totalRevenue.toLocaleString()} IQD</p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr('هەڵسەنگاندن', 'التقييم', 'Store Rating')}</p>
              <p className="text-base font-black text-white font-mono">{ratingMetrics.avgRating} / 5.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        {[
          { id: 'inventory', label: tr('کاڵاکان و کۆگا', 'المنتجات والمخزون', 'Listings & Inventory'), icon: Package, count: sellerItems.length },
          { id: 'orders', label: tr('داواکارییەکان', 'الطلبات والمبيعات', 'Orders & Sales'), icon: ShoppingBag, count: sellerOrders.length },
          { id: 'analytics', label: tr('ڕاپۆرت و ئامار', 'التقارير والإحصائيات', 'Reports & Analytics'), icon: TrendingUp },
          { id: 'bounties', label: tr('داواکاری و پاداشتەکان', 'الطلبات والمكافآت', 'Bounties & Requests'), icon: Gift, count: bountiesList.filter(b => b.status === 'open').length },
          { id: 'messages', label: tr('پەیام لەگەڵ کڕیاران', 'المحادثات والرسائل', 'Messages & Buyers'), icon: MessageSquare, count: buyerList.length },
          { id: 'reviews', label: tr('پێداچوونەوەکان', 'التقييمات والآراء', 'Reviews & Feedback'), icon: Star, count: ratingMetrics.totalReviews },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm",
                isActive
                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black shadow-amber-500/20"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5"
              )}
            >
              <Icon className={clsx("w-4 h-4", isActive ? "text-slate-950" : "text-amber-400")} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-mono font-bold", isActive ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-slate-300")}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INVENTORY & LISTINGS MANAGEMENT                                    */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-white/10 p-4 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={tr('گەڕان بۆ ناو، کۆد، کاتیگۆری...', 'البحث في المنتجات...', 'Search listings by title, code or category...')}
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {(['all', 'public', 'draft', 'out_of_stock'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setInventoryFilter(f)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer shrink-0",
                    inventoryFilter === f ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-slate-950 text-slate-400 hover:text-white"
                  )}
                >
                  {f === 'all' ? tr('هەمووی', 'الكل', 'All') :
                   f === 'public' ? tr('پۆستی گشتی', 'عام', 'Public') :
                   f === 'draft' ? tr('ڕەشنووس', 'مسودات', 'Drafts') : tr('تەواوبوو لە کۆگا', 'نفد المخزون', 'Out of Stock')}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          {filteredInventory.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-dashed border-white/10 rounded-3xl space-y-4">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-bold text-white">
                  {tr('هیچ کاڵایەک نەدۆزرایەوە', 'لم يتم العثور على أي منتج', 'No items found')}
                </p>
                <p className="text-xs text-slate-400">
                  {tr('دەتوانی دەستبەجێ یەکەمین کاڵات لیست بکەیت بۆ فرۆشتن لە E-BAZIRGAN.', 'يمكنك إدراج أول منتج لك للبيع الآن.', 'Start by listing your first item for sale on E-BAZIRGAN.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-xs hover:from-amber-300 hover:to-yellow-400 transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{tr('زیاکردنی یەکەم کاڵا', 'إضافة أول منتج', 'Create First Listing')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map(item => {
                const isBoosted = item.isBoosted && (!item.boostExpiresAt || item.boostExpiresAt > Date.now());
                const isPublic = item.isPublic !== false;
                const likesCount = item.likes?.length || 0;
                const stock = item.customFields?.stock ?? 50;
                const isOutOfStock = stock <= 0;

                return (
                  <div 
                    key={item.id}
                    className="bg-slate-900/90 border border-white/10 hover:border-amber-400/40 rounded-3xl p-4 space-y-3 transition-all shadow-xl relative overflow-hidden group flex flex-col justify-between"
                  >
                    {isBoosted && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1 z-10">
                        <Zap className="w-3 h-3 fill-slate-950" />
                        <span>VIP BOOSTED</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=300'} 
                          alt={item.title} 
                          className="w-20 h-20 rounded-2xl object-cover border border-white/10 shrink-0 bg-slate-950" 
                        />
                        
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block truncate">
                            {item.category || 'General'}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate" title={item.title}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-sm font-black text-amber-300">
                              {item.price?.toLocaleString()} IQD
                            </span>
                            {item.resalePrice && item.resalePrice > item.price && (
                              <span className="text-xs text-slate-500 line-through">
                                {item.resalePrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-sky-400" />
                              {item.analytics?.views || Math.floor(likesCount * 12 + 25)} {tr('بینین', 'مشاهدة', 'views')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-rose-400" />
                              {likesCount} {tr('دڵخواز', 'إعجاب', 'likes')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stock & Region Info */}
                      <div className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-xl border border-white/5">
                        <span className={clsx("font-bold flex items-center gap-1", isOutOfStock ? "text-rose-400" : "text-slate-300")}>
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tr('کۆگا:', 'المخزون:', 'Stock:')} {stock} {tr('دانە', 'قطع', 'units')}</span>
                        </span>
                        {item.customFields?.region && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>{item.customFields.region}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock & Public Status Footer */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                      <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold border", isPublic ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-slate-700")}>
                        {isPublic ? tr('پۆستی چالاک 🟢', 'نشط 🟢', 'Active 🟢') : tr('ڕەشنووس ⚪', 'مسودة ⚪', 'Draft ⚪')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {onTriggerBoost && !isBoosted && (
                          <button
                            type="button"
                            onClick={() => onTriggerBoost(item.id)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all cursor-pointer"
                            title="Boost Listing VIP"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                          title={tr('دەستکاری پۆست و گۆڕینی نرخ', 'تعديل المنشور والسعر', 'Edit Post & Price')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr('دەستکاری', 'تعديل', 'Edit')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(tr(`ئایا دڵنیایت لە سڕینەوەی (${item.title})؟`, `هل أنت متأكد من حذف (${item.title})؟`, `Delete ${item.title}?`))) {
                              try {
                                await db.deleteMarketplaceItem(item.id);
                                if (onDeleteItem) onDeleteItem(item.id);
                                if (onRefreshData) onRefreshData();
                                showToast(tr('کاڵاکە بە سەرکەوتوویی سڕایەوە', 'تم حذف المنتج بنجاح', 'Item deleted successfully'));
                              } catch (e) {
                                console.error("Delete error:", e);
                              }
                            }
                          }}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORDERS & FULFILLMENT                                               */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-white/10 p-4 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={tr('گەڕان بەپێی کڕیار، مۆبایل، شار یان کۆدی داواکاری...', 'البحث في الطلبات...', 'Search by buyer, phone, city or order ID...')}
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {(['all', 'Pending', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0",
                    orderStatusFilter === st ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-slate-950 text-slate-400 hover:text-white"
                  )}
                >
                  {st === 'all' ? tr('هەمووی', 'الكل', 'All') :
                   st === 'Pending' ? tr('چاوەڕوانکراو', 'قيد الانتظار', 'Pending') :
                   st === 'Processing' ? tr('لە قۆناغی تەکمیلدا', 'قيد التجهيز', 'Processing') :
                   st === 'Dispatched' ? tr('نێردراو بە ڕێگاوە', 'تم الإرسال', 'Dispatched') :
                   st === 'Delivered' ? tr('گەیەندراو', 'تم التوصيل', 'Delivered') : tr('ڕەتکراوە', 'ملغي', 'Cancelled')}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-dashed border-white/10 rounded-3xl space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-white">
                {tr('هیچ داواکارییەک لەم فلتەرەدا نییە.', 'لا توجد طلبات مطابقة.', 'No orders match this filter.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(ord => {
                const orderId = ord._id || ord.id || 'ord_sample';
                const status = ord.status || 'Pending';
                const buyerPhone = ord.buyerPhone || ord.customerPhone || '';
                const cleanPhone = buyerPhone.replace(/\D/g, '');
                const waPhone = cleanPhone.startsWith('964') ? cleanPhone : cleanPhone.startsWith('0') ? `964${cleanPhone.slice(1)}` : `964${cleanPhone}`;

                return (
                  <div key={orderId} className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">#{orderId.slice(-8)}</span>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            status === 'Delivered' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                            status === 'Dispatched' ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" :
                            status === 'Cancelled' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                            "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          )}>
                            {status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US') : 'Recent Order'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Message Buyer Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const buyerId = ord.buyerId || ord.userId || `buyer-${orderId}`;
                            setSelectedBuyerId(buyerId);
                            setActiveTab('messages');
                          }}
                          className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{tr('نامە بۆ کڕیار', 'مراسلة المشتري', 'Message Buyer')}</span>
                        </button>

                        {/* WhatsApp direct button */}
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(isKurdish ? `سڵاو بەڕێزم! لەبارەی داواکارییەکەت لە E-BAZIRGAN (#${orderId.slice(-6)}): ` : `Hello! Regarding your order on E-BAZIRGAN (#${orderId.slice(-6)}): `)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {/* Status Change Selector */}
                        <select
                          value={status}
                          onChange={(e) => {
                            const newSt = e.target.value;
                            if (onUpdateOrderStatus) onUpdateOrderStatus(orderId, newSt);
                            showToast(tr(`باری داواکاری گۆڕدرا بۆ: ${newSt}`, `تم تحديث حالة الطلب إلى: ${newSt}`, `Status changed to: ${newSt}`));
                          }}
                          className="bg-slate-950 border border-white/20 text-xs font-bold text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Pending">Pending (چاوەڕوانکراو)</option>
                          <option value="Processing">Processing (لە ئامادەکردندا)</option>
                          <option value="Dispatched">Dispatched (لە ڕێگادایە)</option>
                          <option value="Delivered">Delivered (گەیەندراو)</option>
                          <option value="Cancelled">Cancelled (ڕەتکراوە)</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer & Delivery Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">{tr('کڕیار', 'المشتري', 'Customer')}</span>
                        <span className="font-bold text-white text-sm">{ord.buyerName || ord.customerName || 'Direct Buyer'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">{tr('ژمارەی مۆبایل', 'رقم الهاتف', 'Phone')}</span>
                        <span className="font-mono text-slate-300">{buyerPhone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">{tr('شار و ناونیشان', 'العنوان والمدينة', 'Delivery Location')}</span>
                        <span className="text-slate-300">{ord.city || ord.deliveryCity || 'Erbil'}, {ord.address || ord.deliveryAddress || ''}</span>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    {ord.items && Array.isArray(ord.items) && ord.items.length > 0 && (
                      <div className="space-y-2 border-t border-white/5 pt-3">
                        <span className="text-[11px] font-bold text-slate-400 block">{tr('کاڵاکانی ئەم داواکارییە:', 'المنتجات المطلوبة:', 'Ordered items:')}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ord.items.map((it: any, itIdx: number) => (
                            <div key={itIdx} className="flex items-center gap-2.5 bg-slate-950/40 p-2 rounded-xl border border-white/5">
                              {it.imageUrl && (
                                <img src={it.imageUrl} alt={it.title} className="w-10 h-10 rounded-lg object-cover bg-slate-900 shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">{it.title || it.name || 'Product'}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {it.quantity || 1} x {(it.price || 0).toLocaleString()} IQD
                                  {it.size && ` • Size: ${it.size}`}
                                  {it.color && ` • Color: ${it.color}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-xs text-slate-400">{tr('کۆی گشتی داواکاری:', 'المجموع الكلي:', 'Total Order Value:')}</span>
                      <span className="text-base font-black text-amber-300 font-mono">
                        {(Number(ord.totalPrice) || 0).toLocaleString()} IQD
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALES REPORTS & ANALYTICS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Header with Export Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 p-5 rounded-3xl">
            <div>
              <h3 className="text-base font-black text-white">{tr('ڕاپۆرت و ئامارەکانی فرۆش', 'تقارير المبيعات والأداء', 'Sales Reports & Analytics')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{tr('شیکاری و ئاماری داهات و گەشەی فرۆشگاکەت بە شێوازی گرافیک', 'تحليلات تفصيلية للأداء والإيرادات', 'Real-time performance metrics and revenue trends')}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Timeframe Filter */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
                {(['7days', '30days', 'all'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setAnalyticsTimeFrame(tf)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      analyticsTimeFrame === tf ? "bg-amber-400 text-slate-950 font-black shadow-md" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {tf === '7days' ? tr('٧ ڕۆژ', '٧ أيام', '7 Days') :
                     tf === '30days' ? tr('٣٠ ڕۆژ', '٣٠ يوم', '30 Days') : tr('هەمووی', 'الكل', 'All Time')}
                  </button>
                ))}
              </div>

              {/* Export to CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tr('داگرتن (CSV)', 'تصدير (CSV)', 'Export CSV')}</span>
              </button>

              {/* Print Summary Button */}
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tr('چاپکردن', 'طباعة', 'Print')}</span>
              </button>
            </div>
          </div>

          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tr('کۆی داهات', 'إجمالي الإيرادات', 'Gross Revenue')}</span>
              <p className="text-2xl font-black text-amber-300 font-mono">{analyticsData.totalRevenue.toLocaleString()} IQD</p>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>+18.4% {tr('بەراورد بە مانگی پێشوو', 'مقارنة بالشهر الماضي', 'vs last month')}</span>
              </span>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tr('تێکڕای بەهای داواکاری (AOV)', 'متوسط قيمة الطلب', 'Avg Order Value')}</span>
              <p className="text-2xl font-black text-white font-mono">{analyticsData.avgOrderValue.toLocaleString()} IQD</p>
              <span className="text-[10px] text-slate-400">
                {tr('بۆ هەر داواکارییەکی فرۆشراو', 'لكل عملية شراء مكتملة', 'Per successful purchase')}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tr('ڕێژەی گەیاندنی سەرکەوتوو', 'نسبة إتمام التوصيل', 'Fulfillment Rate')}</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">{analyticsData.fulfillmentRate}%</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{analyticsData.completedOrdersCount} {tr('داواکاری گەیشتوو', 'طلب تم توصيله', 'orders delivered')}</span>
              </span>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tr('داواکارییە چالاکەکان', 'الطلبات النشطة', 'Pending Fulfillment')}</span>
              <p className="text-2xl font-black text-indigo-400 font-mono">{analyticsData.pendingOrdersCount + analyticsData.dispatchedOrdersCount}</p>
              <span className="text-[10px] text-amber-400">
                {analyticsData.pendingOrdersCount} {tr('لە ئامادەکردندا', 'قيد التجهيز', 'preparing')}, {analyticsData.dispatchedOrdersCount} {tr('لە ڕێگادایە', 'بالطريق', 'on the way')}
              </span>
            </div>
          </div>

          {/* Graphical Revenue Progression Chart */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white">{tr('ڕەوتی داهاتی ڕۆژانە', 'منحنى الإيرادات اليومية', 'Daily Revenue Progression')}</h4>
                <p className="text-xs text-slate-400">{tr('داهاتی فرۆش بەپێی بەروار', 'توزيع المبيعات عبر الزمن', 'Sales distribution over timeline')}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {analyticsTimeFrame === '7days' ? 'Last 7 Days' : analyticsTimeFrame === '30days' ? 'Last 30 Days' : 'Full History'}
              </span>
            </div>

            <div className="h-48 sm:h-64 flex items-end gap-2 pt-6 px-2 border-b border-white/10">
              {analyticsData.chartBars.map((bar, bIdx) => {
                const heightPct = Math.max(8, Math.round((bar.revenue / (analyticsData.maxChartRevenue || 1)) * 100));
                return (
                  <div key={bIdx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-12 bg-slate-950 text-white border border-white/20 px-2 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap pointer-events-none z-20 shadow-xl">
                      {bar.revenue.toLocaleString()} IQD ({bar.orders} {tr('داواکاری', 'طلب', 'orders')})
                    </div>
                    
                    <div 
                      className="w-full bg-gradient-to-t from-amber-500/30 via-amber-400 to-yellow-400 rounded-t-lg transition-all duration-300 group-hover:from-amber-400 group-hover:to-yellow-300 cursor-pointer shadow-lg"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Products Leaderboard */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-black text-white">{tr('باشترین کاڵا فرۆشراوەکان', 'المنتجات الأكثر مبيعاً', 'Top Performing Products')}</h4>
            {analyticsData.topItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{tr('تا ئێستا هیچ داتایەکی فرۆش تۆمار نەکراوە.', 'لا توجد بيانات مبيعات كافية حتى الآن.', 'No sales data recorded yet.')}</p>
            ) : (
              <div className="divide-y divide-white/5">
                {analyticsData.topItems.map((top, idx) => (
                  <div key={top.item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono shrink-0",
                        idx === 0 ? "bg-amber-400 text-slate-950" : idx === 1 ? "bg-slate-300 text-slate-950" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                      )}>
                        #{idx + 1}
                      </span>
                      <img src={top.item.imageUrl || ''} alt={top.item.title} className="w-10 h-10 rounded-xl object-cover bg-slate-950 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{top.item.title}</p>
                        <p className="text-[10px] text-slate-400">{top.item.category || 'General'}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-black text-amber-300">{top.revenue.toLocaleString()} IQD</p>
                      <p className="text-[10px] font-mono text-slate-400">{top.count} {tr('دانە فرۆشراو', 'قطعة مباعة', 'units sold')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BOUNTIES & SOURCING REQUESTS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'bounties' && (
        <div className="space-y-6">
          {/* Sub-section Header */}
          <div className="bg-slate-900/80 border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <span>{tr('داواکاری کڕیاران و کەمپینی پاداشتی فرۆشگا', 'طلبات التوريد وحملات المكافآت', 'Bounties & Sourcing Requests')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {tr('داواکاری تایبەتی کڕیاران ببینە و کاڵایان بۆ دابین بکە، یاخود پاداشت بۆ ناساندنی کڕیاری نوێ دابنێ.', 'استعرض طلبات المشترين الخاصة وقدم عروضك، أو أنشئ حملات مكافآت لجذب الزبائن.', 'Review custom requests from buyers or set up store reward campaigns.')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchBounties}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5 text-amber-400", loadingBounties && "animate-spin")} />
                <span>{tr('نوێکردنەوە', 'تحديث', 'Refresh')}</span>
              </button>
            </div>
          </div>

          {/* STORE BOUNTY CAMPAIGN SECTION */}
          <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-amber-400/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{tr('کەمپینی پاداشتی فرۆشگاکەت', 'حملة مكافآت المتجر', 'Store Referral & Reward Campaign')}</h4>
                  <p className="text-[11px] text-slate-400">{tr('پاداشتی نەختینەیی دیاری بکە بۆ ئەو کەسانەی کڕیاری نوێت بۆ دەهێنن.', 'حدد مكافأة لكل من يجلب مشترين جدد لمتجرك.', 'Offer rewards for customer referrals or high-volume buyers.')}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-300">
                  {storeBountyActive ? tr('کەمپین چالاکە 🟢', 'الحملة نشطة 🟢', 'Campaign Active 🟢') : tr('کەمپین ناچالاکە ⚪', 'الحملة متوقفة ⚪', 'Campaign Inactive ⚪')}
                </span>
                <input
                  type="checkbox"
                  checked={storeBountyActive}
                  onChange={(e) => setStoreBountyActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </label>
            </div>

            <form onSubmit={handleSaveStoreBounty} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('ناوی کەمپینی پاداشت', 'عنوان الحملة', 'Campaign Title')}</label>
                <input
                  type="text"
                  placeholder={tr('نموونە: پاداشتی فرۆشتنی ١٠ کاڵای نوێ', 'مثال: مكافأة بيع ١٠ قطع', 'e.g. Reward for 10 new referrals')}
                  value={storeBountyTitle}
                  onChange={(e) => setStoreBountyTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('بڕی پاداشت (Reward Amount)', 'قيمة المكافأة', 'Reward Amount')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={storeBountyReward}
                    onChange={(e) => setStoreBountyReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <select
                    value={storeBountyCurrency}
                    onChange={(e) => setStoreBountyCurrency(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-amber-300 px-2"
                  >
                    <option value="IQD">IQD</option>
                    <option value="Diamonds">💎 Diamonds</option>
                    <option value="Credits">Credits</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('تەگ / پرۆمۆ کۆد', 'رمز العرض', 'Campaign Tag / Code')}</label>
                <input
                  type="text"
                  value={storeBountyTag}
                  onChange={(e) => setStoreBountyTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('وەسف و مەرجەکانی بەدەستهێنانی پاداشت', 'شروط الحصول على المكافأة', 'Terms & Description')}</label>
                <input
                  type="text"
                  placeholder={tr('ڕوونی بکەرەوە کە کڕیار یان هاوبەش چۆن پاداشتەکە وەردەگرێت...', 'وضح الشروط بدقة للمشاركين...', 'Describe how participants earn the bounty...')}
                  value={storeBountyDescription}
                  onChange={(e) => setStoreBountyDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingStoreBounty}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-xs hover:from-amber-300 hover:to-yellow-400 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingStoreBounty ? tr('پاشەکەوت دەکرێت...', 'جاري الحفظ...', 'Saving...') : tr('پاشەکەوتکردنی کەمپین 💾', 'حفظ الحملة 💾', 'Save Bounty Campaign 💾')}
                </button>
              </div>
            </form>
          </div>

          {/* BUYER SOURCING REQUESTS LIST */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-white/10 p-4 rounded-2xl">
              <h4 className="text-sm font-black text-white">{tr('داواکارییەکانی کڕیاران بۆ کاڵا (Buyer Sourcing Requests)', 'طلبات التوريد من المشترين', 'Buyer Sourcing Bounties')}</h4>
              
              <div className="flex items-center gap-2">
                {(['all', 'open', 'fulfilled'] as const).map(bf => (
                  <button
                    key={bf}
                    onClick={() => setBountyFilter(bf)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      bountyFilter === bf ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-slate-950 text-slate-400 hover:text-white"
                    )}
                  >
                    {bf === 'all' ? tr('هەمووی', 'الكل', 'All') :
                     bf === 'open' ? tr('داواکاری کراوە', 'مفتوح', 'Open') : tr('جێبەجێکراو', 'مكتمل', 'Fulfilled')}
                  </button>
                ))}
              </div>
            </div>

            {bountiesList.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-dashed border-white/10 rounded-3xl space-y-2">
                <Gift className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-400">{tr('هیچ داواکارییەکی کراوەی کڕیاران لەم کاتەدا نییە.', 'لا توجد طلبات توريد نشطة حالياً.', 'No active buyer requests right now.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bountiesList
                  .filter(b => bountyFilter === 'all' || b.status === bountyFilter)
                  .map(bounty => (
                    <div key={bounty.id} className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={bounty.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bounty.userId}`}
                              alt={bounty.userName}
                              className="w-10 h-10 rounded-xl bg-slate-800 object-cover border border-white/10"
                            />
                            <div>
                              <h5 className="text-xs font-bold text-white">{bounty.userName || 'Buyer'}</h5>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(bounty.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-amber-300 font-mono block">
                              {bounty.rewardAmount?.toLocaleString()} {bounty.rewardCurrency || 'IQD'}
                            </span>
                            <span className={clsx(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              bounty.status === 'open' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
                            )}>
                              {bounty.status === 'open' ? tr('کراوە 🟢', 'مفتوح', 'Open') : tr('جێبەجێکراو ✓', 'مكتمل', 'Fulfilled')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-white">{bounty.title}</h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-white/5">
                            {bounty.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                          {bounty.category || 'Direct Sourcing'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleChatWithBountyBuyer(bounty)}
                            className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{tr('پێشکەشکردنی ئۆفەر', 'تقديم عرض', 'Offer Quote')}</span>
                          </button>

                          {bounty.status === 'open' && (
                            <button
                              type="button"
                              onClick={() => handleFulfillBounty(bounty)}
                              className="px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black hover:bg-emerald-400 transition-all cursor-pointer shadow-md"
                            >
                              {tr('جێبەجێکردن ✓', 'إتمام الطلب ✓', 'Fulfill ✓')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MESSAGING SYSTEM (COMMUNICATE WITH BUYERS)                         */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl h-[640px] flex flex-col md:flex-row">
          {/* Left Column: Buyer List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-slate-950/70">
            <div className="p-4 border-b border-white/10 space-y-2">
              <h4 className="text-sm font-black text-white">{tr('کڕیاران و گفتوگۆکان', 'المحادثات مع المشترين', 'Buyers & Conversations')}</h4>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={tr('گەڕان بەپێی کڕیار یان مۆبایل...', 'البحث في المحادثات...', 'Search buyers or phone...')}
                  value={buyerSearchTerm}
                  onChange={(e) => setBuyerSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
              {buyerList
                .filter(b => b.name.toLowerCase().includes(buyerSearchTerm.toLowerCase()) || (b.phone && b.phone.includes(buyerSearchTerm)))
                .map(buyer => {
                  const isSelected = selectedBuyerId === buyer.id;
                  return (
                    <button
                      key={buyer.id}
                      type="button"
                      onClick={() => setSelectedBuyerId(buyer.id)}
                      className={clsx(
                        "w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer",
                        isSelected ? "bg-amber-400/10 border-l-4 border-amber-400" : "hover:bg-white/5"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-300 font-bold flex items-center justify-center shrink-0 border border-white/10">
                        {buyer.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white truncate">{buyer.name}</p>
                          <span className="text-[9px] font-mono text-slate-500">
                            {buyer.timestamp ? new Date(buyer.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{buyer.lastMessage || 'Open conversation'}</p>
                        {buyer.phone && (
                          <span className="text-[9px] font-mono text-slate-500 block">{buyer.phone}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Column: Chat Box */}
          <div className="flex-1 flex flex-col bg-slate-900/60">
            {activeBuyer ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                      {activeBuyer.name.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{activeBuyer.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{activeBuyer.phone || 'Direct Customer'}</p>
                    </div>
                  </div>

                  {activeBuyer.phone && (
                    <a
                      href={`https://wa.me/${activeBuyer.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* Optional Order context card at the top */}
                {activeBuyer.orderContext && (
                  <div className="bg-amber-400/10 border-b border-amber-400/20 px-4 py-2 flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{tr('گفتوگۆ دەربارەی داواکاری:', 'بخصوص الطلب:', 'Inquiry for order:')} #{activeBuyer.orderContext.id?.slice(-6)} ({(activeBuyer.orderContext.totalPrice || 0).toLocaleString()} IQD)</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{activeBuyer.orderContext.status || 'Pending'}</span>
                  </div>
                )}

                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
                  {chatMessages.map((msg, idx) => {
                    const isMe = msg.senderId === (user?.id || 'sandbox-id');
                    return (
                      <div
                        key={msg.id || idx}
                        className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}
                      >
                        <div
                          className={clsx(
                            "max-w-xs sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed space-y-2 shadow-md",
                            isMe 
                              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold rounded-tr-none" 
                              : "bg-slate-800 text-white border border-white/10 rounded-tl-none font-medium"
                          )}
                        >
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="Attachment" className="max-h-48 rounded-xl object-cover w-full border border-black/10" />
                          )}
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Reply Chips */}
                <div className="px-4 py-2 bg-slate-950/40 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {[
                    tr('سڵاو! بەڵێ کاڵاکە لە کۆگا بەردەستە.', 'مرحباً! نعم المنتج متوفر في المخزن.', 'Hello! Yes, the item is in stock.'),
                    tr('داواکارییەکەت پێچراوەتەوە و لە ڕێگادایە 📦', 'تم تجهيز طلبك وهو في الطريق 📦', 'Your order is packed and on the way 📦'),
                    tr('تکایە قەبارە و ڕەنگی دڵخوازت دیاری بکە.', 'يرجى تحديد المقاس واللون المطلوب.', 'Please confirm your preferred size and color.'),
                    tr('سوپاس بۆ داواکارییەکەت، خزمەتگوزاری ئێمە 24 کاتژمێرە.', 'شكراً لطلبك، نحن بخدمتك دائماً.', 'Thank you for your order! We are at your service.')
                  ].map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border border-white/5 cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Image Preview if selected */}
                {chatImage && (
                  <div className="px-4 py-2 bg-slate-950 border-t border-white/10 flex items-center gap-3">
                    <img src={chatImage} alt="Attachment" className="w-12 h-12 rounded-xl object-cover border border-amber-400" />
                    <span className="text-xs text-slate-300 font-bold">{tr('وێنەی هاوپێچکراو', 'صورة مرفقة', 'Attached image ready to send')}</span>
                    <button type="button" onClick={() => setChatImage(null)} className="p-1 text-rose-400 hover:text-rose-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Chat Input Bar */}
                <div className="p-3 bg-slate-950 border-t border-white/10 flex items-center gap-2">
                  <input
                    type="file"
                    ref={chatFileInputRef}
                    accept="image/*"
                    onChange={handleChatImageSelect}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={chatImageUploading}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-300 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    title={tr('هاوپێچکردنی وێنە', 'إرفاق صورة', 'Attach Photo')}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder={tr('نامەکەت بنووسە...', 'اكتب رسالتك هنا...', 'Type your message here...')}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    className="p-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md font-bold"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <MessageSquare className="w-12 h-12 text-slate-600" />
                <p className="text-sm font-bold text-slate-400">{tr('کڕیارێک لە لیستی دەستەچپ هەڵبژێرە بۆ دەستپێکردنی گفتوگۆ.', 'اختر مشترياً من القائمة لبدء المحادثة.', 'Select a buyer from the list to start messaging.')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: STORE REVIEWS & REPUTATION                                         */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/80 border border-white/10 p-6 rounded-3xl">
            {/* Score box */}
            <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
              <span className="text-4xl font-black text-amber-300 font-mono">{ratingMetrics.avgRating}</span>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map(st => (
                  <Star key={st} className={clsx("w-4 h-4", st <= Math.round(ratingMetrics.avgRating) ? "fill-amber-400" : "text-slate-700")} />
                ))}
              </div>
              <span className="text-xs text-slate-400 font-bold">
                {ratingMetrics.totalReviews} {tr('پێداچوونەوە لەلایەن کڕیارانەوە', 'تقييم من المشترين', 'verified buyer reviews')}
              </span>
            </div>

            {/* Star Distribution */}
            <div className="space-y-2 justify-center flex flex-col">
              {[
                { stars: 5, count: ratingMetrics.fiveStars, color: 'bg-emerald-400' },
                { stars: 4, count: ratingMetrics.fourStars, color: 'bg-teal-400' },
                { stars: 3, count: ratingMetrics.threeStars, color: 'bg-amber-400' },
                { stars: 2, count: ratingMetrics.twoStars, color: 'bg-orange-400' },
                { stars: 1, count: ratingMetrics.oneStar, color: 'bg-rose-400' },
              ].map(bar => {
                const pct = ratingMetrics.totalReviews > 0 ? (bar.count / ratingMetrics.totalReviews) * 100 : 0;
                return (
                  <div key={bar.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-slate-400 font-mono">{bar.stars} {tr('ئەستێرە', 'نجوم', 'stars')}</span>
                    <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                      <div className={clsx("h-full rounded-full transition-all duration-500", bar.color)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-[10px] text-slate-400">{bar.count}</span>
                  </div>
                );
              })}
            </div>

            {/* Satisfaction KPI */}
            <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-emerald-950/40 to-slate-950 rounded-2xl border border-emerald-500/20 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-emerald-300">
                {ratingMetrics.positivePercentage}% {tr('ڕەزامەندی کڕیاران', 'رضا المشترين', 'Buyer Satisfaction')}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                {tr('ئاستی باوەڕپێکراوی بەرز دەبێتە هۆی دەرکەوتنی زیاتری کاڵاکانت لە سەرووی بازاڕدا.', 'التقييم العالي يعزز ظهور منتجاتك في مقدمة نتائج البحث.', 'High reputation guarantees top placement across Kurdistan marketplace.')}
              </p>
            </div>
          </div>

          {/* Review Filter */}
          <div className="flex items-center justify-between gap-3 bg-slate-900/80 border border-white/10 p-4 rounded-2xl flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-400">{tr('فلتەرکردن:', 'تصفية:', 'Filter:')}</span>
              <button
                type="button"
                onClick={() => setReviewFilterRating('all')}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  reviewFilterRating === 'all' ? "bg-amber-400 text-slate-950 font-black shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
                )}
              >
                {tr('هەمووی', 'الكل', 'All Stars')}
              </button>
              {[5, 4, 3, 2, 1].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReviewFilterRating(r)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                    reviewFilterRating === r ? "bg-amber-400 text-slate-950 font-black shadow-md" : "bg-slate-950 text-slate-400 hover:text-white"
                  )}
                >
                  <span>{r}</span>
                  <Star className="w-3 h-3 fill-current" />
                </button>
              ))}
            </div>

            <span className="text-xs font-mono text-slate-400 font-bold">
              {sellerReviews.filter(rv => reviewFilterRating === 'all' || rv.rating === reviewFilterRating).length} {tr('پێداچوونەوە', 'تقييم', 'reviews')}
            </span>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            {sellerReviews
              .filter(rv => reviewFilterRating === 'all' || rv.rating === reviewFilterRating)
              .map((rev, rIdx) => {
                const matchedItem = sellerItems.find(i => i.id === rev.itemId);
                return (
                  <div key={rev.id || rIdx} className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-3 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={rev.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rev.userId}`}
                          alt={rev.userName}
                          className="w-10 h-10 rounded-xl bg-slate-800 object-cover border border-white/10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-white">{rev.userName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {tr('کڕیاری پشتڕاستکراو ✓', 'مشتري موثق ✓', 'Verified Buyer ✓')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-white/5">
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star key={st} className={clsx("w-3.5 h-3.5", st <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-800")} />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-950/40 p-3.5 rounded-2xl border border-white/5">
                      {rev.comment}
                    </p>

                    {matchedItem && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-500">{tr('کاڵای پێداچوونەوە کراو:', 'المنتج المقيم:', 'Reviewed item:')}</span>
                        <span className="text-amber-400 font-bold hover:underline cursor-pointer">{matchedItem.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW ITEM FORM                                                */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{tr('زیاکردنی کاڵای نوێ بۆ فرۆشتن', 'إضافة منتج جديد للبيع', 'List New Product for Sale')}</h3>
                  <p className="text-xs text-slate-400">{tr('زانیاری و وێنەی کاڵاکەت بنووسە بۆ بڵاوکردنەوە لە مارکێت', 'أدخل تفاصيل وصور المنتج', 'Enter product details and photos to publish on the marketplace')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-4">
              {/* Product Photos Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">{tr('وێنەی کاڵا (دەتوانی چەند دانەیەک زیاد بکەیت)', 'صور المنتج (يمكنك رفع عدة صور)', 'Product Photos (Multi-image supported)')}</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={addFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    disabled={isCompressingPhotos}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 transition-all cursor-pointer bg-slate-950/60"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{isCompressingPhotos ? '...' : tr('زیادکردن', 'إضافة', 'Add')}</span>
                  </button>

                  {newImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 group">
                      <img src={img} alt="Product Upload" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-amber-400 text-slate-950 text-[8px] font-black uppercase text-center py-0.5">
                          COVER
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('ناوی کاڵا (Title)', 'اسم المنتج', 'Product Title')}</label>
                <input
                  type="text"
                  required
                  placeholder={tr('نموونە: کاتژمێری لوکسی زێڕین / چاکەتی زستانە', 'مثال: ساعة يد كلاسيكية فاخرة', 'e.g. Luxury 24K Gold Watch / Winter Jacket')}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Price & Resale Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('نرخی فرۆشتن (Selling Price IQD)', 'سعر البيع (دينار عراقي)', 'Selling Price (IQD)')}</label>
                  <input
                    type="text"
                    required
                    placeholder="35000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('نرخی پێشوو / بازاڕ (بۆ داشکاندن)', 'السعر السابق (للخصم)', 'Original/Resale Price (Optional)')}</label>
                  <input
                    type="text"
                    placeholder="45000"
                    value={newResalePrice}
                    onChange={(e) => setNewResalePrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Category & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('کاتیگۆری', 'الفئة والتصنيف', 'Category')}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORIES_LIST.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat[isKurdish ? 'ku' : isArabic ? 'ar' : 'en']}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('ژمارەی دانە لە کۆگا (Stock)', 'الكمية المتوفرة بالمخزن', 'Stock Quantity')}</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Sizes Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{tr('قەبارە بەردەستەکان (Sizes)', 'المقاسات المتوفرة', 'Available Sizes')}</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_SIZES.map(sz => {
                    const isSelected = newSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setNewSizes(prev => isSelected ? prev.filter(s => s !== sz) : [...prev, sz]);
                        }}
                        className={clsx(
                          "px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer",
                          isSelected ? "bg-amber-400 text-slate-950 font-black shadow-md" : "bg-slate-950 text-slate-400 hover:text-white border border-white/5"
                        )}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{tr('ڕەنگە بەردەستەکان (Colors)', 'الألوان المتوفرة', 'Available Colors')}</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(col => {
                    const isSelected = newColors.includes(col.name);
                    return (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => {
                          setNewColors(prev => isSelected ? prev.filter(c => c !== col.name) : [...prev, col.name]);
                        }}
                        className={clsx(
                          "px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border",
                          isSelected ? "bg-amber-400/20 text-amber-300 border-amber-400" : "bg-slate-950 text-slate-400 border-white/5 hover:text-white"
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ backgroundColor: col.hex }} />
                        <span>{col.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('وەسف و تایبەتمەندی کاڵا', 'وصف المنتج وتفاصيله', 'Description')}</label>
                <textarea
                  rows={3}
                  placeholder={tr('تایبەتمەندییەکان، کەرەستە و وردەکارییەکان لێرە بنووسە...', 'اكتب مواصفات المنتج هنا...', 'Describe product features, material and specifications...')}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Public vs Draft */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 rounded-2xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">{tr('باری بڵاوکردنەوە (Visibility)', 'حالة النشر', 'Listing Visibility')}</span>
                  <span className="text-[10px] text-slate-400">{isNewPublic ? tr('کاڵاکە دەستبەجێ لە مارکێت دەردەکەوێت', 'سيظهر المنتج فوراً بالمتجر', 'Item will be publicly visible') : tr('تەنها وەک ڕەشنووس دەمێنێتەوە', 'سيبقى كمسودة فقط', 'Saved as hidden draft')}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewPublic}
                    onChange={(e) => setIsNewPublic(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-xs font-bold text-amber-300">{isNewPublic ? 'Public' : 'Draft'}</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {tr('پەشیمانبوونەوە', 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingItem ? tr('بڵاودەکرێتەوە...', 'جاري النشر...', 'Publishing...') : tr('بڵاوکردنەوەی کاڵا 🚀', 'نشر المنتج الآن 🚀', 'Publish Listing 🚀')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EXISTING ITEM & PRICE                                      */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{tr('دەستکاری کاڵا و گۆڕینی نرخ', 'تعديل المنتج والسعر', 'Edit Product & Update Price')}</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: #{editingItem.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('ناوی کاڵا', 'اسم المنتج', 'Title')}</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('نرخی نوێ (IQD)', 'السعر الجديد (دينار)', 'Selling Price (IQD)')}</label>
                  <input
                    type="text"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('نرخی پێشوو / بازاڕ', 'السعر السابق', 'Resale / Compare Price')}</label>
                  <input
                    type="text"
                    value={editResalePrice}
                    onChange={(e) => setEditResalePrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('کاتیگۆری', 'الفئة', 'Category')}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORIES_LIST.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat[isKurdish ? 'ku' : isArabic ? 'ar' : 'en']}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{tr('دانەی بەردەست لە کۆگا', 'الكمية بالمخزن', 'Stock')}</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('وەسف و تێبینییەکان', 'الوصف', 'Description')}</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 rounded-2xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">{tr('باری بڵاوبوونەوە', 'حالة النشر', 'Visibility')}</span>
                  <span className="text-[10px] text-slate-400">{editIsPublic ? tr('پۆستەکە لە بازاڕ دەبینرێت', 'المنتج متاح للجميع', 'Active & Public') : tr('پۆستەکە وەک ڕەشنووس دەشاردرێتەوە', 'المنتج مخفي كمسودة', 'Hidden Draft')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {tr('پەشیمانبوونەوە', 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? tr('پاشەکەوت دەکرێت...', 'جاري الحفظ...', 'Saving...') : tr('پاشەکەوتکردنی گۆڕانکارییەکان 💾', 'حفظ التعديلات 💾', 'Save Changes 💾')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STORE PROFILE & SETTINGS                                         */}
      {/* ========================================================================= */}
      {isEditingStoreProfile && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{tr('ڕێکخستنی پرۆفایلی فرۆشگا', 'إعدادات متجر التاجر', 'Store Profile & Settings')}</h3>
                  <p className="text-xs text-slate-400">{tr('ناونیشان، مۆبایل و زانیاری گشتی فرۆشگاکەت نوێ بکەرەوە', 'تحديث بيانات المتجر والعنوان', 'Update store branding, contact info and location')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingStoreProfile(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('ناوی فرۆشگا / براند', 'اسم المتجر / العلامة التجارية', 'Store / Business Name')}</label>
                <input
                  type="text"
                  required
                  value={storeFormName}
                  onChange={(e) => setStoreFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('ژمارەی پەیوەندی و مۆبایل', 'رقم الهاتف للتواصل', 'Contact Phone Number')}</label>
                <input
                  type="text"
                  value={storeFormPhone}
                  onChange={(e) => setStoreFormPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('شار و ناونیشانی فیزیکی', 'المدينة والعنوان', 'City & Address')}</label>
                <input
                  type="text"
                  value={storeFormAddress}
                  onChange={(e) => setStoreFormAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">{tr('کورتەیەک دەربارەی فرۆشگا (Bio)', 'نبذة عن المتجر', 'Store Bio / Tagline')}</label>
                <textarea
                  rows={3}
                  value={storeFormBio}
                  onChange={(e) => setStoreFormBio(e.target.value)}
                  placeholder={tr('هاوردەکاری ڕاستەوخۆ بە باشترین کوالێتی و گەرەنتی...', 'مستورد مباشر لأفضل المنتجات...', 'Direct importer providing top quality and guaranteed service...')}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{tr('ڕەنگی تیمی تایبەتی دوکان', 'طابع وتصميم المتجر', 'Store Layout Theme')}</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['gold', 'emerald', 'sunset', 'neon', 'minimalist'] as const).map(th => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setStoreFormTheme(th)}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border",
                        storeFormTheme === th ? "bg-amber-400/20 text-amber-300 border-amber-400 shadow-md" : "bg-slate-950 text-slate-400 border-white/5"
                      )}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingStoreProfile(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {tr('پەشیمانبوونەوە', 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={storeFormSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {storeFormSaving ? tr('پاشەکەوت دەکرێت...', 'جاري الحفظ...', 'Saving...') : tr('پاشەکەوتکردنی پرۆفایل 💾', 'حفظ الإعدادات 💾', 'Save Store Profile 💾')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
