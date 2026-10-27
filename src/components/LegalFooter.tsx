import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Scale, 
  FileText, 
  Lock, 
  AlertTriangle, 
  Gavel, 
  CheckCircle2, 
  Globe, 
  Building2, 
  Info,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface LegalFooterProps {
  theme?: string;
  onOpenOnboarding?: () => void;
}

export default function LegalFooter({ theme = 'rainbow' }: LegalFooterProps) {
  const { i18n } = useTranslation();
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | 'seller_liability' | 'disputes' | null>(null);
  const [showDisclaimerExpanded, setShowDisclaimerExpanded] = useState(false);

  const isDark = theme === 'tokyo' || theme === 'sunset' || theme === 'dark' || theme === 'midnight';

  return (
    <footer className={clsx(
      "mt-16 border-t transition-colors relative z-10 font-sans text-sm",
      isDark 
        ? "bg-slate-950/90 border-slate-800/80 text-slate-300" 
        : "bg-slate-900 border-slate-800 text-slate-200"
    )}>
      {/* Top Gold & Shield Highlight Bar */}
      <div className="bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-teal-500/20 border-b border-white/5 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-center text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {i18n.language === 'ku' 
                ? 'پلاتفۆرمی پارێزراوی نیشتمانی E-BAZIRGAN (ئێ-بازرگان) — پارێزراوە بەپێی یاساکانی بازرگانی ئەلیکترۆنی' 
                : i18n.language === 'ar'
                ? 'منصة E-BAZIRGAN الوطنية المحمية — طبقاً لقوانين التجارة الإلكترونية وحماية المستهلك'
                : 'E-BAZIRGAN Protected National Platform — Operating under Electronic Commerce & Consumer Laws'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Legal Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        
        {/* Row 1: Brand & Strategic Protection Overview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand & Purpose (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-indigo-600 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-indigo-500/20">
                E
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight text-white flex items-center gap-2">
                  <span>{i18n.language === 'ku' ? 'ئێ-بازرگان (E-BAZIRGAN) دابینکاری و بازاڕگەری' : i18n.language === 'ar' ? 'إي-بازركان (E-BAZIRGAN) التوريد والتجارة' : 'E-BAZIRGAN SOURCING & MARKETPLACE'}</span>
                </h3>
                <p className="text-xs text-amber-400/90 font-bold uppercase tracking-wider font-mono">
                  {i18n.language === 'ku' ? 'پلاتفۆرمی ڕەسمی نیشتمانی بازاڕگەری' : i18n.language === 'ar' ? 'منصة السوق الوطنية الرسمية المعتمدة' : 'Official National E-Commerce Marketplace'}
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-300/90">
              {i18n.language === 'ku'
                ? 'پلاتفۆرمی ئێ-بازرگان (E-BAZIRGAN) ئاسانکاری تەواو پێشکەش دەکات بۆ بەستنەوەی ڕاستەوخۆی کڕیاران و فرۆشیاران لە هەموو پارێزگاکانی هەرێمی کوردستان و عێراق. گەیاندنی کاڵاکان لە ڕێگەی کۆمپانیا سەربەخۆکانی گەیاندنەوە ئەنجام دەدرێت.'
                : i18n.language === 'ar'
                ? 'توفر منصة إي-بازركان (E-BAZIRGAN) بيئة متكاملة لربط المشترين والتجار والموردين مباشرة في جميع محافظات العراق وإقليم كردستان، مع تقديم حلول شحن مرنة ودفع نقدي آمن عند الاستلام.'
                : 'E-BAZIRGAN connects buyers and sellers across all governorates of Iraq and Kurdistan. Delivery services are carried out independently by authorized delivery partner companies.'}
            </p>

            <div className="pt-1 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                🛡️ {i18n.language === 'ku' ? 'پارێزراو لە فێڵکاری' : i18n.language === 'ar' ? 'حماية من الاحتيال والتلاعب' : 'Anti-Fraud Protected'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                ⚖️ {i18n.language === 'ku' ? 'چارەسەرکردنی کێشەکان' : i18n.language === 'ar' ? 'حل النزاعات والامتثال القانوني' : 'Legal Dispute Resolution'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                📍 {i18n.language === 'ku' ? '۱۸ پارێزگا' : i18n.language === 'ar' ? 'تغطية شاملة ١٨ محافظة' : '18 Governorates'}
              </span>
            </div>
          </div>

          {/* Quick Legal Links (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Gavel className="w-3.5 h-3.5 text-indigo-400" />
              <span>{i18n.language === 'ku' ? 'یاسا و ڕێنماییەکان' : i18n.language === 'ar' ? 'القوانين والإرشادات الرسمية' : 'Legal & Compliance'}</span>
            </h4>

            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveLegalModal('terms')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-2 text-left cursor-pointer group"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                  <span>{i18n.language === 'ku' ? '📜 مەرج و ڕێساکانی بەکارهێنان' : i18n.language === 'ar' ? '📜 شروط وأحكام الاستخدام' : '📜 Terms of Service'}</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveLegalModal('seller_liability')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-2 text-left cursor-pointer group"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                  <span>{i18n.language === 'ku' ? '⚠️ بەرپرسیارێتی یاسایی فرۆشیاران' : i18n.language === 'ar' ? '⚠️ المسؤولية القانونية للبائعين' : '⚠️ Seller Legal Liability'}</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveLegalModal('privacy')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-2 text-left cursor-pointer group"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                  <span>{i18n.language === 'ku' ? '🔒 سیاسەتی پاراستنی زانیاری' : i18n.language === 'ar' ? '🔒 سياسة الخصوصية وحماية البيانات' : '🔒 Privacy & Data Protection'}</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => setActiveLegalModal('disputes')}
                  className="hover:text-amber-300 transition-colors flex items-center gap-2 text-left cursor-pointer group"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                  <span>{i18n.language === 'ku' ? '⚖️ چارەسەرکردنی کێشەکان' : i18n.language === 'ar' ? '⚖️ سياسة حل النزاعات والدعم' : '⚖️ Dispute Resolution Policy'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Warning Notice (4 cols) */}
          <div className="md:col-span-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{i18n.language === 'ku' ? 'ڕێنمایی و ڕێساکانی بەکارهێنانی ئەپەکە' : i18n.language === 'ar' ? 'إرشادات وقواعد استخدام المنصة' : 'Platform Usage & Management Rules'}</span>
            </div>

            <p className="text-xs leading-relaxed text-slate-300">
              {i18n.language === 'ku'
                ? 'کڕیارێک داواکاری ناڕاست بکات یان کاڵا وەرنەگرێت، یان فرۆشیارێک نرخی نەگونجاو دابنێت و کاڵای خراپ بڵاوبکاتەوە، بەڕێوەبەری ئەپەکە تەنها بڵاوکراوەکە دەسڕێتەوە و هەژمارەکەی بلۆک دەکات. هەر لێپرسینەوە و سزایەکی یاسایی لەسەر فێڵکاری بەپێی یاساکانی حکومەت دەبێت و بەڕێوەبەری ئەپەکە بەرپسیار نییە.'
                : i18n.language === 'ar'
                ? 'في حال قيام المشتري بتقديم طلبات وهمية أو رفض الاستلام، أو قيام البائع بنشر أسعار مضللة أو بضائع تالفة، تقوم إدارة المنصة بحذف الإعلان وحظر الحساب فوراً. وتخضع أي مساءلة قانونية عن الاحتيال للقوانين الحكومية السارية دون أدنى مسؤولية على إدارة المنصة.'
                : 'If a buyer submits fake orders or refuses delivery, or if a seller posts misleading prices or bad goods, the app administration strictly removes the listings and suspends the account. Any legal or government penalties for fraud fall under official government jurisdiction, and the app administration is not liable.'}
            </p>

            <button
              type="button"
              onClick={() => setShowDisclaimerExpanded(!showDisclaimerExpanded)}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 pt-1 cursor-pointer"
            >
              <span>{showDisclaimerExpanded ? (i18n.language === 'ku' ? 'داخستن' : i18n.language === 'ar' ? 'إغلاق التفاصيل' : 'Collapse') : (i18n.language === 'ku' ? 'خوێندنەوەی زانیارییەکان و ڕێنمایی کامل' : i18n.language === 'ar' ? 'قراءة كامل الشروط والإرشادات' : 'Read Full Guidance & Terms')}</span>
              {showDisclaimerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Detailed Legal Protection Banner */}
        {showDisclaimerExpanded && (
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs leading-relaxed text-slate-300 animate-fade-in">
            <h5 className="font-extrabold text-white text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>{i18n.language === 'ku' ? 'ڕێنمایی گشتی و سنوری بەرپرسیارێتی بەڕێوەبەری ئەپەکە' : i18n.language === 'ar' ? 'الإرشادات العامة ونطاق مسؤولية إدارة المنصة' : 'Platform Guidance & Management Scope'}</span>
            </h5>
            <div className="space-y-2 text-slate-300">
              {i18n.language === 'ku' ? (
                <>
                  <p><strong>١. ئاسانکاری ئەلیکترۆنی:</strong> پلاتفۆرمی E-BAZIRGAN ئاسانکاری تەواو پێشکەش دەکات بۆ بەستنەوەی ڕاستەوخۆ و ئاسانی کڕیاران و فرۆشیاران.</p>
                  <p><strong>٢. ئەرکی فرۆشیار:</strong> فرۆشیار بەپێی ویژدان و بەرپرسیارێتی بەرپسیارە لە پێشکەشکردنی وێنەی ڕاستەقینە و وەسفی دروستی کاڵاکانی بۆ ڕێزگرتن لە کڕیاران.</p>
                  <p><strong>٣. ئەرکی کڕیار:</strong> کڕیار لە کاتی داواکردندا زانیاری و ژمارەی پەیوەندی ڕاست بنووسێت تاوەکو کاڵاکەی بەبێ ئاستەنگ پێ بگات.</p>
                  <p><strong>٤. مافی بەڕێوەبردن:</strong> بەڕێوەبەری ئەپەکە هەوڵ دەدات ژینگەیەکی پاک و خاوێن بپارێزێت، هەر بۆیە مافی ڕاگرتنی هەر هەژمارێک یان بڵاوکراوەیەکی هەیە کە یاساکانی بەکارهێنان دەبەزێنێت.</p>
                </>
              ) : i18n.language === 'ar' ? (
                <>
                  <p><strong>١. التسهيل التقني والتجاري:</strong> توفر منصة E-BAZIRGAN بيئة رقمية آمنة للربط المباشر بين المشتري والتاجر بكل سهولة وشفافية.</p>
                  <p><strong>٢. التزامات البائع:</strong> يتحمل البائع المسؤولية الكاملة عن صحة صور المنتجات، الأسعار المحددة، ومطابقة المواصفات للأصل عند التسليم.</p>
                  <p><strong>٣. التزامات المشتري:</strong> يلتزم المشتري بإدخال بيانات الاتصال والعنوان الدقيق والالتزام باستلام الطلبات المؤكدة لتجنب إهدار جهود التوصيل.</p>
                  <p><strong>٤. حقوق إدارة المنصة:</strong> تحتفظ المنصة بالحق الكامل في حظر أي حساب أو حذف أي إعلان مخالف للقوانين لحماية بيئة التسوق النزيهة.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Digital Facilitation:</strong> E-BAZIRGAN provides a direct platform connecting buyers and sellers safely and transparently.</p>
                  <p><strong>2. Seller Obligations:</strong> Sellers are fully responsible for item authenticity, pricing accuracy, and true descriptions.</p>
                  <p><strong>3. Buyer Obligations:</strong> Buyers must provide accurate delivery details and honor confirmed orders.</p>
                  <p><strong>4. Platform Rights:</strong> The administration reserves the right to suspend any fraudulent accounts or abusive posts.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom Copyright & Footer Note */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-medium">
            <Globe className="w-4 h-4 text-teal-400" />
            <span>
              © {new Date().getFullYear()} <strong>E-BAZIRGAN Sourcing Platform</strong>. {i18n.language === 'ku' ? 'سەرجەم مافەکانی بڵاوکردنەوە و پاراستن پارێزراوە بەپێی یاسا.' : i18n.language === 'ar' ? 'جميع حقوق النشر والتوزيع محفوظة بموجب القانون.' : 'All publication and protection rights reserved.'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveLegalModal('terms')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-white/10"
          >
            <Gavel className="w-4 h-4 text-amber-200" />
            <span>{i18n.language === 'ku' ? '📜 یاسا و مەرجەکانی بەکارهێنان' : i18n.language === 'ar' ? '📜 الشروط والسياسات القانونية' : '📜 Terms & Protection Policy'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Modal for Full Legal Text */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 text-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveLegalModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {activeLegalModal === 'terms' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-3">
                  <FileText className="w-6 h-6" />
                  <h3 className="font-extrabold text-lg text-white">
                    {i18n.language === 'ku' ? 'مەرج و ڕێساکانی بەکارهێنانی ئەپەکە' : i18n.language === 'ar' ? 'شروط وأحكام استخدام المنصة' : 'Terms of Service'}
                  </h3>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  {i18n.language === 'ku' ? (
                    <>
                      <p>بەخێربێن بۆ E-BAZIRGAN. بۆ دەستبەربوونی ئەزموونێکی سەرکەوتوو و ڕێکوپێک، داواتان لێدەکەین ئەم ڕێنماییانە ڕەچاو ببن:</p>
                      <p>• <strong>کڕیاران (داواکاری ناڕاست):</strong> کاتێک کڕیارێک داواکاری دەکات بەڵام بێهۆکار داواکەی ڕەت دەکاتەوە یان زانیاری ناڕاست دەنووسێت، بەڕێوەبەری ئەپەکە تەنها هەژمارەکەی بلۆک دەکات. هەر زیانێک بە فرۆشیار یان شۆفێر بگەڕێتەوە، لێپرسینەوە و سزاکەی بەپێی یاساکانی حکومەت دەبێت و ئەپەکە بەرپسیار نییە.</p>
                      <p>• <strong>فرۆشیاران (نرخی ناڕاست و کاڵای خراپ):</strong> کاتێک فرۆشیارێک نرخی نەگونجاو یان فێڵکەرانە دادەنێت یان کاڵای خراب و جیاواز دەنێرێت، بەڕێوەبەری ئەپەکە ڕاستەوخۆ بڵاوکراوەکە دەسڕێتەوە و هەژماری فرۆشیارەکە بلۆک دەکات. سەرپێچی بازرگانی و فێڵکاری بەپێی یاساکانی حکومەت مامەڵەی لەگەڵدا دەکرێت و بەڕێوەبەری ئەپەکە بەرپسیار نییە.</p>
                    </>
                  ) : i18n.language === 'ar' ? (
                    <>
                      <p>أهلاً بكم في E-BAZIRGAN. لضمان بيئة تسوق عادلة وآمنة للجميع، يرجى الالتزام بالبنود التالية:</p>
                      <p>• <strong>المشترون (الطلبات الوهمية):</strong> في حال قام المشتري بتقديم طلب وهمي أو رفض استلام البضاعة بدون عذر شرعي أو تزوير بيانات الاتصال، يقتصر دور إدارة المنصة على حظر الحساب. وتتم ملاحقة أي أضرار مادية أو غش تجاري عبر الجهات القانونية المختصة دون مسؤولية على المنصة.</p>
                      <p>• <strong>البائعون (الأسعار الوهمية وجودة البضائع):</strong> يمنع منعاً باتاً نشر أسعار مضللة أو إرسال بضائع مقلدة أو رديئة تخالف الوصف المعلن. تقوم إدارة المنصة بحذف الإعلان وحظر المتجر فوراً، وتخضع أي مخالفات تجارية للمساءلة القانونية الحكومية.</p>
                    </>
                  ) : (
                    <>
                      <p>Welcome to E-BAZIRGAN. To ensure a safe and professional trading experience, please observe our terms:</p>
                      <p>• <strong>Buyers (Fake Orders):</strong> Submitting fake orders or refusing delivery results in permanent account suspension. Fraudulent damages are subject to legal prosecution under local law.</p>
                      <p>• <strong>Sellers (Misleading Listings):</strong> Posting deceitful prices or damaged items leads to instant post removal and vendor banning. Commercial fraud is regulated by official legal authorities.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeLegalModal === 'seller_liability' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-3">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-extrabold text-lg text-white">
                    {i18n.language === 'ku' ? 'بەرپرسیارێتی فرۆشیاران و ڕێساکانی بڵاوکردنەوە' : i18n.language === 'ar' ? 'المسؤولية القانونية وقواعد النشر للتجار' : 'Seller Rules & Guidelines'}
                  </h3>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  {i18n.language === 'ku' ? (
                    <>
                      <p>بۆ بونیادنانی ڕێز و متمانەی دوولایەنە لە نێوان فرۆشیار و کڕیاردا:</p>
                      <p>• فرۆشیار بەرپسیارە لە جۆری کاڵاکەی، نرخەکەی، و ڕاستیی زانیارییە بڵاوکراوەکانی.</p>
                      <p>• بڵاوکردنەوەی کاڵای ناڕاست، نرخی فێڵکەرانە، یان ناردنی شتی جیاواز دەبێتە هۆی سڕینەوەی بڵاوکراوەکە و بلۆککردنی هەژمارەکە لەلایەن بەڕێوەبەری ئەپەکەوە.</p>
                      <p>• هەر لێپرسینەوەیەکی یاسایی یان دادگایی پەیوەندیدار بە فێڵکاری بازرگانی تەنها لایەنە پەیوەندیدارەکانی حکومەت بەرپسیارن لێی و بەڕێوەبەری ئەپەکە هیچ بەرپرسیارییەتییەکی یاسایی هەڵناگرێت.</p>
                    </>
                  ) : i18n.language === 'ar' ? (
                    <>
                      <p>لبناء الثقة والشفافية المتبادلة بين البائع والمشتري:</p>
                      <p>• يلتزم البائع بتقديم صور حقيقية، تفاصيل واضحة، وأسعار نهائية غير مضللة شاملة كافة التكاليف.</p>
                      <p>• يؤدي نشر إعلانات مضللة أو مخالفة لمعايير الجودة إلى إزالة المنتجات وحظر التاجر نهائياً من المنصة.</p>
                      <p>• إن أي نزاعات تجارية تنشأ عن مخالفة البائع تخضع للسلطات القضائية المختصة دون أدنى مسؤولية على المنصة.</p>
                    </>
                  ) : (
                    <>
                      <p>To foster trust between vendors and buyers:</p>
                      <p>• Sellers are directly responsible for item condition, pricing accuracy, and genuine photos.</p>
                      <p>• Publishing misleading listings or altered goods results in listing removal and seller bans.</p>
                      <p>• Legal claims are governed by local commercial jurisdictions.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeLegalModal === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-teal-400 border-b border-slate-800 pb-3">
                  <Lock className="w-6 h-6" />
                  <h3 className="font-extrabold text-lg text-white">
                    {i18n.language === 'ku' ? 'سیاسەتی پاراستنی زانیاری کەسی' : i18n.language === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy'}
                  </h3>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  {i18n.language === 'ku' ? (
                    <>
                      <p>ئێمە بەرزترین ڕێز لە تایبەتمەندی بەکارهێنەرانمان دەگرین:</p>
                      <p>• ژمارەی مۆبایل و ناونیشان و زانیارییەکانت بە تەواوی پارێزراون و تەنها بۆ تەواوکردنی پرۆسەی داواکارییەکەت بەکاردێن.</p>
                      <p>• زانیارییەکانت بە هیچ شێوەیەک بە لایەنی سێیەم نادرێت یان نافرۆشرێت.</p>
                    </>
                  ) : i18n.language === 'ar' ? (
                    <>
                      <p>نحن نلتزم بأعلى معايير حماية البيانات وسرية معلومات المستخدمين:</p>
                      <p>• يتم استخدام أرقام الهواتف والعناوين فقط لإتمام عمليات التوصيل والتواصل بين أطراف الطلب.</p>
                      <p>• لا يتم بيع أو مشاركة بيانات المستخدمين الشخصية مع أي جهات خارجية غير مصرح لها مطلقاً.</p>
                    </>
                  ) : (
                    <>
                      <p>We respect our users' privacy and data sovereignty:</p>
                      <p>• Contact numbers and addresses are strictly used for order fulfillment and delivery logistics.</p>
                      <p>• Personal data is never shared or sold to unauthorized third parties.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeLegalModal === 'disputes' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-400 border-b border-slate-800 pb-3">
                  <Scale className="w-6 h-6" />
                  <h3 className="font-extrabold text-lg text-white">
                    {i18n.language === 'ku' ? 'چارەسەرکردنی کێشەکان و پشتیوانی' : i18n.language === 'ar' ? 'حل النزاعات والدعم الفني' : 'Dispute Resolution & Support'}
                  </h3>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                  {i18n.language === 'ku' ? (
                    <>
                      <p>تیمی پشتیوانی ئەپەکە هاوکار دەبێت لە بەڕێوەبردنی پلاتفۆرمەکەدا:</p>
                      <p>• لە هەبوونی هەر کێشەیەک یان فێڵکارییەک لە نێوان کڕیار و فرۆشیاردا، بەڕێوەبەری ئەپەکە تەنها کار ئاسانی دەکات بە سڕینەوەی کێشەسازان و بلۆککردنی هەژمارەکانیان.</p>
                      <p>• لێپرسینەوە و سزای یاسایی لەسەر زەرەر و زیانی دارایی بەپێی یاساکانی حکومەت دەبێت و ئەپەکە بەرپسیار نییە.</p>
                    </>
                  ) : i18n.language === 'ar' ? (
                    <>
                      <p>يعمل فريق الدعم على المساعدة في الحفاظ على نزاهة المنصة:</p>
                      <p>• في حال حدوث أي خلاف تجاري، تقوم إدارة المنصة بالتحقق من الإعلانات وحظر الحسابات المتلاعبة.</p>
                      <p>• تخضع أي مطالبات مالية أو أضرار لقوانين التجارة المحلية المعمول بها في المحاكم الرسمية.</p>
                    </>
                  ) : (
                    <>
                      <p>Our support team works continuously to maintain a trusted trading ecosystem:</p>
                      <p>• In cases of merchant disputes, platform administrators review logs and suspend fraudulent parties.</p>
                      <p>• Financial damage claims are subject to official legal resolution under state law.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs uppercase hover:bg-amber-300 transition-all cursor-pointer"
              >
                {i18n.language === 'ku' ? 'تێگەیشتم (داخستن)' : i18n.language === 'ar' ? 'فهمت وموافق (إغلاق)' : 'I Understand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
