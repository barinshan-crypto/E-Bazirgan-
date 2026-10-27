import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  UserCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  Phone, 
  MapPin, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  DollarSign, 
  Share2, 
  Receipt,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { db, User, AccountingTransaction } from '../../lib/db';

interface B2BMerchantLedgerProps {
  user: User;
  transactions: AccountingTransaction[];
  onTransactionsUpdated: () => void;
  i18n: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenInvoiceModal: (tx?: AccountingTransaction, partnerName?: string) => void;
}

export interface PartnerProfile {
  id: string;
  name: string;
  phone: string;
  city: string;
  partnerType: 'supplier' | 'wholesaler' | 'retailer' | 'distributor' | 'factory';
  notes?: string;
}

export const B2BMerchantLedger: React.FC<B2BMerchantLedgerProps> = ({
  user,
  transactions,
  onTransactionsUpdated,
  i18n,
  onShowToast,
  onOpenInvoiceModal,
}) => {
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState<string>('');
  const [showAddPartnerModal, setShowAddPartnerModal] = useState<boolean>(false);
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [voucherType, setVoucherType] = useState<'receipt' | 'payment'>('receipt'); // receipt = وەرگرتنی پارە (سەندی قبض), payment = دانی پارە (سەندی صرف)

  // New Voucher Form
  const [voucherAmount, setVoucherAmount] = useState<string>('');
  const [voucherCurrency, setVoucherCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [voucherNote, setVoucherNote] = useState<string>('');
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // New Partner Form
  const [newPartnerName, setNewPartnerName] = useState<string>('');
  const [newPartnerPhone, setNewPartnerPhone] = useState<string>('');
  const [newPartnerCity, setNewPartnerCity] = useState<string>('هەولێر (Erbil)');
  const [newPartnerType, setNewPartnerType] = useState<PartnerProfile['partnerType']>('wholesaler');
  const [newPartnerNotes, setNewPartnerNotes] = useState<string>('');

  // Date Filter for Statement
  const [statementStartDate, setStatementStartDate] = useState<string>('');
  const [statementEndDate, setStatementEndDate] = useState<string>('');

  // Delete Confirmation States
  const [deleteTxTarget, setDeleteTxTarget] = useState<{ id: string; title?: string; amount?: number; date?: string } | null>(null);
  const [deletePartnerTarget, setDeletePartnerTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Extract unique partner names from transactions + local saved partners
  const partnerList = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; type?: string; totalInvoices: number; balance: number }>();
    
    transactions.forEach(tx => {
      const name = (tx.customerName || '').trim();
      if (!name) return;
      
      const existing = map.get(name) || { 
        name, 
        phone: tx.customerPhone || '', 
        type: tx.partnerType || 'wholesaler', 
        totalInvoices: 0, 
        balance: 0 
      };

      existing.totalInvoices += 1;
      if (tx.customerPhone && !existing.phone) existing.phone = tx.customerPhone;

      // Balance calculation:
      // If we sold to them on debt/partial -> They owe us (+ balance)
      // If we made a payment to them / bought from them on debt -> We owe them (- balance)
      if (tx.type === 'income') {
        // Sales to them
        if (tx.remainingDebt) {
          existing.balance += tx.remainingDebt;
        }
      } else if (tx.type === 'debt') {
        if (tx.status === 'unpaid') {
          existing.balance += (tx.direction === 'outgoing' ? -tx.amount : tx.amount);
        }
      } else if (tx.type === 'expense') {
        if (tx.remainingDebt) {
          existing.balance -= tx.remainingDebt;
        }
      } else if (tx.type === 'receipt_voucher') {
        // We received money from them -> reduces their debt to us
        existing.balance -= tx.amount;
      } else if (tx.type === 'payment_voucher') {
        // We paid money to them -> reduces our debt to them
        existing.balance += tx.amount;
      }

      map.set(name, existing);
    });

    return Array.from(map.values());
  }, [transactions]);

  // Filtered partners
  const filteredPartners = partnerList.filter(p => 
    p.name.toLowerCase().includes(partnerSearch.toLowerCase()) || 
    (p.phone && p.phone.includes(partnerSearch))
  );

  // Active Partner Transactions for Statement (کەشف حیساب)
  const activePartnerTxs = useMemo(() => {
    if (!selectedPartner) return [];
    let list = transactions.filter(t => (t.customerName || '').trim().toLowerCase() === selectedPartner.toLowerCase());
    
    if (statementStartDate) {
      list = list.filter(t => t.date >= statementStartDate);
    }
    if (statementEndDate) {
      list = list.filter(t => t.date <= statementEndDate);
    }

    // Sort chronologically ascending for statement running balance
    return list.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.createdAt - b.createdAt));
  }, [transactions, selectedPartner, statementStartDate, statementEndDate]);

  // Delete Individual Transaction
  const confirmDeleteTx = async () => {
    if (!deleteTxTarget?.id) return;
    setIsDeleting(true);
    try {
      await db.deleteAccountingTransaction(deleteTxTarget.id, user.id);
      setDeleteTxTarget(null);
      onTransactionsUpdated();
      onShowToast(i18n.language === 'ku' ? 'تۆمارەکە بە سەرکەوتوویی سڕایەوە' : 'Record deleted successfully', 'info');
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە سڕینەوە' : 'Failed to delete record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Entire Partner and all their entries
  const confirmDeletePartner = async () => {
    if (!deletePartnerTarget) return;
    setIsDeleting(true);
    try {
      const partnerTxs = transactions.filter(t => (t.customerName || '').trim().toLowerCase() === deletePartnerTarget.toLowerCase());
      for (const tx of partnerTxs) {
        if (tx.id) {
          await db.deleteAccountingTransaction(tx.id, user.id);
        }
      }
      const partnerName = deletePartnerTarget;
      setDeletePartnerTarget(null);
      setSelectedPartner(null);
      onTransactionsUpdated();
      onShowToast(i18n.language === 'ku' ? `تەواوی حیساباتی هاوبەش (${partnerName}) بە سەرکەوتوویی سڕایەوە` : 'Partner records deleted successfully', 'info');
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە سڕینەوە' : 'Failed to delete partner', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selected partner summary metrics
  const partnerMetrics = useMemo(() => {
    if (!selectedPartner) return { totalDebits: 0, totalCredits: 0, netBalance: 0 };
    let totalDebits = 0; // پارەی لای ئەوانە (Receivables)
    let totalCredits = 0; // پارەی دراو (Payments / Deductions)

    activePartnerTxs.forEach(t => {
      if (t.type === 'income' || (t.type === 'debt' && t.direction !== 'outgoing')) {
        totalDebits += t.amount + (t.remainingDebt || 0);
      } else if (t.type === 'receipt_voucher') {
        totalCredits += t.amount;
      } else if (t.type === 'payment_voucher') {
        totalDebits += t.amount;
      }
    });

    const currentP = partnerList.find(p => p.name.toLowerCase() === selectedPartner.toLowerCase());
    return {
      totalDebits,
      totalCredits,
      netBalance: currentP ? currentP.balance : 0
    };
  }, [activePartnerTxs, selectedPartner, partnerList]);

  // Save Voucher (سەندی وەرگرتن / سەندی خەرجکردن)
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) {
      onShowToast(i18n.language === 'ku' ? 'تکایە سەرەتا بازرگانەکە دیاری بکە' : 'Please select partner first', 'error');
      return;
    }
    const amt = parseFloat(voucherAmount);
    if (!amt || amt <= 0) {
      onShowToast(i18n.language === 'ku' ? 'تکایە بڕی پارەکە بنووسە' : 'Enter a valid amount', 'error');
      return;
    }

    const isReceipt = voucherType === 'receipt';
    const title = isReceipt 
      ? `سەندی وەرگرتنی پارە (قبض) لە ${selectedPartner}`
      : `سەندی دانی پارە (صرف) بۆ ${selectedPartner}`;

    try {
      await db.saveAccountingTransaction({
        userId: user.id,
        type: isReceipt ? 'receipt_voucher' : 'payment_voucher',
        title,
        amount: amt,
        currency: voucherCurrency,
        category: 'B2B Settlement',
        date: voucherDate,
        customerName: selectedPartner,
        note: voucherNote,
        status: 'paid',
        invoiceNumber: `${isReceipt ? 'RCV' : 'PAY'}-${Date.now().toString().slice(-6)}`
      });

      setShowVoucherModal(false);
      setVoucherAmount('');
      setVoucherNote('');
      onTransactionsUpdated();
      onShowToast(
        i18n.language === 'ku' ? 'سەندەکە بە سەرکەوتوویی تۆمارکرا' : 'Voucher recorded successfully!',
        'success'
      );
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە تۆمارکردن' : 'Error recording voucher', 'error');
    }
  };

  // WhatsApp Statement Dispatch
  const handleSendStatementWhatsApp = () => {
    if (!selectedPartner) return;
    const currentP = partnerList.find(p => p.name.toLowerCase() === selectedPartner.toLowerCase());
    const phone = (currentP?.phone || '').replace(/[^0-9]/g, '');
    const storeName = user.name || 'فرۆشگا';
    const dateStr = new Date().toISOString().split('T')[0];

    let msg = `کەشف حیسابی فەرمی (Statement of Account)\n` +
      `🏢 لە نێوان: *${storeName}* ⟷ *${selectedPartner}*\n` +
      `📅 بەروار: ${dateStr}\n\n` +
      `📊 پوختەی حیسابات:\n` +
      `▫️ ژمارەی مامەڵەکان: ${activePartnerTxs.length}\n` +
      `▫️ دۆخی باڵانسی ماوە: *${Math.abs(partnerMetrics.netBalance).toLocaleString()} دینار* ${partnerMetrics.netBalance > 0 ? '(لای ئێوە ماوە)' : partnerMetrics.netBalance < 0 ? '(لای ئێمە ماوە)' : '(حیساب پاک)'}\n\n` +
      `📜 دواین ۳ مامەڵە:\n`;

    activePartnerTxs.slice(-3).forEach(t => {
      msg += `• [${t.date}] ${t.title} : ${t.amount.toLocaleString()} د.ع\n`;
    });

    msg += `\nسوپاس بۆ هاوبەشی و متمانەتان لەگەڵمان.`;

    const encoded = encodeURIComponent(msg);
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('964') ? phone : '964' + phone.replace(/^0/, '')}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  function getPartnerTypeLabel(type?: string) {
    if (type === 'factory') return i18n.language === 'ku' ? '🏭 کارگە' : 'Factory';
    if (type === 'supplier') return i18n.language === 'ku' ? '🚢 هاوردەکار / سەرچاوە' : 'Supplier / Importer';
    if (type === 'distributor') return i18n.language === 'ku' ? '🚚 بریکاری دابەشکردن' : 'Distributor';
    if (type === 'retailer') return i18n.language === 'ku' ? '🏪 مارکێت / فرۆشیار' : 'Retailer';
    return i18n.language === 'ku' ? '📦 کۆگای کۆ (Wholesaler)' : 'Wholesaler';
  }

  return (
    <div className="space-y-3">
      {/* Main 2-Column Layout: Left (Partner Directory) & Right (Statement of Account) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Col: Merchant Partners Directory (4 cols) */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800/90 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black uppercase text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{i18n.language === 'ku' ? 'هاوبەشە بازرگانییەکان' : 'Partners'}</span>
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md">
                {partnerList.length}
              </span>
            </h4>

            <button
              type="button"
              onClick={() => setShowAddPartnerModal(true)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{i18n.language === 'ku' ? '+ نوێ' : '+ Add'}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
              placeholder={i18n.language === 'ku' ? 'گەڕان بۆ بازرگان، کۆگا...' : 'Search merchant, store...'}
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Partners List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredPartners.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl space-y-2">
                <Building2 className="w-6 h-6 text-slate-600 mx-auto" />
                <p>{i18n.language === 'ku' ? 'هیچ هاوبەشێک نەدۆزرایەوە.' : 'No merchant partners found.'}</p>
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(true)}
                  className="px-3 py-1.5 bg-indigo-600/30 text-indigo-300 rounded-lg text-[11px] font-bold border border-indigo-500/30 cursor-pointer"
                >
                  {i18n.language === 'ku' ? 'زیادکردنی یەکەم بازرگان' : 'Add First Merchant'}
                </button>
              </div>
            ) : (
              filteredPartners.map((partner) => {
                const isSelected = selectedPartner === partner.name;
                return (
                  <div
                    key={partner.name}
                    onClick={() => setSelectedPartner(partner.name)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-white">{partner.name}</p>
                        <span className="text-[10px] text-indigo-300 font-bold">
                          {getPartnerTypeLabel(partner.type)}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`text-xs font-black ${
                            partner.balance > 0
                              ? 'text-emerald-400'
                              : partner.balance < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {Math.abs(partner.balance).toLocaleString()} <span className="text-[9px] font-sans">IQD</span>
                        </span>
                        <p className="text-[9px] font-sans text-slate-400">
                          {partner.balance > 0
                            ? (i18n.language === 'ku' ? 'لای ئەوانە (+)' : 'Receivable (+)')
                            : partner.balance < 0
                            ? (i18n.language === 'ku' ? 'لای ئێمەیە (-)' : 'Payable (-)')
                            : (i18n.language === 'ku' ? 'حیساب پاک' : 'Settled')}
                        </p>
                      </div>
                    </div>

                    {partner.phone && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{partner.phone}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Active Merchant Statement & Transactions (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          {selectedPartner ? (
            <>
              {/* Statement Header Card */}
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">{selectedPartner}</h3>
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md text-[10px] font-mono border border-indigo-500/30">
                      {activePartnerTxs.length} {i18n.language === 'ku' ? 'مامەڵە' : 'txs'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {i18n.language === 'ku' ? 'کەشف حیسابی تەواوی نێوان دوو بازرگان' : 'Official Mutual Statement of Account'}
                  </p>
                </div>

                {/* Net Balance Status */}
                <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-white/10 text-right font-mono">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">
                    {i18n.language === 'ku' ? 'صافی باڵانس (Net Balance)' : 'Running Balance'}
                  </span>
                  <span
                    className={`text-lg font-black ${
                      partnerMetrics.netBalance > 0
                        ? 'text-emerald-400'
                        : partnerMetrics.netBalance < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {Math.abs(partnerMetrics.netBalance).toLocaleString()} <span className="text-xs font-sans font-bold">IQD</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans font-bold">
                    {partnerMetrics.netBalance > 0
                      ? (i18n.language === 'ku' ? 'کۆگا/کڕیار قەرزارە' : 'They Owe Us')
                      : partnerMetrics.netBalance < 0
                      ? (i18n.language === 'ku' ? 'ئێمە قەرزارین' : 'We Owe Them')
                      : (i18n.language === 'ku' ? 'باڵانس پاکتاوکراوە' : 'Fully Settled')}
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div className="w-full flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => onOpenInvoiceModal(undefined, selectedPartner)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{i18n.language === 'ku' ? '+ دەرکردنی پسوولەی B2B' : '+ New B2B Invoice'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoucherType('receipt');
                      setShowVoucherModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-xl text-xs font-bold border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{i18n.language === 'ku' ? '+ وەرگرتنی پارە (سەندی قبض)' : '+ Receipt Voucher'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoucherType('payment');
                      setShowVoucherModal(true);
                    }}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>{i18n.language === 'ku' ? '+ دانی پارە (سەندی صرف)' : '+ Payment Voucher'}</span>
                  </button>

                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSendStatementWhatsApp}
                      className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl border border-emerald-500/30 transition-all cursor-pointer"
                      title={i18n.language === 'ku' ? 'ناردنی کەشف حیساب بۆ واتسئاپ' : 'Send Statement via WhatsApp'}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
                      title={i18n.language === 'ku' ? 'چاپکردنی کەشف حیساب' : 'Print Statement'}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletePartnerTarget(selectedPartner)}
                      className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      title={i18n.language === 'ku' ? 'سڕینەوەی ئەم هاوبەشە' : 'Delete this partner'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{i18n.language === 'ku' ? 'سڕینەوەی هاوبەش' : 'Delete Partner'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Statement Transactions Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 p-3 flex items-center justify-between border-b border-white/10 text-xs">
                  <span className="font-black text-slate-300">
                    {i18n.language === 'ku' ? 'تۆماری جوڵەی دارایی (Ledger Entries)' : 'Statement of Account Table'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={statementStartDate}
                      onChange={(e) => setStatementStartDate(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-[11px] text-slate-300 font-mono"
                    />
                    <span className="text-slate-500">تا</span>
                    <input
                      type="date"
                      value={statementEndDate}
                      onChange={(e) => setStatementEndDate(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-white/10 rounded-lg text-[11px] text-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-black border-b border-white/5 text-[11px]">
                      <tr>
                        <th className="p-3">{i18n.language === 'ku' ? 'بەروار' : 'Date'}</th>
                        <th className="p-3">{i18n.language === 'ku' ? 'پسوولە / جۆری مامەڵە' : 'Tx / Invoice'}</th>
                        <th className="p-3 text-right">{i18n.language === 'ku' ? 'ڕاکێشان (مدین)' : 'Debit'}</th>
                        <th className="p-3 text-right">{i18n.language === 'ku' ? 'وەرگرتن (دائن)' : 'Credit'}</th>
                        <th className="p-3 text-right">{i18n.language === 'ku' ? 'باڵانس' : 'Balance'}</th>
                        <th className="p-3 text-center">{i18n.language === 'ku' ? 'کردار' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {activePartnerTxs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            {i18n.language === 'ku' ? 'هیچ جوڵەیەکی دارایی بۆ ئەم بازرگانە تۆمار نەکراوە.' : 'No transactions recorded for this merchant.'}
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          let runningBalance = 0;
                          return activePartnerTxs.map((tx) => {
                            const isIncome = tx.type === 'income' || (tx.type === 'debt' && tx.direction !== 'outgoing');
                            const isReceipt = tx.type === 'receipt_voucher';
                            const isPayment = tx.type === 'payment_voucher';

                            const debitAmt = isIncome ? (tx.amount + (tx.remainingDebt || 0)) : isPayment ? tx.amount : 0;
                            const creditAmt = isReceipt ? tx.amount : (!isIncome && !isPayment ? tx.amount : 0);

                            runningBalance += (debitAmt - creditAmt);

                            return (
                              <tr key={tx.id} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{tx.date}</td>
                                <td className="p-3 text-white font-bold">
                                  <div className="flex items-center gap-1.5">
                                    <span>{tx.title}</span>
                                    {tx.invoiceNumber && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-indigo-300 rounded border border-white/5">
                                        #{tx.invoiceNumber}
                                      </span>
                                    )}
                                  </div>
                                  {tx.note && <p className="text-[10px] text-slate-400 font-normal mt-0.5">{tx.note}</p>}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                  {debitAmt > 0 ? debitAmt.toLocaleString() : '-'}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-rose-400">
                                  {creditAmt > 0 ? creditAmt.toLocaleString() : '-'}
                                </td>
                                <td className="p-3 text-right font-mono font-black text-indigo-300">
                                  {runningBalance.toLocaleString()}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => tx.id && setDeleteTxTarget({ id: tx.id, title: tx.title, amount: tx.amount, date: tx.date })}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer active:scale-95"
                                    title={i18n.language === 'ku' ? 'سڕینەوەی ئەم مامەڵەیە' : 'Delete transaction'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <Building2 className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-sm font-bold text-slate-400">
                {i18n.language === 'ku' ? 'تکایە بازرگانێک لە لیستەکەی دەستەچپ هەڵبژێرە بۆ بینینی کەشف حیساب' : 'Select a merchant from the left list to view their ledger & statement'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD BUSINESS PARTNER */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>{i18n.language === 'ku' ? 'تۆمارکردنی هاوبەشی بازرگانی نوێ' : 'Add New Business Partner'}</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPartnerName.trim()) return;
                setSelectedPartner(newPartnerName.trim());
                setShowAddPartnerModal(false);
                onShowToast(i18n.language === 'ku' ? 'بازرگانەکە زیادکرا' : 'Partner added', 'success');
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  {i18n.language === 'ku' ? 'ناوی بازرگان / کۆمپانیا / کۆگا' : 'Merchant / Company Name'}
                </label>
                <input
                  type="text"
                  required
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="e.g. کۆمپانیای دابەشکردنی ژیان"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    {i18n.language === 'ku' ? 'جۆری هاوبەش' : 'Partner Type'}
                  </label>
                  <select
                    value={newPartnerType}
                    onChange={(e: any) => setNewPartnerType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="wholesaler">{i18n.language === 'ku' ? 'کۆگای کۆ (Wholesaler)' : 'Wholesaler'}</option>
                    <option value="factory">{i18n.language === 'ku' ? 'کارگە (Factory)' : 'Factory'}</option>
                    <option value="supplier">{i18n.language === 'ku' ? 'هاوردەکار (Supplier)' : 'Supplier'}</option>
                    <option value="distributor">{i18n.language === 'ku' ? 'بریکاری دابەشکردن' : 'Distributor'}</option>
                    <option value="retailer">{i18n.language === 'ku' ? 'مارکێت / تاکفرۆش' : 'Retailer'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    {i18n.language === 'ku' ? 'مۆبایل / واتسئاپ' : 'Phone / WhatsApp'}
                  </label>
                  <input
                    type="tel"
                    value={newPartnerPhone}
                    onChange={(e) => setNewPartnerPhone(e.target.value)}
                    placeholder="0750 123 4567"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  {i18n.language === 'ku' ? 'شار و ناونیشان' : 'City & Address'}
                </label>
                <input
                  type="text"
                  value={newPartnerCity}
                  onChange={(e) => setNewPartnerCity(e.target.value)}
                  placeholder="Erbil, Sulaymaniyah, Duhok..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {i18n.language === 'ku' ? 'داخستن' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  {i18n.language === 'ku' ? 'پاشەکەوتکردن' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VOUCHER ENTRY (RECEIPT / PAYMENT) */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2">
              {voucherType === 'receipt' ? (
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
              )}
              <h3 className="text-base font-black text-white">
                {voucherType === 'receipt'
                  ? (i18n.language === 'ku' ? `سەندی وەرگرتنی پارە (قبض) - ${selectedPartner}` : `Receipt Voucher - ${selectedPartner}`)
                  : (i18n.language === 'ku' ? `سەندی دانی پارە (صرف) - ${selectedPartner}` : `Payment Voucher - ${selectedPartner}`)}
              </h3>
            </div>

            <form onSubmit={handleSaveVoucher} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    {i18n.language === 'ku' ? 'بڕی پارە' : 'Amount'}
                  </label>
                  <input
                    type="number"
                    required
                    value={voucherAmount}
                    onChange={(e) => setVoucherAmount(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    {i18n.language === 'ku' ? 'دراو' : 'Currency'}
                  </label>
                  <select
                    value={voucherCurrency}
                    onChange={(e: any) => setVoucherCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none"
                  >
                    <option value="IQD">IQD (دینار)</option>
                    <option value="USD">USD (دۆلار)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  {i18n.language === 'ku' ? 'بەروار' : 'Date'}
                </label>
                <input
                  type="date"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  {i18n.language === 'ku' ? 'تێبینی و وردەکاری' : 'Note / Reference'}
                </label>
                <input
                  type="text"
                  value={voucherNote}
                  onChange={(e) => setVoucherNote(e.target.value)}
                  placeholder="e.g. وەرگرتنی پارەی نەختینە بۆ پسوولەی ژمارە..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {i18n.language === 'ku' ? 'داخستن' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-lg ${
                    voucherType === 'receipt'
                      ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                      : 'bg-rose-400 hover:bg-rose-300 shadow-rose-500/20'
                  }`}
                >
                  {i18n.language === 'ku' ? 'تۆمارکردنی سەند' : 'Record Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: IN-APP DELETE TRANSACTION CONFIRMATION MODAL */}
      {deleteTxTarget && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {i18n.language === 'ku' ? 'دڵنیایت لە ڕەشکردنەوەی ئەم تۆمارە؟' : 'Delete this transaction?'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {i18n.language === 'ku' ? 'ئەم کردارە لە دەفتەری حیساباتدا ناگەڕێتەوە.' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-white">
                <span>{deleteTxTarget.title || (i18n.language === 'ku' ? 'تۆماری دارایی' : 'Transaction')}</span>
                {deleteTxTarget.amount !== undefined && (
                  <span className="font-mono text-emerald-400">{deleteTxTarget.amount.toLocaleString()} د.ع</span>
                )}
              </div>
              {deleteTxTarget.date && (
                <div className="text-slate-400 text-[11px] font-mono">
                  {deleteTxTarget.date}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTxTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {i18n.language === 'ku' ? 'پەشیمان بوونەوە' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTx}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? (i18n.language === 'ku' ? 'دەسڕدرێتەوە...' : 'Deleting...') : (i18n.language === 'ku' ? 'بەڵێ، ڕەشی بکەوە' : 'Yes, Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE ENTIRE PARTNER CONFIRMATION */}
      {deletePartnerTarget && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {i18n.language === 'ku' ? `سڕینەوەی سەرجەم حیساباتی (${deletePartnerTarget})` : `Delete all records for (${deletePartnerTarget})`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {i18n.language === 'ku' ? 'تەواوی پسوولە و سەندەکانی ئەم بازرگانە دەسڕدرێنەوە.' : 'All invoices and vouchers for this partner will be deleted.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletePartnerTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {i18n.language === 'ku' ? 'پەشیمان بوونەوە' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeletePartner}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? (i18n.language === 'ku' ? 'دەسڕدرێتەوە...' : 'Deleting...') : (i18n.language === 'ku' ? 'بەڵێ، هەمووی بسڕەوە' : 'Yes, Delete All')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
