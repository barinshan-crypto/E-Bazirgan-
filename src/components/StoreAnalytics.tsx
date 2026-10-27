import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  CheckCircle2, 
  Truck, 
  ArrowUpRight, 
  Store, 
  Award, 
  Package, 
  Clock, 
  Activity,
  Zap
} from 'lucide-react';
import { MarketplaceItem, User } from '../lib/db';

interface StoreAnalyticsProps {
  orders: any[];
  storeName?: string;
  userListings?: MarketplaceItem[];
  user?: User;
}

interface DayData {
  dayName: string;
  shortDate: string;
  fullDate: string;
  revenueUSD: number;
  revenueIQD: number;
  orders: number;
  isToday: boolean;
}

const EXCHANGE_RATE = 1500; // 1 USD = 1,500 IQD

/**
 * Robust helper to parse order financial totals across various formats
 * (IQD vs USD amounts)
 */
const parseOrderAmount = (ord: any): { usd: number; iqd: number } => {
  const raw = Number(ord.totalPrice ?? ord.total ?? ord.amount ?? 0);
  if (isNaN(raw) || raw <= 0) return { usd: 0, iqd: 0 };

  const isIQD = ord.currency === 'IQD' || raw >= 10000;
  if (isIQD) {
    return {
      iqd: Math.round(raw),
      usd: raw / EXCHANGE_RATE
    };
  } else {
    return {
      usd: raw,
      iqd: Math.round(raw * EXCHANGE_RATE)
    };
  }
};

export default function StoreAnalytics({
  orders = [],
  storeName,
  userListings = [],
  user
}: StoreAnalyticsProps) {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const tr = (ku: string, ar: string, en: string) => {
    if (isKurdish) return ku;
    if (isArabic) return ar;
    return en;
  };

  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'all'>('7days');
  const [metricMode, setMetricMode] = useState<'revenue' | 'orders'>('revenue');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [currencyMode, setCurrencyMode] = useState<'IQD' | 'USD'>('IQD');

  // Real store orders (strictly real data, zero demo/mock)
  const realStoreOrders = useMemo(() => {
    return Array.isArray(orders) ? orders : [];
  }, [orders]);

  // Aggregate stats across real orders
  const stats = useMemo(() => {
    const totalOrders = realStoreOrders.length;
    let totalRevenueUSD = 0;
    let totalRevenueIQD = 0;

    realStoreOrders.forEach(ord => {
      const { usd, iqd } = parseOrderAmount(ord);
      totalRevenueUSD += usd;
      totalRevenueIQD += iqd;
    });

    const avgOrderValueUSD = totalOrders > 0 ? totalRevenueUSD / totalOrders : 0;
    const avgOrderValueIQD = totalOrders > 0 ? totalRevenueIQD / totalOrders : 0;

    const deliveredCount = realStoreOrders.filter(ord => {
      const s = String(ord.status || '').toLowerCase();
      return s === 'delivered' || s === 'completed';
    }).length;

    const dispatchedCount = realStoreOrders.filter(ord => {
      const s = String(ord.status || '').toLowerCase();
      return s === 'dispatched' || s === 'shipped' || s === 'in_transit';
    }).length;

    const pendingCount = realStoreOrders.filter(ord => {
      const s = String(ord.status || '').toLowerCase();
      return s !== 'delivered' && s !== 'completed' && s !== 'dispatched' && s !== 'shipped';
    }).length;

    const fulfillmentRate = totalOrders > 0 ? ((deliveredCount + dispatchedCount) / totalOrders) * 100 : 0;

    return {
      totalOrders,
      totalRevenueUSD,
      totalRevenueIQD,
      avgOrderValueUSD,
      avgOrderValueIQD,
      deliveredCount,
      dispatchedCount,
      pendingCount,
      fulfillmentRate
    };
  }, [realStoreOrders]);

  // Weekly 7-day sales breakdown data (Past 7 days)
  const weeklySalesData = useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      const dayName = targetDate.toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', {
        weekday: 'short'
      });
      const shortDate = targetDate.toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', {
        month: 'numeric',
        day: 'numeric'
      });
      const fullDate = targetDate.toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      let revUSD = 0;
      let revIQD = 0;
      let orderCount = 0;

      realStoreOrders.forEach(ord => {
        const rawDate = ord.createdAt;
        const ordDate = typeof rawDate === 'number' ? new Date(rawDate) : rawDate ? new Date(rawDate) : new Date();
        if (ordDate >= targetDate && ordDate < nextDate) {
          orderCount++;
          const parsed = parseOrderAmount(ord);
          revUSD += parsed.usd;
          revIQD += parsed.iqd;
        }
      });

      days.push({
        dayName,
        shortDate,
        fullDate,
        revenueUSD: revUSD,
        revenueIQD: revIQD,
        orders: orderCount,
        isToday: i === 0
      });
    }

    return days;
  }, [realStoreOrders, isKurdish, isArabic]);

  // Weekly Summary Metrics
  const weeklySummary = useMemo(() => {
    const totalWeeklyRevUSD = weeklySalesData.reduce((sum, d) => sum + d.revenueUSD, 0);
    const totalWeeklyRevIQD = weeklySalesData.reduce((sum, d) => sum + d.revenueIQD, 0);
    const totalWeeklyOrders = weeklySalesData.reduce((sum, d) => sum + d.orders, 0);
    const avgDailySalesUSD = totalWeeklyRevUSD / 7;
    const avgDailySalesIQD = totalWeeklyRevIQD / 7;

    let peakDay = weeklySalesData[0];
    weeklySalesData.forEach(d => {
      if (d.revenueIQD > (peakDay?.revenueIQD || 0)) {
        peakDay = d;
      }
    });

    return {
      totalWeeklyRevUSD,
      totalWeeklyRevIQD,
      totalWeeklyOrders,
      avgDailySalesUSD,
      avgDailySalesIQD,
      peakDay
    };
  }, [weeklySalesData]);

  // General Chart Data depending on timeFilter (7days, 30days, all)
  const chartData = useMemo(() => {
    if (timeFilter === '7days') {
      return weeklySalesData.map(d => ({
        label: d.dayName,
        subLabel: d.shortDate,
        fullLabel: d.fullDate,
        revenue: currencyMode === 'USD' ? d.revenueUSD : d.revenueIQD,
        revenueUSD: d.revenueUSD,
        revenueIQD: d.revenueIQD,
        orders: d.orders
      }));
    }

    const now = new Date();
    if (timeFilter === '30days') {
      const buckets: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const dStart = new Date();
        dStart.setDate(now.getDate() - (i + 1) * 5);
        dStart.setHours(0, 0, 0, 0);

        const dEnd = new Date();
        dEnd.setDate(now.getDate() - i * 5);
        dEnd.setHours(23, 59, 59, 999);

        const label = `${dStart.getDate()}/${dStart.getMonth() + 1}`;
        const subLabel = `${dStart.getDate()} - ${dEnd.getDate()}`;
        const fullLabel = `${dStart.toLocaleDateString(isKurdish ? 'ku-IQ' : 'en-US', { month: 'short', day: 'numeric' })} – ${dEnd.toLocaleDateString(isKurdish ? 'ku-IQ' : 'en-US', { month: 'short', day: 'numeric' })}`;

        let revUSD = 0;
        let revIQD = 0;
        let count = 0;

        realStoreOrders.forEach(ord => {
          const raw = ord.createdAt;
          const ordDate = typeof raw === 'number' ? new Date(raw) : raw ? new Date(raw) : new Date();
          if (ordDate >= dStart && ordDate <= dEnd) {
            count++;
            const parsed = parseOrderAmount(ord);
            revUSD += parsed.usd;
            revIQD += parsed.iqd;
          }
        });

        buckets.push({
          label,
          subLabel,
          fullLabel,
          revenue: currencyMode === 'USD' ? revUSD : revIQD,
          revenueUSD: revUSD,
          revenueIQD: revIQD,
          orders: count
        });
      }
      return buckets;
    }

    // 'all' time
    const monthlyBuckets: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mIdx = d.getMonth();
      const y = d.getFullYear();

      const label = d.toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', { month: 'short' });
      const fullLabel = d.toLocaleDateString(isKurdish ? 'ku-IQ' : isArabic ? 'ar-IQ' : 'en-US', { month: 'long', year: 'numeric' });

      let revUSD = 0;
      let revIQD = 0;
      let count = 0;

      realStoreOrders.forEach(ord => {
        const raw = ord.createdAt;
        const ordDate = typeof raw === 'number' ? new Date(raw) : raw ? new Date(raw) : new Date();
        if (ordDate.getMonth() === mIdx && ordDate.getFullYear() === y) {
          count++;
          const parsed = parseOrderAmount(ord);
          revUSD += parsed.usd;
          revIQD += parsed.iqd;
        }
      });

      monthlyBuckets.push({
        label,
        subLabel: String(y),
        fullLabel,
        revenue: currencyMode === 'USD' ? revUSD : revIQD,
        revenueUSD: revUSD,
        revenueIQD: revIQD,
        orders: count
      });
    }
    return monthlyBuckets;
  }, [timeFilter, weeklySalesData, realStoreOrders, currencyMode, isKurdish, isArabic]);

  // Format currency helper
  const formatMoney = (usdVal: number, iqdVal?: number) => {
    if (currencyMode === 'USD') {
      return `$${usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const iqd = iqdVal !== undefined ? iqdVal : usdVal * EXCHANGE_RATE;
    return `${Math.round(iqd).toLocaleString()} ${tr('د.ع', 'د.ع', 'IQD')}`;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-amber-400/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-xs space-y-2 min-w-[180px] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
            <span className="font-bold text-white font-sans">{dataPoint.fullLabel || label}</span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.5 rounded-full font-bold">
              {timeFilter === '7days' ? 'Day' : 'Period'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px] flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-400" />
                {tr('داهات', 'الإيرادات', 'Revenue')}:
              </span>
              <span className="font-mono font-bold text-amber-300">
                {formatMoney(dataPoint.revenueUSD, dataPoint.revenueIQD)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px] flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-indigo-400" />
                {tr('داواکاری', 'الطلبات', 'Orders')}:
              </span>
              <span className="font-mono font-bold text-indigo-300">
                {dataPoint.orders} {tr('دانە', 'طلب', 'orders')}
              </span>
            </div>
            {dataPoint.orders > 0 && (
              <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1 border-t border-white/5">
                <span>{tr('تێکڕا', 'المعدل', 'Avg')}:</span>
                <span className="font-mono text-emerald-400">
                  {formatMoney(dataPoint.revenueUSD / dataPoint.orders, dataPoint.revenueIQD / dataPoint.orders)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const displayName = storeName || user?.businessName || user?.name || tr('فرۆشگاکەم', 'متجري', 'My Store');

  return (
    <div className="space-y-5 text-slate-100 animate-fade-in">
      
      {/* 1. Header with Store Identity, Live Automation Badge, and Currency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-amber-400/20 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white text-base font-black tracking-wide font-sans">
                {displayName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {tr('ئۆتۆماتیک و ڕاستەقینە', 'تلقائي ومباشر', 'Live Automated')}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {tr(
                'چاودێری داهات و ئاماری فرۆشتن بە شێوەی خۆکار لەگەڵ کڕینە ڕاستەقینەکان نوێ دەبێتەوە.',
                'مراقبة أداء المبيعات الحقيقية والطلبات تلقائياً وبشكل مباشر من قاعدة البيانات.',
                'Automated live store sales metrics and real-time transaction analytics.'
              )}
            </p>
          </div>
        </div>

        {/* Currency Switcher (IQD / USD) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCurrencyMode('IQD')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                currencyMode === 'IQD' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              IQD (د.ع)
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('USD')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                currencyMode === 'USD' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top-Line KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Gross Sales */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-sm hover:border-amber-400/30 transition-all">
          <div className="absolute top-2 right-2 p-2 opacity-10 text-amber-400">
            <DollarSign className="w-12 h-12" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-sans">
            {tr('داهاتی گشتی', 'إجمالي المبيعات', 'Gross Sales')}
          </span>
          <div className="mt-1 space-y-1">
            <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight">
              {formatMoney(stats.totalRevenueUSD, stats.totalRevenueIQD)}
            </p>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{stats.totalOrders > 0 ? tr('فرۆشی تۆمارکراو', 'مبيعات مؤكدة', 'recorded sales') : tr('داتای زیندە', 'بيانات حية', 'live stream')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Store Orders */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-sm hover:border-indigo-400/30 transition-all">
          <div className="absolute top-2 right-2 p-2 opacity-10 text-indigo-400">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-sans">
            {tr('داواکارییەکانی فرۆشگا', 'طلبات المتجر', 'Store Orders')}
          </span>
          <div className="mt-1 space-y-1">
            <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {stats.totalOrders}
            </p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{stats.deliveredCount} {tr('گەیەندراوە', 'تم التوصيل', 'delivered')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Average Order Value (AOV) */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-sm hover:border-teal-400/30 transition-all">
          <div className="absolute top-2 right-2 p-2 opacity-10 text-teal-400">
            <BarChart3 className="w-12 h-12" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-sans">
            {tr('تێکڕای بەهای سەبەتە', 'متوسط قيمة الطلب', 'Average Order Value')}
          </span>
          <div className="mt-1 space-y-1">
            <p className="text-xl sm:text-2xl font-black text-teal-300 font-mono tracking-tight">
              {formatMoney(stats.avgOrderValueUSD, stats.avgOrderValueIQD)}
            </p>
            <p className="text-[10px] text-slate-400">
              {tr('بۆ هەر کڕیارێک', 'لكل معاملة بيع', 'Per customer checkout')}
            </p>
          </div>
        </div>

        {/* Card 4: Logistics Fulfillment Rate */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 relative overflow-hidden shadow-sm hover:border-purple-400/30 transition-all">
          <div className="absolute top-2 right-2 p-2 opacity-10 text-purple-400">
            <Truck className="w-12 h-12" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-sans">
            {tr('ڕێژەی گەیاندنی کارگۆ', 'نسبة إنجاز الشحن', 'Fulfillment Rate')}
          </span>
          <div className="mt-1 space-y-1">
            <p className="text-xl sm:text-2xl font-black text-purple-300 font-mono tracking-tight">
              {stats.fulfillmentRate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-400">
              {stats.dispatchedCount + stats.deliveredCount} / {stats.totalOrders} {tr('نێردراون', 'شحنت', 'fulfilled')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. WEEKLY SALES SUMMARY CARD */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-400/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                {tr('کورتەی فرۆشتنی هەفتانە', 'ملخص المبيعات الأسبوعية', 'Weekly Sales Summary')}
              </h4>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                {tr('٧ ڕۆژی ڕابردوو', 'آخر ٧ أيام', 'Last 7 Days')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {tr(
                'شیکردنەوەی خێرای فرۆش، لوتکەی کڕین، و پێشبینی داهاتی هەفتەی فرۆشگاکەت.',
                'نظرة تفصيلية سريعة على الإيرادات، يوم الذروة، ومعدل الطلبات لهذا الأسبوع.',
                'Quick overview of your weekly revenue, peak sales day, and transaction volume.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/90 border border-white/10 px-4 py-2.5 rounded-xl">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                {tr('کۆی داهاتی هەفتە', 'إجمالي أسبوعي', 'Week Revenue')}
              </span>
              <span className="text-base font-black text-amber-400 font-mono">
                {formatMoney(weeklySummary.totalWeeklyRevUSD, weeklySummary.totalWeeklyRevIQD)}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-white/10" />
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                {tr('کۆی داواکاری', 'إجمالي الطلبات', 'Week Orders')}
              </span>
              <span className="text-base font-black text-white font-mono">
                {weeklySummary.totalWeeklyOrders}
              </span>
            </div>
          </div>
        </div>

        {/* 7-Day Day-by-Day Strip Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mt-4">
          {weeklySalesData.map((day, idx) => (
            <div
              key={idx}
              className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between ${
                day.isToday
                  ? 'bg-amber-400/15 border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/20'
              }`}
            >
              <div>
                <span className={`text-[10px] sm:text-xs font-bold block ${day.isToday ? 'text-amber-300' : 'text-slate-400'}`}>
                  {day.dayName}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">
                  {day.shortDate}
                </span>
              </div>

              <div className="mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[11px] sm:text-xs font-black font-mono text-white block truncate">
                  {currencyMode === 'USD' 
                    ? `$${day.revenueUSD.toFixed(0)}` 
                    : `${(day.revenueIQD / 1000).toFixed(0)}k`}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {day.orders} {tr('داواکاری', 'طلب', 'ord')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Insights Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/5 text-xs">
          <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                {tr('ڕۆژی لوتکەی فرۆشتن', 'يوم الذروة في المبيعات', 'Peak Sales Day')}
              </span>
              <span className="font-bold text-white">
                {weeklySummary.peakDay?.dayName || 'N/A'} ({formatMoney(weeklySummary.peakDay?.revenueUSD || 0, weeklySummary.peakDay?.revenueIQD || 0)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                {tr('تێکڕای ڕۆژانە', 'المعدل اليومي', 'Daily Average')}
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatMoney(weeklySummary.avgDailySalesUSD, weeklySummary.avgDailySalesIQD)} / {tr('ڕۆژ', 'يوم', 'day')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                {tr('دۆخی کارگێڕی فرۆشگا', 'حالة العمليات', 'Operations')}
              </span>
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                {tr('ئۆتۆماتیک لە کاردایە', 'تلقائي متصل', 'Auto Connected')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Recharts Sales & Volume Graph */}
      <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                {tr('هێڵکاری فرۆش و داواکارییەکان', 'مخطط المبيعات والطلبات', 'Sales & Order Trends')}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {tr(
                'ئامارەکان بە شێوەی خۆکار لە فرۆشەکانی فرۆشگاکەتەوە دەرئەنجام دەدرێن.',
                'تحديث تلقائي للمخططات من حركة المبيعات الفعلية للمتجر.',
                'Direct automated calculation from verified store checkout records.'
              )}
            </p>
          </div>

          {/* Time Filter & Chart Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode: Revenue vs Orders */}
            <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMetricMode('revenue')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  metricMode === 'revenue' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tr('داهات', 'الإيرادات', 'Revenue')}
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('orders')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  metricMode === 'orders' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tr('داواکاری', 'الطلبات', 'Orders')}
              </button>
            </div>

            {/* Time Filter: 7d, 30d, all */}
            <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTimeFilter('7days')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeFilter === '7days' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('30days')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeFilter === '30days' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tr('هەموو', 'الكل', 'All')}
              </button>
            </div>
          </div>
        </div>

        {/* Empty State vs Real Chart */}
        {realStoreOrders.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="text-white text-sm font-bold">
                {tr('سیستەمی شیکاری ئۆتۆماتیک لە کاردایە', 'نظام التحليلات التلقائي جاهز', 'Automatic Analytics System Active')}
              </h5>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                {tr(
                  'ئەم بەشە بە تەواوی ئۆتۆماتیکە و بەستراوەتەوە بە فرۆشتنە ڕاستەقینەکان؛ هەر کاتێک کڕیار کاڵاکانت داوا بکات، دەستبەجێ داهات، هێڵکارییەکان و شیکارییەکان بە ڕاستەقینە نوێ دەبنەوە.',
                  'تم ربط هذا القسم بشكل تلقائي مع مبيعات المتجر الحقيقية. بمجرد قيام الزبائن بالطلب، ستظهر البيانات والمخططات مباشرة دون أي بيانات وهمية.',
                  'Direct real-time tracking is enabled. Whenever orders are placed for your items, live graphs and revenue analytics calculate dynamically without mock data.'
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGoldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                      <stop offset="70%" stopColor="#D97706" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#78350F" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="barIndigoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
                      <stop offset="70%" stopColor="#4F46E5" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#1E1B4B" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: '#334155' }} 
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: '#334155' }} 
                    tickFormatter={(val) => metricMode === 'revenue' 
                      ? (currencyMode === 'USD' ? `$${val}` : `${(val / 1000).toFixed(0)}k`)
                      : val
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={metricMode === 'revenue' ? 'revenue' : 'orders'} 
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  >
                    {chartData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={metricMode === 'revenue' ? 'url(#barGoldGrad)' : 'url(#barIndigoGrad)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGoldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="areaIndigoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: '#334155' }} 
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: '#334155' }} 
                    tickFormatter={(val) => metricMode === 'revenue' 
                      ? (currencyMode === 'USD' ? `$${val}` : `${(val / 1000).toFixed(0)}k`)
                      : val
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey={metricMode === 'revenue' ? 'revenue' : 'orders'} 
                    stroke={metricMode === 'revenue' ? '#F59E0B' : '#6366F1'} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill={metricMode === 'revenue' ? 'url(#areaGoldGrad)' : 'url(#areaIndigoGrad)'} 
                    animationDuration={800}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 5. Inventory Items Performance & Sourcing Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Store Active Inventory Summary */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Package className="w-4 h-4 text-amber-400" />
              <span>{tr('کاڵاکانی لە فرۆشتندان', 'المنتجات المعروضة للبيع', 'Active Store Listings')}</span>
            </h4>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-mono font-bold">
              {userListings.length} {tr('کاڵا', 'منتج', 'items')}
            </span>
          </div>

          {userListings.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-center text-xs text-slate-400">
              {tr(
                'هێشتا هیچ کاڵایەکت دانەناوە. کاڵاکانت دابنێ بۆ ئەوەی لە بازاڕ پێشکەش بکرێن و فرۆشیان لێرە تۆمار بکرێت.',
                'لم تقم بإضافة منتجات بعد. أضف منتجاتك لتظهر في السوق وتبدأ المبيعات هنا.',
                'No listings uploaded yet. Add items to list in the marketplace and begin tracking sales.'
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {userListings.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <img 
                      src={item.imageUrl || (item.imageUrls && item.imageUrls[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} 
                      alt={item.title} 
                      className="w-8 h-8 rounded-lg object-cover shrink-0" 
                    />
                    <div className="truncate">
                      <p className="font-bold text-white truncate max-w-[150px]">{item.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {currencyMode === 'USD' 
                          ? `$${Number(item.price || 0).toLocaleString()}` 
                          : `${(Number(item.price || 0) * EXCHANGE_RATE).toLocaleString()} د.ع`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-amber-400 font-bold font-mono">
                      {((item as any).views || 0)} {tr('بینین', 'مشاهدة', 'views')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cargo Logistics & Courier Direct Insight */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span>{tr('لۆجستی کارگۆی E-BAZIRGAN Direct', 'لوجستيات الشحن المباشر', 'Direct Cargo & Logistics')}</span>
            </h4>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              {tr(
                'سەرجەم داواکارییەکانی فرۆشگاکەت بە سیستەمی بارنامەی هەولێر و شارەکانی تر پشکنین دەکرێت. تێچووی گەیاندن بە ڕێژەی ٢٠٪ دابەزیوە.',
                'يتم ربط شحنات متجرك مباشرة مع شبكة التوصيل السريع داخل أربيل والمحافظات مع ضمان تتبع دقيق.',
                'Integrated with direct Kurdistan cargo terminals for fast 24-48h parcel dispatch and live proof-of-delivery.'
              )}
            </p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {tr('دڵنیایی وەسڵ و پارەدان', 'دفع فوري عند الاستلام', 'Verified Cash On Delivery')}
            </span>
            <span className="text-amber-400 font-bold">
              E-Bazirgan Direct
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
