import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';

const savedConfigStr = localStorage.getItem('firebaseConfig');
let firebaseConfig = null;

if (savedConfigStr) {
  try {
    firebaseConfig = JSON.parse(savedConfigStr);
  } catch (e) {
    console.error('Failed to parse saved config');
  }
}

if (!firebaseConfig && import.meta.env.VITE_FIREBASE_API_KEY) {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
}

export const isFirebaseConfigured = !!firebaseConfig;

const app = isFirebaseConfigured ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]) : null;
export const db = app ? getFirestore(app) : null as any;

export const transactionsRef = db ? collection(db, 'transactions') : null as any;
export const consumptionRef = db ? collection(db, 'consumption') : null as any;
