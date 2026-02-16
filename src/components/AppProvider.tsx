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

  useEffect(() => {
    if (status === 'success' && !db && schoolDocRef) {
      console.log(`No data for school "${schoolId}". Creating new record.`);
      const initialDb = { ...INITIAL_DATA, updatedAt: Date.now() };
      setDoc(schoolDocRef, initialDb).then(() => {
        toast({ title: 'New school database created!' });
      });
    }
  }, [status, db, schoolDocRef, toast, schoolId]);


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

  const addTeacher = useCallback(async (teacher: Teacher) => {
    if (schoolDocRef) {
      await updateDoc(schoolDocRef, { teachers: arrayUnion(teacher) });
    }
  }, [schoolDocRef]);

  const deleteTeacher = useCallback(async (teacherId: string) => {
    if (schoolDocRef && firestore) {
      await runTransaction(firestore, async (transaction) => {
        const schoolSnap = await transaction.get(schoolDocRef);
        if (!schoolSnap.exists()) throw 'Document does not exist!';
        const data = schoolSnap.data();
        const newTeachers = data.teachers.filter(t => t.id !== teacherId);
        transaction.update(schoolDocRef, { teachers: newTeachers });
      });
    }
  }, [schoolDocRef, firestore]);

  const addCategory = useCallback(async (category: string) => {
    if (schoolDocRef) {
      await updateDoc(schoolDocRef, { categories: arrayUnion(category) });
    }
  }, [schoolDocRef]);
  
  const deleteCategory = useCallback(async (categoryName: string) => {
    if (schoolDocRef && firestore) {
      await runTransaction(firestore, async (transaction) => {
        const schoolSnap = await transaction.get(schoolDocRef);
        if (!schoolSnap.exists()) throw 'Document does not exist!';
        const data = schoolSnap.data();
        const newCategories = data.categories.filter(c => c !== categoryName);
        transaction.update(schoolDocRef, { categories: newCategories });
      });
    }
  }, [schoolDocRef, firestore]);

  const addCoupons = useCallback(async (coupons: Coupon[]) => {
    if(schoolDocRef) {
        await updateDoc(schoolDocRef, { coupons: arrayUnion(...coupons) });
    }
  }, [schoolDocRef]);

  const currentUser = useMemo(() => currentUserId
      ? db?.students.find((s) => s.id === currentUserId) || null
      : null, [db, currentUserId]);

  const redeemCoupon = useCallback(async (code: string) => {
      if (!schoolDocRef || !firestore || !currentUser) {
          return {success: false, message: 'Not authenticated'};
      }

      try {
          let foundCouponValue = 0;
          await runTransaction(firestore, async (transaction) => {
              const schoolSnap = await transaction.get(schoolDocRef);
              if (!schoolSnap.exists()) throw 'School document does not exist!';
              
              const data = schoolSnap.data();
              const couponIndex = data.coupons.findIndex(c => c.code === code);

              if (couponIndex === -1) {
                  throw new Error('Invalid Coupon Code');
              }
              
              const coupon = data.coupons[couponIndex];
              if (coupon.used) {
                  throw new Error('Coupon already used!');
              }
              
              const studentIndex = data.students.findIndex(s => s.id === currentUser.id);
              if (studentIndex === -1) {
                  throw new Error('Current user not found!');
              }

              // Modify coupon
              const updatedCoupons = [...data.coupons];
              updatedCoupons[couponIndex] = { ...coupon, used: true };
              
              // Modify student
              const student = data.students[studentIndex];
              const newHistoryItem: HistoryItem = {
                  desc: `Redeemed (+${coupon.value})`,
                  amount: coupon.value,
                  date: Date.now(),
              };
              const updatedStudent = {
                  ...student,
                  points: student.points + coupon.value,
                  history: [newHistoryItem, ...student.history]
              }
              const updatedStudents = [...data.students];
              updatedStudents[studentIndex] = updatedStudent;
              
              foundCouponValue = coupon.value;

              transaction.update(schoolDocRef, { 
                  coupons: updatedCoupons, 
                  students: updatedStudents 
              });
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
        if (!schoolSnap.exists()) throw 'School document does not exist!';

        const data = schoolSnap.data();
        const studentIndex = data.students.findIndex(s => s.id === currentUser.id);
        if (studentIndex === -1) {
            throw new Error('Current user not found!');
        }

        const student = data.students[studentIndex];
        if (student.points < cost) { // Double check inside transaction
            throw new Error('Not enough points!');
        }
        
        const newHistoryItem: HistoryItem = {
          desc: `Bought ${name}`,
          amount: -cost,
          date: Date.now(),
        };

        const updatedStudent = {
            ...student,
            points: student.points - cost,
            history: [newHistoryItem, ...student.history]
        };

        const updatedStudents = [...data.students];
        updatedStudents[studentIndex] = updatedStudent;

        transaction.update(schoolDocRef, { students: updatedStudents });
      });
      return { success: true, message: `${name} redeemed!` };
    } catch (e: any) {
      console.error("Buy reward transaction failed: ", e);
      return { success: false, message: e.message };
    }
  }, [schoolDocRef, firestore, currentUser]);

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
    router.push('/admin');
  }, [router]);

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
    };
  }, [
    isInitialized,
    status,
    schoolId,
    db,
    currentUser,
    currentTeacherId,
    isAdmin,
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
