import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNnLRIL_okCC_Vx_5v34NgHEXwypB2abY",
  authDomain: "med-os.firebaseapp.com",
  projectId: "med-os",
  storageBucket: "med-os.firebasestorage.app",
  messagingSenderId: "564381750798",
  appId: "1:564381750798:web:4c27d21d526474bb72ce5f",
  measurementId: "G-DW5Z6H5TX2"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
