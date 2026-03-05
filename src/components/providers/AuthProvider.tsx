
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import {
    doc,
    setDoc,
    onSnapshot,
    getDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

async function provisionAdminViaClient(firestore: import('firebase/firestore').Firestore, auth: import('firebase/auth').Auth, schoolId: string): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    const adminRoleRef = doc(firestore, 'schools', schoolId, 'roles_admin', user.uid);

    // Attempt to provision the role first.
    try {
        await setDoc(adminRoleRef, { role: 'admin' }, { merge: true });
    } catch (e) {
        // This may fail if rules are already strict, but we'll try to verify anyway,
        // as the role may already exist from a previous session.
        console.warn("AuthProvider: Role provision write failed, will proceed to verify.", e);
    }
    
    // Now, poll with backoff until the role document is readable.
    // This confirms the write has propagated and rules will pass for subsequent operations.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // The getDoc is subject to security rules. We need it to pass.
            const roleSnap = await getDoc(adminRoleRef);
            if (roleSnap.exists()) {
                return true; // Success!
            }
            // If it doesn't exist yet, wait and retry.
            const delay = RETRY_DELAY_MS * (attempt + 1);
            await new Promise((r) => setTimeout(r, delay));
        } catch (e) {
            console.error(`AuthProvider: verification attempt ${attempt + 1} failed`, e);
            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }
    
    console.error("AuthProvider: Could not verify admin role after multiple attempts.");
    return false;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer';

interface AuthContextType {
    isInitialized: boolean;
    isUserLoading: boolean;
    loginState: LoginState;
    isAdmin: boolean;
    schoolId: string | null;
    syncStatus: SyncStatus;
    login: (
        type: LoginState,
        credentials: { schoolId?: string; passcode?: string }
    ) => Promise<boolean>;
    logout: () => void;
    isKioskLocked: boolean;
    setIsKioskLocked: (locked: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loginState, setLoginState] = useState<LoginState>('loggedOut');
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
    const [isKioskLocked, setIsKioskLocked] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);

    const { auth, firestore, functions, isUserLoading } = useFirebase();
    const router = useRouter();
    
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || isUserLoading) {
            // Wait until the component is mounted on the client AND Firebase auth is ready.
            return;
        }

        const restore = async () => {
            const savedState = localStorage.getItem('loginState') as LoginState | null;
            const savedSchoolId = localStorage.getItem('schoolId');

            if (savedState === 'school' && savedSchoolId) {
                if (auth && firestore && auth.currentUser) {
                    const provisioned = await provisionAdminViaClient(firestore, auth, savedSchoolId);
                    if (provisioned) {
                        setLoginState('school');
                        setSchoolId(savedSchoolId);
                        setIsAdmin(true);
                    } else {
                         console.error('[AuthProvider] Failed to provision admin role during restore.');
                         localStorage.removeItem('loginState');
                         localStorage.removeItem('schoolId');
                    }
                }
            } else if (savedState) {
                setLoginState(savedState);
                if (savedState === 'developer') setIsAdmin(true);
            }
            
            setIsInitialized(true);
        };

        restore();
    }, [isMounted, isUserLoading, auth, firestore]);

    const provisionedUidRef = useRef<string | null>(null);
    useEffect(() => {
        if (!auth || !firestore) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user || !schoolId || loginState !== 'school') return;
            if (user.uid === provisionedUidRef.current) return;
            provisionedUidRef.current = user.uid;
            provisionAdminViaClient(firestore, auth, schoolId).catch((e) =>
                console.error('[AuthProvider] Re-provision on auth change failed:', e)
            );
        });
        return unsubscribe;
    }, [auth, firestore, schoolId, loginState]);

    useEffect(() => {
        const handleOnline = () => setSyncStatus('syncing');
        const handleOffline = () => setSyncStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!navigator.onLine) {
            setSyncStatus('offline');
        }

        if (!schoolId || !firestore) {
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        if (navigator.onLine) {
            setSyncStatus('syncing');
        }

        const schoolDocRef = doc(firestore, 'schools', schoolId);
        const unsub = onSnapshot(schoolDocRef, { includeMetadataChanges: true }, (snap) => {
            if (!navigator.onLine) {
                setSyncStatus('offline');
            } else {
                setSyncStatus(snap.metadata.hasPendingWrites ? 'syncing' : 'synced');
            }
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setSyncStatus('error');
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsub();
        };
    }, [schoolId, firestore]);

    const login = useCallback(
        async (
            type: LoginState,
            credentials: { schoolId?: string; passcode?: string }
        ): Promise<boolean> => {
            if (type === 'developer') {
                try {
                    const res = await fetch('/api/auth/dev-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ passcode: credentials.passcode }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setLoginState('developer');
                        setIsAdmin(true);
                        localStorage.setItem('loginState', 'developer');
                        return true;
                    }
                } catch (e) {
                    console.error("Developer login error", e);
                }
            } else if (type === 'school' && credentials.schoolId) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                try {
                    const verify = httpsCallable(functions, 'verifySchoolPasscode');
                    await verify({ schoolId: lowerSchoolId, passcode: credentials.passcode });

                    if (auth && firestore) {
                        const provisioned = await provisionAdminViaClient(firestore, auth, lowerSchoolId);
                        if (!provisioned) {
                            throw new Error("Failed to provision admin role.");
                        }
                    }

                    setSchoolId(lowerSchoolId);
                    setLoginState('school');
                    setIsAdmin(true);
                    localStorage.setItem('loginState', 'school');
                    localStorage.setItem('schoolId', lowerSchoolId);
                    return true;
                } catch (e) {
                    console.error("School login error", e);
                    return false;
                }
            }
            return false;
        },
        [firestore, functions, auth]
    );

    const logout = useCallback(() => {
        localStorage.removeItem('loginState');
        localStorage.removeItem('schoolId');
        setLoginState('loggedOut');
        setSchoolId(null);
        setIsAdmin(false);
        setIsKioskLocked(false);
        router.push('/');
    }, [router]);

    const value = useMemo(
        () => ({
            isInitialized, isUserLoading, loginState, isAdmin, schoolId, syncStatus,
            isKioskLocked, setIsKioskLocked,
            login, logout,
        }),
        [isInitialized, isUserLoading, loginState, isAdmin, schoolId, syncStatus, isKioskLocked, setIsKioskLocked, login, logout]
    );

    if (!isMounted) {
        return null;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
