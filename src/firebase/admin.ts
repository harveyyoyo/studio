import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  // Use Application Default Credentials, which works automatically in Firebase/GCP environments.
  admin.initializeApp();
}

export const adminDb = admin.firestore();
