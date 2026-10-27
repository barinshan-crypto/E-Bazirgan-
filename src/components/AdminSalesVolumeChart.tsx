import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  ArrowUpRight, 
  Activity,
  Layers,
  Clock,
  RefreshCw,
  Receipt,
  CheckCircle2,
  Filter,
  CreditCard,
  User as UserIcon
} from 'lucide-react';
import { Order, MarketplaceItem, User, AccountingTransaction } from '../lib/db';
import clsx from 'clsx';

interface AdminSalesVolumeChartProps {
  orders: Order[];
  transactions?: AccountingTransaction[];
  items?: MarketplaceItem[];
  users?: User[];
  isKurdish: boolean;
  onRefresh?: () => Promise<void>;
}

export const AdminSalesVolumeChart: React.FC<AdminSalesVolumeChartProps> = ({
  orders = [],
  transactions = [],
  items = [],
  users = [],
  isKurdish,
  onRefresh
}) => {
  const [timeframe, setTimeframe] = useState<7 | 14 | 30 | 90>(7);
  const [chartType, setChartType] = useState<'volume' | 'count'>('volume');
  const [dataFilter, setDataFilter] = useState<'all' | 'orders' | 'income'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Handle Manual Refresh
  const handleRefreshClick = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Compile real Unified Transactions list
  const unifiedTransactions = useMemo(() => {
    const list: {
      id: string;
      dateStr: string;
      timestamp: number;
      amount: number;
      title: string;
      customer: string;
      type: 'order' | 'income';
      status?: string;
    }[] = [];

    // 1. Process Real Orders
    if (dataFilter === 'all' || dataFilter === 'orders') {
      orders.forEach(ord => {
        const timestamp = ord.createdAt || ord.updatedAt || Date.now();
        const dateObj = new Date(timestamp);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const customer = ord.customerName || (ord as any).buyerName || 'مشتەری گشتی';
        const itemsSummary = ord.items && ord.items.length > 0 
          ? ord.items.map(i => `${i.title || 'کاڵا'} (x${i.quantity || 1})`).join(', ')
          : 'داواکاری بازاڕ';

        list.push({
          id: ord.id || `ord_${timestamp}`,
          dateStr,
          timestamp,
          amount: Number(ord.total) || 0,
          title: itemsSummary,
          customer,
          type: 'order',
          status: ord.status || 'completed'
        });
      });
    }

    // 2. Process Real Accounting Incomes
    if (dataFilter === 'all' || dataFilter === 'income') {
      transactions.filter(t => t.type === 'income').forEach(tx => {
        const timestamp = tx.createdAt || (tx.date ? new Date(tx.date).getTime() : Date.now());
        const dateObj = new Date(timestamp);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        list.push({
          id: tx.id,
          dateStr,
          timestamp,
          amount: Number(tx.amount) || 0,
          title: tx.title || 'داهاتی فرۆش',
          customer: tx.customerName || 'فرۆشی ڕاستەوخۆ',
          type: 'income',
          status: tx.status || 'paid'
        });
      });
    }

    // Sort newest first
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [orders, transactions, dataFilter]);

  // Generate 100% REAL continuous daily dates array for the selected timeframe
  const chartData = useMemo(() => {
    const now = new Date();
    const daysArray: { dateStr: string; displayDate: string; timestamp: number }[] = [];

    for (let i = timeframe - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const monthNamesKu = ['کانوونی٢', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمووز', 'ئاب', 'ئەیلوول', 'تشرینی١', 'تشرینی٢', 'کانوونی١'];
      const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const displayDate = isKurdish 
        ? `${d.getDate()} ${monthNamesKu[d.getMonth()]}`
        : `${monthNamesEn[d.getMonth()]} ${d.getDate()}`;

      daysArray.push({
        dateStr,
        displayDate,
        timestamp: new Date(year, d.getMonth(), d.getDate()).getTime()
      });
    }

    // Map real aggregated transactions by day
    const aggregatedMap: Record<string, { volume: number; count: number }> = {};
    
    // Initialize with real 0 values
    daysArray.forEach(d => {
      aggregatedMap[d.dateStr] = { volume: 0, count: 0 };
    });

    // Populate with 100% real transactions
    unifiedTransactions.forEach(tx => {
      if (aggregatedMap[tx.dateStr]) {
        aggregatedMap[tx.dateStr].volume += tx.amount;
        aggregatedMap[tx.dateStr].count += 1;
      }
    });

    return daysArray.map(dayObj => {
      const actual = aggregatedMap[dayObj.dateStr] || { volume: 0, count: 0 };
      const avgTicket = actual.count > 0 ? Math.round(actual.volume / actual.count) : 0;

      return {
        date: dayObj.displayDate,
        rawDate: dayObj.dateStr,
        volume: actual.volume,
        orders: actual.count,
        avgTicket
      };
    });
  }, [unifiedTransactions, timeframe, isKurdish]);

  // Aggregate Real Metrics Summary
  const metrics = useMemo(() => {
    const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
    const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalVolume / totalOrders) : 0;
    const peakDay = chartData.reduce((max, d) => d.volume > max.volume ? d : max, chartData[0] || { volume: 0, date: '' });

    return {
      totalVolume,
      totalOrders,
      avgOrderValue,
      peakDay
    };
  }, [chartData]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[180px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-slate-300">{label}</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md font-mono font-bold">
              {isKurdish ? 'داتای ڕاستەقینە' : 'Real Data'}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-indigo-300">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {isKurdish ? 'قەبارەی فرۆش:' : 'Sales Volume:'}
              </span>
              <span className="font-black font-mono">{data.volume.toLocaleString()} IQD</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-emerald-300">
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                {isKurdish ? 'ژمارەی داواکاری:' : 'Transactions:'}
              </span>
              <span className="font-black font-mono">{data.orders}</span>
            </div>
            {data.orders > 0 && (
              <div className="flex items-center justify-between gap-3 text-amber-300">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {isKurdish ? 'تێکڕای سەبەتە:' : 'Avg Basket:'}
                </span>
                <span className="font-bold font-mono">{data.avgTicket.toLocaleString()} IQD</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-inner">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">
                {isKurdish ? 'شیکاری و قەبارەی دارایی و فرۆشی ڕاستەقینە' : 'Real-Time Sales & Revenue Analytics'}
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{isKurdish ? 'ڕاستەوخۆ لە بنکەدراوە' : '100% LIVE DATA'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isKurdish 
                ? 'کۆی داهات و ژمارەی مامەڵەکان بەشێوەی سەد لە سەد ڕاستەقینە لەسەر بنەمای کڕین و تۆمارەکان دەخوێندرێنەوە.' 
                : 'Aggregating genuine marketplace orders and financial transactions without mock data.'}
            </p>
          </div>
        </div>

        {/* Filter and Timeframe Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Source Data Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setDataFilter('all')}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                dataFilter === 'all'
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isKurdish ? 'گشت' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setDataFilter('orders')}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                dataFilter === 'orders'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isKurdish ? 'داواکاری' : 'Orders'}
            </button>
            <button
              type="button"
              onClick={() => setDataFilter('income')}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                dataFilter === 'income'
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {isKurdish ? 'داهات' : 'Income'}
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
            {([7, 14, 30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeframe(days)}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  timeframe === days
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {isKurdish ? `${days} ڕۆژ` : `${days}D`}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
              title={isKurdish ? 'نوێکردنەوەی داتاکان' : 'Refresh Real Data'}
            >
              <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin text-emerald-400")} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isKurdish ? 'کۆی داهاتی فرۆش (ڕاستەقینە)' : 'Total Real Volume'}
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {metrics.totalVolume.toLocaleString()} <span className="text-xs text-slate-500 font-sans">IQD</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {isKurdish ? `لە ماوەی ${timeframe} ڕۆژدا` : `Past ${timeframe} days`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isKurdish ? 'کۆی مامەڵە و داواکارییەکان' : 'Total Transactions'}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {metrics.totalOrders} <span className="text-xs text-slate-500 font-sans">{isKurdish ? 'مامەڵە' : 'txs'}</span>
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            {isKurdish ? 'مامەڵەی ڕاستەقینەی تۆمارکراو' : 'Real verified transactions'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isKurdish ? 'تێکڕای هەر مامەڵەیەک' : 'Average Basket Value'}
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {metrics.avgOrderValue.toLocaleString()} <span className="text-xs text-slate-500 font-sans">IQD</span>
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            {isKurdish ? 'بۆ هەر سەبەتەیەکی کڕین' : 'Per verified basket'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isKurdish ? 'بەرزترین فرۆشی تۆمارکراو' : 'Peak Day Sales'}
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {metrics.peakDay.volume.toLocaleString()} <span className="text-xs text-slate-500 font-sans">IQD</span>
          </p>
          <span className="text-[10px] text-purple-600 font-bold">
            {metrics.peakDay.volume > 0 ? (metrics.peakDay.date || 'N/A') : (isKurdish ? 'بێ فرۆش' : 'No sales')}
          </span>
        </div>
      </div>

      {/* Main Recharts Graphic Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {chartType === 'volume' 
                ? (isKurdish ? `هێڵکاری قەبارەی فرۆشی ڕاستەقینەی ڕۆژانە (${timeframe} ڕۆژی ڕابردوو)` : `Real Daily Sales Volume Trend (${timeframe} Days)`)
                : (isKurdish ? `ژمارەی مامەڵە و داواکارییە تۆمارکراوەکان (${timeframe} ڕۆژی ڕابردوو)` : `Daily Transactions Count (${timeframe} Days)`)}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch Chart Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setChartType('volume')}
                className={clsx(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  chartType === 'volume' ? "bg-white text-indigo-600 shadow-xs" : "hover:text-slate-900"
                )}
              >
                <DollarSign className="w-3 h-3" />
                <span>{isKurdish ? 'بەهای پارە (IQD)' : 'Volume (IQD)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('count')}
                className={clsx(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  chartType === 'count' ? "bg-white text-emerald-600 shadow-xs" : "hover:text-slate-900"
                )}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>{isKurdish ? 'ژمارەی کڕین' : 'Count'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'volume' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="realSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#realSalesGrad)" 
                  activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2, fill: '#ffffff' }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="orders" 
                  fill="#4f46e5" 
                  radius={[6, 6, 0, 0]} 
                  barSize={timeframe > 14 ? 10 : 20}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Daily Breakdown Mini Blocks */}
        <div className="pt-3 border-t border-slate-100">
          <h5 className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{isKurdish ? 'داتای ڕۆژانەی دوایین ٧ ڕۆژ:' : 'Daily Summary (Past 7 Days):'}</span>
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {chartData.slice(-7).map((d) => (
              <div key={d.rawDate} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-bold block">{d.date}</span>
                <span className="text-xs font-black text-slate-900 font-mono block">
                  {d.volume.toLocaleString()} <span className="text-[9px] font-sans text-slate-500">IQD</span>
                </span>
                <span className={clsx("text-[9px] font-bold block", d.orders > 0 ? "text-emerald-600" : "text-slate-400")}>
                  {d.orders} {isKurdish ? 'مامەڵە' : 'tx'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real Transactions Details Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {isKurdish ? 'تۆماری سەرجەم فرۆش و داواکارییە ڕاستەقینەکان' : 'Live Verified Transactions Feed'}
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {unifiedTransactions.length} {isKurdish ? 'تۆماری بەردەست' : 'records'}
          </span>
        </div>

        {unifiedTransactions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">
              {isKurdish ? 'هیچ داواکاری یان فرۆشێک تا ئێستا تۆمار نەکراوە.' : 'No live transactions recorded yet.'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isKurdish ? 'هەر کاتێک کڕیارێک لە بازاڕ یان لایڤ کڕین ئەنجام بدات، ڕاستەوخۆ لێرە دەردەکەوێت.' : 'Whenever a user purchases in marketplace or live, it will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {unifiedTransactions.slice(0, 15).map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2.5 rounded-xl",
                    tx.type === 'order' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {tx.type === 'order' ? <ShoppingBag className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{tx.title}</span>
                      <span className={clsx(
                        "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                        tx.type === 'order' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}>
                        {tx.type === 'order' ? (isKurdish ? 'داواکاری بازاڕ' : 'Order') : (isKurdish ? 'فرۆشی ڕاستەوخۆ' : 'Income')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {tx.customer}
                      </span>
                      <span>•</span>
                      <span>{new Date(tx.timestamp).toLocaleString(isKurdish ? 'ku' : 'en-US')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 block">
                    +{tx.amount.toLocaleString()} <span className="text-[10px] font-sans">IQD</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">
                    {tx.status || 'Success'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
