
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from './init';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures this only runs once on the client, preventing re-initializations
  // that can cause hydration errors.
  const firebaseServices = useMemo(() => {
    try {
      console.log("FirebaseClientProvider: Initializing Firebase...");
      const sdks = initializeFirebase();
      if (!sdks) {
        console.error("FirebaseClientProvider: initializeFirebase returned null");
      }
      return sdks;
    } catch (e) {
      console.error("FirebaseClientProvider: initializeFirebase threw an error", e);
      return null;
    }
  }, []);

  if (!firebaseServices || !firebaseServices.firebaseApp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="animate-pulse mb-4 text-primary font-bold">Initializing Firebase Services...</div>
        <p className="text-sm text-muted-foreground max-w-xs">
          If this screen persists, there might be a configuration or connectivity issue.
          Check your environment variables and internet connection.
        </p>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      functions={firebaseServices.functions}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
