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
import type { Database, Student, Class, Coupon, HistoryItem, Teacher, Prize } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';
import { StudentIdPrintSheet } from '@/components/StudentIdPrintSheet';
import { useAuth, useFirestore, useFunctions } from '@/firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  getDocs,
  writeBatch,
  where,
} from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { INITIAL_DATA } from '@/lib/data';
import { YESHIVA_DATA } from '@/lib/yeshiva-data';
import { SCHOOL_DATA } from '@/lib/school-data';
import { useArcadeSound } from '@/hooks/useArcadeSound';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer';

interface AppContextType {
  isInitialized: boolean;
  isDbLoading: boolean;
  loginState: LoginState;
  schoolId: string | null;
  db: Database;
  syncStatus: SyncStatus;
  login: (
    type: 'school' | 'developer',
    credentials: { schoolId?: string; passcode?: string }
  ) => Promise<boolean>;
  logout: () => void;
  getClassName: (classId: string) => string;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  setStudentsToPrint: (students: Student[]) => void;
  addStudent: (student: Omit<Student, 'id' | 'history'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addClass: (newClass: Omit<Class, 'id'>) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  addTeacher: (newTeacher: Omit<Teacher, 'id'>) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: { name: string; points: number }) => Promise<{ id: string } | undefined>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number }>;
  redeemPrize: (studentId: string, prize: Prize) => Promise<void>;
  createSchool: (schoolId: string) => Promise<{ passcode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
  setData: (data: Database) => Promise<void>;
  backups: { id: string }[];
  createBackup: () => Promise<void>;
  restoreFromBackup: (backupId: string) => Promise<void>;
  downloadBackup: (backupId: string) => Promise<void>;
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  isAutoBackupEnabled: boolean;
  toggleAutoBackup: () => void;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
  uploadStudents: (csvContent: string) => Promise<{success: number, failed: number, errors: string[]}>;
  migrateStudents: (schoolId: string) => Promise<void>;
  migrateClasses: (schoolId: string) => Promise<void>;
  migrateTeachers: (schoolId: string) => Promise<void>;
  migratePrizes: (schoolId: string) => Promise<void>;
  migrateCoupons: (schoolId: string) => Promise<void>;
  getStudentPointsByCategory: (studentId: string) => Record<string, number>;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_DB: Database = {
  name: '',
  passcode: '',
  students: [],
  classes: [],
  teachers: [],
  categories: [],
  coupons: [],
  prizes: [],
  updatedAt: 0,
  hasMigratedStudents: false,
  hasMigratedClasses: false,
  hasMigratedTeachers: false,
  hasMigratedPrizes: false,
  hasMigratedCoupons: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('loggedOut');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [db, setDb] = useState<Database>(EMPTY_DB);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
  const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [backups, setBackups] = useState<{ id: string }[]>([]);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const functions = useFunctions();

  const router = useRouter();
  const { toast } = useToast();
  const playSound = useArcadeSound();

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
  
  const schoolDocRef = useMemo(
    () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId]
  );
  
  const isInitialSnapshot = useRef(true);

  useEffect(() => {
    if (!schoolDocRef || !firestore || !schoolId) {
      setDb({ ...EMPTY_DB, ...SCHOOL_DATA, passcode: db.passcode });
      setIsDbLoading(false);
      return;
    }
  
    isInitialSnapshot.current = true;
    setIsDbLoading(true);
    setSyncStatus('syncing');
  
    const listeners: (()=>void)[] = [];
  
    const schoolUnsubscribe = onSnapshot(schoolDocRef, (schoolSnap) => {
      if (isInitialSnapshot.current) {
        setIsDbLoading(false);
        isInitialSnapshot.current = false;
      }
  
      listeners.forEach(l => l());
      listeners.length = 0;
  
      if (schoolSnap.exists()) {
        const schoolData = schoolSnap.data();
        setSyncStatus(schoolSnap.metadata.hasPendingWrites ? 'synced' : 'syncing');
        const baseData = { ...EMPTY_DB, ...schoolData };
  
        const setupListener = (collectionName: keyof Database, flag: keyof Database) => {
          if (schoolData[flag]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (baseData as any)[collectionName] = (db as any)[collectionName] || [];
            const collectionRef = collection(firestore, 'schools', schoolId, collectionName as string);
            const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
              const data = snapshot.docs.map(doc => doc.data());
              setDb(prevDb => ({ ...prevDb, [collectionName]: data }));
              setSyncStatus(snapshot.metadata.hasPendingWrites ? 'synced' : 'syncing');
            }, (error) => {
              console.error(`${collectionName} subcollection error:`, error);
              setSyncStatus('error');
            });
            listeners.push(unsubscribe);
          }
        };

        setupListener('students', 'hasMigratedStudents');
        setupListener('classes', 'hasMigratedClasses');
        setupListener('teachers', 'hasMigratedTeachers');
        setupListener('prizes', 'hasMigratedPrizes');
        setupListener('coupons', 'hasMigratedCoupons');

        setDb(baseData);
      } else {
        setDb({ ...EMPTY_DB, ...SCHOOL_DATA, passcode: db.passcode });
      }
    }, (error) => {
      console.error('Firestore snapshot error:', error);
      setSyncStatus('error');
      setIsDbLoading(false);
    });
  
    return () => {
      schoolUnsubscribe();
      listeners.forEach(l => l());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolDocRef, firestore, schoolId]);


  // Fetch backups
  useEffect(() => {
    if (!schoolId || !firestore) {
        setBackups([]);
        return;
    }
    const backupsColRef = collection(firestore, 'schools', schoolId, 'backups');
    const q = query(backupsColRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const backupList = snapshot.docs.map(doc => ({ id: doc.id }));
        backupList.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        const limitedBackups = backupList.slice(0, 10);
        setBackups(limitedBackups);
    }, (error) => {
        console.error("Error fetching backups:", error);
        setBackups([]);
    });

    return () => unsubscribe();
  }, [schoolId, firestore]);

  const updateDb = useCallback(
    async (newDbState: Partial<Database>) => {
      if (!schoolDocRef) return;
      const dbWithTimestamp = { ...newDbState, updatedAt: Date.now() };
      setSyncStatus('syncing');
      try {
        await setDoc(schoolDocRef, dbWithTimestamp, { merge: true });
      } catch (e) {
        setSyncStatus('error');
        toast({ variant: 'destructive', title: 'Sync Error', description: (e as Error).message });
      }
    },
    [schoolDocRef, toast]
  );
  
  const login = useCallback(
    async (type: 'school' | 'developer', credentials: { schoolId?: string; passcode?: string }): Promise<boolean> => {
      if (type === 'developer') {
        if (credentials.passcode === process.env.NEXT_PUBLIC_DEV_PASSCODE) { 
          setLoginState('developer');
          sessionStorage.setItem('loginState', 'developer');
          return true;
        }
      } else if (type === 'school' && credentials.schoolId && firestore) {
          const lowerSchoolId = credentials.schoolId.trim().toLowerCase();
          const schoolLoginDocRef = doc(firestore, 'schools', lowerSchoolId);
          try {
            const docSnap = await getDoc(schoolLoginDocRef);
            if (docSnap.exists() && docSnap.data().passcode === credentials.passcode) {
               setSchoolId(lowerSchoolId);
               setLoginState('school');
               sessionStorage.setItem('loginState', 'school');
               sessionStorage.setItem('schoolId', lowerSchoolId);
               return true;
            }
          } catch(e) {
            console.error("School login error", e);
            return false;
          }
      }
      return false;
    },
    [firestore]
  );
  
  const logout = useCallback(() => {
    playSound('swoosh');
    sessionStorage.clear();
    setLoginState('loggedOut');
    setSchoolId(null);
    setDb(EMPTY_DB);
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
    
    const schoolExists = (await getDoc(doc(firestore, 'schools', cleanId))).exists();
    if(schoolExists) {
      if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
        playSound('error');
        toast({variant: 'destructive', title: `School ID "${cleanId}" already exists.`});
      }
      return null;
    }
    
    let schoolData, newPasscode;
    if (cleanId === 'yeshiva') {
      newPasscode = '1234';
      schoolData = { ...YESHIVA_DATA, passcode: newPasscode };
    } else if (cleanId === 'schoolabc') {
      newPasscode = '1234';
      schoolData = { ...SCHOOL_DATA, passcode: newPasscode };
    } else {
      newPasscode = Math.floor(1000 + Math.random() * 9000).toString();
      schoolData = { ...INITIAL_DATA, name: cleanId, passcode: newPasscode };
    }
    
    await setDoc(doc(firestore, 'schools', cleanId), schoolData);
    
    if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
      playSound('success');
      toast({title: `School "${cleanId}" created!`});
    }
    return { passcode: newPasscode, cleanId };
  }, [firestore, toast, playSound]);

  const createBackup = useCallback(async () => {
    if (!schoolId) return;
    const createBackupTrigger = httpsCallable(functions, 'createBackupTrigger');
    try {
      await createBackupTrigger({ schoolId });
      playSound('swoosh');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Backup Failed', description: (error as any).message });
    }
  }, [schoolId, toast, playSound, functions]);

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

  const getClassName = useCallback((classId: string) => {
    return (db.classes || []).find((c) => c.id === classId)?.name || 'Unassigned';
  }, [db.classes]);

  const safeUpdate = useCallback(async (update: Record<string, any>) => {
    if (!schoolDocRef) throw new Error("Not logged in");
    try {
      await updateDoc(schoolDocRef, update)
      playSound('success');
    } catch (e) {
      console.error("Update failed:", e);
      toast({ variant: "destructive", title: "Database Error", description: (e as Error).message });
      playSound('error');
      throw e; // Re-throw to be caught by caller if needed
    }
  }, [schoolDocRef, playSound, toast]);
  
const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'history'>) => {
    if (!schoolId || !firestore) return;
    try {
      const newStudent: Student = { ...studentData, id: 's' + Date.now() + Math.random().toString(36).substring(2, 8), history: [] };
      if (db.hasMigratedStudents) {
          await setDoc(doc(firestore, 'schools', schoolId, 'students', newStudent.id), newStudent);
      } else {
          await safeUpdate({ students: arrayUnion(newStudent) });
      }
    } catch (e) { /* error is handled by safeUpdate */ }
}, [schoolId, firestore, db.hasMigratedStudents, safeUpdate]);

const updateStudent = useCallback(async (updatedStudent: Student) => {
    if (!schoolId || !firestore) return;
    try {
      if (db.hasMigratedStudents) {
          await setDoc(doc(firestore, 'schools', schoolId, 'students', updatedStudent.id), updatedStudent);
      } else {
          const newStudents = (db.students || []).map((s) => s.id === updatedStudent.id ? updatedStudent : s);
          await updateDb({ students: newStudents });
      }
      playSound('success');
    } catch(e) {
      toast({variant: 'destructive', title: 'Error updating student', description: (e as Error).message });
    }
}, [schoolId, firestore, db.hasMigratedStudents, db.students, updateDb, playSound, toast]);

const deleteStudent = useCallback(async (studentId: string) => {
    if (!schoolId || !firestore) return;
    try {
      const studentToDelete = (db.students || []).find(s => s.id === studentId);
      if (!studentToDelete) throw new Error("Student not found");
      if (db.hasMigratedStudents) {
          await deleteDoc(doc(firestore, 'schools', schoolId, 'students', studentId));
      } else {
          await safeUpdate({ students: arrayRemove(studentToDelete) });
      }
    } catch (e) { /* error is handled by safeUpdate or toast is shown below */
      if (e instanceof Error && e.message !== "Not logged in") {
        toast({ variant: 'destructive', title: 'Error deleting student', description: e.message });
      }
    }
}, [schoolId, firestore, db.hasMigratedStudents, db.students, safeUpdate, toast]);


const addClass = useCallback(async (classData: Omit<Class, 'id'>) => {
    if ((db.classes || []).some((c) => c.name.toLowerCase() === classData.name.toLowerCase())) {
        toast({variant: 'destructive', title: 'Class with this name already exists.'});
        return;
    }
    try {
      const newClass: Class = { ...classData, id: 'c' + Date.now() };
      if (db.hasMigratedClasses) {
          if (!schoolId || !firestore) return;
          await setDoc(doc(firestore, 'schools', schoolId, 'classes', newClass.id), newClass);
      } else {
          await safeUpdate({ classes: arrayUnion(newClass) });
      }
    } catch (e) { /* error handled by safeUpdate */ }
}, [db.classes, db.hasMigratedClasses, safeUpdate, toast, schoolId, firestore]);

const deleteClass = useCallback(async (classId: string) => {
    if (!schoolId || !firestore || !schoolDocRef) return;
    try {
      const classToDelete = (db.classes || []).find(c => c.id === classId);
      if (!classToDelete) throw new Error("Class not found");

      if (db.hasMigratedClasses) {
          const batch = writeBatch(firestore);
          const studentsQuery = query(collection(firestore, 'schools', schoolId, 'students'), where('classId', '==', classId));
          const studentDocs = await getDocs(studentsQuery);
          studentDocs.forEach(doc => batch.update(doc.ref, { classId: '' }));
          batch.delete(doc(firestore, 'schools', schoolId, 'classes', classId));
          await batch.commit();
          toast({ title: 'Class deleted' });
      } else {
          const newStudents = (db.students || []).map((s) => s.classId === classId ? { ...s, classId: '' } : s);
          await updateDb({ classes: arrayRemove(classToDelete) as any, students: newStudents });
      }
      playSound('success');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error deleting class', description: (e as Error).message });
    }
}, [db, schoolId, firestore, schoolDocRef, updateDb, playSound, toast]);

  
const addTeacher = useCallback(async (teacherData: Omit<Teacher, 'id'>) => {
    if ((db.teachers || []).some((t) => t.name.toLowerCase() === teacherData.name.toLowerCase())) {
        toast({variant: 'destructive', title: 'Teacher with this name already exists.'});
        return;
    }
    try {
      const newTeacher: Teacher = { ...teacherData, id: 't' + Date.now() };
      if (db.hasMigratedTeachers) {
        if (!schoolId || !firestore) return;
        await setDoc(doc(firestore, 'schools', schoolId, 'teachers', newTeacher.id), newTeacher);
      } else {
        await safeUpdate({ teachers: arrayUnion(newTeacher) });
      }
    } catch (e) { /* error handled by safeUpdate */ }
}, [db.teachers, db.hasMigratedTeachers, safeUpdate, toast, schoolId, firestore]);

const deleteTeacher = useCallback(async (teacherId: string) => {
    try {
      const teacherToDelete = (db.teachers || []).find(t => t.id === teacherId);
      if (!teacherToDelete) throw new Error("Teacher not found");

      if (db.hasMigratedTeachers) {
          if (!schoolId || !firestore) return;
          await deleteDoc(doc(firestore, 'schools', schoolId, 'teachers', teacherId));
      } else {
          await safeUpdate({ teachers: arrayRemove(teacherToDelete) });
      }
    } catch (e) {
      if (e instanceof Error && e.message !== "Not logged in") {
        toast({ variant: 'destructive', title: 'Error deleting teacher', description: e.message });
      }
    }
}, [db.teachers, db.hasMigratedTeachers, safeUpdate, schoolId, firestore, toast]);

  const addCategory = useCallback(async (categoryData: { name: string; points: number }) => {
    if ((db.categories || []).map((c) => c.name.toLowerCase()).includes(categoryData.name.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Category already exists.' });
        return;
    }
    const newCategory = { ...categoryData, id: 'cat' + Date.now() };
    try {
      if (schoolId && firestore) {
        await setDoc(doc(firestore, 'schools', schoolId, 'categories', newCategory.id), newCategory);
        playSound('success');
      } else {
        await safeUpdate({ categories: arrayUnion(newCategory) });
      }
      return newCategory;
    } catch(e) { /* error handled by safeUpdate */ }
  }, [db.categories, safeUpdate, toast, schoolId, firestore, playSound]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    try {
      const categoryToDelete = (db.categories || []).find(c => c.id === categoryId);
      if (!categoryToDelete) throw new Error("Category not found");
      
      if (schoolId && firestore) {
        await deleteDoc(doc(firestore, 'schools', schoolId, 'categories', categoryId));
      } else {
        await safeUpdate({ categories: arrayRemove(categoryToDelete) });
      }
      playSound('success');
    } catch(e) { /* error handled by safeUpdate */ }
  }, [db.categories, safeUpdate, schoolId, firestore, playSound]);

const addCoupons = useCallback(async (newCoupons: Coupon[]) => {
    if (!schoolId || !firestore) return;
    try {
      if (db.hasMigratedCoupons) {
          const batch = writeBatch(firestore);
          newCoupons.forEach(coupon => {
              const couponDocRef = doc(firestore, 'schools', schoolId, 'coupons', coupon.id);
              batch.set(couponDocRef, coupon);
          });
          await batch.commit();
      } else {
          await safeUpdate({ coupons: arrayUnion(...newCoupons) });
      }
    } catch(e) { /* error handled by safeUpdate */ }
}, [schoolId, firestore, db.hasMigratedCoupons, safeUpdate]);

const redeemCoupon = useCallback(async (studentId: string, couponCode: string): Promise<{ success: boolean; message: string; value?: number }> => {
    if (!schoolId || !firestore) return { success: false, message: 'Not logged in.' };
    try {
      const coupon = (db.coupons || []).find((c) => c.code.toUpperCase() === couponCode.toUpperCase());
      if (!coupon) throw new Error('Coupon code not found.');
      if (coupon.used) throw new Error('This coupon has already been used.');

      const student = (db.students || []).find((s) => s.id === studentId);
      if (!student) throw new Error('Student not found.');

      const newHistoryItem: HistoryItem = {
          desc: `Redeemed coupon: ${coupon.code} (${coupon.category})`,
          amount: coupon.value,
          date: Date.now(),
      };

      const updatedStudent: Student = {
          ...student,
          points: student.points + coupon.value,
          history: [newHistoryItem, ...student.history],
      };

      const updatedCoupon: Coupon = {
          ...coupon, used: true, usedAt: Date.now(), usedBy: `${student.firstName} ${student.lastName}`,
      };
      
      if (db.hasMigratedStudents) {
        await setDoc(doc(firestore, 'schools', schoolId, 'students', studentId), updatedStudent);
      } else {
        const newStudents = (db.students || []).map(s => s.id === studentId ? updatedStudent : s);
        await updateDb({ students: newStudents });
      }

      if (db.hasMigratedCoupons) {
          await setDoc(doc(firestore, 'schools', schoolId, 'coupons', coupon.id), updatedCoupon);
      } else {
          const newCoupons = (db.coupons || []).map((c) => c.code === coupon.code ? updatedCoupon : c);
          await updateDb({ coupons: newCoupons });
      }

      playSound('redeem');
      return { success: true, message: 'Coupon redeemed!', value: coupon.value };
    } catch (e) {
      playSound('error');
      return { success: false, message: (e as Error).message };
    }
}, [schoolId, firestore, db, updateDb, playSound]);

const redeemPrize = useCallback(async (studentId: string, prize: Prize) => {
    if (!schoolId || !firestore) return;
    try {
      const student = (db.students || []).find((s) => s.id === studentId);
      if (!student && !db.hasMigratedStudents) throw new Error('Student not found.');
      
      let currentStudent = student;
      if (db.hasMigratedStudents) {
          const snap = await getDoc(doc(firestore, 'schools', schoolId, 'students', studentId));
          if (!snap.exists()) throw new Error('Student not found.');
          currentStudent = snap.data() as Student;
      }
      
      if (!currentStudent) throw new Error("Student not found");

      if (currentStudent.points < prize.points) throw new Error("Insufficient points.");

      const newHistoryItem: HistoryItem = {
          desc: `Redeemed Prize: ${prize.name}`,
          amount: -prize.points,
          date: Date.now(),
      };

      const updatedStudent: Student = {
          ...currentStudent,
          points: currentStudent.points - prize.points,
          history: [newHistoryItem, ...currentStudent.history],
      };

      if (db.hasMigratedStudents) {
          await setDoc(doc(firestore, 'schools', schoolId, 'students', studentId), updatedStudent);
      } else {
          const newStudents = (db.students || []).map(s => s.id === studentId ? updatedStudent : s);
          await updateDb({ students: newStudents });
      }
      playSound('redeem'); 
    } catch (e) {
      playSound('error');
      throw e;
    }
}, [schoolId, firestore, db, updateDb, playSound]);


  const setData = useCallback(async (data: Database) => {
    if (!schoolDocRef) return;
    try {
      await createBackup();
      toast({ title: "Pre-Restore Backup Created", description: "A backup of the current state has been saved before importing from file." });
      await setDoc(schoolDocRef, data);
      playSound('success');
    } catch(e) {
      toast({ variant: 'destructive', title: 'Set Data Failed', description: (e as Error).message });
    }
  }, [schoolDocRef, createBackup, toast, playSound]);

  const restoreFromBackup = useCallback(async (backupId: string) => {
    if (!schoolId || !firestore || !schoolDocRef) return;
    try {
      await createBackup();
      toast({ title: "Pre-Restore Backup Created", description: "A backup of the current state has been saved." });

      const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
      const backupSnap = await getDoc(backupDocRef);

      if (backupSnap.exists()) {
          const backupData = backupSnap.data();
          const currentPasscode = db.passcode;
          const restoredDb = { ...backupData, passcode: currentPasscode };
          await setDoc(schoolDocRef, restoredDb);
          playSound('success');
      } else {
          throw new Error('Backup not found');
      }
    } catch (e) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Restore Failed', description: (e as Error).message });
    }
  }, [schoolId, firestore, schoolDocRef, db.passcode, toast, createBackup, playSound]);
  
  const downloadBackup = useCallback(async (backupId: string) => {
    if (!schoolId || !firestore) return;
    try {
      const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
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
      toast({ variant: 'destructive', title: 'Download failed', description: (e as Error).message });
    }
  }, [schoolId, firestore, toast, playSound]);

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

const addPrize = useCallback(async (prizeData: Omit<Prize, 'id'>) => {
  try {
    const newPrize: Prize = { ...prizeData, id: 'p' + Date.now() };
    if (db.hasMigratedPrizes) {
      if (!schoolId || !firestore) return;
      await setDoc(doc(firestore, 'schools', schoolId, 'prizes', newPrize.id), newPrize);
    } else {
      await safeUpdate({ prizes: arrayUnion(newPrize) });
    }
  } catch (e) { /* error handled by safeUpdate */ }
}, [db.hasMigratedPrizes, safeUpdate, schoolId, firestore]);

const updatePrize = useCallback(async (updatedPrize: Prize) => {
    if (!schoolId || !firestore) return;
    try {
      if (db.hasMigratedPrizes) {
          await setDoc(doc(firestore, 'schools', schoolId, 'prizes', updatedPrize.id), updatedPrize);
      } else {
          const newPrizes = (db.prizes || []).map((p) => p.id === updatedPrize.id ? updatedPrize : p);
          await updateDb({ prizes: newPrizes });
      }
      playSound('success');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error updating prize', description: (e as Error).message });
    }
}, [schoolId, firestore, db.hasMigratedPrizes, db.prizes, updateDb, playSound, toast]);

const deletePrize = useCallback(async (prizeId: string) => {
  try {
    const prizeToDelete = (db.prizes || []).find(p => p.id === prizeId);
    if (!prizeToDelete) throw new Error("Prize not found");

    if (db.hasMigratedPrizes) {
      if (!schoolId || !firestore) return;
      await deleteDoc(doc(firestore, 'schools', schoolId, 'prizes', prizeId));
    } else {
      await safeUpdate({ prizes: arrayRemove(prizeToDelete) });
    }
  } catch (e) {
    if (e instanceof Error && e.message !== "Not logged in") {
      toast({ variant: 'destructive', title: 'Error deleting prize', description: e.message });
    }
  }
}, [db.prizes, db.hasMigratedPrizes, safeUpdate, schoolId, firestore, toast]);

const uploadStudents = useCallback(async (csvContent: string): Promise<{success: number, failed: number, errors: string[]}> => {
    if (!firestore || !schoolId || !schoolDocRef) return {success: 0, failed: 0, errors: ["Not logged in."]};

    const lines = csvContent.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length === 0) {
        return {success: 0, failed: 0, errors:['File is empty.']};
    }

    const existingNfcIds = new Set((db.students || []).map(s => s.nfcId));
    let successCount = 0;
    const newStudents: Student[] = [];

    let dataLines = lines;
    if (lines[0].toLowerCase().includes('first')) {
        dataLines = lines.slice(1);
    }

    dataLines.forEach((row, index) => {
        if (!row.trim()) return;
        const delimiter = row.includes(';') ? ';' : ',';
        const values = row.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const [firstName, lastName, studentClassName] = values;

        if (!firstName || !lastName) {
            errors.push(`Row ${index + 2}: Missing first or last name.`);
            return;
        }

        let newNfcId; // Ensure unique NFC ID for each new student
        do {
            newNfcId = Math.floor(10000000 + Math.random() * 90000000).toString();
        } while (existingNfcIds.has(newNfcId));

        const classObj = (db.classes || []).find(c => studentClassName && c.name.toLowerCase() === studentClassName.toLowerCase());

        const newStudent: Student = {
            id: 's' + Date.now() + Math.random().toString(36).substring(2, 8),
            firstName, lastName, nfcId: newNfcId, points: 0,
            classId: classObj?.id || '', history: [],
        };
        newStudents.push(newStudent);
        existingNfcIds.add(newStudent.nfcId);
        successCount++;
    });
    const failedCount = dataLines.length - successCount;

    if (newStudents.length > 0) {
      try {
        if (db.hasMigratedStudents) {
            const batch = writeBatch(firestore);
            newStudents.forEach(student => {
                const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);
                batch.set(studentDocRef, student);
            });
            await batch.commit();
        } else {
            await safeUpdate({ students: arrayUnion(...newStudents) });
        }
        await createBackup();
        toast({ title: "Post-Upload Backup Created", description: "A backup was created after uploading new students." });
      } catch (e) {
        return { success: 0, failed: dataLines.length, errors: [(e as Error).message] };
      }
    }
    
    if (failedCount > 0) playSound('error');
    else playSound('success');
    toast({ title: 'Upload Complete', description: `${successCount} students added, ${failedCount} failed.` });

    return {success: successCount, failed: failedCount, errors};
}, [db, firestore, schoolId, schoolDocRef, toast, createBackup, playSound, safeUpdate]);

const migrateFunction = useCallback(async (schoolId: string, functionName: string) => {
    const callableFunction = httpsCallable(functions, functionName);
    try {
      const result = await callableFunction({ schoolId });
      toast({ title: 'Migration Complete', description: (result.data as any).message });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Migration Failed', description: (error as any).message });
    }
  }, [toast, functions]);

const migrateStudents = (schoolId: string) => migrateFunction(schoolId, 'migrateStudentsToSubcollection');
const migrateClasses = (schoolId: string) => migrateFunction(schoolId, 'migrateClassesToSubcollection');
const migrateTeachers = (schoolId: string) => migrateFunction(schoolId, 'migrateTeachersToSubcollection');
const migratePrizes = (schoolId: string) => migrateFunction(schoolId, 'migratePrizesToSubcollection');
const migrateCoupons = (schoolId: string) => migrateFunction(schoolId, 'migrateCouponsToSubcollection');

const getStudentPointsByCategory = useCallback((studentId: string): Record<string, number> => {
  const student = (db.students || []).find(s => s.id === studentId);
  if (!student) return {};

  return student.history.reduce((acc, item) => {
      const match = item.desc.match(/\(([^)]+)\)/);
      if (item.amount > 0 && match && match[1]) {
          const category = match[1];
          acc[category] = (acc[category] || 0) + item.amount;
      }
      return acc;
  }, {} as Record<string, number>);
}, [db.students]);


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
      isInitialized, isDbLoading, loginState, schoolId, db, syncStatus,
      login, logout, getClassName, setCouponsToPrint, setStudentsToPrint, addStudent, updateStudent,
      deleteStudent, addClass, deleteClass, addTeacher, deleteTeacher, addCategory, deleteCategory,
      addCoupons, redeemCoupon, redeemPrize, createSchool, deleteSchool, updateSchool, setData,
      backups, createBackup, restoreFromBackup, downloadBackup, addPrize, updatePrize, deletePrize,
      uploadStudents,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools, 
      isAutoBackupEnabled, toggleAutoBackup,
      migrateStudents, migrateClasses, migrateTeachers, migratePrizes, migrateCoupons,
      getStudentPointsByCategory,
    }),
    [
      isInitialized, isDbLoading, loginState, schoolId, db, syncStatus,
      login, logout, getClassName, addStudent, updateStudent, deleteStudent,
      addClass, deleteClass, addTeacher, deleteTeacher, addCategory, deleteCategory, addCoupons,
      redeemCoupon, redeemPrize, createSchool, deleteSchool, updateSchool, setData,
      backups, createBackup, restoreFromBackup, downloadBackup, addPrize, updatePrize, deletePrize,
      uploadStudents,
      devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
      isAutoBackupEnabled, toggleAutoBackup,
      migrateStudents, migrateClasses, migrateTeachers, migratePrizes, migrateCoupons,
      getStudentPointsByCategory
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
