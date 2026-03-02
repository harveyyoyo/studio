
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
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useArcadeSound } from '@/hooks/useArcadeSound';

async function provisionAdminViaClient(firestore: import('firebase/firestore').Firestore, auth: import('firebase/auth').Auth, schoolId: string): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const adminRoleRef = doc(firestore, 'schools', schoolId, 'roles_admin', user.uid);
        await setDoc(adminRoleRef, { role: 'admin' }, { merge: true });
        return true;
    } catch (e) {
        console.error("Client-side admin provisioning failed:", e);
        return false;
    }
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [loginState, setLoginState] = useState<LoginState>('loggedOut');
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

    const [isAdmin, setIsAdmin] = useState(false);

    const { auth, firestore, functions, isUserLoading } = useFirebase();
    const playSound = useArcadeSound();
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        const restore = async () => {
            const savedState = localStorage.getItem('loginState') as LoginState | null;
            const savedSchoolId = localStorage.getItem('schoolId');

            if (savedState === 'school' && savedSchoolId) {
                let provisioned = false;
                if (auth && firestore) {
                    try {
                        provisioned = await provisionAdminViaClient(firestore, auth, savedSchoolId);
                        if (provisioned) await new Promise((r) => setTimeout(r, 1000));
                    } catch (e) {
                        console.error('[AuthProvider] Failed to provision admin role during restore:', e);
                    }
                }

                if (cancelled) return;

                if (provisioned) {
                    setLoginState('school');
                    setSchoolId(savedSchoolId);
                    setIsAdmin(true);
                } else {
                    localStorage.removeItem('loginState');
                    localStorage.removeItem('schoolId');
                }
            } else if (savedState) {
                if (cancelled) return;
                setLoginState(savedState);
                if (savedState === 'developer') setIsAdmin(true);
            }

            if (!cancelled) {
                setIsInitialized(true);
            }
        };

        restore();
        return () => { cancelled = true; };
    }, [firestore, auth]);

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
                        await provisionAdminViaClient(firestore, auth, lowerSchoolId);
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
        playSound('swoosh');
        localStorage.removeItem('loginState');
        localStorage.removeItem('schoolId');
        setLoginState('loggedOut');
        setSchoolId(null);
        setIsAdmin(false);
        router.push('/');
    }, [router, playSound]);

    const value = useMemo(
        () => ({
            isInitialized, isUserLoading, loginState, isAdmin, schoolId, syncStatus,
            login, logout,
        }),
        [isInitialized, isUserLoading, loginState, isAdmin, schoolId, syncStatus, login, logout]
    );

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
