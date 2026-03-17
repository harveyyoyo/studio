
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

export function initializeFirebase() {
    const apps = getApps();
    if (apps.length) {
      return getSdks(apps[0]);
    }

    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
    let firestore;
    try {
        const isBrowser = typeof window !== 'undefined';
        firestore = initializeFirestore(firebaseApp, {
            ...(isBrowser ? { localCache: persistentLocalCache() } : {}),
        });
    } catch (e: any) {
        firestore = getFirestore(firebaseApp);
    }

    const storageBucket = (firebaseConfig as any).storageBucket || `${firebaseConfig.projectId}.appspot.com`;

    return {
        firebaseApp,
        auth: getAuth(firebaseApp),
        firestore,
        functions: getFunctions(firebaseApp),
        storage: getStorage(firebaseApp, storageBucket),
    };
}
