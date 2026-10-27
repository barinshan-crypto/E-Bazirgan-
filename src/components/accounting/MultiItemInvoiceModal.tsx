import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Receipt, 
  Printer, 
  MessageCircle, 
  Building2, 
  Package, 
  Truck, 
  Check, 
  DollarSign, 
  User, 
  Phone 
} from 'lucide-react';
import { db, User as UserType, AccountingTransaction, InvoiceItem } from '../../lib/db';

interface MultiItemInvoiceModalProps {
  user: UserType;
  initialTx?: AccountingTransaction | null;
  defaultPartnerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  i18n: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const MultiItemInvoiceModal: React.FC<MultiItemInvoiceModalProps> = ({
  user,
  initialTx,
  defaultPartnerName,
  isOpen,
  onClose,
  onSaved,
  i18n,
  onShowToast
}) => {
  // If viewing existing invoice
  const [isViewOnly, setIsViewOnly] = useState<boolean>(!!initialTx);

  // Form State
  const [partnerName, setPartnerName] = useState<string>(initialTx?.customerName || defaultPartnerName || '');
  const [partnerPhone, setPartnerPhone] = useState<string>(initialTx?.customerPhone || '');
  const [invoiceDate, setInvoiceDate] = useState<string>(initialTx?.date || new Date().toISOString().split('T')[0]);
  const [saleMode, setSaleMode] = useState<'retail' | 'wholesale' | 'b2b'>(initialTx?.saleMode || 'b2b');
  const [invoiceNote, setInvoiceNote] = useState<string>(initialTx?.note || '');
  const [shippingFee, setShippingFee] = useState<string>(initialTx?.shippingFee ? String(initialTx.shippingFee) : '0');
  const [globalDiscount, setGlobalDiscount] = useState<string>(initialTx?.discount ? String(initialTx.discount) : '0');

  // Items list
  const [items, setItems] = useState<InvoiceItem[]>(
    initialTx?.items && initialTx.items.length > 0
      ? initialTx.items
      : [
          {
            id: '1',
            name: initialTx?.title || '',
            quantity: initialTx?.quantity || 1,
            unitType: initialTx?.unitType || 'box',
            unitPrice: initialTx?.unitPrice || initialTx?.amount || 0,
            discount: 0,
            total: initialTx?.amount || 0
          }
        ]
  );

  // Payment Status
  const [paymentType, setPaymentType] = useState<'full_cash' | 'partial' | 'full_debt'>(initialTx?.paymentType || 'full_cash');
  const [paidAmount, setPaidAmount] = useState<string>(initialTx?.paidAmount ? String(initialTx.paidAmount) : '');

  if (!isOpen) return null;

  // Add Item Line
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: '',
        quantity: 1,
        unitType: 'box',
        unitPrice: 0,
        discount: 0,
        total: 0
      }
    ]);
  };

  // Remove Item Line
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update Item Line
  const handleUpdateItem = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };

      // recalculate line total
      const q = parseFloat(String(target.quantity)) || 0;
      const p = parseFloat(String(target.unitPrice)) || 0;
      const d = parseFloat(String(target.discount)) || 0;
      target.total = Math.max(0, (q * p) - d);

      copy[index] = target;
      return copy;
    });
  };

  // Totals calculations
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountVal = parseFloat(globalDiscount) || 0;
  const shippingVal = parseFloat(shippingFee) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal + shippingVal);

  const effectivePaid = paymentType === 'full_cash' 
    ? grandTotal 
    : paymentType === 'full_debt' 
    ? 0 
    : (parseFloat(paidAmount) || 0);

  const remainingDebt = Math.max(0, grandTotal - effectivePaid);

  // Save B2B Invoice
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      onShowToast(i18n.language === 'ku' ? 'تکایە ناوی کڕیار یان کۆمپانیا بنووسە' : 'Please enter company/partner name', 'error');
      return;
    }

    if (items.length === 0 || !items[0].name.trim()) {
      onShowToast(i18n.language === 'ku' ? 'تکایە ناوی کاڵاکان بنووسە' : 'Please enter at least one item', 'error');
      return;
    }

    if (grandTotal <= 0) {
      onShowToast(i18n.language === 'ku' ? 'کۆی گشتی پسوولە نابێت سفر بێت' : 'Total amount must be greater than 0', 'error');
      return;
    }

    const invNumber = initialTx?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const mainTitle = items.length === 1 ? items[0].name : `${items[0].name} و (${items.length - 1}) کاڵای تر`;

    try {
      if (paymentType === 'partial') {
        // Income part (Cash)
        const incomeTx = await db.saveAccountingTransaction({
          userId: user.id,
          type: 'income',
          title: `پسوولەی فرۆش #${invNumber} (${partnerName})`,
          amount: effectivePaid,
          category: saleMode === 'b2b' ? 'B2B Trade' : 'Wholesale',
          date: invoiceDate,
          customerName: partnerName.trim(),
          customerPhone: partnerPhone.trim(),
          status: 'paid',
          saleMode,
          items,
          discount: discountVal,
          shippingFee: shippingVal,
          paymentType: 'partial',
          paidAmount: effectivePaid,
          remainingDebt,
          invoiceNumber: invNumber,
          note: `${invoiceNote ? invoiceNote + ' | ' : ''}کۆی گشتی: ${grandTotal.toLocaleString()} د.ع (کاش: ${effectivePaid.toLocaleString()} | قەرز: ${remainingDebt.toLocaleString()})`
        });

        // Debt record
        if (remainingDebt > 0) {
          await db.saveAccountingTransaction({
            userId: user.id,
            type: 'debt',
            title: `ماوەی پسوولەی #${invNumber} (${partnerName})`,
            amount: remainingDebt,
            category: 'Customer Debt',
            date: invoiceDate,
            customerName: partnerName.trim(),
            customerPhone: partnerPhone.trim(),
            status: 'unpaid',
            saleMode,
            items,
            paymentType: 'partial',
            paidAmount: effectivePaid,
            remainingDebt,
            invoiceNumber: invNumber,
            note: `قەرزی ماوەی پسوولەی #${invNumber}`
          });
        }
      } else if (paymentType === 'full_debt') {
        await db.saveAccountingTransaction({
          userId: user.id,
          type: 'debt',
          title: `پسوولەی فرۆش #${invNumber} (${partnerName})`,
          amount: grandTotal,
          category: 'Customer Debt',
          date: invoiceDate,
          customerName: partnerName.trim(),
          customerPhone: partnerPhone.trim(),
          status: 'unpaid',
          saleMode,
          items,
          discount: discountVal,
          shippingFee: shippingVal,
          paymentType: 'full_debt',
          paidAmount: 0,
          remainingDebt: grandTotal,
          invoiceNumber: invNumber,
          note: invoiceNote
        });
      } else {
        // Full Cash
        await db.saveAccountingTransaction({
          userId: user.id,
          type: 'income',
          title: `پسوولەی فرۆش #${invNumber} (${partnerName})`,
          amount: grandTotal,
          category: saleMode === 'b2b' ? 'B2B Trade' : 'Wholesale',
          date: invoiceDate,
          customerName: partnerName.trim(),
          customerPhone: partnerPhone.trim(),
          status: 'paid',
          saleMode,
          items,
          discount: discountVal,
          shippingFee: shippingVal,
          paymentType: 'full_cash',
          paidAmount: grandTotal,
          remainingDebt: 0,
          invoiceNumber: invNumber,
          note: invoiceNote
        });
      }

      onSaved();
      onClose();
      onShowToast(
        i18n.language === 'ku' ? 'پسوولەکە بە سەرکەوتوویی دەرچوو!' : 'Invoice saved successfully!',
        'success'
      );
    } catch (err) {
      console.error(err);
      onShowToast(i18n.language === 'ku' ? 'هەڵەیەک ڕوویدا لە دروستکردنی پسوولە' : 'Error saving invoice', 'error');
    }
  };

  // WhatsApp Share
  const handleSendWhatsApp = () => {
    const phone = partnerPhone.replace(/[^0-9]/g, '');
    const storeName = user.name || 'فرۆشگا';
    const invNo = initialTx?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;

    let msg = `📄 پسوولەی فەرمی مامەڵەی بازرگانی (Official B2B Invoice)\n` +
      `🏢 لە: *${storeName}*\n` +
      `👤 بۆ: *${partnerName}*\n` +
      `🔢 ژمارەی پسوولە: *#${invNo}*\n` +
      `📅 بەروار: ${invoiceDate}\n\n` +
      `📦 لیستەی کاڵاکان:\n`;

    items.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.name}* : ${it.quantity} × ${it.unitPrice.toLocaleString()} د.ع = ${it.total.toLocaleString()} د.ع\n`;
    });

    if (discountVal > 0) msg += `✂️ داشکاندن: -${discountVal.toLocaleString()} د.ع\n`;
    if (shippingVal > 0) msg += `🚚 کرێی گواستنەوە: +${shippingVal.toLocaleString()} د.ع\n`;
    msg += `\n💰 *کۆی گشتی: ${grandTotal.toLocaleString()} دیناری عێراقی*\n`;
    msg += `💵 دراو بە کاش: ${effectivePaid.toLocaleString()} د.ع\n`;
    if (remainingDebt > 0) msg += `⚠️ ماوە (قەرز): *${remainingDebt.toLocaleString()} د.ع*\n`;
    msg += `\nسوپاس بۆ متمانەتان!`;

    const encoded = encodeURIComponent(msg);
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('964') ? phone : '964' + phone.replace(/^0/, '')}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  function getUnitName(unit?: string) {
    if (unit === 'box') return i18n.language === 'ku' ? 'کارتۆن' : 'Box';
    if (unit === 'ton') return i18n.language === 'ku' ? 'تەن' : 'Ton';
    if (unit === 'pack') return i18n.language === 'ku' ? 'پاکەت' : 'Pack';
    if (unit === 'kg') return i18n.language === 'ku' ? 'کیلۆ' : 'Kg';
    if (unit === 'set') return i18n.language === 'ku' ? 'دەست' : 'Set';
    return i18n.language === 'ku' ? 'دانە' : 'Piece';
  }

  return (
    <div className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-slate-950 p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Receipt className="w-5 h-5 font-black" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2">
                <span>{initialTx ? (i18n.language === 'ku' ? 'بینینی پسوولەی فەرمی' : 'View Invoice') : (i18n.language === 'ku' ? 'دروستکردنی پسوولەی فرە-کاڵا (B2B & Wholesale)' : 'New Multi-Item Invoice')}</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md text-[10px] font-mono border border-indigo-500/30">
                  {saleMode === 'b2b' ? 'B2B Deal' : saleMode === 'wholesale' ? 'Wholesale' : 'Retail'}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{i18n.language === 'ku' ? 'چاپ' : 'Print'}</span>
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable/Editable Body */}
        <form onSubmit={handleSaveInvoice} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Party Details: Store (Sender) & Partner (Receiver) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-indigo-300 uppercase block">
                {i18n.language === 'ku' ? 'فرۆشیار (کۆگا / بازرگان):' : 'From Seller:'}
              </label>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-white/5 text-xs">
                <p className="font-black text-white">{user.name || (i18n.language === 'ku' ? 'فرۆشگای سەرەکی' : 'Store Merchant')}</p>
                <p className="text-[11px] text-slate-400 font-mono">{user.phone || '0750 000 0000'} | {user.city || 'Kurdistan'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-emerald-400 uppercase block">
                {i18n.language === 'ku' ? 'کڕیار / کۆمپانیای هاوبەش (Bill To):' : 'Bill To Partner:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder={i18n.language === 'ku' ? 'ناوی کۆمپانیا/بازرگان' : 'Partner Company Name'}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="tel"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="0750 123 4567"
                  className="w-full px-2.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Deal Mode & Date */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {i18n.language === 'ku' ? 'جۆری مامەڵە' : 'Transaction Mode'}
              </label>
              <select
                value={saleMode}
                onChange={(e: any) => setSaleMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none"
              >
                <option value="b2b">{i18n.language === 'ku' ? '🏢 بازرگان بۆ بازرگان (B2B)' : 'B2B Deal'}</option>
                <option value="wholesale">{i18n.language === 'ku' ? '📦 فرۆشی کۆ (Wholesale)' : 'Wholesale'}</option>
                <option value="retail">{i18n.language === 'ku' ? '🛍️ فرۆشی تاک (Retail)' : 'Retail'}</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {i18n.language === 'ku' ? 'بەروار' : 'Invoice Date'}
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs font-mono font-bold"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {i18n.language === 'ku' ? 'کرێی گواستنەوە / بارکردن (IQD)' : 'Freight / Shipping (IQD)'}
              </label>
              <input
                type="number"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-amber-400 font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* Dynamic Items Table */}
          <div className="border border-white/10 rounded-2xl overflow-hidden space-y-2 p-3 bg-slate-950">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                {i18n.language === 'ku' ? 'خشتەی کاڵا و بڕەکان' : 'Invoice Line Items'}
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-black border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{i18n.language === 'ku' ? '+ دێڕی نوێ' : '+ Add Line'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="grid grid-cols-12 gap-2 bg-slate-900 p-2.5 rounded-xl border border-white/5 items-center"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                      placeholder={i18n.language === 'ku' ? 'ناوی کاڵا / نموونە: برنجی مەحموود' : 'Item name...'}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-white font-mono font-bold text-center"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <select
                      value={item.unitType || 'box'}
                      onChange={(e: any) => handleUpdateItem(idx, 'unitType', e.target.value)}
                      className="w-full px-1.5 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-[11px] text-slate-300 font-bold"
                    >
                      <option value="box">{i18n.language === 'ku' ? 'کارتۆن' : 'Box'}</option>
                      <option value="ton">{i18n.language === 'ku' ? 'تەن' : 'Ton'}</option>
                      <option value="pack">{i18n.language === 'ku' ? 'پاکەت' : 'Pack'}</option>
                      <option value="kg">{i18n.language === 'ku' ? 'کیلۆ' : 'Kg'}</option>
                      <option value="set">{i18n.language === 'ku' ? 'دەست' : 'Set'}</option>
                      <option value="piece">{i18n.language === 'ku' ? 'دانە' : 'Piece'}</option>
                    </select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      value={item.unitPrice || ''}
                      onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="نرخ"
                      className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-10 sm:col-span-1 text-right font-mono font-black text-white text-xs">
                    {(item.total || 0).toLocaleString()}
                  </div>

                  <div className="col-span-2 sm:col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary & Payment Split */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">{i18n.language === 'ku' ? 'داشکاندنی گشتی:' : 'Discount:'}</span>
                <input
                  type="number"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  placeholder="0"
                  className="w-24 px-2 py-1 bg-slate-900 border border-white/10 rounded-lg text-rose-400 font-mono text-xs font-bold"
                />
              </div>

              <div className="text-right font-mono">
                <span className="text-slate-400 block text-[10px]">{i18n.language === 'ku' ? 'کۆی گشتی فەرمی' : 'Grand Total'}</span>
                <span className="text-xl font-black text-emerald-400">
                  {grandTotal.toLocaleString()} <span className="text-xs font-sans text-emerald-500">IQD</span>
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2 border-t border-white/5">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                {i18n.language === 'ku' ? 'شێوازی پارەدان:' : 'Payment Method:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('full_cash')}
                  className={`py-2 px-2 rounded-xl text-center font-bold text-xs cursor-pointer transition-all ${
                    paymentType === 'full_cash'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  💵 {i18n.language === 'ku' ? 'کاشی تەواو' : 'Full Cash'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('partial');
                    if (!paidAmount) setPaidAmount(String(Math.floor(grandTotal / 2)));
                  }}
                  className={`py-2 px-2 rounded-xl text-center font-bold text-xs cursor-pointer transition-all ${
                    paymentType === 'partial'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚖️ {i18n.language === 'ku' ? 'بەشەکی (کاش+قەرز)' : 'Partial'}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('full_debt')}
                  className={`py-2 px-2 rounded-xl text-center font-bold text-xs cursor-pointer transition-all ${
                    paymentType === 'full_debt'
                      ? 'bg-rose-500 text-white font-black shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  📋 {i18n.language === 'ku' ? 'قەرزی تەواو' : 'On Credit'}
                </button>
              </div>

              {paymentType === 'partial' && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 block mb-1">
                      {i18n.language === 'ku' ? 'دراو بە کاش (IQD):' : 'Cash Paid:'}
                    </label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-rose-400 block mb-1">
                      {i18n.language === 'ku' ? 'ماوە وەک قەرز (IQD):' : 'Remaining Debt:'}
                    </label>
                    <div className="w-full px-3 py-1.5 bg-slate-900 border border-rose-500/40 rounded-xl text-rose-300 font-mono font-bold text-xs">
                      {remainingDebt.toLocaleString()} IQD
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <input
                type="text"
                value={invoiceNote}
                onChange={(e) => setInvoiceNote(e.target.value)}
                placeholder={i18n.language === 'ku' ? 'تێبینی، شۆفێری گەیاندن، ژمارەی بار...' : 'Notes / transport info...'}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              {i18n.language === 'ku' ? 'داخستن' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              {i18n.language === 'ku' ? 'دەرکردنی پسوولەی B2B' : 'Save & Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
