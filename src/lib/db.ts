import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  runTransaction,
  getDoc,
  getDocs,
  query,
  where,
  Firestore,
} from 'firebase/firestore';
import type { Student, Class, Teacher, Category, Prize, Coupon, HistoryItem, Achievement, Badge } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Helper function to remove undefined values from an object
const removeUndefined = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}

/** Evaluates which achievements a student has newly earned based on their current state. */
export const evaluateAchievements = (
  student: Student,
  achievements: Achievement[],
  categories: Category[]
): { achievementId: string; earnedAt: number; bonusPoints: number }[] => {
  const newEarned: { achievementId: string; earnedAt: number; bonusPoints: number }[] = [];
  const existingIds = new Set(student.earnedAchievements?.map(a => a.achievementId) || []);

  for (const ach of achievements) {
    if (existingIds.has(ach.id)) continue;
    if (ach.criteria.type === 'manual') continue;

    let isEarned = false;
    const { type, threshold, categoryId } = ach.criteria;

    if (type === 'points') {
      if (categoryId) {
        // Find category name to check categoryPoints
        const cat = categories.find(c => c.id === categoryId);
        const catName = cat ? cat.name : null;
        if (catName && (student.categoryPoints?.[catName] || 0) >= threshold) {
          isEarned = true;
        }
      } else {
        if (student.points >= threshold) isEarned = true;
      }
    } else if (type === 'lifetimePoints') {
      if ((student.lifetimePoints || 0) >= threshold) isEarned = true;
    } else if (type === 'coupons') {
      // Placeholder for coupons redeemed count if needed. 
      // Manual/Manual check for now.
    }

    if (isEarned) {
      newEarned.push({
        achievementId: ach.id,
        earnedAt: Date.now(),
        bonusPoints: ach.bonusPoints || 0
      });
    }
  }

  return newEarned;
};

/** Returns period keys for a given timestamp (for category-based badges). */
export function getPeriodKeys(now: number): { month: string; semester: string; year: string; all_time: string } {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12
  const month = `${y}-${String(m).padStart(2, '0')}`;
  const semester = m <= 6 ? `${y}-H1` : `${y}-H2`;
  const year = String(y);
  return { month, semester, year, all_time: 'all' };
}

/** Update categoryPointsByPeriod for an award of `points` in `categoryName` at time `now`. */
function applyCategoryPointsByPeriod(
  current: Student['categoryPointsByPeriod'],
  categoryName: string,
  points: number,
  now: number
): Student['categoryPointsByPeriod'] {
  const keys = getPeriodKeys(now);
  const periodKeys = [keys.month, keys.semester, keys.year, keys.all_time];
  const next = { ...current } as Record<string, Record<string, number>>;
  for (const key of periodKeys) {
    if (!next[key]) next[key] = {};
    next[key][categoryName] = (next[key][categoryName] || 0) + points;
  }
  return next;
}

/** Evaluates which (real) badges a student has newly earned based on category points in the relevant period. */
export function evaluateBadges(
  student: Student,
  badges: Badge[],
  categories: Category[]
): { badgeId: string; periodKey: string; earnedAt: number }[] {
  const newEarned: { badgeId: string; periodKey: string; earnedAt: number }[] = [];
  const earnedSet = new Set((student.earnedBadges || []).map(e => `${e.badgeId}:${e.periodKey}`));
  const byPeriod = student.categoryPointsByPeriod || {};
  const now = Date.now();
  const keys = getPeriodKeys(now);

  for (const badge of badges) {
    if (badge.enabled === false) continue;
    const cat = categories.find(c => c.id === badge.categoryId);
    const categoryName = cat?.name;
    if (!categoryName) continue;

    const periodKey = badge.period === 'month' ? keys.month
      : badge.period === 'semester' ? keys.semester
        : badge.period === 'year' ? keys.year
          : 'all';
    const periodPoints = byPeriod[periodKey]?.[categoryName] ?? 0;
    if (periodPoints < badge.pointsRequired) continue;
    if (earnedSet.has(`${badge.id}:${periodKey}`)) continue;

    earnedSet.add(`${badge.id}:${periodKey}`);
    newEarned.push({ badgeId: badge.id, periodKey, earnedAt: now });
  }
  return newEarned;
};

/** Look up a student by scanned ID (document ID, nfcId string, or nfcId number). Used by both student kiosk and prize redemption. */
export const lookupStudentId = async (
  firestore: Firestore,
  schoolId: string,
  idToSubmit: string
): Promise<string | null> => {
  if (!idToSubmit?.trim() || !schoolId) return null;
  const trimmed = idToSubmit.trim();
  const studentsRef = collection(firestore, 'schools', schoolId, 'students');

  const byDocId = await getDoc(doc(firestore, 'schools', schoolId, 'students', trimmed));
  if (byDocId.exists()) return byDocId.id;

  const qStr = query(studentsRef, where('nfcId', '==', trimmed));
  const querySnap = await getDocs(qStr);
  if (!querySnap.empty) return querySnap.docs[0].id;

  const asNum = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
  if (!Number.isNaN(asNum)) {
    const qNum = query(studentsRef, where('nfcId', '==', asNum));
    const numSnap = await getDocs(qNum);
    if (!numSnap.empty) return numSnap.docs[0].id;
  }

  return null;
};

// --- Student Mutations ---
export const addStudent = async (firestore: Firestore, schoolId: string, studentData: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
  const newStudentId = Math.floor(10000000 + Math.random() * 90000000).toString();
  const newStudent: Student = {
    ...studentData,
    id: newStudentId,
    nfcId: studentData.nfcId || newStudentId,
    points: 0,
    lifetimePoints: 0,
    categoryPoints: {},
    categoryPointsByPeriod: {},
    earnedAchievements: [],
    earnedBadges: [],
  };
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
  try {
    await setDoc(studentDocRef, removeUndefined(newStudent));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentDocRef.path,
        operation: 'create',
        requestResourceData: newStudent,
      })
    );
    throw error;
  }
};


export const updateStudent = async (firestore: Firestore, schoolId: string, student: Student) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);

  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentDocRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found");
      }
      const oldStudent = studentDoc.data() as Student;

      const pointsDifference = student.points - oldStudent.points;

      const newLifetimePoints = (oldStudent.lifetimePoints || oldStudent.points) + (pointsDifference > 0 ? pointsDifference : 0);

      const finalStudentData = { ...student, lifetimePoints: newLifetimePoints };

      transaction.update(studentDocRef, removeUndefined(finalStudentData));
    });
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentDocRef.path,
        operation: 'update',
        requestResourceData: student,
      })
    );
    throw error;
  }
};

export const deleteStudent = async (firestore: Firestore, schoolId: string, studentId: string) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  try {
    await deleteDoc(studentDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

// --- Class Mutations ---
export const addClass = async (firestore: Firestore, schoolId: string, classData: Omit<Class, 'id'>) => {
  const newId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newClass: Class = { ...classData, id: newId };
  const classDocRef = doc(firestore, 'schools', schoolId, 'classes', newClass.id);
  try {
    await setDoc(classDocRef, removeUndefined(newClass));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: classDocRef.path,
        operation: 'create',
        requestResourceData: newClass,
      })
    );
    throw error;
  }
};

export const deleteClass = async (firestore: Firestore, schoolId: string, classId: string, students: Student[]) => {
  const batch = writeBatch(firestore);

  const studentsToUpdate = students.filter(s => s.classId === classId);
  studentsToUpdate.forEach(student => {
    const studentRef = doc(firestore, 'schools', schoolId, 'students', student.id);
    batch.update(studentRef, { classId: '' });
  });

  const classRef = doc(firestore, 'schools', schoolId, 'classes', classId);
  batch.delete(classRef);

  try {
    await batch.commit();
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: `schools/${schoolId}/classes`,
        operation: 'write',
      })
    );
    throw error;
  }
};

// --- Teacher Mutations ---
export const addTeacher = async (firestore: Firestore, schoolId: string, teacherData: Omit<Teacher, 'id'>) => {
  const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newTeacher: Teacher = { ...teacherData, id: newId };
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', newTeacher.id);
  try {
    await setDoc(teacherDocRef, removeUndefined(newTeacher));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: teacherDocRef.path,
        operation: 'create',
        requestResourceData: newTeacher,
      })
    );
    throw error;
  }
};

export const updateTeacher = async (firestore: Firestore, schoolId: string, updatedTeacher: Teacher) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', updatedTeacher.id);
  try {
    await updateDoc(teacherDocRef, removeUndefined({ ...updatedTeacher }));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: teacherDocRef.path,
        operation: 'update',
        requestResourceData: updatedTeacher
      })
    );
    throw error;
  }
};

export const deleteTeacher = async (firestore: Firestore, schoolId: string, teacherId: string) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', teacherId);
  try {
    await deleteDoc(teacherDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: teacherDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

// --- Category Mutations ---
export const addCategory = async (firestore: Firestore, schoolId: string, categoryData: { name: string; points: number; color?: string }): Promise<Category> => {
  const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newCategory: Category = { ...categoryData, id: newId, color: categoryData.color || '#cccccc' };
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', newCategory.id);
  try {
    await setDoc(categoryDocRef, removeUndefined(newCategory));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: categoryDocRef.path,
        operation: 'create',
        requestResourceData: newCategory,
      })
    );
    throw error;
  }
  return newCategory;
};

export const updateCategory = async (firestore: Firestore, schoolId: string, updatedCategory: Category) => {
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', updatedCategory.id);
  try {
    await updateDoc(categoryDocRef, removeUndefined({ ...updatedCategory }));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: categoryDocRef.path,
        operation: 'update',
        requestResourceData: updatedCategory
      })
    );
    throw error;
  }
};

export const deleteCategory = async (firestore: Firestore, schoolId: string, categoryId: string) => {
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', categoryId);
  try {
    await deleteDoc(categoryDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: categoryDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

// --- Prize Mutations ---
export const addPrize = async (firestore: Firestore, schoolId: string, prizeData: Omit<Prize, 'id'>) => {
  const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newPrize: Prize = { ...prizeData, id: newId };
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', newPrize.id);
  try {
    await setDoc(prizeDocRef, removeUndefined(newPrize));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: prizeDocRef.path,
        operation: 'create',
        requestResourceData: newPrize,
      })
    );
    throw error;
  }
};

export const updatePrize = async (firestore: Firestore, schoolId: string, updatedPrize: Prize) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', updatedPrize.id);
  try {
    await updateDoc(prizeDocRef, removeUndefined({ ...updatedPrize }));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: prizeDocRef.path,
        operation: 'update',
        requestResourceData: updatedPrize
      })
    );
    throw error;
  }
};

export const deletePrize = async (firestore: Firestore, schoolId: string, prizeId: string) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', prizeId);
  try {
    await deleteDoc(prizeDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: prizeDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

// --- Coupon Mutations ---
export const addCoupons = async (firestore: Firestore, schoolId: string, newCoupons: Coupon[]) => {
  const batch = writeBatch(firestore);
  newCoupons.forEach(coupon => {
    const couponDocRef = doc(firestore, 'schools', schoolId, 'coupons', coupon.id);
    batch.set(couponDocRef, removeUndefined(coupon));
  });
  try {
    await batch.commit();
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: `schools/${schoolId}/coupons`,
        operation: 'write',
      })
    );
    throw error;
  }
};

export const deleteCoupon = async (firestore: Firestore, schoolId: string, couponId: string) => {
  const couponDocRef = doc(firestore, 'schools', schoolId, 'coupons', couponId);
  try {
    await deleteDoc(couponDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: couponDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

export const redeemCoupon = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  couponCode: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
): Promise<{ success: boolean; message: string; value?: number; bonusTotal?: number }> => {
  const couponRef = doc(firestore, 'schools', schoolId, 'coupons', couponCode.toUpperCase());
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const couponDoc = await transaction.get(couponRef);
      if (!couponDoc.exists()) throw new Error('Coupon code not found.');

      const coupon = couponDoc.data() as Coupon;
      const nowTs = Date.now();
      if (coupon.expiresAt && nowTs > coupon.expiresAt) {
        throw new Error('This coupon has expired.');
      }
      if (coupon.used) throw new Error('This coupon has already been used.');

      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) throw new Error("Student not found.");
      const currentStudent = studentDoc.data() as Student;

      const addedValue = coupon.value;
      const newPoints = currentStudent.points + addedValue;
      const newLifetimePoints = (currentStudent.lifetimePoints || 0) + addedValue;
      const categoryPoints = { ...(currentStudent.categoryPoints || {}) };
      const categoryName = coupon.category || 'Coupon';
      categoryPoints[categoryName] = (categoryPoints[categoryName] || 0) + addedValue;

      const now = Date.now();
      const categoryPointsByPeriod = applyCategoryPointsByPeriod(
        currentStudent.categoryPointsByPeriod,
        categoryName,
        addedValue,
        now
      );
      const updatedStudentForBadges: Student = {
        ...currentStudent,
        categoryPoints,
        categoryPointsByPeriod,
      };
      const newBadges = evaluateBadges(updatedStudentForBadges, allBadges, allCategories);
      const earnedBadges = [...(currentStudent.earnedBadges || [])];
      for (const b of newBadges) {
        earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
        const badgeInfo = allBadges.find(x => x.id === b.badgeId);
        const badgeActivityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
        transaction.set(badgeActivityRef, {
          desc: `Badge earned: ${badgeInfo?.name || 'Unknown'}`,
          amount: 0,
          date: b.earnedAt,
        });
      }

      // Evaluate achievements
      const updatedStudentForEval: Student = {
        ...currentStudent,
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        categoryPoints: categoryPoints
      };

      const newAchievements = evaluateAchievements(updatedStudentForEval, allAchievements, allCategories);
      const earnedAchievements = [...(currentStudent.earnedAchievements || [])];
      let bonusTotal = 0;

      for (const ach of newAchievements) {
        earnedAchievements.push({ achievementId: ach.achievementId, earnedAt: ach.earnedAt });
        bonusTotal += ach.bonusPoints;

        // Add history for achievement
        const achInfo = allAchievements.find(a => a.id === ach.achievementId);
        const achievementActivityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
        transaction.set(achievementActivityRef, {
          desc: `Achievement Unlocked: ${achInfo?.name || 'Unknown'}`,
          amount: ach.bonusPoints,
          date: Date.now()
        });
      }

      transaction.update(studentRef, {
        points: newPoints + bonusTotal,
        lifetimePoints: newLifetimePoints + bonusTotal,
        categoryPoints: categoryPoints,
        categoryPointsByPeriod,
        earnedAchievements,
        earnedBadges,
      });

      // Simplified activity log.
      const activityCollectionRef = collection(firestore, 'schools', schoolId, 'students', studentId, 'activities');
      const mainActivityRef = doc(activityCollectionRef);
      transaction.set(mainActivityRef, {
        desc: `Redeemed coupon: ${coupon.code} (${coupon.category})`,
        amount: coupon.value,
        date: Date.now(),
      });

      // Mark coupon as used
      transaction.update(couponRef, {
        used: true,
        usedAt: Date.now(),
        usedBy: studentId,
      });

      return { baseValue: coupon.value, bonusTotal };
    });
    return { success: true, message: "Redeemed successfully", value: result.baseValue, bonusTotal: result.bonusTotal };
  } catch (e: any) {
    if (e.name === 'FirebaseError' && e.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: couponRef.path,
          operation: 'write',
          requestResourceData: { studentId, couponCode },
        })
      );
    }
    return { success: false, message: e.message || 'An unknown error occurred.' };
  }
};

export const awardPointsToStudent = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  points: number,
  description: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
): Promise<{ success: boolean; message: string; bonusTotal?: number }> => {
  if (points <= 0) {
    return { success: false, message: "Points must be a positive number." };
  }
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);

  try {
    let bonusTotal = 0;
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }
      const studentData = studentDoc.data() as Student;

      const newPoints = studentData.points + points;
      const newLifetimePoints = (studentData.lifetimePoints || 0) + points;

      const categoryPointsUpdate = { ...studentData.categoryPoints };
      categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

      const now = Date.now();
      const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
        studentData.categoryPointsByPeriod,
        description,
        points,
        now
      );
      const updatedStudentForBadges: Student = {
        ...studentData,
        categoryPoints: categoryPointsUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
      };
      const newBadges = evaluateBadges(updatedStudentForBadges, allBadges, allCategories);
      const earnedBadges = [...(studentData.earnedBadges || [])];
      for (const b of newBadges) {
        earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
        const badgeInfo = allBadges.find(x => x.id === b.badgeId);
        const badgeActivityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
        transaction.set(badgeActivityRef, {
          desc: `Badge earned: ${badgeInfo?.name || 'Unknown'}`,
          amount: 0,
          date: b.earnedAt,
        });
      }

      // Evaluate achievements
      const updatedStudentForEval: Student = {
        ...studentData,
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        categoryPoints: categoryPointsUpdate
      };

      const newAchievements = evaluateAchievements(updatedStudentForEval, allAchievements, allCategories);
      const earnedAchievements = [...(studentData.earnedAchievements || [])];

      for (const ach of newAchievements) {
        earnedAchievements.push({ achievementId: ach.achievementId, earnedAt: ach.earnedAt });
        bonusTotal += ach.bonusPoints;

        // Add history for achievement
        const achInfo = allAchievements.find(a => a.id === ach.achievementId);
        const achievementActivityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
        transaction.set(achievementActivityRef, {
          desc: `Achievement Unlocked: ${achInfo?.name || 'Unknown'}`,
          amount: ach.bonusPoints,
          date: Date.now()
        });
      }

      transaction.update(studentRef, {
        points: newPoints + bonusTotal,
        lifetimePoints: newLifetimePoints + bonusTotal,
        categoryPoints: categoryPointsUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
        earnedAchievements,
        earnedBadges
      });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, { desc: description, amount: points, date: Date.now() });
    });

    return { success: true, message: bonusTotal > 0 ? `Points awarded! Unlocked ${bonusTotal} bonus points from achievements.` : "Points awarded successfully.", bonusTotal };
  } catch (e: any) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
        requestResourceData: { studentId, points, description },
      })
    );
    return { success: false, message: e.message || 'An unknown error occurred.' };
  }
};

export const awardPointsToMultipleStudents = async (
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  points: number,
  description: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
): Promise<{ success: boolean; message: string; count: number }> => {
  if (points <= 0) {
    return { success: false, message: "Points must be a positive number.", count: 0 };
  }
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: "No students selected.", count: 0 };
  }

  try {
    const studentRefs = studentIds.map(id => doc(firestore, 'schools', schoolId, 'students', id));
    const studentDocs = await Promise.all(studentRefs.map(ref => getDoc(ref)));

    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const studentDoc of studentDocs) {
      if (!studentDoc.exists()) continue;

      const studentData = studentDoc.data() as Student;

      const newPoints = studentData.points + points;
      const newLifetimePoints = (studentData.lifetimePoints || 0) + points;

      const categoryPointsUpdate = { ...studentData.categoryPoints };
      categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

      const now = Date.now();
      const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
        studentData.categoryPointsByPeriod,
        description,
        points,
        now
      );
      const updatedStudentForBadges: Student = {
        ...studentData,
        categoryPoints: categoryPointsUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
      };
      const newBadges = evaluateBadges(updatedStudentForBadges, allBadges, allCategories);
      const earnedBadges = [...(studentData.earnedBadges || [])];
      for (const b of newBadges) {
        earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
        const badgeInfo = allBadges.find(x => x.id === b.badgeId);
        const badgeActivityRef = doc(collection(studentDoc.ref, 'activities'));
        batch.set(badgeActivityRef, {
          desc: `Badge earned: ${badgeInfo?.name || 'Unknown'}`,
          amount: 0,
          date: b.earnedAt,
        });
      }

      // Evaluate achievements
      const updatedStudentForEval: Student = {
        ...studentData,
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        categoryPoints: categoryPointsUpdate
      };

      const newAchievements = evaluateAchievements(updatedStudentForEval, allAchievements, allCategories);
      const earnedAchievements = [...(studentData.earnedAchievements || [])];
      let bonusTotal = 0;

      for (const ach of newAchievements) {
        earnedAchievements.push({ achievementId: ach.achievementId, earnedAt: ach.earnedAt });
        bonusTotal += ach.bonusPoints;

        // Add history for achievement
        const achInfo = allAchievements.find(a => a.id === ach.achievementId);
        const achievementActivityRef = doc(collection(studentDoc.ref, 'activities'));
        batch.set(achievementActivityRef, {
          desc: `Achievement Unlocked: ${achInfo?.name || 'Unknown'}`,
          amount: ach.bonusPoints,
          date: Date.now()
        });
      }

      batch.update(studentDoc.ref, {
        points: newPoints + bonusTotal,
        lifetimePoints: newLifetimePoints + bonusTotal,
        categoryPoints: categoryPointsUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
        earnedAchievements,
        earnedBadges
      });

      const mainActivityRef = doc(collection(studentDoc.ref, 'activities'));
      batch.set(mainActivityRef, { desc: description, amount: points, date: Date.now() });

      processedCount++;
    }

    await batch.commit();

    return { success: true, message: `Successfully awarded points.`, count: processedCount };

  } catch (e: any) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: `schools/${schoolId}/students`,
        operation: 'write',
        requestResourceData: { studentIds, points, description },
      })
    );
    return { success: false, message: e.message || 'An unknown error occurred.', count: 0 };
  }
};

export const deductPointsFromMultipleStudents = async (firestore: Firestore, schoolId: string, studentIds: string[], points: number, reason: string): Promise<{ success: boolean; message: string; count: number; }> => {
  if (points <= 0) {
    return { success: false, message: "Points to deduct must be a positive number.", count: 0 };
  }
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: "No students selected.", count: 0 };
  }

  try {
    const studentRefs = studentIds.map(id => doc(firestore, 'schools', schoolId, 'students', id));
    const studentDocs = await Promise.all(studentRefs.map(ref => getDoc(ref)));

    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const studentDoc of studentDocs) {
      if (!studentDoc.exists()) continue;

      const studentData = studentDoc.data() as Student;

      const newPoints = Math.max(0, studentData.points - points);

      batch.update(studentDoc.ref, { points: newPoints });

      const activityRef = doc(collection(studentDoc.ref, 'activities'));
      batch.set(activityRef, { desc: reason, amount: -points, date: Date.now() });

      processedCount++;
    }

    await batch.commit();

    return { success: true, message: `Successfully deducted points.`, count: processedCount };

  } catch (e: any) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: `schools/${schoolId}/students`,
        operation: 'write',
        requestResourceData: { studentIds, points, reason },
      })
    );
    return { success: false, message: e.message || 'An unknown error occurred.', count: 0 };
  }
}

export const redeemPrize = async (firestore: Firestore, schoolId: string, studentId: string, prize: Prize, quantity: number) => {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);

      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }

      const studentData = studentDoc.data() as Student;
      const totalCost = prize.points * quantity;

      if (studentData.points < totalCost) {
        throw new Error("Not enough points.");
      }

      const newHistoryItem: Omit<HistoryItem, 'id'> = {
        desc: `Redeemed: ${prize.name}${quantity > 1 ? ` (x${quantity})` : ''}`,
        amount: -totalCost,
        date: Date.now(),
        fulfilled: false,
        teacherId: prize.teacherId,
      };

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));

      transaction.update(studentRef, { points: studentData.points - totalCost });
      transaction.set(activityRef, removeUndefined(newHistoryItem));
    });
  } catch (e) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
        requestResourceData: { prizeId: prize.id, quantity },
      })
    );
    throw e;
  }
};

export const togglePrizeFulfillment = async (firestore: Firestore, schoolId: string, studentId: string, activityId: string, fulfilled: boolean) => {
  const activityDocRef = doc(firestore, 'schools', schoolId, 'students', studentId, 'activities', activityId);
  try {
    await updateDoc(activityDocRef, { fulfilled });
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: activityDocRef.path,
        operation: 'update',
        requestResourceData: { fulfilled },
      })
    );
    throw error;
  }
};


export const uploadStudents = async (firestore: Firestore, schoolId: string, csvContent: string, currentStudents: Student[], allClasses: Class[]): Promise<{ success: number, failed: number, errors: string[] }> => {
  const lines = csvContent.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
  const errors: string[] = [];

  if (lines.length === 0) {
    return { success: 0, failed: 0, errors: ['File is empty.'] };
  }

  const existingNfcIds = new Set(currentStudents.map(s => s.nfcId || s.id));
  let successCount = 0;
  const studentsToCreate: Student[] = [];

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

    let newStudentId;
    do {
      newStudentId = Math.floor(10000000 + Math.random() * 90000000).toString();
    } while (existingNfcIds.has(newStudentId));
    existingNfcIds.add(newStudentId);

    const classObj = allClasses.find(c => studentClassName && c.name.toLowerCase() === studentClassName.toLowerCase());

    const newStudent: Student = {
      id: newStudentId,
      nfcId: newStudentId,
      firstName,
      lastName,
      points: 0,
      lifetimePoints: 0,
      classId: classObj?.id || '',
      categoryPoints: {},
      categoryPointsByPeriod: {},
      earnedAchievements: [],
      earnedBadges: [],
    };

    studentsToCreate.push(newStudent);
    successCount++;
  });

  // Chunk batch operations to respect the 500-operation Firestore limit
  if (studentsToCreate.length > 0) {
    const BATCH_LIMIT = 499;
    try {
      for (let i = 0; i < studentsToCreate.length; i += BATCH_LIMIT) {
        const chunk = studentsToCreate.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(firestore);
        for (const student of chunk) {
          const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);
          batch.set(studentDocRef, removeUndefined(student));
        }
        await batch.commit();
      }
    } catch (error) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `schools/${schoolId}/students`,
          operation: 'write',
        })
      );
      throw error;
    }
  }

  const failedCount = dataLines.length - successCount;
  return { success: successCount, failed: failedCount, errors };
};

// --- Achievement Mutations ---
export const addAchievement = async (firestore: Firestore, schoolId: string, achievementData: Omit<Achievement, 'id'>) => {
  const newId = `ach_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newAchievement: Achievement = { ...achievementData, id: newId };
  const achievementDocRef = doc(firestore, 'schools', schoolId, 'achievements', newAchievement.id);
  try {
    await setDoc(achievementDocRef, removeUndefined(newAchievement));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: achievementDocRef.path,
        operation: 'create',
        requestResourceData: newAchievement,
      })
    );
    throw error;
  }
};

export const updateAchievement = async (firestore: Firestore, schoolId: string, achievement: Achievement) => {
  const achievementDocRef = doc(firestore, 'schools', schoolId, 'achievements', achievement.id);
  try {
    await updateDoc(achievementDocRef, removeUndefined({ ...achievement }));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: achievementDocRef.path,
        operation: 'update',
        requestResourceData: achievement,
      })
    );
    throw error;
  }
};

export const deleteAchievement = async (firestore: Firestore, schoolId: string, achievementId: string) => {
  const achievementDocRef = doc(firestore, 'schools', schoolId, 'achievements', achievementId);
  try {
    await deleteDoc(achievementDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: achievementDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

// --- Badge (category-based) Mutations ---
export const addBadge = async (firestore: Firestore, schoolId: string, badgeData: Omit<Badge, 'id'>) => {
  const newId = `badge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newBadge: Badge = { ...badgeData, id: newId, enabled: badgeData.enabled ?? true };
  const badgeDocRef = doc(firestore, 'schools', schoolId, 'badges', newBadge.id);
  try {
    await setDoc(badgeDocRef, removeUndefined(newBadge));

    // After creating a new badge, retro-apply it to all students who already qualify.
    const studentsSnap = await getDocs(collection(firestore, 'schools', schoolId, 'students'));
    if (!studentsSnap.empty) {
      const categoriesSnap = await getDocs(collection(firestore, 'schools', schoolId, 'categories'));
      const categories = categoriesSnap.docs.map(d => d.data() as Category);

      const BATCH_LIMIT = 450;
      let batch = writeBatch(firestore);
      let writeCount = 0;

      for (const studentDoc of studentsSnap.docs) {
        const studentData = studentDoc.data() as Student;
        const newEarned = evaluateBadges(studentData, [newBadge], categories);
        if (!newEarned.length) continue;

        const earnedBadges = [...(studentData.earnedBadges || [])];
        for (const b of newEarned) {
          earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
          const badgeActivityRef = doc(collection(studentDoc.ref, 'activities'));
          batch.set(badgeActivityRef, {
            desc: `Badge earned: ${newBadge.name}`,
            amount: 0,
            date: b.earnedAt,
          });
          writeCount += 2;
        }

        batch.update(studentDoc.ref, { earnedBadges });
        writeCount += 1;

        if (writeCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(firestore);
          writeCount = 0;
        }
      }

      if (writeCount > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: badgeDocRef.path,
        operation: 'create',
        requestResourceData: newBadge,
      })
    );
    throw error;
  }
};

export const updateBadge = async (firestore: Firestore, schoolId: string, badge: Badge) => {
  const badgeDocRef = doc(firestore, 'schools', schoolId, 'badges', badge.id);
  try {
    await updateDoc(badgeDocRef, removeUndefined({ ...badge }));
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: badgeDocRef.path,
        operation: 'update',
        requestResourceData: badge,
      })
    );
    throw error;
  }
};

export const deleteBadge = async (firestore: Firestore, schoolId: string, badgeId: string) => {
  const badgeDocRef = doc(firestore, 'schools', schoolId, 'badges', badgeId);
  try {
    await deleteDoc(badgeDocRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: badgeDocRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
};

export const purgeStudentProgress = async (firestore: Firestore, schoolId: string, studentId: string) => {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found");
      }

      transaction.update(studentRef, {
        points: 0,
        lifetimePoints: 0,
        categoryPoints: {},
        categoryPointsByPeriod: {},
        earnedAchievements: [],
        earnedBadges: [],
      });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, {
        desc: 'Progress purged by admin',
        amount: 0,
        date: Date.now(),
      } as HistoryItem);
    });
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
        requestResourceData: { studentId, action: 'purgeProgress' },
      })
    );
    throw error;
  }
};
