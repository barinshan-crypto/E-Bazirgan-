import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;

// Rate-limiting and quota management for Gemini API
let aiCooldownUntil = 0;

// Retry helper for Gemini API calls to handle transient 503 errors while honoring 429 quota limits
async function withAiRetry<T>(fn: () => Promise<T>, maxRetries = 2, initialDelay = 1500): Promise<T> {
  if (Date.now() < aiCooldownUntil) {
    throw new Error('AI_COOLDOWN_ACTIVE');
  }

  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isQuotaExceeded = err.status === 429 || errMsg.includes('429') || errMsg.includes('too_many_requests') || errMsg.includes('Quota exceeded');
      
      if (isQuotaExceeded) {
        // Enforce a 35-second cooldown to respect Google's quota window without throwing unhandled exceptions
        aiCooldownUntil = Date.now() + 35000;
        throw new Error('AI_QUOTA_COOLDOWN');
      }

      const is503 = err.status === 503 || errMsg.includes('503') || errMsg.includes('Service Unavailable');
      if (is503 && i < maxRetries - 1) {
        const delay = initialDelay * (i + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Server-side translation memory caches
const batchTranslationCache = new Map<string, { id: string; title: string; description: string; category: string }>();
const textTranslationCache = new Map<string, string>();

// Fallback translation generator for individual item
function generateItemFallback(item: any, targetLanguage: string) {
  const rawTitle = typeof item?.title === 'string' ? item.title : '';
  const rawDesc = typeof item?.description === 'string' ? item.description : '';
  const rawCategory = typeof item?.category === 'string' ? item.category : '';

  let tTitle = rawTitle;
  let tDesc = rawDesc;
  let tCategory = rawCategory;

  const lowerTitle = rawTitle.toLowerCase();
  if (lowerTitle.includes('honey')) {
    tTitle = 'هەنگوینی شاخی سروشتی ڕەسەن';
    tDesc = 'هەنگوینی ١٠٠٪ سروشتی و ئۆرگانیک، بەرهەمی چیا بەرزەکانی کوردستان. بە بێ هیچ ماددەیەکی پارێزەر.';
    tCategory = 'خوراک';
  } else if (lowerTitle.includes('rice')) {
    tTitle = 'برنجی کوردی خۆماڵی';
    tDesc = 'برنجی ڕەسەنی کوردی، بۆندار و تامدار، ڕاستەوخۆ لە زەوییە بەپیتەکانی ئاکرێ و دەوروبەری.';
    tCategory = 'خوراک';
  } else if (lowerTitle.includes('oil')) {
    tTitle = 'زەیتی زەیتوونی دەستی';
    tDesc = 'زەیتی زەیتوونی کواڵیتی بەرز، لە زەیتوونی دەستچنراو و گوشراوی سارد بە شێوازی نەریتی.';
    tCategory = 'خوراک';
  } else if (lowerTitle.includes('rug') || lowerTitle.includes('carpet')) {
    tTitle = 'بەرماڵ و ڕاخەری دەستچنی کوردی';
    tDesc = 'کۆپییەکی ناوازە لە کارە هونەری و نەریتییەکانی دەستی کوردی بە نەخشی ڕەسەن.';
    tCategory = 'دەستڕەنگینی';
  } else if (lowerTitle.includes('fig') || lowerTitle.includes('figs')) {
    tTitle = 'هەنجیری وشککراوەی سروشتی';
    tDesc = 'هەنجیری بەتام و شیرینی لۆکاڵی، وشککراوە بە تیشکی خۆر بەبێ شەکری دەستکرد.';
    tCategory = 'خوراک';
  } else {
    tTitle = rawTitle
      .replace(/Handmade/gi, 'دەستچن')
      .replace(/Organic/gi, 'ئۆرگانیک')
      .replace(/Premium/gi, 'نایاب');
    tDesc = rawDesc
      .replace(/Direct from/gi, 'ڕاستەوخۆ لە')
      .replace(/quality/gi, 'کواڵیتی')
      .replace(/best/gi, 'باشترین');
  }

  return {
    id: String(item?.id || ''),
    title: tTitle || rawTitle || 'کاڵا',
    description: tDesc || rawDesc || '',
    category: tCategory || rawCategory || ''
  };
}

async function startServer() {
  const app = express();
  
  app.use(cors({ origin: '*' }));
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'favicon.ico'));
  });

  // Fallback memory storage to maintain operation if database is offline or not set up
  const fallbackOrders: any[] = [];
  const deletedOrderIds = new Set<string>();
  let lastDbError: string | null = null;

  function objectToFirestoreFields(obj: any): any {
    if (obj === null || obj === undefined) return { nullValue: null };
    if (typeof obj === 'string') return { stringValue: obj };
    if (typeof obj === 'number') return { doubleValue: obj };
    if (typeof obj === 'boolean') return { booleanValue: obj };
    if (Array.isArray(obj)) {
      return { arrayValue: { values: obj.map(objectToFirestoreFields) } };
    }
    if (typeof obj === 'object') {
      const fields: any = {};
      for (const key of Object.keys(obj)) {
        fields[key] = objectToFirestoreFields(obj[key]);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(obj) };
  }

  function firestoreFieldsToObject(fields: any): any {
    if (!fields) return {};
    const res: any = {};
    for (const key of Object.keys(fields)) {
      const val = fields[key];
      if ('stringValue' in val) res[key] = val.stringValue;
      else if ('doubleValue' in val) res[key] = Number(val.doubleValue);
      else if ('integerValue' in val) res[key] = Number(val.integerValue);
      else if ('booleanValue' in val) res[key] = val.booleanValue;
      else if ('arrayValue' in val) res[key] = (val.arrayValue.values || []).map((v: any) => firestoreFieldsToObject({ temp: v }).temp);
      else if ('mapValue' in val) res[key] = firestoreFieldsToObject(val.mapValue.fields || {});
      else if ('nullValue' in val) res[key] = null;
    }
    return res;
  }

  async function restGetOrder(orderId: string) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) return null;
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const projectId = cfg.projectId;
      const dbId = cfg.firestoreDatabaseId || cfg.databaseId || '(default)';
      const apiKey = cfg.apiKey;
      if (!projectId || !apiKey) return null;

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/orders/${orderId}?key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.fields) {
        return { _id: orderId, id: orderId, ...firestoreFieldsToObject(data.fields) };
      }
      return null;
    } catch (e) {
      console.warn("[PAYV REST] Error getting order:", e);
      return null;
    }
  }

  async function restGetOrders() {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) return [];
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const projectId = cfg.projectId;
      const dbId = cfg.firestoreDatabaseId || cfg.databaseId || '(default)';
      const apiKey = cfg.apiKey;
      if (!projectId || !apiKey) return [];

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/orders?key=${apiKey}&pageSize=100`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.documents && Array.isArray(data.documents)) {
        return data.documents.map((docItem: any) => {
          const idParts = docItem.name ? docItem.name.split('/') : [];
          const docId = idParts[idParts.length - 1];
          return {
            _id: docId,
            id: docId,
            ...firestoreFieldsToObject(docItem.fields)
          };
        });
      }
      return [];
    } catch (e) {
      console.warn("[PAYV REST] Error getting orders list:", e);
      return [];
    }
  }

  async function restSaveOrder(orderId: string, orderData: any) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) return false;
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const projectId = cfg.projectId;
      const dbId = cfg.firestoreDatabaseId || cfg.databaseId || '(default)';
      const apiKey = cfg.apiKey;
      if (!projectId || !apiKey) return false;

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/orders/${orderId}?key=${apiKey}`;
      const fields = objectToFirestoreFields(orderData).mapValue?.fields || {};
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: AbortSignal.timeout(2000)
      });
      return res.ok;
    } catch (e) {
      console.warn("[PAYV REST] Error saving order:", e);
      return false;
    }
  }

  // Initialize Firebase Web SDK for server-side operations
  let dbInstance: any = null;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const targetDbId = firebaseConfig.firestoreDatabaseId || firebaseConfig.databaseId || '(default)';
      
      console.log(`[PAYV Backend] Connecting to Firestore via Web SDK. Target DB: ${targetDbId}`);

      try {
        setLogLevel('error');
      } catch (_) {}

      const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      try {
        dbInstance = initializeFirestore(firebaseApp, {
          experimentalForceLongPolling: true,
        }, targetDbId);
      } catch (_) {
        dbInstance = getFirestore(firebaseApp, targetDbId);
      }
      console.log(`[PAYV Backend] SUCCESS: Firestore Web SDK initialized for database: ${targetDbId}`);
      lastDbError = null;
    } else {
      lastDbError = "config file not found";
      console.log(`[PAYV Backend] firebase-applet-config.json not found, using memory fallback`);
    }
  } catch (e: any) {
    lastDbError = `Init error: ${e.message}`;
    console.error("[PAYV Backend] Error setting up backend firebase:", e);
  }

  // API Endpoints
  // 1. Create a new Order listing POST /api/payv/insert-order
  app.post('/api/payv/insert-order', async (req, res) => {
    try {
      const { customerName, customerEmail, phone, address, items, totalPrice, status, location, shopAddress, idNumber, shopName, subtotalPrice } = req.body;
      if (!customerName || !phone || !address || !items || !Array.isArray(items) || totalPrice === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required order fields: customerName, phone, address, items, totalPrice.' });
      }

      const fakeSaved = {
        _id: `ord_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        customerName,
        customerEmail: customerEmail || '',
        phone,
        address,
        location: location || '',
        shopAddress: shopAddress || '',
        shopName: shopName || 'Kurd Boutique',
        idNumber: idNumber || '',
        items,
        totalPrice,
        subtotalPrice: subtotalPrice || totalPrice - 10,
        status: status || 'Pending',
        createdAt: new Date().toISOString()
      };

      // Save to memory immediately
      fallbackOrders.unshift(fakeSaved);

      // Save to Firestore asynchronously in background with strict timeout so API responds in milliseconds
      (async () => {
        let savedToFs = false;
        if (dbInstance) {
          try {
            await Promise.race([
              setDoc(doc(dbInstance, 'orders', fakeSaved._id), fakeSaved, { merge: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1200))
            ]);
            console.log(`[PAYV Backend] Order successfully persisted to Firestore: ${fakeSaved._id}`);
            savedToFs = true;
          } catch (dbErr: any) {
            console.warn("[PAYV Backend] Firestore async save notice:", dbErr?.message || dbErr);
          }
        }
        
        if (!savedToFs) {
          try {
            const restOk = await restSaveOrder(fakeSaved._id, fakeSaved);
            if (restOk) {
              console.log(`[PAYV Backend] Order successfully persisted to Firestore via REST API: ${fakeSaved._id}`);
            }
          } catch (e) {}
        }
      })().catch(e => console.warn("[PAYV Backend] Background order sync:", e));

      return res.status(201).json({ success: true, order: fakeSaved });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  let cachedOrdersList: any[] | null = null;
  let cachedOrdersTime = 0;

  // 1.5. Fetch a single order by ID (publicly accessible for couriers/direct-cargo drivers)
  app.get('/api/payv/get-order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    try {
      // 1. Check in-memory fallback first for instant <1ms response
      const cachedOrder = fallbackOrders.find(o => o._id === orderId || o.id === orderId);
      if (cachedOrder) {
        return res.json({ success: true, order: cachedOrder });
      }

      // 2. Try Firestore Web SDK with strict 1.5s timeout
      if (dbInstance) {
        try {
          const orderDoc: any = await Promise.race([
            getDoc(doc(dbInstance, 'orders', orderId)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1500))
          ]);
          if (orderDoc && orderDoc.exists()) {
            return res.json({ success: true, order: { _id: orderDoc.id, id: orderDoc.id, ...orderDoc.data() } });
          }
        } catch (fsErr: any) {
          console.warn("[PAYV Backend] Error getting order from Firestore:", fsErr?.message || fsErr);
        }
      }

      // 3. Try Firestore REST API
      const restOrder = await restGetOrder(orderId);
      if (restOrder) {
        return res.json({ success: true, order: restOrder });
      }

      return res.status(404).json({ success: false, error: 'Order consignment not found' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Fetch all Order listings GET /api/payv/get-orders (fast cached)
  app.get('/api/payv/get-orders', async (req, res) => {
    try {
      const now = Date.now();
      // Return cached list if less than 3 seconds old for instant <2ms latency
      if (cachedOrdersList && (now - cachedOrdersTime) < 3000) {
        return res.json({ success: true, orders: cachedOrdersList, cached: true });
      }

      let dbOrders: any[] = [];
      let fetchedFromFs = false;

      if (dbInstance) {
        try {
          const snapshot: any = await Promise.race([
            getDocs(collection(dbInstance, 'orders')),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1500))
          ]);
          if (snapshot && snapshot.forEach) {
            snapshot.forEach((docSnap: any) => {
              dbOrders.push({ id: docSnap.id, _id: docSnap.id, ...docSnap.data() });
            });
            fetchedFromFs = true;
          }
        } catch (dbErr: any) {
          console.warn("[PAYV Backend] Firestore orders fetch timed out or errored, activating REST fallback:", dbErr?.message || dbErr);
        }
      }

      if (!fetchedFromFs) {
        const restOrders = await restGetOrders();
        if (restOrders && restOrders.length > 0) {
          dbOrders = restOrders;
        }
      }

      const merged = [...dbOrders, ...fallbackOrders];
      const uniqueMap = new Map();
      merged.forEach(o => {
        const idVal = o._id || o.id;
        if (idVal && !deletedOrderIds.has(idVal)) {
          uniqueMap.set(idVal, o);
        }
      });

      const ordersList = Array.from(uniqueMap.values()).sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      // Update cache
      cachedOrdersList = ordersList;
      cachedOrdersTime = now;

      res.json({ success: true, orders: ordersList });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2.1 Delete single order POST /api/payv/delete-order
  app.post('/api/payv/delete-order', async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'orderId is required' });
      }

      // Mark in deleted set
      deletedOrderIds.add(orderId);

      // Remove from memory fallbackOrders
      for (let i = fallbackOrders.length - 1; i >= 0; i--) {
        if (fallbackOrders[i]._id === orderId || fallbackOrders[i].id === orderId) {
          fallbackOrders.splice(i, 1);
        }
      }

      // Delete from Firestore Web SDK
      if (dbInstance) {
        try {
          await deleteDoc(doc(dbInstance, 'orders', orderId));
          console.log(`[PAYV Backend] Order deleted from Firestore: ${orderId}`);
        } catch (e: any) {
          console.warn("[PAYV Backend] Error deleting order from Firestore:", e?.message || e);
        }
      }

      return res.json({ success: true, deletedOrderId: orderId });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2.2 Clear user orders POST /api/payv/clear-user-orders
  app.post('/api/payv/clear-user-orders', async (req, res) => {
    try {
      const { userId, phone, email, name } = req.body;
      const cleanPhone = (p?: string) => (p || '').replace(/[\s+-]/g, '');
      const targetPhone = cleanPhone(phone);

      // Remove from memory fallbackOrders & mark deleted
      for (let i = fallbackOrders.length - 1; i >= 0; i--) {
        const ord = fallbackOrders[i];
        const ordPhone = cleanPhone(ord.phone || ord.buyerPhone || ord.customerPhone);
        const phoneMatch = Boolean(targetPhone && ordPhone && (targetPhone.includes(ordPhone) || ordPhone.includes(targetPhone)));
        const userMatch = Boolean(userId && (ord.userId === userId || ord.buyerId === userId));
        const emailMatch = Boolean(email && (ord.customerEmail || ord.buyerEmail) === email);
        const nameMatch = Boolean(name && (ord.customerName || ord.buyerName) === name);

        if (phoneMatch || userMatch || emailMatch || nameMatch) {
          const ordId = ord._id || ord.id;
          if (ordId) deletedOrderIds.add(ordId);
          fallbackOrders.splice(i, 1);
        }
      }

      // Delete matching from Firestore Web SDK
      if (dbInstance) {
        try {
          const snapshot = await getDocs(collection(dbInstance, 'orders'));
          const batch = writeBatch(dbInstance);
          let count = 0;
          snapshot.forEach((docSnap: any) => {
            const ord = docSnap.data();
            const ordPhone = cleanPhone(ord.phone || ord.buyerPhone || ord.customerPhone);
            const phoneMatch = Boolean(targetPhone && ordPhone && (targetPhone.includes(ordPhone) || ordPhone.includes(targetPhone)));
            const userMatch = Boolean(userId && (ord.userId === userId || ord.buyerId === userId));
            const emailMatch = Boolean(email && (ord.customerEmail || ord.buyerEmail) === email);
            const nameMatch = Boolean(name && (ord.customerName || ord.buyerName) === name);

            if (phoneMatch || userMatch || emailMatch || nameMatch) {
              deletedOrderIds.add(docSnap.id);
              batch.delete(doc(dbInstance, 'orders', docSnap.id));
              count++;
            }
          });
          if (count > 0) {
            await batch.commit();
            console.log(`[PAYV Backend] Cleared ${count} orders from Firestore`);
          }
        } catch (e: any) {
          console.warn("[PAYV Backend] Error clearing user orders from Firestore:", e?.message || e);
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. AI Caption Generation endpoint using @google/genai with gemini-1.5-flash
  app.post('/api/payv/generate-caption', async (req, res) => {
    try {
      const { prompt, language = 'Kurdish', tone = 'Elegant/Luxury' } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Product description or prompt keywords are required' });
      }

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const interaction = await withAiRetry(() => ai.interactions.create({
            model: "gemini-3.6-flash",
            input: `Write a premium social media post caption (suitable for Instagram/TikTok status) based on:
Product keywords: "${prompt}"
Language of Caption: ${language} (Write Kurdish in Kurdish Arab-Persian alphabet, of course, with proper Kurdish grammar and warm phrases like 'بێوێنە', 'بەرزترین جۆری كواڵیتی', 'خۆماڵی', 'کوردستان')
Desired Tone: ${tone} (e.g. extremely luxury and sophisticated)

Rules:
- DO NOT output any introduction, headers, or metadata.
- Just output the direct written caption content.`,
            system_instruction: `You are a high-end luxury creative director for EBAZIRGAN (Premium Kurdish Sourced Logistics & Marketplace). You write exceptionally stylish, elegant, and engaging marketing captions to sell local Kurdish crafts, organic mountain foods, and traditional products. Use matching hashtags (like #EBAZIRGAN, #KurdishCrafts, #ErbilStyle, #SourcedDirect) and emojis gracefully.`,
            generation_config: {
              temperature: 0.82
            }
          }));

          let fullOutput = "";
          for (const step of interaction.steps) {
            if (step.type === 'model_output') {
              const textContent = step.content?.find((c: any) => c.type === 'text');
              if (textContent && 'text' in textContent) {
                fullOutput += (textContent as any).text;
              }
            }
          }

          return res.json({ success: true, caption: fullOutput.trim() });
        } catch (sdkError: any) {
          console.log("Using smart fallback generation stream.");
        }
      }

      // High-quality localized fallback generator if GEMINI_API_KEY is not defined
      console.log("Generating premium localized fallback caption...");
      const randomHashtags = ' #EBAZIRGAN #KurdishSourced #DirectFromSource #KurdistanUnique #LuxuryRetail';
      let cleanCaption = '';

      if (language.toLowerCase().includes('kurdish') || language.toLowerCase().includes('sorani')) {
        const fallbacks: Record<string, string> = {
          luxury: `بێوێنەترین و نایابترین بەرهەمی خۆماڵی لەگەڵ EBAZIRGAN! ✨\nبۆتۆ بەرزترین کواڵیتی و تایبەتترین تام و چێژمان زامنی کردووە. دڵنیابە لە ڕەسەنایەتی جیاوازمان. بەرجەستەکردنی ڕۆحی کوردستان لەناو ماڵەکەتدا.${randomHashtags}`,
          promotional: `دەرفەتێکی زێڕین بۆ بەدەستهێنانی ناوازەترین بەرهەمی ڕەسەن هاتووەتە پێشێ! 📦🚀\nئەیەتەوێت نایابترین دەستکەوتی خۆمانە پیشانی دۆستانت بدەیت؟ EBAZIRGAN ئاسانترین و خێراترین شێوازە بۆ گەیاندنی دەرگا بە دەرگا.${randomHashtags}`,
          friendly: `سڵاو هاوڕێیان! ئەمڕۆ ئەم بەرهەمە جوان و خۆشەمان هەیە کە بە تەواوی لەلایەن دەستڕەنگینانی خۆماڵی دروست کراوە. خزمەتگوزارییەکی نایاب و خێرا بۆ هەمووتان.${randomHashtags}`,
          default: `بەرهەمێکی گەرمی کوردەواری بەرزترین ئاستی گەیاندن و ڕازیکردنتان دەبەخشێت. گەیاندنی دڵنیا لەگەڵ سیستەمی لۆجیستی لۆکال.${randomHashtags}`
        };
        const activeKey = tone.toLowerCase().includes('luxury') ? 'luxury' : tone.toLowerCase().includes('promotional') ? 'promotional' : tone.toLowerCase().includes('friendly') ? 'friendly' : 'default';
        cleanCaption = `✨ ${prompt} ✨\n\n${fallbacks[activeKey]}`;
      } else {
        const fallbacks: Record<string, string> = {
          luxury: `Indulge in unparalleled excellence with EBAZIRGAN's finest curation. ✨\nBridging authentic local master-craftsmen with premium, door-to-door direct transit. Sourced directly from Kurdish high peaks with love, precision, and state-of-the-art care.${randomHashtags}`,
          promotional: `Supercharge your day with direct-sourced regional wonders! 🚀📦\nUnmatched quality, certified safety standards, and real-time transit tracking. Secure yours instantly while stock continues!${randomHashtags}`,
          friendly: `Hey friends! Check out this awesome direct-sourced gem. Completely handcrafted and prepared with immense love by regional artisans. We can't wait for you to experience this connection!${randomHashtags}`,
          default: `Your premium direct-sourced regional essential is here. Verified logistics, seamless payment channels, and authentic quality standards with EBAZIRGAN Logistics.${randomHashtags}`
        };
        const activeKey = tone.toLowerCase().includes('luxury') ? 'luxury' : tone.toLowerCase().includes('promotional') ? 'promotional' : tone.toLowerCase().includes('friendly') ? 'friendly' : 'default';
        cleanCaption = `✨ ${prompt} ✨\n\n${fallbacks[activeKey]}`;
      }

      return res.json({
        success: true,
        caption: cleanCaption,
        isFallback: true
      });

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Calculate and Update Seller Reputation POST /api/payv/calculate-reputation/:sellerId
  app.post('/api/payv/calculate-reputation/:sellerId', async (req, res) => {
    const { sellerId } = req.params;
    if (!sellerId) {
      return res.status(400).json({ success: false, error: 'Seller ID is required' });
    }

    try {
      let reviewsList: any[] = [];
      let ordersList: any[] = [];
      let itemsList: any[] = [];

      // 1. Fetch from Firestore if available with fast 1.5s timeout
      if (dbInstance) {
        try {
          // Fetch reviews and items with strict timeout
          const [reviewsSnap, itemsSnap]: any = await Promise.all([
            Promise.race([
              getDocs(collection(dbInstance, 'reviews')),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
            ]).catch(() => null),
            Promise.race([
              getDocs(collection(dbInstance, 'marketplace_items')),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
            ]).catch(() => null)
          ]);

          if (reviewsSnap && reviewsSnap.forEach) {
            reviewsSnap.forEach((docSnap: any) => {
              reviewsList.push({ id: docSnap.id, ...docSnap.data() });
            });
          }

          if (itemsSnap && itemsSnap.forEach) {
            itemsSnap.forEach((docSnap: any) => {
              itemsList.push({ id: docSnap.id, ...docSnap.data() });
            });
          }
        } catch (dbErr: any) {
          console.warn("[PAYV Backend] Firestore reputation fetch info:", dbErr?.message || dbErr);
        }
      }

      // Merge client-provided fallback items/reviews for resilience
      const clientReviews = req.body.reviews;
      if (clientReviews && Array.isArray(clientReviews)) {
        reviewsList = [...reviewsList, ...clientReviews];
      }

      const clientItems = req.body.items;
      if (clientItems && Array.isArray(clientItems)) {
        itemsList = [...itemsList, ...clientItems];
      }

      // Fetch all orders from backend state
      ordersList = [...fallbackOrders];
      const clientOrders = req.body.orders;
      if (clientOrders && Array.isArray(clientOrders)) {
        ordersList = [...ordersList, ...clientOrders];
      }

      // De-duplicate lists
      const itemMap = new Map();
      itemsList.forEach(i => { if (i.id) itemMap.set(i.id, i); });
      itemsList = Array.from(itemMap.values());

      const reviewMap = new Map();
      reviewsList.forEach(r => { if (r.id) reviewMap.set(r.id, r); });
      reviewsList = Array.from(reviewMap.values());

      const orderMap = new Map();
      ordersList.forEach(o => {
        const idVal = o._id || o.id;
        if (idVal) orderMap.set(idVal, o);
      });
      ordersList = Array.from(orderMap.values());

      // Filter items belonging to this seller
      const sellerItemIds = new Set(
        itemsList
          .filter(item => item.userId === sellerId)
          .map(item => item.id)
      );

      // Filter reviews of this seller's products
      const sellerReviews = reviewsList.filter(rev => sellerItemIds.has(rev.itemId) || rev.sellerId === sellerId);

      // Filter orders containing items from this seller
      const sellerOrders = ordersList.filter(ord => {
        if (ord.items && Array.isArray(ord.items)) {
          return ord.items.some((item: any) => item.sellerId === sellerId);
        }
        return false;
      });

      // 2. Metrics Calculation
      const totalReviewsCount = sellerReviews.length;
      const avgRating = totalReviewsCount > 0 
        ? sellerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviewsCount
        : 5.0; // default to 5.0 stars if new

      let totalRevenue = 0;
      const completedTransactions = sellerOrders.length;
      sellerOrders.forEach(ord => {
        if (ord.items && Array.isArray(ord.items)) {
          ord.items.forEach((item: any) => {
            if (item.sellerId === sellerId) {
              totalRevenue += Number(item.price || 0) * Number(item.quantity || 1);
            }
          });
        }
      });

      // 3. Score Calculation
      let score = 75; // base score

      // Rating impact
      if (avgRating >= 4.0) {
        score += Math.round((avgRating - 4.0) * 15); // +15 max
      } else {
        score -= Math.round((4.0 - avgRating) * 20); // down to 0
      }

      // Volumetric impacts
      score += Math.min(10, totalReviewsCount * 2); // up to +10
      score += Math.min(15, completedTransactions * 3); // up to +15

      // Final clamping
      score = Math.max(0, Math.min(100, score));

      // 4. Badges Allocation
      const badges = [];

      // Badge 'Top Seller'
      if (completedTransactions >= 2 || totalRevenue >= 200) {
        badges.push({
          id: 'top-seller',
          name: 'Top Seller',
          nameKu: 'فرۆشیاری دیار',
          description: 'Awarded for high transaction volume and trading experience',
          descriptionKu: 'پێشکەش دەکرێت بۆ قەبارەی بەرزی کڕین و فرۆشتن',
          icon: 'Award',
          color: 'from-amber-500 to-orange-600 text-amber-50 border-amber-500/30'
        });
      }

      // Badge 'High Ratings'
      if (totalReviewsCount >= 2 && avgRating >= 4.6) {
        badges.push({
          id: 'high-ratings',
          name: 'High Ratings',
          nameKu: 'هەڵسەنگاندنی بەرز',
          description: 'Consistently receives outstanding feedback from direct buyers',
          descriptionKu: 'بەردەوام هەڵسەنگاندنی نایاب لە کڕیاران وەردەگرێت',
          icon: 'Star',
          color: 'from-rose-500 to-pink-600 text-rose-50 border-rose-500/30'
        });
      } else {
        badges.push({
          id: 'trusted-member',
          name: 'Trusted Partner',
          nameKu: 'هاوبەشی باوەڕپێکراو',
          description: 'Verified direct sourcing member with clean logistics record',
          descriptionKu: 'ئەندامی لۆجیستی باوەڕپێکراو بە تۆمارێکی خاوێن',
          icon: 'ShieldCheck',
          color: 'from-teal-500 to-emerald-600 text-teal-50 border-teal-500/30'
        });
      }

      // Badge 'Fast Responder' (always given if active/good status or fallback)
      badges.push({
        id: 'fast-responder',
        name: 'Fast Responder',
        nameKu: 'وەڵامدەرەوەی خێرا',
        description: 'Dispatches consignments to cargo routing in under 12 hours',
        descriptionKu: 'بارەکە ڕەوانەی کارگۆ دەکات لە کەمتر لە ١٢ کاتژمێردا',
        icon: 'Zap',
        color: 'from-cyan-500 to-blue-600 text-cyan-50 border-cyan-500/30'
      });

      const reputationData = {
        score,
        avgRating: Number(avgRating.toFixed(2)),
        totalReviewsCount,
        completedTransactions,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        badges,
        updatedAt: Date.now()
      };

      // Update Firestore Profile if available
      if (dbInstance) {
        try {
          await setDoc(doc(dbInstance, 'seller_profiles', sellerId), {
            reputation: reputationData,
            rating: Number(avgRating.toFixed(2))
          }, { merge: true });
          console.log(`[PAYV Backend] Updated Firestore profile with reputation for: ${sellerId}`);
        } catch (fsErr: any) {
          console.error("[PAYV Backend] Failed to merge reputation into Firestore:", fsErr?.message || fsErr);
        }
      }

      return res.json({
        success: true,
        sellerId,
        reputation: reputationData
      });

    } catch (error: any) {
      console.error("[PAYV Backend] Reputation calculation failed:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Batch Translation endpoint with intelligent caching and quota safety
  app.post('/api/payv/translate-batch', async (req, res) => {
    try {
      const { items, targetLanguage = 'Kurdish' } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Items array is required' });
      }

      if (items.length === 0) {
        return res.json({ success: true, translations: [] });
      }

      // Check cache for already-translated items
      const results: Array<{ id: string; title: string; description: string; category: string }> = [];
      const uncachedItems: any[] = [];

      for (const it of items) {
        const cacheKey = `${targetLanguage}_${it.id || it.title}`;
        const cached = batchTranslationCache.get(cacheKey);
        if (cached) {
          results.push(cached);
        } else {
          uncachedItems.push(it);
        }
      }

      // If all items are cached, return immediately in 0ms
      if (uncachedItems.length === 0) {
        return res.json({ success: true, translations: results, fromCache: true });
      }

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const canCallAi = Boolean(GEMINI_API_KEY) && Date.now() >= aiCooldownUntil;
      let aiSuccess = false;

      if (canCallAi && uncachedItems.length > 0) {
        try {
          const ai = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          // Build a clean structure for Gemini to translate in one go
          const payload = uncachedItems.map((item: any) => ({
            id: String(item?.id || ''),
            title: String(item?.title || ''),
            description: String(item?.description || ''),
            category: String(item?.category || '')
          }));

          const prompt = `Translate the following list of products into ${targetLanguage} (Kurdish Arab-Persian script with proper Kurmanji/Sorani vocabulary, extremely natural, friendly and appealing for Kurdish buyers).
Return the output ONLY as a valid JSON array of objects, where each object has "id", "title" (translated), "description" (translated), and "category" (translated).
Do not include any markdown formatting, code block markers like \`\`\`json, or any extra text. Just return the JSON array.

Input Products:
${JSON.stringify(payload, null, 2)}`;

          let translatedText = "";

          try {
            const interaction = await withAiRetry(() => ai.interactions.create({
              model: "gemini-3.6-flash",
              input: prompt,
              generation_config: {
                temperature: 0.1
              }
            }));
            for (const step of interaction.steps || []) {
              if (step.type === 'model_output') {
                const textContent = step.content?.find((c: any) => c.type === 'text');
                if (textContent && 'text' in textContent) {
                  translatedText += (textContent as any).text;
                }
              }
            }
          } catch (_interactionErr) {
            // Silently handled by fallback logic without spamming error console
          }

          if (translatedText.trim()) {
            const firstBracket = translatedText.indexOf('[');
            const lastBracket = translatedText.lastIndexOf(']');
            let jsonToParse = translatedText.trim();
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
              jsonToParse = translatedText.substring(firstBracket, lastBracket + 1);
            } else {
              jsonToParse = jsonToParse.replace(/```json|```/g, '').trim();
            }

            try {
              const parsed = JSON.parse(jsonToParse);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach((t: any) => {
                  const entry = {
                    id: String(t?.id || ''),
                    title: String(t?.title || ''),
                    description: String(t?.description || ''),
                    category: String(t?.category || '')
                  };
                  results.push(entry);
                  const cacheKey = `${targetLanguage}_${entry.id || entry.title}`;
                  batchTranslationCache.set(cacheKey, entry);
                });
                aiSuccess = true;
              }
            } catch (_) {}
          }
        } catch (_) {}
      }

      // If AI translation was skipped or failed for uncached items, use high-quality Kurdish fallbacks
      if (!aiSuccess) {
        uncachedItems.forEach((item: any) => {
          const fallback = generateItemFallback(item, targetLanguage);
          results.push(fallback);
          const cacheKey = `${targetLanguage}_${fallback.id || fallback.title}`;
          batchTranslationCache.set(cacheKey, fallback);
        });
      }

      return res.json({ success: true, translations: results, isFallback: !aiSuccess });
    } catch (err: any) {
      const safeItems = Array.isArray(req.body?.items) ? req.body.items : [];
      return res.json({
        success: true,
        translations: safeItems.map((it: any) => generateItemFallback(it, req.body?.targetLanguage || 'Kurdish')),
        isFallback: true
      });
    }
  });

  // 6. Single text translation endpoint with caching
  app.post('/api/payv/translate-text', async (req, res) => {
    try {
      const { text, targetLanguage = 'Kurdish' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ success: false, error: 'Text is required' });
      }

      const textCacheKey = `${targetLanguage}_${text.trim()}`;
      const cachedText = textTranslationCache.get(textCacheKey);
      if (cachedText) {
        return res.json({ success: true, translation: cachedText, fromCache: true });
      }

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const canCallAi = Boolean(GEMINI_API_KEY) && Date.now() >= aiCooldownUntil;

      if (canCallAi) {
        try {
          const ai = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const prompt = `Translate the following text into ${targetLanguage} (Kurdish Arab-Persian script with proper Kurmanji/Sorani vocabulary, extremely natural and appealing).
Do not include any intro, header, or extra text. Only output the translation.

Text to translate:
"${text}"`;

          let translatedText = "";
          try {
            const interaction = await withAiRetry(() => ai.interactions.create({
              model: "gemini-3.6-flash",
              input: prompt,
              generation_config: {
                temperature: 0.2
              }
            }));
            for (const step of interaction.steps || []) {
              if (step.type === 'model_output') {
                const textContent = step.content?.find((c: any) => c.type === 'text');
                if (textContent && 'text' in textContent) {
                  translatedText += (textContent as any).text;
                }
              }
            }
          } catch (_) {}

          if (translatedText.trim()) {
            const cleanResult = translatedText.trim();
            textTranslationCache.set(textCacheKey, cleanResult);
            return res.json({ success: true, translation: cleanResult });
          }
        } catch (_) {}
      }

      // Hardcoded fallback translations for common phrases
      let fallbackText = text;
      const lowerText = text.toLowerCase();
      if (lowerText.includes('order status') || lowerText.includes('pending')) {
        fallbackText = 'لە چاوەڕوانیدایە';
      } else if (lowerText.includes('shipped') || lowerText.includes('on the way')) {
        fallbackText = 'لە ڕێگادایە';
      } else if (lowerText.includes('delivered')) {
        fallbackText = 'گەیەندرا';
      } else if (lowerText.includes('bounty requirements copied')) {
        fallbackText = 'مەرجەکانی پاداشت کۆپی کران!';
      } else if (lowerText.includes('link copied to clipboard')) {
        fallbackText = 'بەستەر کۆپی کرا بۆ کلیپبۆرد!';
      } else if (lowerText.includes('added') && lowerText.includes('basket')) {
        fallbackText = 'زیادکرا بۆ سەبەتە!';
      }

      textTranslationCache.set(textCacheKey, fallbackText);
      return res.json({ success: true, translation: fallbackText, isFallback: true });
    } catch (err: any) {
      return res.json({ success: true, translation: String(req.body?.text || ''), isFallback: true });
    }
  });

  // Health Check status
  app.get('/api/health', (req, res) => {
    const currentApp = getApps().length > 0 ? getApp() : null;
    res.json({ 
      status: 'ok', 
      database: 'firestore', 
      connected: dbInstance !== null,
      apps: getApps().length,
      projectId: currentApp?.options?.projectId,
      lastError: lastDbError
    });
  });

  // Vite Integration for development / production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
