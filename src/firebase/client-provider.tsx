'use client';
import React from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

// Initialize Firebase once when the module is loaded.
const { firebaseApp, auth, firestore } = initializeFirebase();

// This provider is responsible for ensuring that Firebase is only initialized once
// on the client, and it wraps the main FirebaseProvider.
export function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
