import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { Invoice, Holding, Credit } from './schema';

dotenv.config();

// Initialize Firebase Admin SDK
// You must have FIREBASE_SERVICE_ACCOUNT_PATH or equivalent set in .env
if (!admin.apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Fallback to default application credentials if running in GCP/Firebase environment
    admin.initializeApp();
  }
}

export const db = admin.firestore();

// Collections
export const collections = {
  invoices: db.collection('invoices') as admin.firestore.CollectionReference<Invoice>,
  holdings: db.collection('holdings') as admin.firestore.CollectionReference<Holding>,
  credits: db.collection('credits') as admin.firestore.CollectionReference<Credit>,
};
