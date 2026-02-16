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
import { doc, setDoc } from 'firebase/firestore';

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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [schoolId, _setSchoolId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  // Memoize the document reference to prevent re-renders
  const schoolDocRef = useMemo(
    () => (schoolId && firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId]
  );

  // useDoc hook for real-time data synchronization
  const { data: db, status } = useDoc<Database>(schoolDocRef);

  // Effect to initialize a new school document in Firestore if it doesn't exist
  useEffect(() => {
    if (status === 'success' && !db && schoolDocRef) {
      console.log(`No data for school "${schoolId}". Creating new record.`);
      const initialDb = { ...INITIAL_DATA, updatedAt: Date.now() };
      setDoc(schoolDocRef, initialDb).then(() => {
        toast({ title: 'New school database created!' });
      });
    }
  }, [status, db, schoolDocRef, toast, schoolId]);

  const saveDb = useCallback(
    (updatedDb: Database) => {
      if (schoolDocRef) {
        const dbWithTimestamp = { ...updatedDb, updatedAt: Date.now() };
        // Persist the changes to Firestore, let the useDoc hook handle the update
        setDoc(schoolDocRef, dbWithTimestamp, { merge: true });
      }
    },
    [schoolDocRef]
  );

  const setSchoolId = (id: string) => {
    const sanitizedId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
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
  };

  const changeSchoolId = () => {
    if (window.confirm('Are you sure? This will log you out.')) {
      _setSchoolId(null);
      setCurrentUser(null);
      setCurrentTeacher(null);
      setIsAdmin(false);
      localStorage.removeItem('schoolId');
      router.push('/setup');
    }
  };

  // Load schoolId from localStorage on initial app load
  useEffect(() => {
    const savedSchoolId = localStorage.getItem('schoolId');
    if (savedSchoolId) {
      _setSchoolId(savedSchoolId);
    }
    setIsInitialized(true);
  }, []);

  // Handle printing logic
  useEffect(() => {
    if (couponsToPrint.length > 0) {
      setTimeout(() => {
        window.print();
        setCouponsToPrint([]);
      }, 500);
    }
  }, [couponsToPrint]);

  const loginStudent = (student: Student) => {
    setCurrentUser(student);
    router.push('/student/kiosk');
  };

  const loginTeacher = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    router.push('/teacher/dashboard');
  };

  const enterAdmin = () => {
    setIsAdmin(true);
    router.push('/admin');
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentTeacher(null);
    setIsAdmin(false);
    router.push('/');
  };

  const getTeacherName = (id: string) => {
    return db?.teachers.find((t) => t.id === id)?.name || 'Unassigned';
  };

  const value = {
    isInitialized: isInitialized && (status === 'success' || (status === 'error' && !!schoolId)),
    schoolId,
    db: db || INITIAL_DATA, // Use live data or fallback to initial data structure
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
  };

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
