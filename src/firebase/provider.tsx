'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    return { firebaseApp: app, auth, firestore };
  }, []);

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebaseApp() {
  const context = useContext(FirebaseContext);
  if (!context?.firebaseApp) throw new Error('useFirebaseApp must be used within a FirebaseProvider.');
  return context.firebaseApp;
}

export function useAuth() {
  const context = useContext(FirebaseContext);
  if (!context?.auth) throw new Error('useAuth must be used within a FirebaseProvider.');
  return context.auth;
}

export function useFirestore() {
  const context = useContext(FirebaseContext);
  if (!context?.firestore) throw new Error('useFirestore must be used within a FirebaseProvider.');
  return context.firestore;
}

export function useFirebase() {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
}
