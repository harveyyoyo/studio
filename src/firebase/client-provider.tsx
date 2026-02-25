
'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Initialize Firebase. useMemo is removed to allow server-side pre-rendering.
  // initializeFirebase is idempotent, so it's safe to call.
  const firebaseServices = initializeFirebase();

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
