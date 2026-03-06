
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const apps = getApps();
  if (!apps.length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e: any) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development. We ignore the 'app/no-options' error which is expected when running locally/building.
      if (process.env.NODE_ENV === "production" && e?.code !== 'app/no-options') {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      try {
        firebaseApp = initializeApp(firebaseConfig);
        console.log("Firebase initialized with fallback config.");
      } catch (err) {
        console.error("Critical Firebase Initialization Error:", err);
        return null as any;
      }
    }

    if (!firebaseApp) return null as any;

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(apps[0]);
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore;
  try {
    const isBrowser = typeof window !== 'undefined';
    // Attempt initializeFirestore first only if it hasn't been done
    firestore = initializeFirestore(firebaseApp, {
      ...(isBrowser ? { localCache: persistentLocalCache() } : {}),
    });
  } catch (e: any) {
    // If already initialized OR other error, use getFirestore which returns the existing instance
    firestore = getFirestore(firebaseApp);
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore,
    functions: getFunctions(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
