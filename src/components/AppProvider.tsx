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
import type { Database, Student, Teacher, Coupon, HistoryItem } from '@/lib/types';
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
} from 'firebase/firestore';
import { INITIAL_DATA } from '@/lib/data';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
export type LoginState = 'loggedOut' | 'school' | 'developer';

interface AppContextType {
  isInitialized: boolean;
  isDbLoading: boolean;
  loginState: LoginState;
  schoolId: string | null;
  allSchools: string[];
  db: Database;
  syncStatus: SyncStatus;
  login: (
    type: 'school' | 'developer',
    credentials: { schoolId?: string; passcode: string }
  ) => Promise<boolean>;
  logout: () => void;
  getTeacherName: (teacherId: string) => string;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  addStudent: (student: Omit<Student, 'id' | 'history'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number }>;
  createSchool: (schoolId: string) => Promise<string | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchoolPasscode: (schoolId: string, passcode: string) => Promise<void>;
  setData: (data: Database) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_DB: Database = {
  passcode: '',
  students: [],
  teachers: [],
  categories: [],
  coupons: [],
  updatedAt: 0,
};

const REGISTRY_DOC_ID = '__registry__';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('loggedOut');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [db, setDb] = useState<Database>(EMPTY_DB);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

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

  const registryDocRef = useMemo(() => firestore ? doc(firestore, 'schools', REGISTRY_DOC_ID) : null, [firestore]);

  const fetchRegistry = useCallback(async () => {
    if (!registryDocRef) return;
    try {
      const docSnap = await getDoc(registryDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAllSchools(data?.ids || []);
      } else {
        await setDoc(registryDocRef, { ids: [] });
        setAllSchools([]);
      }
    } catch (error) {
      console.error("Error fetching school registry:", error);
      toast({ variant: 'destructive', title: "Could not fetch school list."});
    }
  }, [registryDocRef, toast]);
  
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
      if (state === 'developer') {
        fetchRegistry();
      }
    }
    setIsInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schoolDocRef = useMemo(
    () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId]
  );
  
  const isInitialSnapshot = useRef(true);
  
  useEffect(() => {
    if (!schoolDocRef) {
        setDb(EMPTY_DB);
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
          setDb({ ...EMPTY_DB, ...data });
        } else {
          setDb(EMPTY_DB);
        }
      }, (error) => {
        console.error('Firestore snapshot error:', error);
        setSyncStatus('error');
        setIsDbLoading(false);
      });

    return () => unsubscribe();
  }, [schoolDocRef]);

  const updateDb = useCallback(
    async (newDbState: Database) => {
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
          await fetchRegistry();
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
    [fetchRegistry, firestore]
  );
  
  const logout = useCallback(() => {
    sessionStorage.clear();
    setLoginState('loggedOut');
    setSchoolId(null);
    setDb(EMPTY_DB);
    setAllSchools([]);
    router.push('/');
  }, [router]);
  
  const createSchool = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!registryDocRef || !firestore) return null;
    const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanId) {
        toast({variant: 'destructive', title: "Invalid School ID"});
        return null;
    }
    
    // Check if school already exists
    const currentSchoolsSnap = await getDoc(registryDocRef);
    if(currentSchoolsSnap.exists() && currentSchoolsSnap.data().ids.includes(cleanId)) {
      toast({variant: 'destructive', title: `School ID "${cleanId}" already exists.`});
      return null;
    }
    
    const newPasscode = Math.floor(1000 + Math.random() * 9000).toString();
    const schoolData = { ...INITIAL_DATA, passcode: newPasscode };

    await updateDoc(registryDocRef, { ids: arrayUnion(cleanId) });
    const newSchoolDocRef = doc(firestore, 'schools', cleanId);
    await setDoc(newSchoolDocRef, schoolData);
    
    await fetchRegistry();
    toast({title: `School "${cleanId}" created!`});
    return newPasscode;
  }, [registryDocRef, firestore, fetchRegistry, toast]);
  
  const deleteSchool = useCallback(async (schoolId: string) => {
    if (!registryDocRef || !firestore) return;

    await updateDoc(registryDocRef, { ids: arrayRemove(schoolId) });
    const schoolToDeleteDocRef = doc(firestore, 'schools', schoolId);
    await deleteDoc(schoolToDeleteDocRef);
    
    await fetchRegistry();
    toast({title: `School "${schoolId}" deleted!`});
  }, [registryDocRef, firestore, fetchRegistry, toast]);

  const updateSchoolPasscode = useCallback(async (schoolId: string, passcode: string) => {
    if (!firestore) return;
    const schoolDoc = doc(firestore, 'schools', schoolId);
    await updateDoc(schoolDoc, { passcode });
  }, [firestore]);

  const getTeacherName = useCallback((teacherId: string) => {
    if (!teacherId) {
      return 'Unassigned';
    }
    return db.teachers.find((t) => t.id === teacherId)?.name || 'Unassigned';
  }, [db.teachers]);
  
  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'history'>) => {
    const newStudent: Student = { ...studentData, id: 's' + Date.now(), history: [] };
    const updatedDb = { ...db, students: [...db.students, newStudent] };
    await updateDb(updatedDb);
  }, [db, updateDb]);

  const updateStudent = useCallback(async (updatedStudent: Student) => {
    const newStudents = db.students.map((s) => s.id === updatedStudent.id ? updatedStudent : s);
    const updatedDb = { ...db, students: newStudents };
    await updateDb(updatedDb);
  }, [db, updateDb]);

  const deleteStudent = useCallback(async (studentId: string) => {
    const newStudents = db.students.filter((s) => s.id !== studentId);
    const updatedDb = { ...db, students: newStudents };
    await updateDb(updatedDb);
  }, [db, updateDb]);

  const addTeacher = useCallback(async (teacherData: Omit<Teacher, 'id'>) => {
    if (db.teachers.some((t) => t.name.toLowerCase() === teacherData.name.toLowerCase())) {
        toast({variant: 'destructive', title: 'Teacher with this name already exists.'});
        return;
    }
    const newTeacher: Teacher = { ...teacherData, id: 't' + Date.now() };
    const updatedDb = { ...db, teachers: [...db.teachers, newTeacher] };
    await updateDb(updatedDb);
  }, [db, updateDb, toast]);

  const deleteTeacher = useCallback(async (teacherId: string) => {
    const newTeachers = db.teachers.filter((t) => t.id !== teacherId);
    const newStudents = db.students.map((s) => ({
      ...s,
      teacherId: s.teacherId === teacherId ? '' : s.teacherId,
    }));
    const updatedDb = { ...db, teachers: newTeachers, students: newStudents };
    await updateDb(updatedDb);
  }, [db, updateDb]);

  const addCategory = useCallback(async (newCategory: string) => {
    if (db.categories.map((c) => c.toLowerCase()).includes(newCategory.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Category already exists.' });
        return;
    }
    const updatedDb = { ...db, categories: [...db.categories, newCategory] };
    await updateDb(updatedDb);
  }, [db, updateDb, toast]);

  const deleteCategory = useCallback(async (categoryName: string) => {
    const updatedDb = { ...db, categories: db.categories.filter((c) => c !== categoryName) };
    await updateDb(updatedDb);
  }, [db, updateDb]);

  const addCoupons = useCallback(async (newCoupons: Coupon[]) => {
    const updatedDb = { ...db, coupons: [...db.coupons, ...newCoupons] };
    await updateDb(updatedDb);
  }, [db, updateDb]);

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

    const updatedDb = { ...db, students: newStudents, coupons: newCoupons };
    await updateDb(updatedDb);

    return { success: true, message: 'Coupon redeemed!', value: coupon.value };
  }, [db, updateDb]);
  
  const handlePrintComplete = useCallback(() => {
    setCouponsToPrint([]);
  }, []);


  const value = useMemo(
    () => ({
      isInitialized, isDbLoading, loginState, schoolId, allSchools, db, syncStatus,
      login, logout, getTeacherName, setCouponsToPrint, addStudent, updateStudent,
      deleteStudent, addTeacher, deleteTeacher, addCategory, deleteCategory,
      addCoupons, redeemCoupon, createSchool, deleteSchool, updateSchoolPasscode, setData: updateDb,
    }),
    [
      isInitialized, isDbLoading, loginState, schoolId, allSchools, db, syncStatus,
      login, logout, getTeacherName, addStudent, updateStudent, deleteStudent,
      addTeacher, deleteTeacher, addCategory, deleteCategory, addCoupons,
      redeemCoupon, createSchool, deleteSchool, updateSchoolPasscode, updateDb
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <PrintSheet coupons={couponsToPrint} schoolId={schoolId} onPrintComplete={handlePrintComplete} />
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
