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
import { useFirebase } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';

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

    const { isUserLoading, functions, firestore, auth } = useFirebase();
    const router = useRouter();
    
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || isUserLoading) {
            return;
        }

        const restore = async () => {
            const savedState = localStorage.getItem('loginState') as LoginState | null;
            const savedSchoolId = localStorage.getItem('schoolId');

            if (savedState === 'school' && savedSchoolId) {
                setLoginState('school');
                setSchoolId(savedSchoolId);
                setIsAdmin(true); 
            } else if (savedState) {
                setLoginState(savedState);
                if (savedState === 'developer') setIsAdmin(true);
            }
            
            setIsInitialized(true);
        };

        restore();
    }, [isMounted, isUserLoading]);

    useEffect(() => {
        // This effect is not necessary anymore as the Cloud Function will handle role provisioning on login.
    }, []);

    useEffect(() => {
        if (!firestore || !schoolId) {
            if (loginState === 'school') {
                setSyncStatus('offline');
            } else {
                setSyncStatus('synced'); // Not in a school context, so consider it synced.
            }
            return;
        }
    
        const metadataRef = doc(firestore, 'schools', schoolId);
        const unsubscribe = onSnapshot(
            metadataRef,
            { includeMetadataChanges: true },
            (snapshot) => {
                const isFromCache = snapshot.metadata.fromCache;
                if (isFromCache) {
                    setSyncStatus('syncing');
                } else {
                    setSyncStatus('synced');
                }
            },
            (err) => {
                console.error("Sync status listener failed:", err);
                setSyncStatus('error');
            }
        );
    
        return () => unsubscribe();
    }, [firestore, schoolId, loginState]);

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
            } else if (type === 'school' && credentials.schoolId && auth.currentUser) {
                const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
                try {
                    // 1. Call the function to set the role on the backend
                    const verify = httpsCallable(functions, 'verifySchoolPasscode');
                    await verify({ schoolId: lowerSchoolId, passcode: credentials.passcode });

                    // 2. Poll the server to confirm the admin role is readable
                    const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
                    let roleConfirmed = false;
                    for (let i = 0; i < 15; i++) { // Poll for up to 7.5 seconds
                        try {
                            // Force a server read to bypass cache and check for rule consistency
                            const adminDoc = await getDocFromServer(adminRoleRef);
                            if (adminDoc.exists() && adminDoc.data().role === 'admin') {
                                roleConfirmed = true;
                                break;
                            }
                        } catch (e) {
                            // Ignore permission errors during polling, as they are expected while rules propagate
                        }
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retrying
                    }
                    
                    if (!roleConfirmed) {
                       throw new Error("Could not confirm admin role after login. Your permissions might be out of sync. Please try again.");
                    }

                    // 3. Only now set the client state
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
        [functions, firestore, auth]
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
