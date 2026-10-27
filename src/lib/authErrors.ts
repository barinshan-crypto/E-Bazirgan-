/**
 * Firebase Auth Error Handling and Diagnostic Logging Helper
 * Maps all Firebase Auth codes to clear, localized, user-friendly messages
 * and provides structured logging for sign-in and registration workflows.
 */

export interface AuthErrorInfo {
  code?: string;
  message: string;
  userFriendlyMessage: {
    ku: string;
    ar: string;
    en: string;
  };
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Maps Firebase Auth error codes to helpful, user-friendly messages
 */
export function getFriendlyAuthErrorMessage(
  error: any,
  lang: 'ku' | 'ar' | 'en' = 'ku'
): string {
  if (!error) {
    return lang === 'ku'
      ? 'هەڵەیەکی نەزانراو ڕوویدا.'
      : lang === 'ar'
      ? 'حدث خطأ غير معروف.'
      : 'An unknown error occurred.';
  }

  const rawCode: string = error?.code || '';
  const rawMessage: string = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));

  // Log in development console for transparency
  console.group(`🔐 [Auth Diagnostic] ${rawCode || 'Error'}`);
  console.error('Raw Error Object:', error);
  console.error('Error Code:', rawCode);
  console.error('Error Message:', rawMessage);
  console.groupEnd();

  switch (rawCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return lang === 'ku'
        ? 'ئیمەیڵ/مۆبایل یان وشەی تێپەڕ هەڵەیە. تکایە دووبارە پشکنینی بۆ بکەوە.'
        : lang === 'ar'
        ? 'البريد الإلكتروني/رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.'
        : 'Invalid email/phone or password. Please verify your credentials and try again.';

    case 'auth/invalid-email':
      return lang === 'ku'
        ? 'فۆرماتی ئیمەیڵ هەڵەیە. تکایە ناونیشانی ئیمەیڵ بە دروستی بنووسە (وەک example@gmail.com).'
        : lang === 'ar'
        ? 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال بريد صالح (مثال: example@gmail.com).'
        : 'Invalid email address format. Please enter a valid email (e.g. example@gmail.com).';

    case 'auth/email-already-in-use':
      return lang === 'ku'
        ? 'ئەم ئیمەیڵە پێشتر تۆمارکراوە. دەتوانیت لە بەشی «چوونەژوورەوە» بچیتە ناو هەژمارەکەت.'
        : lang === 'ar'
        ? 'هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول من تبويب «تسجيل الدخول».'
        : 'This email is already in use. Please sign in instead of registering.';

    case 'auth/weak-password':
      return lang === 'ku'
        ? 'وشەی تێپەڕ زۆر لاوازە. تکایە لانی کەم ٦ پیت یان ژمارە بەکاربهێنە.'
        : lang === 'ar'
        ? 'كلمة المرور ضعيفة جداً. يرجى استخدام 6 خانات على الأقل.'
        : 'Password is too weak. Please use at least 6 characters.';

    case 'auth/too-many-requests':
      return lang === 'ku'
        ? 'هەوڵی نادروست زۆر دراوە بە کاتی. کەمێکی تر چاوەڕێ بکە یان لە ڕێگەی «کۆدی وەتسئەپ» بچۆ ژوورەوە.'
        : lang === 'ar'
        ? 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار قليلاً أو الدخول عبر واتساب.'
        : 'Access temporarily blocked due to multiple failed attempts. Please wait a moment or sign in via WhatsApp OTP.';

    case 'auth/user-disabled':
      return lang === 'ku'
        ? 'ئەم هەژمارە ڕاگیراوە. تکایە پەیوەندی بە پشتگیری بکە.'
        : lang === 'ar'
        ? 'تم تعطيل هذا الحساب. يرجى الاتصال بالدعم الفني.'
        : 'This user account has been disabled. Please contact support.';

    case 'auth/operation-not-allowed':
      return lang === 'ku'
        ? 'ئەم شێوازەی چوونەژوورەوە لە سیستەم چالاک نەکراوە. دەتوانیت لە ڕێگەی ژمارەی مۆبایل یان وەتسئەپ بچیتە ژوورەوە.'
        : lang === 'ar'
        ? 'طريقة تسجيل الدخول هذه غير مفعلة حالياً. يمكنك استخدام تسجيل الدخول برقم الهاتف أو واتساب.'
        : 'This sign-in provider is not enabled in Firebase. Please use Direct Phone / WhatsApp OTP sign-in.';

    case 'auth/popup-blocked':
      return lang === 'ku'
        ? 'پەنجەرەی چوونەژوورەوە (Popup) لەلایەن وێبگەڕەکەتەوە بلۆک کرا. تکایە لە ڕێکخستنی وێبگەڕ ڕێگە بە Popups بدە یان بە مۆبایل/وەتسئەپ بچۆ ژوورەوە.'
        : lang === 'ar'
        ? 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة أو الدخول عبر واتساب/الهاتف.'
        : 'Sign-in popup was blocked by your browser. Please allow popups or use Phone / WhatsApp OTP login.';

    case 'auth/popup-closed-by-user':
      return lang === 'ku'
        ? 'پەنجەرەی چوونەژوورەوە پێش تەواوکردنی پڕۆسەکە داخرا.'
        : lang === 'ar'
        ? 'تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.'
        : 'The sign-in popup was closed before completing authentication.';

    case 'auth/cancelled-popup-request':
      return lang === 'ku'
        ? 'داواکاری چوونەژوورەوە هەڵوەشێنرایەوە لەبەر کردنەوەی پەنجەرەیەکی تر.'
        : lang === 'ar'
        ? 'تم إلغاء الطلب بسبب فتح نافذة منبثقة أخرى.'
        : 'Sign-in request was cancelled as another popup was triggered.';

    case 'auth/unauthorized-domain':
      return lang === 'ku'
        ? 'دۆمەینی ئەم ماڵپەڕە لە لیستی متمانەپێکراوی Firebase نییە. تکایە لە ڕێگەی ژمارەی مۆبایل بچۆ ژوورەوە.'
        : lang === 'ar'
        ? 'النطاق الحالي غير مصرح به في Firebase. يرجى استخدام تسجيل الدخول برقم الهاتف.'
        : 'Current domain is not authorized in Firebase Auth. Please use Phone / WhatsApp sign-in.';

    case 'auth/network-request-failed':
      return lang === 'ku'
        ? 'کێشەی هێڵی ئینتەرنێت هەیە. تکایە دڵنیابەرەوە لە پەیوەندی ئینتەرنێتەکەت و دووبارە تاقی بکەرەوە.'
        : lang === 'ar'
        ? 'فشل الاتصال بالإنترنت. يرجى التحقق من اتصال الشبكة وإعادة المحاولة.'
        : 'Network request failed. Please check your internet connection and retry.';

    case 'auth/requires-recent-login':
      return lang === 'ku'
        ? 'بۆ ئەنجامدانی ئەم کارە، پێویستە سەرلەنوێ بچیتەوە ژوورەوە.'
        : lang === 'ar'
        ? 'تتطلب هذه العملية إعادة تسجيل الدخول لتأكيد الهوية.'
        : 'This action requires recent authentication. Please sign in again.';

    case 'auth/phone-duplicate-found':
      return lang === 'ku'
        ? 'ئەم ژمارەی مۆبایلە پێشتر هەژماری هەیە. تکایە لە ڕێگەی چوونەژوورەوە یان وەتسئەپ دابنیشە.'
        : lang === 'ar'
        ? 'رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد.'
        : 'This phone number already has an account. Please sign in.';

    default:
      // If it contains specific keywords, provide friendly interpretation
      if (rawMessage.includes('network') || rawMessage.includes('offline')) {
        return lang === 'ku'
          ? 'پەیوەندی ئینتەرنێت پچڕاوە یان لاوازە.'
          : lang === 'ar'
          ? 'الاتصال بالإنترنت ضعيف أو مقطوع.'
          : 'Network connection is offline or unstable.';
      }
      if (rawMessage.includes('quota') || rawMessage.includes('Quota exceeded')) {
        return lang === 'ku'
          ? 'کاتی کوۆتای سێرڤەر سنووردار کراوە، کەمێکی تر دووبارە هەوڵبدەرەوە.'
          : lang === 'ar'
          ? 'تم تجاوز حد الاستخدام المؤقت، يرجى المحاولة لاحقاً.'
          : 'Service quota reached. Please try again in a few moments.';
      }

      return lang === 'ku'
        ? `کێشەیەک ڕوویدا لە کاتی چوونەژوورەوە (${rawCode || rawMessage.slice(0, 60)})`
        : lang === 'ar'
        ? `حدث خطأ أثناء تسجيل الدخول (${rawCode || rawMessage.slice(0, 60)})`
        : `Authentication failed (${rawCode || rawMessage.slice(0, 60)})`;
  }
}

/**
 * Structured telemetry & error logging helper for auth actions
 */
export function logAuthDiagnostic(
  action: 'sign_in_email' | 'sign_in_google' | 'sign_in_phone' | 'sign_in_whatsapp' | 'sign_up' | 'sign_out' | 'auth_state_change',
  status: 'start' | 'success' | 'failed' | 'fallback',
  details?: Record<string, any>,
  error?: any
) {
  const timestamp = new Date().toISOString();
  const logPayload = {
    action,
    status,
    timestamp,
    ...details,
    ...(error ? {
      errorCode: error?.code,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack
    } : {})
  };

  if (status === 'failed') {
    console.error(`🚨 [Auth Failure] [${action.toUpperCase()}]:`, logPayload);
  } else if (status === 'fallback') {
    console.warn(`⚠️ [Auth Fallback] [${action.toUpperCase()}]:`, logPayload);
  } else {
    console.log(`✅ [Auth Success] [${action.toUpperCase()}]:`, logPayload);
  }

  return logPayload;
}
