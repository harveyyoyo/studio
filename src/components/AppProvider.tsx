
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
import type { Student, Coupon, Class, Prize, Category, Teacher, HistoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';
import { StudentIdPrintSheet } from '@/components/StudentIdPrintSheet';
import { useFirebase, errorEmitter, FirestorePermissionError, useMemoFirebase } from '@/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  deleteDoc,
  writeBatch,
  getDocs,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { httpsCallable } from "firebase/functions";
import {
  addStudent as dbAddStudent,
  updateStudent as dbUpdateStudent,
  deleteStudent as dbDeleteStudent,
  addClass as dbAddClass,
  deleteClass as dbDeleteClass,
  addTeacher as dbAddTeacher,
  deleteTeacher as dbDeleteTeacher,
  addCategory as dbAddCategory,
  deleteCategory as dbDeleteCategory,
  addPrize as dbAddPrize,
  updatePrize as dbUpdatePrize,
  deletePrize as dbDeletePrize,
  addCoupons as dbAddCoupons,
  redeemCoupon as dbRedeemCoupon,
  redeemPrize as dbRedeemPrize,
  uploadStudents as dbUploadStudents,
} from '@/lib/db';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { YESHIVA_DATA } from '@/lib/yeshiva-data';
import { SCHOOL_DATA } from '@/lib/school-data';

export type LoginState = 'loggedOut' | 'school' | 'developer';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

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
  
  // Dev portal functions
  createSchool: (schoolId: string) => Promise<{ passcode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  isAutoBackupEnabled: boolean;
  toggleAutoBackup: () => void;

  // Data mutation functions
  addStudent: (studentData: Omit<Student, 'id' | 'lifetimePoints'>, studentId: string) => void;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => void;
  addClass: (classData: { name: string }) => void;
  deleteClass: (classId: string, students: Student[]) => Promise<void>;
  addTeacher: (teacherData: { name: string }) => void;
  deleteTeacher: (teacherId: string) => void;
  addCategory: (categoryData: { name: string; points: number; }) => Category;
  deleteCategory: (categoryId: string) => void;
  addPrize: (prizeData: Omit<Prize, 'id'>) => void;
  updatePrize: (updatedPrize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => void;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<number>;
  redeemPrize: (studentId: string, prize: Prize) => Promise<void>;
  uploadStudents: (csvContent: string, currentStudents: Student[], allClasses: Class[]) => Promise<{ success: number; failed: number; errors: string[]; }>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('loggedOut');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
  const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore, functions } = useFirebase();
  const playSound = useArcadeSound();

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

  useEffect(() => {
    if (!firestore) return;
    const metadataRef = doc(firestore, 'schools', 'metadata'); // a dummy doc to check connection
    const unsub = onSnapshot(metadataRef, {
        next: () => setSyncStatus('synced'),
        error: (err) => {
            if (err.code === 'permission-denied') {
                setSyncStatus('synced');
            } else {
                setSyncStatus(err.code === 'unavailable' ? 'offline' : 'error');
            }
        }
    });
    return () => unsub();
  }, [firestore])
  
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
            if (await performAuth() && auth.currentUser) {
              setSchoolId(lowerSchoolId);
              setLoginState('school');
              sessionStorage.setItem('loginState', 'school');
              sessionStorage.setItem('schoolId', lowerSchoolId);
              
              const adminRoleRef = doc(firestore, 'schools', lowerSchoolId, 'roles_admin', auth.currentUser.uid);
              setDoc(adminRoleRef, { grantedAt: Date.now() }).catch(error => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: adminRoleRef.path,
                    operation: 'create',
                    requestResourceData: { grantedAt: "timestamp" }
                }));
              });

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
    
    const schoolDocRef = doc(firestore, 'schools', cleanId);
    const schoolExists = (await getDoc(schoolDocRef)).exists();

    if(schoolExists) {
      if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
        playSound('error');
        toast({variant: 'destructive', title: `School ID "${cleanId}" already exists.`});
      }
      return null;
    }
    
    const newPasscode = process.env.NEXT_PUBLIC_DEV_PASSCODE || '1234';
    const adminRoleRef = doc(firestore, 'schools', cleanId, 'roles_admin', auth.currentUser.uid);
    const batch = writeBatch(firestore);
    
    const sampleData = cleanId === 'yeshiva' ? YESHIVA_DATA : (cleanId === 'schoolabc' ? SCHOOL_DATA : null);

    batch.set(schoolDocRef, { 
        name: sampleData?.name || cleanId,
        passcode: newPasscode,
        updatedAt: Date.now(),
    });
    batch.set(adminRoleRef, { grantedAt: Date.now() });

    if (sampleData) {
        // Process students and their history separately
        sampleData.students?.forEach((studentWithHistory: any) => {
            const { history, nfcId, ...studentData } = studentWithHistory;

            // Add lifetimePoints if missing from sample data
            if (typeof studentData.lifetimePoints !== 'number') {
                studentData.lifetimePoints = studentData.points;
            }

            const studentRef = doc(firestore, 'schools', cleanId, 'students', studentData.id);
            batch.set(studentRef, studentData);

            if (history && Array.isArray(history)) {
                history.forEach((activity: HistoryItem) => {
                    const activityRef = doc(collection(firestore, studentRef.path, 'activities'));
                    batch.set(activityRef, activity);
                });
            }
        });
        
        sampleData.classes?.forEach(c => {
            const classRef = doc(firestore, 'schools', cleanId, 'classes', c.id);
            batch.set(classRef, c);
        });
        sampleData.teachers?.forEach(teacher => {
            const teacherRef = doc(firestore, 'schools', cleanId, 'teachers', teacher.id);
            batch.set(teacherRef, teacher);
        });
        sampleData.prizes?.forEach(prize => {
            const prizeRef = doc(firestore, 'schools', cleanId, 'prizes', prize.id);
            batch.set(prizeRef, prize);
        });
        sampleData.categories?.forEach(category => {
            const categoryRef = doc(firestore, 'schools', cleanId, 'categories', category.id);
            batch.set(categoryRef, category);
        });
        sampleData.coupons?.forEach(coupon => {
            const couponRef = doc(firestore, 'schools', cleanId, 'coupons', coupon.id);
            batch.set(couponRef, coupon);
        });
    }
    
    await batch.commit();

    if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
      playSound('success');
      toast({title: `School "${cleanId}" created!`});
    }
    return { passcode: newPasscode, cleanId };
  }, [firestore, auth, toast, playSound]);

  const devCreateBackup = useCallback(async (schoolId: string) => {
    if (!functions) return;
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
    if (!firestore || !functions) return;
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
          
          // Delete all existing subcollections
          const collections = ['students', 'classes', 'teachers', 'prizes', 'coupons', 'categories', 'backups', 'roles_admin'];
          for (const col of collections) {
            const colRef = collection(firestore, 'schools', schoolId, col);
            const snapshot = await getDocs(colRef);
            const deleteBatch = writeBatch(firestore);
            snapshot.docs.forEach(d => deleteBatch.delete(d.ref));
            await deleteBatch.commit();
          }
          
          // Set the main document
          await setDoc(schoolDocRef, restoredDb);
          
          // Now call all migration functions to repopulate subcollections from the restored document
          const migrationFunctions = [
            'migrateStudentsToSubcollection', 'migrateClassesToSubcollection', 'migrateTeachersToSubcollection',
            'migratePrizesToSubcollection', 'migrateCouponsToSubcollection'
          ];
          for (const funcName of migrationFunctions) {
            const callable = httpsCallable(functions, funcName);
            await callable({ schoolId });
          }

          playSound('success');
      } else {
          throw new Error('Backup or school not found');
      }
    } catch (e) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Restore Failed', description: (e as Error).message });
    }
  }, [firestore, playSound, toast, devCreateBackup, functions]);

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
      
      const collections = ['students', 'classes', 'teachers', 'prizes', 'coupons', 'categories', 'backups', 'roles_admin'];
      for (const col of collections) {
          const colRef = collection(firestore, 'schools', schoolId, col);
          const snapshot = await getDocs(colRef);
          const deleteBatch = writeBatch(firestore);
          snapshot.docs.forEach(d => deleteBatch.delete(d.ref));
          await deleteBatch.commit();
      }

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
      createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools, 
      isAutoBackupEnabled, toggleAutoBackup,
      addStudent: (studentData, studentId) => {
        if (!firestore || !schoolId) return;
        dbAddStudent(firestore, schoolId, studentData, studentId);
        toast({ title: 'Student added!' });
      },
      updateStudent: (studentData) => {
        if (!firestore || !schoolId) return Promise.resolve();
        return dbUpdateStudent(firestore, schoolId, studentData).then(() => {
           toast({ title: 'Student updated!' });
        });
      },
      deleteStudent: (studentId) => {
        if (!firestore || !schoolId) return;
        dbDeleteStudent(firestore, schoolId, studentId);
        toast({ title: 'Student deleted' });
      },
      addClass: (classData) => {
        if (!firestore || !schoolId) return;
        dbAddClass(firestore, schoolId, classData);
        toast({ title: 'Class added!' });
      },
      deleteClass: (classId, students) => {
        if (!firestore || !schoolId) return Promise.resolve();
        return dbDeleteClass(firestore, schoolId, classId, students).then(() => {
            toast({ title: 'Class deleted' });
        });
      },
      addTeacher: (teacherData) => {
        if (!firestore || !schoolId) return;
        dbAddTeacher(firestore, schoolId, teacherData);
        toast({ title: 'Teacher added!' });
      },
      deleteTeacher: (teacherId: string) => {
        if (!firestore || !schoolId) return;
        dbDeleteTeacher(firestore, schoolId, teacherId);
        toast({ title: 'Teacher deleted' });
      },
      addCategory: (categoryData) => {
         if (!firestore || !schoolId) throw new Error("Not logged in");
        const newCategory = dbAddCategory(firestore, schoolId, categoryData);
        toast({ title: 'Category added!' });
        return newCategory;
      },
      deleteCategory: (categoryId: string) => {
        if (!firestore || !schoolId) return;
        dbDeleteCategory(firestore, schoolId, categoryId);
        toast({ title: 'Category deleted' });
      },
      addPrize: (prizeData) => {
        if (!firestore || !schoolId) return;
        dbAddPrize(firestore, schoolId, prizeData);
        toast({ title: 'Prize added!' });
      },
      updatePrize: (prizeData) => {
        if (!firestore || !schoolId) return Promise.resolve();
        return dbUpdatePrize(firestore, schoolId, prizeData).then(() => {
          toast({ title: 'Prize updated!' });
        });
      },
      deletePrize: (prizeId) => {
        if (!firestore || !schoolId) return;
        dbDeletePrize(firestore, schoolId, prizeId);
        toast({ title: 'Prize deleted' });
      },
      addCoupons: (coupons) => {
        if (!firestore || !schoolId) return Promise.resolve();
        return dbAddCoupons(firestore, schoolId, coupons);
      },
      redeemCoupon: (studentId, couponCode) => {
        if (!firestore || !schoolId) return Promise.reject(new Error('Not logged in'));
        return dbRedeemCoupon(firestore, schoolId, studentId, couponCode);
      },
       redeemPrize: (studentId: string, prize: Prize) => {
        if (!firestore || !schoolId) return Promise.reject(new Error('Not logged in'));
        return dbRedeemPrize(firestore, schoolId, studentId, prize);
      },
      uploadStudents: (csvContent, currentStudents, allClasses) => {
        if (!firestore || !schoolId) return Promise.resolve({success: 0, failed: 0, errors:['Not logged in']});
        return dbUploadStudents(firestore, schoolId, csvContent, currentStudents, allClasses);
      }
    }),
    [
      isInitialized, loginState, schoolId, syncStatus,
      login, logout, createSchool, deleteSchool, updateSchool,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
      isAutoBackupEnabled, toggleAutoBackup, firestore, toast, playSound,
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
