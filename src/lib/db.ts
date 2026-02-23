import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  query,
  where,
  getDocs,
  runTransaction,
  Firestore,
} from 'firebase/firestore';
import type { Student, Class, Teacher, Category, Prize, Coupon, HistoryItem } from './types';

// --- Student Mutations ---
export const addStudent = (firestore: Firestore, schoolId: string, studentData: Omit<Student, 'id' | 'lifetimePoints'>) => {
  const newId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newStudent: Student = { ...studentData, id: newId, lifetimePoints: studentData.points };
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
  return setDoc(studentDocRef, newStudent);
};

export const updateStudent = async (firestore: Firestore, schoolId: string, student: Student) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);
  
  // To correctly update lifetime points, we need the student's previous state.
  return runTransaction(firestore, async (transaction) => {
    const studentDoc = await transaction.get(studentDocRef);
    if (!studentDoc.exists()) {
      throw "Student not found";
    }
    const oldStudent = studentDoc.data() as Student;
    
    const pointsDifference = student.points - oldStudent.points;
    
    // Only add positive differences to lifetime points.
    const newLifetimePoints = oldStudent.lifetimePoints + (pointsDifference > 0 ? pointsDifference : 0);
    
    const finalStudentData = { ...student, lifetimePoints: newLifetimePoints };
    
    transaction.update(studentDocRef, finalStudentData);
  });
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
    
    const studentsToUpdate = students.filter(s => s.classId === classId);
    studentsToUpdate.forEach(student => {
        const studentRef = doc(firestore, 'schools', schoolId, 'students', student.id);
        batch.update(studentRef, { classId: '' });
    });

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

export const redeemCoupon = async (firestore: Firestore, schoolId: string, studentId: string, couponCode: string): Promise<{ success: boolean; message: string; value?: number }> => {
    try {
        const couponRef = doc(firestore, 'schools', schoolId, 'coupons', couponCode.toUpperCase());

        return await runTransaction(firestore, async (transaction) => {
            const couponDoc = await transaction.get(couponRef);
            
            if (!couponDoc.exists()) throw new Error('Coupon code not found.');
            
            const coupon = couponDoc.data() as Coupon;
            if (coupon.used) throw new Error('This coupon has already been used.');

            const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
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

            transaction.update(studentRef, { 
                points: currentStudent.points + coupon.value,
                lifetimePoints: (currentStudent.lifetimePoints || 0) + coupon.value
            });
            transaction.set(activityRef, newHistoryItem);

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

export const redeemPrize = async (firestore: Firestore, schoolId: string, studentId: string, prize: Prize) => {
    return runTransaction(firestore, async (transaction) => {
        const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
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

        const newStudentData: Omit<Student, 'id' | 'lifetimePoints'> = {
            firstName, lastName, nfcId: newNfcId, points: 0,
            classId: classObj?.id || '',
        };
        
        const newId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const newStudent: Student = { ...newStudentData, id: newId, lifetimePoints: newStudentData.points };
        
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
