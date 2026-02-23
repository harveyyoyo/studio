import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  collection,
  writeBatch,
  query,
  where,
  getDocs,
  runTransaction,
  Firestore,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { Student, Class, Teacher, Category, Prize, Coupon, HistoryItem } from './types';

// --- Student Mutations ---
export const addStudent = (firestore: Firestore, schoolId: string, studentData: Omit<Student, 'id'>) => {
  const newId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newStudent: Student = { ...studentData, id: newId };
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
  return setDoc(studentDocRef, newStudent);
};

export const updateStudent = (firestore: Firestore, schoolId: string, updatedStudent: Student) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', updatedStudent.id);
  return updateDoc(studentDocRef, { ...updatedStudent });
};

export const deleteStudent = (firestore: Firestore, schoolId: string, studentId: string) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  return deleteDoc(studentDocRef);
};

// --- Class Mutations ---
export const addClass = (firestore: Firestore, schoolId: string, classData: Omit<Class, 'id'>) => {
    const newId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newClass: Class = { ...classData, id: newId };
    const classDocRef = doc(firestore, 'schools', schoolId, 'classes', newClass.id);
    return setDoc(classDocRef, newClass);
};

export const deleteClass = async (firestore: Firestore, schoolId: string, classId: string, students: Student[]) => {
    const batch = writeBatch(firestore);
    
    // Find students in this class and unassign them
    const studentsToUpdate = students.filter(s => s.classId === classId);
    studentsToUpdate.forEach(student => {
        const studentRef = doc(firestore, 'schools', schoolId, 'students', student.id);
        batch.update(studentRef, { classId: '' });
    });

    // Delete the class document
    const classRef = doc(firestore, 'schools', schoolId, 'classes', classId);
    batch.delete(classRef);

    return batch.commit();
};

// --- Teacher Mutations ---
export const addTeacher = (firestore: Firestore, schoolId: string, teacherData: Omit<Teacher, 'id'>) => {
    const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newTeacher: Teacher = { ...teacherData, id: newId };
    const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', newTeacher.id);
    return setDoc(teacherDocRef, newTeacher);
};

export const deleteTeacher = (firestore: Firestore, schoolId: string, teacherId: string) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', teacherId);
  return deleteDoc(teacherDocRef);
};

// --- Category Mutations ---
export const addCategory = async (firestore: Firestore, schoolId: string, categoryData: { name: string, points: number }): Promise<Category> => {
    const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newCategory: Category = { ...categoryData, id: newId };
    const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', newCategory.id);
    await setDoc(categoryDocRef, newCategory);
    return newCategory;
};

export const deleteCategory = (firestore: Firestore, schoolId: string, categoryId: string) => {
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', categoryId);
  return deleteDoc(categoryDocRef);
};

// --- Prize Mutations ---
export const addPrize = (firestore: Firestore, schoolId: string, prizeData: Omit<Prize, 'id'>) => {
    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newPrize: Prize = { ...prizeData, id: newId };
    const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', newPrize.id);
    return setDoc(prizeDocRef, newPrize);
};

export const updatePrize = (firestore: Firestore, schoolId: string, updatedPrize: Prize) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', updatedPrize.id);
  return updateDoc(prizeDocRef, { ...updatedPrize });
};

export const deletePrize = (firestore: Firestore, schoolId: string, prizeId: string) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', prizeId);
  return deleteDoc(prizeDocRef);
};

// --- Coupon Mutations ---
export const addCoupons = (firestore: Firestore, schoolId: string, newCoupons: Coupon[]) => {
    const batch = writeBatch(firestore);
    newCoupons.forEach(coupon => {
        const couponDocRef = doc(firestore, 'schools', schoolId, 'coupons', coupon.id);
        batch.set(couponDocRef, coupon);
    });
    return batch.commit();
};

export const redeemCoupon = async (firestore: Firestore, schoolId: string, studentId: string, studentPoints: number, couponCode: string, allCoupons: Coupon[]): Promise<{ success: boolean; message: string; value?: number }> => {
    try {
        const coupon = allCoupons.find((c) => c.id.toUpperCase() === couponCode.toUpperCase());
        if (!coupon) throw new Error('Coupon code not found.');
        if (coupon.used) throw new Error('This coupon has already been used.');

        return await runTransaction(firestore, async (transaction) => {
            const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
            const couponRef = doc(firestore, 'schools', schoolId, 'coupons', coupon.id);
            const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));

            // We get student from a transaction to prevent race conditions
            const studentDoc = await transaction.get(studentRef);
            if (!studentDoc.exists()) {
                throw new Error("Student not found.");
            }
            const currentPoints = studentDoc.data().points;

            const newHistoryItem: HistoryItem = {
                desc: `Redeemed coupon: ${coupon.code} (${coupon.category})`,
                amount: coupon.value,
                date: Date.now(),
            };

            // Update student points and add history item
            transaction.update(studentRef, { points: currentPoints + coupon.value });
            transaction.set(activityRef, newHistoryItem);

            // Mark coupon as used
            transaction.update(couponRef, { 
                used: true, 
                usedAt: Date.now(), 
                usedBy: studentId,
            });

            return { success: true, message: 'Coupon redeemed!', value: coupon.value };
        });
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
};

export const uploadStudents = async (firestore: Firestore, schoolId: string, csvContent: string, currentStudents: Student[], allClasses: Class[]): Promise<{success: number, failed: number, errors: string[]}> => {
    const lines = csvContent.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
    const errors: string[] = [];

    if (lines.length === 0) {
        return {success: 0, failed: 0, errors:['File is empty.']};
    }

    const existingNfcIds = new Set(currentStudents.map(s => s.nfcId));
    let successCount = 0;
    const batch = writeBatch(firestore);

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

        let newNfcId;
        do {
            newNfcId = Math.floor(10000000 + Math.random() * 90000000).toString();
        } while (existingNfcIds.has(newNfcId));

        const classObj = allClasses.find(c => studentClassName && c.name.toLowerCase() === studentClassName.toLowerCase());

        const newId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const newStudent: Student = {
            id: newId,
            firstName, lastName, nfcId: newNfcId, points: 0,
            classId: classObj?.id || '',
        };
        
        const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
        batch.set(studentDocRef, newStudent);
        
        existingNfcIds.add(newStudent.nfcId);
        successCount++;
    });

    if (successCount > 0) {
        await batch.commit();
    }
    
    const failedCount = dataLines.length - successCount;
    return {success: successCount, failed: failedCount, errors};
};
