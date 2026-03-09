'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import type { Student, Class, Coupon, Teacher, Prize, Category, Achievement, HistoryItem } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  addCategory as dbAddCategory, deleteCategory as dbDeleteCategory, updateCategory as dbUpdateCategory,
  addCoupons as dbAddCoupons, redeemCoupon as dbRedeemCoupon,
  redeemPrize as dbRedeemPrize, addPrize as dbAddPrize,
  updatePrize as dbUpdatePrize, deletePrize as dbDeletePrize,
  addStudent as dbAddStudent, updateStudent as dbUpdateStudent,
  deleteStudent as dbDeleteStudent, addClass as dbAddClass,
  deleteClass as dbDeleteClass, addTeacher as dbAddTeacher, updateTeacher as dbUpdateTeacher, deleteTeacher as dbDeleteTeacher, uploadStudents as dbUploadStudents,
  addAchievement as dbAddAchievement, updateAchievement as dbUpdateAchievement, deleteAchievement as dbDeleteAchievement,
  awardPointsToStudent as dbAwardPointsToStudent,
  awardPointsToMultipleStudents as dbAwardPointsToMultipleStudents,
  deductPointsFromMultipleStudents as dbDeductPointsFromMultipleStudents,
  togglePrizeFulfillment as dbTogglePrizeFulfillment,
} from '@/lib/db';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { PrintProvider, usePrint } from './providers/PrintProvider';
import { BackupProvider, useBackup } from './providers/BackupProvider';
import { SettingsProvider } from './providers/SettingsProvider';

// Re-export types from AuthProvider for backward compatibility
export type { SyncStatus, LoginState } from './providers/AuthProvider';

interface AppContextType {
  // ... existing types

  // Auth
  isInitialized: boolean;
  isUserLoading: boolean;
  loginState: 'loggedOut' | 'school' | 'developer' | 'student' | 'teacher' | 'admin';
  isAdmin: boolean;
  isTeacher: boolean;
  userName: string | null;
  userId: string | null;
  schoolId: string | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  login: (type: 'school' | 'developer' | 'student' | 'teacher' | 'admin', credentials: { schoolId?: string; passcode?: string; username?: string; teacherName?: string }) => Promise<boolean>;
  logout: () => void;
  setUserName: (name: string | null) => void;
  isKioskLocked: boolean;
  setIsKioskLocked: (locked: boolean) => void;
  // Print
  setCouponsToPrint: (coupons: Coupon[]) => void;
  setStudentsToPrint: (data: { students: Student[], classes: Class[] }) => void;
  // CRUD
  addStudent: (student: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  addClass: (newClass: Omit<Class, 'id'>) => Promise<void>;
  deleteClass: (classId: string, students: Student[]) => Promise<void>;
  addTeacher: (newTeacher: Omit<Teacher, 'id'>) => Promise<void>;
  updateTeacher: (teacher: Teacher) => Promise<void>;
  deleteTeacher: (teacherId: string) => Promise<void>;
  addCategory: (category: { name: string; points: number; color?: string; }) => Promise<Category | undefined>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addCoupons: (coupons: Coupon[]) => Promise<void>;
  redeemCoupon: (studentId: string, couponCode: string) => Promise<{ success: boolean; message: string; value?: number }>;
  awardPoints: (studentId: string, points: number, description: string) => Promise<{ success: boolean; message: string; bonusTotal?: number }>;
  awardPointsToMultipleStudents: (studentIds: string[], points: number, description: string) => Promise<{ success: boolean; message: string; count: number }>;
  deductPointsFromMultipleStudents: (studentIds: string[], points: number, reason: string) => Promise<{ success: boolean; message: string; count: number; }>;
  redeemPrize: (studentId: string, prize: Prize, quantity: number) => Promise<void>;
  addPrize: (prize: Omit<Prize, 'id'>) => Promise<void>;
  updatePrize: (prize: Prize) => Promise<void>;
  deletePrize: (prizeId: string) => Promise<void>;
  uploadStudents: (csvContent: string, currentStudents: Student[], allClasses: Class[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  addAchievement: (achievement: Omit<Achievement, 'id'>) => Promise<void>;
  updateAchievement: (achievement: Achievement) => Promise<void>;
  deleteAchievement: (achievementId: string) => Promise<void>;
  togglePrizeFulfillment: (studentId: string, activityId: string, fulfilled: boolean) => Promise<void>;
  // Backup/School management
  createSchool: (schoolId: string, name?: string, passcode?: string) => Promise<{ passcode: string; cleanId: string } | null>;
  deleteSchool: (schoolId: string) => Promise<void>;
  updateSchool: (schoolId: string, updates: { name?: string; passcode?: string }) => Promise<void>;
  devCreateBackup: (schoolId: string) => Promise<void>;
  devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
  devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
  devBackupAllSchools: () => Promise<void>;
  devVerifyBackup: (schoolId: string, backupId: string) => Promise<{ verified: boolean; reason: string }>;
  devMigrateSchoolData: (schoolId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

/**
 * Inner component that merges all provider values into one context for backward‑compat.
 * This avoids changing every consumer in the codebase right now.
 */
function AppContextBridge({ children }: { children: React.ReactNode }) {
  const authCtx = useAuth();
  const printCtx = usePrint();
  const backupCtx = useBackup();
  const { firestore } = useFirebase();
  const schoolId = authCtx.schoolId;

  // CRUD wrappers — delegate straight to db.ts
  const addStudent_ = useCallback((s: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddStudent(firestore, schoolId, s);
  }, [firestore, schoolId]);

  const updateStudent_ = useCallback((s: Student) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateStudent(firestore, schoolId, s);
  }, [firestore, schoolId]);

  const deleteStudent_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteStudent(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const addClass_ = useCallback((c: Omit<Class, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddClass(firestore, schoolId, c);
  }, [firestore, schoolId]);

  const deleteClass_ = useCallback((id: string, students: Student[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteClass(firestore, schoolId, id, students);
  }, [firestore, schoolId]);

  const addTeacher_ = useCallback((t: Omit<Teacher, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddTeacher(firestore, schoolId, t);
  }, [firestore, schoolId]);

  const updateTeacher_ = useCallback((t: Teacher) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateTeacher(firestore, schoolId, t);
  }, [firestore, schoolId]);

  const deleteTeacher_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteTeacher(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const addCategory_ = useCallback(async (data: { name: string; points: number; color?: string }) => {
    if (!firestore || !schoolId) return undefined;
    return dbAddCategory(firestore, schoolId, data);
  }, [firestore, schoolId]);

  const updateCategory_ = useCallback(async (category: Category) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateCategory(firestore, schoolId, category);
  }, [firestore, schoolId]);

  const deleteCategory_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteCategory(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const addCoupons_ = useCallback((coupons: Coupon[]) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddCoupons(firestore, schoolId, coupons);
  }, [firestore, schoolId]);

  const redeemCoupon_ = useCallback(async (studentId: string, code: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.' };
    return dbRedeemCoupon(firestore, schoolId, studentId, code);
  }, [firestore, schoolId]);

  const awardPoints_ = useCallback(async (studentId: string, points: number, description: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.' };
    return dbAwardPointsToStudent(firestore, schoolId, studentId, points, description);
  }, [firestore, schoolId]);

  const awardPointsToMultipleStudents_ = useCallback(async (studentIds: string[], points: number, description: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.', count: 0 };
    return dbAwardPointsToMultipleStudents(firestore, schoolId, studentIds, points, description);
  }, [firestore, schoolId]);

  const deductPointsFromMultipleStudents_ = useCallback(async (studentIds: string[], points: number, reason: string) => {
    if (!firestore || !schoolId) return { success: false, message: 'Not logged in.', count: 0 };
    return dbDeductPointsFromMultipleStudents(firestore, schoolId, studentIds, points, reason);
  }, [firestore, schoolId]);

  const redeemPrize_ = useCallback(async (studentId: string, prize: Prize, quantity: number) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbRedeemPrize(firestore, schoolId, studentId, prize, quantity);
  }, [firestore, schoolId]);

  const addPrize_ = useCallback((p: Omit<Prize, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddPrize(firestore, schoolId, p);
  }, [firestore, schoolId]);

  const updatePrize_ = useCallback((p: Prize) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdatePrize(firestore, schoolId, p);
  }, [firestore, schoolId]);

  const deletePrize_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeletePrize(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const uploadStudents_ = useCallback((csv: string, curr: Student[], classes: Class[]) => {
    if (!firestore || !schoolId) return Promise.resolve({ success: 0, failed: 0, errors: ["Not logged in."] });
    return dbUploadStudents(firestore, schoolId, csv, curr, classes);
  }, [firestore, schoolId]);

  const addAchievement_ = useCallback((a: Omit<Achievement, 'id'>) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbAddAchievement(firestore, schoolId, a);
  }, [firestore, schoolId]);

  const updateAchievement_ = useCallback((a: Achievement) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbUpdateAchievement(firestore, schoolId, a);
  }, [firestore, schoolId]);

  const deleteAchievement_ = useCallback((id: string) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbDeleteAchievement(firestore, schoolId, id);
  }, [firestore, schoolId]);

  const togglePrizeFulfillment_ = useCallback(async (studentId: string, activityId: string, fulfilled: boolean) => {
    if (!firestore || !schoolId) return Promise.reject("Not logged into a school.");
    return dbTogglePrizeFulfillment(firestore, schoolId, studentId, activityId, fulfilled);
  }, [firestore, schoolId]);

  const value = useMemo(() => ({
    // Auth
    ...authCtx,
    isAdmin: authCtx.isAdmin,
    isTeacher: authCtx.isTeacher,
    // Print
    ...printCtx,
    // CRUD
    addStudent: addStudent_, updateStudent: updateStudent_, deleteStudent: deleteStudent_,
    addClass: addClass_, deleteClass: deleteClass_,
    addTeacher: addTeacher_, updateTeacher: updateTeacher_, deleteTeacher: deleteTeacher_,
    addCategory: addCategory_, updateCategory: updateCategory_, deleteCategory: deleteCategory_,
    addCoupons: addCoupons_, redeemCoupon: redeemCoupon_, awardPoints: awardPoints_,
    awardPointsToMultipleStudents: awardPointsToMultipleStudents_,
    deductPointsFromMultipleStudents: deductPointsFromMultipleStudents_,
    redeemPrize: redeemPrize_,
    addPrize: addPrize_, updatePrize: updatePrize_, deletePrize: deletePrize_,
    uploadStudents: uploadStudents_,
    addAchievement: addAchievement_, updateAchievement: updateAchievement_, deleteAchievement: deleteAchievement_,
    togglePrizeFulfillment: togglePrizeFulfillment_,
    // Backup
    ...backupCtx,
  }), [
    authCtx, printCtx, backupCtx,
    addStudent_, updateStudent_, deleteStudent_,
    addClass_, deleteClass_, addTeacher_, updateTeacher_, deleteTeacher_,
    addCategory_, updateCategory_, deleteCategory_, addCoupons_,
    redeemCoupon_, awardPoints_, awardPointsToMultipleStudents_, deductPointsFromMultipleStudents_,
    redeemPrize_, addPrize_, updatePrize_, deletePrize_,
    uploadStudents_,
    addAchievement_, updateAchievement_, deleteAchievement_,
    togglePrizeFulfillment_,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PrintProvider>
          <BackupProvider>
            <AppContextBridge>
              {children}
            </AppContextBridge>
          </BackupProvider>
        </PrintProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
