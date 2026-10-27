import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence benign connection retry/failover warnings and offline notices
try {
  setLogLevel('silent');
} catch (_) {
  // Ignore if already configured
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the custom firestore database ID from the applet configuration
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

let firestore: ReturnType<typeof getFirestore>;
try {
  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, dbId);
} catch (e) {
  firestore = getFirestore(app, dbId);
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, firestore, auth, googleProvider };


