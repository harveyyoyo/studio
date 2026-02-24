
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
} from 'firebase/firestore';
import { useArcadeSound } from '@/hooks/useArcadeSound';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer';

interface AuthContextType {
    isInitialized: boolean;
    isUserLoading: boolean;
    loginState: LoginState;
    schoolId: string | null;
    syncStatus: SyncStatus;
    login: (
        type: 'school' | 'developer',
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

    const { auth, firestore, isUserLoading } = useFirebase();
    const playSound = useArcadeSound();
    const router = useRouter();

    // Restore session
    useEffect(() => {
        const savedState = sessionStorage.getItem('loginState');
        const savedSchoolId = sessionStorage.getItem('schoolId');
        if (savedState) {
            const state = savedState as LoginState;
            setLoginState(state);
            if (state === 'school' && savedSchoolId) {
                setSchoolId(savedSchoolId);
            }
        }
        setIsInitialized(true);
    }, []);

    // Data sync & network status listener
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
        async (type: 'school' | 'developer', credentials: { schoolId?: string; passcode?: string }): Promise<boolean> => {
            if (type === 'developer') {
                // Validate via server-side API route so passcode never reaches client bundle
                try {
                    const res = await fetch('/api/auth/dev-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ passcode: credentials.passcode }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        setLoginState('developer');
                        sessionStorage.setItem('loginState', 'developer');
                        return true;
                    }
                } catch (e) {
                    console.error("Developer login error", e);
                }
            } else if (type === 'school' && credentials.schoolId && firestore && auth.currentUser) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                const schoolLoginDocRef = doc(firestore, 'schools', lowerSchoolId);
                try {
                    const docSnap = await getDoc(schoolLoginDocRef);
                    if (docSnap.exists() && docSnap.data().passcode === credentials.passcode) {
                        setSchoolId(lowerSchoolId);
                        setLoginState('school');
                        sessionStorage.setItem('loginState', 'school');
                        sessionStorage.setItem('schoolId', lowerSchoolId);
                        const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
                        setDoc(adminRoleRef, { role: 'admin' }).catch(e => console.warn("Could not set admin role, maybe already set or rules are not ready?", e));
                        return true;
                    }
                } catch (e) {
                    console.error("School login error", e);
                    return false;
                }
            }
            return false;
        },
        [firestore, auth]
    );

    const logout = useCallback(() => {
        playSound('swoosh');
        sessionStorage.clear();
        setLoginState('loggedOut');
        setSchoolId(null);
        router.push('/');
    }, [router, playSound]);

    const value = useMemo(
        () => ({
            isInitialized, isUserLoading, loginState, schoolId, syncStatus,
            login, logout,
        }),
        [isInitialized, isUserLoading, loginState, schoolId, syncStatus, login, logout]
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
