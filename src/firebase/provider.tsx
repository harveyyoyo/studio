'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, type Functions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig } from './config';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

let emulatorsConnected = false;

export function FirebaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app);

    if (process.env.NODE_ENV === 'development' && !emulatorsConnected) {
      console.log("Connecting to local emulators");
      try {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
        connectFunctionsEmulator(functions, "127.0.0.1", 5001);
        emulatorsConnected = true;
      } catch (error) {
        console.error("Error connecting to emulators:", error);
      }
    }

    return { firebaseApp: app, auth, firestore, functions };
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

export function useFunctions() {
    const context = useContext(FirebaseContext);
    if (!context?.functions) throw new Error('useFunctions must be used within a FirebaseProvider.');
    return context.functions;
}

export function useFirebase() {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
}
