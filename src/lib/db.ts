import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocFromServer,
  onSnapshot,
  writeBatch,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { compressBase64Image } from './imageCompressor';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Validate Connection to Firestore on initial boot
async function testConnection() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  try {
    const testDocRef = doc(firestore, 'test', 'connection');
    await getDocFromServer(testDocRef);
  } catch (error) {
    // Gracefully ignore expected initial handshake / offline status
  }
}
// Run connection check non-blocking after initial hydration
setTimeout(() => {
  testConnection().catch(() => {});
}, 2500);

export interface Order {
  id: string;
  userId: string;
  items: BasketItem[];
  total: number;
  status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  shippingCity: string;
  customerName: string;
  customerPhone: string;
  trackingNumber?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  courierName?: string;
  courierPhone?: string;
  estimatedDelivery?: string;
}

export interface LiveComment {
  id: string;
  sessionId: string;
  broadcasterId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: number;
}

export interface LiveSession {
  id: string;
  broadcasterId: string;
  broadcasterName: string;
  broadcasterAvatar?: string;
  status: 'live' | 'ended';
  viewerCount: number;
  pinnedProductId?: string;
  featuredTitle?: string;
  featuredPrice?: number;
  featuredImage?: string;
  currentFrame?: string;
  lastHeartbeat?: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  retentionHours?: number;
  retentionDays?: number;
  expiresAt?: number;
  location?: string;
  city?: string;
  gpsVerified?: boolean;
  isReplay?: boolean;
  isDemo?: boolean;
  savedByStreamer?: boolean;
  title?: string;
  videoUrl?: string;
  streamUrl?: string;
  broadcasterPhone?: string;
  sellerPhone?: string;
}

export interface LiveReport {
  id: string;
  sessionId: string;
  sessionTitle: string;
  broadcasterId: string;
  broadcasterName: string;
  broadcasterAvatar?: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserPhone?: string;
  reason: string;
  details?: string;
  createdAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
  type?: 'live_stream';
}

export interface ItemReport {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage?: string;
  sellerId: string;
  sellerName: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserPhone?: string;
  reason: string;
  details?: string;
  createdAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
  type: 'marketplace_item';
}

export interface UserStrike {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  level: 1 | 2 | 3;
  reason: string;
  message: string;
  issuedByAdminEmail?: string;
  createdAt: number;
  status: 'active' | 'appealed' | 'pardoned' | 'expired';
}

export interface AdminActivityLog {
  id: string;
  action: string;
  type: 'strike' | 'ban' | 'unban' | 'delete_item' | 'terminate_stream' | 'verify' | 'unverify' | 'security' | 'delete_user' | 'warning' | 'badge' | 'perfect_seller';
  targetId?: string;
  targetName?: string;
  details?: string;
  adminEmail?: string;
  createdAt: number;
}

export interface LoyaltyPointTransaction {
  id: string;
  orderId?: string;
  amount: number; // positive = earned, negative = redeemed
  type: 'earned' | 'redeemed' | 'bonus';
  description: string;
  descriptionKu?: string;
  descriptionAr?: string;
  discountIqd?: number;
  createdAt: number;
}

export interface AdminRewardGrant {
  id: string;
  amount: number;
  currency: 'IQD' | 'USD' | 'POINTS';
  reason: string;
  grantedAt: number;
  grantedByAdminEmail?: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  email: string;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  category?: string;
  isPublic?: boolean;
  showPhoneToPublic?: boolean;
  role?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  verifiedAt?: number;
  isPerfectSeller?: boolean;
  perfectSellerAt?: number;
  isTrustedSeller?: boolean;
  trustedSellerAt?: number;
  trustedSealTitle?: string;
  adminRewards?: AdminRewardGrant[];
  businessName?: string;
  broadcastRetentionDays?: number;
  loyaltyPoints?: number;
  pointsHistory?: LoyaltyPointTransaction[];
}

export interface InvoiceItem {
  id?: string;
  name: string;
  quantity: number;
  unitType?: 'piece' | 'box' | 'pack' | 'kg' | 'set' | 'ton';
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface AccountingTransaction {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'debt' | 'payment_voucher' | 'receipt_voucher';
  title: string;
  amount: number; // in IQD
  amountUsd?: number;
  currency?: 'IQD' | 'USD';
  exchangeRate?: number;
  category: string;
  date: string; // ISO string YYYY-MM-DD
  createdAt: number;
  note?: string;
  customerName?: string;
  customerPhone?: string;
  partnerMerchantId?: string;
  partnerType?: 'supplier' | 'wholesaler' | 'retailer' | 'distributor' | 'factory' | 'customer';
  status?: 'paid' | 'unpaid' | 'partial';
  
  // Retail / Wholesale Specifics
  saleMode?: 'retail' | 'wholesale' | 'b2b';
  items?: InvoiceItem[];
  quantity?: number;
  unitType?: 'piece' | 'box' | 'pack' | 'kg' | 'set' | 'ton';
  unitPrice?: number;
  discount?: number;
  shippingFee?: number;
  paymentType?: 'full_cash' | 'partial' | 'full_debt';
  paidAmount?: number;
  remainingDebt?: number;
  invoiceNumber?: string;
  direction?: 'incoming' | 'outgoing';
}

export interface Ad {
  id: string;
  imageUrl: string;
  link?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  recipientId: string;
  text: string;
  imageUrl?: string;
  itemId?: string;
  itemTitle?: string;
  itemImage?: string;
  itemPrice?: number;
  senderName?: string;
  senderAvatar?: string;
  recipientName?: string;
  recipientAvatar?: string;
  read?: boolean;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: {
    [userId: string]: {
      name: string;
      avatar?: string;
      role?: 'buyer' | 'seller';
      phone?: string;
    };
  };
  lastMessage: string;
  lastMessageTime: number;
  lastSenderId: string;
  unreadCount?: {
    [userId: string]: number;
  };
  itemId?: string;
  itemTitle?: string;
  itemImage?: string;
  itemPrice?: number;
  updatedAt: number;
}

export interface Variant {
  name: string;
  options: string[];
}

export interface Analytics {
  views: number;
  uniqueVisitors: number;
  sales: number;
  revenue: number;
}

export interface Bounty {
  active: boolean;
  title: string;
  description: string;
  rewardPool: number;
  currency: 'USD' | 'Diamonds' | 'Credits';
  deadline?: number;
  createdAt?: number;
  tag?: string;
}

export interface SourcingBounty {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  description: string;
  rewardAmount: number;
  rewardCurrency: string;
  category: string;
  status: 'open' | 'fulfilled' | 'closed';
  fulfilledBy?: string;
  fulfilledAt?: number;
  createdAt: number;
}

export interface SellerProfile {
  id: string;
  uid?: string;
  businessName: string;
  contactPhone?: string;
  logoUrl?: string;
  logo?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  bounty?: Bounty;
  address?: string;
  location?: string;
  storeTheme?: 'gold' | 'neon' | 'sunset' | 'emerald' | 'minimalist';
  welcomeMessage?: string;
  storeFeature?: string;
  storeLayout?: 'grid' | 'list';
  reputation?: {
    score: number;
    avgRating: number;
    totalReviewsCount: number;
    completedTransactions: number;
    totalRevenue: number;
    badges: {
      id: string;
      name: string;
      nameKu?: string;
      description: string;
      descriptionKu?: string;
      icon: string;
      color: string;
    }[];
    updatedAt: number;
  };
  followers?: string[];
  isVerified?: boolean;
  verifiedAt?: number;
  isPerfectSeller?: boolean;
  perfectSellerAt?: number;
  isTrustedSeller?: boolean;
  trustedSellerAt?: number;
  trustedSealTitle?: string;
  adminRewards?: AdminRewardGrant[];
  adminRewardsCount?: number;
}

export interface MarketplaceItem {
  id: string;
  userId: string;
  sellerId?: string;
  userName: string;
  userAvatar?: string;
  isVerified?: boolean;
  userVerified?: boolean;
  isPerfectSeller?: boolean;
  userPerfectSeller?: boolean;
  isTrustedSeller?: boolean;
  userTrustedSeller?: boolean;
  trustedSellerAt?: number;
  trustedSealTitle?: string;
  title: string;
  description: string;
  price: number;
  shippingPrice?: number;
  sellerPhone?: string;
  imageUrl: string;
  imageUrls?: string[];
  videoUrl?: string;
  audioUrl?: string;
  audioMetadata?: {
    title: string;
    artist?: string;
  };
  category: string;
  location?: string;
  sizes?: string[];
  colors?: string[];
  createdAt: number;
  weight?: string;
  rating?: number;
  reviewCount?: number;
  isPublic?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  likes?: string[];
  saves?: string[];
  priceWatchers?: string[];
  resalePrice?: number;
  discountPrice?: number;
  discountPercent?: number;
  showResalePriceToPublic?: boolean;
  postType: 'marketplace' | 'sourcing';
  productKind?: string;
  analytics?: Analytics;
  customFields?: Record<string, any>;
  features?: string[];
  variants?: Variant[];
  isLive?: boolean;
  viewerCount?: number;
  lastBumpedAt?: number;
  last_bumped_at?: number;
  bumpCount?: number;
  bump_count?: number;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  stock_status?: boolean;
  stockQuantity?: number;
  bumpCooldownUntil?: number;
  isBoosted?: boolean;
  boostExpiresAt?: number;
  governorate?: string;
  reachScore?: number;
  isFeatured?: boolean;
  sourceCode?: string;
  priceHistory?: { date: string; timestamp: number; price: number; resalePrice?: number }[];
}

export interface StoryComment {
  id: string;
  storyId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: number;
}

export interface DailyStory {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  sellerPhone?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: number;
  expiresAt: number;
  views?: string[];
  likes?: string[];
  comments?: StoryComment[];
  product?: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
    sourceCode?: string;
    sellerPhone?: string;
  };
}

export interface PriceUpdateNotification {
  id: string;
  userId: string;
  itemId: string;
  itemTitle: string;
  itemImageUrl?: string;
  oldPrice: number;
  newPrice: number;
  sellerId: string;
  sellerName?: string;
  createdAt: number;
  read: boolean;
  type: 'price_update' | 'new_product' | 'general' | 'story_comment' | 'admin_warning' | 'admin_notice';
  message?: string;
  strikeLevel?: 1 | 2 | 3;
  warningReason?: string;
  actionRequired?: string;
  isPriceWatch?: boolean;
  dropPercentage?: number;
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  imageUrl?: string;
  createdAt: number;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  tags?: string[];
  verifiedBuyer?: boolean;
  createdAt: number;
}

export interface BasketItem {
  id: string;
  userId: string;
  itemId: string;
  title: string;
  price: number;
  imageUrl: string;
  size?: string;
  color?: string;
  availableSizes?: string[];
  availableColors?: string[];
  resalePrice?: number;
  quantity: number;
  shippingPrice?: number;
  sellerId: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerAddress?: string;
}

export interface SharedCartItem {
  id: string;
  itemId: string;
  title: string;
  price: number;
  imageUrl: string;
  size?: string;
  color?: string;
  quantity: number;
  addedByUserId: string;
  addedByUserName: string;
  addedAt: number;
  sellerId?: string;
  sellerName?: string;
  sellerPhone?: string;
}

export interface SharedCart {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhone?: string;
  title?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryNotes?: string;
  addressConfirmedByOwner?: boolean;
  addressConfirmedAt?: number;
  items: SharedCartItem[];
  status: 'active' | 'ordered' | 'archived';
  orderId?: string;
  createdAt: number;
  updatedAt: number;
  payerId?: string;
  payerName?: string;
}

export interface GiftContribution {
  id: string;
  contributorName: string;
  contributorPhone?: string;
  amount: number; // IQD
  message?: string;
  paymentMethod: 'fastpay' | 'fib' | 'zaincash' | 'cod_pledge' | 'wallet';
  paymentStatus: 'confirmed' | 'pending';
  createdAt: number;
  avatarUrl?: string;
}

export interface GiftCrowdfundPool {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number; // in IQD
  productImage: string;
  shippingFee: number; // in IQD (e.g. 4000)
  targetAmount: number; // productPrice + shippingFee
  currentAmount: number; // sum of contributions
  creatorId: string;
  creatorName: string;
  creatorPhone?: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientAddress: string;
  occasionTitle?: string;
  customNote?: string;
  selectedSize?: string;
  selectedColor?: string;
  status: 'active' | 'fully_funded' | 'completed' | 'cancelled';
  contributions: GiftContribution[];
  createdAt: number;
  completedAt?: number;
  orderId?: string;
  sellerId?: string;
  sellerName?: string;
}

// Initial Seeds - E-BAZIRGAN Direct Primary Account 07501222253
export const DEFAULT_ADMIN_USER: User = {
  id: 'admin-07501222253',
  name: 'E-BAZIRGAN Direct',
  username: 'e-bazirgan_direct',
  bio: 'هەژماری فەرمی E-BAZIRGAN Direct | هەژماری سەرەکی بەڕێوەبەرایەتی 07501222253',
  email: 'afsun2026app@gmail.com',
  phone: '07501222253',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=e-bazirgan_direct_07501222253',
  role: 'admin',
  isAdmin: true,
  isVerified: true,
  isPublic: true,
  showPhoneToPublic: true,
  city: 'Erbil',
  address: 'E-BAZIRGAN Head Office, Erbil, Kurdistan'
};

const DEFAULT_USER: User = DEFAULT_ADMIN_USER;

export function checkIsAdmin(user: any): boolean {
  if (!user) return false;

  const email = (user.email || '').trim().toLowerCase();
  const rawPhone = (user.phone || user.phoneNumber || user.contactPhone || '').toString().trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');
  const userId = (user.id || '').toString();

  // List of authorized admin phone numbers
  const ADMIN_PHONES = [
    '07501222253', '7501222253', '9647501222253', '+9647501222253',
    '07746573763', '7746573763', '9647746573763', '+9647746573763'
  ];

  // Check if phone or ID matches any authorized admin credential
  const isAuthorizedPhone = ADMIN_PHONES.some(p => {
    const cleanP = p.replace(/\D/g, '');
    return rawPhone.includes(p) || (phoneDigits.length >= 7 && (phoneDigits.endsWith(cleanP) || cleanP.endsWith(phoneDigits)));
  });

  let isAdminUser = false;

  if (isAuthorizedPhone || userId === 'admin-07501222253' || email === 'afsun2026app@gmail.com') {
    isAdminUser = true;
  } else if (user.role === 'admin' || user.isAdmin === true) {
    isAdminUser = true;
  } else {
    try {
      const envAdmin = ((import.meta as any).env?.VITE_ADMIN_EMAILS || '').toLowerCase();
      if (envAdmin) {
        const allowed = envAdmin.split(',').map((e: string) => e.trim());
        if (allowed.includes(email) || allowed.some(a => phoneDigits && a.includes(phoneDigits))) {
          isAdminUser = true;
        }
      }
    } catch (e) {}
  }

  if (isAdminUser) {
    user.role = 'admin';
    user.isAdmin = true;
  }

  return isAdminUser;
}

const DEFAULT_SELLERS: SellerProfile[] = [];

const DEFAULT_ITEMS: MarketplaceItem[] = [];

const DEFAULT_REVIEWS: Review[] = [];

// Central Brand Name Sanitizer - ensures legacy "VAÇAR", "Vacar", "ڤاچار", "Payv" are always converted to "E-BAZIRGAN" / "ئی بازرگان"
export function sanitizeBrandName(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Replace VAÇAR direct / Vacar Direct variants
    .replace(/VA[ÇCçc]AR\s*direct'?s?\s*Boutique/gi, 'E-BAZIRGAN Direct')
    .replace(/VA[ÇCçc]AR\s*direct/gi, 'E-BAZIRGAN Direct')
    .replace(/VA[ÇCçc]AR\s*Direct/g, 'E-BAZIRGAN Direct')
    .replace(/ڤاچار\s*دایرێکت/g, 'ئی بازرگان دایرێکت')
    .replace(/ڤاچار\s*ڕاستەوخۆ/g, 'ئی بازرگان دایرێکت')
    .replace(/VA[ÇCçc]AR/g, 'E-BAZIRGAN')
    .replace(/va[çc]ar/gi, 'E-BAZIRGAN')
    .replace(/ڤاچار/g, 'ئی بازرگان')
    .replace(/Vajar/gi, 'E-BAZIRGAN')
    .replace(/Vazar/gi, 'E-BAZIRGAN')
    .replace(/Payv\s*Direct/gi, 'E-BAZIRGAN Direct')
    .replace(/Payv/gi, 'E-BAZIRGAN');
}

export function sanitizeObjectBrands<T>(data: T): T {
  if (!data) return data;
  if (typeof data === 'string') {
    return sanitizeBrandName(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeObjectBrands(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const res: any = {};
    for (const key of Object.keys(data as any)) {
      const val = (data as any)[key];
      if (typeof val === 'string' && (
        key.toLowerCase().includes('name') || 
        key.toLowerCase().includes('title') || 
        key.toLowerCase().includes('shop') || 
        key.toLowerCase().includes('business') || 
        key.toLowerCase().includes('bio') || 
        key.toLowerCase().includes('welcome') || 
        key.toLowerCase().includes('brand') ||
        key.toLowerCase().includes('store') ||
        key.toLowerCase().includes('seller')
      )) {
        res[key] = sanitizeBrandName(val);
      } else if (typeof val === 'object' && val !== null) {
        res[key] = sanitizeObjectBrands(val);
      } else {
        res[key] = val;
      }
    }
    return res as T;
  }
  return data;
}

// In-memory cache to guarantee instant reactivity across all sessions
const inMemoryStorage: Record<string, any> = {};

// Local state retrieval and storage
const getStored = <T>(key: string, defaults: T): T => {
  if (inMemoryStorage[key] !== undefined) {
    return sanitizeObjectBrands(inMemoryStorage[key]);
  }
  const data = localStorage.getItem(`payv_${key}`);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const sanitized = sanitizeObjectBrands(parsed);
      inMemoryStorage[key] = sanitized;
      return sanitized;
    } catch (_) {
      return defaults;
    }
  }
  return defaults;
};

export const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250";

const setStored = <T>(key: string, value: T) => {
  const sanitized = sanitizeObjectBrands(value);
  inMemoryStorage[key] = sanitized;
  try {
    localStorage.setItem(`payv_${key}`, JSON.stringify(sanitized));
  } catch (e) {
    console.warn(`localStorage.setItem failed for key payv_${key} (handling quota safely):`, e);
    try {
      if (Array.isArray(sanitized) && key === 'marketplace_items') {
        // Keep most recent items to avoid quota blowout
        const trimmed = (sanitized as any[]).slice(0, 30).map(item => ({
          ...item,
          imageUrls: (item.imageUrls || []).slice(0, 2)
        }));
        localStorage.setItem(`payv_${key}`, JSON.stringify(trimmed));
      } else {
        localStorage.setItem(`payv_${key}`, JSON.stringify(sanitized));
      }
    } catch (_) {
      // In-memory cache continues to serve the data safely
    }
  }
};

const cleanData = (data: any) => {
  const sanitized = sanitizeObjectBrands(data);
  const cleaned = { ...sanitized };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    } else if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
      cleaned[key] = cleanData(cleaned[key]);
    }
  });
  return cleaned;
};

export function normalizePhoneKey(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  let core = digits;
  if (core.startsWith('00964')) core = core.slice(5);
  else if (core.startsWith('964')) core = core.slice(3);
  else if (core.startsWith('07')) core = core.slice(1);
  return core;
}

export function isSamePhoneNumber(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const keyA = normalizePhoneKey(phoneA);
  const keyB = normalizePhoneKey(phoneB);
  if (!keyA || !keyB) return false;
  if (keyA === keyB) return true;
  if (keyA.length >= 8 && keyB.length >= 8) {
    return keyA.endsWith(keyB.slice(-8)) || keyB.endsWith(keyA.slice(-8));
  }
  return false;
}

export const db = {
  sanitizeBrandName,
  sanitizeObjectBrands,
  normalizePhoneKey,
  isSamePhoneNumber,
  getActiveUserCount: async (): Promise<number> => {
    try {
      const q = query(collection(firestore, 'users'));
      const snapshot = await getDocs(q);
      return snapshot.size || 1;
    } catch (e) {
      console.warn("Firestore getActiveUserCount failed, falling back to local simulation:", e);
      return 1;
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const q = query(collection(firestore, 'users'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const users: User[] = [];
        const seenPhones = new Set<string>();
        const seenIds = new Set<string>();

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const cleanPhone = (data.phone || '').replace(/\D/g, '');
          const id = data.id || docSnap.id;

          // Deduplicate if identical phone already processed
          if (cleanPhone && cleanPhone.length >= 7) {
            if (seenPhones.has(cleanPhone)) return;
            seenPhones.add(cleanPhone);
          } else {
            if (seenIds.has(id) || seenIds.has(docSnap.id)) return;
            seenIds.add(id);
            seenIds.add(docSnap.id);
          }

          const u = {
            ...data,
            id,
            docId: docSnap.id,
          } as User & { docId?: string };

          if (checkIsAdmin(u)) {
            u.role = 'admin';
            u.isAdmin = true;
          }
          users.push(u);
        });

        if (users.length > 0) {
          setStored('users', users);
          return users;
        }
      }
    } catch (e) {
      console.warn("Firestore getUsers failed, falling back to localStorage:", e);
    }
    const users = getStored<User[]>('users', [DEFAULT_ADMIN_USER]);
    users.forEach(u => {
      if (checkIsAdmin(u)) {
        u.role = 'admin';
        u.isAdmin = true;
      }
    });
    return users;
  },

  getUserById: async (userId: string): Promise<User | null> => {
    try {
      const docSnap = await getDoc(doc(firestore, 'users', userId));
      if (docSnap.exists()) {
        const u = { id: docSnap.id, ...docSnap.data() } as User;
        if (checkIsAdmin(u)) {
          u.role = 'admin';
          u.isAdmin = true;
        }
        return u;
      }
    } catch (e) {
      console.warn("Firestore getUserById failed:", e);
    }
    const users = await db.getUsers();
    const found = users.find(u => u.id === userId) || null;
    if (found && checkIsAdmin(found)) {
      found.role = 'admin';
      found.isAdmin = true;
    }
    return found;
  },

  findUserByPhone: async (phoneInput: string, excludeUserId?: string): Promise<User | null> => {
    if (!phoneInput) return null;
    const cleanDigits = phoneInput.replace(/\D/g, '');
    if (!cleanDigits) return null;

    try {
      const users = await db.getUsers();
      const matched = users.find(u => {
        if (excludeUserId && u.id === excludeUserId) return false;
        return isSamePhoneNumber(u.phone, phoneInput);
      });
      if (matched) return matched;
    } catch (e) {
      console.warn("Firestore findUserByPhone failed:", e);
    }

    const localUsers = getStored<User[]>('users', []);
    const localMatched = localUsers.find(u => {
      if (excludeUserId && u.id === excludeUserId) return false;
      return isSamePhoneNumber(u.phone, phoneInput);
    });

    return localMatched || null;
  },

  checkPhoneRegistered: async (phoneInput: string, excludeUserId?: string): Promise<{ isRegistered: boolean; existingUser: User | null }> => {
    const existing = await db.findUserByPhone(phoneInput, excludeUserId);
    return {
      isRegistered: !!existing,
      existingUser: existing
    };
  },
  
  updateUser: async (targetUser: User): Promise<void> => {
    if (checkIsAdmin(targetUser)) {
      targetUser.role = 'admin';
      targetUser.isAdmin = true;
    }

    const users = getStored<User[]>('users', []);
    const idx = users.findIndex(u => u.id === targetUser.id);
    if (idx >= 0) {
      users[idx] = targetUser;
    } else {
      users.push(targetUser);
    }
    setStored('users', users);

    // If verified or perfect seller status changed, sync to seller profile and local items
    if (targetUser.isVerified !== undefined || targetUser.isPerfectSeller !== undefined) {
      try {
        const sellers = getStored<SellerProfile[]>('seller_profiles_v2', DEFAULT_SELLERS);
        const sIdx = sellers.findIndex(s => s.id === targetUser.id || s.uid === targetUser.id);
        if (sIdx !== -1) {
          if (targetUser.isVerified !== undefined) sellers[sIdx].isVerified = targetUser.isVerified;
          if (targetUser.isPerfectSeller !== undefined) sellers[sIdx].isPerfectSeller = targetUser.isPerfectSeller;
          setStored('seller_profiles_v2', sellers);
        }
        const patch: any = {};
        if (targetUser.isVerified !== undefined) {
          patch.isVerified = targetUser.isVerified;
          patch.verifiedAt = Date.now();
        }
        if (targetUser.isPerfectSeller !== undefined) {
          patch.isPerfectSeller = targetUser.isPerfectSeller;
          patch.perfectSellerAt = Date.now();
        }
        await setDoc(doc(firestore, 'seller_profiles', targetUser.id), patch, { merge: true }).catch(() => {});
      } catch (_) {}
    }

    // Sync active cached user if target matches
    const cached = getStored<any>('payv_cached_user', null);
    if (cached && (cached.id === targetUser.id || cached.phone === targetUser.phone)) {
      setStored('payv_cached_user', { ...cached, ...targetUser });
    }

    try {
      await setDoc(doc(firestore, 'users', targetUser.id), cleanData(targetUser), { merge: true });
    } catch (e) {
      console.warn("Firestore updateUser failed:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: targetUser }));
    }
  },

  /**
   * Calculates loyalty points earned from an order amount in IQD.
   * Standard rate: 1 Point per 1,000 IQD.
   */
  calculatePointsEarned: (totalIqd: number): number => {
    if (!totalIqd || totalIqd <= 0) return 0;
    return Math.floor(totalIqd / 1000);
  },

  /**
   * Converts loyalty points to an IQD discount amount.
   * Standard rate: 1 Point = 100 IQD discount (10 Points = 1,000 IQD discount).
   */
  calculatePointsDiscount: (points: number): number => {
    if (!points || points <= 0) return 0;
    return Math.floor(points) * 100;
  },

  /**
   * Calculates loyalty tier based on accumulated/current points.
   */
  getLoyaltyTier: (points: number = 0) => {
    if (points >= 1000) {
      return {
        id: 'platinum',
        name: 'Platinum Diamond VIP',
        nameKu: 'ئەڵماس VIP (پلاتینیۆم)',
        nameAr: 'ماسي VIP (بلاتينيوم)',
        icon: '💎',
        color: 'from-cyan-500 to-blue-600',
        textColor: 'text-cyan-400',
        borderColor: 'border-cyan-400/40',
        nextThreshold: 2000,
        perksKu: 'داشکاندنی تایبەت بەرزترین ئاست + دیاری ساڵانە',
        perksAr: 'أعلى نسبة خصم + هدايا سنوية'
      };
    }
    if (points >= 500) {
      return {
        id: 'gold',
        name: 'Gold VIP',
        nameKu: 'زێڕین VIP (گۆڵد)',
        nameAr: 'ذهبي VIP',
        icon: '🥇',
        color: 'from-amber-400 to-yellow-600',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-400/40',
        nextThreshold: 1000,
        perksKu: 'لەپێشینە لە گەیاندن و داشکاندنی بەرز',
        perksAr: 'أولوية في التوصيل وخصومات إضافية'
      };
    }
    if (points >= 100) {
      return {
        id: 'silver',
        name: 'Silver Member',
        nameKu: 'زیوین (سیلڤەر)',
        nameAr: 'فضي',
        icon: '🥈',
        color: 'from-slate-300 to-slate-500',
        textColor: 'text-slate-300',
        borderColor: 'border-slate-300/40',
        nextThreshold: 500,
        perksKu: 'داشکاندنی بەردەوام لەسەر کڕینەکان',
        perksAr: 'خصومات مستمرة على المشتريات'
      };
    }
    return {
      id: 'bronze',
      name: 'Bronze Member',
      nameKu: 'برۆنزی (ئەندامی نوێ)',
      nameAr: 'برونزي (عضو جديد)',
      icon: '🥉',
      color: 'from-amber-700 to-amber-900',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-700/40',
      nextThreshold: 100,
      perksKu: '١ خاڵ بۆ هەر ١,٠٠٠ دینار کڕین',
      perksAr: 'نقطة واحدة لكل ١,٠٠٠ دينار شراء'
    };
  },

  /**
   * Awards loyalty points to a user for an order or action.
   */
  awardLoyaltyPoints: async (
    userId: string,
    points: number,
    orderId?: string
  ): Promise<User | null> => {
    if (!userId || points <= 0) return null;

    try {
      const users = getStored<User[]>('users', []);
      let targetUser = users.find(u => u.id === userId) || null;

      if (!targetUser) {
        try {
          const snap = await getDoc(doc(firestore, 'users', userId));
          if (snap.exists()) {
            targetUser = { id: snap.id, ...snap.data() } as User;
          }
        } catch (_) {}
      }

      if (!targetUser) return null;

      const currentPoints = Number(targetUser.loyaltyPoints) || 0;
      const newPoints = currentPoints + Math.floor(points);

      const transaction: LoyaltyPointTransaction = {
        id: `pts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderId,
        amount: Math.floor(points),
        type: 'earned',
        description: `Earned ${Math.floor(points)} loyalty points from purchase`,
        descriptionKu: `بەدەستهێنانی ${Math.floor(points)} خاڵی پاداشت لە کڕینی کاڵا`,
        descriptionAr: `كسب ${Math.floor(points)} نقطة مكافأة من الشراء`,
        discountIqd: Math.floor(points) * 100,
        createdAt: Date.now()
      };

      const history = targetUser.pointsHistory || [];
      const updatedHistory = [transaction, ...history.slice(0, 49)];

      targetUser.loyaltyPoints = newPoints;
      targetUser.pointsHistory = updatedHistory;

      // Update in localStorage
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        users[uIdx] = { ...users[uIdx], loyaltyPoints: newPoints, pointsHistory: updatedHistory };
        setStored('users', users);
      }

      // Update current user if active in session
      const currentUser = getStored<User | null>('currentUser', null);
      if (currentUser && currentUser.id === userId) {
        setStored('currentUser', { ...currentUser, loyaltyPoints: newPoints, pointsHistory: updatedHistory });
      }

      // Update in Firestore
      try {
        await setDoc(doc(firestore, 'users', userId), {
          loyaltyPoints: newPoints,
          pointsHistory: updatedHistory
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore awardLoyaltyPoints notice:", fsErr);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: targetUser }));
        window.dispatchEvent(new CustomEvent('loyalty_points_updated', { detail: { userId, points: newPoints, transaction } }));
      }

      return targetUser;
    } catch (err) {
      console.warn("Error awarding loyalty points:", err);
      return null;
    }
  },

  /**
   * Redeems loyalty points for an immediate discount on an order.
   */
  redeemLoyaltyPoints: async (
    userId: string,
    pointsToRedeem: number,
    orderId?: string
  ): Promise<{ success: boolean; discountIqd: number; remainingPoints: number; user: User | null }> => {
    if (!userId || pointsToRedeem <= 0) {
      return { success: false, discountIqd: 0, remainingPoints: 0, user: null };
    }

    try {
      const users = getStored<User[]>('users', []);
      let targetUser = users.find(u => u.id === userId) || null;

      if (!targetUser) {
        try {
          const snap = await getDoc(doc(firestore, 'users', userId));
          if (snap.exists()) {
            targetUser = { id: snap.id, ...snap.data() } as User;
          }
        } catch (_) {}
      }

      if (!targetUser) {
        return { success: false, discountIqd: 0, remainingPoints: 0, user: null };
      }

      const currentPoints = Number(targetUser.loyaltyPoints) || 0;
      if (currentPoints < pointsToRedeem) {
        return { success: false, discountIqd: 0, remainingPoints: currentPoints, user: targetUser };
      }

      const discountIqd = Math.floor(pointsToRedeem) * 100;
      const newPoints = currentPoints - Math.floor(pointsToRedeem);

      const transaction: LoyaltyPointTransaction = {
        id: `pts_red_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderId,
        amount: -Math.floor(pointsToRedeem),
        type: 'redeemed',
        description: `Redeemed ${Math.floor(pointsToRedeem)} points for ${discountIqd.toLocaleString()} IQD discount`,
        descriptionKu: `بەکارهێنانی ${Math.floor(pointsToRedeem)} خاڵ بۆ داشکاندنی ${discountIqd.toLocaleString()} دینار`,
        descriptionAr: `استبدال ${Math.floor(pointsToRedeem)} نقطة للحصول على خصم ${discountIqd.toLocaleString()} دينار`,
        discountIqd,
        createdAt: Date.now()
      };

      const history = targetUser.pointsHistory || [];
      const updatedHistory = [transaction, ...history.slice(0, 49)];

      targetUser.loyaltyPoints = newPoints;
      targetUser.pointsHistory = updatedHistory;

      // Update in localStorage
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        users[uIdx] = { ...users[uIdx], loyaltyPoints: newPoints, pointsHistory: updatedHistory };
        setStored('users', users);
      }

      // Update current user in session
      const currentUser = getStored<User | null>('currentUser', null);
      if (currentUser && currentUser.id === userId) {
        setStored('currentUser', { ...currentUser, loyaltyPoints: newPoints, pointsHistory: updatedHistory });
      }

      // Update in Firestore
      try {
        await setDoc(doc(firestore, 'users', userId), {
          loyaltyPoints: newPoints,
          pointsHistory: updatedHistory
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore redeemLoyaltyPoints notice:", fsErr);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: targetUser }));
        window.dispatchEvent(new CustomEvent('loyalty_points_updated', { detail: { userId, points: newPoints, transaction } }));
      }

      return { success: true, discountIqd, remainingPoints: newPoints, user: targetUser };
    } catch (err) {
      console.warn("Error redeeming loyalty points:", err);
      return { success: false, discountIqd: 0, remainingPoints: 0, user: null };
    }
  },

  updateSellerVerification: async (userId: string, isVerified: boolean): Promise<void> => {
    try {
      const now = Date.now();
      // 1. Update user in firestore & localStorage
      await setDoc(doc(firestore, 'users', userId), { isVerified, verifiedAt: now }, { merge: true });
      const users = getStored<User[]>('users', []);
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        users[uIdx].isVerified = isVerified;
        users[uIdx].verifiedAt = now;
        setStored('users', users);
      }

      // 2. Update seller profile in firestore & localStorage
      await setDoc(doc(firestore, 'seller_profiles', userId), { isVerified, verifiedAt: now }, { merge: true });
      const sellers = getStored<SellerProfile[]>('seller_profiles_v2', DEFAULT_SELLERS);
      const sIdx = sellers.findIndex(s => s.id === userId || s.uid === userId);
      if (sIdx !== -1) {
        sellers[sIdx].isVerified = isVerified;
        sellers[sIdx].verifiedAt = now;
        setStored('seller_profiles_v2', sellers);
      } else {
        const matchedUser = users.find(u => u.id === userId);
        if (matchedUser) {
          sellers.push({
            id: userId,
            uid: userId,
            businessName: matchedUser.businessName || matchedUser.name || 'Seller',
            contactPhone: matchedUser.phone || '',
            bio: matchedUser.bio || '',
            location: matchedUser.city || 'Kurdistan',
            isVerified: isVerified,
            verifiedAt: now
          });
          setStored('seller_profiles_v2', sellers);
        }
      }

      // 3. Update cached marketplace items in memory and localStorage
      const items = getStored<MarketplaceItem[]>('marketplace_items', []);
      let itemsModified = false;
      items.forEach(item => {
        if (item.userId === userId || item.sellerId === userId) {
          item.isVerified = isVerified;
          item.userVerified = isVerified;
          itemsModified = true;
        }
      });
      if (itemsModified) {
        setStored('marketplace_items', items);
        (globalThis as any).__cachedMarketplaceItems = items;
      }

      // 4. Update cached user if active
      const cached = getStored<any>('payv_cached_user', null);
      if (cached && (cached.id === userId || cached.phone === userId)) {
        cached.isVerified = isVerified;
        cached.verifiedAt = now;
        setStored('payv_cached_user', cached);
      }

      // 5. Broadcast global updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_user_verified', { detail: { id: userId, userId, isVerified } }));
        window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: { id: userId, userId, isVerified } }));
        window.dispatchEvent(new CustomEvent('payv_item_added'));
      }
    } catch (e) {
      console.warn("updateSellerVerification warning:", e);
    }
  },

  updateSellerPerfectStatus: async (userId: string, isPerfectSeller: boolean): Promise<void> => {
    try {
      const now = Date.now();
      // 1. Update user in firestore & localStorage
      await setDoc(doc(firestore, 'users', userId), { isPerfectSeller, perfectSellerAt: isPerfectSeller ? now : null }, { merge: true }).catch(() => {});
      const users = getStored<User[]>('users', []);
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        users[uIdx].isPerfectSeller = isPerfectSeller;
        users[uIdx].perfectSellerAt = isPerfectSeller ? now : undefined;
        setStored('users', users);
      }

      // 2. Update seller profile in firestore & localStorage
      await setDoc(doc(firestore, 'seller_profiles', userId), { isPerfectSeller, perfectSellerAt: isPerfectSeller ? now : null }, { merge: true }).catch(() => {});
      const sellers = getStored<SellerProfile[]>('seller_profiles_v2', DEFAULT_SELLERS);
      const sIdx = sellers.findIndex(s => s.id === userId || s.uid === userId);
      if (sIdx !== -1) {
        sellers[sIdx].isPerfectSeller = isPerfectSeller;
        sellers[sIdx].perfectSellerAt = isPerfectSeller ? now : undefined;
        setStored('seller_profiles_v2', sellers);
      } else {
        const matchedUser = users.find(u => u.id === userId);
        if (matchedUser) {
          sellers.push({
            id: userId,
            uid: userId,
            businessName: matchedUser.businessName || matchedUser.name || 'Seller',
            contactPhone: matchedUser.phone || '',
            bio: matchedUser.bio || '',
            location: matchedUser.city || 'Kurdistan',
            isVerified: matchedUser.isVerified,
            isPerfectSeller: isPerfectSeller,
            perfectSellerAt: isPerfectSeller ? now : undefined
          });
          setStored('seller_profiles_v2', sellers);
        }
      }

      // 3. Update cached marketplace items in memory and localStorage
      const items = getStored<MarketplaceItem[]>('marketplace_items', []);
      let itemsModified = false;
      items.forEach(item => {
        if (item.userId === userId || item.sellerId === userId) {
          item.isPerfectSeller = isPerfectSeller;
          item.userPerfectSeller = isPerfectSeller;
          itemsModified = true;
        }
      });
      if (itemsModified) {
        setStored('marketplace_items', items);
        (globalThis as any).__cachedMarketplaceItems = items;
      }

      // 4. Update cached user if active
      const cached = getStored<any>('payv_cached_user', null);
      if (cached && (cached.id === userId || cached.phone === userId)) {
        cached.isPerfectSeller = isPerfectSeller;
        cached.perfectSellerAt = isPerfectSeller ? now : undefined;
        setStored('payv_cached_user', cached);
      }

      // 5. Broadcast global updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_seller_perfect_updated', { detail: { id: userId, userId, isPerfectSeller } }));
        window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: { id: userId, userId, isPerfectSeller } }));
        window.dispatchEvent(new CustomEvent('payv_item_added'));
      }
    } catch (e) {
      console.warn("updateSellerPerfectStatus warning:", e);
    }
  },

  updateSellerTrustedSeal: async (userId: string, isTrustedSeller: boolean, sealTitle?: string): Promise<void> => {
    try {
      const now = Date.now();
      const title = sealTitle || 'مۆری باوەڕپێکراوی فەرمی';
      // 1. Update user in firestore & localStorage
      await setDoc(doc(firestore, 'users', userId), { 
        isTrustedSeller, 
        trustedSellerAt: isTrustedSeller ? now : null,
        trustedSealTitle: isTrustedSeller ? title : null
      }, { merge: true }).catch(() => {});

      const users = getStored<User[]>('users', []);
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        users[uIdx].isTrustedSeller = isTrustedSeller;
        users[uIdx].trustedSellerAt = isTrustedSeller ? now : undefined;
        users[uIdx].trustedSealTitle = isTrustedSeller ? title : undefined;
        setStored('users', users);
      }

      // 2. Update seller profile in firestore & localStorage
      await setDoc(doc(firestore, 'sellers', userId), { 
        isTrustedSeller, 
        trustedSellerAt: isTrustedSeller ? now : null,
        trustedSealTitle: isTrustedSeller ? title : null
      }, { merge: true }).catch(() => {});

      const sellers = getStored<SellerProfile[]>('sellers', []);
      const sIdx = sellers.findIndex(s => s.id === userId || s.uid === userId);
      if (sIdx !== -1) {
        sellers[sIdx].isTrustedSeller = isTrustedSeller;
        sellers[sIdx].trustedSellerAt = isTrustedSeller ? now : undefined;
        sellers[sIdx].trustedSealTitle = isTrustedSeller ? title : undefined;
        setStored('sellers', sellers);
      }

      // 3. Update all marketplace items authored by this seller
      const items = getStored<MarketplaceItem[]>('marketplace_items', []);
      let itemsModified = false;
      items.forEach(item => {
        if (item.userId === userId || item.sellerId === userId) {
          item.isTrustedSeller = isTrustedSeller;
          item.userTrustedSeller = isTrustedSeller;
          item.trustedSellerAt = isTrustedSeller ? now : undefined;
          item.trustedSealTitle = isTrustedSeller ? title : undefined;
          itemsModified = true;
        }
      });
      if (itemsModified) {
        setStored('marketplace_items', items);
        (globalThis as any).__cachedMarketplaceItems = items;
      }

      // 4. Update cached user if active
      const cached = getStored<any>('payv_cached_user', null);
      if (cached && (cached.id === userId || cached.phone === userId)) {
        cached.isTrustedSeller = isTrustedSeller;
        cached.trustedSellerAt = isTrustedSeller ? now : undefined;
        cached.trustedSealTitle = isTrustedSeller ? title : undefined;
        setStored('payv_cached_user', cached);
      }

      // 5. Broadcast global updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_seller_trusted_updated', { detail: { id: userId, userId, isTrustedSeller, sealTitle: title } }));
        window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: { id: userId, userId, isTrustedSeller } }));
        window.dispatchEvent(new CustomEvent('payv_item_added'));
      }
    } catch (e) {
      console.warn("updateSellerTrustedSeal warning:", e);
    }
  },

  grantSellerReward: async (userId: string, rewardData: {
    amount: number;
    currency: 'IQD' | 'USD' | 'POINTS';
    reason: string;
    adminEmail?: string;
    autoGrantSeal?: boolean;
  }): Promise<{ success: boolean; reward: AdminRewardGrant }> => {
    try {
      const now = Date.now();
      const rewardId = `rwd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const rewardGrant: AdminRewardGrant = {
        id: rewardId,
        amount: Number(rewardData.amount),
        currency: rewardData.currency,
        reason: rewardData.reason,
        grantedAt: now,
        grantedByAdminEmail: rewardData.adminEmail || 'admin@e-bazirgan.com'
      };

      // 1. Fetch current user from localStorage
      const users = getStored<User[]>('users', []);
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        const currentRewards = users[uIdx].adminRewards || [];
        const newPoints = rewardData.currency === 'POINTS' 
          ? (users[uIdx].loyaltyPoints || 0) + Number(rewardData.amount)
          : (users[uIdx].loyaltyPoints || 0);

        users[uIdx] = {
          ...users[uIdx],
          adminRewards: [rewardGrant, ...currentRewards],
          loyaltyPoints: newPoints,
          ...(rewardData.autoGrantSeal ? {
            isTrustedSeller: true,
            trustedSellerAt: now,
            trustedSealTitle: 'مۆری باوەڕپێکراوی فەرمی (Verified Honest)'
          } : {})
        };
        setStored('users', users);
      }

      // 2. Persist to Firestore
      await setDoc(doc(firestore, 'users', userId), {
        adminRewards: arrayUnion(rewardGrant),
        ...(rewardData.currency === 'POINTS' ? { loyaltyPoints: increment(Number(rewardData.amount)) } : {}),
        ...(rewardData.autoGrantSeal ? {
          isTrustedSeller: true,
          trustedSellerAt: now,
          trustedSealTitle: 'مۆری باوەڕپێکراوی فەرمی (Verified Honest)'
        } : {})
      }, { merge: true }).catch(() => {});

      // Also persist to sellers collection
      const sellers = getStored<SellerProfile[]>('sellers', []);
      const sIdx = sellers.findIndex(s => s.id === userId || s.uid === userId);
      if (sIdx !== -1) {
        const curRewards = sellers[sIdx].adminRewards || [];
        sellers[sIdx] = {
          ...sellers[sIdx],
          adminRewards: [rewardGrant, ...curRewards],
          adminRewardsCount: (sellers[sIdx].adminRewardsCount || 0) + 1,
          ...(rewardData.autoGrantSeal ? {
            isTrustedSeller: true,
            trustedSellerAt: now,
            trustedSealTitle: 'مۆری باوەڕپێکراوی فەرمی (Verified Honest)'
          } : {})
        };
        setStored('sellers', sellers);
      }

      // 3. Update cached user if this user is logged in
      const cached = getStored<any>('payv_cached_user', null);
      if (cached && (cached.id === userId || cached.phone === userId)) {
        const curRewards = cached.adminRewards || [];
        cached.adminRewards = [rewardGrant, ...curRewards];
        if (rewardData.currency === 'POINTS') {
          cached.loyaltyPoints = (cached.loyaltyPoints || 0) + Number(rewardData.amount);
        }
        if (rewardData.autoGrantSeal) {
          cached.isTrustedSeller = true;
          cached.trustedSellerAt = now;
          cached.trustedSealTitle = 'مۆری باوەڕپێکراوی فەرمی (Verified Honest)';
        }
        setStored('payv_cached_user', cached);
      }

      // 4. Send In-App Notification to the honest seller
      const currencyLabel = rewardData.currency === 'POINTS' ? 'خاڵی پاداشت' : rewardData.currency === 'USD' ? '$ دۆلار' : 'دیناری عێراقی IQD';
      const rewardNotif: PriceUpdateNotification = {
        id: `notif_reward_${rewardGrant.id}`,
        userId,
        itemId: '',
        itemTitle: '🎁 پیرۆزە! پاداشتی ئەدمینت وەرگرت',
        oldPrice: 0,
        newPrice: 0,
        sellerId: 'admin_official',
        sellerName: 'دەستەی کارگێڕی E-BAZIRGAN',
        createdAt: now,
        read: false,
        type: 'admin_notice',
        message: `ئیدارەی پلاتفۆرم پاداشتی تایبەتی (${Number(rewardData.amount).toLocaleString()} ${currencyLabel}) پێبەخشیت وەک فرۆشیارێکی ڕاستگۆ و خاوەن ڕەوشتی بەرز! هۆکار: ${rewardData.reason}`
      };
      try {
        const userNotifsKey = `payv_notifications_${userId}`;
        const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
        userNotifs.unshift(rewardNotif);
        setStored(userNotifsKey, userNotifs);
        await setDoc(doc(firestore, 'notifications', rewardNotif.id), cleanData(rewardNotif)).catch(() => {});
      } catch (e) {
        console.warn("Firestore send reward notification error:", e);
      }

      // 5. Broadcast global events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_seller_reward_granted', { detail: { userId, reward: rewardGrant } }));
        window.dispatchEvent(new CustomEvent('payv_user_updated', { detail: { id: userId, userId } }));
      }

      return { success: true, reward: rewardGrant };
    } catch (e) {
      console.error("grantSellerReward error:", e);
      return { success: false, reward: null as any };
    }
  },

  getCurrentUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const isSignedOut = localStorage.getItem('payv_signed_out') === 'true';
      const cached = localStorage.getItem('payv_cached_user');
      if (cached && !isSignedOut) {
        try {
          const u = JSON.parse(cached);
          if (u && u.id) return u;
        } catch (_) {}
      }
      if (!isSignedOut) {
        const users = getStored<User[]>('users', []);
        if (users && users.length > 0 && users[0] && users[0].id) {
          return users[0];
        }
      }
    }
    return null;
  },

  saveCurrentUser: async (updatedUser: User): Promise<void> => {
    if (checkIsAdmin(updatedUser)) {
      updatedUser.role = 'admin';
      updatedUser.isAdmin = true;
    }

    // Safety compression for profile picture
    if (updatedUser.avatar && updatedUser.avatar.startsWith('data:image')) {
      try {
        const compressed = await compressBase64Image(updatedUser.avatar, 250, 0.65);
        if (compressed) {
          updatedUser.avatar = compressed;
        }
      } catch (e) {
        console.warn("Avatar compression skipped/failed:", e);
      }
    }

    const users = getStored<User[]>('users', []);
    const idx = users.findIndex(u => u.id === updatedUser.id || (updatedUser.phone && u.phone === updatedUser.phone));
    if (idx >= 0) {
      users[idx] = updatedUser;
    } else {
      users.unshift(updatedUser);
    }
    // Always guarantee index 0 contains the current active user
    if (users.length > 0) {
      users[0] = updatedUser;
    }
    setStored('users', users);

    try {
      localStorage.removeItem('payv_signed_out');
      localStorage.setItem('payv_cached_user', JSON.stringify(updatedUser));
      localStorage.setItem('payv_custom_user_id', updatedUser.id);
      if (updatedUser.phone) {
        localStorage.setItem('payv_last_active_phone', updatedUser.phone);
      }
      localStorage.setItem('payv_profile_completed', 'true');
    } catch (_) {}

    try {
      await setDoc(doc(firestore, 'users', updatedUser.id), cleanData(updatedUser), { merge: true });
    } catch (e) {
      console.warn("Firestore saveCurrentUser failed (fallback active):", e);
    }
  },

  deleteAccount: async (userId: string, targetUser?: Partial<User> | null): Promise<User[]> => {
    const cleanPhone = (targetUser?.phone || (userId && userId.match(/\d{7,}/) ? userId : '')).replace(/\D/g, '');
    const cleanTargetEmail = (targetUser?.email || '').trim().toLowerCase();

    // PROTECT SUPER MASTER ADMIN ACCOUNT ONLY (ID: admin-07501222253 or phone 07501222253 / 07746573763 or email afsun2026app@gmail.com)
    const isMasterAdmin = 
      userId === 'admin-07501222253' || 
      userId === 'default-admin-id' || 
      cleanPhone === '07501222253' || 
      cleanPhone === '7501222253' || 
      cleanPhone === '9647501222253' ||
      cleanPhone === '07746573763' ||
      cleanPhone === '7746573763' ||
      cleanPhone === '9647746573763' ||
      cleanTargetEmail === 'afsun2026app@gmail.com';

    if (isMasterAdmin) {
      console.warn("Protected master admin account cannot be deleted.");
      return db.getUsers();
    }

    const idSet = new Set<string>();
    if (userId) idSet.add(userId);
    if (targetUser?.id) idSet.add(targetUser.id);
    if ((targetUser as any)?.uid) idSet.add((targetUser as any).uid);
    if ((targetUser as any)?.docId) idSet.add((targetUser as any).docId);

    // 1. Delete user docs from Firestore
    try {
      for (const id of idSet) {
        await deleteDoc(doc(firestore, 'users', id)).catch(() => {});
      }

      const qUsers = query(collection(firestore, 'users'));
      const snapUsers = await getDocs(qUsers);
      const userDeletePromises: Promise<void>[] = [];
      snapUsers.forEach((d) => {
        const data = d.data();
        const dPhone = (data.phone || '').replace(/\D/g, '');
        const dEmail = (data.email || '').trim().toLowerCase();
        const isMaster = d.id === 'admin-07501222253' || dPhone === '07501222253' || dPhone === '7501222253' || dEmail === 'afsun2026app@gmail.com';
        if (isMaster) return;

        const idMatch = idSet.has(d.id) || (data.id && idSet.has(data.id)) || (data.uid && idSet.has(data.uid));
        const phoneMatch = cleanPhone.length >= 7 && dPhone.length >= 7 && (dPhone === cleanPhone || dPhone.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(dPhone.slice(-8)));
        const emailMatch = Boolean(cleanTargetEmail && dEmail && dEmail === cleanTargetEmail);

        if (idMatch || phoneMatch || emailMatch) {
          userDeletePromises.push(deleteDoc(doc(firestore, 'users', d.id)).catch(() => {}));
        }
      });
      await Promise.all(userDeletePromises);
    } catch (e) {
      console.warn("Firestore deleteAccount user doc failed:", e);
    }

    // 2. Delete seller profile(s) from Firestore
    try {
      for (const id of idSet) {
        await deleteDoc(doc(firestore, 'seller_profiles', id)).catch(() => {});
      }
      const qSellers = query(collection(firestore, 'seller_profiles'));
      const snapSellers = await getDocs(qSellers);
      const sellerDeletePromises: Promise<void>[] = [];
      snapSellers.forEach((d) => {
        const data = d.data();
        const sPhone = (data.phone || data.contactPhone || '').replace(/\D/g, '');
        const idMatch = idSet.has(d.id) || (data.id && idSet.has(data.id)) || (data.uid && idSet.has(data.uid)) || (data.sellerId && idSet.has(data.sellerId)) || (data.userId && idSet.has(data.userId));
        const phoneMatch = cleanPhone.length >= 7 && sPhone.length >= 7 && (sPhone === cleanPhone || sPhone.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(sPhone.slice(-8)));
        if (idMatch || phoneMatch) {
          sellerDeletePromises.push(deleteDoc(doc(firestore, 'seller_profiles', d.id)).catch(() => {}));
        }
      });
      await Promise.all(sellerDeletePromises);
    } catch (e) {
      console.warn("Firestore deleteAccount seller profile failed:", e);
    }

    // 3. Delete marketplace items for this user
    try {
      const q = query(collection(firestore, 'marketplace_items'));
      const snapshot = await getDocs(q);
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const itemPhone = (data.sellerPhone || data.contactPhone || '').replace(/\D/g, '');
        const idMatch = 
          (data.userId && idSet.has(data.userId)) || 
          (data.sellerId && idSet.has(data.sellerId)) || 
          (data.ownerId && idSet.has(data.ownerId)) ||
          Array.from(idSet).some(id => docSnap.id.includes(id));
        const phoneMatch = cleanPhone.length >= 7 && itemPhone.length >= 7 && (itemPhone === cleanPhone || itemPhone.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(itemPhone.slice(-8)));
        if (idMatch || phoneMatch) {
          deletePromises.push(deleteDoc(doc(firestore, 'marketplace_items', docSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(deletePromises);
    } catch (e) {
      console.warn("Firestore deleteAccount items cleanup failed:", e);
    }

    // 4. Clean up user daily stories & live sessions
    try {
      const storiesQ = query(collection(firestore, 'daily_stories'));
      const storiesSnap = await getDocs(storiesQ);
      const storyDeletePromises: Promise<void>[] = [];
      storiesSnap.forEach((dSnap) => {
        const data = dSnap.data();
        if (idSet.has(data.sellerId) || idSet.has(data.userId)) {
          storyDeletePromises.push(deleteDoc(doc(firestore, 'daily_stories', dSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(storyDeletePromises);
    } catch (e) {
      console.warn("Firestore deleteAccount stories cleanup failed:", e);
    }

    try {
      const liveQ = query(collection(firestore, 'live_sessions'));
      const liveSnap = await getDocs(liveQ);
      const liveDeletePromises: Promise<void>[] = [];
      liveSnap.forEach((dSnap) => {
        const data = dSnap.data();
        if (idSet.has(data.broadcasterId) || idSet.has(data.sellerId)) {
          liveDeletePromises.push(deleteDoc(doc(firestore, 'live_sessions', dSnap.id)).catch(() => {}));
        }
      });
      await Promise.all(liveDeletePromises);
    } catch (e) {}

    // 5. Clear local storage entries
    try {
      for (const id of idSet) {
        localStorage.removeItem(`payv_txs_${id}`);
        localStorage.removeItem(`payv_orders_${id}`);
        localStorage.removeItem(`payv_notifications_${id}`);
      }
      const curCustomUid = localStorage.getItem('payv_custom_user_id');
      const curPhone = (localStorage.getItem('payv_last_active_phone') || '').replace(/\D/g, '');
      if ((curCustomUid && idSet.has(curCustomUid)) || (cleanPhone.length >= 7 && curPhone && curPhone.endsWith(cleanPhone.slice(-8)))) {
        localStorage.removeItem('payv_custom_user_id');
        localStorage.removeItem('payv_cached_user');
        localStorage.removeItem('payv_last_active_phone');
      }
    } catch (_) {}

    // 6. Filter local storage lists
    const filterUserObj = (u: any) => {
      if (!u) return false;
      if (idSet.has(u.id) || idSet.has(u.uid)) return false;
      const uPhone = (u.phone || '').replace(/\D/g, '');
      if (cleanPhone.length >= 7 && uPhone.length >= 7 && (uPhone === cleanPhone || uPhone.endsWith(cleanPhone.slice(-8)) || cleanPhone.endsWith(uPhone.slice(-8)))) return false;
      if (cleanTargetEmail && u.email && u.email.toLowerCase() === cleanTargetEmail) return false;
      return true;
    };

    let users = getStored<User[]>('users', [DEFAULT_ADMIN_USER]).filter(filterUserObj);
    if (users.length === 0) users = [DEFAULT_ADMIN_USER];
    setStored('users', users);

    let regUsers = getStored<User[]>('payv_registered_users', []).filter(filterUserObj);
    setStored('payv_registered_users', regUsers);

    let sellers = getStored<SellerProfile[]>('seller_profiles', []).filter(filterUserObj);
    setStored('seller_profiles', sellers);

    let sellersV2 = getStored<SellerProfile[]>('seller_profiles_v2', []).filter(filterUserObj);
    setStored('seller_profiles_v2', sellersV2);

    let items = getStored<MarketplaceItem[]>('marketplace_items', []).filter(i => {
      if (idSet.has(i.userId) || (i.sellerId && idSet.has(i.sellerId))) return false;
      const iPhone = (i.sellerPhone || (i as any).contactPhone || '').replace(/\D/g, '');
      if (cleanPhone.length >= 7 && iPhone.length >= 7 && (iPhone === cleanPhone || iPhone.endsWith(cleanPhone.slice(-8)))) return false;
      return true;
    });
    setStored('marketplace_items', items);

    // 7. Re-fetch fresh users from Firestore
    try {
      const freshUsers = await db.getUsers();
      return freshUsers;
    } catch (_) {
      return users;
    }
  },

  getSellers: async (): Promise<SellerProfile[]> => {
    try {
      const q = query(collection(firestore, 'seller_profiles'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const sellers: SellerProfile[] = [];
        snapshot.forEach(docSnap => {
          sellers.push({ id: docSnap.id, ...docSnap.data() } as SellerProfile);
        });
        return sellers;
      }
    } catch (e) {
      console.warn("Firestore getSellers failed, falling back to localStorage:", e);
    }
    return getStored('seller_profiles_v2', DEFAULT_SELLERS);
  },

  getSellerProfile: async (sellerId: string): Promise<SellerProfile | null> => {
    try {
      const docSnap = await getDoc(doc(firestore, 'seller_profiles', sellerId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SellerProfile;
      }
    } catch (e) {
      console.warn("Firestore getSellerProfile failed, falling back:", e);
    }
    const sellers = await db.getSellers();
    return sellers.find(s => s.id === sellerId || s.uid === sellerId) || null;
  },

  recalculateReputation: async (sellerId: string, extraData?: any): Promise<any> => {
    try {
      const res = await fetch(`/api/payv/calculate-reputation/${sellerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extraData || {})
      });
      if (res.ok) {
        const resData = await res.json();
        return resData.reputation;
      }
    } catch (e) {
      console.error("Failed to recalculate seller reputation:", e);
    }
    return null;
  },

  // Messaging System
  getOrCreateConversation: async (
    user1: { id: string; name: string; avatar?: string; phone?: string; role?: 'buyer' | 'seller' },
    user2: { id: string; name: string; avatar?: string; phone?: string; role?: 'buyer' | 'seller' },
    itemContext?: { id: string; title: string; imageUrl?: string; price: number }
  ): Promise<Conversation> => {
    const convId = [user1.id, user2.id].sort().join('_');
    const convRef = doc(firestore, 'conversations', convId);

    try {
      const snap = await getDoc(convRef);
      if (snap.exists()) {
        const existingData = snap.data() as Conversation;
        // Update itemContext or participant details if provided
        const updatedDetails = {
          ...existingData.participantDetails,
          [user1.id]: { name: user1.name, avatar: user1.avatar || '', phone: user1.phone, role: user1.role || 'buyer' },
          [user2.id]: { name: user2.name, avatar: user2.avatar || '', phone: user2.phone, role: user2.role || 'seller' }
        };
        const updatePayload: Partial<Conversation> = {
          participantDetails: updatedDetails,
          updatedAt: Date.now()
        };
        if (itemContext) {
          updatePayload.itemId = itemContext.id;
          updatePayload.itemTitle = itemContext.title;
          updatePayload.itemImage = itemContext.imageUrl;
          updatePayload.itemPrice = itemContext.price;
        }
        await updateDoc(convRef, updatePayload);
        return { ...existingData, ...updatePayload };
      }

      const newConv: Conversation = {
        id: convId,
        participants: [user1.id, user2.id],
        participantDetails: {
          [user1.id]: { name: user1.name, avatar: user1.avatar || '', phone: user1.phone, role: user1.role || 'buyer' },
          [user2.id]: { name: user2.name, avatar: user2.avatar || '', phone: user2.phone, role: user2.role || 'seller' }
        },
        lastMessage: itemContext ? `Inquiry regarding ${itemContext.title}` : 'Conversation started',
        lastMessageTime: Date.now(),
        lastSenderId: user1.id,
        unreadCount: { [user2.id]: 0, [user1.id]: 0 },
        itemId: itemContext?.id,
        itemTitle: itemContext?.title,
        itemImage: itemContext?.imageUrl,
        itemPrice: itemContext?.price,
        updatedAt: Date.now()
      };

      await setDoc(convRef, newConv);
      return newConv;
    } catch (err) {
      console.warn("Firestore getOrCreateConversation fallback to memory/local:", err);
      const fallbackConv: Conversation = {
        id: convId,
        participants: [user1.id, user2.id],
        participantDetails: {
          [user1.id]: { name: user1.name, avatar: user1.avatar || '', phone: user1.phone, role: user1.role || 'buyer' },
          [user2.id]: { name: user2.name, avatar: user2.avatar || '', phone: user2.phone, role: user2.role || 'seller' }
        },
        lastMessage: itemContext ? `Inquiry regarding ${itemContext.title}` : 'Conversation started',
        lastMessageTime: Date.now(),
        lastSenderId: user1.id,
        unreadCount: { [user2.id]: 0, [user1.id]: 0 },
        itemId: itemContext?.id,
        itemTitle: itemContext?.title,
        itemImage: itemContext?.imageUrl,
        itemPrice: itemContext?.price,
        updatedAt: Date.now()
      };
      return fallbackConv;
    }
  },

  sendChatMessage: async (message: Omit<ChatMessage, 'id'>) => {
    try {
      const convId = message.conversationId || [message.senderId, message.recipientId].sort().join('_');
      const msgRef = doc(collection(firestore, 'messages'));
      const newMsg: ChatMessage = { 
        ...message, 
        id: msgRef.id, 
        conversationId: convId,
        createdAt: message.createdAt || Date.now()
      };

      await setDoc(msgRef, newMsg);

      // Also update or create the conversation record
      const convRef = doc(firestore, 'conversations', convId);
      const convSnap = await getDoc(convRef);

      const snippet = newMsg.text ? newMsg.text : (newMsg.imageUrl ? '📷 Photo attachment' : 'Message');
      
      if (convSnap.exists()) {
        const curConv = convSnap.data() as Conversation;
        const currentUnread = (curConv.unreadCount && curConv.unreadCount[message.recipientId]) || 0;
        
        await updateDoc(convRef, {
          lastMessage: snippet,
          lastMessageTime: newMsg.createdAt,
          lastSenderId: message.senderId,
          updatedAt: newMsg.createdAt,
          [`unreadCount.${message.recipientId}`]: currentUnread + 1,
          ...(message.itemId ? {
            itemId: message.itemId,
            itemTitle: message.itemTitle,
            itemImage: message.itemImage,
            itemPrice: message.itemPrice
          } : {})
        });
      } else {
        const newConv: Conversation = {
          id: convId,
          participants: [message.senderId, message.recipientId],
          participantDetails: {
            [message.senderId]: { name: message.senderName || 'User', avatar: message.senderAvatar || '' },
            [message.recipientId]: { name: message.recipientName || 'Seller', avatar: message.recipientAvatar || '' }
          },
          lastMessage: snippet,
          lastMessageTime: newMsg.createdAt,
          lastSenderId: message.senderId,
          unreadCount: { [message.recipientId]: 1, [message.senderId]: 0 },
          itemId: message.itemId,
          itemTitle: message.itemTitle,
          itemImage: message.itemImage,
          itemPrice: message.itemPrice,
          updatedAt: newMsg.createdAt
        };
        await setDoc(convRef, newConv);
      }

      // Save locally as backup
      const localMsgs = getStored(`messages_${convId}`, []);
      setStored(`messages_${convId}`, [...localMsgs, newMsg]);

      return newMsg;
    } catch (err) {
      console.warn("Firestore sendChatMessage error, writing locally:", err);
      const convId = message.conversationId || [message.senderId, message.recipientId].sort().join('_');
      const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newMsg: ChatMessage = {
        ...message,
        id: tempId,
        conversationId: convId,
        createdAt: Date.now()
      };
      const localMsgs = getStored(`messages_${convId}`, []);
      setStored(`messages_${convId}`, [...localMsgs, newMsg]);
      return newMsg;
    }
  },

  subscribeToUserConversations: (userId: string, callback: (conversations: Conversation[]) => void) => {
    try {
      const q = query(
        collection(firestore, 'conversations'),
        where('participants', 'array-contains', userId)
      );

      return onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(d => d.data() as Conversation);
        conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        callback(conversations);
      }, (err) => {
        console.warn("subscribeToUserConversations snapshot error:", err);
        callback([]);
      });
    } catch (err) {
      console.warn("Failed to subscribe to user conversations:", err);
      callback([]);
      return () => {};
    }
  },

  subscribeToMessages: (userId: string, contactId: string, callback: (messages: ChatMessage[]) => void) => {
    const convId = [userId, contactId].sort().join('_');
    try {
      const q = query(
        collection(firestore, 'messages'),
        where('senderId', 'in', [userId, contactId]),
        where('recipientId', 'in', [userId, contactId]),
        orderBy('createdAt', 'asc')
      );

      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(docSnap => docSnap.data() as ChatMessage);
        if (messages.length > 0) {
          callback(messages);
        } else {
          // Fallback to local storage if empty
          const local = getStored(`messages_${convId}`, []);
          callback(local);
        }
      }, (err) => {
        console.warn("subscribeToMessages snapshot error, using local fallback:", err);
        const local = getStored(`messages_${convId}`, []);
        callback(local);
      });
    } catch (err) {
      console.warn("subscribeToMessages query error:", err);
      const local = getStored(`messages_${convId}`, []);
      callback(local);
      return () => {};
    }
  },

  markConversationAsRead: async (conversationId: string, userId: string) => {
    try {
      const convRef = doc(firestore, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`unreadCount.${userId}`]: 0
      });
    } catch (err) {
      console.warn("markConversationAsRead error:", err);
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const convRef = doc(firestore, 'conversations', conversationId);
      await deleteDoc(convRef);
      setStored(`messages_${conversationId}`, []);
    } catch (err) {
      console.warn("deleteConversation error:", err);
    }
  },

  getItem: async (itemId: string): Promise<MarketplaceItem | null> => {
    try {
      const docSnap = await getDoc(doc(firestore, 'marketplace_items', itemId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as MarketplaceItem;
      }
    } catch (e) {
      console.warn("Firestore getItem failed:", e);
    }
    const localItems = getStored('marketplace_items', DEFAULT_ITEMS);
    return localItems.find((i: MarketplaceItem) => i.id === itemId) || null;
  },

  getCachedMarketplaceItems: (): MarketplaceItem[] => {
    if ((globalThis as any).__cachedMarketplaceItems && Array.isArray((globalThis as any).__cachedMarketplaceItems) && (globalThis as any).__cachedMarketplaceItems.length > 0) {
      return (globalThis as any).__cachedMarketplaceItems;
    }
    const local = getStored<MarketplaceItem[]>('marketplace_items', []);
    if (local && local.length > 0) {
      (globalThis as any).__cachedMarketplaceItems = local;
      return local;
    }
    return [];
  },

  getMarketplaceItems: async (forceRefresh = false): Promise<MarketplaceItem[]> => {
    // 1. Return in-memory cache if valid
    const now = Date.now();
    if (!forceRefresh && (globalThis as any).__cachedMarketplaceItems?.length && (now - ((globalThis as any).__lastMarketplaceFetchTime || 0) < 30000)) {
      return (globalThis as any).__cachedMarketplaceItems;
    }

    // Fast-path: return local stored items immediately for 0ms initial render
    const deletedIds = new Set(getStored<string[]>('payv_deleted_item_ids', []));

    if (!forceRefresh && !(globalThis as any).__cachedMarketplaceItems?.length) {
      const localItems = getStored<MarketplaceItem[]>('marketplace_items', []);
      const filteredLocal = localItems.filter(i => !deletedIds.has(i.id));
      if (filteredLocal.length > 0) {
        (globalThis as any).__cachedMarketplaceItems = filteredLocal;
        // Background revalidate
        setTimeout(() => {
          db.getMarketplaceItems(true).catch(() => {});
        }, 50);
        return filteredLocal;
      }
    }

    try {
      // 2. Query with limit to prevent pulling unbounded records into mobile memory
      const q = query(
        collection(firestore, 'marketplace_items'),
        limit(200)
      );
      const snapshot = await getDocs(q);
      const items: MarketplaceItem[] = [];

      const demoIds = ['sandbox-id', 'current-user-id', 'guest'];

      snapshot.forEach(docSnap => {
        if (deletedIds.has(docSnap.id)) return;
        const remoteData = { id: docSnap.id, ...docSnap.data() } as MarketplaceItem;
        const title = (remoteData.title || '').toLowerCase();
        const isDemo = Boolean(
          (remoteData as any).isDemo ||
          title.includes('sample demo item') ||
          title.includes('1600396644')
        );

        if (!isDemo && !deletedIds.has(remoteData.id)) {
          items.push(remoteData);
        }
      });

      const getItemEffectiveTime = (item: MarketplaceItem) => 
        item.lastBumpedAt || item.last_bumped_at || item.createdAt || 0;

      // Retain and merge any locally created items that haven't synced to Firestore snapshot yet
      const localStored = getStored<MarketplaceItem[]>('marketplace_items', []);
      const remoteIds = new Set(items.map(i => i.id));
      const newlyAddedLocal = localStored.filter(li => 
        !remoteIds.has(li.id) && 
        !deletedIds.has(li.id) && 
        Boolean(li.imageUrl || (li.imageUrls && li.imageUrls.length > 0))
      );
      const combined = [...newlyAddedLocal, ...items];

      const sorted = combined.sort((a, b) => getItemEffectiveTime(b) - getItemEffectiveTime(a));
      
      // Update in-memory and local cache
      (globalThis as any).__cachedMarketplaceItems = sorted;
      (globalThis as any).__lastMarketplaceFetchTime = Date.now();
      setStored('marketplace_items', sorted);
      return sorted;
    } catch (e) {
      console.warn("Firestore getMarketplaceItems failed, using fallback:", e);
      const localItems = getStored('marketplace_items', DEFAULT_ITEMS);
      const filteredLocal = localItems.filter((i: any) => !deletedIds.has(i.id));
      const getItemEffectiveTime = (item: MarketplaceItem) => 
        item.lastBumpedAt || item.last_bumped_at || item.createdAt || 0;
      const sorted = filteredLocal.sort((a: any, b: any) => getItemEffectiveTime(b) - getItemEffectiveTime(a));
      (globalThis as any).__cachedMarketplaceItems = sorted;
      return sorted;
    }
  },

  getReviews: async (itemId: string): Promise<Review[]> => {
    const localReviews = getStored<Review[]>('reviews', DEFAULT_REVIEWS).filter(r => r.itemId === itemId);
    const map = new Map<string, Review>();
    localReviews.forEach(r => map.set(r.id, r));

    try {
      const q = query(
        collection(firestore, 'reviews'),
        where('itemId', '==', itemId)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Review;
        map.set(docSnap.id, { id: docSnap.id, ...data });
      });
    } catch (e) {
      console.warn("Firestore getReviews failed, using local/cached reviews:", e);
    }

    const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    return merged;
  },

  addReview: async (review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> => {
    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReview: Review = {
      ...review,
      id: reviewId,
      createdAt: Date.now(),
    };

    const reviews = getStored<Review[]>('reviews', DEFAULT_REVIEWS);
    // Add to beginning of reviews list
    reviews.unshift(newReview);
    setStored('reviews', reviews);

    try {
      await setDoc(doc(firestore, 'reviews', reviewId), cleanData(newReview));
    } catch (e) {
      console.error("Firestore addReview failed:", e);
    }

    // Update item aggregated calculations
    const items = getStored<MarketplaceItem[]>('marketplace_items', DEFAULT_ITEMS);
    const item = items.find(i => i.id === review.itemId);
    if (item) {
      const itemReviews = reviews.filter(r => r.itemId === review.itemId);
      const totalStars = itemReviews.reduce((sum, r) => sum + r.rating, 0);
      item.rating = itemReviews.length > 0 ? totalStars / itemReviews.length : 5;
      item.reviewCount = itemReviews.length;
      setStored('marketplace_items', items);

      try {
        await setDoc(doc(firestore, 'marketplace_items', review.itemId), {
          rating: item.rating,
          reviewCount: item.reviewCount
        }, { merge: true });
      } catch (e) {
        console.error("Firestore item rating update failed:", e);
      }
    }

    // Broadcast global review added event for instant UI update across cards & modals
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('payv_review_added', { 
        detail: { 
          itemId: review.itemId, 
          review: newReview,
          rating: item?.rating,
          reviewCount: item?.reviewCount 
        } 
      }));
    }

    return newReview;
  },

  getSellerReviews: async (sellerId: string): Promise<SellerReview[]> => {
    const key = `payv_seller_reviews_${sellerId}`;
    const stored = getStored<SellerReview[]>(key, []);
    const map = new Map<string, SellerReview>();
    stored.forEach(r => map.set(r.id, r));

    try {
      const q = query(
        collection(firestore, 'seller_reviews'),
        where('sellerId', '==', sellerId)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as SellerReview);
      });
    } catch (e) {
      console.warn("Firestore getSellerReviews failed, using local/sample cache:", e);
    }

    if (map.size > 0) {
      const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      setStored(key, merged);
      return merged;
    }

    // Default curated seller reviews so store profiles have a realistic baseline
    const sampleReviews: SellerReview[] = [
      {
        id: `srev_${sellerId}_1`,
        sellerId,
        userId: 'buyer_soran',
        userName: 'Soran Karim',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Soran',
        rating: 5,
        comment: 'کاڵاکان زۆر پاک و بە کوالێتی بەرز گەیشتنە دەستم، هەڵسوکەوت و خزمەتگوزاری فرۆشیار لەوپەڕی باشیدایە.',
        tags: ['کوالێتی بەرز', 'گەیاندنی خێرا', 'پێچانەوەی پارێزراو'],
        verifiedBuyer: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
      },
      {
        id: `srev_${sellerId}_2`,
        sellerId,
        userId: 'buyer_shadya',
        userName: 'Shadya Mahmood',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shadya',
        rating: 5,
        comment: 'وەڵامدانەوەی زۆر خێرا و ڕێکوپێک. هەموو شتێک وەک وەسفەکە بوو، زۆر سوپاس.',
        tags: ['وەڵامدانەوەی خێرا', 'وەک وەسفەکە'],
        verifiedBuyer: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
      },
      {
        id: `srev_${sellerId}_3`,
        sellerId,
        userId: 'buyer_rawand',
        userName: 'Rawand Ali',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rawand',
        rating: 4,
        comment: 'نرخەکەی گونجاوە و مامەڵەیەکی پاکە. دیسانەوە داواکاری لەم فرۆشگایە دەکەمەوە.',
        tags: ['نرخی گونجاو'],
        verifiedBuyer: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9
      }
    ];
    setStored(key, sampleReviews);
    return sampleReviews;
  },

  addSellerReview: async (review: Omit<SellerReview, 'id' | 'createdAt'>): Promise<SellerReview> => {
    const reviewId = `srev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReview: SellerReview = {
      ...review,
      id: reviewId,
      createdAt: Date.now(),
      verifiedBuyer: review.verifiedBuyer ?? true
    };

    const key = `payv_seller_reviews_${review.sellerId}`;
    let reviews = await db.getSellerReviews(review.sellerId);
    const existingIdx = reviews.findIndex(r => r.userId === review.userId);
    if (existingIdx >= 0) {
      reviews[existingIdx] = newReview;
    } else {
      reviews.unshift(newReview);
    }
    setStored(key, reviews);

    try {
      await setDoc(doc(firestore, 'seller_reviews', reviewId), cleanData(newReview));
    } catch (e) {
      console.error("Firestore addSellerReview failed:", e);
    }

    const totalStars = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((totalStars / reviews.length).toFixed(1));
    const reviewCount = reviews.length;
    const ratingBreakdown = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    try {
      await setDoc(doc(firestore, 'seller_profiles', review.sellerId), {
        rating: avgRating,
        reviewCount,
        ratingBreakdown
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore seller profile rating update failed:", e);
    }

    const sellers = getStored('seller_profiles_v2', DEFAULT_SELLERS);
    const sIdx = sellers.findIndex(s => s.id === review.sellerId);
    if (sIdx !== -1) {
      sellers[sIdx].rating = avgRating;
      sellers[sIdx].reviewCount = reviewCount;
      sellers[sIdx].ratingBreakdown = ratingBreakdown;
      setStored('seller_profiles_v2', sellers);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('payv_seller_review_added', { 
        detail: { sellerId: review.sellerId, review: newReview, rating: avgRating, reviewCount } 
      }));
    }

    return newReview;
  },

  deleteSellerReview: async (reviewId: string, sellerId: string): Promise<void> => {
    const key = `payv_seller_reviews_${sellerId}`;
    let reviews = await db.getSellerReviews(sellerId);
    reviews = reviews.filter(r => r.id !== reviewId);
    setStored(key, reviews);

    try {
      await deleteDoc(doc(firestore, 'seller_reviews', reviewId));
    } catch (e) {
      console.warn("Firestore deleteSellerReview failed:", e);
    }

    const totalStars = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) : 5.0;
    const avgRating = reviews.length > 0 ? Number((totalStars / reviews.length).toFixed(1)) : 5.0;
    const reviewCount = reviews.length;
    const ratingBreakdown = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    try {
      await setDoc(doc(firestore, 'seller_profiles', sellerId), {
        rating: avgRating,
        reviewCount,
        ratingBreakdown
      }, { merge: true });
    } catch (e) {}

    const sellers = getStored('seller_profiles_v2', DEFAULT_SELLERS);
    const sIdx = sellers.findIndex(s => s.id === sellerId);
    if (sIdx !== -1) {
      sellers[sIdx].rating = avgRating;
      sellers[sIdx].reviewCount = reviewCount;
      sellers[sIdx].ratingBreakdown = ratingBreakdown;
      setStored('seller_profiles_v2', sellers);
    }
  },

  getMarketplaceItemsPaginated: async (
    limitAmount: number,
    lastVisible: MarketplaceItem | null | undefined,
    postType: string,
    forceRefresh = false
  ): Promise<{ items: MarketplaceItem[]; lastDoc: MarketplaceItem | null }> => {
    const items = await db.getMarketplaceItems(forceRefresh);
    const filtered = items.filter(i => postType === 'all' || !i.postType || i.postType === postType || i.postType === 'marketplace');
    
    let startIndex = 0;
    if (lastVisible) {
      const idx = filtered.findIndex(i => i.id === lastVisible.id);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const paginatedItems = filtered.slice(startIndex, startIndex + limitAmount);
    const lastDoc = paginatedItems.length > 0 ? paginatedItems[paginatedItems.length - 1] : null;
    
    const hasMoreItems = startIndex + limitAmount < filtered.length;

    return {
      items: paginatedItems,
      lastDoc: hasMoreItems ? lastDoc : null
    };
  },

  toggleMarketplaceLike: async (itemId: string, userId: string): Promise<void> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx !== -1) {
      const likes = items[itemIdx].likes || [];
      const updatedLikes = likes.includes(userId)
        ? likes.filter(uid => uid !== userId)
        : [...likes, userId];
      items[itemIdx].likes = updatedLikes;
      setStored('marketplace_items', items);

      try {
        await setDoc(doc(firestore, 'marketplace_items', itemId), { likes: updatedLikes }, { merge: true });
      } catch (e) {
        console.error("Firestore toggleMarketplaceLike failed:", e);
      }
    }
  },

  toggleMarketplaceSave: async (itemId: string, userId: string): Promise<void> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx !== -1) {
      const saves = items[itemIdx].saves || [];
      const updatedSaves = saves.includes(userId)
        ? saves.filter(uid => uid !== userId)
        : [...saves, userId];
      items[itemIdx].saves = updatedSaves;
      setStored('marketplace_items', items);

      try {
        await setDoc(doc(firestore, 'marketplace_items', itemId), { saves: updatedSaves }, { merge: true });
      } catch (e) {
        console.error("Firestore toggleMarketplaceSave failed:", e);
      }
    }
  },

  togglePriceWatch: async (itemId: string, userId: string): Promise<{ isSubscribed: boolean; watchersCount: number }> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIdx = items.findIndex(i => i.id === itemId);
    let isSubscribed = false;
    let watchersCount = 0;

    if (itemIdx !== -1) {
      const watchers = items[itemIdx].priceWatchers || [];
      const wasSubscribed = watchers.includes(userId);
      const updatedWatchers = wasSubscribed
        ? watchers.filter(uid => uid !== userId)
        : [...watchers, userId];

      items[itemIdx].priceWatchers = updatedWatchers;
      setStored('marketplace_items', items);
      isSubscribed = !wasSubscribed;
      watchersCount = updatedWatchers.length;

      // Also persist to user local index
      const userWatchKey = `payv_price_watch_${userId}`;
      const userWatched = getStored(userWatchKey, [] as string[]);
      const updatedUserWatched = isSubscribed
        ? Array.from(new Set([...userWatched, itemId]))
        : userWatched.filter(id => id !== itemId);
      setStored(userWatchKey, updatedUserWatched);

      try {
        await setDoc(doc(firestore, 'marketplace_items', itemId), { priceWatchers: updatedWatchers }, { merge: true });
      } catch (e) {
        console.error("Firestore togglePriceWatch failed:", e);
      }
    }
    return { isSubscribed, watchersCount };
  },

  isUserPriceWatching: (itemId: string, userId: string): boolean => {
    if (!userId) return false;
    const userWatchKey = `payv_price_watch_${userId}`;
    const userWatched = getStored(userWatchKey, [] as string[]);
    if (userWatched.includes(itemId)) return true;

    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const item = items.find(i => i.id === itemId);
    return Boolean(item?.priceWatchers?.includes(userId));
  },

  getUserPriceWatchedItemIds: (userId: string): string[] => {
    if (!userId) return [];
    const userWatchKey = `payv_price_watch_${userId}`;
    const local = getStored(userWatchKey, [] as string[]);
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const fromItems = items.filter(i => i.priceWatchers?.includes(userId)).map(i => i.id);
    return Array.from(new Set([...local, ...fromItems]));
  },

  addToBasket: async (
    userId: string,
    item: MarketplaceItem,
    size?: string,
    color?: string
  ): Promise<any> => {
    const basket = getStored('basket', [] as BasketItem[]);
    const existingIdx = basket.findIndex(
      b => b.userId === userId && b.itemId === item.id && b.size === size && b.color === color
    );

    // Fetch seller info to include in basket for orders
    let sPhone = '';
    let sAddress = '';
    try {
      const sProf = await db.getSellerProfile(item.userId);
      if (sProf) {
        sPhone = sProf.contactPhone || '';
        sAddress = sProf.address || '';
      }
    } catch (e) {}

    let basketId = `basket_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    let quantity = 1;

    if (existingIdx !== -1) {
      basket[existingIdx].quantity += 1;
      basketId = basket[existingIdx].id;
      quantity = basket[existingIdx].quantity;
    } else {
      basket.push({
        id: basketId,
        userId,
        itemId: item.id,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        size,
        color,
        availableSizes: item.sizes,
        availableColors: item.colors,
        resalePrice: item.resalePrice,
        quantity: 1,
        shippingPrice: item.shippingPrice || 0,
        sellerId: item.userId,
        sellerName: item.userName || 'Unknown Shop',
        sellerPhone: sPhone,
        sellerAddress: sAddress,
      });
    }
    setStored('basket', basket);

    try {
      await setDoc(doc(firestore, 'basket', basketId), cleanData({
        id: basketId,
        userId,
        itemId: item.id,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        size: size || '',
        color: color || '',
        resalePrice: item.resalePrice || 0,
        quantity,
        shippingPrice: item.shippingPrice || 0,
        sellerId: item.userId,
        sellerName: item.userName || 'Unknown Shop',
        sellerPhone: sPhone,
        sellerAddress: sAddress,
      }));
    } catch (e) {
      console.error("Firestore addToBasket failed:", e);
      handleFirestoreError(e, OperationType.WRITE, `basket/${basketId}`);
    }
  },

  addMultipleToBasket: async (
    userId: string,
    items: {
      id?: string;
      itemId: string;
      title: string;
      price: number;
      quantity?: number;
      size?: string;
      color?: string;
      imageUrl?: string;
      resalePrice?: number;
      shippingPrice?: number;
      sellerId?: string;
      sellerName?: string;
      sellerPhone?: string;
      sellerAddress?: string;
    }[]
  ): Promise<number> => {
    if (!items || items.length === 0) return 0;
    const basket = getStored('basket', [] as BasketItem[]);
    let totalAdded = 0;

    const batch = writeBatch(firestore);
    let hasBatchOps = false;

    for (const item of items) {
      const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const existingIdx = basket.findIndex(
        b => b.userId === userId && b.itemId === item.itemId && (b.size || '') === (item.size || '') && (b.color || '') === (item.color || '')
      );

      let basketId = `basket_${Date.now()}_${Math.floor(Math.random() * 1000000)}_${totalAdded}`;
      let finalQty = qtyToAdd;

      if (existingIdx !== -1) {
        basket[existingIdx].quantity += qtyToAdd;
        basketId = basket[existingIdx].id;
        finalQty = basket[existingIdx].quantity;
      } else {
        const newBasketItem: BasketItem = {
          id: basketId,
          userId,
          itemId: item.itemId,
          title: item.title,
          price: item.price,
          imageUrl: item.imageUrl,
          size: item.size || '',
          color: item.color || '',
          availableSizes: [],
          availableColors: [],
          resalePrice: item.resalePrice || 0,
          quantity: qtyToAdd,
          shippingPrice: item.shippingPrice || 0,
          sellerId: item.sellerId || '',
          sellerName: item.sellerName || 'Sourced Item',
          sellerPhone: item.sellerPhone || '',
          sellerAddress: item.sellerAddress || ''
        };
        basket.push(newBasketItem);
      }

      try {
        batch.set(doc(firestore, 'basket', basketId), cleanData({
          id: basketId,
          userId,
          itemId: item.itemId,
          title: item.title,
          price: item.price,
          imageUrl: item.imageUrl,
          size: item.size || '',
          color: item.color || '',
          resalePrice: item.resalePrice || 0,
          quantity: finalQty,
          shippingPrice: item.shippingPrice || 0,
          sellerId: item.sellerId || '',
          sellerName: item.sellerName || 'Sourced Item',
          sellerPhone: item.sellerPhone || '',
          sellerAddress: item.sellerAddress || ''
        }), { merge: true });
        hasBatchOps = true;
      } catch (err) {
        console.warn("Error setting batch item for addMultipleToBasket:", err);
      }

      totalAdded += qtyToAdd;
    }

    setStored('basket', basket);

    if (hasBatchOps) {
      try {
        await batch.commit();
      } catch (err) {
        console.warn("Firestore batch addMultipleToBasket failed:", err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart_updated'));
    }

    return totalAdded;
  },

  getBasket: async (userId: string): Promise<BasketItem[]> => {
    try {
      const q = query(collection(firestore, 'basket'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const basket: BasketItem[] = [];
      snapshot.forEach(docSnap => {
        basket.push({ id: docSnap.id, ...docSnap.data() } as BasketItem);
      });
      return basket;
    } catch (e) {
      console.warn("Firestore getBasket failed, using fallback:", e);
    }
    const basket = getStored('basket', [] as BasketItem[]);
    return basket.filter(b => b.userId === userId);
  },

  getOrders: async (): Promise<any[]> => {
    const deletedIds = new Set(getStored<string[]>('payv_deleted_order_ids', []));
    let orders: any[] = [];
    try {
      const q = query(collection(firestore, 'orders'));
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const docId = docSnap.id;
        if (!deletedIds.has(docId)) {
          orders.push({ id: docId, _id: docId, ...docSnap.data() });
        }
      });
      if (orders.length > 0) {
        return orders.filter(o => !deletedIds.has(o.id) && !deletedIds.has(o._id));
      }
    } catch (e) {
      console.warn("Firestore getOrders failed, using local fallback:", e);
    }
    const local = getStored('orders', []);
    return (local || []).filter((o: any) => !deletedIds.has(o.id) && !deletedIds.has(o._id));
  },

  createOrder: async (orderData: any): Promise<any> => {
    const orderId = orderData.id || orderData._id || `ORD-${Date.now()}`;
    const fullOrder = {
      ...orderData,
      id: orderId,
      _id: orderId,
      createdAt: orderData.createdAt || new Date().toISOString()
    };

    // Remove from deleted ids if previously added
    try {
      const deletedIds = getStored<string[]>('payv_deleted_order_ids', []);
      const updatedDeleted = deletedIds.filter(id => id !== orderId);
      setStored('payv_deleted_order_ids', updatedDeleted);
    } catch (e) {}

    // 1. Save locally
    try {
      const orders = getStored('orders', [] as any[]);
      orders.unshift(fullOrder);
      setStored('orders', orders);
      localStorage.setItem(`payv_order_${orderId}`, JSON.stringify(fullOrder));
      localStorage.setItem(`payv_latest_order`, JSON.stringify(fullOrder));
    } catch (err) {
      console.warn("Local storage order save notice:", err);
    }

    // 2. Save to Firestore
    try {
      await setDoc(doc(firestore, 'orders', orderId), fullOrder, { merge: true });
    } catch (e) {
      console.warn("Firestore order create fallback:", e);
    }

    // 3. Process Loyalty Points (Redeem discount if applied, Award points for purchase)
    try {
      const buyerUserId = orderData.userId || orderData.buyerId;
      if (buyerUserId && !buyerUserId.startsWith('guest_') && buyerUserId !== 'sandbox-id') {
        // Redeem points if applied on checkout
        if (orderData.pointsRedeemed && Number(orderData.pointsRedeemed) > 0) {
          await db.redeemLoyaltyPoints(buyerUserId, Number(orderData.pointsRedeemed), orderId);
        }

        // Award points earned for the purchase (1 point per 1,000 IQD)
        const totalIqd = Number(orderData.total || orderData.totalPrice || orderData.subtotalPrice || 0);
        if (totalIqd > 0) {
          const earned = db.calculatePointsEarned(totalIqd);
          if (earned > 0) {
            await db.awardLoyaltyPoints(buyerUserId, earned, orderId);
          }
        }
      }
    } catch (ptsErr) {
      console.warn("Loyalty points processing in createOrder notice:", ptsErr);
    }

    return fullOrder;
  },

  updateOrderStatus: async (orderId: string, status: string): Promise<void> => {
    try {
      const orders = getStored<any[]>('orders', []);
      const idx = orders.findIndex(o => o.id === orderId || o._id === orderId);
      if (idx !== -1) {
        orders[idx].status = status;
        setStored('orders', orders);
      }
      await setDoc(doc(firestore, 'orders', orderId), { status }, { merge: true });
      window.dispatchEvent(new CustomEvent('orders_updated'));
    } catch (e) {
      console.warn("Firestore updateOrderStatus warning:", e);
    }
  },

  deleteOrder: async (orderId: string): Promise<void> => {
    // 0. Permanently record deleted ID in localStorage to guarantee it never returns in UI
    try {
      const deletedIds = getStored<string[]>('payv_deleted_order_ids', []);
      if (!deletedIds.includes(orderId)) {
        deletedIds.push(orderId);
        setStored('payv_deleted_order_ids', deletedIds);
      }
    } catch (err) {
      console.warn("Error tracking deleted order ID:", err);
    }

    // 1. Remove from local storage
    try {
      const orders = getStored('orders', [] as any[]);
      const updated = orders.filter(o => o.id !== orderId && o._id !== orderId);
      setStored('orders', updated);
      localStorage.removeItem(`payv_order_${orderId}`);
    } catch (err) {
      console.warn("Local order delete error:", err);
    }

    // 2. Remove from Firestore
    try {
      await deleteDoc(doc(firestore, 'orders', orderId));
    } catch (e) {
      console.warn("Firestore order delete notice:", e);
    }

    // 3. Notify backend API to remove from memory cache and admin Firestore
    try {
      await fetch('/api/payv/delete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
    } catch (err) {
      console.warn("Backend order delete error:", err);
    }
  },

  clearUserOrders: async (userId: string, userPhone?: string, userEmail?: string, userName?: string): Promise<void> => {
    const cleanPhone = (phone?: string) => (phone || '').replace(/[\s+-]/g, '');
    const targetPhoneClean = cleanPhone(userPhone);

    // 1. Clear local storage & record all matched order IDs as permanently deleted
    try {
      const orders = getStored('orders', [] as any[]);
      const deletedIds = getStored<string[]>('payv_deleted_order_ids', []);
      const matchedIds: string[] = [];

      const remaining = orders.filter(ord => {
        const ordPhone = cleanPhone(ord.phone || ord.buyerPhone || ord.customerPhone);
        const phoneMatch = Boolean(targetPhoneClean && ordPhone && (targetPhoneClean.includes(ordPhone) || ordPhone.includes(targetPhoneClean)));
        const userMatch = Boolean(ord.userId === userId || ord.buyerId === userId);
        const emailMatch = Boolean(userEmail && (ord.customerEmail || ord.buyerEmail) === userEmail);
        const nameMatch = Boolean(userName && (ord.customerName || ord.buyerName) === userName);

        if (phoneMatch || userMatch || emailMatch || nameMatch) {
          const ordId = ord.id || ord._id;
          if (ordId) {
            matchedIds.push(ordId);
            localStorage.removeItem(`payv_order_${ordId}`);
          }
          return false;
        }
        return true;
      });

      setStored('orders', remaining);
      const combined = Array.from(new Set([...deletedIds, ...matchedIds]));
      setStored('payv_deleted_order_ids', combined);
    } catch (err) {
      console.warn("Local orders clear error:", err);
    }

    // 2. Clear from Firestore
    try {
      const q = query(collection(firestore, 'orders'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      let count = 0;
      const extraDeletedIds: string[] = [];

      snapshot.forEach(docSnap => {
        const ord = docSnap.data();
        const ordPhone = cleanPhone(ord.phone || ord.buyerPhone || ord.customerPhone);
        const phoneMatch = Boolean(targetPhoneClean && ordPhone && (targetPhoneClean.includes(ordPhone) || ordPhone.includes(targetPhoneClean)));
        const userMatch = Boolean(ord.userId === userId || ord.buyerId === userId);
        const emailMatch = Boolean(userEmail && (ord.customerEmail || ord.buyerEmail) === userEmail);
        const nameMatch = Boolean(userName && (ord.customerName || ord.buyerName) === userName);

        if (phoneMatch || userMatch || emailMatch || nameMatch) {
          batch.delete(docSnap.ref);
          extraDeletedIds.push(docSnap.id);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        const currentDeleted = getStored<string[]>('payv_deleted_order_ids', []);
        setStored('payv_deleted_order_ids', Array.from(new Set([...currentDeleted, ...extraDeletedIds])));
      }
    } catch (e) {
      console.warn("Firestore clearUserOrders notice:", e);
    }

    // 3. Notify backend server
    try {
      await fetch('/api/payv/clear-user-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone: userPhone, email: userEmail, name: userName })
      });
    } catch (err) {
      console.warn("Backend clear user orders error:", err);
    }
  },

  updateBasketQuantity: async (basketId: string, quantity: number): Promise<void> => {
    // 1. Update local cache for immediate feedback fallback
    const basket = getStored('basket', [] as BasketItem[]);
    const idx = basket.findIndex(b => b.id === basketId);
    if (idx !== -1) {
      if (quantity <= 0) {
        basket.splice(idx, 1);
      } else {
        basket[idx].quantity = quantity;
      }
      setStored('basket', basket);
    }

    // 2. Update Firestore (ALWAYS try this)
    try {
      const docRef = doc(firestore, 'basket', basketId);
      if (quantity <= 0) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity }, { merge: true });
      }
    } catch (e) {
      console.error("Firestore update basket quantity failed:", e);
    }
  },

  removeMultipleFromBasket: async (basketIds: string[]): Promise<void> => {
    if (!basketIds || basketIds.length === 0) return;
    const idSet = new Set(basketIds);

    // 1. Update local cache
    const basket = getStored('basket', [] as BasketItem[]);
    const remaining = basket.filter(b => !idSet.has(b.id));
    setStored('basket', remaining);

    // 2. Update Firestore
    try {
      const batch = writeBatch(firestore);
      basketIds.forEach(id => {
        batch.delete(doc(firestore, 'basket', id));
      });
      await batch.commit();
    } catch (e) {
      console.warn("Firestore removeMultipleFromBasket error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart_updated'));
    }
  },

  updateBasketAttributes: async (basketId: string, color: string, size: string): Promise<void> => {
    const basket = getStored('basket', [] as BasketItem[]);
    const idx = basket.findIndex(b => b.id === basketId);
    if (idx === -1) return;

    const targetItem = basket[idx];
    
    // Check if another item with same ID, userId, size, and color already exists
    const duplicateIdx = basket.findIndex(
      b => b.id !== basketId && 
           b.userId === targetItem.userId && 
           b.itemId === targetItem.itemId && 
           b.size === size && 
           b.color === color
    );

    if (duplicateIdx !== -1) {
      // Merge into existing item
      basket[duplicateIdx].quantity += targetItem.quantity;
      // Remove current item
      basket.splice(idx, 1);
      setStored('basket', basket);
      
      try {
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'basket', basketId));
        batch.update(doc(firestore, 'basket', basket[duplicateIdx].id), { quantity: basket[duplicateIdx].quantity });
        await batch.commit();
      } catch (e) {
        console.error("Firestore merge basket items failed:", e);
      }
    } else {
      // Just update attributes
      basket[idx].color = color;
      basket[idx].size = size;
      setStored('basket', basket);
      try {
        await setDoc(doc(firestore, 'basket', basketId), { color, size }, { merge: true });
      } catch (e) {
        console.error("Firestore update basket item attributes failed:", e);
      }
    }
  },

  clearBasket: async (userId: string): Promise<void> => {
    // 1. Immediately clean local storage basket cache
    try {
      const basket = getStored('basket', [] as BasketItem[]);
      const remaining = basket.filter(b => b.userId && b.userId !== userId && b.userId !== 'sandbox-id');
      setStored('basket', remaining);
    } catch (err) {
      console.warn("Local basket clear error:", err);
    }

    // 2. Clean Firestore basket items in background with timeout protection
    (async () => {
      try {
        if (userId) {
          const q = query(collection(firestore, 'basket'), where('userId', '==', userId));
          const snapshot = await Promise.race([
            getDocs(q),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
          ]);
          if (snapshot && !snapshot.empty) {
            const batch = writeBatch(firestore);
            snapshot.forEach((docSnap: any) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        }

        // Also delete sandbox-id documents if any
        const qSandbox = query(collection(firestore, 'basket'), where('userId', '==', 'sandbox-id'));
        const snapSandbox = await Promise.race([
          getDocs(qSandbox),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
        if (snapSandbox && !snapSandbox.empty) {
          const batch2 = writeBatch(firestore);
          snapSandbox.forEach((docSnap: any) => {
            batch2.delete(docSnap.ref);
          });
          await batch2.commit();
        }
      } catch (e) {
        console.warn("Background Firestore clearBasket handled:", e);
      }
    })().catch(() => {});
  },

  updateDailyAnalytics: async (
    sellerId: string,
    metrics: Partial<Analytics>
  ): Promise<void> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    items.forEach(item => {
      if (item.userId === sellerId) {
        if (!item.analytics) {
          item.analytics = { views: 0, uniqueVisitors: 0, sales: 0, revenue: 0 };
        }
        if (metrics.views) item.analytics.views += metrics.views;
        if (metrics.uniqueVisitors) item.analytics.uniqueVisitors += metrics.uniqueVisitors;
        if (metrics.sales) item.analytics.sales += metrics.sales;
        if (metrics.revenue) item.analytics.revenue += Number(metrics.revenue);
      }
    });
    setStored('marketplace_items', items);
  },

  trackInteraction: async (
    userId: string,
    category: string,
    interactionType: string,
    sellerId: string
  ): Promise<void> => {
    const interactions = getStored('interactions', [] as any[]);
    interactions.push({
      id: `int_${Date.now()}`,
      userId,
      category,
      interactionType,
      sellerId,
      timestamp: Date.now(),
    });
    setStored('interactions', interactions);
  },

  deleteMarketplaceItem: async (itemId: string): Promise<void> => {
    (globalThis as any).__cachedMarketplaceItems = null;

    // Track permanently in deleted items blacklist
    try {
      const deletedIds = getStored<string[]>('payv_deleted_item_ids', []);
      if (!deletedIds.includes(itemId)) {
        deletedIds.push(itemId);
        setStored('payv_deleted_item_ids', deletedIds);
      }
    } catch (e) {}

    try {
      const items = getStored<MarketplaceItem[]>('marketplace_items', DEFAULT_ITEMS);
      const updated = items.filter(i => i.id !== itemId);
      setStored('marketplace_items', updated);
    } catch (e) {}

    try {
      const payvItems = getStored<MarketplaceItem[]>('payv_marketplace_items', []);
      const updatedPayv = payvItems.filter(i => i.id !== itemId);
      setStored('payv_marketplace_items', updatedPayv);
    } catch (e) {}

    try {
      await deleteDoc(doc(firestore, 'marketplace_items', itemId));
    } catch (e) {
      console.warn('Firestore delete error for item (ignored gracefully):', itemId, e);
    }

    try {
      window.dispatchEvent(new CustomEvent('payv_item_deleted', { detail: itemId }));
      window.dispatchEvent(new CustomEvent('marketplace_items_updated'));
    } catch (e) {}
  },

  deleteOldMarketplaceItems: async (days: number): Promise<number> => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    try {
      const q = query(collection(firestore, 'marketplace_items'));
      const snapshot = await getDocs(q);
      let deletedCount = 0;
      const batch = writeBatch(firestore);
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Delete if older than cutoff OR if createdAt is missing (assume it's an old placeholder)
        if (!data.createdAt || data.createdAt < cutoff) {
          batch.delete(docSnap.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
        const items = getStored('marketplace_items', DEFAULT_ITEMS);
        const updated = items.filter(i => i.createdAt && i.createdAt >= cutoff);
        setStored('marketplace_items', updated);
      }
      return deletedCount;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'marketplace_items/batch_cleanup');
      return 0;
    }
  },

  deleteAllMarketplaceItems: async (): Promise<number> => {
    try {
      console.log("Starting bulk delete of marketplace items...");
      const q = query(collection(firestore, 'marketplace_items'));
      const snapshot = await getDocs(q);
      let deletedCount = 0;
      
      // Clear localStorage immediately
      setStored('marketplace_items', []);

      if (snapshot.empty) return 0;

      // Delete in batches of 100 to avoid Firestore limits
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 100) {
        const batch = writeBatch(firestore);
        const chunk = docs.slice(i, i + 100);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        await batch.commit();
      }

      // Also clear sourcing bounties
      const q2 = query(collection(firestore, 'sourcing_bounties'));
      const snapshot2 = await getDocs(q2);
      if (!snapshot2.empty) {
        const batch2 = writeBatch(firestore);
        snapshot2.forEach((doc) => {
          batch2.delete(doc.ref);
        });
        await batch2.commit();
      }

      console.log(`Deleted ${deletedCount} items.`);
      return deletedCount;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'marketplace_items/clear_all');
      return 0;
    }
  },

  deleteDemoItems: async (): Promise<number> => {
    try {
      console.log("Starting delete of demo marketplace items and Payv accounts...");
      const q = query(collection(firestore, 'marketplace_items'));
      const snapshot = await getDocs(q);
      let deletedCount = 0;
      
      const batch = writeBatch(firestore);
      const demoIds = ['sandbox-id', 'current-user-id', 'guest'];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const title = (data.title || '').toLowerCase();
        const userName = (data.userName || '').toLowerCase();
        const sellerName = (data.sellerName || '').toLowerCase();
        
        const isDemoId = demoIds.includes(data.userId);
        const isSourcedDemo = title.includes('sourced') || title.includes('1600396644') || title.includes('sourced item');
        const isPayvDemo = userName.includes('e-bazirgan') || userName.includes('ebazirgan') || userName.includes('payv') || sellerName.includes('e-bazirgan') || sellerName.includes('ebazirgan') || sellerName.includes('payv');
        const isSampleTitle = title.includes('demo') || title.includes('sample') || title.includes('test');
        
        if (isDemoId || isSourcedDemo || isPayvDemo || isSampleTitle) {
          batch.delete(docSnap.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
      }

      // Always clear matching demo items from local storage as well
      const items = getStored('marketplace_items', []);
      const updated = items.filter((i: any) => {
        const title = (i.title || '').toLowerCase();
        const userName = (i.userName || '').toLowerCase();
        const sellerName = (i.sellerName || '').toLowerCase();
        const isDemoId = demoIds.includes(i.userId);
        const isSourcedDemo = title.includes('sourced') || title.includes('1600396644') || title.includes('sourced item');
        const isPayvDemo = userName.includes('e-bazirgan') || userName.includes('ebazirgan') || userName.includes('payv') || sellerName.includes('e-bazirgan') || sellerName.includes('ebazirgan') || sellerName.includes('payv');
        const isSampleTitle = title.includes('demo') || title.includes('sample') || title.includes('test');
        return !(isDemoId || isSourcedDemo || isPayvDemo || isSampleTitle);
      });
      setStored('marketplace_items', updated);

      // Also clean seller profiles matching Payv / E-BAZIRGAN direct
      const sellers = getStored('seller_profiles_v2', []);
      const updatedSellers = sellers.filter((s: any) => {
        const bName = (s.businessName || '').toLowerCase();
        return !(bName.includes('e-bazirgan') || bName.includes('ebazirgan') || bName.includes('payv') || demoIds.includes(s.userId || s.id));
      });
      setStored('seller_profiles_v2', updatedSellers);

      console.log(`Deleted ${deletedCount} demo items and Payv accounts.`);
      return deletedCount;
    } catch (e) {
      console.warn("deleteDemoItems error:", e);
      return 0;
    }
  },

  createSourcedPost: async (postData: any): Promise<MarketplaceItem> => {
    return db.addMarketplaceItem({
      userId: postData.userId || 'guest',
      userName: postData.userName || 'Sourced Item',
      title: postData.title || 'Sourced Item',
      description: postData.description || '',
      price: postData.price || 0,
      imageUrl: postData.imageUrl || '',
      category: postData.category || 'live',
      postType: postData.postType || 'marketplace',
      sellerPhone: postData.sellerPhone || ''
    });
  },

  addMarketplaceItem: async (item: Omit<MarketplaceItem, 'id' | 'createdAt' | 'likes' | 'saves'>): Promise<MarketplaceItem> => {
    // Safety compression for items to fit in Firestore and load ultra fast
    let primaryImg = item.imageUrl || '';
    if (primaryImg && primaryImg.startsWith('data:image')) {
      primaryImg = await compressBase64Image(primaryImg, 600, 0.6);
    }

    let allImgs = item.imageUrls || [];
    if (allImgs.length > 0) {
      allImgs = await Promise.all(
        allImgs.map(async (url) => {
          if (url && url.startsWith('data:image')) {
            return await compressBase64Image(url, 600, 0.6);
          }
          return url || '';
        })
      );
    }
    if (!primaryImg && allImgs.length > 0) {
      primaryImg = allImgs[0];
    }
    if (allImgs.length === 0 && primaryImg) {
      allImgs = [primaryImg];
    }

    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const autoCode = item.sourceCode || (item.customFields?.sourceCode) || (item.title && item.title.startsWith('SRC-') ? item.title : `SRC-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`);
    const newItem: MarketplaceItem = {
      ...item,
      id: itemId,
      sourceCode: autoCode,
      imageUrl: primaryImg,
      imageUrls: allImgs,
      createdAt: Date.now(),
      likes: [],
      saves: [],
      postType: item.postType || 'marketplace',
      isPublic: item.isPublic !== false,
      moderationStatus: item.moderationStatus || 'approved',
    };

    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const updatedItems = [newItem, ...items.filter((i: MarketplaceItem) => i.id !== itemId)];
    setStored('marketplace_items', updatedItems);
    (globalThis as any).__cachedMarketplaceItems = updatedItems;
    (globalThis as any).__lastMarketplaceFetchTime = Date.now();

    try {
      await setDoc(doc(firestore, 'marketplace_items', itemId), cleanData(newItem));
    } catch (e) {
      console.warn("Firestore setDoc marketplace_items error, item preserved locally:", e);
    }

    // Trigger local listeners
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payv_item_added', { detail: newItem }));
        window.dispatchEvent(new Event('payv_item_added'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (_) {}

    // 🔔 Notify all store followers about this new product inventory update
    const activeSellerId = newItem.userId || newItem.sellerId;
    const activeSellerName = newItem.userName || 'Store';

    if (activeSellerId) {
      setTimeout(async () => {
        try {
          const sellerProf = await db.getSellerProfile(activeSellerId);
          const followers = (sellerProf?.followers && Array.isArray(sellerProf.followers)) ? sellerProf.followers : [];

          if (followers.length > 0) {
            for (const followerId of followers) {
              if (!followerId || followerId === activeSellerId) continue;

              const notif: PriceUpdateNotification = {
                id: 'notif_store_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                userId: followerId,
                itemId: newItem.id,
                itemTitle: newItem.title,
                itemImageUrl: newItem.imageUrl || (newItem.imageUrls && newItem.imageUrls[0]) || '',
                oldPrice: newItem.price,
                newPrice: newItem.price,
                sellerId: activeSellerId,
                sellerName: sellerProf?.businessName || activeSellerName,
                createdAt: Date.now(),
                read: false,
                type: 'new_product',
                message: `✨ فرۆشگای (${sellerProf?.businessName || activeSellerName}) بەرهەمێکی نوێی دانا: "${newItem.title}" بە نرخی ${(newItem.price * 1500).toLocaleString()} دینار ($${newItem.price})`
              };

              const userNotifsKey = `payv_notifications_${followerId}`;
              const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
              if (!userNotifs.some(n => n.itemId === newItem.id && n.type === 'new_product')) {
                userNotifs.unshift(notif);
                setStored(userNotifsKey, userNotifs);
              }

              try {
                await setDoc(doc(firestore, 'notifications', notif.id), cleanData(notif));
              } catch (err) {
                console.warn("Firestore follower notification write error:", err);
              }
            }

            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('notification_updated', {
                  detail: {
                    type: 'new_product',
                    sellerId: activeSellerId,
                    sellerName: sellerProf?.businessName || activeSellerName,
                    itemId: newItem.id,
                    title: newItem.title,
                    price: newItem.price,
                    imageUrl: newItem.imageUrl
                  }
                }));
              }
            } catch (_) {}
          }
        } catch (err) {
          console.warn("Error sending store followers push notifications:", err);
        }
      }, 50);
    }

    return newItem;
  },

  addSellerProfile: async (seller: Omit<SellerProfile, 'id'>, userId: string): Promise<SellerProfile> => {
    // Safety compression for seller profiles
    if (seller.logoUrl && seller.logoUrl.startsWith('data:image')) {
      seller.logoUrl = await compressBase64Image(seller.logoUrl, 600, 0.6);
    }

    const sellers = getStored('seller_profiles_v2', DEFAULT_SELLERS);
    const newProfile: SellerProfile = {
      ...seller,
      id: userId,
      uid: userId,
    };
    
    const existingIdx = sellers.findIndex(s => s.id === userId);
    if (existingIdx !== -1) {
      sellers[existingIdx] = newProfile;
    } else {
      sellers.push(newProfile);
    }
    setStored('seller_profiles_v2', sellers);

    try {
      await setDoc(doc(firestore, 'seller_profiles', userId), newProfile, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `seller_profiles/${userId}`);
    }

    return newProfile;
  },

  toggleFollowSeller: async (sellerId: string, userId: string): Promise<string[]> => {
    const sellers = getStored('seller_profiles_v2', DEFAULT_SELLERS);
    const idx = sellers.findIndex(s => s.id === sellerId || s.uid === sellerId);
    let updatedFollowers: string[] = [];
    if (idx !== -1) {
      const followers = sellers[idx].followers || [];
      updatedFollowers = followers.includes(userId)
        ? followers.filter(id => id !== userId)
        : [...followers, userId];
      sellers[idx].followers = updatedFollowers;
      setStored('seller_profiles_v2', sellers);

      try {
        await setDoc(doc(firestore, 'seller_profiles', sellers[idx].id), { followers: updatedFollowers }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `seller_profiles/${sellers[idx].id}`);
      }
    } else {
      // Create profile dynamically if not found
      const newProf: SellerProfile = {
        id: sellerId,
        businessName: 'Premium Sourced Seller',
        followers: [userId]
      };
      sellers.push(newProf);
      setStored('seller_profiles_v2', sellers);
      updatedFollowers = [userId];

      try {
        await setDoc(doc(firestore, 'seller_profiles', sellerId), newProf);
      } catch (e) {
        console.error("Firestore toggleFollowSeller create failed:", e);
      }
    }
    return updatedFollowers;
  },

  deleteItemImage: async (itemId: string, imageUrlToDelete: string): Promise<void> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx !== -1) {
      const item = items[itemIdx];
      const imageUrls = item.imageUrls || [];
      const updatedImageUrls = imageUrls.filter(url => url !== imageUrlToDelete);
      item.imageUrls = updatedImageUrls;
      
      // If the primary imageUrl was the one deleted, pick the next one or fallback
      if (item.imageUrl === imageUrlToDelete) {
        item.imageUrl = updatedImageUrls[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80';
      }
      
      setStored('marketplace_items', items);

      try {
        await setDoc(doc(firestore, 'marketplace_items', itemId), { 
          imageUrl: item.imageUrl,
          imageUrls: updatedImageUrls 
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `marketplace_items/${itemId}`);
      }
    }
  },

  deleteItemVideo: async (itemId: string): Promise<void> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx !== -1) {
      items[itemIdx].videoUrl = undefined;
      setStored('marketplace_items', items);

      try {
        await updateDoc(doc(firestore, 'marketplace_items', itemId), { 
          videoUrl: null 
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `marketplace_items/${itemId}`);
      }
    }
  },

  bumpMarketplaceItem: async (itemId: string, updateData?: any) => {
    return bumpMarketplaceItem(itemId, updateData);
  },

  boostMarketplaceItem: async (itemId: string, durationDays: number = 7): Promise<MarketplaceItem | null> => {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx !== -1) {
      const now = Date.now();
      const expiresAt = now + (durationDays * 24 * 60 * 60 * 1000);
      const updatedItem = {
        ...items[itemIdx],
        isBoosted: true,
        boostExpiresAt: expiresAt,
        lastBumpedAt: now
      };
      items[itemIdx] = updatedItem;
      setStored('marketplace_items', items);

      try {
        await setDoc(doc(firestore, 'marketplace_items', itemId), {
          isBoosted: true,
          boostExpiresAt: expiresAt,
          lastBumpedAt: now
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `marketplace_items/${itemId}`);
      }
      return updatedItem;
    }
    return null;
  },

  saveMarketplaceItem: async (item: MarketplaceItem): Promise<void> => {
    (globalThis as any).__cachedMarketplaceItems = null;
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    setStored('marketplace_items', items);
    try {
      await setDoc(doc(firestore, 'marketplace_items', item.id), cleanData(item), { merge: true });
    } catch (e) {
      console.warn("Firestore saveMarketplaceItem error:", e);
    }
  },

  addAccount: async (newUser: User): Promise<User[]> => {
    let users = getStored<User[]>('users', []);
    // Prevent duplicate IDs or phone numbers
    users = users.filter(u => u.id !== newUser.id && (!newUser.phone || u.phone !== newUser.phone));
    // Put at the front of the list to make it active
    users.unshift(newUser);
    setStored('users', users);
    try {
      localStorage.removeItem('payv_signed_out');
      localStorage.setItem('payv_cached_user', JSON.stringify(newUser));
      localStorage.setItem('payv_custom_user_id', newUser.id);
      if (newUser.phone) {
        localStorage.setItem('payv_last_active_phone', newUser.phone);
      }
      localStorage.setItem('payv_profile_completed', 'true');
    } catch (_) {}
    try {
      await setDoc(doc(firestore, 'users', newUser.id), cleanData(newUser), { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${newUser.id}`);
    }
    return users;
  },

  switchAccount: (userId: string): User | null => {
    const users = getStored<User[]>('users', []);
    const targetIdx = users.findIndex(u => u.id === userId);
    let activeUser: User | null = null;
    if (targetIdx !== -1) {
      const [targetUser] = users.splice(targetIdx, 1);
      users.unshift(targetUser);
      setStored('users', users);
      activeUser = targetUser;
    } else {
      activeUser = users[0] || null;
    }
    if (activeUser && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('payv_signed_out');
        localStorage.setItem('payv_cached_user', JSON.stringify(activeUser));
        localStorage.setItem('payv_custom_user_id', activeUser.id);
        if (activeUser.phone) {
          localStorage.setItem('payv_last_active_phone', activeUser.phone);
        }
        localStorage.setItem('payv_profile_completed', 'true');
      } catch (_) {}
    }
    return activeUser;
  },

  getBounties: async (): Promise<SourcingBounty[]> => {
    try {
      const q = query(collection(firestore, 'sourcing_bounties'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const bounties: SourcingBounty[] = [];
      snapshot.forEach(docSnap => {
        bounties.push({ id: docSnap.id, ...docSnap.data() } as SourcingBounty);
      });
      return bounties;
    } catch (e) {
      console.warn("Firestore getBounties failed, using local fallback:", e);
      return getStored('sourcing_bounties', []);
    }
  },

  addBounty: async (bounty: Omit<SourcingBounty, 'id' | 'createdAt' | 'status'>): Promise<SourcingBounty> => {
    const bountyId = `bounty_${Date.now()}`;
    const newBounty: SourcingBounty = {
      ...bounty,
      id: bountyId,
      status: 'open',
      createdAt: Date.now(),
    };

    const bounties = getStored('sourcing_bounties', [] as SourcingBounty[]);
    bounties.unshift(newBounty);
    setStored('sourcing_bounties', bounties);

    try {
      await setDoc(doc(firestore, 'sourcing_bounties', bountyId), cleanData(newBounty));
    } catch (e) {
      console.error("Firestore addBounty failed:", e);
      handleFirestoreError(e, OperationType.WRITE, `sourcing_bounties/${bountyId}`);
    }
    return newBounty;
  },

  fulfillBounty: async (bountyId: string, fulfillerId: string): Promise<void> => {
    const bounties = getStored('sourcing_bounties', [] as SourcingBounty[]);
    const idx = bounties.findIndex(b => b.id === bountyId);
    if (idx !== -1) {
      bounties[idx].status = 'fulfilled';
      bounties[idx].fulfilledBy = fulfillerId;
      bounties[idx].fulfilledAt = Date.now();
      setStored('sourcing_bounties', bounties);

      try {
        await setDoc(doc(firestore, 'sourcing_bounties', bountyId), {
          status: 'fulfilled',
          fulfilledBy: fulfillerId,
          fulfilledAt: Date.now()
        }, { merge: true });
      } catch (e) {
        console.error("Firestore fulfillBounty failed:", e);
      }
    }
  },

  trackPresence: (productId: string, userId: string, avatar?: string): () => void => {
    const presenceId = `${productId}_${userId}`;
    const presenceRef = doc(firestore, 'presence', presenceId);
    
    setDoc(presenceRef, {
      productId,
      userId,
      avatar: avatar || '',
      lastActive: Date.now()
    }).catch(e => console.warn("Presence update failed:", e));

    return () => {
      deleteDoc(presenceRef).catch(e => console.warn("Presence cleanup failed:", e));
    };
  },

  onViewersChange: (productId: string, callback: (viewers: {userId: string, avatar: string}[]) => void): () => void => {
    const q = query(collection(firestore, 'presence'), where('productId', '==', productId));
    return onSnapshot(q, (snapshot) => {
      const viewers: {userId: string, avatar: string}[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        viewers.push({ userId: data.userId, avatar: data.avatar });
      });
      callback(viewers);
    }, (error) => {
      console.warn("Viewers listener failed:", error);
    });
  },

  // Live Sourcing Features
  logLiveSessionEvent: async (sessionId: string, eventType: string, details?: any): Promise<void> => {
    try {
      const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(firestore, 'live_session_logs', logId), cleanData({
        sessionId,
        eventType,
        details: details || {},
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn("Live session event logging failed:", e);
    }
  },

  startLiveSession: async (session: Omit<LiveSession, 'viewerCount' | 'createdAt'>): Promise<void> => {
    const sessionData: LiveSession = {
      ...session,
      viewerCount: 1,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(firestore, 'live_sessions', session.id), cleanData(sessionData));
      // Log session start event for stability debugging
      try {
        const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(firestore, 'live_session_logs', logId), cleanData({
          sessionId: session.id,
          eventType: 'stream_started',
          broadcasterId: session.broadcasterId,
          timestamp: Date.now()
        }));
      } catch (logErr) {
        console.warn("Log write warning:", logErr);
      }
    } catch (e) {
      console.error("Firestore startLiveSession failed:", e);
    }
  },

  endLiveSession: async (sessionId: string, retentionDays: number = 30): Promise<void> => {
    try {
      const retentionHours = retentionDays * 24;
      const expiresAt = Date.now() + retentionHours * 3600 * 1000;
      
      const sessionRef = doc(firestore, 'live_sessions', sessionId);
      const existingSnap = await getDoc(sessionRef).catch(() => null);
      const existingData = existingSnap && existingSnap.exists() ? existingSnap.data() : {};

      await setDoc(sessionRef, cleanData({ 
        ...existingData,
        status: 'ended',
        isReplay: true,
        savedByStreamer: true,
        videoUrl: existingData.videoUrl || '',
        title: existingData.title || existingData.featuredTitle || 'Saved Live Stream 🔴',
        featuredTitle: existingData.featuredTitle || existingData.title || 'Saved Live Stream 🔴',
        featuredPrice: existingData.featuredPrice || 25000,
        featuredImage: existingData.featuredImage || existingData.broadcasterAvatar || '',
        retentionHours,
        retentionDays,
        expiresAt,
        endedAt: Date.now()
      }), { merge: true });

      // Log session end event
      const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(firestore, 'live_session_logs', logId), cleanData({
        sessionId,
        eventType: 'stream_ended_saved',
        retentionHours,
        retentionDays,
        expiresAt,
        timestamp: Date.now()
      })).catch(() => {});
    } catch (e) {
      console.error("Firestore endLiveSession failed:", e);
    }
  },

  saveAndEndLiveSession: async (params: {
    sessionId: string;
    broadcasterId: string;
    broadcasterName: string;
    broadcasterAvatar?: string;
    title?: string;
    featuredTitle?: string;
    featuredPrice?: number;
    featuredImage?: string;
    location?: string;
    retentionDays?: number;
    videoUrl?: string;
  }): Promise<void> => {
    try {
      const retentionDays = params.retentionDays || 30;
      const retentionHours = retentionDays * 24;
      const expiresAt = Date.now() + retentionHours * 3600 * 1000;

      const sessionRef = doc(firestore, 'live_sessions', params.sessionId);
      const existingSnap = await getDoc(sessionRef).catch(() => null);
      const existingData = existingSnap && existingSnap.exists() ? existingSnap.data() : {};

      const updatedData = cleanData({
        ...existingData,
        id: params.sessionId,
        broadcasterId: params.broadcasterId,
        broadcasterName: params.broadcasterName || existingData.broadcasterName || 'User Streamer',
        broadcasterAvatar: params.broadcasterAvatar || existingData.broadcasterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${params.broadcasterId}`,
        status: 'ended',
        isReplay: true,
        savedByStreamer: true,
        title: params.title || existingData.title || 'Saved Live Stream 🔴',
        featuredTitle: params.featuredTitle || existingData.featuredTitle || params.title || 'Saved Live Stream 🔴',
        featuredPrice: params.featuredPrice || existingData.featuredPrice || 25000,
        featuredImage: params.featuredImage || existingData.featuredImage || existingData.broadcasterAvatar || '',
        location: params.location || existingData.location || 'Erbil',
        videoUrl: params.videoUrl || existingData.videoUrl || '',
        retentionHours,
        retentionDays,
        expiresAt,
        endedAt: Date.now(),
        createdAt: existingData.createdAt || Date.now()
      });

      await setDoc(sessionRef, updatedData, { merge: true });

      // Log session end event
      const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(firestore, 'live_session_logs', logId), cleanData({
        sessionId: params.sessionId,
        eventType: 'stream_ended_saved',
        retentionHours,
        retentionDays,
        expiresAt,
        timestamp: Date.now()
      })).catch(() => {});
    } catch (e) {
      console.error("Firestore saveAndEndLiveSession failed:", e);
    }
  },

  sendLiveHeartbeat: async (sessionId: string, currentFrame?: string): Promise<void> => {
    try {
      if (!sessionId) return;
      const sessionRef = doc(firestore, 'live_sessions', sessionId);
      const payload: any = {
        lastHeartbeat: Date.now(),
        status: 'live'
      };
      if (currentFrame) {
        payload.currentFrame = currentFrame;
      }
      await updateDoc(sessionRef, payload);
    } catch (e) {
      // Ignored for smooth periodic heartbeat
    }
  },

  deleteLiveSession: async (sessionId: string): Promise<void> => {
    try {
      if (!sessionId) return;
      await deleteDoc(doc(firestore, 'live_sessions', sessionId));
      // Log session delete event
      const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(firestore, 'live_session_logs', logId), cleanData({
        sessionId,
        eventType: 'stream_deleted_unsaved',
        timestamp: Date.now()
      })).catch(() => {});
    } catch (e) {
      console.error("Firestore deleteLiveSession failed:", e);
      throw e;
    }
  },

  getUserLiveSessions: async (userId: string): Promise<LiveSession[]> => {
    try {
      const q = query(
        collection(firestore, 'live_sessions'),
        where('broadcasterId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const sessions: LiveSession[] = [];
      const now = Date.now();
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as LiveSession;
        if (data.expiresAt && now > data.expiresAt) {
          deleteDoc(doc(firestore, 'live_sessions', docSnap.id)).catch(() => {});
          return;
        }
        sessions.push({ ...data, id: docSnap.id });
      });
      sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return sessions;
    } catch (e) {
      console.error("Firestore getUserLiveSessions failed:", e);
      return [];
    }
  },

  onUserLiveSessionsChange: (userId: string, callback: (sessions: LiveSession[]) => void): () => void => {
    const q = query(
      collection(firestore, 'live_sessions'),
      where('broadcasterId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const sessions: LiveSession[] = [];
      const now = Date.now();
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as LiveSession;
        if (data.expiresAt && now > data.expiresAt) {
          deleteDoc(doc(firestore, 'live_sessions', docSnap.id)).catch(() => {});
          return;
        }
        sessions.push({ ...data, id: docSnap.id });
      });
      sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(sessions);
    }, (error) => {
      console.warn("User live sessions listener failed:", error);
    });
  },

  pinProduct: async (sessionId: string, productId: string | null): Promise<void> => {
    try {
      await updateDoc(doc(firestore, 'live_sessions', sessionId), { pinnedProductId: productId });
    } catch (e) {
      console.error("Firestore pinProduct failed:", e);
    }
  },

  updateLiveSessionProduct: async (sessionId: string, productData: { featuredPrice?: number; featuredTitle?: string; featuredImage?: string; pinnedProductId?: string }): Promise<void> => {
    try {
      await updateDoc(doc(firestore, 'live_sessions', sessionId), cleanData(productData));
    } catch (e) {
      console.error("Firestore updateLiveSessionProduct failed:", e);
    }
  },

  onLiveSessionUpdate: (sessionId: string, callback: (session: LiveSession | null) => void): () => void => {
    return onSnapshot(doc(firestore, 'live_sessions', sessionId), (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as LiveSession);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn("Live session listener failed:", error);
    });
  },

  addLiveComment: async (comment: Omit<LiveComment, 'id' | 'createdAt'>): Promise<void> => {
    const commentId = `comment_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newComment: LiveComment = {
      ...comment,
      id: commentId,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(firestore, 'live_comments', commentId), cleanData(newComment));
    } catch (e) {
      console.error("Firestore addLiveComment failed:", e);
    }
  },

  onLiveCommentsChange: (sessionId: string, callback: (comments: LiveComment[]) => void): () => void => {
    const q = query(
      collection(firestore, 'live_comments'),
      where('sessionId', '==', sessionId),
      limit(100)
    );
    return onSnapshot(q, (snapshot) => {
      const comments: LiveComment[] = [];
      snapshot.forEach(docSnap => {
        comments.push({ id: docSnap.id, ...docSnap.data() } as LiveComment);
      });
      // Sort in memory to avoid index requirement
      comments.sort((a, b) => a.createdAt - b.createdAt);
      callback(comments);
    }, (error) => {
      console.warn("Live comments listener failed:", error);
    });
  },

  onLiveSessionsChange: (callback: (sessions: LiveSession[]) => void): () => void => {
    const q = query(
      collection(firestore, 'live_sessions'),
      limit(200)
    );
    return onSnapshot(q, (snapshot) => {
      const sessions: LiveSession[] = [];
      const now = Date.now();
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as LiveSession;
        const idLower = docSnap.id.toLowerCase();
        const bIdLower = (data.broadcasterId || '').toLowerCase();
        const titleLower = (data.title || '').toLowerCase();
        const fTitleLower = (data.featuredTitle || '').toLowerCase();
        const bNameLower = (data.broadcasterName || '').toLowerCase();
        const featImg = (data.featuredImage || '').toLowerCase();

        // 1. Purge if explicitly demo, perfume mock, or sample
        const isDemoOrMockPerfume = Boolean(
          data.isDemo || 
          idLower.startsWith('demo-') || 
          idLower.startsWith('sample-') ||
          bIdLower.startsWith('demo-') || 
          bIdLower.startsWith('sample-') ||
          titleLower.includes('عەتر') ||
          titleLower.includes('عطر') ||
          titleLower.includes('perfume') ||
          fTitleLower.includes('عەتر') ||
          fTitleLower.includes('عطر') ||
          fTitleLower.includes('perfume') ||
          featImg.includes('1523293182086')
        );

        if (isDemoOrMockPerfume) {
          deleteDoc(doc(firestore, 'live_sessions', docSnap.id)).catch(() => {});
          return;
        }

        // 2. Filter out expired replays to save storage
        if (data.expiresAt && now > data.expiresAt) {
          deleteDoc(doc(firestore, 'live_sessions', docSnap.id)).catch(() => {});
          return;
        }

        // 3. Filter out ended sessions
        if (data.status === 'ended') {
          return;
        }

        // 4. Stale live session cleanup: If a session is marked 'live' but was created over 60s ago and hasn't sent a heartbeat in 45s
        if (data.status === 'live') {
          const sessionAge = now - (data.createdAt || 0);
          const heartbeatAge = now - (data.lastHeartbeat || data.createdAt || 0);
          if (sessionAge > 60 * 1000 && heartbeatAge > 45 * 1000) {
            // Broadcaster abandoned stream without ending, delete to avoid ghost live cards
            deleteDoc(doc(firestore, 'live_sessions', docSnap.id)).catch(() => {});
            return;
          }
        }

        sessions.push({ ...data, id: docSnap.id });
      });
      // Sort in memory: live streams first, then replays by recency (endedAt or createdAt)
      sessions.sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (a.status !== 'live' && b.status === 'live') return 1;
        const timeA = a.endedAt || a.createdAt || 0;
        const timeB = b.endedAt || b.createdAt || 0;
        return timeB - timeA;
      });
      callback(sessions);
    }, (error) => {
      console.warn("Live sessions listener failed:", error);
    });
  },

  updateLiveViewerCount: async (sessionId: string, delta: number): Promise<void> => {
    try {
      const sessionRef = doc(firestore, 'live_sessions', sessionId);
      await updateDoc(sessionRef, {
        viewerCount: increment(delta)
      });
    } catch (e) {
      console.error("Firestore updateLiveViewerCount failed:", e);
    }
  },

  createLiveReport: async (report: Omit<LiveReport, 'id' | 'createdAt' | 'status'> & { id?: string; createdAt?: number; status?: 'pending' | 'resolved' | 'dismissed' }): Promise<string> => {
    const reportId = report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullReport: LiveReport = {
      ...report,
      id: reportId,
      createdAt: report.createdAt || Date.now(),
      status: report.status || 'pending',
      type: 'live_stream'
    };
    try {
      await setDoc(doc(firestore, 'live_reports', reportId), cleanData(fullReport));
    } catch (err) {
      console.warn("Firestore createLiveReport fallback:", err);
    }
    try {
      const local = JSON.parse(localStorage.getItem('payv_live_reports') || '[]');
      const filtered = local.filter((r: any) => r.id !== reportId);
      filtered.unshift(fullReport);
      localStorage.setItem('payv_live_reports', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('payv_live_reports_updated', { detail: fullReport }));
    } catch (e) {}
    return reportId;
  },

  getLiveReports: async (): Promise<LiveReport[]> => {
    try {
      const snap = await getDocs(query(collection(firestore, 'live_reports'), limit(100)));
      const reports: LiveReport[] = [];
      snap.forEach(d => {
        reports.push({ id: d.id, ...d.data() } as LiveReport);
      });
      if (reports.length > 0) {
        reports.sort((a, b) => b.createdAt - a.createdAt);
        return reports;
      }
    } catch (err) {
      console.warn("getLiveReports firestore error:", err);
    }
    try {
      const local: LiveReport[] = JSON.parse(localStorage.getItem('payv_live_reports') || '[]');
      return local.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      return [];
    }
  },

  onLiveReportsChange: (callback: (reports: LiveReport[]) => void): () => void => {
    try {
      const q = query(collection(firestore, 'live_reports'), limit(100));
      return onSnapshot(q, (snapshot) => {
        const reports: LiveReport[] = [];
        snapshot.forEach(docSnap => {
          reports.push({ id: docSnap.id, ...docSnap.data() } as LiveReport);
        });
        reports.sort((a, b) => b.createdAt - a.createdAt);
        callback(reports);
      }, (err) => {
        console.warn("Live reports listener error:", err);
        try {
          const local: LiveReport[] = JSON.parse(localStorage.getItem('payv_live_reports') || '[]');
          callback(local.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
          callback([]);
        }
      });
    } catch (err) {
      console.warn("onLiveReportsChange init error:", err);
      return () => {};
    }
  },

  updateLiveReportStatus: async (reportId: string, status: 'pending' | 'resolved' | 'dismissed'): Promise<void> => {
    try {
      await updateDoc(doc(firestore, 'live_reports', reportId), { status });
    } catch (err) {
      console.warn("updateLiveReportStatus firestore error:", err);
    }
    try {
      const local: LiveReport[] = JSON.parse(localStorage.getItem('payv_live_reports') || '[]');
      const updated = local.map(r => r.id === reportId ? { ...r, status } : r);
      localStorage.setItem('payv_live_reports', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('payv_live_reports_updated'));
    } catch (e) {}
  },

  deleteLiveReport: async (reportId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'live_reports', reportId));
    } catch (err) {
      console.warn("deleteLiveReport firestore error:", err);
    }
    try {
      const local: LiveReport[] = JSON.parse(localStorage.getItem('payv_live_reports') || '[]');
      const filtered = local.filter(r => r.id !== reportId);
      localStorage.setItem('payv_live_reports', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('payv_live_reports_updated'));
    } catch (e) {}
  },

  endLiveSessionByAdmin: async (sessionId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'live_sessions', sessionId));
    } catch (err) {
      console.warn("endLiveSessionByAdmin deleteDoc error:", err);
    }
    try {
      await updateDoc(doc(firestore, 'live_sessions', sessionId), {
        status: 'ended',
        endedAt: Date.now()
      });
    } catch (err) {}
  },

  // -------------------------------------------------------------
  // Item Reports Management (Firestore + Local)
  // -------------------------------------------------------------
  createItemReport: async (report: Omit<ItemReport, 'id' | 'createdAt' | 'status' | 'type'> & { id?: string; createdAt?: number; status?: 'pending' | 'resolved' | 'dismissed' }): Promise<string> => {
    const reportId = report.id || `irep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullReport: ItemReport = {
      ...report,
      id: reportId,
      createdAt: report.createdAt || Date.now(),
      status: report.status || 'pending',
      type: 'marketplace_item'
    };
    try {
      await setDoc(doc(firestore, 'marketplace_item_reports', reportId), cleanData(fullReport));
    } catch (err) {
      console.warn("Firestore createItemReport fallback:", err);
    }
    try {
      const local = JSON.parse(localStorage.getItem('payv_item_reports') || '[]');
      const filtered = local.filter((r: any) => r.id !== reportId);
      filtered.unshift(fullReport);
      localStorage.setItem('payv_item_reports', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('payv_item_reports_updated', { detail: fullReport }));
    } catch (e) {}
    return reportId;
  },

  getItemReports: async (): Promise<ItemReport[]> => {
    try {
      const snap = await getDocs(query(collection(firestore, 'marketplace_item_reports'), limit(100)));
      const reports: ItemReport[] = [];
      snap.forEach(d => {
        reports.push({ id: d.id, ...d.data() } as ItemReport);
      });
      if (reports.length > 0) {
        reports.sort((a, b) => b.createdAt - a.createdAt);
        return reports;
      }
    } catch (err) {
      console.warn("getItemReports firestore error:", err);
    }
    try {
      const local: ItemReport[] = JSON.parse(localStorage.getItem('payv_item_reports') || '[]');
      return local.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      return [];
    }
  },

  onItemReportsChange: (callback: (reports: ItemReport[]) => void): () => void => {
    try {
      const q = query(collection(firestore, 'marketplace_item_reports'), limit(100));
      return onSnapshot(q, (snapshot) => {
        const reports: ItemReport[] = [];
        snapshot.forEach(docSnap => {
          reports.push({ id: docSnap.id, ...docSnap.data() } as ItemReport);
        });
        reports.sort((a, b) => b.createdAt - a.createdAt);
        callback(reports);
      }, (err) => {
        console.warn("Item reports listener error:", err);
        try {
          const local: ItemReport[] = JSON.parse(localStorage.getItem('payv_item_reports') || '[]');
          callback(local.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
          callback([]);
        }
      });
    } catch (err) {
      console.warn("onItemReportsChange init error:", err);
      return () => {};
    }
  },

  updateItemReportStatus: async (reportId: string, status: 'pending' | 'resolved' | 'dismissed'): Promise<void> => {
    try {
      await updateDoc(doc(firestore, 'marketplace_item_reports', reportId), { status });
    } catch (err) {
      console.warn("updateItemReportStatus firestore error:", err);
    }
    try {
      const local: ItemReport[] = JSON.parse(localStorage.getItem('payv_item_reports') || '[]');
      const updated = local.map(r => r.id === reportId ? { ...r, status } : r);
      localStorage.setItem('payv_item_reports', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('payv_item_reports_updated'));
    } catch (e) {}
  },

  deleteItemReport: async (reportId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'marketplace_item_reports', reportId));
    } catch (err) {
      console.warn("deleteItemReport firestore error:", err);
    }
    try {
      const local: ItemReport[] = JSON.parse(localStorage.getItem('payv_item_reports') || '[]');
      const filtered = local.filter(r => r.id !== reportId);
      localStorage.setItem('payv_item_reports', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('payv_item_reports_updated'));
    } catch (e) {}
  },

  // -------------------------------------------------------------
  // User Strikes & Warnings System (Firestore + Notifications)
  // -------------------------------------------------------------
  issueUserStrike: async (
    targetUser: { id: string; name: string; phone?: string },
    strike: { level: 1 | 2 | 3; reason: string; message: string; adminEmail?: string }
  ): Promise<UserStrike> => {
    const strikeId = `strike_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullStrike: UserStrike = {
      id: strikeId,
      userId: targetUser.id,
      userName: targetUser.name,
      userPhone: targetUser.phone,
      level: strike.level,
      reason: strike.reason,
      message: strike.message,
      issuedByAdminEmail: strike.adminEmail || 'afsun2026app@gmail.com',
      createdAt: Date.now(),
      status: 'active'
    };

    // 1. Save to Firestore collection 'user_strikes'
    try {
      await setDoc(doc(firestore, 'user_strikes', strikeId), cleanData(fullStrike));
    } catch (err) {
      console.warn("Firestore issueUserStrike error:", err);
    }

    // 2. Dispatch official warning notification to user
    const warningNotif: PriceUpdateNotification = {
      id: `notif_strike_${strikeId}`,
      userId: targetUser.id,
      itemId: '',
      itemTitle: strike.level === 1 
        ? '⚠️ ئاگادارکردنەوەی فەرمی (سەرپێچی یەکەم)' 
        : strike.level === 2 
        ? '🚨 ئاگاداری توند و مەترسی سڕکردن (سەرپێچی دووەم)' 
        : '🚫 سزادان و هەڵپەساردنی ئەکاونت (سەرپێچی سێیەم)',
      oldPrice: 0,
      newPrice: 0,
      sellerId: 'admin_security',
      sellerName: 'دەستەی چاودێری و پاراستنی E-BAZIRGAN',
      createdAt: Date.now(),
      read: false,
      type: 'admin_warning',
      strikeLevel: strike.level,
      warningReason: strike.reason,
      message: strike.message,
      actionRequired: strike.level === 3 ? 'حسابەکەت سڕکراوە، تکایە پەیوەندی بە بەشی پشتگیری بکە.' : 'تکایە یاساکانی بازاڕ و پەخشی ڕاستەوخۆ پەیڕەو بکە.'
    };

    try {
      const userNotifsKey = `payv_notifications_${targetUser.id}`;
      const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
      userNotifs.unshift(warningNotif);
      setStored(userNotifsKey, userNotifs);
      await setDoc(doc(firestore, 'notifications', warningNotif.id), cleanData(warningNotif));
    } catch (e) {
      console.warn("Firestore send warning notification error:", e);
    }

    // 3. If level 3 (Permanent suspension), update user banned status
    if (strike.level === 3) {
      try {
        await updateDoc(doc(firestore, 'users', targetUser.id), { isBanned: true });
        const allUsers = getStored<User[]>('payv_registered_users', []);
        const updatedUsers = allUsers.map(u => u.id === targetUser.id ? { ...u, isBanned: true } : u);
        setStored('payv_registered_users', updatedUsers);
      } catch (e) {}
    }

    // 4. Log admin audit activity
    try {
      await db.logAdminActivity({
        action: `ناردنی وریارکردنەوەی ئاستی ${strike.level} بۆ (${targetUser.name}) - هۆکار: ${strike.reason}`,
        type: 'strike',
        targetId: targetUser.id,
        targetName: targetUser.name,
        details: strike.message,
        adminEmail: strike.adminEmail
      });
    } catch (e) {}

    // 5. Update local cache
    try {
      const local = JSON.parse(localStorage.getItem('payv_user_strikes') || '[]');
      local.unshift(fullStrike);
      localStorage.setItem('payv_user_strikes', JSON.stringify(local));
      window.dispatchEvent(new CustomEvent('payv_user_strikes_updated', { detail: fullStrike }));
      window.dispatchEvent(new CustomEvent('notification_updated'));
    } catch (e) {}

    return fullStrike;
  },

  getUserStrikes: async (userId?: string): Promise<UserStrike[]> => {
    try {
      let q = query(collection(firestore, 'user_strikes'), limit(150));
      if (userId) {
        q = query(collection(firestore, 'user_strikes'), where('userId', '==', userId), limit(50));
      }
      const snap = await getDocs(q);
      const strikes: UserStrike[] = [];
      snap.forEach(d => {
        strikes.push({ id: d.id, ...d.data() } as UserStrike);
      });
      if (strikes.length > 0) {
        strikes.sort((a, b) => b.createdAt - a.createdAt);
        return strikes;
      }
    } catch (err) {
      console.warn("getUserStrikes firestore error:", err);
    }
    try {
      const local: UserStrike[] = JSON.parse(localStorage.getItem('payv_user_strikes') || '[]');
      if (userId) return local.filter(s => s.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
      return local.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      return [];
    }
  },

  onUserStrikesChange: (callback: (strikes: UserStrike[]) => void): () => void => {
    try {
      const q = query(collection(firestore, 'user_strikes'), limit(150));
      return onSnapshot(q, (snapshot) => {
        const strikes: UserStrike[] = [];
        snapshot.forEach(docSnap => {
          strikes.push({ id: docSnap.id, ...docSnap.data() } as UserStrike);
        });
        strikes.sort((a, b) => b.createdAt - a.createdAt);
        callback(strikes);
      }, (err) => {
        console.warn("User strikes listener error:", err);
        try {
          const local: UserStrike[] = JSON.parse(localStorage.getItem('payv_user_strikes') || '[]');
          callback(local.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
          callback([]);
        }
      });
    } catch (err) {
      console.warn("onUserStrikesChange init error:", err);
      return () => {};
    }
  },

  // -------------------------------------------------------------
  // Admin Audit Trail & Activity Logs (Firestore)
  // -------------------------------------------------------------
  logAdminActivity: async (log: Omit<AdminActivityLog, 'id' | 'createdAt'>): Promise<string> => {
    const logId = `alog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullLog: AdminActivityLog = {
      ...log,
      id: logId,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(firestore, 'admin_activity_logs', logId), cleanData(fullLog));
    } catch (err) {
      console.warn("Firestore logAdminActivity error:", err);
    }
    try {
      const local = JSON.parse(localStorage.getItem('payv_admin_activity_logs') || '[]');
      local.unshift(fullLog);
      localStorage.setItem('payv_admin_activity_logs', JSON.stringify(local.slice(0, 100)));
      window.dispatchEvent(new CustomEvent('payv_admin_activity_logs_updated', { detail: fullLog }));
    } catch (e) {}
    return logId;
  },

  getAdminActivityLogs: async (): Promise<AdminActivityLog[]> => {
    try {
      const snap = await getDocs(query(collection(firestore, 'admin_activity_logs'), limit(100)));
      const logs: AdminActivityLog[] = [];
      snap.forEach(d => {
        logs.push({ id: d.id, ...d.data() } as AdminActivityLog);
      });
      if (logs.length > 0) {
        logs.sort((a, b) => b.createdAt - a.createdAt);
        return logs;
      }
    } catch (err) {
      console.warn("getAdminActivityLogs firestore error:", err);
    }
    try {
      const local: AdminActivityLog[] = JSON.parse(localStorage.getItem('payv_admin_activity_logs') || '[]');
      return local.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      return [];
    }
  },

  onAdminActivityLogsChange: (callback: (logs: AdminActivityLog[]) => void): () => void => {
    try {
      const q = query(collection(firestore, 'admin_activity_logs'), limit(100));
      return onSnapshot(q, (snapshot) => {
        const logs: AdminActivityLog[] = [];
        snapshot.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as AdminActivityLog);
        });
        logs.sort((a, b) => b.createdAt - a.createdAt);
        callback(logs);
      }, (err) => {
        console.warn("Admin logs listener error:", err);
        try {
          const local: AdminActivityLog[] = JSON.parse(localStorage.getItem('payv_admin_activity_logs') || '[]');
          callback(local.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
          callback([]);
        }
      });
    } catch (err) {
      console.warn("onAdminActivityLogsChange init error:", err);
      return () => {};
    }
  },

  adminRemoveMarketplaceItem: async (itemId: string, reason?: string, adminEmail?: string): Promise<void> => {
    // 1. Permanently remove via deleteMarketplaceItem to guarantee blacklist and cache flush
    await db.deleteMarketplaceItem(itemId);

    try {
      const items = getStored<MarketplaceItem[]>('marketplace_items', DEFAULT_ITEMS);
      const itemToDelete = items.find(i => i.id === itemId);

      if (itemToDelete) {
        const sellerTargetId = itemToDelete.userId || itemToDelete.sellerId || 'unknown_seller';
        // Send take-down notice to seller
        const removalNotif: PriceUpdateNotification = {
          id: `notif_rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: sellerTargetId,
          itemId: itemToDelete.id,
          itemTitle: `کاڵاکەت سڕایەوە: ${itemToDelete.title}`,
          itemImageUrl: itemToDelete.imageUrl,
          oldPrice: itemToDelete.price,
          newPrice: 0,
          sellerId: 'admin_security',
          sellerName: 'دەستەی چاودێری بازاڕ',
          createdAt: Date.now(),
          read: false,
          type: 'admin_warning',
          strikeLevel: 1,
          warningReason: reason || 'سەرپێچی لە ڕێنماییەکانی بازاڕ',
          message: reason || 'ئەم بەرهەمە لەبەر پێچەوانەبوون لەگەڵ ڕێنماییەکانی بازاڕ سڕاوەتەوە.',
          actionRequired: 'تکایە بەرهەمی ساختە، دووبارە یان قەدەغەکراو بڵاو مەکەرەوە.'
        };

        const userNotifsKey = `payv_notifications_${sellerTargetId}`;
        const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
        userNotifs.unshift(removalNotif);
        setStored(userNotifsKey, userNotifs);

        try {
          await setDoc(doc(firestore, 'notifications', removalNotif.id), cleanData(removalNotif));
        } catch (err) {}
        
        await db.logAdminActivity({
          action: `سڕینەوەی کاڵای سەرپێچیکار (${itemToDelete.title})`,
          type: 'delete_item',
          targetId: itemId,
          targetName: itemToDelete.title,
          details: reason,
          adminEmail
        });
      }

      window.dispatchEvent(new CustomEvent('payv_item_deleted', { detail: itemId }));
      window.dispatchEvent(new CustomEvent('notification_updated'));
    } catch (e) {}
  },

  adminSendItemViolationNotice: async (
    item: MarketplaceItem,
    notice: {
      reason: string;
      message: string;
      strikeLevel?: 1 | 2 | 3;
      deleteItem?: boolean;
      adminEmail?: string;
    }
  ): Promise<{ success: boolean; notificationId: string }> => {
    const notifId = `notif_violation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sellerTargetId = item.userId || item.sellerId || 'unknown_seller';

    // 1. Prepare official violation notification
    const violationNotif: PriceUpdateNotification = {
      id: notifId,
      userId: sellerTargetId,
      itemId: item.id,
      itemTitle: notice.deleteItem ? `⚠️ سڕینەوەی کاڵا بەهۆی سەرپێچی: ${item.title}` : `⚠️ ئاگاداری فەرمی سەرپێچی کاڵا: ${item.title}`,
      itemImageUrl: item.imageUrl,
      oldPrice: item.price,
      newPrice: item.price,
      sellerId: 'admin_security',
      sellerName: 'دەستەی چاودێری و پاراستنی E-BAZIRGAN',
      createdAt: Date.now(),
      read: false,
      type: 'admin_warning',
      strikeLevel: notice.strikeLevel || 1,
      warningReason: notice.reason,
      message: notice.message,
      actionRequired: notice.deleteItem
        ? 'ئەم کاڵایە لە بازاڕ سڕایەوە. دووبارەبوونەوەی سەرپێچی دەبێتە هۆی سڕکردنی هەمیشەیی هەژمارەکەت.'
        : 'تکایە بە زووترین کات کاڵاکەت بەپێی یاساکانی بازاڕ دەستکاری بکە یان زانیارییەکان ڕاست بکەرەوە.'
    };

    // 2. Save notification to user's notifications in Firestore & localStorage
    try {
      const userNotifsKey = `payv_notifications_${sellerTargetId}`;
      const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
      userNotifs.unshift(violationNotif);
      setStored(userNotifsKey, userNotifs);
      await setDoc(doc(firestore, 'notifications', violationNotif.id), cleanData(violationNotif));
    } catch (e) {
      console.warn("Firestore send violation notification error:", e);
    }

    // 3. If strike requested, issue strike
    if (notice.strikeLevel) {
      try {
        await db.issueUserStrike(
          { id: sellerTargetId, name: item.userName || 'فرۆشیار', phone: item.sellerPhone },
          {
            level: notice.strikeLevel,
            reason: `سەرپێچی لە کاڵای (${item.title}): ${notice.reason}`,
            message: notice.message,
            adminEmail: notice.adminEmail || 'afsun2026app@gmail.com'
          }
        );
      } catch (e) {
        console.warn("issueUserStrike error:", e);
      }
    }

    // 4. If delete requested, delete the item
    if (notice.deleteItem) {
      await db.deleteMarketplaceItem(item.id);
    }

    // 5. Log admin activity
    try {
      await db.logAdminActivity({
        action: `${notice.deleteItem ? 'سڕینەوە و ' : ''}ناردنی ئاگاداری سەرپێچی بۆ فرۆشیاری کاڵای (${item.title}) - هۆکار: ${notice.reason}`,
        type: notice.deleteItem ? 'delete_item' : 'warning',
        targetId: item.id,
        targetName: item.title,
        details: notice.message,
        adminEmail: notice.adminEmail || 'afsun2026app@gmail.com'
      });
    } catch (e) {}

    // 6. Dispatch update events
    try {
      window.dispatchEvent(new CustomEvent('notification_updated'));
      if (notice.deleteItem) {
        window.dispatchEvent(new CustomEvent('payv_item_deleted', { detail: item.id }));
        window.dispatchEvent(new CustomEvent('marketplace_items_updated'));
      }
    } catch (e) {}

    return { success: true, notificationId: notifId };
  },

  getOrder: async (orderId: string): Promise<Order | null> => {
    try {
      const docSnap = await getDoc(doc(firestore, 'orders', orderId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Order;
      }
      return null;
    } catch (err) {
      console.error("Error fetching order:", err);
      return null;
    }
  },

  subscribeToOrder: (orderId: string, callback: (order: Order | null) => void) => {
    return onSnapshot(doc(firestore, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        callback(null);
      }
    });
  },

  getDailyStories: async (): Promise<DailyStory[]> => {
    const now = Date.now();
    try {
      const q = query(
        collection(firestore, 'daily_stories'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const stories: DailyStory[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as DailyStory;
        if (data.expiresAt && now > data.expiresAt) {
          deleteDoc(doc(firestore, 'daily_stories', docSnap.id)).catch(() => {});
          return;
        }
        stories.push({ ...data, id: docSnap.id });
      });

      stories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStored('daily_stories', stories);
      return stories;
    } catch (e) {
      console.warn("Firestore getDailyStories failed, fallback to local:", e);
    }

    const local = getStored('daily_stories', [] as DailyStory[]);
    const validLocal = local.filter((s: DailyStory) => s.expiresAt > now);
    setStored('daily_stories', validLocal);
    return validLocal;
  },

  addDailyStory: async (story: Omit<DailyStory, 'id' | 'createdAt' | 'expiresAt' | 'views' | 'likes'>): Promise<DailyStory> => {
    const id = `story_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();
    const newStory: DailyStory = {
      ...story,
      id,
      createdAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000), // 24 hours
      views: [],
      likes: [],
      comments: []
    };

    const existing = getStored('daily_stories', []);
    const updated = [newStory, ...existing.filter((s: DailyStory) => s.expiresAt > now)];
    setStored('daily_stories', updated);

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('payv_stories_updated'));
      }
    } catch (_) {}

    // Firestore async save with 3-second timeout protection to ensure UI never hangs
    try {
      const firestorePromise = setDoc(doc(firestore, 'daily_stories', id), cleanData(newStory));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      await Promise.race([firestorePromise, timeoutPromise]).catch(e => {
        console.warn("Firestore addDailyStory timeout or non-critical error:", e);
      });
    } catch (e) {
      console.error("Firestore addDailyStory error:", e);
    }

    return newStory;
  },

  addStoryComment: async (
    storyId: string, 
    comment: { userId: string; userName: string; userAvatar?: string; text: string }
  ): Promise<StoryComment> => {
    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newComment: StoryComment = {
      id: commentId,
      storyId,
      userId: comment.userId,
      userName: comment.userName,
      userAvatar: comment.userAvatar,
      text: comment.text.trim(),
      createdAt: Date.now()
    };

    // 1. Update local storage immediately
    const existingStories: DailyStory[] = getStored('daily_stories', []);
    const story = existingStories.find(s => s.id === storyId);
    if (story) {
      story.comments = [...(story.comments || []), newComment];
      setStored('daily_stories', existingStories);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('payv_stories_updated'));
    }

    // 2. Update Firestore daily_stories document with merge to guarantee persistence
    try {
      const storyRef = doc(firestore, 'daily_stories', storyId);
      const snap = await getDoc(storyRef);
      let currentComments: StoryComment[] = [];
      if (snap.exists()) {
        const data = snap.data() as DailyStory;
        currentComments = data.comments || [];
      } else if (story?.comments) {
        currentComments = story.comments;
      }
      const updatedCommentsList = [...currentComments.filter(c => c.id !== newComment.id), cleanData(newComment)];
      await setDoc(storyRef, { comments: updatedCommentsList }, { merge: true });
    } catch (e) {
      console.warn("Firestore addStoryComment error:", e);
    }

    // 3. Direct In-App Chat Message to the Story Owner's Inbox
    const storyOwnerId = story?.sellerId || 'seller_ebazirgan';
    const storyTitle = story?.product?.title || (story?.caption ? (story.caption.length > 35 ? story.caption.slice(0, 35) + '...' : story.caption) : 'چیرۆکی ۲٤ کاتژمێری');
    const storyThumb = story?.mediaUrl || story?.product?.imageUrl || '';

    if (comment.userId && storyOwnerId && comment.userId !== storyOwnerId) {
      try {
        const replyMsg = `💬 وەڵام بۆ چیرۆک: "${newComment.text}"`;
        await db.sendChatMessage({
          senderId: comment.userId,
          senderName: comment.userName,
          senderAvatar: comment.userAvatar,
          recipientId: storyOwnerId,
          recipientName: story?.sellerName || 'فرۆشیار',
          recipientAvatar: story?.sellerAvatar || '',
          text: replyMsg,
          imageUrl: storyThumb || undefined,
          itemId: story?.product?.id || story?.id,
          itemTitle: storyTitle,
          itemImage: storyThumb,
          itemPrice: story?.product?.price || 0,
          createdAt: Date.now()
        });
      } catch (chatErr) {
        console.warn("sendChatMessage for story reply error:", chatErr);
      }
    }

    // 4. Notify the story owner AND the commenter in Notifications Center
    // A. Notification for the story owner
    const ownerNotifId = `notif_own_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ownerNotif: PriceUpdateNotification = {
      id: ownerNotifId,
      userId: storyOwnerId,
      itemId: story?.id || storyId,
      itemTitle: storyTitle,
      itemImageUrl: storyThumb,
      oldPrice: 0,
      newPrice: story?.product?.price || 0,
      sellerId: comment.userId,
      sellerName: comment.userName,
      createdAt: Date.now(),
      read: false,
      type: 'story_comment',
      message: `💬 وەڵام بۆ چیرۆک لەلایەن ${comment.userName}: "${newComment.text}"`
    };

    const ownerNotifsKey = `payv_notifications_${storyOwnerId}`;
    const ownerNotifs = getStored<PriceUpdateNotification[]>(ownerNotifsKey, []);
    setStored(ownerNotifsKey, [ownerNotif, ...ownerNotifs]);

    // B. Notification for the commenter (so the user posting sees their real comment in their alerts center)
    const commenterNotifId = `notif_usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const commenterNotif: PriceUpdateNotification = {
      id: commenterNotifId,
      userId: comment.userId,
      itemId: story?.id || storyId,
      itemTitle: storyTitle,
      itemImageUrl: storyThumb,
      oldPrice: 0,
      newPrice: story?.product?.price || 0,
      sellerId: storyOwnerId,
      sellerName: comment.userName || story?.sellerName || 'بەکارهێنەر',
      createdAt: Date.now(),
      read: false,
      type: 'story_comment',
      message: `💬 وەڵام بۆ چیرۆک: "${newComment.text}"`
    };

    const userNotifsKey = `payv_notifications_${comment.userId}`;
    const userNotifs = getStored<PriceUpdateNotification[]>(userNotifsKey, []);
    setStored(userNotifsKey, [commenterNotif, ...userNotifs]);

    // C. Also store for guest_user in case they are browsing in preview mode
    const guestKey = 'payv_notifications_guest_user';
    const guestNotifs = getStored<PriceUpdateNotification[]>(guestKey, []);
    setStored(guestKey, [commenterNotif, ...guestNotifs]);

    try {
      await Promise.all([
        setDoc(doc(firestore, 'notifications', ownerNotif.id), cleanData(ownerNotif)),
        setDoc(doc(firestore, 'notifications', commenterNotif.id), cleanData(commenterNotif))
      ]);
    } catch (e) {
      console.warn("Firestore story comment notification write failed:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification_updated'));
    }

    return newComment;
  },

  deleteDailyStory: async (storyId: string): Promise<void> => {
    const existing = getStored('daily_stories', []);
    setStored('daily_stories', existing.filter((s: DailyStory) => s.id !== storyId));
    try {
      await deleteDoc(doc(firestore, 'daily_stories', storyId));
    } catch (e) {
      console.error("Firestore deleteDailyStory error:", e);
    }
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('payv_stories_updated'));
      }
    } catch (_) {}
  },

  likeDailyStory: async (storyId: string, userId: string, likerName?: string): Promise<void> => {
    const existing: DailyStory[] = getStored('daily_stories', []);
    const story = existing.find(s => s.id === storyId);
    let isLikedNow = false;
    if (story) {
      const likes = story.likes || [];
      const hasLiked = likes.includes(userId);
      isLikedNow = !hasLiked;
      story.likes = hasLiked ? likes.filter(id => id !== userId) : [...likes, userId];
      setStored('daily_stories', existing);
    }

    try {
      const storyRef = doc(firestore, 'daily_stories', storyId);
      const snap = await getDoc(storyRef);
      if (snap.exists()) {
        const data = snap.data() as DailyStory;
        const likes = data.likes || [];
        const hasLiked = likes.includes(userId);
        const newLikes = hasLiked ? likes.filter(id => id !== userId) : [...likes, userId];
        await updateDoc(storyRef, { likes: newLikes });
      }
    } catch (e) {
      console.warn("Firestore likeDailyStory error:", e);
    }

    // Deliver real notification to the story owner if liked
    if (isLikedNow && story && story.sellerId) {
      const likeNotifId = `notif_like_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const likeNotif: PriceUpdateNotification = {
        id: likeNotifId,
        userId: story.sellerId,
        itemId: story.id,
        itemTitle: story.product?.title || 'چیرۆکی ۲٤ کاتژمێری',
        itemImageUrl: story.mediaUrl,
        oldPrice: 0,
        newPrice: story.product?.price || 0,
        sellerId: userId,
        sellerName: likerName || 'بەکارهێنەر',
        createdAt: Date.now(),
        read: false,
        type: 'story_comment',
        message: `${likerName || 'بەکارهێنەر'} چیرۆکەکەت بەدڵ بوو! ❤️`
      };

      const sellerNotifsKey = `payv_notifications_${story.sellerId}`;
      const sellerNotifs = getStored<PriceUpdateNotification[]>(sellerNotifsKey, []);
      setStored(sellerNotifsKey, [likeNotif, ...sellerNotifs]);

      try {
        await setDoc(doc(firestore, 'notifications', likeNotif.id), cleanData(likeNotif));
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification_updated'));
      }
    }
  },

  viewDailyStory: async (storyId: string, userId: string): Promise<void> => {
    const existing: DailyStory[] = getStored('daily_stories', []);
    const story = existing.find(s => s.id === storyId);
    if (story) {
      const views = story.views || [];
      if (!views.includes(userId)) {
        story.views = [...views, userId];
        setStored('daily_stories', existing);
      }
    }

    try {
      const storyRef = doc(firestore, 'daily_stories', storyId);
      const snap = await getDoc(storyRef);
      if (snap.exists()) {
        const data = snap.data() as DailyStory;
        const views = data.views || [];
        if (!views.includes(userId)) {
          await updateDoc(storyRef, { views: [...views, userId] });
        }
      }
    } catch (e) {
      // silent view update
    }
  },

  onDailyStoriesChange: (callback: (stories: DailyStory[]) => void): () => void => {
    const q = query(collection(firestore, 'daily_stories'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const stories: DailyStory[] = [];
      const now = Date.now();
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as DailyStory;
        if (data.expiresAt && now > data.expiresAt) {
          deleteDoc(doc(firestore, 'daily_stories', docSnap.id)).catch(() => {});
          return;
        }
        stories.push({ ...data, id: docSnap.id });
      });
      stories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(stories);
    }, (error) => {
      console.warn("Daily stories listener failed:", error);
    });
  },

  getAds: async (): Promise<Ad[]> => {
    try {
      const q = query(collection(firestore, 'ads'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
    } catch (e) {
      console.warn("Firestore getAds failed:", e);
      return [];
    }
  },

  addAd: async (ad: Omit<Ad, 'id' | 'createdAt'>): Promise<Ad> => {
    const id = `ad_${Date.now()}`;
    const newAd: Ad = { ...ad, id, createdAt: Date.now() };
    await setDoc(doc(firestore, 'ads', id), newAd);
    return newAd;
  },

  deleteAd: async (id: string): Promise<void> => {
    await deleteDoc(doc(firestore, 'ads', id));
  },

  getAllAccountingTransactions: async (): Promise<AccountingTransaction[]> => {
    try {
      const q = query(collection(firestore, 'accounting_transactions'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingTransaction));
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return items;
    } catch (e) {
      console.warn("Firestore getAllAccountingTransactions failed, searching localStorage:", e);
      // Scan all localStorage keys starting with payv_txs_
      const allTx: AccountingTransaction[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('payv_txs_')) {
            const val = getStored<AccountingTransaction[]>(key, []);
            allTx.push(...val);
          }
        }
      } catch (err) {
        console.warn("Local storage scan error:", err);
      }
      return allTx;
    }
  },

  getAccountingTransactions: async (userId: string): Promise<AccountingTransaction[]> => {
    if (!userId) return [];
    try {
      const q = query(
        collection(firestore, 'accounting_transactions'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingTransaction));
      items.sort((a, b) => b.createdAt - a.createdAt);
      setStored(`payv_txs_${userId}`, items);
      return items;
    } catch (e) {
      console.warn("Firestore getAccountingTransactions failed, fallback to local:", e);
      return getStored<AccountingTransaction[]>(`payv_txs_${userId}`, []);
    }
  },

  saveAccountingTransaction: async (tx: Omit<AccountingTransaction, 'id' | 'createdAt'> & { id?: string }): Promise<AccountingTransaction> => {
    const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const fullTx: AccountingTransaction = {
      id,
      userId: tx.userId,
      type: tx.type,
      title: tx.title,
      amount: Number(tx.amount) || 0,
      amountUsd: tx.amountUsd !== undefined ? Number(tx.amountUsd) : undefined,
      currency: tx.currency || 'IQD',
      exchangeRate: tx.exchangeRate !== undefined ? Number(tx.exchangeRate) : undefined,
      category: tx.category || 'General',
      date: tx.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      note: tx.note || '',
      customerName: tx.customerName || '',
      customerPhone: tx.customerPhone || '',
      partnerMerchantId: tx.partnerMerchantId || '',
      partnerType: tx.partnerType,
      status: tx.status || (tx.type === 'debt' ? 'unpaid' : 'paid'),
      saleMode: tx.saleMode,
      items: tx.items && tx.items.length > 0 ? tx.items : undefined,
      quantity: tx.quantity !== undefined ? Number(tx.quantity) : undefined,
      unitType: tx.unitType,
      unitPrice: tx.unitPrice !== undefined ? Number(tx.unitPrice) : undefined,
      discount: tx.discount !== undefined ? Number(tx.discount) : undefined,
      shippingFee: tx.shippingFee !== undefined ? Number(tx.shippingFee) : undefined,
      paymentType: tx.paymentType,
      paidAmount: tx.paidAmount !== undefined ? Number(tx.paidAmount) : undefined,
      remainingDebt: tx.remainingDebt !== undefined ? Number(tx.remainingDebt) : undefined,
      invoiceNumber: tx.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      direction: tx.direction
    };

    try {
      await setDoc(doc(firestore, 'accounting_transactions', id), cleanData(fullTx));
    } catch (e) {
      console.warn("Firestore saveAccountingTransaction failed:", e);
    }

    // Update local cache
    const existing = getStored<AccountingTransaction[]>(`payv_txs_${tx.userId}`, []);
    const filtered = existing.filter(t => t.id !== id);
    const updated = [fullTx, ...filtered];
    setStored(`payv_txs_${tx.userId}`, updated);
    return fullTx;
  },

  deleteAccountingTransaction: async (id: string, userId: string): Promise<void> => {
    try {
      await deleteDoc(doc(firestore, 'accounting_transactions', id));
    } catch (e) {
      console.warn("Firestore deleteAccountingTransaction failed:", e);
    }
    const existing = getStored<AccountingTransaction[]>(`payv_txs_${userId}`, []);
    const updated = existing.filter(t => t.id !== id);
    setStored(`payv_txs_${userId}`, updated);
  },

  updateMarketplaceItemPrice: async (
    itemId: string,
    newPrice: number,
    sellerId: string,
    sellerName?: string
  ): Promise<{ success: boolean; notifiedCount: number; oldPrice: number; error?: string }> => {
    let items = getStored('marketplace_items', DEFAULT_ITEMS);
    let itemIdx = items.findIndex(i => i.id === itemId);
    
    let currentItem: MarketplaceItem | null = itemIdx !== -1 ? items[itemIdx] : null;

    // Check remote Firestore item if available to merge saves
    try {
      const docRef = doc(firestore, 'marketplace_items', itemId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = { id: snap.id, ...snap.data() } as MarketplaceItem;
        if (!currentItem) {
          currentItem = remoteData;
        } else if (remoteData.saves) {
          currentItem.saves = Array.from(new Set([...(currentItem.saves || []), ...remoteData.saves]));
        }
      }
    } catch (e) {
      console.warn("Firestore fetch single item for price update:", e);
    }

    if (!currentItem) {
      return { success: false, notifiedCount: 0, oldPrice: 0, error: 'Item not found' };
    }

    const itemOwnerId = currentItem.userId || currentItem.sellerId;
    const isOwner = Boolean(sellerId && (itemOwnerId === sellerId || currentItem.sellerId === sellerId));
    const isAdmin = Boolean(sellerId && (sellerId === 'admin' || sellerId.startsWith('admin-') || sellerId === 'sandbox-id'));
    if (sellerId && !isOwner && !isAdmin) {
      return { success: false, notifiedCount: 0, oldPrice: currentItem.price, error: 'Unauthorized: Only the creator can edit this post.' };
    }

    const oldPrice = currentItem.price;
    currentItem.price = newPrice;

    if (itemIdx !== -1) {
      items[itemIdx] = currentItem;
      setStored('marketplace_items', items);
    }

    try {
      await setDoc(doc(firestore, 'marketplace_items', itemId), { price: newPrice }, { merge: true });
    } catch (e) {
      console.error("Firestore update item price failed:", e);
    }

    // Get watchers (users who subscribed to Price Watch OR saved item)
    const watchers = Array.from(new Set([
      ...(currentItem.priceWatchers || []),
      ...(currentItem.saves || [])
    ]));
    let notifiedCount = 0;
    const isDrop = newPrice < oldPrice;
    const dropPct = oldPrice > 0 && isDrop ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0;

    for (const watcherId of watchers) {
      if (!watcherId) continue;
      const isPriceWatched = (currentItem.priceWatchers || []).includes(watcherId);
      const notif: PriceUpdateNotification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: watcherId,
        itemId,
        itemTitle: currentItem.title,
        itemImageUrl: currentItem.imageUrl,
        oldPrice,
        newPrice,
        sellerId: sellerId || itemOwnerId || '',
        sellerName: sellerName || currentItem.userName || 'Seller',
        createdAt: Date.now(),
        read: false,
        type: 'price_update',
        isPriceWatch: isPriceWatched,
        dropPercentage: isDrop ? dropPct : undefined,
        message: isDrop
          ? `🔔 چاودێری نرخ: نرخی (${currentItem.title}) بە ڕێژەی %${dropPct} دابەزی! لە ${(oldPrice * 1500).toLocaleString()} دینار بۆ ${(newPrice * 1500).toLocaleString()} دینار.`
          : `نوێکردنەوەی نرخ: نرخی (${currentItem.title}) گۆڕدرا بۆ ${(newPrice * 1500).toLocaleString()} دینار.`
      };

      // Store in local storage cache
      const userNotifsKey = `payv_notifications_${watcherId}`;
      const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
      userNotifs.unshift(notif);
      setStored(userNotifsKey, userNotifs);

      // Write to Firestore collection 'notifications'
      try {
        await setDoc(doc(firestore, 'notifications', notif.id), cleanData(notif));
      } catch (e) {
        console.error("Firestore notification write failed:", e);
      }

      notifiedCount++;
    }

    // Always create a direct notification for the seller confirming the price change
    const activeSellerId = sellerId || itemOwnerId;
    if (activeSellerId) {
      const sellerNotif: PriceUpdateNotification = {
        id: 'notif_sel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: activeSellerId,
        itemId,
        itemTitle: currentItem.title,
        itemImageUrl: currentItem.imageUrl,
        oldPrice,
        newPrice,
        sellerId: activeSellerId,
        sellerName: sellerName || currentItem.userName || 'Seller',
        createdAt: Date.now(),
        read: false,
        type: 'price_update',
        message: `نرخی کاڵاکەت (${currentItem.title}) بە سەرکەوتوویی گۆڕدرا بۆ ${(newPrice * 1500).toLocaleString()} دینار.`
      };

      const userNotifsKey = `payv_notifications_${activeSellerId}`;
      const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
      if (!userNotifs.some(n => n.itemId === itemId && Math.abs(n.createdAt - sellerNotif.createdAt) < 1500)) {
        userNotifs.unshift(sellerNotif);
        setStored(userNotifsKey, userNotifs);
        try {
          await setDoc(doc(firestore, 'notifications', sellerNotif.id), cleanData(sellerNotif));
        } catch (e) {
          console.error("Firestore seller notification write failed:", e);
        }
      }
    }

    // Dispatch global events for instant UI synchronization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification_updated'));
      window.dispatchEvent(new CustomEvent('payv_item_added'));
    }

    return { success: true, notifiedCount, oldPrice };
  },

  updateMarketplaceItem: async (
    itemId: string,
    updates: Partial<MarketplaceItem>,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<{ success: boolean; item?: MarketplaceItem; notifiedCount: number; error?: string }> => {
    let items = getStored('marketplace_items', DEFAULT_ITEMS);
    let itemIdx = items.findIndex(i => i.id === itemId);
    let currentItem: MarketplaceItem | null = itemIdx !== -1 ? items[itemIdx] : null;

    try {
      const docRef = doc(firestore, 'marketplace_items', itemId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = { id: snap.id, ...snap.data() } as MarketplaceItem;
        if (!currentItem) {
          currentItem = remoteData;
        } else if (remoteData.saves) {
          currentItem.saves = Array.from(new Set([...(currentItem.saves || []), ...remoteData.saves]));
        }
      }
    } catch (e) {
      console.warn("Firestore fetch item for update:", e);
    }

    if (!currentItem) {
      return { success: false, notifiedCount: 0, error: 'Item not found' };
    }

    const itemOwnerId = currentItem.userId || currentItem.sellerId;
    const isOwner = Boolean(currentUserId && (itemOwnerId === currentUserId || currentItem.sellerId === currentUserId));
    const isAdmin = Boolean(currentUserId && (currentUserId === 'admin' || currentUserId.startsWith('admin-') || currentUserId === 'sandbox-id'));
    if (currentUserId && !isOwner && !isAdmin) {
      return { success: false, notifiedCount: 0, error: 'Unauthorized: Only the creator can edit this post.' };
    }

    const oldPrice = currentItem.price;
    const newPrice = updates.price !== undefined ? updates.price : oldPrice;
    const priceChanged = Math.abs(oldPrice - newPrice) > 0.001;

    const updatedItem: MarketplaceItem = {
      ...currentItem,
      ...updates,
      id: itemId
    };

    if (itemIdx !== -1) {
      items[itemIdx] = updatedItem;
      setStored('marketplace_items', items);
    }

    try {
      await setDoc(doc(firestore, 'marketplace_items', itemId), cleanData(updates), { merge: true });
    } catch (e) {
      console.error("Firestore updateMarketplaceItem failed:", e);
    }

    let notifiedCount = 0;
    const watchers = Array.from(new Set([
      ...(updatedItem.priceWatchers || []),
      ...(updatedItem.saves || [])
    ]));
    const activeSellerId = currentUserId || updatedItem.userId;
    const activeSellerName = currentUserName || updatedItem.userName || 'Seller';
    const isDrop = newPrice < oldPrice;
    const dropPct = oldPrice > 0 && isDrop ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0;

    if (priceChanged) {
      for (const watcherId of watchers) {
        if (!watcherId) continue;
        const isPriceWatched = (updatedItem.priceWatchers || []).includes(watcherId);
        const notif: PriceUpdateNotification = {
          id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          userId: watcherId,
          itemId,
          itemTitle: updatedItem.title,
          itemImageUrl: updatedItem.imageUrl || (updatedItem.imageUrls && updatedItem.imageUrls[0]) || '',
          oldPrice,
          newPrice,
          sellerId: activeSellerId || '',
          sellerName: activeSellerName,
          createdAt: Date.now(),
          read: false,
          type: 'price_update',
          isPriceWatch: isPriceWatched,
          dropPercentage: isDrop ? dropPct : undefined,
          message: isDrop
            ? `🔔 چاودێری نرخ: نرخی (${updatedItem.title}) بە ڕێژەی %${dropPct} دابەزی! لە ${(oldPrice * 1500).toLocaleString()} دینار بۆ ${(newPrice * 1500).toLocaleString()} دینار.`
            : `نوێکردنەوەی نرخ: نرخی (${updatedItem.title}) گۆڕدرا بۆ ${(newPrice * 1500).toLocaleString()} دینار.`
        };

        const userNotifsKey = `payv_notifications_${watcherId}`;
        const userNotifs = getStored(userNotifsKey, [] as PriceUpdateNotification[]);
        userNotifs.unshift(notif);
        setStored(userNotifsKey, userNotifs);

        try {
          await setDoc(doc(firestore, 'notifications', notif.id), cleanData(notif));
        } catch (e) {
          console.error("Firestore notification write failed:", e);
        }

        notifiedCount++;
      }
    }

    // Always create notification for the seller confirming changes
    if (activeSellerId) {
      const sellerNotif: PriceUpdateNotification = {
        id: 'notif_sel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: activeSellerId,
        itemId,
        itemTitle: updatedItem.title,
        itemImageUrl: updatedItem.imageUrl || (updatedItem.imageUrls && updatedItem.imageUrls[0]) || '',
        oldPrice,
        newPrice,
        sellerId: activeSellerId,
        sellerName: activeSellerName,
        createdAt: Date.now(),
        read: false,
        type: 'price_update',
        message: priceChanged
          ? `نرخی کاڵاکەت (${updatedItem.title}) بە سەرکەوتوویی نوێکرایەوە بۆ ${(newPrice * 1500).toLocaleString()} دینار.`
          : `پۆستەکەت (${updatedItem.title}) بە سەرکەوتوویی دەستکاری کرا.`
      };

      const sellerNotifsKey = `payv_notifications_${activeSellerId}`;
      const sellerNotifs = getStored(sellerNotifsKey, [] as PriceUpdateNotification[]);
      if (!sellerNotifs.some(n => n.itemId === itemId && Math.abs(n.createdAt - sellerNotif.createdAt) < 1500)) {
        sellerNotifs.unshift(sellerNotif);
        setStored(sellerNotifsKey, sellerNotifs);
        try {
          await setDoc(doc(firestore, 'notifications', sellerNotif.id), cleanData(sellerNotif));
        } catch (e) {
          console.error("Firestore seller notification write failed:", e);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification_updated'));
      window.dispatchEvent(new CustomEvent('payv_item_added'));
    }

    return { success: true, item: updatedItem, notifiedCount };
  },

  getNotifications: async (userId: string): Promise<PriceUpdateNotification[]> => {
    const effectiveUserId = userId || 'guest_user';
    const localKey = `payv_notifications_${effectiveUserId}`;
    let localNotifs = getStored(localKey, [] as PriceUpdateNotification[]);

    // Filter out any legacy seed notifications
    localNotifs = (localNotifs || []).filter(n => !n.id.startsWith('notif_seed_'));

    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', effectiveUserId)
      );
      const snap = await getDocs(q);
      const remoteNotifs = snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PriceUpdateNotification))
        .filter(n => !n.id.startsWith('notif_seed_'));
      
      const mergedMap = new Map<string, PriceUpdateNotification>();
      localNotifs.forEach(n => mergedMap.set(n.id, n));
      remoteNotifs.forEach(n => mergedMap.set(n.id, n));
      const merged = Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      setStored(localKey, merged);
      return merged;
    } catch (e) {
      console.warn("Firestore getNotifications failed, using local:", e);
    }

    return localNotifs.sort((a, b) => b.createdAt - a.createdAt);
  },

  onNotificationsChange: (userId: string, callback: (notifications: PriceUpdateNotification[]) => void): (() => void) => {
    const effectiveUserId = userId || 'guest_user';
    const localKey = `payv_notifications_${effectiveUserId}`;
    
    // Initial emit (real notifications only, no fake demo items)
    let initial = getStored(localKey, [] as PriceUpdateNotification[]);
    initial = (initial || []).filter(n => !n.id.startsWith('notif_seed_'));
    setStored(localKey, initial);
    callback(initial.sort((a, b) => b.createdAt - a.createdAt));

    let isSubscribed = true;

    const handleLocal = () => {
      if (!isSubscribed) return;
      const updated = (getStored(localKey, [] as PriceUpdateNotification[]) || []).filter(n => !n.id.startsWith('notif_seed_'));
      callback(updated.sort((a, b) => b.createdAt - a.createdAt));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('notification_updated', handleLocal);
    }

    let unsubFirestore: (() => void) | null = null;
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', effectiveUserId)
      );
      unsubFirestore = onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return;
        const remoteNotifs = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PriceUpdateNotification))
          .filter(n => !n.id.startsWith('notif_seed_'));
        
        const currentLocal = (getStored(localKey, [] as PriceUpdateNotification[]) || []).filter(n => !n.id.startsWith('notif_seed_'));
        const mergedMap = new Map<string, PriceUpdateNotification>();
        currentLocal.forEach(n => mergedMap.set(n.id, n));
        remoteNotifs.forEach(n => mergedMap.set(n.id, n));
        const merged = Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        setStored(localKey, merged);
        callback(merged);
      }, (err) => {
        console.warn("Firestore onNotificationsChange error:", err);
      });
    } catch (e) {
      console.warn("Firestore snapshot error:", e);
    }

    return () => {
      isSubscribed = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('notification_updated', handleLocal);
      }
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  },

  markNotificationAsRead: async (notificationId: string, userId: string): Promise<void> => {
    const localKey = `payv_notifications_${userId}`;
    const notifs = getStored(localKey, [] as PriceUpdateNotification[]);
    const updated = notifs.map(n => n.id === notificationId ? { ...n, read: true } : n);
    setStored(localKey, updated);

    try {
      await setDoc(doc(firestore, 'notifications', notificationId), { read: true }, { merge: true });
    } catch (e) {
      console.error("Firestore markNotificationAsRead failed:", e);
    }
  },

  markAllNotificationsAsRead: async (userId: string): Promise<void> => {
    const localKey = `payv_notifications_${userId}`;
    const notifs = getStored(localKey, [] as PriceUpdateNotification[]);
    const updated = notifs.map(n => ({ ...n, read: true }));
    setStored(localKey, updated);

    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(firestore);
      snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error("Firestore markAllNotificationsAsRead failed:", e);
    }
  },

  clearNotifications: async (userId: string): Promise<void> => {
    const localKey = `payv_notifications_${userId}`;
    setStored(localKey, []);

    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(firestore);
      snap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (e) {
      console.error("Firestore clearNotifications failed:", e);
    }
  },

  // ==========================================
  // WORKFLOW A: GROUP GIFT CROWDFUNDING
  // ==========================================
  createGiftPool: async (poolData: Omit<GiftCrowdfundPool, 'id' | 'currentAmount' | 'contributions' | 'createdAt' | 'status'>): Promise<GiftCrowdfundPool> => {
    const poolId = `gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const shippingFee = poolData.shippingFee || 4000;
    const targetAmount = poolData.targetAmount || (poolData.productPrice + shippingFee);
    
    const newPool: GiftCrowdfundPool = {
      ...poolData,
      id: poolId,
      shippingFee,
      targetAmount,
      currentAmount: 0,
      contributions: [],
      status: 'active',
      createdAt: Date.now()
    };

    setStored(`payv_gift_crowdfund_${poolId}`, newPool);

    try {
      await setDoc(doc(firestore, 'gift_pools', poolId), cleanData(newPool));
    } catch (e) {
      console.warn("Firestore createGiftPool error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gift_crowdfund_updated', { detail: { poolId } }));
    }

    return newPool;
  },

  getGiftPool: async (poolId: string): Promise<GiftCrowdfundPool | null> => {
    if (!poolId) return null;
    try {
      const docSnap = await getDoc(doc(firestore, 'gift_pools', poolId));
      if (docSnap.exists()) {
        const poolData = { id: docSnap.id, ...docSnap.data() } as GiftCrowdfundPool;
        setStored(`payv_gift_crowdfund_${poolId}`, poolData);
        return poolData;
      }
    } catch (err) {
      console.warn("Firestore getGiftPool error, checking local:", err);
    }
    return getStored<GiftCrowdfundPool | null>(`payv_gift_crowdfund_${poolId}`, null);
  },

  onGiftPoolChange: (poolId: string, callback: (pool: GiftCrowdfundPool | null) => void): (() => void) => {
    if (!poolId) {
      callback(null);
      return () => {};
    }

    const local = getStored<GiftCrowdfundPool | null>(`payv_gift_crowdfund_${poolId}`, null);
    callback(local);

    let isSubscribed = true;
    const handleLocal = (e: any) => {
      if (!isSubscribed) return;
      if (e?.detail?.poolId === poolId || !e?.detail?.poolId) {
        const updated = getStored<GiftCrowdfundPool | null>(`payv_gift_crowdfund_${poolId}`, null);
        callback(updated);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gift_crowdfund_updated', handleLocal);
    }

    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(doc(firestore, 'gift_pools', poolId), (docSnap) => {
        if (!isSubscribed) return;
        if (docSnap.exists()) {
          const pool = { id: docSnap.id, ...docSnap.data() } as GiftCrowdfundPool;
          setStored(`payv_gift_crowdfund_${poolId}`, pool);
          callback(pool);
        } else {
          callback(null);
        }
      }, (err) => {
        console.warn("Firestore onGiftPoolChange error:", err);
      });
    } catch (e) {
      console.warn("Firestore onGiftPoolChange listener failed:", e);
    }

    return () => {
      isSubscribed = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('gift_crowdfund_updated', handleLocal);
      }
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  },

  addGiftContribution: async (
    poolId: string, 
    contribution: Omit<GiftContribution, 'id' | 'createdAt' | 'paymentStatus'>
  ): Promise<{ pool: GiftCrowdfundPool; isFullyFunded: boolean } | null> => {
    const currentPool = await db.getGiftPool(poolId);
    if (!currentPool) return null;

    const newContrib: GiftContribution = {
      ...contribution,
      id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      paymentStatus: 'confirmed',
      createdAt: Date.now()
    };

    const contributions = [...(currentPool.contributions || []), newContrib];
    const currentAmount = contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const isFullyFunded = currentAmount >= currentPool.targetAmount;

    const updatedPool: GiftCrowdfundPool = {
      ...currentPool,
      contributions,
      currentAmount,
      status: isFullyFunded ? 'fully_funded' : 'active',
      completedAt: isFullyFunded ? (currentPool.completedAt || Date.now()) : undefined
    };

    // Automatic Order Execution when 100% Fully Funded
    if (isFullyFunded && !updatedPool.orderId) {
      const orderId = `GIFT-ORD-${Date.now()}`;
      updatedPool.orderId = orderId;

      const orderData = {
        id: orderId,
        _id: orderId,
        userId: currentPool.creatorId,
        buyerName: currentPool.recipientName,
        buyerPhone: currentPool.recipientPhone,
        customerName: currentPool.recipientName,
        customerPhone: currentPool.recipientPhone,
        shippingAddress: currentPool.recipientAddress,
        shippingCity: currentPool.recipientCity,
        total: updatedPool.targetAmount,
        status: 'pending',
        isGiftPool: true,
        giftPoolId: poolId,
        occasionTitle: currentPool.occasionTitle || 'پشکداربوون لە دیاری',
        contributorsSummary: contributions.map(c => `${c.contributorName}: ${c.amount.toLocaleString()} IQD`).join(', '),
        items: [
          {
            id: `gift_item_${currentPool.productId}`,
            itemId: currentPool.productId,
            title: `🎁 [دیاری هاوبەش] ${currentPool.productTitle}`,
            price: currentPool.productPrice / 1500,
            imageUrl: currentPool.productImage,
            size: currentPool.selectedSize,
            color: currentPool.selectedColor,
            quantity: 1
          }
        ],
        createdAt: new Date().toISOString()
      };

      await db.createOrder(orderData);
    }

    setStored(`payv_gift_crowdfund_${poolId}`, updatedPool);

    try {
      await setDoc(doc(firestore, 'gift_pools', poolId), cleanData(updatedPool), { merge: true });
    } catch (e) {
      console.warn("Firestore addGiftContribution error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gift_crowdfund_updated', { detail: { poolId } }));
      window.dispatchEvent(new CustomEvent('orders_updated'));
    }

    return { pool: updatedPool, isFullyFunded };
  },

  // ==========================================
  // WORKFLOW B: SHARED CART SHOPPING
  // ==========================================
  createSharedCart: async (
    creator: { id: string; name: string; phone?: string },
    initialItems: SharedCartItem[] = [],
    deliveryInfo?: { address?: string; city?: string; recipientName?: string; recipientPhone?: string }
  ): Promise<SharedCart> => {
    const cartId = `scart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCart: SharedCart = {
      id: cartId,
      creatorId: creator.id || 'guest',
      creatorName: creator.name || 'کڕیار',
      creatorPhone: creator.phone || '',
      title: `سەبەتەی هاوبەشی ${creator.name || 'کڕیار'}`,
      deliveryAddress: deliveryInfo?.address || '',
      deliveryCity: deliveryInfo?.city || 'Erbil',
      recipientName: deliveryInfo?.recipientName || creator.name || '',
      recipientPhone: deliveryInfo?.recipientPhone || creator.phone || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: initialItems,
      status: 'active'
    };

    setStored(`payv_shared_cart_${cartId}`, newCart);
    setStored('payv_active_shared_cart_id', cartId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared_cart_updated', { detail: { cartId } }));
    }

    // Sync to Firestore in background with timeout protection
    (async () => {
      try {
        await Promise.race([
          setDoc(doc(firestore, 'shared_carts', cartId), cleanData(newCart)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1500))
        ]);
      } catch (err) {
        console.warn("Firestore createSharedCart background sync:", err);
      }
    })().catch(() => {});

    return newCart;
  },

  getSharedCart: async (cartId: string): Promise<SharedCart | null> => {
    if (!cartId) return null;
    try {
      const docSnap = await getDoc(doc(firestore, 'shared_carts', cartId));
      if (docSnap.exists()) {
        const cartData = { id: docSnap.id, ...docSnap.data() } as SharedCart;
        setStored(`payv_shared_cart_${cartId}`, cartData);
        return cartData;
      }
    } catch (err) {
      console.warn("Firestore getSharedCart error, checking local:", err);
    }
    return getStored<SharedCart | null>(`payv_shared_cart_${cartId}`, null);
  },

  onSharedCartChange: (cartId: string, callback: (cart: SharedCart | null) => void): (() => void) => {
    if (!cartId) {
      callback(null);
      return () => {};
    }

    const local = getStored<SharedCart | null>(`payv_shared_cart_${cartId}`, null);
    callback(local);

    let isSubscribed = true;
    const handleLocal = (e: any) => {
      if (!isSubscribed) return;
      if (e?.detail?.cartId === cartId || !e?.detail?.cartId) {
        const updated = getStored<SharedCart | null>(`payv_shared_cart_${cartId}`, null);
        callback(updated);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('shared_cart_updated', handleLocal);
    }

    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(doc(firestore, 'shared_carts', cartId), (docSnap) => {
        if (!isSubscribed) return;
        if (docSnap.exists()) {
          const cart = { id: docSnap.id, ...docSnap.data() } as SharedCart;
          setStored(`payv_shared_cart_${cartId}`, cart);
          callback(cart);
        } else {
          callback(null);
        }
      }, (err) => {
        console.warn("Firestore onSharedCartChange error:", err);
      });
    } catch (e) {
      console.warn("Firestore onSharedCartChange listen failed:", e);
    }

    return () => {
      isSubscribed = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('shared_cart_updated', handleLocal);
      }
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  },

  addItemToSharedCart: async (
    cartId: string,
    item: {
      id: string;
      title: string;
      price: number;
      imageUrl: string;
      sellerId?: string;
      sellerName?: string;
      sellerPhone?: string;
    },
    quantity: number = 1,
    size?: string,
    color?: string,
    user?: { id: string; name: string } | null
  ): Promise<SharedCart | null> => {
    const currentCart = await db.getSharedCart(cartId);
    if (!currentCart) return null;

    const items = [...(currentCart.items || [])];
    const existingIdx = items.findIndex(
      i => i.itemId === item.id && i.size === size && i.color === color
    );

    const adderId = user?.id || 'guest_user';
    const adderName = user?.name || 'هاوبەشێک';

    if (existingIdx !== -1) {
      items[existingIdx].quantity += quantity;
      items[existingIdx].addedByUserName = adderName;
      items[existingIdx].addedAt = Date.now();
    } else {
      const newItem: SharedCartItem = {
        id: `sci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemId: item.id,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        size,
        color,
        quantity,
        addedByUserId: adderId,
        addedByUserName: adderName,
        addedAt: Date.now(),
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerPhone: item.sellerPhone
      };
      items.push(newItem);
    }

    const updatedCart: SharedCart = {
      ...currentCart,
      items,
      updatedAt: Date.now()
    };

    setStored(`payv_shared_cart_${cartId}`, updatedCart);

    try {
      await setDoc(doc(firestore, 'shared_carts', cartId), cleanData(updatedCart), { merge: true });
    } catch (e) {
      console.warn("Firestore addItemToSharedCart error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared_cart_updated', { detail: { cartId } }));
    }

    return updatedCart;
  },

  addMultipleItemsToSharedCart: async (
    cartId: string,
    newItems: SharedCartItem[]
  ): Promise<SharedCart | null> => {
    const currentCart = await db.getSharedCart(cartId);
    if (!currentCart) return null;

    const items = [...(currentCart.items || [])];
    for (const item of newItems) {
      const existingIdx = items.findIndex(
        i => i.itemId === item.itemId && i.size === item.size && i.color === item.color
      );
      if (existingIdx !== -1) {
        items[existingIdx].quantity += item.quantity;
        items[existingIdx].addedByUserName = item.addedByUserName;
        items[existingIdx].addedAt = Date.now();
      } else {
        items.push(item);
      }
    }

    const updatedCart: SharedCart = {
      ...currentCart,
      items,
      updatedAt: Date.now()
    };

    setStored(`payv_shared_cart_${cartId}`, updatedCart);

    try {
      await setDoc(doc(firestore, 'shared_carts', cartId), cleanData(updatedCart), { merge: true });
    } catch (e) {
      console.warn("Firestore addMultipleItemsToSharedCart error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared_cart_updated', { detail: { cartId } }));
    }

    return updatedCart;
  },

  updateSharedCartItemQuantity: async (cartId: string, itemId: string, quantity: number): Promise<void> => {
    const currentCart = await db.getSharedCart(cartId);
    if (!currentCart) return;

    let items = [...(currentCart.items || [])];
    if (quantity <= 0) {
      items = items.filter(i => i.id !== itemId && i.itemId !== itemId);
    } else {
      items = items.map(i => (i.id === itemId || i.itemId === itemId) ? { ...i, quantity } : i);
    }

    const updatedCart: SharedCart = {
      ...currentCart,
      items,
      updatedAt: Date.now()
    };

    setStored(`payv_shared_cart_${cartId}`, updatedCart);

    try {
      await setDoc(doc(firestore, 'shared_carts', cartId), cleanData(updatedCart), { merge: true });
    } catch (e) {
      console.warn("Firestore updateSharedCartItemQuantity error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared_cart_updated', { detail: { cartId } }));
    }
  },

  updateSharedCartDelivery: async (
    cartId: string, 
    delivery: { 
      address: string; 
      city: string; 
      recipientName: string; 
      recipientPhone: string;
      deliveryNotes?: string;
      addressConfirmedByOwner?: boolean;
    }
  ): Promise<void> => {
    const currentCart = await db.getSharedCart(cartId);
    if (!currentCart) return;

    const updatedCart: SharedCart = {
      ...currentCart,
      deliveryAddress: delivery.address,
      deliveryCity: delivery.city,
      recipientName: delivery.recipientName,
      recipientPhone: delivery.recipientPhone,
      deliveryNotes: delivery.deliveryNotes !== undefined ? delivery.deliveryNotes : currentCart.deliveryNotes,
      addressConfirmedByOwner: delivery.addressConfirmedByOwner !== undefined ? delivery.addressConfirmedByOwner : currentCart.addressConfirmedByOwner,
      addressConfirmedAt: delivery.addressConfirmedByOwner ? Date.now() : currentCart.addressConfirmedAt,
      updatedAt: Date.now()
    };

    setStored(`payv_shared_cart_${cartId}`, updatedCart);

    try {
      await setDoc(doc(firestore, 'shared_carts', cartId), cleanData(updatedCart), { merge: true });
    } catch (e) {
      console.warn("Firestore updateSharedCartDelivery error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared_cart_updated', { detail: { cartId } }));
    }
  },

  checkoutSharedCart: async (
    cartId: string,
    payer: { id: string; name: string; phone: string },
    paymentMethod: string = 'cash_on_delivery'
  ): Promise<{ success: boolean; orderId: string }> => {
    const currentCart = await db.getSharedCart(cartId);
    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
      throw new Error("سەبەتەکە بەتاڵە یان بوونی نییە");
    }

    const orderId = `SCART-ORD-${Date.now()}`;
    const itemsTotal = currentCart.items.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
    const shippingFee = 4000;
    const finalTotal = (itemsTotal * 1500) + shippingFee; // in IQD

    const orderData = {
      id: orderId,
      _id: orderId,
      userId: payer.id || currentCart.creatorId,
      buyerName: currentCart.recipientName || payer.name,
      buyerPhone: currentCart.recipientPhone || payer.phone,
      customerName: currentCart.recipientName || payer.name,
      customerPhone: currentCart.recipientPhone || payer.phone,
      shippingAddress: currentCart.deliveryAddress || 'Erbil',
      shippingCity: currentCart.deliveryCity || 'Erbil',
      deliveryNotes: currentCart.deliveryNotes || '',
      addressConfirmedByOwner: currentCart.addressConfirmedByOwner || false,
      total: finalTotal,
      status: 'pending',
      isSharedCart: true,
      sharedCartId: cartId,
      paidBy: payer.name,
      payerPhone: payer.phone,
      paymentMethod,
      items: currentCart.items.map(ci => ({
        id: ci.id,
        itemId: ci.itemId,
        title: ci.title,
        price: ci.price,
        imageUrl: ci.imageUrl,
        size: ci.size,
        color: ci.color,
        quantity: ci.quantity,
        addedByUserId: ci.addedByUserId,
        addedByUserName: ci.addedByUserName
      })),
      createdAt: new Date().toISOString()
    };

    await db.createOrder(orderData);

    const updatedCart: SharedCart = {
      ...currentCart,
      status: 'ordered',
      orderId,
      payerId: payer.id,
      payerName: payer.name,
      updatedAt: Date.now()
    };

    setStored(`payv_shared_cart_${cartId}`, updatedCart);

    try {
      await setDoc(doc(firestore, 'shared_carts', cartId), cleanData(updatedCart), { merge: true });
    } catch (e) {
      console.warn("Firestore checkoutSharedCart error:", e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shared_cart_updated', { detail: { cartId } }));
      window.dispatchEvent(new CustomEvent('orders_updated'));
    }

    return { success: true, orderId };
  },

  getActiveSharedCartId: (): string | null => {
    return getStored<string | null>('payv_active_shared_cart_id', null);
  },

  setActiveSharedCartId: (cartId: string | null): void => {
    setStored('payv_active_shared_cart_id', cartId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('active_shared_cart_changed', { detail: { cartId } }));
    }
  },

  getBumpRuleForCategory: (cat?: string) => getBumpRuleForCategory(cat),
  isPostExpired: (item: MarketplaceItem, days?: number) => isPostExpired(item, days)
};

export interface BumpRule {
  cooldownHours: number;
  cooldownMs: number;
  maxBumps: number;
  categoryType: 'farm_perishable' | 'crafts_workshop' | 'general';
  titleKu: string;
  titleEn: string;
}

export const getBumpRuleForCategory = (categoryName?: string): BumpRule => {
  const cat = (categoryName || '').toLowerCase();
  
  // Perishable / Farm Goods category keywords (Kurdish, Arabic, English)
  if (
    cat.includes('farm') || cat.includes('produce') || cat.includes('honey') || 
    cat.includes('dairy') || cat.includes('plant') || cat.includes('seed') ||
    cat.includes('کێڵگە') || cat.includes('کشتوکاڵ') || cat.includes('دۆشاو') ||
    cat.includes('ھەنگوین') || cat.includes('بەرهەمی_کێڵگە') || cat.includes('مێوە') ||
    cat.includes('مزرعة') || cat.includes('خضار') || cat.includes('میوە')
  ) {
    return {
      cooldownHours: 12,
      cooldownMs: 12 * 60 * 60 * 1000,
      maxBumps: 5,
      categoryType: 'farm_perishable',
      titleKu: 'بەرهەمی کێڵگە و تازە (ماوەی وەستان ١٢ کاتژمێر - زۆرترین ٥ جار)',
      titleEn: 'Farm & Perishable Goods (12h Cooldown - Max 5 Bumps)'
    };
  }

  // Handmade Crafts & Workshop Products
  if (
    cat.includes('handmade') || cat.includes('craft') || cat.includes('workshop') ||
    cat.includes('carpentry') || cat.includes('tailoring') || cat.includes('دەستکرد') ||
    cat.includes('دارتاشی') || cat.includes('پیشەسازی') || cat.includes('کارگە') ||
    cat.includes('حرف') || cat.includes('صناعة') || cat.includes('art')
  ) {
    return {
      cooldownHours: 48,
      cooldownMs: 48 * 60 * 60 * 1000,
      maxBumps: 10,
      categoryType: 'crafts_workshop',
      titleKu: 'کار دەستی و پیشەسازی/کارگە (ماوەی وەستان ٤٨ کاتژمێر - زۆرترین ١٠ جار)',
      titleEn: 'Handmade Crafts & Workshops (48h Cooldown - Max 10 Bumps)'
    };
  }

  // General / Default
  return {
    cooldownHours: 24,
    cooldownMs: 24 * 60 * 60 * 1000,
    maxBumps: 8,
    categoryType: 'general',
    titleKu: 'کاڵای گشتی (ماوەی وەستان ٢٤ کاتژمێر - زۆرترین ٨ جار)',
    titleEn: 'General Goods (24h Cooldown - Max 8 Bumps)'
  };
};

export const isPostExpired = (item: MarketplaceItem, expiryDays = 60): boolean => {
  const lastTime = item.lastBumpedAt || item.last_bumped_at || item.createdAt || 0;
  const cutoff = Date.now() - (expiryDays * 24 * 60 * 60 * 1000);
  return lastTime > 0 && lastTime < cutoff;
};

export const bumpMarketplaceItem = async (
  itemId: string,
  updateData?: {
    price?: number;
    stockQuantity?: number;
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  }
): Promise<{ success: boolean; message: string; messageKu: string; messageAr?: string; remainingMs?: number; updatedItem?: MarketplaceItem }> => {
  try {
    const items = getStored('marketplace_items', DEFAULT_ITEMS);
    const itemIndex = items.findIndex(i => i.id === itemId);
    
    let item: MarketplaceItem | null = itemIndex !== -1 ? items[itemIndex] : null;
    try {
      const docSnap = await getDoc(doc(firestore, 'marketplace_items', itemId));
      if (docSnap.exists()) {
        item = { id: docSnap.id, ...docSnap.data() } as MarketplaceItem;
      }
    } catch (e) {
      console.warn("Firestore fetch item for bump failed, using fallback:", e);
    }

    if (!item) {
      return {
        success: false,
        message: "Item not found.",
        messageKu: "کاڵاکە نەدۆزرایەوە.",
        messageAr: "لم يتم العثور على المنتج."
      };
    }

    const rule = getBumpRuleForCategory(item.category);
    const currentBumpCount = item.bump_count ?? item.bumpCount ?? 0;
    const lastBumpTime = item.last_bumped_at ?? item.lastBumpedAt ?? 0;
    const now = Date.now();

    // 1. Enforce max bump limit
    if (currentBumpCount >= rule.maxBumps) {
      return {
        success: false,
        message: `Maximum lifetime bumps limit reached (${rule.maxBumps} bumps max).`,
        messageKu: `زۆرترین ڕێژەی خستنە سەرەوەت بەکارهێناوە (${rule.maxBumps} جار بۆ ئەم بەشە).`,
        messageAr: `تم الوصول إلى الحد الأقصى لترقية المنشور (${rule.maxBumps} مرات كحد أقصى).`
      };
    }

    // 2. Enforce category cooldown
    const timeSinceLastBump = now - lastBumpTime;
    if (lastBumpTime > 0 && timeSinceLastBump < rule.cooldownMs) {
      const remainingMs = rule.cooldownMs - timeSinceLastBump;
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMins = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        success: false,
        remainingMs,
        message: `Cooldown active. Please wait ${remainingHours}h ${remainingMins}m before bumping again.`,
        messageKu: `ماوەی چاوەڕوانی چالاکە. تکایە ${remainingHours} کاتژمێر و ${remainingMins} خولەکی تر بوەستە.`,
        messageAr: `فترة الانتظار نشطة. يرجى الانتظار ${remainingHours} ساعة و ${remainingMins} دقيقة قبل المحاولة مرة أخرى.`
      };
    }

    // 3. Update stock, price and bump counter
    const newBumpCount = currentBumpCount + 1;
    const newPrice = updateData?.price && updateData.price > 0 ? updateData.price : item.price;
    const newStockQty = updateData?.stockQuantity !== undefined ? updateData.stockQuantity : (item.stockQuantity ?? 10);
    const newStockStatus = updateData?.stockStatus || (newStockQty > 0 ? 'in_stock' : 'out_of_stock');
    const isStockBool = newStockStatus !== 'out_of_stock';

    const updatedFields = {
      last_bumped_at: now,
      lastBumpedAt: now,
      bump_count: newBumpCount,
      bumpCount: newBumpCount,
      stock_status: isStockBool,
      stockStatus: newStockStatus,
      stockQuantity: newStockQty,
      price: newPrice,
      bumpCooldownUntil: now + rule.cooldownMs,
      updatedAt: now,
    };

    const updatedItem: MarketplaceItem = {
      ...item,
      ...updatedFields,
    };

    // Update local cache
    if (itemIndex !== -1) {
      items[itemIndex] = updatedItem;
    } else {
      items.push(updatedItem);
    }
    setStored('marketplace_items', items);

    // Persist in Firestore
    try {
      await setDoc(doc(firestore, 'marketplace_items', itemId), cleanData(updatedFields), { merge: true });
    } catch (fsErr) {
      console.error("Firestore bump setDoc error:", fsErr);
    }

    return {
      success: true,
      message: `Post successfully bumped to top! (${newBumpCount}/${rule.maxBumps} bumps used)`,
      messageKu: `پۆستەکەت بە سەرکەوتوویی خرایە لوتکەی لیستەکە! (${newBumpCount}/${rule.maxBumps} جار بەکارهێنراوە)`,
      messageAr: `تمت ترقية المنشور إلى الصدارة بنجاح! (${newBumpCount}/${rule.maxBumps} ترقية مستخدمة)`,
      updatedItem,
    };
  } catch (err: any) {
    console.error("bumpMarketplaceItem error:", err);
    return {
      success: false,
      message: err.message || "Failed to bump post.",
      messageKu: "هەڵەیەک ڕوویدا لە خستنە سەرەوەی پۆستەکە.",
      messageAr: "حدث خطأ أثناء ترقية المنشور."
    };
  }
};
