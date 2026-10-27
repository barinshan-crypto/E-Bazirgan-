import React, { useState } from 'react';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Wallet, 
  ArrowRightLeft, 
  RefreshCw, 
  Layers,
  Coins,
  Package,
  Sparkles,
  Equal,
  Delete,
  CheckCircle2,
  HelpCircle,
  Box
} from 'lucide-react';
import { User, AccountingTransaction } from '../../lib/db';

interface CashRegisterAndCalculatorProps {
  user: User;
  transactions: AccountingTransaction[];
  i18n: any;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CashRegisterAndCalculator: React.FC<CashRegisterAndCalculatorProps> = ({
  user,
  transactions,
  i18n,
  onShowToast,
}) => {
  // Mode tabs inside the calculator suite: 'pocket' | 'dollar' | 'profit' | 'box'
  const [calcSubTab, setCalcSubTab] = useState<'pocket' | 'dollar' | 'profit' | 'box'>('pocket');

  // ================= 1. POCKET CALCULATOR STATE =================
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcPrev, setCalcPrev] = useState<string | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcHistory, setCalcHistory] = useState<string[]>([]);

  const handleCalcNum = (digit: string) => {
    if (calcDisplay === '0' || calcDisplay === 'Error') {
      setCalcDisplay(digit);
    } else {
      setCalcDisplay(prev => prev + digit);
    }
  };

  const handleCalcOp = (operator: string) => {
    setCalcPrev(calcDisplay);
    setCalcOp(operator);
    setCalcDisplay('0');
  };

  const handleCalcEquals = () => {
    if (!calcPrev || !calcOp) return;
    const a = parseFloat(calcPrev);
    const b = parseFloat(calcDisplay);
    let res = 0;
    if (calcOp === '+') res = a + b;
    if (calcOp === '-') res = a - b;
    if (calcOp === '×') res = a * b;
    if (calcOp === '÷') res = b !== 0 ? a / b : 0;

    const resultStr = String(Number(res.toFixed(4)));
    setCalcHistory(prev => [`${calcPrev} ${calcOp} ${calcDisplay} = ${Number(res).toLocaleString()}`, ...prev.slice(0, 4)]);
    setCalcDisplay(resultStr);
    setCalcPrev(null);
    setCalcOp(null);
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcPrev(null);
    setCalcOp(null);
  };

  const handleCalcBackspace = () => {
    if (calcDisplay.length <= 1 || calcDisplay === 'Error') {
      setCalcDisplay('0');
    } else {
      setCalcDisplay(prev => prev.slice(0, -1));
    }
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(calcDisplay) || 0;
    setCalcDisplay(String(current + amount));
  };

  // ================= 2. CURRENCY CONVERTER (USD ⟷ IQD) =================
  const [exchangeRate, setExchangeRate] = useState<number>(152000); // 100 USD in IQD
  const [usdInput, setUsdInput] = useState<string>('100');
  const [iqdInput, setIqdInput] = useState<string>('152000');

  const handleUsdChange = (val: string) => {
    setUsdInput(val);
    const num = parseFloat(val) || 0;
    setIqdInput(String(Math.round((num / 100) * exchangeRate)));
  };

  const handleIqdChange = (val: string) => {
    setIqdInput(val);
    const num = parseFloat(val) || 0;
    setUsdInput(String(((num / exchangeRate) * 100).toFixed(2)));
  };

  const handleQuickUsd = (usd: number) => {
    setUsdInput(String(usd));
    setIqdInput(String(Math.round((usd / 100) * exchangeRate)));
  };

  // ================= 3. PROFIT & MARGIN CALCULATOR =================
  const [costPrice, setCostPrice] = useState<string>('10000');
  const [sellingPrice, setSellingPrice] = useState<string>('12500');
  const [batchQuantity, setBatchQuantity] = useState<string>('100');

  const cost = parseFloat(costPrice) || 0;
  const sell = parseFloat(sellingPrice) || 0;
  const qty = parseFloat(batchQuantity) || 1;

  const unitProfit = sell - cost;
  const totalCost = cost * qty;
  const totalRevenue = sell * qty;
  const totalBatchProfit = unitProfit * qty;
  const profitMarginPercent = sell > 0 ? ((unitProfit / sell) * 100).toFixed(1) : '0';
  const markupPercent = cost > 0 ? ((unitProfit / cost) * 100).toFixed(1) : '0';

  // ================= 4. WHOLESALE BOX & CARTON CALCULATOR =================
  const [unitItemCost, setUnitItemCost] = useState<string>('1500');
  const [itemsPerBox, setItemsPerBox] = useState<string>('24');
  const [boxQuantity, setBoxQuantity] = useState<string>('50');

  const uCost = parseFloat(unitItemCost) || 0;
  const pBox = parseFloat(itemsPerBox) || 1;
  const bQty = parseFloat(boxQuantity) || 1;

  const pricePerBox = uCost * pBox;
  const totalItemsCount = pBox * bQty;
  const totalInvoiceSum = pricePerBox * bQty;

  return (
    <div className="space-y-3">
      {/* Sub-Navigation Grid for Calculator Suite */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setCalcSubTab('pocket')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            calcSubTab === 'pocket'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>{i18n.language === 'ku' ? 'حاسیبە' : 'Calculator'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCalcSubTab('dollar')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            calcSubTab === 'dollar'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>{i18n.language === 'ku' ? 'دۆلار و دینار' : 'USD ⟷ IQD'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCalcSubTab('profit')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            calcSubTab === 'profit'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{i18n.language === 'ku' ? 'ژمێرەری قازانج' : 'Profit %'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCalcSubTab('box')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            calcSubTab === 'box'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>{i18n.language === 'ku' ? 'کارتۆن و کۆگا' : 'Wholesale Box'}</span>
        </button>
      </div>

      {/* VIEW 1: STANDALONE POCKET CALCULATOR */}
      {calcSubTab === 'pocket' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Main Calculator Body */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-2xl space-y-3 max-w-lg mx-auto w-full">
            {/* Big Screen Display with Integrated Backspace */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-3.5 text-right font-mono shadow-inner space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400 h-5 font-bold">
                <button
                  type="button"
                  onClick={handleCalcBackspace}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-all border border-white/5 active:scale-95"
                  title="Backspace"
                >
                  <Delete className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'سڕینەوە' : 'Del'}</span>
                </button>
                {calcPrev && <span>{parseFloat(calcPrev).toLocaleString()} {calcOp}</span>}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-wider overflow-x-auto">
                {isNaN(parseFloat(calcDisplay)) ? calcDisplay : parseFloat(calcDisplay).toLocaleString()}
              </div>
            </div>

            {/* Quick Iraqi Dinar Shortcut Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickAdd(1000)}
                className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-[11px] font-mono font-bold text-emerald-400 cursor-pointer"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(5000)}
                className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-[11px] font-mono font-bold text-emerald-400 cursor-pointer"
              >
                +5,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(10000)}
                className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-[11px] font-mono font-bold text-emerald-400 cursor-pointer"
              >
                +10,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(25000)}
                className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-[11px] font-mono font-bold text-emerald-400 cursor-pointer"
              >
                +25,000
              </button>
            </div>

            {/* Main Keypad Grid */}
            <div className="grid grid-cols-4 gap-2.5 font-mono text-base font-black">
              {/* Row 1 */}
              <button
                type="button"
                onClick={handleCalcClear}
                className="p-3.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-2xl cursor-pointer border border-rose-500/30 active:scale-95 transition-all"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleCalcOp('÷')}
                className="p-3.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 rounded-2xl cursor-pointer border border-indigo-500/30 active:scale-95 transition-all text-lg"
              >
                ÷
              </button>
              <button
                type="button"
                onClick={() => handleCalcOp('×')}
                className="p-3.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 rounded-2xl cursor-pointer border border-indigo-500/30 active:scale-95 transition-all text-lg"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => handleCalcOp('-')}
                className="p-3.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 rounded-2xl cursor-pointer border border-indigo-500/30 active:scale-95 transition-all text-lg"
              >
                -
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleCalcNum('7')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('8')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('9')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleCalcOp('+')}
                className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl cursor-pointer row-span-2 flex items-center justify-center text-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                +
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleCalcNum('4')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('5')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('6')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                6
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleCalcNum('1')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('2')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('3')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                3
              </button>
              <button
                type="button"
                onClick={handleCalcEquals}
                className="p-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl cursor-pointer row-span-2 flex items-center justify-center text-xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                =
              </button>

              {/* Row 5 */}
              <button
                type="button"
                onClick={() => handleCalcNum('0')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('000')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 text-sm rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                000
              </button>
              <button
                type="button"
                onClick={() => handleCalcNum('.')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer border border-white/5 active:scale-95 transition-all shadow-sm"
              >
                .
              </button>
            </div>
          </div>

          {/* History Tape / Recent Calculations */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h4 className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {i18n.language === 'ku' ? 'تۆماری حیساباتی پێشوو' : 'Calculation History'}
                </h4>
                {calcHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCalcHistory([])}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    {i18n.language === 'ku' ? 'سڕینەوەی مێژوو' : 'Clear'}
                  </button>
                )}
              </div>

              {calcHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <Calculator className="w-8 h-8 mx-auto text-slate-700" />
                  <p>{i18n.language === 'ku' ? 'هەر حیسابێک بکەیت لێرەدا دەمێنێتەوە بۆ ئاسانکاریت' : 'Your recent calculations will show here'}</p>
                </div>
              ) : (
                <div className="space-y-2 font-mono">
                  {calcHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/70 border border-white/5 rounded-xl text-xs text-white flex items-center justify-between"
                    >
                      <span className="text-slate-300 font-bold">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{i18n.language === 'ku' ? 'دوگمەی 000 و ژمارە خێراکان بۆ ژمێریاری بازاڕ زۆر ئاسانکاری دەکەن' : 'Use 000 and quick additions for fast market counting'}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: USD ⟷ IQD CURRENCY CONVERTER */}
      {calcSubTab === 'dollar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Exchange Box */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {i18n.language === 'ku' ? 'گۆڕینەوەی دۆلار بۆ دینار (USD ⟷ IQD)' : 'USD ⟷ IQD Converter'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {i18n.language === 'ku' ? 'بەپێی نرخی ١٠٠ دۆلاری بازاڕی هەولێر و سلێمانی' : 'Live local market exchange rates'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rate Settings */}
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-amber-300 block">
                  {i18n.language === 'ku' ? 'نرخی ١٠٠ دۆلار ($100 Rate):' : '100 USD Rate:'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {i18n.language === 'ku' ? 'دەتوانیت نرخەکە دەستکاری بکەیت' : 'Editable exchange rate'}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value) || 150000;
                    setExchangeRate(r);
                    const num = parseFloat(usdInput) || 0;
                    setIqdInput(String(Math.round((num / 100) * r)));
                  }}
                  className="w-32 px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-amber-300 font-mono font-black text-sm text-right focus:outline-none"
                />
              </div>
            </div>

            {/* Inputs: USD & IQD */}
            <div className="space-y-3">
              {/* USD Input */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                <label className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>{i18n.language === 'ku' ? 'بڕی دۆلار ($ USD)' : 'Amount in USD ($)'}</span>
                </label>
                <input
                  type="number"
                  value={usdInput}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  placeholder="100"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-white font-mono font-black text-lg focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* IQD Input */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  <span>{i18n.language === 'ku' ? 'بڕی دیناری عێراقی (IQD)' : 'Amount in IQD'}</span>
                </label>
                <input
                  type="number"
                  value={iqdInput}
                  onChange={(e) => handleIqdChange(e.target.value)}
                  placeholder="152000"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-white font-mono font-black text-lg focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Quick Amount Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {i18n.language === 'ku' ? 'بڕە باوەکانی بازاڕ:' : 'Quick Presets:'}
              </span>
              <div className="grid grid-cols-4 gap-2 font-mono font-bold text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickUsd(100)}
                  className="p-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl border border-white/10 cursor-pointer"
                >
                  $100 (وەڕەقە)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickUsd(500)}
                  className="p-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl border border-white/10 cursor-pointer"
                >
                  $500
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickUsd(1000)}
                  className="p-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl border border-white/10 cursor-pointer"
                >
                  $1,000 (١٠ دەفتەر)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickUsd(10000)}
                  className="p-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl border border-white/10 cursor-pointer"
                >
                  $10,000 (دەفتەر)
                </button>
              </div>
            </div>
          </div>

          {/* Info & Conversion Result Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400">
                {i18n.language === 'ku' ? 'پوختەی گۆڕینەوەکە' : 'Conversion Summary'}
              </h4>

              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-indigo-500/20 space-y-3 font-mono">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-sans">{i18n.language === 'ku' ? 'دۆلار:' : 'USD Amount:'}</span>
                  <span className="text-emerald-400 font-black text-lg">${parseFloat(usdInput || '0').toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-sans">{i18n.language === 'ku' ? 'دینار:' : 'IQD Amount:'}</span>
                  <span className="text-amber-400 font-black text-xl">{parseFloat(iqdInput || '0').toLocaleString()} IQD</span>
                </div>
                <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 font-sans">
                  {i18n.language === 'ku' 
                    ? `نرخی هەر ١ دۆلار = ${(exchangeRate / 100).toLocaleString()} دینار` 
                    : `1 USD = ${(exchangeRate / 100).toLocaleString()} IQD`}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-center font-bold">
              {i18n.language === 'ku' ? 'هەژمارکراوە بۆ بازرگانی و مامەڵەی نەختینەی خێرا' : 'Designed for fast currency conversion in local commerce'}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PROFIT & MARGIN CALCULATOR */}
      {calcSubTab === 'profit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Inputs Column */}
          <div className="lg:col-span-6 bg-slate-950 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {i18n.language === 'ku' ? 'ژمێرەری قازانج و داهات' : 'Profit & Margin Calculator'}
                </h3>
                <p className="text-xs text-slate-400">
                  {i18n.language === 'ku' ? 'تێچوو و فرۆشتن بنووسە بۆ دەرکەوتنی قازانجی پاک' : 'Enter cost and price to see net profit'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Cost Price */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {i18n.language === 'ku' ? '١. تێچووی کڕین بۆ یەک دانە (Cost Price):' : '1. Cost Price per unit:'}
                </label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-1">
                  {i18n.language === 'ku' ? '٢. نرخی فرۆشتن بە کڕیار (Selling Price):' : '2. Selling Price per unit:'}
                </label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Batch Quantity */}
              <div>
                <label className="text-xs font-bold text-indigo-300 block mb-1">
                  {i18n.language === 'ku' ? '٣. ژمارەی کاڵا یان بڕی بار (Quantity):' : '3. Total Quantity / Batch:'}
                </label>
                <input
                  type="number"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Results Summary Card */}
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400">
                {i18n.language === 'ku' ? 'ئەنجامی قازانج' : 'Profit Calculation Results'}
              </h4>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-sans block">{i18n.language === 'ku' ? 'قازانجی ١ دانە' : 'Unit Profit'}</span>
                  <span className="text-lg font-black text-emerald-400">{unitProfit.toLocaleString()} IQD</span>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-sans block">{i18n.language === 'ku' ? 'ڕێژەی قازانج (%)' : 'Margin %'}</span>
                  <span className="text-lg font-black text-indigo-400">{profitMarginPercent}%</span>
                </div>
              </div>

              {/* Grand Total Profit */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 p-4 rounded-2xl border border-emerald-500/30 space-y-2 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-sans">{i18n.language === 'ku' ? 'کۆی تێچووی بار:' : 'Total Cost:'}</span>
                  <span className="text-white font-bold">{totalCost.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-sans">{i18n.language === 'ku' ? 'کۆی فرۆشی گشتی:' : 'Total Revenue:'}</span>
                  <span className="text-white font-bold">{totalRevenue.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-base font-black">
                  <span className="text-emerald-300 font-sans">{i18n.language === 'ku' ? 'کۆی قازانجی پاک:' : 'Net Batch Profit:'}</span>
                  <span className="text-emerald-400">{totalBatchProfit.toLocaleString()} IQD</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-center font-bold">
              {i18n.language === 'ku' ? 'دڵنیابە لە قازانجی ڕاستەقینەی هەموو گرێبەست و بارەکانت' : 'Ensure optimal pricing and real net gains'}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: WHOLESALE BOX & CARTON CALCULATOR */}
      {calcSubTab === 'box' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-slate-950 border border-teal-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {i18n.language === 'ku' ? 'ژمێرەری کارتۆن و کۆگای کۆ' : 'Wholesale Box & Carton Calculator'}
                </h3>
                <p className="text-xs text-slate-400">
                  {i18n.language === 'ku' ? 'هەژمارکردنی دانە لە ناو کارتۆن و کۆی پسوولەی کۆ' : 'Calculate items per carton & batch invoice totals'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {i18n.language === 'ku' ? 'نرخی یەک دانە (IQD):' : 'Price per single unit:'}
                </label>
                <input
                  type="number"
                  value={unitItemCost}
                  onChange={(e) => setUnitItemCost(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-teal-400 block mb-1">
                  {i18n.language === 'ku' ? 'ژمارەی دانە لە یەک کارتۆندا:' : 'Units per box / carton:'}
                </label>
                <input
                  type="number"
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-teal-500/40 rounded-xl text-teal-300 font-mono font-bold text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-300 block mb-1">
                  {i18n.language === 'ku' ? 'ژمارەی کارتۆنە داواکراوەکان:' : 'Total number of boxes:'}
                </label>
                <input
                  type="number"
                  value={boxQuantity}
                  onChange={(e) => setBoxQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400">
                {i18n.language === 'ku' ? 'پوختەی هەژمارکردنی بار' : 'Wholesale Breakdown'}
              </h4>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-sans block">{i18n.language === 'ku' ? 'نرخی یەک کارتۆن' : 'Price per Box'}</span>
                  <span className="text-lg font-black text-teal-400">{pricePerBox.toLocaleString()} IQD</span>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-xs text-slate-400 font-sans block">{i18n.language === 'ku' ? 'کۆی گشتی دانەکان' : 'Total Units'}</span>
                  <span className="text-lg font-black text-indigo-400">{totalItemsCount.toLocaleString()} {i18n.language === 'ku' ? 'دانە' : 'pcs'}</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-950/40 to-slate-900 p-4 rounded-2xl border border-teal-500/30 font-mono space-y-1">
                <span className="text-xs text-slate-400 font-sans block">{i18n.language === 'ku' ? 'کۆی گشتی پسوولەی بارەکە:' : 'Total Invoice Amount:'}</span>
                <span className="text-2xl font-black text-emerald-400">{totalInvoiceSum.toLocaleString()} IQD</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 text-center font-bold">
              {i18n.language === 'ku' ? 'خێرا و ورد بۆ کۆگاکانی کۆ و بازرگانان' : 'Fast and precise for wholesale trade'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
