import { getApps, initializeApp, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import {
  FIREBASE_SERVICE_ACCOUNT_JSON,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} from './config';

let app: App | undefined;

/**
 * Lazily initialize the Firebase Admin app.
 *
 * Deferring initialization avoids requiring live credentials at build time
 * and allows the same module to be safely imported in tests with mocked env vars.
 */
function getFirebaseAdminApp(): App {
  if (app) return app;

  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  let credentials: ServiceAccount | undefined;

  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON is set but contains invalid JSON.',
      );
    }
  } else if (
    FIREBASE_PROJECT_ID &&
    FIREBASE_CLIENT_EMAIL &&
    FIREBASE_PRIVATE_KEY
  ) {
    credentials = {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else {
    throw new Error(
      'Firebase credentials are missing. Provide FIREBASE_SERVICE_ACCOUNT_JSON or the individual FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.',
    );
  }

  app = initializeApp({
    credential: cert(credentials),
  });

  return app;
}

let dbInstance: Firestore | undefined;

/**
 * Lazily initialize and return the Firestore database instance.
 */
export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseAdminApp());
  }
  return dbInstance;
}

/**
 * Lazily initialize and return the Firebase Admin Auth instance.
 *
 * This guarantees the Admin app is initialized before getAuth() is called,
 * which avoids the "default Firebase app does not exist" error in serverless
 * environments where the module load order is unpredictable.
 */
export function getAuthInstance() {
  return getAuth(getFirebaseAdminApp());
}

export { FieldValue } from 'firebase-admin/firestore';
