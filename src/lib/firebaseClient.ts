import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

/**
 * Public Firebase client configuration.
 *
 * These values are safe to expose in the browser. They identify the Firebase
 * project but do not grant admin access.
 */
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

/**
 * Lazily initialize the Firebase client app.
 *
 * This avoids crashing during Next.js static generation when the public
 * environment variables are not yet available.
 */
export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  app = initializeApp(getFirebaseConfig());
  return app;
}

export function getAuthInstance() {
  return getAuth(getFirebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
