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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


// --- Student Mutations ---
export const addStudent = (firestore: Firestore, schoolId: string, studentData: Omit<Student, 'id' | 'lifetimePoints'>) => {
  const newId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newStudent: Student = { ...studentData, id: newId, lifetimePoints: studentData.points };
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
  setDoc(studentDocRef, newStudent)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: studentDocRef.path,
          operation: 'create',
          requestResourceData: newStudent,
        })
      )
    });
};

export const updateStudent = async (firestore: Firestore, schoolId: string, student: Student) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);
  
  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentDocRef);
      if (!studentDoc.exists()) {
        throw "Student not found";
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

export const deleteStudent = (firestore: Firestore, schoolId: string, studentId: string) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  deleteDoc(studentDocRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: studentDocRef.path,
          operation: 'delete',
        })
      )
    });
};

// --- Class Mutations ---
export const addClass = (firestore: Firestore, schoolId: string, classData: Omit<Class, 'id'>) => {
    const newId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newClass: Class = { ...classData, id: newId };
    const classDocRef = doc(firestore, 'schools', schoolId, 'classes', newClass.id);
    setDoc(classDocRef, newClass)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: classDocRef.path,
          operation: 'create',
          requestResourceData: newClass,
        })
      )
    });
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
    } catch(error) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `schools/${schoolId}/classes`, // A bit generic for batch, but best effort
          operation: 'write', // Batch write
        })
      );
      throw error;
    }
};

// --- Teacher Mutations ---
export const addTeacher = (firestore: Firestore, schoolId: string, teacherData: Omit<Teacher, 'id'>) => {
    const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newTeacher: Teacher = { ...teacherData, id: newId };
    const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', newTeacher.id);
    setDoc(teacherDocRef, newTeacher)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: teacherDocRef.path,
          operation: 'create',
          requestResourceData: newTeacher,
        })
      )
    });
};

export const deleteTeacher = (firestore: Firestore, schoolId: string, teacherId: string) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', teacherId);
  deleteDoc(teacherDocRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: teacherDocRef.path,
          operation: 'delete',
        })
      )
    });
};

// --- Category Mutations ---
export const addCategory = (firestore: Firestore, schoolId: string, categoryData: { name: string, points: number }): Category => {
    const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newCategory: Category = { ...categoryData, id: newId };
    const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', newCategory.id);
    setDoc(categoryDocRef, newCategory)
      .catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: categoryDocRef.path,
            operation: 'create',
            requestResourceData: newCategory,
          })
        )
      });
    return newCategory;
};

export const deleteCategory = (firestore: Firestore, schoolId: string, categoryId: string) => {
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', categoryId);
  deleteDoc(categoryDocRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: categoryDocRef.path,
          operation: 'delete',
        })
      )
    });
};

// --- Prize Mutations ---
export const addPrize = (firestore: Firestore, schoolId: string, prizeData: Omit<Prize, 'id'>) => {
    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newPrize: Prize = { ...prizeData, id: newId };
    const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', newPrize.id);
    setDoc(prizeDocRef, newPrize)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: prizeDocRef.path,
          operation: 'create',
          requestResourceData: newPrize,
        })
      )
    });
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

export const deletePrize = (firestore: Firestore, schoolId: string, prizeId: string) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', prizeId);
  deleteDoc(prizeDocRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: prizeDocRef.path,
          operation: 'delete',
        })
      )
    });
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
    } catch(error) {
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

export const redeemCoupon = async (firestore: Firestore, schoolId: string, studentId: string, couponCode: string): Promise<number> => {
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

            transaction.update(studentRef, { 
                points: currentStudent.points + coupon.value,
                lifetimePoints: newLifetimePoints
            });
            transaction.set(activityRef, newHistoryItem);

            transaction.update(couponRef, { 
                used: true, 
                usedAt: Date.now(), 
                usedBy: studentId,
            });

            return coupon.value;
        });
        return couponValue;
    } catch (e) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: couponRef.path,
          operation: 'write',
          requestResourceData: { studentId, couponCode },
        })
      );
      throw e;
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

        const newStudentData: Omit<Student, 'id' | 'lifetimePoints'> => {
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
        try {
            await batch.commit();
        } catch(error) {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                path: `schools/${schoolId}/students`,
                operation: 'write',
                })
            );
            // This error isn't propagated to the UI toast, but will appear in dev overlay
        }
    }
    
    const failedCount = dataLines.length - successCount;
    return {success: successCount, failed: failedCount, errors};
};
