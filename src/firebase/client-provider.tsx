'use client';
import React from 'react';
import { FirebaseProvider } from './provider';
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
