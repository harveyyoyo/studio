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
import type { Database, Student, Teacher, Coupon, HistoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PrintSheet } from '@/components/PrintSheet';

// Firebase Imports
import { useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import {
  doc,
  runTransaction,
  setDoc,
  getDoc
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
  getTeacherName: (id: string) => string;
  setCouponsToPrint: (coupons: Coupon[]) => void;
  addStudent: (student: Student) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addTeacher: (teacher: Teacher) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (couponCode: string) => Promise<{success: boolean, message: string}>;
  buyReward: (itemName: string, cost: number) => Promise<{success: boolean, message: string}>;
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

  const currentUser = useMemo(() => {
     if (!currentUserId || !db?.students) return null;
     return db.students.find(s => s.id === currentUserId) ?? null;
  }, [currentUserId, db?.students]);
  
  const currentTeacher = useMemo(() => {
     if (!currentTeacherId || !db?.teachers) return null;
     return db.teachers.find(t => t.id === currentTeacherId) ?? null;
  }, [currentTeacherId, db?.teachers]);


 const addStudent = useCallback(async (newStudent: Student) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            let currentData = schoolSnap.exists() ? schoolSnap.data() : { students: [], teachers: [], categories: [], coupons: [], updatedAt: 0 };
            
            const studentExists = currentData.students.find(s => s.id === newStudent.id || s.nfcId === newStudent.nfcId);
            if(studentExists) {
                toast({ variant: 'destructive', title: 'Student with this ID or NFC ID already exists.'});
                throw new Error("Student exists");
            };

            const newStudents = [...currentData.students, newStudent];
            const newData = { ...currentData, students: newStudents, updatedAt: Date.now() };

            transaction.set(schoolDocRef, newData, { merge: !schoolSnap.exists() });
        });
    } catch (e) {
        console.error('Failed to add student:', e);
        if ((e as Error).message !== "Student exists") {
          toast({ variant: 'destructive', title: 'Error saving student', description: (e as Error).message });
        }
    }
}, [schoolDocRef, firestore, toast]);

const updateStudent = useCallback(async (updatedStudent: Student) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            if (!schoolSnap.exists()) throw new Error("School data not found.");

            const data = schoolSnap.data() as Database;
            const newStudents = data.students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
            const newData = { ...data, students: newStudents, updatedAt: Date.now() };

            transaction.set(schoolDocRef, newData);
        });
    } catch (e) {
        console.error('Failed to update student:', e);
        toast({ variant: 'destructive', title: 'Error updating student', description: (e as Error).message });
    }
}, [schoolDocRef, firestore, toast]);

const deleteStudent = useCallback(async (studentId: string) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            if (!schoolSnap.exists()) return;

            const data = schoolSnap.data() as Database;
            const newStudents = data.students.filter(s => s.id !== studentId);
            const newData = { ...data, students: newStudents, updatedAt: Date.now() };
            
            transaction.set(schoolDocRef, newData);
        });
    } catch (e) {
        console.error('Failed to delete student:', e);
        toast({ variant: 'destructive', title: 'Error deleting student', description: (e as Error).message });
    }
}, [schoolDocRef, firestore, toast]);

const addTeacher = useCallback(async (newTeacher: Teacher) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            let currentData = schoolSnap.exists() ? schoolSnap.data() : { students: [], teachers: [], categories: [], coupons: [], updatedAt: 0 };
            
            const teacherExists = currentData.teachers.find(t => t.name.toLowerCase() === newTeacher.name.toLowerCase());
            if(teacherExists) {
                toast({ variant: 'destructive', title: 'Teacher with this name already exists.'});
                throw new Error("Teacher exists");
            };

            const newTeachers = [...currentData.teachers, newTeacher];
            const newData = { ...currentData, teachers: newTeachers, updatedAt: Date.now() };

            transaction.set(schoolDocRef, newData, { merge: !schoolSnap.exists() });
        });
    } catch (e) {
        console.error('Failed to add teacher:', e);
        if ((e as Error).message !== "Teacher exists") {
          toast({ variant: 'destructive', title: 'Error saving teacher', description: (e as Error).message });
        }
    }
}, [schoolDocRef, firestore, toast]);


const deleteTeacher = useCallback(async (teacherId: string) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            if (!schoolSnap.exists()) return;

            const data = schoolSnap.data() as Database;
            const newTeachers = data.teachers.filter(t => t.id !== teacherId);
            // Unassign students from the deleted teacher
            const newStudents = data.students.map(s => s.teacherId === teacherId ? { ...s, teacherId: '' } : s);
            const newData = { ...data, teachers: newTeachers, students: newStudents, updatedAt: Date.now() };

            transaction.set(schoolDocRef, newData);
        });
    } catch (e) {
        console.error('Failed to delete teacher:', e);
        toast({ variant: 'destructive', title: 'Error deleting teacher', description: (e as Error).message });
    }
}, [schoolDocRef, firestore, toast]);

const addCategory = useCallback(async (newCategory: string) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            let currentData = schoolSnap.exists() ? schoolSnap.data() : { students: [], teachers: [], categories: [], coupons: [], updatedAt: 0 };
            
            if(currentData.categories.map(c => c.toLowerCase()).includes(newCategory.toLowerCase())) {
                toast({ variant: 'destructive', title: 'Category already exists.'});
                throw new Error("Category exists");
            };

            const newCategories = [...currentData.categories, newCategory];
            const newData = { ...currentData, categories: newCategories, updatedAt: Date.now() };
            
            transaction.set(schoolDocRef, newData, { merge: !schoolSnap.exists() });
        });
    } catch (e) {
        console.error('Failed to add category:', e);
        if ((e as Error).message !== "Category exists") {
          toast({ variant: 'destructive', title: 'Error saving category', description: (e as Error).message });
        }
    }
}, [schoolDocRef, firestore, toast]);

const deleteCategory = useCallback(async (categoryName: string) => {
    if (!schoolDocRef || !firestore) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            if (!schoolSnap.exists()) return;

            const data = schoolSnap.data() as Database;
            const newCategories = data.categories.filter(c => c !== categoryName);
            const newData = { ...data, categories: newCategories, updatedAt: Date.now() };

            transaction.set(schoolDocRef, newData);
        });
    } catch (e) {
        console.error('Failed to delete category:', e);
        toast({ variant: 'destructive', title: 'Error deleting category', description: (e as Error).message });
    }
}, [schoolDocRef, firestore, toast]);

const addCoupons = useCallback(async (newCoupons: Coupon[]) => {
    if (!schoolDocRef || !firestore || newCoupons.length === 0) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolSnap = await transaction.get(schoolDocRef);
            let currentData = schoolSnap.exists() ? schoolSnap.data() : { students: [], teachers: [], categories: [], coupons: [], updatedAt: 0 };

            const existingCodes = new Set(currentData.coupons.map(c => c.code));
            const uniqueNewCoupons = newCoupons.filter(c => !existingCodes.has(c.code));

            if(uniqueNewCoupons.length === 0) {
                 toast({ title: 'Generated coupons already exist, retrying...' });
                 // This case is rare but could happen with random code collisions.
                 // A more robust solution would re-generate codes here.
                return;
            };

            const updatedCoupons = [...currentData.coupons, ...uniqueNewCoupons];
            const newData = { ...currentData, coupons: updatedCoupons, updatedAt: Date.now() };

            transaction.set(schoolDocRef, newData, { merge: !schoolSnap.exists() });
        });
    } catch (e) {
        console.error('Failed to add coupons:', e);
        toast({ variant: 'destructive', title: 'Error saving coupons', description: (e as Error).message });
    }
}, [schoolDocRef, firestore, toast]);

  const redeemCoupon = useCallback(async (code: string) => {
      if (!schoolDocRef || !firestore || !currentUser) {
          return {success: false, message: 'Not authenticated'};
      }

      try {
          let foundCouponValue = 0;
          await runTransaction(firestore, async (transaction) => {
              const schoolSnap = await transaction.get(schoolDocRef);
              if (!schoolSnap.exists()) throw new Error('School document does not exist!');
              
              const data = schoolSnap.data() as Database;
              const couponIndex = data.coupons.findIndex(c => c.code === code);

              if (couponIndex === -1) throw new Error('Invalid Coupon Code');
              const coupon = data.coupons[couponIndex];
              if (coupon.used) throw new Error('Coupon already used!');
              
              const studentIndex = data.students.findIndex(s => s.id === currentUser.id);
              if (studentIndex === -1) throw new Error('Current user not found!');

              const updatedCoupons = [...data.coupons];
              updatedCoupons[couponIndex] = { ...coupon, used: true, usedAt: Date.now(), usedBy: currentUser.id };
              
              const student = data.students[studentIndex];
              const newHistoryItem: HistoryItem = { desc: `Redeemed coupon (+${coupon.value})`, amount: coupon.value, date: Date.now() };
              const updatedStudent = { ...student, points: student.points + coupon.value, history: [newHistoryItem, ...student.history] };
              
              const updatedStudents = [...data.students];
              updatedStudents[studentIndex] = updatedStudent;
              
              foundCouponValue = coupon.value;

              transaction.set(schoolDocRef, { ...data, coupons: updatedCoupons, students: updatedStudents, updatedAt: Date.now() });
          });
          return { success: true, message: `+${foundCouponValue} Points Added!` };

      } catch(e: any) {
          console.error("Redeem coupon transaction failed: ", e);
          return { success: false, message: e.message };
      }
  }, [schoolDocRef, firestore, currentUser]);

  const buyReward = useCallback(async (name: string, cost: number) => {
    if (!schoolDocRef || !firestore || !currentUser) {
        return { success: false, message: 'Not authenticated' };
    }
    if (currentUser.points < cost) {
        return { success: false, message: 'Not enough points!' };
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const schoolSnap = await transaction.get(schoolDocRef);
        if (!schoolSnap.exists()) throw new Error('School document does not exist!');

        const data = schoolSnap.data() as Database;
        const studentIndex = data.students.findIndex(s => s.id === currentUser.id);
        if (studentIndex === -1) throw new Error('Current user not found!');

        const student = data.students[studentIndex];
        if (student.points < cost) throw new Error('Not enough points!');
        
        const newHistoryItem: HistoryItem = { desc: `Bought ${name}`, amount: -cost, date: Date.now() };
        const updatedStudent = { ...student, points: student.points - cost, history: [newHistoryItem, ...student.history] };
        
        const updatedStudents = [...data.students];
        updatedStudents[studentIndex] = updatedStudent;

        transaction.set(schoolDocRef, { ...data, students: updatedStudents, updatedAt: Date.now() });
      });
      return { success: true, message: `${name} redeemed!` };
    } catch (e: any) {
      console.error("Buy reward transaction failed: ", e);
      return { success: false, message: e.message };
    }
  }, [schoolDocRef, firestore, currentUser]);

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
      _setSchoolId(sanitizedId);
      localStorage.setItem('schoolId', sanitizedId);
      // Clear session-specific data when switching schools
      sessionStorage.removeItem('currentUserId');
      sessionStorage.removeItem('currentTeacherId');
      sessionStorage.removeItem('isAdmin');
      setCurrentUserId(null);
      setCurrentTeacherId(null);
      setIsAdmin(false);
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
      sessionStorage.clear();
      router.push('/setup');
    }
  }, [router]);

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
    }
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
      return db?.teachers?.find((t) => t.id === id)?.name || 'Unassigned';
    },
    [db?.teachers]
  );

  const value = useMemo(() => ({
      isInitialized: isInitialized && (status !== 'loading' || !!db),
      schoolId,
      db: db || { students: [], teachers: [], categories: [], coupons: [], updatedAt: 0 },
      currentUser,
      currentTeacher,
      isAdmin,
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
    }), [
    isInitialized, status, db, schoolId, currentUser,
    currentTeacher, isAdmin, setSchoolId, changeSchoolId, loginStudent,
    loginTeacher, enterAdmin, logout, getTeacherName, addStudent, updateStudent,
    deleteStudent, addTeacher, deleteTeacher, addCategory, deleteCategory,
    addCoupons, redeemCoupon, buyReward
  ]);

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
