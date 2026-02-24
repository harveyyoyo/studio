import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import * as admin from 'firebase-admin';

/**
 * Provisions an admin role for the calling user on a given school.
 * Uses the Firebase Admin SDK so the write bypasses Firestore Security Rules,
 * avoiding the race condition / auth-provider mismatch that occurs when the
 * client SDK's auth token has sign_in_provider:"custom" (Firebase App Hosting).
 *
 * The caller must supply a valid Firebase ID token in the Authorization header.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { schoolId } = await req.json();
    if (!schoolId || typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    const ref = adminDb.collection('schools').doc(schoolId).collection('roles_admin').doc(uid);
    await ref.set({ role: 'admin' }, { merge: true });

    return NextResponse.json({ success: true, uid });
  } catch (e: any) {
    console.error('[provision] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
