import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent, setUserId, setUserProperties } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let analytics = null;

function getFirebaseAnalytics() {
  if (!analytics) {
    try {
      const app = initializeApp(firebaseConfig);
      analytics = getAnalytics(app);
    } catch { /* Firebase not configured */ }
  }
  return analytics;
}

function log(name, params = {}) {
  try {
    const a = getFirebaseAnalytics();
    if (a) logEvent(a, name, params);
  } catch { /* Firebase offline or not configured */ }
}

function setCustomKey(key, value) {
  try {
    const a = getFirebaseAnalytics();
    if (a) setUserProperties(a, { [key]: String(value) });
  } catch { /* Firebase offline or not configured */ }
}

function setUserIdentifier(id) {
  try {
    const a = getFirebaseAnalytics();
    if (a) setUserId(a, id || "");
  } catch { /* Firebase offline or not configured */ }
}

export { log, setCustomKey, setUserIdentifier };
