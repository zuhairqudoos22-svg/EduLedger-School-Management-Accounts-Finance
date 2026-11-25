/**
 * EduLedger Multi-Device Cloud Sync Configuration (Firebase Spark Free Tier)
 * Project: eduledger-604f4
 * 
 * Initialized once as an ES module exporting: app, auth, db, firebaseConfig
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBKqpobVcmjxyPyrW9XUhYZD3N4JtKMZ20",
  authDomain: "eduledger-604f4.firebaseapp.com",
  projectId: "eduledger-604f4",
  storageBucket: "eduledger-604f4.firebasestorage.app",
  messagingSenderId: "811593452241",
  appId: "1:811593452241:web:fea58097f10967ac0493f0"
};

// Initialize Firebase App instance once
const existingApps = getApps();
export const app = existingApps.length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with session-only persistence (logout on browser close)
export const auth = getAuth(app);
if (typeof window !== "undefined") {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.warn("Could not set Auth browserSessionPersistence:", err);
  });
}

// Initialize Firestore with multi-tab persistent local cache
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

export default { app, auth, db, firebaseConfig };
