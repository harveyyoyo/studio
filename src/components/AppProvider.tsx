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
import type { Database, Student, Class, Coupon, HistoryItem, Teacher, Prize, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';
import { StudentIdPrintSheet } from '@/components/StudentIdPrintSheet';
import { useFirebase, useMemoFirebase } from '@/firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  collection,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { YESHIVA_DATA } from '@/lib/yeshiva-data';
import { SCHOOL_DATA } from '@/lib/school-data';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { addCategory as dbAddCategory, deleteCategory as dbDeleteCategory, addCoupons as dbAddCoupons, redeemCoupon as dbRedeemCoupon, redeemPrize as dbRedeemPrize, addPrize as dbAddPrize, updatePrize as dbUpdatePrize, deletePrize as dbDeletePrize, addStudent as dbAddStudent, updateStudent as dbUpdateStudent, deleteStudent as dbDeleteStudent, addClass as dbAddClass, deleteClass as dbDeleteClass, addTeacher as dbAddTeacher, deleteTeacher as dbDeleteTeacher, uploadStudents as dbUploadStudents } from '@/lib/db';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer';

interface AppContextType {
  isInitialized: boolean;
  loginState: LoginState;
  schoolId: string | null;
  syncStatus: SyncStatus;
  login: (
    type: 'school' | 'developer',
    credentials: { schoolId?: string; passcode?: string }
  ) => Promise<boolean>;
  logout: () => void;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  setStudentsToPrint: (students: Student[]) => void;
  addStudent: (student: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addClass: (newClass: Omit<Class, 'id'>) => Promise<void>;
  deleteClass: (classId: string, students: Student[]) => Promise<void>;
  addTeacher: (newTeacher: Omit<Teacher, 'id'>) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: { name: string; points: number }) => Promise<Category | undefined>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number }>;
  redeemPrize: (studentId: string, prize: Prize) => Promise<void>;
  createSchool: (schoolId: string) => Promise<{ passcode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  isAutoBackupEnabled: boolean;
  toggleAutoBackup: () => void;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
  uploadStudents: (csvContent: string, currentStudents: Student[], allClasses: Class[]) => Promise<{success: number, failed: number, errors: string[]}>;
  devMigrateSchoolData: (schoolId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('loggedOut');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
  const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);

  const { toast } = useToast();
  const { auth, firestore, functions } = useFirebase();
  const playSound = useArcadeSound();
  const router = useRouter();
  
  // Restore session & settings
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
    const storedPref = localStorage.getItem('autoBackupEnabled');
    if (storedPref) {
        setIsAutoBackupEnabled(JSON.parse(storedPref));
    }
    setIsInitialized(true);
  }, []);
  
  // Data sync listener
  useEffect(() => {
    if (!schoolId || !firestore) {
      return;
    }
    
    setSyncStatus('syncing');
    
    const schoolDocRef = doc(firestore, 'schools', schoolId);
    const unsub = onSnapshot(schoolDocRef, (snap) => {
      setSyncStatus(snap.metadata.hasPendingWrites ? 'syncing' : 'synced');
    }, (error) => {
        console.error("Firestore snapshot error:", error);
        setSyncStatus('error');
    });

    return () => unsub();
  }, [schoolId, firestore]);


  const login = useCallback(
    async (type: 'school' | 'developer', credentials: { schoolId?: string; passcode?: string }): Promise<boolean> => {
      if (type === 'developer') {
        if (credentials.passcode === process.env.NEXT_PUBLIC_DEV_PASSCODE) {
          setLoginState('developer');
          sessionStorage.setItem('loginState', 'developer');
          return true;
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
          } catch(e) {
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
  
  const createSchool = useCallback(async (schoolId: string): Promise<{ passcode: string; cleanId: string } | null> => {
    if (!firestore) return null;
    const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
        playSound('error');
        toast({variant: 'destructive', title: "Invalid School ID"});
        return null;
    }
    
    const schoolDocRef = doc(firestore, 'schools', cleanId);
    const schoolExists = (await getDoc(schoolDocRef)).exists();
    if(schoolExists) {
      if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
        playSound('error');
        toast({variant: 'destructive', title: `School ID "${cleanId}" already exists.`});
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
      schoolData = { name: cleanId, updatedAt: Date.now() };
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

    const batch = writeBatch(firestore);
    batch.set(schoolDocRef, finalSchoolDocData);

    const migrateList = async (list: any[] | undefined, collectionName: string) => {
        if (!list) return;
        for (const item of list) {
            const itemRef = doc(firestore, 'schools', cleanId, collectionName, item.id);
            if (collectionName === 'students' && item.history) {
                const { history, ...studentData } = item;
                 // Calculate lifetimePoints based on positive transactions in history
                const lifetimePoints = history.reduce((acc: number, activity: HistoryItem) => {
                    return activity.amount > 0 ? acc + activity.amount : acc;
                }, 0);
                
                const finalStudentData = { ...studentData, lifetimePoints };
                batch.set(itemRef, finalStudentData);

                for(const historyItem of history) {
                    const historyRef = doc(collection(itemRef, 'activities'));
                    batch.set(historyRef, historyItem);
                }
            } else {
                batch.set(itemRef, item);
            }
        }
    }

    await migrateList(students, 'students');
    await migrateList(classes, 'classes');
    await migrateList(teachers, 'teachers');
    await migrateList(categories, 'categories');
    await migrateList(prizes, 'prizes');
    await migrateList(coupons, 'coupons');

    await batch.commit();
    
    if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
      playSound('success');
      toast({title: `School "${cleanId}" created!`});
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
          await setDoc(schoolDocRef, backupData); // This overwrites the main doc
          // Note: a full restore would require a cloud function to clear and restore subcollections.
          // This is a partial restore for development purposes.
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
    } catch(e) {
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
    if (!firestore) return;
    try {
      await devCreateBackup(schoolId);
      toast({ title: "Final Backup Created", description: `A final backup for ${schoolId} has been saved.` });
      // Note: subcollections are not automatically deleted. This requires a Cloud Function.
      await deleteDoc(doc(firestore, 'schools', schoolId));
      playSound('success');
      toast({title: `School "${schoolId}" deleted!`});
    } catch (e) {
      toast({variant: 'destructive', title: `School "${schoolId}" deletion failed!`, description: (e as Error).message});
    }
  }, [firestore, toast, playSound, devCreateBackup]);

  const updateSchool = useCallback(async (schoolId: string, updates: { name?: string; passcode?: string }) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'schools', schoolId), updates);
      playSound('success');
    } catch (e) {
      toast({variant: 'destructive', title: "School update failed", description: (e as Error).message});
    }
  }, [firestore, playSound, toast]);

  const addStudent_ = useCallback((studentData: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddStudent(firestore, schoolId, studentData);
  }, [firestore, schoolId]);

  const updateStudent_ = useCallback((student: Student) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateStudent(firestore, schoolId, student);
  }, [firestore, schoolId]);
  
  const deleteStudent_ = useCallback((studentId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteStudent(firestore, schoolId, studentId);
  }, [firestore, schoolId]);

  const addClass_ = useCallback((classData: Omit<Class, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddClass(firestore, schoolId, classData);
  }, [firestore, schoolId]);

  const deleteClass_ = useCallback((classId: string, students: Student[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteClass(firestore, schoolId, classId, students);
  }, [firestore, schoolId]);

  const addTeacher_ = useCallback((teacherData: Omit<Teacher, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddTeacher(firestore, schoolId, teacherData);
  }, [firestore, schoolId]);
  
  const deleteTeacher_ = useCallback((teacherId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteTeacher(firestore, schoolId, teacherId);
  }, [firestore, schoolId]);
  
  const addCategory_ = useCallback(async (categoryData: { name: string; points: number }) => {
    if (!firestore || !schoolId) return undefined;
    return await dbAddCategory(firestore, schoolId, categoryData);
  }, [firestore, schoolId]);
  
  const deleteCategory_ = useCallback((categoryId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteCategory(firestore, schoolId, categoryId);
  }, [firestore, schoolId]);
  
  const addCoupons_ = useCallback((newCoupons: Coupon[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddCoupons(firestore, schoolId, newCoupons);
  }, [firestore, schoolId]);

  const redeemCoupon_ = useCallback(async (studentId: string, couponCode: string): Promise<{ success: boolean; message: string; value?: number }> => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.' };
    return dbRedeemCoupon(firestore, schoolId, studentId, couponCode);
  }, [firestore, schoolId, playSound]);

  const redeemPrize_ = useCallback(async (studentId: string, prize: Prize) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbRedeemPrize(firestore, schoolId, studentId, prize);
  }, [firestore, schoolId, playSound, toast]);

  const addPrize_ = useCallback((prizeData: Omit<Prize, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddPrize(firestore, schoolId, prizeData);
  }, [firestore, schoolId]);

  const updatePrize_ = useCallback((updatedPrize: Prize) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdatePrize(firestore, schoolId, updatedPrize);
  }, [firestore, schoolId]);
  
  const deletePrize_ = useCallback((prizeId: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeletePrize(firestore, schoolId, prizeId);
  }, [firestore, schoolId]);

  const uploadStudents_ = useCallback((csvContent: string, currentStudents: Student[], allClasses: Class[]) => {
    if (!firestore || !schoolId) return Promise.resolve({success: 0, failed: 0, errors: ["Not logged in."]});
    return dbUploadStudents(firestore, schoolId, csvContent, currentStudents, allClasses);
  }, [firestore, schoolId]);

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
    const intervalId = setInterval(checkAndBackup, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(intervalId);
  }, [isAutoBackupEnabled, loginState, devBackupAllSchools, toast]);


  const printTriggered = useRef(false);
  useEffect(() => {
    if (couponsToPrint.length > 0 && !printTriggered.current) {
      printTriggered.current = true;
      const afterPrint = () => {
        setCouponsToPrint([]);
        printTriggered.current = false;
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      playSound('swoosh');
      document.fonts.load('38pt "Libre Barcode 39"').finally(window.print);
    }
  }, [couponsToPrint, playSound]);

  const studentPrintTriggered = useRef(false);
  useEffect(() => {
    if (studentsToPrint.length > 0 && !studentPrintTriggered.current) {
      studentPrintTriggered.current = true;
      const afterPrint = () => {
        setStudentsToPrint([]);
        studentPrintTriggered.current = false;
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      playSound('swoosh');
      document.fonts.load('48pt "Libre Barcode 39"').finally(window.print);
    }
  }, [studentsToPrint, playSound]);


  const value = useMemo(
    () => ({
      isInitialized, loginState, schoolId, syncStatus,
      login, logout, setCouponsToPrint, setStudentsToPrint, 
      addStudent: addStudent_,
      updateStudent: updateStudent_,
      deleteStudent: deleteStudent_,
      addClass: addClass_,
      deleteClass: deleteClass_,
      addTeacher: addTeacher_,
      deleteTeacher: deleteTeacher_,
      addCategory: addCategory_, 
      deleteCategory: deleteCategory_,
      addCoupons: addCoupons_,
      redeemCoupon: redeemCoupon_,
      redeemPrize: redeemPrize_,
      createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools, 
      isAutoBackupEnabled, toggleAutoBackup,
      addPrize: addPrize_,
      updatePrize: updatePrize_,
      deletePrize: deletePrize_,
      uploadStudents: uploadStudents_,
      devMigrateSchoolData,
    }),
    [
      isInitialized, loginState, schoolId, syncStatus,
      login, logout, playSound,
      addStudent_, updateStudent_, deleteStudent_,
      addClass_, deleteClass_, addTeacher_, deleteTeacher_, addCategory_, deleteCategory_, addCoupons_,
      redeemCoupon_, redeemPrize_, createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
      isAutoBackupEnabled, toggleAutoBackup, addPrize_, updatePrize_, deletePrize_, uploadStudents_,
      devMigrateSchoolData
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {couponsToPrint.length > 0 && <PrintSheet coupons={couponsToPrint} schoolId={schoolId} />}
      {studentsToPrint.length > 0 && <StudentIdPrintSheet students={studentsToPrint} />}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
