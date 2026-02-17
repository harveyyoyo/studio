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
import { useFirestore } from '@/firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  enableMultiTabIndexedDbPersistence,
  collection,
  query,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { INITIAL_DATA } from '@/lib/data';

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
    credentials: { schoolId?: string; passcode: string }
  ) => Promise<boolean>;
  logout: () => void;
  getClassName: (classId: string) => string;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  addStudent: (student: Omit<Student, 'id' | 'history'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addClass: (newClass: Omit<Class, 'id'>) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  addTeacher: (newTeacher: Omit<Teacher, 'id'>) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number }>;
  createSchool: (schoolId: string) => Promise<string | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchoolPasscode: (schoolId: string, passcode: string) => Promise<void>;
  setData: (data: Database) => Promise<void>;
  backups: { id: string }[];
  createBackup: () => Promise<void>;
  restoreFromBackup: (backupId: string) => Promise<void>;
  downloadBackup: (backupId: string) => Promise<void>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_DB: Database = {
  passcode: '',
  students: [],
  classes: [],
  teachers: [],
  categories: [],
  coupons: [],
  prizes: [],
  updatedAt: 0,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('loggedOut');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [db, setDb] = useState<Database>(EMPTY_DB);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [backups, setBackups] = useState<{ id: string }[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    if (firestore) {
      enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence failed: another tab is open.');
        } else {
          console.error('Firestore persistence failed:', err.code);
        }
      });
    }
  }, [firestore]);

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

  const schoolDocRef = useMemo(
    () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId]
  );
  
  const isInitialSnapshot = useRef(true);
  
  useEffect(() => {
    if (!schoolDocRef) {
        const defaultDb = { ...EMPTY_DB, ...INITIAL_DATA, passcode: db.passcode };
        setDb(defaultDb);
        setIsDbLoading(false);
        return;
    }
    
    isInitialSnapshot.current = true;
    setIsDbLoading(true);
    setSyncStatus('syncing');

    const unsubscribe = onSnapshot(schoolDocRef, (snapshot) => {
        if (isInitialSnapshot.current) {
            setIsDbLoading(false);
            isInitialSnapshot.current = false;
        }
        setSyncStatus(snapshot.metadata.hasPendingWrites ? 'synced' : 'syncing');
        if (snapshot.exists()) {
          const data = snapshot.data();
          // This is a small migration for older school documents that don't have a `prizes` field.
          if (data.prizes === undefined) {
              data.prizes = INITIAL_DATA.prizes;
          }
          const mergedData = {
            ...EMPTY_DB,
            ...data
          };
          setDb(mergedData);
        } else {
           const defaultDb = { ...EMPTY_DB, ...INITIAL_DATA, passcode: db.passcode };
           setDb(defaultDb);
        }
      }, (error) => {
        console.error('Firestore snapshot error:', error);
        setSyncStatus('error');
        setIsDbLoading(false);
      });

    return () => unsubscribe();
  }, [schoolDocRef, db.passcode]);

  // Fetch backups
  useEffect(() => {
    if (!schoolId || !firestore) {
        setBackups([]);
        return;
    }
    const backupsColRef = collection(firestore, 'schools', schoolId, 'backups');
    const q = query(backupsColRef);

    const getAndSortBackups = async () => {
      try {
        const snapshot = await getDocs(q);
        const backupList = snapshot.docs.map(doc => ({ id: doc.id }));
        backupList.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        const limitedBackups = backupList.slice(0, 10);
        setBackups(limitedBackups);
      } catch (error) {
        console.error("Error fetching backups:", error);
        setBackups([]);
      }
    };

    getAndSortBackups();
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
        toast({ variant: 'destructive', title: 'Sync Error' });
      }
    },
    [schoolDocRef, toast]
  );
  
  const login = useCallback(
    async (type: 'school' | 'developer', credentials: { schoolId?: string; passcode: string }): Promise<boolean> => {
      if (type === 'developer') {
        if (credentials.passcode === '1234') { 
          setLoginState('developer');
          sessionStorage.setItem('loginState', 'developer');
          return true;
        }
      } else if (type === 'school' && credentials.schoolId && firestore) {
          const schoolLoginDocRef = doc(firestore, 'schools', credentials.schoolId);
          try {
            const docSnap = await getDoc(schoolLoginDocRef);
            if (docSnap.exists() && docSnap.data().passcode === credentials.passcode) {
               setSchoolId(credentials.schoolId);
               setLoginState('school');
               sessionStorage.setItem('loginState', 'school');
               sessionStorage.setItem('schoolId', credentials.schoolId);
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
    sessionStorage.clear();
    setLoginState('loggedOut');
    setSchoolId(null);
    setDb(EMPTY_DB);
    router.push('/');
  }, [router]);
  
  const createSchool = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!firestore) return null;
    const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
        toast({variant: 'destructive', title: "Invalid School ID"});
        return null;
    }
    
    const schoolExists = (await getDoc(doc(firestore, 'schools', cleanId))).exists();
    if(schoolExists) {
      toast({variant: 'destructive', title: `School ID "${cleanId}" already exists.`});
      return null;
    }
    
    const newPasscode = Math.floor(1000 + Math.random() * 9000).toString();
    const schoolData = { ...INITIAL_DATA, passcode: newPasscode };
    
    const newSchoolDocRef = doc(firestore, 'schools', cleanId);
    await setDoc(newSchoolDocRef, schoolData);
    
    toast({title: `School "${cleanId}" created!`});
    return newPasscode;
  }, [firestore, toast]);
  
  const deleteSchool = useCallback(async (schoolId: string) => {
    if (!firestore) return;

    // Batch delete subcollections first
    const backupsCollectionRef = collection(firestore, 'schools', schoolId, 'backups');
    const backupsSnapshot = await getDocs(backupsCollectionRef);
    
    const batch = writeBatch(firestore);
    backupsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Then delete the main document
    const schoolToDeleteDocRef = doc(firestore, 'schools', schoolId);
    await deleteDoc(schoolToDeleteDocRef);
    
    toast({title: `School "${schoolId}" deleted!`});
  }, [firestore, toast]);

  const updateSchoolPasscode = useCallback(async (schoolId: string, passcode: string) => {
    if (!firestore) return;
    const schoolDoc = doc(firestore, 'schools', schoolId);
    await updateDoc(schoolDoc, { passcode });
  }, [firestore]);

  const getClassName = useCallback((classId: string) => {
    if (!classId) {
      return 'Unassigned';
    }
    return db.classes?.find((c) => c.id === classId)?.name || 'Unassigned';
  }, [db.classes]);
  
  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'history'>) => {
    const newStudent: Student = { ...studentData, id: 's' + Date.now(), history: [] };
    await updateDb({ students: arrayUnion(newStudent) as any });
  }, [updateDb]);

  const updateStudent = useCallback(async (updatedStudent: Student) => {
    const newStudents = db.students.map((s) => s.id === updatedStudent.id ? updatedStudent : s);
    await updateDb({ students: newStudents });
  }, [db, updateDb]);

  const deleteStudent = useCallback(async (studentId: string) => {
    const studentToDelete = db.students.find(s => s.id === studentId);
    if (!studentToDelete) return;
    await updateDb({ students: arrayRemove(studentToDelete) as any });
  }, [db, updateDb]);

  const addClass = useCallback(async (classData: Omit<Class, 'id'>) => {
    if (db.classes?.some((c) => c.name.toLowerCase() === classData.name.toLowerCase())) {
        toast({variant: 'destructive', title: 'Class with this name already exists.'});
        return;
    }
    const newClass: Class = { ...classData, id: 'c' + Date.now() };
    await updateDb({ classes: arrayUnion(newClass) as any });
  }, [db.classes, updateDb, toast]);

  const deleteClass = useCallback(async (classId: string) => {
    const classToDelete = db.classes?.find(c => c.id === classId);
    if (!classToDelete) return;

    const newStudents = db.students.map((s) => ({
      ...s,
      classId: s.classId === classId ? '' : s.classId,
    }));

    await updateDb({ 
        classes: arrayRemove(classToDelete) as any,
        students: newStudents
    });
  }, [db, updateDb]);
  
  const addTeacher = useCallback(async (teacherData: Omit<Teacher, 'id'>) => {
    if (db.teachers?.some((t) => t.name.toLowerCase() === teacherData.name.toLowerCase())) {
        toast({variant: 'destructive', title: 'Teacher with this name already exists.'});
        return;
    }
    const newTeacher: Teacher = { ...teacherData, id: 't' + Date.now() };
    await updateDb({ teachers: arrayUnion(newTeacher) as any });
  }, [db.teachers, updateDb, toast]);

  const deleteTeacher = useCallback(async (teacherId: string) => {
    const teacherToDelete = db.teachers?.find(c => c.id === teacherId);
    if (!teacherToDelete) return;
    await updateDb({ 
        teachers: arrayRemove(teacherToDelete) as any,
    });
  }, [db, updateDb]);

  const addCategory = useCallback(async (newCategory: string) => {
    if (db.categories.map((c) => c.toLowerCase()).includes(newCategory.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Category already exists.' });
        return;
    }
    await updateDb({ categories: arrayUnion(newCategory) as any });
  }, [db, updateDb, toast]);

  const deleteCategory = useCallback(async (categoryName: string) => {
    await updateDb({ categories: arrayRemove(categoryName) as any });
  }, [updateDb]);

  const addCoupons = useCallback(async (newCoupons: Coupon[]) => {
    await updateDb({ coupons: arrayUnion(...newCoupons) as any });
  }, [updateDb]);

  const redeemCoupon = useCallback(async (studentId: string, couponCode: string): Promise<{ success: boolean; message: string; value?: number }> => {
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === couponCode.toUpperCase());

    if (!coupon) {
      return { success: false, message: 'Coupon code not found.' };
    }
    if (coupon.used) {
      return { success: false, message: 'This coupon has already been used.' };
    }

    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
      return { success: false, message: 'Student not found.' };
    }

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
        ...coupon,
        used: true,
        usedAt: Date.now(),
        usedBy: `${student.firstName} ${student.lastName}`,
    };

    const newStudents = db.students.map((s) => s.id === studentId ? updatedStudent : s);
    const newCoupons = db.coupons.map((c) => c.code === coupon.code ? updatedCoupon : c);

    await updateDb({ students: newStudents, coupons: newCoupons });

    return { success: true, message: 'Coupon redeemed!', value: coupon.value };
  }, [db, updateDb]);
  
  const setData = useCallback(async (data: Database) => {
    if (!schoolDocRef) return;
    await setDoc(schoolDocRef, data);
  }, [schoolDocRef]);

  const createBackup = useCallback(async () => {
    if (!schoolId || !firestore) return;
    
    const backupId = Date.now().toString();
    const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
    
    const { passcode, updatedAt, ...backupData } = db;
    
    await setDoc(backupDocRef, backupData);
  }, [schoolId, firestore, db]);

  const restoreFromBackup = useCallback(async (backupId: string) => {
    if (!schoolId || !firestore || !schoolDocRef) return;

    const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
    const backupSnap = await getDoc(backupDocRef);

    if (backupSnap.exists()) {
        const backupData = backupSnap.data();
        const currentPasscode = db.passcode;
        const restoredDb = { ...backupData, passcode: currentPasscode };
        
        await setDoc(schoolDocRef, restoredDb);
    } else {
        toast({ variant: 'destructive', title: 'Backup not found' });
    }
  }, [schoolId, firestore, schoolDocRef, db.passcode, toast]);
  
  const downloadBackup = useCallback(async (backupId: string) => {
    if (!schoolId || !firestore) return;
    const backupDocRef = doc(firestore, 'schools', schoolId, 'backups', backupId);
    const backupSnap = await getDoc(backupDocRef);

    if (backupSnap.exists()) {
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
        toast({ variant: 'destructive', title: 'Backup not found' });
    }
  }, [schoolId, firestore, toast]);

  const addPrize = useCallback(async (prizeData: Omit<Prize, 'id'>) => {
      const newPrize: Prize = { ...prizeData, id: 'p' + Date.now() };
      await updateDb({ prizes: arrayUnion(newPrize) as any });
  }, [updateDb]);

  const updatePrize = useCallback(async (updatedPrize: Prize) => {
      const newPrizes = db.prizes.map((p) => p.id === updatedPrize.id ? updatedPrize : p);
      await updateDb({ prizes: newPrizes });
  }, [db, updateDb]);

  const deletePrize = useCallback(async (prizeId: string) => {
      const prizeToDelete = db.prizes.find(p => p.id === prizeId);
      if (!prizeToDelete) return;
      await updateDb({ prizes: arrayRemove(prizeToDelete) as any });
  }, [db, updateDb]);

  const printTriggered = useRef(false);

  useEffect(() => {
    if (couponsToPrint.length > 0 && !printTriggered.current) {
      printTriggered.current = true;
      const handleAfterPrint = () => {
        setCouponsToPrint([]);
        printTriggered.current = false;
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      
      document.fonts.load('38pt "Libre Barcode 39 Text"').finally(() => {
          window.print();
      });
    }
  }, [couponsToPrint]);

  const value = useMemo(
    () => ({
      isInitialized, isDbLoading, loginState, schoolId, db, syncStatus,
      login, logout, getClassName, setCouponsToPrint, addStudent, updateStudent,
      deleteStudent, addClass, deleteClass, addTeacher, deleteTeacher, addCategory, deleteCategory,
      addCoupons, redeemCoupon, createSchool, deleteSchool, updateSchoolPasscode, setData,
      backups, createBackup, restoreFromBackup, downloadBackup, addPrize, updatePrize, deletePrize,
    }),
    [
      isInitialized, isDbLoading, loginState, schoolId, db, syncStatus,
      login, logout, getClassName, addStudent, updateStudent, deleteStudent,
      addClass, deleteClass, addTeacher, deleteTeacher, addCategory, deleteCategory, addCoupons,
      redeemCoupon, createSchool, deleteSchool, updateSchoolPasscode, setData,
      backups, createBackup, restoreFromBackup, downloadBackup, addPrize, updatePrize, deletePrize
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {couponsToPrint.length > 0 && <PrintSheet coupons={couponsToPrint} schoolId={schoolId} />}
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
