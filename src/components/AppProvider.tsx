'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import type {
  Database,
  Student,
  Teacher,
  Coupon,
  HistoryItem,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';
import { useFirestore } from '@/firebase';
import {
  doc,
  setDoc,
  onSnapshot,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { INITIAL_DATA } from '@/lib/data';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface AppContextType {
  isInitialized: boolean;
  schoolId: string | null;
  db: Database;
  currentUser: Student | null;
  currentTeacher: Teacher | null;
  isAdmin: boolean;
  syncStatus: SyncStatus;
  setSchoolId: (id: string) => void;
  changeSchoolId: () => void;
  loginStudent: (student: Student) => void;
  loginTeacher: (teacher: Teacher) => void;
  enterAdmin: () => void;
  logout: () => void;
  getTeacherName: (id: string) => string;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  addStudent: (student: Omit<Student, 'id' | 'history'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (
    couponCode: string
  ) => Promise<{ success: boolean; message: string }>;
  buyReward: (
    itemName: string,
    cost: number
  ) => Promise<{ success: boolean; message: string }>;
  setData: (data: Database) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_DB: Database = {
  students: [],
  teachers: [],
  categories: [],
  coupons: [],
  updatedAt: 0,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [schoolId, _setSchoolId] = useState<string | null>(null);
  const [db, setDb] = useState<Database>(EMPTY_DB);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');

  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    if (firestore) {
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Can happen with multiple tabs open.
        } else if (err.code === 'unimplemented') {
          // Persistence not supported.
        }
      });
    }
  }, [firestore]);

  const schoolDocRef = useMemo(
    () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId]
  );

  useEffect(() => {
    if (!currentUserId || !db.students) {
      setCurrentUser(null);
    } else {
      setCurrentUser(db.students.find((s) => s.id === currentUserId) ?? null);
    }
  }, [currentUserId, db.students]);

  useEffect(() => {
    if (!currentTeacherId || !db.teachers) {
      setCurrentTeacher(null);
    } else {
      setCurrentTeacher(
        db.teachers.find((t) => t.id === currentTeacherId) ?? null
      );
    }
  }, [currentTeacherId, db.teachers]);


  const updateDb = useCallback(
    async (newDbState: Database) => {
      if (!schoolDocRef) return;
      const dbWithTimestamp = { ...newDbState, updatedAt: Date.now() };

      setSyncStatus('syncing');
      try {
        await setDoc(schoolDocRef, dbWithTimestamp);
      } catch (e) {
        setSyncStatus('error');
        toast({
          variant: 'destructive',
          title: 'Sync Error',
          description: 'Could not save changes to the cloud.',
        });
      }
    },
    [schoolDocRef, toast]
  );

  useEffect(() => {
    const savedSchoolId = localStorage.getItem('schoolId');
    if (savedSchoolId) {
      _setSchoolId(savedSchoolId);
      const savedUserId = sessionStorage.getItem('currentUserId');
      if (savedUserId) setCurrentUserId(savedUserId);
      const savedTeacherId = sessionStorage.getItem('currentTeacherId');
      if (savedTeacherId) setCurrentTeacherId(savedTeacherId);
      const savedIsAdmin = sessionStorage.getItem('isAdmin');
      if (savedIsAdmin) setIsAdmin(JSON.parse(savedIsAdmin));
    } else {
      setIsInitialized(true); 
    }
  }, []);
  
  useEffect(() => {
    if (!schoolDocRef) {
      setIsInitialized(true);
      return;
    }
    const unsubscribe = onSnapshot(schoolDocRef,
      (snapshot) => {
        setSyncStatus(snapshot.metadata.fromCache ? 'offline' : 'synced');
        if (snapshot.exists()) {
          setDb(snapshot.data() as Database);
        } else {
          setDoc(schoolDocRef, INITIAL_DATA);
          setDb(INITIAL_DATA);
        }
        setIsInitialized(true);
      },
      (error) => {
        setSyncStatus('error');
        setIsInitialized(true);
      }
    );
    return () => unsubscribe();
  }, [schoolDocRef]);


  const setSchoolId = useCallback(
    (id: string) => {
      const sanitizedId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (sanitizedId.length < 3) {
        toast({
          variant: 'destructive',
          title: 'Invalid ID',
          description: 'School ID must be at least 3 characters long.',
        });
        return;
      }
      if (sanitizedId !== schoolId) {
        sessionStorage.clear();
        setCurrentUserId(null);
        setCurrentTeacherId(null);
        setIsAdmin(false);

        localStorage.setItem('schoolId', sanitizedId);
        _setSchoolId(sanitizedId);
        router.push('/');
      }
    },
    [schoolId, toast, router]
  );

  const changeSchoolId = useCallback(() => {
    if (window.confirm('Are you sure? This will log you out.')) {
      localStorage.removeItem('schoolId');
      sessionStorage.clear();
      window.location.href = '/setup';
    }
  }, []);

  useEffect(() => {
    const handlePrint = () => {
      if (couponsToPrint.length > 0) {
        document.fonts.ready.then(() => {
          setTimeout(() => {
            window.print();
            setCouponsToPrint([]);
          }, 2500);
        });
      }
    };
    handlePrint();
  }, [couponsToPrint]);

  const loginStudent = useCallback(
    (student: Student) => {
      setCurrentUserId(student.id);
      sessionStorage.setItem('currentUserId', student.id);
      router.push('/student/kiosk');
    },
    [router]
  );

  const loginTeacher = useCallback(
    (teacher: Teacher) => {
      setCurrentTeacherId(teacher.id);
      sessionStorage.setItem('currentTeacherId', teacher.id);
      router.push('/teacher/dashboard');
    },
    [router]
  );

  const enterAdmin = useCallback(() => {
    setIsAdmin(true);
    sessionStorage.setItem('isAdmin', 'true');
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    window.location.href = '/';
  }, []);

  const getTeacherName = useCallback(
    (id: string) => {
      return db?.teachers?.find((t) => t.id === id)?.name || 'Unassigned';
    },
    [db?.teachers]
  );

  const addStudent = useCallback(
    async (studentData: Omit<Student, 'id' | 'history'>) => {
      if (
        db.students.some(
          (s) =>
            s.nfcId &&
            studentData.nfcId &&
            s.nfcId.toLowerCase() === studentData.nfcId.toLowerCase()
        )
      ) {
        toast({
          variant: 'destructive',
          title: 'Student with this NFC ID already exists.',
        });
        return;
      }
      const newStudent: Student = {
        ...studentData,
        id: 's' + Date.now(),
        history: [],
      };
      await updateDb({ ...db, students: [...db.students, newStudent] });
    },
    [db, updateDb, toast]
  );

  const updateStudent = useCallback(
    async (updatedStudent: Student) => {
      const newStudents = db.students.map((s) =>
        s.id === updatedStudent.id ? updatedStudent : s
      );
      await updateDb({ ...db, students: newStudents });
    },
    [db, updateDb]
  );

  const deleteStudent = useCallback(
    async (studentId: string) => {
      const newStudents = db.students.filter((s) => s.id !== studentId);
      await updateDb({ ...db, students: newStudents });
    },
    [db, updateDb]
  );

  const addTeacher = useCallback(
    async (teacherData: Omit<Teacher, 'id'>) => {
      if (
        db.teachers.some(
          (t) => t.name.toLowerCase() === teacherData.name.toLowerCase()
        )
      ) {
        toast({
          variant: 'destructive',
          title: 'Teacher with this name already exists.',
        });
        return;
      }
      const newTeacher: Teacher = { ...teacherData, id: 't' + Date.now() };
      await updateDb({ ...db, teachers: [...db.teachers, newTeacher] });
    },
    [db, updateDb, toast]
  );

  const deleteTeacher = useCallback(
    async (teacherId: string) => {
      const newTeachers = db.teachers.filter((t) => t.id !== teacherId);
      const newStudents = db.students.map((s) =>
        s.teacherId === teacherId ? { ...s, teacherId: '' } : s
      );
      await updateDb({ ...db, teachers: newTeachers, students: newStudents });
    },
    [db, updateDb]
  );

  const addCategory = useCallback(
    async (newCategory: string) => {
      if (
        db.categories
          .map((c) => c.toLowerCase())
          .includes(newCategory.toLowerCase())
      ) {
        toast({ variant: 'destructive', title: 'Category already exists.' });
        return;
      }
      const newCategories = [...db.categories, newCategory];
      await updateDb({ ...db, categories: newCategories });
    },
    [db, updateDb, toast]
  );

  const deleteCategory = useCallback(
    async (categoryName: string) => {
      const newCategories = db.categories.filter((c) => c !== categoryName);
      await updateDb({ ...db, categories: newCategories });
    },
    [db, updateDb]
  );

  const addCoupons = useCallback(
    async (newCoupons: Coupon[]) => {
      const existingCodes = new Set(db.coupons.map((c) => c.code));
      const uniqueNewCoupons = newCoupons.filter(
        (c) => !existingCodes.has(c.code)
      );
      if (uniqueNewCoupons.length < newCoupons.length) {
        toast({
          title: 'Some generated coupon codes already existed and were skipped.',
        });
      }
      if (uniqueNewCoupons.length === 0) return;
      await updateDb({ ...db, coupons: [...db.coupons, ...uniqueNewCoupons] });
    },
    [db, updateDb, toast]
  );

  const redeemCoupon = useCallback(
    async (code: string) => {
      if (!currentUser) return { success: false, message: 'Not authenticated' };
      const couponIndex = db.coupons.findIndex((c) => c.code === code);
      if (couponIndex === -1)
        return { success: false, message: 'Invalid Coupon Code' };
      const coupon = db.coupons[couponIndex];
      if (coupon.used)
        return { success: false, message: 'Coupon already used!' };

      const studentIndex = db.students.findIndex(
        (s) => s.id === currentUser.id
      );
      if (studentIndex === -1)
        return { success: false, message: 'Current user not found!' };

      const updatedCoupons = [...db.coupons];
      updatedCoupons[couponIndex] = {
        ...coupon,
        used: true,
        usedAt: Date.now(),
        usedBy: currentUser.id,
      };

      const student = db.students[studentIndex];
      const newHistoryItem: HistoryItem = {
        desc: `Redeemed coupon (+${coupon.value})`,
        amount: coupon.value,
        date: Date.now(),
      };
      const updatedStudent = {
        ...student,
        points: student.points + coupon.value,
        history: [newHistoryItem, ...student.history],
      };

      const updatedStudents = [...db.students];
      updatedStudents[studentIndex] = updatedStudent;

      await updateDb({
        ...db,
        coupons: updatedCoupons,
        students: updatedStudents,
      });
      return { success: true, message: `+${coupon.value} Points Added!` };
    },
    [currentUser, db, updateDb]
  );

  const buyReward = useCallback(
    async (name: string, cost: number) => {
      if (!currentUser) return { success: false, message: 'Not authenticated' };
      if (currentUser.points < cost)
        return { success: false, message: 'Not enough points!' };

      const studentIndex = db.students.findIndex(
        (s) => s.id === currentUser.id
      );
      if (studentIndex === -1)
        return { success: false, message: 'Current user not found!' };

      const student = db.students[studentIndex];
      const newHistoryItem: HistoryItem = {
        desc: `Bought ${name}`,
        amount: -cost,
        date: Date.now(),
      };
      const updatedStudent = {
        ...student,
        points: student.points - cost,
        history: [newHistoryItem, ...student.history],
      };

      const updatedStudents = [...db.students];
      updatedStudents[studentIndex] = updatedStudent;

      await updateDb({ ...db, students: updatedStudents });
      return { success: true, message: `${name} redeemed!` };
    },
    [currentUser, db, updateDb]
  );

  const setData = useCallback(
    async (data: Database) => {
      await updateDb(data);
    },
    [updateDb]
  );

  const value = useMemo(
    () => ({
      isInitialized,
      schoolId,
      db,
      currentUser,
      currentTeacher,
      isAdmin,
      syncStatus,
      setSchoolId,
      changeSchoolId,
      loginStudent,
      loginTeacher,
      enterAdmin,
      logout,
      getTeacherName,
      setCouponsToPrint,
      addStudent,
      updateStudent,
      deleteStudent,
      addTeacher,
      deleteTeacher,
      addCategory,
      deleteCategory,
      addCoupons,
      redeemCoupon,
      buyReward,
      setData,
    }),
    [
      isInitialized,
      schoolId,
      db,
      currentUser,
      currentTeacher,
      isAdmin,
      syncStatus,
      setSchoolId,
      changeSchoolId,
      loginStudent,
      loginTeacher,
      enterAdmin,
      logout,
      getTeacherName,
      addStudent,
      updateStudent,
      deleteStudent,
      addTeacher,
      deleteTeacher,
      addCategory,
      deleteCategory,
      addCoupons,
      redeemCoupon,
      buyReward,
      setData,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <PrintSheet coupons={couponsToPrint} schoolId={schoolId} />
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
