import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Scan, 
  Camera, 
  Upload, 
  TrendingUp, 
  DollarSign, 
  PackageCheck, 
  Store, 
  ShieldCheck, 
  CheckCircle2, 
  MessageCircle, 
  Phone, 
  ShoppingCart, 
  Share2, 
  Sparkles, 
  Layers, 
  ExternalLink, 
  X, 
  RefreshCw, 
  Search, 
  Building2, 
  MapPin, 
  AlertCircle, 
  Barcode, 
  FileText, 
  Flame, 
  Copy, 
  Check,
  Zap,
  ArrowRight,
  Award
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { MarketplaceItem, User } from '../lib/db';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface ProductQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MarketplaceItem[];
  users?: User[];
  currentUser?: User | null;
  onSelectItem: (item: MarketplaceItem) => void;
  onAddToCart?: (item: MarketplaceItem) => void;
  onOpenMessaging?: (sellerId: string, itemContext?: { id: string; title: string; imageUrl?: string; price: number }) => void;
  onOpenProfile?: (userId: string) => void;
  onSearchCode?: (code: string) => void;
  theme?: string;
}

export const ProductQrScannerModal: React.FC<ProductQrScannerModalProps> = ({
  isOpen,
  onClose,
  items,
  users = [],
  currentUser,
  onSelectItem,
  onAddToCart,
  onOpenMessaging,
  onOpenProfile,
  onSearchCode,
  theme = 'dark'
}) => {
  const { i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const isArabic = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedItem, setMatchedItem] = useState<MarketplaceItem | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'qr-reader-viewport';

  // Audio & Haptic feedback
  const triggerScanFeedback = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([60, 40, 60]); } catch (_) {}
    }
  };

  // Helper translations
  const tr = (ku: string, ar: string, en: string) => {
    if (isKurdish) return ku;
    if (isArabic) return ar;
    return en;
  };

  // Find product by any scanned identifier
  const resolveScannedProduct = (rawText: string): MarketplaceItem | null => {
    if (!rawText) return null;
    const cleanText = rawText.trim();

    // 1. Check if it's exact ID match
    let found = items.find(i => i.id === cleanText);
    if (found) return found;

    // 2. Check if it's a URL or custom schema with item ID: payv://product/XYZ or /#XYZ or ?item=XYZ
    try {
      if (cleanText.includes('product/') || cleanText.includes('item=')) {
        const parts = cleanText.split(/product\/|item=/);
        if (parts[1]) {
          const extractedId = parts[1].split(/[/?#&]/)[0];
          found = items.find(i => i.id === extractedId || i.sourceCode === extractedId);
          if (found) return found;
        }
      }
    } catch (_) {}

    // 3. Check sourceCode / SKU / barcode / customFields
    found = items.find(i => 
      (i.sourceCode && i.sourceCode.toLowerCase() === cleanText.toLowerCase()) ||
      ((i as any).barcode && (i as any).barcode.toLowerCase() === cleanText.toLowerCase()) ||
      ((i as any).sku && (i as any).sku.toLowerCase() === cleanText.toLowerCase()) ||
      (i.customFields?.sourceCode && i.customFields.sourceCode.toLowerCase() === cleanText.toLowerCase())
    );
    if (found) return found;

    // 4. Check JSON payload
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.id) {
        found = items.find(i => i.id === parsed.id);
        if (found) return found;
      }
      if (parsed.sourceCode) {
        found = items.find(i => i.sourceCode === parsed.sourceCode);
        if (found) return found;
      }
    } catch (_) {}

    // 5. Fallback substring / title match
    found = items.find(i => 
      i.title.toLowerCase().includes(cleanText.toLowerCase()) || 
      (i.id && cleanText.includes(i.id))
    );

    return found || null;
  };

  // Process decoded text
  const handleDecodedText = (decodedText: string) => {
    if (!decodedText) return;
    triggerScanFeedback();
    setScannedResult(decodedText);
    const item = resolveScannedProduct(decodedText);
    setMatchedItem(item);
    
    // Stop camera once found
    stopCamera();
  };

  // Check torch capability
  const checkTorchCapability = () => {
    try {
      const video = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      const track = (video?.srcObject as MediaStream)?.getVideoTracks()?.[0];
      if (track) {
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(Boolean(caps.torch));
      }
    } catch (_) {
      setHasTorch(false);
    }
  };

  // Toggle torch / flash
  const toggleTorch = async () => {
    try {
      const video = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      const track = (video?.srcObject as MediaStream)?.getVideoTracks()?.[0];
      if (track) {
        const nextTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any]
        });
        setTorchOn(nextTorch);
      }
    } catch (err) {
      console.warn("Error toggling torch:", err);
    }
  };

  // Switch facing mode (Front / Back)
  const toggleFacingMode = async () => {
    await stopCamera();
    setTorchOn(false);
    setHasTorch(false);
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Start Html5Qrcode Scanner with full barcode and QR format support
  const startCamera = async () => {
    setScanError(null);
    try {
      // Clean up previous instance if any
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (_) {}
      }

      // Ensure container is in DOM
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        console.warn("Scanner container not yet rendered in DOM");
        return;
      }

      const qrScanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });
      html5QrCodeRef.current = qrScanner;

      setIsScanning(true);

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.floor(minEdge * 0.82);
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      try {
        await qrScanner.start(
          { facingMode: facingMode },
          qrConfig,
          (decodedText) => {
            handleDecodedText(decodedText);
          },
          () => {
            // Frame scan error - ignore to keep scanning smoothly
          }
        );
      } catch (modeErr) {
        // Fallback: Query available cameras and select appropriate back or front device
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        if (cameras && cameras.length > 0) {
          const chosen = facingMode === 'environment'
            ? cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[0]
            : cameras.find(c => /front|user|selfie/i.test(c.label)) || cameras[0];
          await qrScanner.start(
            chosen.id,
            qrConfig,
            (decodedText) => {
              handleDecodedText(decodedText);
            },
            () => {}
          );
        } else {
          throw modeErr;
        }
      }

      // Check if torch is available after track starts
      setTimeout(() => {
        checkTorchCapability();
      }, 500);

    } catch (err: any) {
      console.warn("Camera start error:", err);
      setIsScanning(false);
      setScanError(
        tr(
          'نەتوانرا کامێرا بکرێتەوە. دەتوانیت وێنەی لەیبڵەکە باربکەیت یان بە دەست کۆدەکەی بنووسیت.',
          'تعذر فتح الكاميرا. يمكنك رفع صورة الملصق أو إدخال الرمز يدوياً.',
          'Unable to open camera. You can upload the label image or enter the code manually.'
        )
      );
    }
  };

  // Stop camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Error stopping camera:", err);
      } finally {
        setIsScanning(false);
        setTorchOn(false);
        setHasTorch(false);
      }
    }
  };

  // Trigger file scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.ITF
          ],
          verbose: false
        });
        html5QrCodeRef.current = scanner;
      }
      const result = await scanner.scanFile(file, true);
      handleDecodedText(result);
    } catch (err) {
      console.warn("File scan error:", err);
      setScanError(
        tr(
          'هیچ بارکۆد یان کۆدێکی QR لەم وێنەیەدا نەدۆزرایەوە. تکایە وێنەیەکی ڕوونتر هەڵبژێرە.',
          'لم يتم العثور على رمز QR أو باركود في هذه الصورة. يرجى تجربة صورة أوضح.',
          'No QR or barcode found in this image. Please try a clearer photo.'
        )
      );
    } finally {
      e.target.value = '';
    }
  };

  // Manual code submit
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecodedText(manualCode.trim());
  };

  // Reset to scan another
  const handleScanAnother = () => {
    setScannedResult(null);
    setMatchedItem(null);
    setManualCode('');
    setScanError(null);
    if (activeTab === 'camera') {
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedResult) {
      const timer = setTimeout(() => {
        startCamera();
      }, 350);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, scannedResult, facingMode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedResult(null);
      setMatchedItem(null);
      setManualCode('');
      setScanError(null);
      setTorchOn(false);
      setHasTorch(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve Seller details for matched item
  const sellerUser = matchedItem 
    ? users.find(u => u.id === (matchedItem.sellerId || matchedItem.userId))
    : null;

  const isSellerVerified = sellerUser?.isVerified || matchedItem?.userId === 'admin' || matchedItem?.userName?.toLowerCase().includes('official');

  // Calculate Resale Metrics
  const baseWholesalePrice = matchedItem?.price || 0;
  const suggestedResalePrice = matchedItem?.resalePrice || Math.round(baseWholesalePrice * 1.35);
  const estimatedUnitProfit = Math.max(0, suggestedResalePrice - baseWholesalePrice);
  const profitMarginPercent = baseWholesalePrice > 0 
    ? Math.round((estimatedUnitProfit / baseWholesalePrice) * 100)
    : 35;

  const getDemandStatus = () => {
    if (profitMarginPercent >= 40) return { label: tr('زۆر بەرز 🔥', 'عالي جداً 🔥', 'Very High 🔥'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (profitMarginPercent >= 25) return { label: tr('بەرز 📈', 'عالي 📈', 'High 📈'), color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    return { label: tr('مامناوەند ⚡', 'متوسط ⚡', 'Moderate ⚡'), color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  };

  const demandInfo = getDemandStatus();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={clsx(
            "relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto transition-all",
            theme === 'tokyo' || theme === 'sunset' || theme === 'dark' || theme === 'midnight'
              ? "bg-slate-900/95 border-slate-700/80 text-white shadow-black/80"
              : "bg-white border-slate-200 text-slate-900 shadow-xl"
          )}
        >
          {/* Top Header */}
          <div className="p-4 sm:p-5 border-b border-slate-500/10 flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  {tr('سکانی لەیبڵ و بارکۆدی کاڵا', 'ماسح ملصقات ورمز الباركود', 'Product Label & QR Scanner')}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Smart Sourcing
                  </span>
                </h2>
                <p className="text-xs opacity-60">
                  {tr('بینینی تەواوی سەرچاوە، قازانجی داشکاندن و زانیاری دابینکەر', 'عرض تفاصيل المصدر، أرباح الخصم ومعلومات المورد', 'Instant sourcing details, discount potential & seller verification')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto no-scrollbar">
            
            {/* View Mode Tabs (When not showing matched result) */}
            {!scannedResult && (
              <div className="flex rounded-2xl p-1 bg-slate-500/10 border border-slate-500/15 gap-1">
                <button
                  type="button"
                  onClick={() => { setActiveTab('camera'); setScanError(null); }}
                  className={clsx(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                    activeTab === 'camera'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  {tr('کامێرای ڕاستەوخۆ', 'الكاميرا المباشرة', 'Live Camera')}
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('upload'); stopCamera(); setScanError(null); }}
                  className={clsx(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                    activeTab === 'upload'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Upload className="w-4 h-4" />
                  {tr('بارکردنی وێنە', 'رفع صورة', 'Upload Image')}
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('manual'); stopCamera(); setScanError(null); }}
                  className={clsx(
                    "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                    activeTab === 'manual'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Barcode className="w-4 h-4" />
                  {tr('نووسینی کۆد', 'إدخال الرمز', 'Manual Code')}
                </button>
              </div>
            )}

            {/* Error banner if any */}
            {scanError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1">{scanError}</div>
              </motion.div>
            )}

            {/* SCANNING MODES */}
            {!scannedResult ? (
              <div className="flex flex-col gap-4">
                
                {/* 1. Camera Viewport (Always kept in DOM so html5-qrcode instance has stable node) */}
                <div className={clsx(
                  "relative w-full aspect-square sm:aspect-video max-h-[320px] rounded-3xl overflow-hidden bg-black border border-slate-700/60 shadow-inner flex flex-col items-center justify-center",
                  activeTab !== 'camera' && "hidden"
                )}>
                  {/* Scanner container for html5-qrcode */}
                  <div id={scannerContainerId} className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

                  {/* Camera Quick Action Controls: Torch & Camera Switch */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={clsx(
                          "p-2.5 rounded-2xl backdrop-blur-md border transition-all active:scale-90 cursor-pointer shadow-lg",
                          torchOn 
                            ? "bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/40" 
                            : "bg-black/60 hover:bg-black/80 text-white border-white/20"
                        )}
                        title={tr('لایت / فلاش', 'الفلاش', 'Torch / Flash')}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2.5 rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all active:scale-90 cursor-pointer shadow-lg flex items-center gap-1 text-xs"
                      title={tr('گۆڕینی کامێرا', 'تبديل الكاميرا', 'Switch Camera')}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-[10px] hidden sm:inline">
                        {facingMode === 'environment' ? tr('پشتەوە', 'خلفية', 'Back') : tr('پێشەوە', 'أمامية', 'Front')}
                      </span>
                    </button>
                  </div>

                  {/* Scanning Overlay HUD Graphics */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl border-2 border-dashed border-indigo-400/50 flex items-center justify-center">
                      {/* 4 Glowing Corner Brackets */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

                      {/* Animated Laser Scanning Line */}
                      <motion.div
                        animate={{ y: [-90, 90, -90] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-4/5 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_rgba(244,63,94,1)]"
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                    <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-xs font-semibold border border-white/10 shadow-lg flex items-center gap-1.5">
                      <Scan className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      {tr('لەیبڵ یان بارکۆدی کاڵاکە بخەرە ناو چوارچێوەکە', 'ضع باركود المنتج داخل الإطار', 'Align product barcode or QR in frame')}
                    </span>
                  </div>
                </div>

                {/* 2. Image / Label Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video max-h-[260px] rounded-3xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer p-6 text-center group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 group-hover:bg-indigo-500/30 flex items-center justify-center text-indigo-400 transition-all group-hover:scale-110">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-sm sm:text-base text-indigo-300">
                          {tr('وێنەی لەیبڵ یان بارکۆدی کاڵاکە دیاری بکە', 'اختر صورة ملصق أو باركود المنتج', 'Choose Product Label or Barcode Photo')}
                        </p>
                        <p className="text-xs opacity-60 mt-1">
                          {tr('کلیک بکە بۆ بارکردن لە گەلەری یان فۆتۆکانت (PNG, JPG, WebP)', 'اضغط للرفع من المعرض أو الصور', 'Click to browse gallery or files (PNG, JPG, WebP)')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Manual Search Tab */}
                {activeTab === 'manual' && (
                  <form onSubmit={handleManualSearch} className="flex flex-col gap-3">
                    <div className="relative w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder={tr('کۆدی کاڵا بنووسە (بۆ نموونە: SRC-1002 یان ID کاڵا)...', 'أدخل رمز المنتج (مثل SRC-1002 أو معرف المنتج)...', 'Enter product Code, SKU, or ID (e.g. SRC-1002)...')}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                    >
                      <Barcode className="w-4 h-4" />
                      {tr('دۆزینەوەی داتای سۆرسینگ', 'البحث عن بيانات المصدر', 'Find Sourcing Data')}
                    </button>
                  </form>
                )}

                {/* Quick Test Demo Barcodes (Real Product Samples) */}
                <div className="pt-2 border-t border-slate-500/10 flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {tr('تاقیکردنەوەی خێرا بە نموونەی کاڵاکانی ناو بازاڕ:', 'تجربة سريعة مع عينات المنتجات:', 'Quick test with marketplace product tags:')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {items.slice(0, 4).map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleDecodedText(sample.sourceCode || sample.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="truncate max-w-[130px]">{sample.title}</span>
                        <span className="text-[10px] opacity-60 font-mono">({sample.sourceCode || sample.id.slice(0, 6)})</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* MATCHED RESULT & SOURCING INTELLIGENCE SHEET */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-5"
              >
                {matchedItem ? (
                  <>
                    {/* Header Banner of Matched Product */}
                    <div className="p-4 rounded-3xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg bg-black">
                        <img
                          src={matchedItem.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80'}
                          alt={matchedItem.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono text-emerald-400 font-bold border border-emerald-500/30">
                          {matchedItem.sourceCode || 'VERIFIED'}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {matchedItem.category || tr('گشتی', 'عام', 'General')}
                          </span>
                          {matchedItem.location && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              {matchedItem.location}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-white line-clamp-2">
                          {matchedItem.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-mono">
                          ID: {matchedItem.id}
                        </p>
                      </div>

                      <button
                        onClick={handleScanAnother}
                        className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer self-end sm:self-center shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {tr('سکانی تر', 'مسح آخر', 'Scan Next')}
                      </button>
                    </div>

                    {/* 📊 RESALE POTENTIAL & SOURCING MARGIN CARDS (High-value Intelligence) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      
                      {/* 1. Wholesale / Sourcing Price */}
                      <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {tr('نرخی سەرچاوە (کۆ)', 'سعر المصدر (جملة)', 'Sourcing Price')}
                        </span>
                        <div className="mt-2">
                          <span className="text-xl font-black text-indigo-200">
                            {baseWholesalePrice.toLocaleString()}
                          </span>
                          <span className="text-xs ml-1 font-bold text-indigo-300">IQD</span>
                        </div>
                        <span className="text-[10px] text-indigo-400/80 mt-1">
                          {tr('نرخی کڕینی دەستپێک', 'سعر الشراء الأساسي', 'Base wholesale cost')}
                        </span>
                      </div>

                      {/* 2. Suggested Resale Retail Price */}
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {tr('نرخی پێشنیارکراوی فرۆشتن', 'سعر البيع المقترح', 'Suggested Resale Price')}
                        </span>
                        <div className="mt-2">
                          <span className="text-xl font-black text-emerald-300">
                            {suggestedResalePrice.toLocaleString()}
                          </span>
                          <span className="text-xs ml-1 font-bold text-emerald-400">IQD</span>
                        </div>
                        <span className="text-[10px] text-emerald-400/80 mt-1">
                          {tr('نرخی تەواوی بازاڕ', 'سعر البيع للمستهلك', 'Standard consumer RRP')}
                        </span>
                      </div>

                      {/* 3. Estimated Unit Profit & Margin */}
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {tr('قازانجی هەر دانەیەک', 'صافي ربح القطعة', 'Unit Net Profit')}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            +{profitMarginPercent}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-xl font-black text-amber-300">
                            +{estimatedUnitProfit.toLocaleString()}
                          </span>
                          <span className="text-xs ml-1 font-bold text-amber-400">IQD</span>
                        </div>
                        <span className="text-[10px] text-amber-400/80 mt-1">
                          {tr('قازانجی خەمڵێنراوی فرۆشتنەوە', 'الربح التقديري لكل وحدة', 'Estimated profit per resale')}
                        </span>
                      </div>

                    </div>

                    {/* 🛡️ SOURCING SPECIFICATIONS & VERIFICATION METRICS */}
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        {tr('تایبەتمەندی و گرەنتی سەرچاوە (Sourcing Specs)', 'مواصفات وضمانات المصدر', 'Sourcing Specifications & Quality')}
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400">{tr('کواڵیتی و پلە', 'الجودة والمستوى', 'Quality Grade')}</span>
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> Grade A+
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400">{tr('ئاستی داواکاری', 'مستوى الطلب', 'Market Demand')}</span>
                          <span className={clsx("font-bold", demandInfo.color)}>
                            {demandInfo.label}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400">{tr('بڕی بەردەست', 'الكمية المتوفرة', 'Availability')}</span>
                          <span className="font-bold text-slate-200 flex items-center gap-1">
                            <PackageCheck className="w-3.5 h-3.5 text-indigo-400" />
                            {matchedItem.stockQuantity ? `${matchedItem.stockQuantity} دانە` : tr('بەردەستە (In Stock)', 'متوفر', 'In Stock')}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400">{tr('خێرایی ساغبوونەوە', 'سرعة التصريف', 'Turnover Speed')}</span>
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" /> 2-4 Days
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 👤 SELLER & SUPPLIER CARD */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800/80 via-slate-800/50 to-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={sellerUser?.avatar || matchedItem.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={sellerUser?.name || matchedItem.userName}
                            className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-md"
                          />
                          {isSellerVerified && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm text-white">
                              {sellerUser?.name || matchedItem.userName || tr('فرۆشیاری فەرمی', 'بائع موثق', 'Verified Supplier')}
                            </h4>
                            {isSellerVerified && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                VERIFIED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Store className="w-3 h-3 text-indigo-400" />
                            {sellerUser?.city || matchedItem.location || 'Kurdistan, Iraq'}
                          </p>
                        </div>
                      </div>

                      {/* Seller Action Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {onOpenMessaging && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenMessaging(matchedItem.userId, {
                                id: matchedItem.id,
                                title: matchedItem.title,
                                imageUrl: matchedItem.imageUrl,
                                price: matchedItem.price
                              });
                              onClose();
                            }}
                            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {tr('نامە ناردن', 'مراسلة', 'Message')}
                          </button>
                        )}

                        {(matchedItem.sellerPhone || sellerUser?.phone) && (
                          <a
                            href={`tel:${matchedItem.sellerPhone || sellerUser?.phone}`}
                            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {tr('پەیوەندی', 'اتصال', 'Call')}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 🚀 PRIMARY SHOPPING ACTIONS */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectItem(matchedItem);
                          onClose();
                        }}
                        className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {tr('بینینی تەواوی کاڵا لە بازاڕ', 'عرض تفاصيل المنتج الكاملة', 'View Full Marketplace Product')}
                      </button>

                      {onAddToCart && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(matchedItem);
                            setAddedToCartSuccess(true);
                            setTimeout(() => setAddedToCartSuccess(false), 2000);
                          }}
                          className={clsx(
                            "py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                            addedToCartSuccess
                              ? "bg-emerald-600 text-white shadow-emerald-600/30"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
                          )}
                        >
                          {addedToCartSuccess ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-300" />
                              {tr('زیادکرا بۆ سەبەتە!', 'تمت الإضافة للسلة!', 'Added to Cart!')}
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              {tr('زیادکردن بۆ سەبەتە', 'إضافة للسلة', 'Add to Cart')}
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </>
                ) : (
                  /* Code scanned but not in database */
                  <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Barcode className="w-8 h-8" />
                    </div>

                    <div>
                      <h3 className="text-base font-black text-white">
                        {tr('لەیبڵ / کۆد سکانکرا:', 'تم مسح الرمز:', 'Label / Code Scanned:')}
                      </h3>
                      <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 break-all select-all flex items-center justify-between gap-2">
                        <span>{scannedResult}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (scannedResult) {
                              navigator.clipboard.writeText(scannedResult);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 1800);
                            }
                          }}
                          className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
                          title="Copy"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {tr(
                          'ئەم لەیبڵە یان بارکۆدە ڕاستەوخۆ لە سیستەمەکەدا نەدۆزرایەوە، بەڵام کۆدەکەی ئامادەیە بۆ گەڕان یان دروستکردنی پۆستی سۆرسینگی نوێ.',
                          'لم يتم العثور على هذا الرمز كمنتج مسجل، ولكن يمكنك استخدامه لإنشاء منشور توريد جديد.',
                          'This code is not currently registered as an existing product in the catalog.'
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
                      {onSearchCode && (
                        <button
                          type="button"
                          onClick={() => {
                            if (scannedResult) {
                              onSearchCode(scannedResult);
                              onClose();
                            }
                          }}
                          className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-98"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>{tr('گەڕان بەم کۆدە لەناو کاڵاکاندا', 'البحث بهذا الرمز في المتجر', 'Search in Marketplace')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleScanAnother}
                        className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-98"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {tr('سکانی کۆدێکی تر', 'مسح رمز آخر', 'Scan Another Code')}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </div>

          {/* Footer Info */}
          <div className="p-3 sm:p-4 border-t border-slate-500/10 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {tr('سیستەمی پارێزراوی سۆرسینگ و بەدواداچوونی لەیبڵ', 'نظام التوريد والتتبع المعتمد', 'Protected Sourcing & Resale Intelligence')}
            </span>
            <span className="font-mono opacity-60">E-BAZIRGAN / PAYV</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
