import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Printer, 
  Share2, 
  MessageCircle, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Percent, 
  RefreshCw, 
  FileText,
  AlertCircle,
  Plus,
  X,
  Check,
  Package,
  Layers,
  ShoppingBag,
  Send,
  Phone,
  User as UserIcon,
  Tag,
  Receipt,
  Building2,
  Users,
  Minus,
  Sparkles
} from 'lucide-react';
import { db, User, AccountingTransaction } from '../lib/db';
import { B2BMerchantLedger } from './accounting/B2BMerchantLedger';
import { MultiItemInvoiceModal } from './accounting/MultiItemInvoiceModal';
import { CashRegisterAndCalculator } from './accounting/CashRegisterAndCalculator';

interface AccountingModuleProps {
  user: User;
  i18n: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AccountingModule: React.FC<AccountingModuleProps> = ({ user, i18n, onShowToast }) => {
  // Main Dual Mode: 'accounting' (ژمێریار) or 'calculator' (حاسیبە بە تەنیا)
  const [mainMode, setMainMode] = useState<'accounting' | 'calculator'>('accounting');

  // Sub-filter inside 'accounting': 'all' | 'sales' | 'expenses' | 'debts' | 'b2b'
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'sales' | 'expenses' | 'debts' | 'b2b'>('all');
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Quick Single Transaction Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [txType, setTxType] = useState<'income' | 'expense' | 'debt'>('income');
  const [saleMode, setSaleMode] = useState<'retail' | 'wholesale' | 'b2b'>('retail');
  const [txTitle, setTxTitle] = useState<string>('');
  
  // Wholesale & Retail details
  const [txQuantity, setTxQuantity] = useState<string>('1');
  const [txUnitType, setTxUnitType] = useState<'piece' | 'box' | 'pack' | 'kg' | 'set' | 'ton'>('piece');
  const [txUnitPrice, setTxUnitPrice] = useState<string>('');
  const [txDiscount, setTxDiscount] = useState<string>('0');
  const [txCustomTotal, setTxCustomTotal] = useState<string>('');
  const [isCustomTotal, setIsCustomTotal] = useState<boolean>(false);

  // Payment Type
  const [paymentType, setPaymentType] = useState<'full_cash' | 'partial' | 'full_debt'>('full_cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  
  const [txCategory, setTxCategory] = useState<string>('Sales');
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState<string>('');
  const [txCustomer, setTxCustomer] = useState<string>('');
  const [txCustomerPhone, setTxCustomerPhone] = useState<string>('');

  // Multi-Item / B2B Invoice Modal State
  const [showMultiInvoiceModal, setShowMultiInvoiceModal] = useState<boolean>(false);
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<AccountingTransaction | null>(null);
  const [defaultPartnerName, setDefaultPartnerName] = useState<string>('');

  // Search in Ledger
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Delete Confirmation State (In-app modal to avoid iframe window.confirm blocking)
  const [deleteTargetTx, setDeleteTargetTx] = useState<AccountingTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);

  // Load Transactions
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await db.getAccountingTransactions(user.id);
      setTransactions(data);
    } catch (err) {
      console.error("Error loading accounting transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Computed Total for Quick Form
  const qtyNum = parseFloat(txQuantity) || 1;
  const unitPriceNum = parseFloat(txUnitPrice) || 0;
  const discountNum = parseFloat(txDiscount) || 0;
  
  const computedSubtotal = qtyNum * unitPriceNum;
  const computedNetTotal = Math.max(0, computedSubtotal - discountNum);
  
  const effectiveTotal = isCustomTotal 
    ? (parseFloat(txCustomTotal) || 0) 
    : (unitPriceNum > 0 ? computedNetTotal : (parseFloat(txCustomTotal) || 0));

  const paidAmountNum = paymentType === 'full_cash' 
    ? effectiveTotal 
    : paymentType === 'full_debt' 
    ? 0 
    : (parseFloat(paidAmount) || 0);

  const remainingDebtNum = Math.max(0, effectiveTotal - paidAmountNum);

  useEffect(() => {
    if (!isCustomTotal && unitPriceNum > 0) {
      setTxCustomTotal(String(computedNetTotal));
    }
  }, [txQuantity, txUnitPrice, txDiscount, isCustomTotal, computedNetTotal]);

  // Handle Save Quick Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim()) {
      onShowToast(i18n.language === 'ku' ? 'تکایە ناوی کار یان کاڵاکە بنووسە' : 'Please enter item title', 'error');
      return;
    }

    if (effectiveTotal <= 0) {
      onShowToast(i18n.language === 'ku' ? 'تکایە بڕی پارەکە بە دروستی دیاری بکە' : 'Please enter a valid amount', 'error');
      return;
    }

    const generatedInvoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    try {
      if (txType === 'income' && paymentType === 'partial') {
        // 1. Partial Cash Part
        await db.saveAccountingTransaction({
          userId: user.id,
          type: 'income',
          title: `${txTitle} (کاشی بەشەکی)`,
          amount: paidAmountNum,
          category: txCategory || 'Sales',
          date: txDate,
          note: `${txNote ? txNote + ' | ' : ''}کۆی گشتی: ${effectiveTotal.toLocaleString()} د.ع (دراو: ${paidAmountNum.toLocaleString()} | ماوە وەک قەرز: ${remainingDebtNum.toLocaleString()})`,
          customerName: txCustomer,
          customerPhone: txCustomerPhone,
          status: 'paid',
          saleMode,
          quantity: qtyNum,
          unitType: txUnitType,
          unitPrice: unitPriceNum,
          discount: discountNum,
          paymentType: 'partial',
          paidAmount: paidAmountNum,
          remainingDebt: remainingDebtNum,
          invoiceNumber: generatedInvoiceNo
        });

        // 2. Partial Debt Part
        if (remainingDebtNum > 0) {
          await db.saveAccountingTransaction({
            userId: user.id,
            type: 'debt',
            title: `ماوەی قەرزی: ${txTitle}`,
            amount: remainingDebtNum,
            category: 'Customer Debt',
            date: txDate,
            note: `ماوەی قەرزی پسوولەی #${generatedInvoiceNo}`,
            customerName: txCustomer,
            customerPhone: txCustomerPhone,
            status: 'unpaid',
            saleMode,
            quantity: qtyNum,
            unitType: txUnitType,
            unitPrice: unitPriceNum,
            paymentType: 'partial',
            paidAmount: paidAmountNum,
            remainingDebt: remainingDebtNum,
            invoiceNumber: generatedInvoiceNo
          });
        }
      } else {
        const finalType = txType === 'income' && paymentType === 'full_debt' ? 'debt' : txType;
        const finalStatus = finalType === 'debt' ? 'unpaid' : 'paid';

        await db.saveAccountingTransaction({
          userId: user.id,
          type: finalType,
          title: txTitle,
          amount: effectiveTotal,
          category: txCategory,
          date: txDate,
          note: txNote,
          customerName: txCustomer,
          customerPhone: txCustomerPhone,
          status: finalStatus,
          saleMode: finalType === 'expense' ? undefined : saleMode,
          quantity: qtyNum,
          unitType: txUnitType,
          unitPrice: unitPriceNum,
          discount: discountNum,
          paymentType: paymentType,
          paidAmount: paymentType === 'full_cash' ? effectiveTotal : (paymentType === 'full_debt' ? 0 : paidAmountNum),
          remainingDebt: paymentType === 'full_debt' ? effectiveTotal : (paymentType === 'partial' ? remainingDebtNum : 0),
          invoiceNumber: generatedInvoiceNo
        });
      }

      setShowAddModal(false);
      resetForm();
      loadData();
      onShowToast(i18n.language === 'ku' ? 'مامەڵەکە بە سەرکەوتوویی تۆمارکرا' : 'Transaction saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە تۆمارکردن' : 'Failed to save transaction', 'error');
    }
  };

  const resetForm = () => {
    setTxTitle('');
    setTxUnitPrice('');
    setTxCustomTotal('');
    setIsCustomTotal(false);
    setTxDiscount('0');
    setTxQuantity('1');
    setPaidAmount('');
    setPaymentType('full_cash');
    setTxNote('');
    setTxCustomer('');
    setTxCustomerPhone('');
  };

  const openQuickAdd = (type: 'income' | 'expense' | 'debt') => {
    setTxType(type);
    resetForm();
    setShowAddModal(true);
  };

  // Toggle Debt Status (Unpaid <-> Paid)
  const handleToggleDebtStatus = async (tx: AccountingTransaction) => {
    const newStatus = tx.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await db.saveAccountingTransaction({
        ...tx,
        status: newStatus
      });
      loadData();
      onShowToast(
        newStatus === 'paid' 
          ? (i18n.language === 'ku' ? 'قەرزەکە وەک دراو (حیساب پاک) تۆمارکرا' : 'Debt marked as settled!')
          : (i18n.language === 'ku' ? 'قەرزەکە گەڕێندرایەوە بۆ نەدراو' : 'Debt marked as unpaid'),
        'info'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Transaction Handlers
  const handleRequestDeleteTx = (tx: AccountingTransaction) => {
    setDeleteTargetTx(tx);
  };

  const confirmDeleteTx = async () => {
    if (!deleteTargetTx?.id) return;
    setIsDeleting(true);
    try {
      await db.deleteAccountingTransaction(deleteTargetTx.id, user.id);
      setDeleteTargetTx(null);
      loadData();
      onShowToast(i18n.language === 'ku' ? 'تۆمارەکە بە سەرکەوتوویی ڕەشکرایەوە (سڕایەوە)' : 'Record deleted successfully', 'info');
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە کاتی سڕینەوە' : 'Failed to delete record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmClearFilteredTxs = async () => {
    if (filteredTransactions.length === 0) return;
    setIsDeleting(true);
    try {
      for (const tx of filteredTransactions) {
        if (tx.id) {
          await db.deleteAccountingTransaction(tx.id, user.id);
        }
      }
      setShowClearAllModal(false);
      loadData();
      onShowToast(i18n.language === 'ku' ? 'تەواوی تۆمارە فلتەرکراوەکان سڕانەوە' : 'Filtered records deleted successfully', 'info');
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا' : 'Failed to clear records', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // High-level Financial Metrics Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.date === todayStr);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const totalUnpaidDebts = transactions
    .filter(t => t.type === 'debt' && t.status === 'unpaid')
    .reduce((sum, t) => sum + (t.remainingDebt !== undefined ? t.remainingDebt : t.amount), 0);

  const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const todayNetProfit = todayIncome - todayExpense;

  // Computed Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (ledgerFilter === 'sales' && t.type !== 'income') return false;
      if (ledgerFilter === 'expenses' && t.type !== 'expense') return false;
      if (ledgerFilter === 'debts' && t.type !== 'debt') return false;

      // Search Term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchCustomer = (t.customerName || '').toLowerCase().includes(query);
        const matchPhone = (t.customerPhone || '').includes(query);
        const matchCategory = (t.category || '').toLowerCase().includes(query);
        const matchInvoice = (t.invoiceNumber || '').toLowerCase().includes(query);
        return matchTitle || matchCustomer || matchPhone || matchCategory || matchInvoice;
      }
      return true;
    });
  }, [transactions, ledgerFilter, searchTerm]);

  // Debt items only
  const debtTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'debt');
  }, [transactions]);

  // Open Invoice Builder
  const handleOpenInvoiceModal = (tx?: AccountingTransaction, partnerName?: string) => {
    setSelectedInvoiceTx(tx || null);
    setDefaultPartnerName(partnerName || '');
    setShowMultiInvoiceModal(true);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Primary 2-Tab Switcher: 1. ژمێریار (Accounting) | 2. حاسیبە (Calculator) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-lg">
        <button
          type="button"
          onClick={() => setMainMode('accounting')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
            mainMode === 'accounting'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{i18n.language === 'ku' ? '🏢 ژمێریار و باڵانس' : 'Accounting & Ledger'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMainMode('calculator')}
          className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
            mainMode === 'calculator'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-400/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{i18n.language === 'ku' ? '🧮 حاسیبە' : 'Calculator'}</span>
        </button>
      </div>

      {/* VIEW 1: ACCOUNTING (ژمێریار) */}
      {mainMode === 'accounting' && (
        <div className="space-y-3">
          {/* TOP SECTION: MOST IMPORTANT FINANCIAL METRICS AT THE TOP */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Metric 1: Net Balance (Available Cash) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/70 border border-indigo-500/30 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wide flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                  {i18n.language === 'ku' ? 'باڵانسی پوخت' : 'Net Cash'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${netBalance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {netBalance >= 0 ? '+' : '-'}
                </span>
              </div>
              <p className={`text-lg sm:text-xl font-black font-mono tracking-tight mt-1.5 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netBalance.toLocaleString()} <span className="text-[11px] font-sans text-slate-300 font-bold">د.ع</span>
              </p>
            </div>

            {/* Metric 2: Total Sales & Income */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  {i18n.language === 'ku' ? 'کۆی فرۆش' : 'Total Sales'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {transactions.filter(t => t.type === 'income').length} {i18n.language === 'ku' ? 'دانە' : 'tx'}
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-300 tracking-tight mt-1.5">
                {totalIncome.toLocaleString()} <span className="text-[11px] font-sans text-slate-400">د.ع</span>
              </p>
            </div>

            {/* Metric 3: Total Expenses */}
            <div className="bg-slate-950 border border-rose-500/30 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-rose-400 uppercase tracking-wide flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                  {i18n.language === 'ku' ? 'کۆی خەرجی' : 'Total Expenses'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {transactions.filter(t => t.type === 'expense').length} {i18n.language === 'ku' ? 'دانە' : 'tx'}
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-rose-300 tracking-tight mt-1.5">
                {totalExpense.toLocaleString()} <span className="text-[11px] font-sans text-slate-400">د.ع</span>
              </p>
            </div>

            {/* Metric 4: Unpaid Customer Debts */}
            <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {i18n.language === 'ku' ? 'قەرزی نەدراو' : 'Unpaid Debts'}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {debtTransactions.filter(t => t.status === 'unpaid').length} {i18n.language === 'ku' ? 'قەرز' : 'unpaid'}
                </span>
              </div>
              <p className="text-lg sm:text-xl font-black font-mono text-amber-300 tracking-tight mt-1.5">
                {totalUnpaidDebts.toLocaleString()} <span className="text-[11px] font-sans text-slate-400">د.ع</span>
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS & SEARCH/FILTER BAR (COMPACT & ZERO WASTED SPACE) */}
          <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 shadow-md space-y-2.5">
            {/* Quick Action Direct Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => openQuickAdd('income')}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{i18n.language === 'ku' ? '+ تۆماری فرۆش' : '+ Add Sale'}</span>
              </button>

              <button
                type="button"
                onClick={() => openQuickAdd('expense')}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
                <span>{i18n.language === 'ku' ? '+ تۆماری خەرجی' : '+ Add Expense'}</span>
              </button>

              <button
                type="button"
                onClick={() => openQuickAdd('debt')}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Clock className="w-4 h-4" />
                <span>{i18n.language === 'ku' ? '+ تۆماری قەرز' : '+ Add Debt'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenInvoiceModal()}
                className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Receipt className="w-4 h-4 text-indigo-400" />
                <span>{i18n.language === 'ku' ? '+ پسوولە' : '+ Invoice'}</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              {/* Ledger Sub-Tabs Filter */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                <button
                  type="button"
                  onClick={() => setLedgerFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilter === 'all'
                      ? 'bg-slate-800 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {i18n.language === 'ku' ? 'هەموو' : 'All'} ({transactions.length})
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerFilter('sales')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilter === 'sales'
                      ? 'bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {i18n.language === 'ku' ? 'فرۆش' : 'Sales'}
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerFilter('expenses')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilter === 'expenses'
                      ? 'bg-rose-500/20 text-rose-300 font-black border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {i18n.language === 'ku' ? 'خەرجی' : 'Expenses'}
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerFilter('debts')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilter === 'debts'
                      ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {i18n.language === 'ku' ? 'قەرزەکان' : 'Debts'} ({debtTransactions.filter(t => t.status === 'unpaid').length})
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerFilter('b2b')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilter === 'b2b'
                      ? 'bg-indigo-600 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {i18n.language === 'ku' ? 'بازرگانان (B2B)' : 'B2B Partners'}
                </button>
              </div>

              {/* Search & Actions Bar */}
              {ledgerFilter !== 'b2b' && (
                <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                  <div className="relative flex-grow sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={i18n.language === 'ku' ? 'گەڕان...' : 'Search...'}
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {filteredTransactions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearAllModal(true)}
                      className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title={i18n.language === 'ku' ? 'سڕینەوەی ئەم تۆمارانە' : 'Clear filtered records'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{i18n.language === 'ku' ? 'سڕینەوەی هەمووی' : 'Clear All'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MAIN LEDGER DATA / B2B RENDER */}
          {ledgerFilter === 'b2b' ? (
            <B2BMerchantLedger
              user={user}
              transactions={transactions}
              onTransactionsUpdated={loadData}
              i18n={i18n}
              onShowToast={onShowToast}
              onOpenInvoiceModal={handleOpenInvoiceModal}
            />
          ) : (
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-2">
                  <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-bold text-xs text-slate-300">
                    {i18n.language === 'ku' ? 'هیچ تۆمارێک نەدۆزرایەوە.' : 'No records found.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openQuickAdd('income')}
                    className="mt-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{i18n.language === 'ku' ? 'تۆمارکردنی فرۆش' : 'Add First Sale'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const isDebt = tx.type === 'debt';
                    const isPaid = tx.status === 'paid';

                    return (
                      <div
                        key={tx.id}
                        className="bg-slate-950 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-3 shadow-md transition-all flex flex-col justify-between gap-2.5"
                      >
                        {/* Header: Badge & Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                                isIncome
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isExpense
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isIncome ? <ArrowUpRight className="w-3 h-3" /> : isExpense ? <ArrowDownLeft className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>
                                {isIncome 
                                  ? (i18n.language === 'ku' ? 'فرۆش' : 'Sale') 
                                  : isExpense 
                                  ? (i18n.language === 'ku' ? 'خەرجی' : 'Expense') 
                                  : (i18n.language === 'ku' ? 'قەرز' : 'Debt')}
                              </span>
                            </span>

                            {tx.invoiceNumber && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-bold">
                                #{tx.invoiceNumber}
                              </span>
                            )}

                            {isDebt && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${isPaid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                {isPaid ? (i18n.language === 'ku' ? 'دراوە' : 'Settled') : (i18n.language === 'ku' ? 'نەدراوە' : 'Unpaid')}
                              </span>
                            )}
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <span
                              className={`text-sm sm:text-base font-black ${
                                isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              {isIncome ? '+' : isExpense ? '-' : ''}{tx.amount.toLocaleString()}{' '}
                              <span className="text-[10px] font-sans text-slate-400">د.ع</span>
                            </span>
                          </div>
                        </div>

                        {/* Title & Customer info */}
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-white">{tx.title}</h4>
                          
                          {tx.quantity && tx.unitPrice ? (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {tx.quantity} {tx.unitType} × {tx.unitPrice.toLocaleString()} د.ع
                              {tx.discount ? ` (داشکاندن: ${tx.discount.toLocaleString()} د.ع)` : ''}
                            </p>
                          ) : null}

                          {tx.customerName && (
                            <div className="flex items-center gap-1 text-[11px] text-indigo-300 font-bold mt-1">
                              <UserIcon className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>{tx.customerName}</span>
                              {tx.customerPhone && <span className="text-slate-400 font-mono">({tx.customerPhone})</span>}
                            </div>
                          )}

                          {tx.note && (
                            <p className="text-[10px] text-slate-400 mt-1 bg-slate-900/60 p-1.5 rounded-lg border border-white/5 line-clamp-1">
                              {tx.note}
                            </p>
                          )}
                        </div>

                        {/* Footer: Date & Direct Actions */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {tx.date}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isDebt && (
                              <button
                                type="button"
                                onClick={() => handleToggleDebtStatus(tx)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  isPaid
                                    ? 'bg-slate-900 text-slate-400 hover:text-white'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{isPaid ? (i18n.language === 'ku' ? 'گەڕاندنەوە' : 'Unsettle') : (i18n.language === 'ku' ? 'وەرگیرا' : 'Mark Paid')}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceModal(tx, tx.customerName)}
                              className="p-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-white/5 cursor-pointer"
                              title="Invoice"
                            >
                              <Receipt className="w-3 h-3" />
                            </button>

                            {tx.customerPhone && (
                              <button
                                type="button"
                                onClick={() => {
                                  const p = tx.customerPhone!.replace(/[^0-9]/g, '');
                                  const msg = `سڵاو بەڕێز ${tx.customerName || ''}، ئاگاداری مامەڵەی (${tx.title}) بە بڕی ${tx.amount.toLocaleString()} دینار لەلایەن ${user.name || 'فرۆشگا'}.`;
                                  window.open(`https://wa.me/${p.startsWith('964') ? p : '964' + p.replace(/^0/, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="p-1 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-400 rounded-lg border border-emerald-500/20 cursor-pointer"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRequestDeleteTx(tx)}
                              className="p-1 bg-slate-900 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg border border-white/5 cursor-pointer transition-all active:scale-95"
                              title={i18n.language === 'ku' ? 'ڕەشکردنەوە و سڕینەوە' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
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
        </div>
      )}

      {/* VIEW 2: CALCULATOR (حاسیبە بە تەنیا) */}
      {mainMode === 'calculator' && (
        <CashRegisterAndCalculator
          user={user}
          transactions={transactions}
          i18n={i18n}
          onShowToast={onShowToast}
        />
      )}

      {/* MODAL 1: MULTI-ITEM / B2B INVOICE BUILDER */}
      {showMultiInvoiceModal && (
        <MultiItemInvoiceModal
          user={user}
          initialTx={selectedInvoiceTx}
          defaultPartnerName={defaultPartnerName}
          isOpen={showMultiInvoiceModal}
          onClose={() => {
            setShowMultiInvoiceModal(false);
            setSelectedInvoiceTx(null);
            setDefaultPartnerName('');
          }}
          onSaved={loadData}
          i18n={i18n}
          onShowToast={onShowToast}
        />
      )}

      {/* MODAL 2: QUICK ENTRY TRANSACTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>{i18n.language === 'ku' ? 'تۆمارکردنی خێرای مامەڵە' : 'Quick Transaction Record'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    txType === 'income' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {i18n.language === 'ku' ? 'فرۆشتن / داهات' : 'Sale / Income'}
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    txType === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {i18n.language === 'ku' ? 'خەرجی (Expense)' : 'Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('debt')}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    txType === 'debt' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {i18n.language === 'ku' ? 'قەرز (Debt)' : 'Debt'}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  {i18n.language === 'ku' ? 'ناونیشان / ناوی کاڵا' : 'Item / Title'}
                </label>
                <input
                  type="text"
                  required
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder={i18n.language === 'ku' ? 'نموونە: برنج، زەیت، کرێی دوکان...' : 'e.g. Rice bags, Shop rent...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Wholesale / Retail specific inputs */}
              {txType === 'income' && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        {i18n.language === 'ku' ? 'بڕ (Qty)' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={txQuantity}
                        onChange={(e) => setTxQuantity(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        {i18n.language === 'ku' ? 'یەکە' : 'Unit'}
                      </label>
                      <select
                        value={txUnitType}
                        onChange={(e: any) => setTxUnitType(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-bold"
                      >
                        <option value="piece">{i18n.language === 'ku' ? 'دانە' : 'Piece'}</option>
                        <option value="box">{i18n.language === 'ku' ? 'کارتۆن' : 'Box'}</option>
                        <option value="pack">{i18n.language === 'ku' ? 'پاکەت' : 'Pack'}</option>
                        <option value="ton">{i18n.language === 'ku' ? 'تەن' : 'Ton'}</option>
                        <option value="kg">{i18n.language === 'ku' ? 'کیلۆ' : 'Kg'}</option>
                        <option value="set">{i18n.language === 'ku' ? 'دەست' : 'Set'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        {i18n.language === 'ku' ? 'نرخی تاک (IQD)' : 'Unit Price'}
                      </label>
                      <input
                        type="number"
                        value={txUnitPrice}
                        onChange={(e) => setTxUnitPrice(e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-emerald-400 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Total Amount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    {i18n.language === 'ku' ? 'کۆی گشتی پارە (IQD)' : 'Total Amount (IQD)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={effectiveTotal || ''}
                    onChange={(e) => {
                      setIsCustomTotal(true);
                      setTxCustomTotal(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/40 rounded-xl text-emerald-400 font-mono font-black text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    {i18n.language === 'ku' ? 'بەروار' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Customer / Merchant Details */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={txCustomer}
                  onChange={(e) => setTxCustomer(e.target.value)}
                  placeholder={i18n.language === 'ku' ? 'ناوی کڕیار / کۆمپانیا' : 'Customer / Company'}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs"
                />
                <input
                  type="tel"
                  value={txCustomerPhone}
                  onChange={(e) => setTxCustomerPhone(e.target.value)}
                  placeholder={i18n.language === 'ku' ? 'مۆبایل / واتسئاپ' : 'Phone / WhatsApp'}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {i18n.language === 'ku' ? 'داخستن' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {i18n.language === 'ku' ? 'تۆمارکردن' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: IN-APP DELETE TRANSACTION CONFIRMATION MODAL */}
      {deleteTargetTx && (
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
                  {i18n.language === 'ku' ? 'ئەم کردارە لە حیساباتدا ناگەڕێتەوە.' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-white">
                <span>{deleteTargetTx.title}</span>
                <span className="font-mono text-emerald-400">{deleteTargetTx.amount.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>{deleteTargetTx.date}</span>
                {deleteTargetTx.customerName && <span>{deleteTargetTx.customerName}</span>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetTx(null)}
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

      {/* MODAL 4: CLEAR ALL FILTERED RECORDS CONFIRMATION */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {i18n.language === 'ku' ? 'سڕینەوەی سەرجەم تۆمارە فلتەرکراوەکان' : 'Clear All Filtered Transactions'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {i18n.language === 'ku' ? `کۆی (${filteredTransactions.length}) تۆمار دەسڕدرێنەوە.` : `Total of (${filteredTransactions.length}) records will be deleted.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {i18n.language === 'ku' ? 'پەشیمان بوونەوە' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmClearFilteredTxs}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? (i18n.language === 'ku' ? 'دەسڕدرێنەوە...' : 'Clearing...') : (i18n.language === 'ku' ? 'بەڵێ، هەمووی بسڕەوە' : 'Confirm Clear All')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
