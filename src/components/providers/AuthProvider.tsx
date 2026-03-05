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

    const { isUserLoading, functions } = useFirebase();
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
        // This effect is responsible for showing the sync status and can be simplified or removed
        // if not a core feature. For now, it's harmless.
    }, [schoolId]);

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
        [functions]
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
