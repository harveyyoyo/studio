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
import type { Student, Class, Teacher, Category, Prize, Coupon, HistoryItem } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
    history: [],
  };
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
  try {
    await setDoc(studentDocRef, newStudent);
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

      transaction.update(studentDocRef, finalStudentData);
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
    await setDoc(classDocRef, newClass);
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
    await setDoc(teacherDocRef, newTeacher);
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
export const addCategory = async (firestore: Firestore, schoolId: string, categoryData: { name: string; points: number }): Promise<Category> => {
  const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newCategory: Category = { ...categoryData, id: newId };
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', newCategory.id);
  try {
    await setDoc(categoryDocRef, newCategory);
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
    await setDoc(prizeDocRef, newPrize);
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
    await updateDoc(prizeDocRef, { ...updatedPrize });
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
    batch.set(couponDocRef, coupon);
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

export const redeemCoupon = async (firestore: Firestore, schoolId: string, studentId: string, couponCode: string): Promise<{ success: boolean; message: string; value?: number }> => {
  const couponRef = doc(firestore, 'schools', schoolId, 'coupons', couponCode.toUpperCase());
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);

  try {
    const couponValue = await runTransaction(firestore, async (transaction) => {
      const couponDoc = await transaction.get(couponRef);

      if (!couponDoc.exists()) throw new Error('Coupon code not found.');

      const coupon = couponDoc.data() as Coupon;
      if (coupon.used) throw new Error('This coupon has already been used.');

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));

      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }
      const currentStudent = studentDoc.data() as Student;

      const newHistoryItem: HistoryItem = {
        desc: `Redeemed coupon: ${coupon.code} (${coupon.category})`,
        amount: coupon.value,
        date: Date.now(),
      };

      const newLifetimePoints = (currentStudent.lifetimePoints || 0) + coupon.value;
      const categoryPoints = currentStudent.categoryPoints || {};
      categoryPoints[coupon.category] = (categoryPoints[coupon.category] || 0) + coupon.value;


      transaction.update(studentRef, {
        points: currentStudent.points + coupon.value,
        lifetimePoints: newLifetimePoints,
        categoryPoints: categoryPoints
      });
      transaction.set(activityRef, newHistoryItem);

      transaction.update(couponRef, {
        used: true,
        usedAt: Date.now(),
        usedBy: studentId,
      });

      return coupon.value;
    });
    return { success: true, message: "Redeemed successfully", value: couponValue };
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

export const redeemPrize = async (firestore: Firestore, schoolId: string, studentId: string, prize: Prize) => {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);

      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }

      const studentData = studentDoc.data() as Student;

      if (studentData.points < prize.points) {
        throw new Error("Not enough points.");
      }

      const newHistoryItem: HistoryItem = {
        desc: `Redeemed: ${prize.name}`,
        amount: -prize.points,
        date: Date.now(),
      };

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));

      transaction.update(studentRef, { points: studentData.points - prize.points });
      transaction.set(activityRef, newHistoryItem);
    });
  } catch (e) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
        requestResourceData: { prizeId: prize.id },
      })
    );
    throw e;
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
      history: []
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
          batch.set(studentDocRef, student);
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
