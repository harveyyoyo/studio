
'use client';

import React, {
    createContext,
    useContext,
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
} from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import type { HistoryItem } from '@/lib/types';
import { YESHIVA_DATA } from '@/lib/yeshiva-data';
import { SCHOOL_DATA } from '@/lib/school-data';

interface BackupContextType {
    createSchool: (schoolId: string) => Promise<{ passcode: string; cleanId: string } | null>;
    deleteSchool: (schoolId: string) => Promise<void>;
    updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
    devCreateBackup: (schoolId: string) => Promise<void>;
    devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
    devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
    devBackupAllSchools: () => Promise<void>;
    devVerifyBackup: (schoolId: string, backupId: string) => Promise<{ verified: boolean; reason: string }>;
    devMigrateSchoolData: (schoolId: string) => Promise<void>;
}

const BackupContext = createContext<BackupContextType | null>(null);

export function BackupProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const { auth, firestore, functions } = useFirebase();
    const playSound = useArcadeSound();

    const createSchool = useCallback(async (schoolId: string): Promise<{ passcode: string; cleanId: string } | null> => {
        if (!firestore || !auth.currentUser) return null;
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

        let schoolData: Record<string, any>, newPasscode;
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

        const allOps: Array<{ ref: any; data: any }> = [];
        allOps.push({ ref: schoolDocRef, data: finalSchoolDocData });
        const adminRoleRef = doc(firestore, 'schools', cleanId, 'roles_admin', auth.currentUser.uid);
        allOps.push({ ref: adminRoleRef, data: { role: 'admin' } });

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

        const firstBatch = writeBatch(firestore);
        firstBatch.set(schoolDocRef, finalSchoolDocData);
        firstBatch.set(adminRoleRef, { role: 'admin' });
        await firstBatch.commit();

        const BATCH_LIMIT = 499;
        const restOps = allOps.slice(2);
        for (let i = 0; i < restOps.length; i += BATCH_LIMIT) {
            const chunk = restOps.slice(i, i + BATCH_LIMIT);
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
    }, [firestore, auth, toast, playSound]);

    const devCreateBackup = useCallback(async (schoolId: string) => {
        const createBackupFn = httpsCallable(functions, 'createBackupTrigger');
        try {
            await createBackupFn({ schoolId });
            playSound('swoosh');
            toast({ title: 'Full Backup Created', description: 'All school data backed up to secure storage.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Backup Failed', description: (error as any).message });
        }
    }, [toast, playSound, functions]);

    const devRestoreFromBackup = useCallback(async (schoolId: string, backupId: string) => {
        const restoreFn = httpsCallable(functions, 'restoreFromFullBackup');
        try {
            await restoreFn({ schoolId, backupId });
            playSound('success');
            toast({ title: 'Full Restore Complete', description: 'All school data has been restored, including students, classes, activities, and more.' });
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Restore Failed', description: (e as Error).message });
        }
    }, [functions, playSound, toast]);

    const devDownloadBackup = useCallback(async (schoolId: string, backupId: string) => {
        const downloadFn = httpsCallable(functions, 'downloadFullBackup');
        try {
            const result = await downloadFn({ schoolId, backupId });
            const response = result.data as any;
            playSound('swoosh');
            const dataStr = JSON.stringify(response.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = response.metadata?.createdAt
                ? new Date(response.metadata.createdAt).toISOString().split('T')[0]
                : backupId;
            link.download = `reward-arcade-full-backup-${schoolId}-${dateStr}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Download Failed', description: (e as Error).message });
        }
    }, [functions, playSound, toast]);

    const devBackupAllSchools = useCallback(async () => {
        playSound('swoosh');
        try {
            const backupAllFn = httpsCallable(functions, 'backupAllSchools');
            const result = await backupAllFn({});
            const response = result.data as any;
            if (response.failed > 0) {
                toast({
                    variant: 'destructive',
                    title: `Backup Complete with Errors`,
                    description: `${response.succeeded}/${response.total} schools backed up. ${response.failed} failed.`,
                });
            } else {
                toast({
                    title: 'All Schools Backed Up',
                    description: `${response.total} school(s) fully backed up to secure storage.`,
                });
            }
        } catch (e) {
            console.error('Backup of all schools failed', e);
            toast({ variant: 'destructive', title: 'Backup Failed', description: (e as Error).message });
        }
    }, [functions, playSound, toast]);

    const devVerifyBackup = useCallback(async (schoolId: string, backupId: string) => {
        const verifyFn = httpsCallable(functions, 'verifyBackupIntegrity');
        try {
            const result = await verifyFn({ schoolId, backupId });
            return result.data as { verified: boolean; reason: string };
        } catch (e) {
            return { verified: false, reason: (e as Error).message || 'Verification failed.' };
        }
    }, [functions]);

    const deleteSchool = useCallback(async (schoolId: string) => {
        if (!firestore || !auth.currentUser) return;
        try {
            const createBackupFn = httpsCallable(functions, 'createBackupTrigger');
            await createBackupFn({ schoolId, type: 'pre-delete' });
            toast({ title: "Final Backup Created", description: `A full backup for ${schoolId} has been saved before deletion.` });
            const adminRoleRef = doc(firestore, 'schools', schoolId, 'roles_admin', auth.currentUser.uid);
            await setDoc(adminRoleRef, { role: 'admin' });
            await deleteDoc(doc(firestore, 'schools', schoolId));
            playSound('success');
            toast({ title: `School "${schoolId}" deleted!` });
        } catch (e) {
            toast({ variant: 'destructive', title: `School "${schoolId}" deletion failed!`, description: (e as Error).message });
        }
    }, [firestore, auth, toast, playSound, functions]);

    const updateSchool = useCallback(async (schoolId: string, updates: { name?: string; passcode?: string }) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'schools', schoolId), updates);
            playSound('success');
        } catch (e) {
            toast({ variant: 'destructive', title: "School update failed", description: (e as Error).message });
        }
    }, [firestore, playSound, toast]);

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

    const value = useMemo(
        () => ({
            createSchool, deleteSchool, updateSchool,
            devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
            devVerifyBackup, devMigrateSchoolData,
        }),
        [
            createSchool, deleteSchool, updateSchool,
            devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
            devVerifyBackup, devMigrateSchoolData,
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
