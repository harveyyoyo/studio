'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Database, Student, Teacher, Coupon } from '@/lib/types';
import { INITIAL_DATA } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';

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
  const [db, setDb] = useState<Database>(INITIAL_DATA);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);

  const router = useRouter();
  const { toast } = useToast();

  const saveDb = useCallback(
    (updatedDb: Database) => {
      const dbWithTimestamp = { ...updatedDb, updatedAt: Date.now() };
      setDb(dbWithTimestamp);
      if (schoolId) {
        localStorage.setItem(
          `schoolArcadeDB_${schoolId}`,
          JSON.stringify(dbWithTimestamp)
        );
      }
      // Firebase sync logic would go here
    },
    [schoolId]
  );

  const loadLocalData = useCallback((id: string) => {
    const stored = localStorage.getItem(`schoolArcadeDB_${id}`);
    if (stored) {
      setDb(JSON.parse(stored));
    } else {
      saveDb(INITIAL_DATA);
    }
  }, [saveDb]);

  const setSchoolId = (id: string) => {
    const sanitizedId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (sanitizedId.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Invalid ID',
        description: 'School ID must be at least 3 characters.',
      });
      return;
    }
    _setSchoolId(sanitizedId);
    localStorage.setItem('schoolId', sanitizedId);
    loadLocalData(sanitizedId);
    router.push('/');
  };

  const changeSchoolId = () => {
    if (
      window.confirm(
        'Are you sure you want to switch to a different School ID?'
      )
    ) {
      localStorage.removeItem('schoolId');
      _setSchoolId(null);
      setCurrentUser(null);
      setCurrentTeacher(null);
      setIsAdmin(false);
      router.push('/setup');
    }
  };

  useEffect(() => {
    const savedSchoolId = localStorage.getItem('schoolId');
    if (savedSchoolId) {
      _setSchoolId(savedSchoolId);
      loadLocalData(savedSchoolId);
    }
    setIsInitialized(true);
  }, [loadLocalData]);
  
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
  }

  const logout = () => {
    setCurrentUser(null);
    setCurrentTeacher(null);
    setIsAdmin(false);
    router.push('/');
  };

  const getTeacherName = (id: string) => {
    return db.teachers.find(t => t.id === id)?.name || 'Unassigned';
  }

  const value = {
    isInitialized,
    schoolId,
    db,
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
