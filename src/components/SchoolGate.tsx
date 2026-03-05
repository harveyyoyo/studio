'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Ensures the current Firebase Auth user has an admin role document
 * for the active school before rendering children. It writes the role
 * and then verifies it has propagated before allowing access.
 */
export function SchoolGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { schoolId } = useAppContext();
  const { auth, firestore } = useFirebase();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!schoolId || !user || !firestore) return;

    let cancelled = false;

    (async () => {
      const adminRoleRef = doc(firestore, 'schools', schoolId, 'roles_admin', user.uid);

      // Attempt to provision the role first.
      // This is idempotent due to `merge: true`.
      try {
        await setDoc(adminRoleRef, { role: 'admin' }, { merge: true });
      } catch (e) {
        // This may fail if rules are already strict, but we'll try to verify anyway,
        // as the role may already exist from a previous session.
        console.warn("SchoolGate: Role provision attempt failed, will proceed to verify.", e);
      }
      
      // Now, poll with backoff until the role document is readable.
      // This confirms the write has propagated and rules will pass for subsequent operations.
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          // The getDoc is subject to security rules. We need it to pass.
          const roleSnap = await getDoc(adminRoleRef);
          if (roleSnap.exists()) {
             if (!cancelled) setReady(true);
             return; // Success! Gate is open.
          }
          // If it doesn't exist yet, wait and retry.
          const delay = RETRY_DELAY_MS * (attempt + 1);
          await new Promise((r) => setTimeout(r, delay));
        } catch (e) {
          console.error(`SchoolGate: verification attempt ${attempt + 1} failed`, e);
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      // If we've exhausted retries, set an error state.
      if (!cancelled) {
        setError(true);
        console.error("SchoolGate: Could not verify admin role after multiple attempts.");
      }
    })();

    return () => { cancelled = true; };
  }, [schoolId, auth, firestore]);

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
