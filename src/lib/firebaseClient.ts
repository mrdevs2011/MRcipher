import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  // Faqat brauzerda ishga tushirish. Next.js static prerender vaqtida
  // server tomonda initialize bo'lib, noto'g'ri API key bilan build xatosi
  // berishini oldini olamiz.
  if (typeof window === 'undefined') {
    if (!app) {
      app = initializeApp({
        apiKey: 'server-dummy-key',
        projectId: 'server-dummy',
      });
    }
    return app;
  }

  if (getApps().length > 0) return getApp();

  const config = getFirebaseConfig();
  if (!config.apiKey) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_API_KEY mavjud emas. Firebase web konfiguratsiyasini .env.local yoki Vercel environment variables ga qo\'shing.',
    );
  }

  app = initializeApp(config);
  return app;
}

export function getAuthInstance() {
  return getAuth(getFirebaseApp());
}

/**
 * Firestore client instance, used only for read-only real-time listeners
 * (e.g. live-updating the API key list when the CLI creates/revokes a key).
 * All writes still go through the server-side Admin SDK via the REST API.
 */
export function getFirestoreInstance() {
  return getFirestore(getFirebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
// Har doim akkaunt tanlash oynasini ko'rsatish — brauzerda bitta Google
// sessiyasi bor deb, jimgina o'sha hisobga kirib ketmasligi uchun.
googleProvider.setCustomParameters({ prompt: 'select_account' });
