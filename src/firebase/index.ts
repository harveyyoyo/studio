import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return {
    firebaseApp: app,
    firestore: getFirestore(app),
    auth: getAuth(app),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
export * from './auth/use-user';
