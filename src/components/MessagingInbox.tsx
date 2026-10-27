import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Send, 
  Paperclip, 
  MessageSquare, 
  Search, 
  Trash2, 
  ShoppingBag, 
  Phone, 
  ExternalLink, 
  CheckCheck, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  User as UserIcon,
  Store,
  Clock,
  Filter,
  Check
} from 'lucide-react';
import clsx from 'clsx';
import { db, User, ChatMessage, Conversation } from '../lib/db';
import { compressBase64Image } from '../lib/imageCompressor';
import { ConfirmationDialog } from './UI';

interface MessagingInboxProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onRequireAuth: (callback: () => void) => void;
  initialTargetSellerId?: string | null;
  initialItemContext?: { id: string; title: string; imageUrl?: string; price: number } | null;
  onViewItem?: (itemId: string) => void;
  theme?: string;
}

export const MessagingInbox: React.FC<MessagingInboxProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRequireAuth,
  initialTargetSellerId,
  initialItemContext,
  onViewItem,
  theme = 'dark'
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'items' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to all conversations of current user
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    setLoading(true);

    const unsub = db.subscribeToUserConversations(currentUser.id, (convs) => {
      setConversations(convs);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, currentUser?.id]);

  // Handle opening or creating conversation when initialTargetSellerId is provided
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !initialTargetSellerId) return;

    const initChat = async () => {
      try {
        const sellerProfile = await db.getSellerProfile(initialTargetSellerId);
        const targetUser = await db.getUserById(initialTargetSellerId);

        const rawSellerName = sellerProfile?.businessName || targetUser?.name || 'E-BAZIRGAN Seller';
        const sellerName = db.sanitizeBrandName ? db.sanitizeBrandName(rawSellerName) : rawSellerName;
        const sellerAvatar = sellerProfile?.logoUrl || targetUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${initialTargetSellerId}`;
        const sellerPhone = sellerProfile?.contactPhone || targetUser?.phone || '';

        const conv = await db.getOrCreateConversation(
          {
            id: currentUser.id,
            name: currentUser.name || 'Buyer',
            avatar: currentUser.avatar,
            phone: currentUser.phone,
            role: 'buyer'
          },
          {
            id: initialTargetSellerId,
            name: sellerName,
            avatar: sellerAvatar,
            phone: sellerPhone,
            role: 'seller'
          },
          initialItemContext || undefined
        );

        if (conv) {
          setActiveConvId(conv.id);
          setShowMobileList(false);
        }
      } catch (err) {
        console.error("Failed to initialize conversation with seller:", err);
      }
    };

    initChat();
  }, [isOpen, currentUser, initialTargetSellerId, initialItemContext]);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConvId || !currentUser?.id) return;

    const activeConv = conversations.find(c => c.id === activeConvId);
    const otherParticipantId = activeConv?.participants.find(p => p !== currentUser.id);

    if (!otherParticipantId) return;

    const unsub = db.subscribeToMessages(currentUser.id, otherParticipantId, (msgs) => {
      setMessages(msgs);
      // Mark as read
      db.markConversationAsRead(activeConvId, currentUser.id);
    });

    return () => unsub();
  }, [activeConvId, currentUser?.id, conversations]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConvId]);

  if (!isOpen) return null;

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherUserId = activeConv?.participants.find(p => p !== currentUser?.id);
  const otherDetails = otherUserId && activeConv?.participantDetails ? activeConv.participantDetails[otherUserId] : null;

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || inputText).trim();
    if ((!textToSend && !chatImage) || !currentUser || !activeConv || !otherUserId) return;

    const recipientName = otherDetails?.name || 'Seller';
    const recipientAvatar = otherDetails?.avatar || '';

    try {
      await db.sendChatMessage({
        conversationId: activeConv.id,
        senderId: currentUser.id,
        recipientId: otherUserId,
        senderName: currentUser.name || 'User',
        senderAvatar: currentUser.avatar || '',
        recipientName,
        recipientAvatar,
        text: textToSend,
        imageUrl: chatImage || undefined,
        itemId: activeConv.itemId,
        itemTitle: activeConv.itemTitle,
        itemImage: activeConv.itemImage,
        itemPrice: activeConv.itemPrice,
        createdAt: Date.now()
      });

      setInputText('');
      setChatImage(null);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string) || '';
        if (base64) {
          const compressed = await compressBase64Image(base64, 1000, 0.85);
          setChatImage(compressed || base64);
        }
        setImageUploading(false);
      };
      reader.onerror = () => {
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to process image attachment:", err);
      setImageUploading(false);
    } finally {
      e.target.value = '';
    }
  };

  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);

  const handleDeleteConversation = (convId: string) => {
    setDeleteConvId(convId);
  };

  const confirmDeleteConversation = async () => {
    if (!deleteConvId) return;
    const targetId = deleteConvId;
    setDeleteConvId(null);
    await db.deleteConversation(targetId);
    if (activeConvId === targetId) {
      setActiveConvId(null);
      setShowMobileList(true);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const otherId = c.participants.find(p => p !== currentUser?.id);
    const details = otherId && c.participantDetails ? c.participantDetails[otherId] : null;
    const nameMatch = details?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const itemMatch = c.itemTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const msgMatch = c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSearch = !searchQuery || nameMatch || itemMatch || msgMatch;

    if (filterTab === 'items') {
      return matchesSearch && Boolean(c.itemId);
    }
    if (filterTab === 'unread') {
      const unread = currentUser?.id && c.unreadCount ? (c.unreadCount[currentUser.id] || 0) : 0;
      return matchesSearch && unread > 0;
    }
    return matchesSearch;
  });

  const totalUnreadAll = conversations.reduce((acc, c) => {
    if (currentUser?.id && c.unreadCount) {
      return acc + (c.unreadCount[currentUser.id] || 0);
    }
    return acc;
  }, 0);

  const isRoyal = theme === 'royal';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className={clsx(
        "w-full max-w-5xl h-[88vh] md:h-[80vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all",
        isRoyal ? "bg-[#060a16] border-amber-400/30 text-white shadow-2xl shadow-black/90" :
        theme === 'dark' ? "bg-slate-950 border-white/10 text-white" :
        theme === 'raz' ? "bg-slate-950 border-ef-pink/30 text-white" :
        "bg-slate-900 border-amber-500/30 text-white"
      )}>
        {/* Header Bar */}
        <div className={clsx(
          "px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0",
          isRoyal ? "bg-[#091124] border-amber-400/20 text-white" : "border-white/10 bg-slate-900/90"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-2xl flex items-center justify-center font-bold",
              isRoyal ? "bg-amber-400/10 border border-amber-400/30 text-amber-300" : "bg-indigo-500/20 border border-indigo-400/30 text-indigo-400"
            )}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={clsx("text-sm sm:text-base font-black tracking-wide", isRoyal && "text-amber-300")}>
                  {isKurdish ? 'سەنتەری پەیامەکان' : isArabic ? 'مركز الرسائل المباشرة' : 'In-App Direct Messages'}
                </h3>
                {totalUnreadAll > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                    {totalUnreadAll} {isKurdish ? 'نوی' : 'new'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isKurdish ? 'گفتوگۆی ڕاستەوخۆ لەگەڵ فرۆشیاران و کڕیاران' : 'Direct inquiries regarding items, orders & sourcing'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body: Dual Panel (Responsive) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 relative">
          
          {/* Left Panel: Conversations List */}
          <div className={clsx(
            "md:col-span-4 border-r flex flex-col min-h-0 transition-all",
            isRoyal ? "border-amber-400/10 bg-[#070d1e]/80" : "border-white/10 bg-slate-900/50",
            showMobileList ? "flex" : "hidden md:flex"
          )}>
            {/* Search & Tabs */}
            <div className="p-3.5 border-b border-white/10 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isKurdish ? 'گەڕان لە پەیامەکان...' : 'Search conversations...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  onClick={() => setFilterTab('all')}
                  className={clsx(
                    "px-3 py-1 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer",
                    filterTab === 'all' ? "bg-indigo-500 text-white shadow-md" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {isKurdish ? 'هەموو' : 'All'} ({conversations.length})
                </button>
                <button
                  onClick={() => setFilterTab('items')}
                  className={clsx(
                    "px-3 py-1 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                    filterTab === 'items' ? "bg-amber-500 text-slate-950 shadow-md" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>{isKurdish ? 'داواکاری کاڵاکان' : 'Item Inquiries'}</span>
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={clsx(
                    "px-3 py-1 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer",
                    filterTab === 'unread' ? "bg-rose-500 text-white shadow-md" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {isKurdish ? 'نەخوێنراوەکان' : 'Unread'}
                </button>
              </div>
            </div>

            {/* Conversation Cards List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">{isKurdish ? 'پەیامەکان باردەکرێن...' : 'Loading inbox...'}</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 p-6 text-center text-slate-500 space-y-2">
                  <MessageSquare className="w-10 h-10 opacity-30" />
                  <p className="text-xs font-medium">
                    {searchQuery ? (isKurdish ? 'هیچ ئەنجامێک نەدۆزرایەوە.' : 'No matching conversations.') : (isKurdish ? 'هیچ گفتوگۆیەک نییە.' : 'No conversations yet.')}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {isKurdish ? 'سەردانی بازاڕ بکە بۆ پەیوەندیکردن بە فرۆشیاران' : 'Tap "Contact Seller" on any item to initiate a direct message.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const otherId = conv.participants.find(p => p !== currentUser?.id);
                  const details = otherId && conv.participantDetails ? conv.participantDetails[otherId] : null;
                  const isActive = conv.id === activeConvId;
                  const unread = currentUser?.id && conv.unreadCount ? (conv.unreadCount[currentUser.id] || 0) : 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setShowMobileList(false);
                      }}
                      className={clsx(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative group",
                        isActive 
                          ? "bg-indigo-600/20 border-indigo-500/50 shadow-lg" 
                          : "bg-slate-950/60 border-white/5 hover:bg-white/5 hover:border-white/10"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {details?.avatar ? (
                          <img src={details.avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-indigo-400">
                            {details?.name ? details.name.charAt(0) : <UserIcon className="w-5 h-5" />}
                          </div>
                        )}
                        {details?.role === 'seller' && (
                          <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-amber-400 text-slate-950 rounded-full text-[8px] font-black border border-slate-900" title="Verified Seller">
                            <Store className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">
                            {details?.name || 'User'}
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {/* Item Tag snippet if attached */}
                        {conv.itemTitle && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-300/90 font-medium truncate bg-amber-500/10 px-1.5 py-0.5 rounded-md w-fit">
                            <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[130px]">{conv.itemTitle}</span>
                          </div>
                        )}

                        <p className={clsx(
                          "text-[11px] truncate",
                          unread > 0 ? "font-bold text-white" : "text-slate-400"
                        )}>
                          {conv.lastSenderId === currentUser?.id ? (isKurdish ? 'تۆ: ' : 'You: ') : ''}{conv.lastMessage}
                        </p>
                      </div>

                      {/* Unread badge & delete trigger */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {unread > 0 && (
                          <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-md">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Active Chat Thread View */}
          <div className={clsx(
            "md:col-span-8 flex flex-col min-h-0 bg-slate-950/90 relative",
            !showMobileList ? "flex" : "hidden md:flex"
          )}>
            {activeConv ? (
              <>
                {/* Active Chat Header */}
                <div className="px-4 py-3 border-b border-white/10 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setShowMobileList(true)}
                      className="md:hidden p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="relative shrink-0">
                      {otherDetails?.avatar ? (
                        <img src={otherDetails.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-bold text-xs">
                          {otherDetails?.name ? otherDetails.name.charAt(0) : 'S'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{otherDetails?.name || 'Seller'}</h4>
                        {otherDetails?.role === 'seller' && (
                          <span className="px-1.5 py-0.2 bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[9px] font-bold rounded-md">
                            {isKurdish ? 'فرۆشیاری بۆتیک' : 'Boutique Seller'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {otherDetails?.phone || 'Direct Chat Active'}
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {otherDetails?.phone && (
                      <>
                        <a
                          href={`tel:${otherDetails.phone.replace(/[^0-9\+]/g, '')}`}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl border border-white/10 text-xs font-bold transition-all"
                          title={isKurdish ? 'پەیوەندی تەلەفۆنی' : 'Direct Call'}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${otherDetails.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteConversation(activeConv.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                      title={isKurdish ? 'سڕینەوەی گفتوگۆ' : 'Delete Thread'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Attached Item Card Banner (If conversation is regarding a specific product) */}
                {activeConv.itemId && (
                  <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-slate-900 border-b border-amber-500/20 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {activeConv.itemImage ? (
                        <img src={activeConv.itemImage} alt="" className="w-10 h-10 rounded-lg object-cover border border-amber-400/30 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-black text-amber-400 tracking-wider block">
                          {isKurdish ? 'سەبارەت بەم کاڵایە:' : 'Item Inquiry Context:'}
                        </span>
                        <p className="text-xs font-bold text-white truncate">{activeConv.itemTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-amber-400">
                        ${activeConv.itemPrice}
                      </span>
                      {onViewItem && (
                        <button
                          onClick={() => onViewItem(activeConv.itemId!)}
                          className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>{isKurdish ? 'بینینی کاڵا' : 'View Item'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 space-y-2">
                      <Sparkles className="w-8 h-8 text-indigo-400/40 animate-pulse" />
                      <p className="text-xs font-medium">
                        {isKurdish ? 'دەستپێکی گفتوگۆ. پرسیارەکەت یان پەیامەکەت بنووسە!' : 'Start of conversation. Type your question or choose a preset below.'}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUser?.id;
                      return (
                        <div key={msg.id || idx} className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}>
                          <div className={clsx(
                            "max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs space-y-1.5 shadow-md relative group",
                            isMe 
                              ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-tr-none" 
                              : "bg-slate-800 text-slate-100 border border-white/10 rounded-tl-none"
                          )}>
                            {/* Attached Image inside message */}
                            {msg.imageUrl && (
                              <div className="relative rounded-xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => setSelectedZoomImage(msg.imageUrl!)}>
                                <img src={msg.imageUrl} alt="Attachment" className="max-h-60 w-full object-cover" />
                              </div>
                            )}

                            {/* Attached Item card preview inside message bubble */}
                            {msg.itemId && (
                              <div className="p-2 bg-black/20 rounded-xl border border-white/10 flex items-center gap-2">
                                {msg.itemImage && (
                                  <img src={msg.itemImage} alt="" className="w-8 h-8 rounded-md object-cover" />
                                )}
                                <div className="min-w-0 flex-1 text-[10px]">
                                  <p className="font-bold truncate">{msg.itemTitle}</p>
                                  <p className="text-amber-300 font-mono">${msg.itemPrice}</p>
                                </div>
                              </div>
                            )}

                            {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}

                            <div className="flex items-center justify-end gap-1 text-[9px] opacity-70 font-mono pt-0.5">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && <CheckCheck className="w-3 h-3 text-sky-300" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Preset Inquiry Chips */}
                <div className="px-4 py-1.5 border-t border-white/5 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
                    {isKurdish ? 'پەیامی خێرا:' : 'Quick:'}
                  </span>
                  {[
                    isKurdish ? 'ئایا ئەم کاڵایە بەردەستە؟ ✅' : 'Is this item available? ✅',
                    isKurdish ? 'نرخی کۆتایی چەندە؟ 💰' : 'What is your best price? 💰',
                    isKurdish ? 'تێچووی گەیاندن چەندە؟ 🚚' : 'What are delivery terms? 🚚',
                    isKurdish ? 'بەهەر حاڵێک بێت بەردەستە ✅' : 'In stock & ready to ship ✅'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(preset)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-white rounded-full text-[10px] whitespace-nowrap border border-white/10 transition-all cursor-pointer shrink-0"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Image Upload Thumbnail Preview */}
                {chatImage && (
                  <div className="px-4 py-2 border-t border-white/10 bg-slate-900 flex items-center gap-3 shrink-0">
                    <div className="relative">
                      <img src={chatImage} alt="Attachment Preview" className="w-14 h-14 object-cover rounded-xl border-2 border-indigo-400 shadow-lg" />
                      <button
                        onClick={() => setChatImage(null)}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">{isKurdish ? 'وێنە ئامادەیە بۆ ناردن' : 'Image attachment ready'}</span>
                  </div>
                )}

                {/* Input Bar */}
                <div className="p-3 border-t border-white/10 bg-slate-900 flex items-center gap-2 shrink-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl border border-white/10 transition-all cursor-pointer shrink-0"
                    title={isKurdish ? 'بارکردنی وێنە' : 'Attach Photo'}
                  >
                    {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    placeholder={isKurdish ? 'پەیامەکەت بنووسە...' : 'Type a message...'}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() && !chatImage}
                    className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">{isKurdish ? 'ناردن' : 'Send'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-indigo-400">
                  <MessageSquare className="w-8 h-8 opacity-40" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {isKurdish ? 'هیچ گفتوگۆیەک هەڵنەبژێردراوە' : 'No conversation selected'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    {isKurdish ? 'گفتوگۆیەک لە بەشی لای چەپ هەڵبژێرە یان پەیوەندی بە فرۆشیارێکەوە بکە' : 'Select a conversation from the left inbox or contact a seller on any marketplace listing.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox Modal */}
      {selectedZoomImage && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedZoomImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full">
            <X className="w-6 h-6" />
          </button>
          <img src={selectedZoomImage} alt="Enlarged" className="max-w-full max-h-[90vh] object-contain rounded-2xl" />
        </div>
      )}

      {/* Delete Conversation Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!deleteConvId}
        title={isKurdish ? 'سڕینەوەی گفتوگۆ' : 'Delete Conversation'}
        message={isKurdish ? 'ئایا دڵنیایت لە سڕینەوەی ئەم گفتوگۆیە لە لیستی نامەکانت؟' : 'Are you sure you want to delete this conversation?'}
        confirmLabel={isKurdish ? 'سڕینەوە' : 'Delete'}
        cancelLabel={isKurdish ? 'پاشگەزبوونەوە' : 'Cancel'}
        onConfirm={confirmDeleteConversation}
        onCancel={() => setDeleteConvId(null)}
        type="danger"
      />
    </div>
  );
};
