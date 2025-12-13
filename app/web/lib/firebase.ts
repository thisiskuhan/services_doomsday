/**
 * Firebase Configuration Module
 *
 * Initializes Firebase services with singleton pattern.
 * Handles server-side rendering by conditionally loading analytics.
 *
 * Environment Variables (NEXT_PUBLIC_*):
 *   - FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID
 *   - FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID
 *   - FIREBASE_APP_ID, FIREBASE_MEASUREMENT_ID
 *
 * Exports:
 *   - auth: Firebase Authentication instance
 *   - db: Firestore database instance
 *   - analytics: Firebase Analytics (client-side only)
 *   - default: Firebase app instance
 */
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export default app;
