'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Ensures the current Firebase Auth user has an admin role document
 * for the active school before rendering children. Uses a server-side
 * API route (Admin SDK) so the write bypasses Firestore Security Rules.
 */
export function SchoolGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { schoolId, isAdmin } = useAppContext();
  const { auth } = useFirebase();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setReady(true);
      return;
    }
    const user = auth.currentUser;
    if (!schoolId || !user) return;

    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch('/api/auth/provision', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ schoolId }),
          });
          if (!res.ok) throw new Error(`Provision failed: ${res.status}`);

          // Add a small delay for Firestore replication/propagation
          await new Promise((r) => setTimeout(r, 1000));

          if (!cancelled) setReady(true);
          return;
        } catch (e) {
          console.error(`SchoolGate: provision attempt ${attempt + 1} failed`, e);
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }
      if (!cancelled) setError(true);
    })();

    return () => { cancelled = true; };
  }, [schoolId, auth]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Failed to verify school access. Please refresh the page or log in again.</p>
      </div>
    );
  }

  if (!ready) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
