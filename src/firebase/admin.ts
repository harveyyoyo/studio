import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  // Use Application Default Credentials, but explicitly set the project ID
  // to match the frontend config and resolve token audience errors.
  admin.initializeApp({
    projectId: "studio-1273073612-71183",
  });
}

export const adminDb = admin.firestore();
