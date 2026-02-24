
'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useFirebase } from '@/firebase';
import {
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    updateDoc,
    collection,
    writeBatch,
    getDocs,
} from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import type { Database, HistoryItem } from '@/lib/types';
import { YESHIVA_DATA } from '@/lib/yeshiva-data';
import { SCHOOL_DATA } from '@/lib/school-data';
import { useAuth } from './AuthProvider';

interface BackupContextType {
    createSchool: (schoolId: string) => Promise<{ passcode: string; cleanId: string } | null>;
    deleteSchool: (schoolId: string) => Promise<void>;
    updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
    devCreateBackup: (schoolId: string) => Promise<void>;
    devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
    devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
    devBackupAllSchools: () => Promise<void>;
    isAutoBackupEnabled: boolean;
    toggleAutoBackup: () => void;
    devMigrateSchoolData: (schoolId: string) => Promise<void>;
}

const BackupContext = createContext<BackupContextType | null>(null);

export function BackupProvider({ children }: { children: React.ReactNode }) {
    const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
    const { toast } = useToast();
    const { auth, firestore, functions } = useFirebase();
    const playSound = useArcadeSound();
    const { loginState } = useAuth();

    useEffect(() => {
        const storedPref = localStorage.getItem('autoBackupEnabled');
        if (storedPref) {
            setIsAutoBackupEnabled(JSON.parse(storedPref));
        }
    }, []);

    const createSchool = useCallback(async (schoolId: string): Promise<{ passcode: string; cleanId: string } | null> => {
        if (!firestore) return null;
        const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanId) {
            playSound('error');
            toast({ variant: 'destructive', title: "Invalid School ID" });
            return null;
        }

        const schoolDocRef = doc(firestore, 'schools', cleanId);
        const schoolExists = (await getDoc(schoolDocRef)).exists();
        if (schoolExists) {
            if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
                playSound('error');
                toast({ variant: 'destructive', title: `School ID "${cleanId}" already exists.` });
            }
            return null;
        }

        let schoolData: Omit<Database, 'passcode'>, newPasscode;
        if (cleanId === 'yeshiva') {
            newPasscode = '1234';
            schoolData = YESHIVA_DATA;
        } else if (cleanId === 'schoolabc') {
            newPasscode = '1234';
            schoolData = SCHOOL_DATA;
        } else {
            newPasscode = Math.floor(1000 + Math.random() * 9000).toString();
            schoolData = {
                name: cleanId,
                updatedAt: Date.now(),
                students: [{
                    id: '100',
                    firstName: 'Test',
                    lastName: 'Student',
                    nfcId: '100',
                    points: 0,
                    lifetimePoints: 0,
                    classId: '',
                    history: [],
                }],
            };
        }

        const { students, classes, teachers, categories, prizes, coupons, ...schoolDocData } = schoolData;
        const finalSchoolDocData = {
            ...schoolDocData,
            passcode: newPasscode,
            name: schoolData.name,
            hasMigratedStudents: true,
            hasMigratedClasses: true,
            hasMigratedTeachers: true,
            hasMigratedPrizes: true,
            hasMigratedCoupons: true,
            hasMigratedCategories: true,
        };

        // Chunk batch operations to respect the 500-operation Firestore limit
        const allOps: Array<{ ref: any; data: any }> = [];
        allOps.push({ ref: schoolDocRef, data: finalSchoolDocData });

        const collectItems = (list: any[] | undefined, collectionName: string) => {
            if (!list) return;
            for (const item of list) {
                const itemRef = doc(firestore, 'schools', cleanId, collectionName, item.id);
                if (collectionName === 'students' && item.history) {
                    const { history, ...studentData } = item;
                    const currentPoints = history.reduce((acc: number, activity: HistoryItem) => acc + activity.amount, 0);
                    const lifetimePoints = history.reduce((acc: number, activity: HistoryItem) => {
                        return activity.amount > 0 ? acc + activity.amount : acc;
                    }, 0);
                    const categoryPoints = history.reduce((acc: { [key: string]: number }, activity: HistoryItem) => {
                        if (activity.amount > 0 && activity.desc.includes('coupon:')) {
                            const match = activity.desc.match(/\(([^)]+)\)/);
                            if (match && match[1]) {
                                const category = match[1];
                                acc[category] = (acc[category] || 0) + activity.amount;
                            }
                        }
                        return acc;
                    }, {});
                    const finalStudentData = { ...studentData, points: currentPoints, lifetimePoints, categoryPoints };
                    allOps.push({ ref: itemRef, data: finalStudentData });
                    for (const historyItem of history) {
                        const historyRef = doc(collection(itemRef, 'activities'));
                        allOps.push({ ref: historyRef, data: historyItem });
                    }
                } else {
                    allOps.push({ ref: itemRef, data: item });
                }
            }
        };

        collectItems(students, 'students');
        collectItems(classes, 'classes');
        collectItems(teachers, 'teachers');
        collectItems(categories, 'categories');
        collectItems(prizes, 'prizes');
        collectItems(coupons, 'coupons');

        // Commit in chunks of 499 (leaving room for safety)
        const BATCH_LIMIT = 499;
        for (let i = 0; i < allOps.length; i += BATCH_LIMIT) {
            const chunk = allOps.slice(i, i + BATCH_LIMIT);
            const batch = writeBatch(firestore);
            for (const op of chunk) {
                batch.set(op.ref, op.data);
            }
            await batch.commit();
        }

        if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
            playSound('success');
            toast({ title: `School "${cleanId}" created!` });
        }
        return { passcode: newPasscode, cleanId };
    }, [firestore, toast, playSound]);

    const devCreateBackup = useCallback(async (schoolId: string) => {
        const createBackupTrigger = httpsCallable(functions, 'createBackupTrigger');
        try {
            await createBackupTrigger({ schoolId });
            playSound('swoosh');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Backup Failed', description: (error as any).message });
        }
    }, [toast, playSound, functions]);

    const devRestoreFromBackup = useCallback(async (schoolId: string, backupId: string) => {
        if (!firestore) return;
        const schoolDocRef = doc(firestore, 'schools', schoolId);
        const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
        try {
            const backupSnap = await getDoc(backupDocRef);
            if (backupSnap.exists()) {
                const backupData = backupSnap.data();
                await setDoc(schoolDocRef, backupData);
                playSound('success');
            } else {
                throw new Error('Backup or school not found');
            }
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Restore Failed', description: (e as Error).message });
        }
    }, [firestore, playSound, toast]);

    const devDownloadBackup = useCallback(async (schoolId: string, backupId: string) => {
        if (!firestore) return;
        const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
        try {
            const backupSnap = await getDoc(backupDocRef);
            if (backupSnap.exists()) {
                playSound('swoosh');
                const dataStr = JSON.stringify(backupSnap.data(), null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `reward-arcade-backup-${schoolId}-${backupId}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                throw new Error('Backup not found');
            }
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Download Failed', description: (e as Error).message });
        }
    }, [firestore, playSound, toast]);

    const devBackupAllSchools = useCallback(async () => {
        if (!firestore) return;
        playSound('swoosh');
        try {
            const schoolsColRef = collection(firestore, 'schools');
            const schoolsSnapshot = await getDocs(schoolsColRef);
            const backupPromises = schoolsSnapshot.docs.map(schoolDoc => devCreateBackup(schoolDoc.id));
            await Promise.all(backupPromises);
        } catch (e) {
            console.error('Backup of all schools failed', e);
        }
    }, [firestore, devCreateBackup, playSound]);

    const deleteSchool = useCallback(async (schoolId: string) => {
        if (!firestore || !auth.currentUser) return;
        try {
            await devCreateBackup(schoolId);
            toast({ title: "Final Backup Created", description: `A final backup for ${schoolId} has been saved.` });
            const adminRoleRef = doc(firestore, 'schools', schoolId, 'roles_admin', auth.currentUser.uid);
            await setDoc(adminRoleRef, { role: 'admin' });
            await deleteDoc(doc(firestore, 'schools', schoolId));
            playSound('success');
            toast({ title: `School "${schoolId}" deleted!` });
        } catch (e) {
            toast({ variant: 'destructive', title: `School "${schoolId}" deletion failed!`, description: (e as Error).message });
        }
    }, [firestore, auth, toast, playSound, devCreateBackup]);

    const updateSchool = useCallback(async (schoolId: string, updates: { name?: string; passcode?: string }) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'schools', schoolId), updates);
            playSound('success');
        } catch (e) {
            toast({ variant: 'destructive', title: "School update failed", description: (e as Error).message });
        }
    }, [firestore, playSound, toast]);

    const toggleAutoBackup = useCallback(() => {
        setIsAutoBackupEnabled(prev => {
            const newState = !prev;
            localStorage.setItem('autoBackupEnabled', JSON.stringify(newState));
            toast({ title: newState ? 'Automatic Backups Enabled' : 'Automatic Backups Disabled' });
            return newState;
        });
    }, [toast]);

    const devMigrateSchoolData = useCallback(async (schoolId: string) => {
        if (!functions) return;
        const migrationFunctions = [
            'migrateStudentsToSubcollection',
            'migrateClassesToSubcollection',
            'migrateTeachersToSubcollection',
            'migratePrizesToSubcollection',
            'migrateCouponsToSubcollection',
            'migrateCategoriesToSubcollection'
        ];
        toast({ title: `Starting data migration for ${schoolId}...`, description: "This may take a moment." });
        try {
            for (const funcName of migrationFunctions) {
                const callable = httpsCallable(functions, funcName);
                const result = await callable({ schoolId });
                console.log(`${funcName} result:`, result.data);
            }
            toast({ title: "Migration Complete!", description: `Data for ${schoolId} has been migrated to the new structure.` });
            playSound('success');
        } catch (error) {
            console.error("Data migration failed:", error);
            toast({ variant: 'destructive', title: 'Migration Failed', description: (error as any).message });
            playSound('error');
        }
    }, [functions, toast, playSound]);

    // Auto-backup scheduler
    useEffect(() => {
        if (loginState !== 'developer' || !isAutoBackupEnabled) return;
        const checkAndBackup = async () => {
            const lastAutoBackupTime = localStorage.getItem('lastGlobalAutoBackupTime');
            const oneDay = 24 * 60 * 60 * 1000;
            if (!lastAutoBackupTime || Date.now() - parseInt(lastAutoBackupTime) > oneDay) {
                console.log('Performing daily automatic backup of all schools...');
                await devBackupAllSchools();
                localStorage.setItem('lastGlobalAutoBackupTime', Date.now().toString());
                toast({ title: "Automatic Daily Backup Complete", description: "All school databases have been backed up." });
            }
        };
        checkAndBackup();
        const intervalId = setInterval(checkAndBackup, 60 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [isAutoBackupEnabled, loginState, devBackupAllSchools, toast]);

    const value = useMemo(
        () => ({
            createSchool, deleteSchool, updateSchool,
            devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
            isAutoBackupEnabled, toggleAutoBackup, devMigrateSchoolData,
        }),
        [
            createSchool, deleteSchool, updateSchool,
            devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
            isAutoBackupEnabled, toggleAutoBackup, devMigrateSchoolData,
        ]
    );

    return (
        <BackupContext.Provider value={value}>
            {children}
        </BackupContext.Provider>
    );
}

export const useBackup = () => {
    const context = useContext(BackupContext);
    if (!context) {
        throw new Error('useBackup must be used within a BackupProvider');
    }
    return context;
};
