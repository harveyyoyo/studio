
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
import { useFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { httpsCallable } from "firebase/functions";
import { INITIAL_DATA } from '@/lib/data';
import { YESHIVA_DATA } from '@/lib/yeshiva-data';
import { SCHOOL_DATA } from '@/lib/school-data';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { addCategory, addClass, addCoupons, addPrize, addStudent, addTeacher, deleteCategory, deleteClass, deletePrize, deleteStudent, deleteTeacher, redeemCoupon, updatePrize, updateStudent, uploadStudents } from '@/lib/db';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer';

interface AppContextType {
  isInitialized: boolean;
  loginState: LoginState;
  schoolId: string | null;
  syncStatus: SyncStatus; // This can be derived from useCollection/useDoc loading states now
  login: (
    type: 'school' | 'developer',
    credentials: { schoolId?: string; passcode?: string }
  ) => Promise<boolean>;
  logout: () => void;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  setStudentsToPrint: (students: Student[]) => void;
  
  // Data mutation functions
  addStudent: (student: Omit<Student, 'id' | 'history'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addClass: (newClass: Omit<Class, 'id'>) => void;
  deleteClass: (classId: string, students: Student[]) => Promise<void>;
  addTeacher: (newTeacher: Omit<Teacher, 'id'>) => void;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: { name: string; points: number; }) => Promise<Category | null>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, studentPoints: number, couponCode: string, allCoupons: Coupon[]) => Promise<{ success: boolean; message: string; value?: number }>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
  uploadStudents: (csvContent: string, currentStudents: Student[], allClasses: Class[]) => Promise<{success: number, failed: number, errors: string[]}>;

  // School management functions
  createSchool: (schoolId: string) => Promise<{ passcode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
  
  // Backup/restore functions
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  isAutoBackupEnabled: boolean;
  toggleAutoBackup: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('loggedOut');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
  const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore, functions } = useFirebase();
  const playSound = useArcadeSound();

  // This is kept simple, could be derived from multiple useCollection hooks in a real app
  const syncStatus: SyncStatus = 'synced'; 

  // Restore session & settings
  useEffect(() => {
    if (!auth) return;

    const savedState = sessionStorage.getItem('loginState');
    const savedSchoolId = sessionStorage.getItem('schoolId');

    const initializeSession = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        if (savedState && savedState !== 'loggedOut') {
          setLoginState(savedState as LoginState);
          if (savedState === 'school' && savedSchoolId) {
            setSchoolId(savedSchoolId);
          }
        }
      } catch (error) {
        console.error("Failed to restore Firebase session:", error);
        sessionStorage.clear();
        setLoginState('loggedOut');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSession();
    
    const storedPref = localStorage.getItem('autoBackupEnabled');
    if (storedPref) {
        setIsAutoBackupEnabled(JSON.parse(storedPref));
    }

  }, [auth]);
  
  const login = useCallback(
    async (type: 'school' | 'developer', credentials: { schoolId?: string; passcode?: string }): Promise<boolean> => {
      if (!auth || !firestore) return false;

      const performAuth = async () => {
        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
          return true;
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: (error as Error).message,
          });
          return false;
        }
      };

      if (type === 'developer') {
        if (credentials.passcode === process.env.NEXT_PUBLIC_DEV_PASSCODE) {
          if (await performAuth()) {
            setLoginState('developer');
            sessionStorage.setItem('loginState', 'developer');
            return true;
          }
        }
      } else if (type === 'school' && credentials.schoolId && credentials.passcode) {
        const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
        const schoolLoginDocRef = doc(firestore, 'schools', lowerSchoolId);
        try {
          const docSnap = await getDoc(schoolLoginDocRef);
          if (docSnap.exists() && docSnap.data().passcode === credentials.passcode) {
            if (await performAuth()) {
              setSchoolId(lowerSchoolId);
              setLoginState('school');
              sessionStorage.setItem('loginState', 'school');
              sessionStorage.setItem('schoolId', lowerSchoolId);
              // Grant admin role for dev purposes
              if (credentials.passcode === process.env.NEXT_PUBLIC_DEV_PASSCODE && auth.currentUser) {
                const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
                await setDoc(adminRoleRef, { grantedAt: Date.now() });
              }
              return true;
            }
          }
        } catch (e) {
          console.error("School login error", e);
          return false;
        }
      }
      return false;
    },
    [auth, firestore, toast]
  );
  
  const logout = useCallback(() => {
    playSound('swoosh');
    if (auth) {
      signOut(auth);
    }
    sessionStorage.clear();
    setLoginState('loggedOut');
    setSchoolId(null);
    router.push('/');
  }, [router, playSound, auth]);
  
  const createSchool = useCallback(async (schoolId: string): Promise<{ passcode: string; cleanId: string } | null> => {
    if (!firestore || !auth?.currentUser) return null;
    const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
        playSound('error');
        toast({variant: 'destructive', title: "Invalid School ID"});
        return null;
    }
    
    const schoolExists = (await getDoc(doc(firestore, 'schools', cleanId))).exists();
    if(schoolExists) {
      if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
        playSound('error');
        toast({variant: 'destructive', title: `School ID "${cleanId}" already exists.`});
      }
      return null;
    }
    
    let schoolData: Omit<Database, 'passcode' | 'students' | 'classes' | 'teachers' | 'coupons' | 'prizes'>, newPasscode;
    let collectionsToBatchWrite: { [key: string]: any[] } = {};

    if (cleanId === 'yeshiva') {
      newPasscode = '1234';
      const { students, classes, teachers, coupons, prizes, ...rest } = YESHIVA_DATA;
      schoolData = rest;
      collectionsToBatchWrite = { students, classes, teachers, coupons, prizes };
    } else if (cleanId === 'schoolabc') {
      newPasscode = '1234';
      const { students, classes, teachers, coupons, prizes, ...rest } = SCHOOL_DATA;
      schoolData = rest;
      collectionsToBatchWrite = { students, classes, teachers, coupons, prizes };
    } else {
      newPasscode = '1234'; // All sample schools use 1234 now
      const { students, classes, teachers, coupons, prizes, ...rest } = INITIAL_DATA;
      schoolData = {...rest, name: cleanId};
      collectionsToBatchWrite = { students, classes, teachers, coupons, prizes };
    }

    const schoolDocRef = doc(firestore, 'schools', cleanId);
    const adminRoleRef = doc(firestore, 'schools', cleanId, 'roles_admin', auth.currentUser.uid);

    const batch = writeBatch(firestore);
    batch.set(schoolDocRef, { ...schoolData, passcode: newPasscode });
    batch.set(adminRoleRef, { grantedAt: Date.now() });

    for (const [collectionName, items] of Object.entries(collectionsToBatchWrite)) {
      if (items) {
        for (const item of items) {
          const itemDocRef = doc(firestore, 'schools', cleanId, collectionName, item.id);
          batch.set(itemDocRef, item);
        }
      }
    }
    
    await batch.commit();
    
    if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
      playSound('success');
      toast({title: `School "${cleanId}" created!`});
    }
    return { passcode: newPasscode, cleanId };
  }, [firestore, auth, toast, playSound]);

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
    await devCreateBackup(schoolId);
    toast({ title: "Pre-Restore Backup Created", description: "A backup of the current state has been saved." });

    const schoolDocRef = doc(firestore, 'schools', schoolId);
    const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
    try {
      const backupSnap = await getDoc(backupDocRef);
      const schoolSnap = await getDoc(schoolDocRef);
      if (backupSnap.exists() && schoolSnap.exists()) {
          const backupData = backupSnap.data();
          const currentPasscode = schoolSnap.data().passcode;
          const restoredDb = { ...backupData, passcode: currentPasscode };
          await setDoc(schoolDocRef, restoredDb);
          playSound('success');
      } else {
          throw new Error('Backup or school not found');
      }
    } catch (e) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Restore Failed', description: (e as Error).message });
    }
  }, [firestore, playSound, toast, devCreateBackup]);

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

  const toggleAutoBackup = useCallback(() => {
    setIsAutoBackupEnabled(prev => {
        const newState = !prev;
        localStorage.setItem('autoBackupEnabled', JSON.stringify(newState));
        toast({ title: newState ? 'Automatic Backups Enabled' : 'Automatic Backups Disabled' });
        return newState;
    });
  }, [toast]);

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
  
  const handleAddClass = (classData: Omit<Class, 'id'>) => {
    if (!schoolId) return;
    addClass(firestore, schoolId, classData).then(() => {
      toast({ title: "Class Added" });
      playSound('success');
    }).catch(() => playSound('error'));
  }

  const handleDeleteClass = async (classId: string, students: Student[]) => {
    if (!schoolId) return;
    deleteClass(firestore, schoolId, classId, students).then(() => {
        toast({ title: "Class Deleted" });
        playSound('success');
    }).catch(() => playSound('error'));
  }
  
  const handleAddTeacher = (teacherData: Omit<Teacher, 'id'>) => {
    if (!schoolId) return;
    addTeacher(firestore, schoolId, teacherData).then(() => {
      toast({ title: "Teacher Added" });
      playSound('success');
    }).catch(() => playSound('error'));
  }
  
  const handleDeleteTeacher = (teacherId: string) => {
      if (!schoolId) return;
      deleteTeacher(firestore, schoolId, teacherId).then(() => {
          toast({ title: "Teacher Deleted" });
          playSound('success');
      }).catch(() => playSound('error'));
  }
  
  const handleAddCategory = async (category: { name: string; points: number; }) => {
    if (!schoolId) return null;
    const newCategory = await addCategory(firestore, schoolId, category);
    if(newCategory) {
      toast({ title: "Category Added" });
      playSound('success');
    } else {
      playSound('error');
    }
    return newCategory;
  }

  const handleDeleteCategory = (categoryId: string) => {
    if (!schoolId) return;
    deleteCategory(firestore, schoolId, categoryId).then(() => {
      toast({ title: "Category Deleted" });
      playSound('success');
    }).catch(() => playSound('error'));
  }
  
  const handleAddCoupons = (newCoupons: Coupon[]) => {
      if (!schoolId) return;
      addCoupons(firestore, schoolId, newCoupons);
  }

  const handleRedeemCoupon = async (studentId: string, studentPoints: number, couponCode: string, allCoupons: Coupon[]) => {
    if (!schoolId) return { success: false, message: 'Not logged in.' };
    const result = await redeemCoupon(firestore, schoolId, studentId, studentPoints, couponCode, allCoupons);
    if (result.success) {
      playSound('redeem');
    } else {
      playSound('error');
    }
    return result;
  }
  
  const handleAddPrize = (prize: Omit<Prize, 'id'>) => {
    if (!schoolId) return;
    addPrize(firestore, schoolId, prize).then(() => {
      toast({ title: "Prize Added" });
      playSound('success');
    }).catch(() => playSound('error'));
  }
  
  const handleUpdatePrize = (prize: Prize) => {
    if (!schoolId) return;
    updatePrize(firestore, schoolId, prize).then(() => {
      toast({ title: "Prize Updated" });
      playSound('success');
    }).catch(() => playSound('error'));
  }

  const handleDeletePrize = (prizeId: string) => {
    if (!schoolId) return;
    deletePrize(firestore, schoolId, prizeId).then(() => {
      toast({ title: "Prize Deleted" });
      playSound('success');
    }).catch(() => playSound('error'));
  }
  
  const handleUploadStudents = async (csvContent: string, currentStudents: Student[], allClasses: Class[]) => {
    if(!schoolId) return {success: 0, failed: 0, errors: ["Not logged in."]};
    const report = await uploadStudents(firestore, schoolId, csvContent, currentStudents, allClasses);
     if (report.failed > 0) playSound('error');
     else playSound('success');
     toast({ title: 'Upload Complete', description: `${report.success} students added, ${report.failed} failed.` });
     return report;
  }
  
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
      addStudent: (s: Omit<Student, 'id'>) => addStudent(firestore, schoolId!, s),
      updateStudent: (s: Student) => updateStudent(firestore, schoolId!, s),
      deleteStudent: (id: string) => deleteStudent(firestore, schoolId!, id),
      addClass: handleAddClass,
      deleteClass: handleDeleteClass, 
      addTeacher: handleAddTeacher,
      deleteTeacher: handleDeleteTeacher,
      addCategory: handleAddCategory,
      deleteCategory: handleDeleteCategory,
      addCoupons: handleAddCoupons,
      redeemCoupon: handleRedeemCoupon,
      addPrize: handleAddPrize,
      updatePrize: handleUpdatePrize,
      deletePrize: handleDeletePrize,
      uploadStudents: handleUploadStudents,
      createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools, 
      isAutoBackupEnabled, toggleAutoBackup,
    }),
    [
      isInitialized, loginState, schoolId, syncStatus, firestore,
      login, logout, createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
      isAutoBackupEnabled, toggleAutoBackup, handleAddClass, handleDeleteClass, 
      handleAddTeacher, handleDeleteTeacher, handleAddCategory, handleDeleteCategory,
      handleAddCoupons, handleRedeemCoupon, handleAddPrize, handleUpdatePrize, 
      handleDeletePrize, handleUploadStudents
    ]
  );

  return (
    <AppContext.Provider value={value as AppContextType}>
      {children}
      {couponsToPrint.length > 0 && <PrintSheet coupons={couponsToPrint} schoolId={schoolId} />}
      {studentsToPrint.length > 0 && <StudentIdPrintSheet students={studentsToPrint} schoolId={schoolId} getClassName={(classId) => ''} />}
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
