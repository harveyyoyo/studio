
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures this only runs once on the client, preventing re-initializations
  // that can cause hydration errors.
  const firebaseServices = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices?.firebaseApp as import('firebase/app').FirebaseApp}
      auth={firebaseServices?.auth as import('firebase/auth').Auth}
      firestore={firebaseServices?.firestore as import('firebase/firestore').Firestore}
      functions={firebaseServices?.functions as import('firebase/functions').Functions}
    >
      {children}
    </FirebaseProvider>
  );
}
