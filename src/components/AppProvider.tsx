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
import type { Database, Student, Teacher, Coupon } from '@/lib/types';
import { INITIAL_DATA } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';

// Firebase Imports
import { useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore';

interface AppContextType {
  isInitialized: boolean;
  schoolId: string | null;
  db: Database;
  currentUser: Student | null;
  currentTeacher: Teacher | null;
  isAdmin: boolean;
  setSchoolId: (id: string) => void;
  changeSchoolId: () => void;
  loginStudent: (student: Student) => void;
  loginTeacher: (teacher: Teacher) => void;
  enterAdmin: () => void;
  logout: () => void;
  saveDb: (updatedDb: Database) => void;
  getTeacherName: (id: string) => string;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  addStudent: (student: Student) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [schoolId, _setSchoolId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const schoolDocRef = useMemo(
    () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId]
  );

  const { data: db, status } = useDoc<Database>(schoolDocRef);

  useEffect(() => {
    if (status === 'success' && !db && schoolDocRef) {
      console.log(`No data for school "${schoolId}". Creating new record.`);
      const initialDb = { ...INITIAL_DATA, updatedAt: Date.now() };
      setDoc(schoolDocRef, initialDb).then(() => {
        toast({ title: 'New school database created!' });
      });
    }
  }, [status, db, schoolDocRef, toast, schoolId]);

  // Generic save, use with caution for arrays to avoid race conditions
  const saveDb = useCallback(
    (updatedDb: Database) => {
      if (schoolDocRef) {
        const dbWithTimestamp = { ...updatedDb, updatedAt: Date.now() };
        setDoc(schoolDocRef, dbWithTimestamp, { merge: true });
      }
    },
    [schoolDocRef]
  );

  const addStudent = useCallback(
    async (newStudent: Student) => {
      if (schoolDocRef) {
        await updateDoc(schoolDocRef, {
          students: arrayUnion(newStudent),
        });
      }
    },
    [schoolDocRef]
  );

  const updateStudent = useCallback(
    async (updatedStudent: Student) => {
      if (schoolDocRef) {
        try {
          await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            if (!schoolSnap.exists()) {
              throw 'Document does not exist!';
            }
            const oldData = schoolSnap.data();
            const newStudents = oldData.students.map((s) =>
              s.id === updatedStudent.id ? updatedStudent : s
            );
            transaction.update(schoolDocRef, { students: newStudents });
          });
        } catch (e) {
          console.error('Transaction failed: ', e);
          toast({
            variant: 'destructive',
            title: 'Update failed',
            description: (e as Error).message,
          });
        }
      }
    },
    [schoolDocRef, firestore, toast]
  );

  const deleteStudent = useCallback(
    async (studentId: string) => {
      if (schoolDocRef) {
        try {
          await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            if (!schoolSnap.exists()) {
              throw 'Document does not exist!';
            }
            const oldData = schoolSnap.data();
            const newStudents = oldData.students.filter(
              (s) => s.id !== studentId
            );
            transaction.update(schoolDocRef, { students: newStudents });
          });
        } catch (e) {
          console.error('Transaction failed: ', e);
          toast({
            variant: 'destructive',
            title: 'Delete failed',
            description: (e as Error).message,
          });
        }
      }
    },
    [schoolDocRef, firestore, toast]
  );

  const setSchoolId = useCallback(
    (id: string) => {
      const sanitizedId = id
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (sanitizedId.length < 3) {
        toast({
          variant: 'destructive',
          title: 'Invalid ID',
          description: 'School ID must be at least 3 characters long.',
        });
        return;
      }
      _setSchoolId(sanitizedId);
      localStorage.setItem('schoolId', sanitizedId);
      router.push('/');
    },
    [router, toast]
  );

  const changeSchoolId = useCallback(() => {
    if (window.confirm('Are you sure? This will log you out.')) {
      _setSchoolId(null);
      setCurrentUserId(null);
      setCurrentTeacherId(null);
      setIsAdmin(false);
      localStorage.removeItem('schoolId');
      router.push('/setup');
    }
  }, [router]);

  useEffect(() => {
    const savedSchoolId = localStorage.getItem('schoolId');
    if (savedSchoolId) {
      _setSchoolId(savedSchoolId);
    }
    const savedUserId = sessionStorage.getItem('currentUserId');
    if (savedUserId) setCurrentUserId(savedUserId);

    const savedTeacherId = sessionStorage.getItem('currentTeacherId');
    if (savedTeacherId) setCurrentTeacherId(savedTeacherId);

    const savedIsAdmin = sessionStorage.getItem('isAdmin');
    if (savedIsAdmin) setIsAdmin(JSON.parse(savedIsAdmin));

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (couponsToPrint.length > 0) {
      setTimeout(() => {
        window.print();
        setCouponsToPrint([]);
      }, 500);
    }
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
    setCurrentUserId(null);
    sessionStorage.removeItem('currentUserId');
    setCurrentTeacherId(null);
    sessionStorage.removeItem('currentTeacherId');
    setIsAdmin(false);
    sessionStorage.removeItem('isAdmin');
    router.push('/');
  }, [router]);

  const getTeacherName = useCallback(
    (id: string) => {
      return db?.teachers.find((t) => t.id === id)?.name || 'Unassigned';
    },
    [db]
  );

  const value = useMemo(() => {
    const currentUser = currentUserId
      ? db?.students.find((s) => s.id === currentUserId) || null
      : null;
    const currentTeacher = currentTeacherId
      ? db?.teachers.find((t) => t.id === currentTeacherId) || null
      : null;

    return {
      isInitialized:
        isInitialized &&
        (status === 'success' || (status === 'error' && !!schoolId)),
      schoolId,
      db: db || INITIAL_DATA,
      currentUser,
      currentTeacher,
      isAdmin,
      setSchoolId,
      changeSchoolId,
      loginStudent,
      loginTeacher,
      enterAdmin,
      logout,
      saveDb,
      getTeacherName,
      setCouponsToPrint,
      addStudent,
      updateStudent,
      deleteStudent,
    };
  }, [
    isInitialized,
    status,
    schoolId,
    db,
    currentUserId,
    currentTeacherId,
    isAdmin,
    setSchoolId,
    changeSchoolId,
    loginStudent,
    loginTeacher,
    enterAdmin,
    logout,
    saveDb,
    getTeacherName,
    addStudent,
    updateStudent,
    deleteStudent,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <PrintSheet coupons={couponsToPrint} />
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