
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

exports.createBackupTrigger = functions.https.onCall(async (data, context) => {
  const schoolId = data.schoolId;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  if (typeof schoolId !== "string" || schoolId.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid schoolId."
    );
  }

  const db = admin.firestore();
  const schoolDocRef = db.collection("schools").doc(schoolId);

  try {
    const schoolSnap = await schoolDocRef.get();
    if (!schoolSnap.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const schoolData = schoolSnap.data()!;

    // Create a clean, serializable backup object.
    // This is the most robust way to avoid issues with non-serializable data.
    const backupData = JSON.parse(JSON.stringify(schoolData));
    
    // Remove sensitive or irrelevant fields from the backup.
    delete backupData.passcode;

    const backupId = Date.now().toString();
    const backupDocRef = schoolDocRef.collection("backups").doc(backupId);
    await backupDocRef.set(backupData);

    return { success: true, backupId };

  } catch (error) {
    console.error("Backup failed:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "An unexpected error occurred during backup. The data may contain non-serializable fields.");
  }
});


exports.migrateStudentsToSubcollection = functions.https.onCall(async (data, context) => {
  const schoolId = data.schoolId;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  if (typeof schoolId !== "string" || schoolId.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid schoolId."
    );
  }

  const schoolDocRef = admin.firestore().collection("schools").doc(schoolId);

  try {
    const schoolSnap = await schoolDocRef.get();
    if (!schoolSnap.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const schoolData = schoolSnap.data()!;

    if (schoolData.hasMigratedStudents) {
      return { success: true, message: "Students have already been migrated." };
    }

    const students = schoolData.students || [];
    if (students.length === 0) {
        await schoolDocRef.update({ hasMigratedStudents: true });
        return { success: true, message: "No students to migrate." };
    }


    const batch = admin.firestore().batch();
    const studentsCollectionRef = schoolDocRef.collection("students");

    students.forEach((student: any) => {
      const studentDocRef = studentsCollectionRef.doc(student.id);
      batch.set(studentDocRef, student);
    });

    batch.update(schoolDocRef, { hasMigratedStudents: true, students: admin.firestore.FieldValue.delete() });

    await batch.commit();

    return { success: true, message: `Migrated ${students.length} students.` };

  } catch (error) {
    console.error("Migration failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred during migration."
    );
  }
});

exports.migrateClassesToSubcollection = functions.https.onCall(async (data, context) => {
  const schoolId = data.schoolId;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  if (typeof schoolId !== "string" || schoolId.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid schoolId."
    );
  }

  const schoolDocRef = admin.firestore().collection("schools").doc(schoolId);

  try {
    const schoolSnap = await schoolDocRef.get();
    if (!schoolSnap.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const schoolData = schoolSnap.data()!;

    if (schoolData.hasMigratedClasses) {
      return { success: true, message: "Classes have already been migrated." };
    }

    const classes = schoolData.classes || [];
    if (classes.length === 0) {
        await schoolDocRef.update({ hasMigratedClasses: true });
        return { success: true, message: "No classes to migrate." };
    }


    const batch = admin.firestore().batch();
    const classesCollectionRef = schoolDocRef.collection("classes");

    classes.forEach((c: any) => {
      const classDocRef = classesCollectionRef.doc(c.id);
      batch.set(classDocRef, c);
    });

    batch.update(schoolDocRef, { hasMigratedClasses: true, classes: admin.firestore.FieldValue.delete() });

    await batch.commit();

    return { success: true, message: `Migrated ${classes.length} classes.` };

  } catch (error) {
    console.error("Migration failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred during migration."
    );
  }
});

exports.migrateTeachersToSubcollection = functions.https.onCall(async (data, context) => {
    const schoolId = data.schoolId;
  
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
  
    if (typeof schoolId !== "string" || schoolId.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a valid schoolId."
      );
    }
  
    const schoolDocRef = admin.firestore().collection("schools").doc(schoolId);
  
    try {
      const schoolSnap = await schoolDocRef.get();
      if (!schoolSnap.exists) {
        throw new functions.https.HttpsError("not-found", "School not found.");
      }
  
      const schoolData = schoolSnap.data()!;
  
      if (schoolData.hasMigratedTeachers) {
        return { success: true, message: "Teachers have already been migrated." };
      }
  
      const teachers = schoolData.teachers || [];
      if (teachers.length === 0) {
          await schoolDocRef.update({ hasMigratedTeachers: true });
          return { success: true, message: "No teachers to migrate." };
      }
  
  
      const batch = admin.firestore().batch();
      const teachersCollectionRef = schoolDocRef.collection("teachers");
  
      teachers.forEach((t: any) => {
        const teacherDocRef = teachersCollectionRef.doc(t.id);
        batch.set(teacherDocRef, t);
      });
  
      batch.update(schoolDocRef, { hasMigratedTeachers: true, teachers: admin.firestore.FieldValue.delete() });
  
      await batch.commit();
  
      return { success: true, message: `Migrated ${teachers.length} teachers.` };
  
    } catch (error) {
      console.error("Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred during migration."
      );
    }
  });

  exports.migratePrizesToSubcollection = functions.https.onCall(async (data, context) => {
    const schoolId = data.schoolId;
  
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
  
    if (typeof schoolId !== "string" || schoolId.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a valid schoolId."
      );
    }
  
    const schoolDocRef = admin.firestore().collection("schools").doc(schoolId);
  
    try {
      const schoolSnap = await schoolDocRef.get();
      if (!schoolSnap.exists) {
        throw new functions.https.HttpsError("not-found", "School not found.");
      }
  
      const schoolData = schoolSnap.data()!;
  
      if (schoolData.hasMigratedPrizes) {
        return { success: true, message: "Prizes have already been migrated." };
      }
  
      const prizes = schoolData.prizes || [];
      if (prizes.length === 0) {
          await schoolDocRef.update({ hasMigratedPrizes: true });
          return { success: true, message: "No prizes to migrate." };
      }
  
  
      const batch = admin.firestore().batch();
      const prizesCollectionRef = schoolDocRef.collection("prizes");
  
      prizes.forEach((p: any) => {
        const prizeDocRef = prizesCollectionRef.doc(p.id);
        batch.set(prizeDocRef, p);
      });
  
      batch.update(schoolDocRef, { hasMigratedPrizes: true, prizes: admin.firestore.FieldValue.delete() });
  
      await batch.commit();
  
      return { success: true, message: `Migrated ${prizes.length} prizes.` };
  
    } catch (error) {
      console.error("Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred during migration."
      );
    }
  });

  exports.migrateCouponsToSubcollection = functions.https.onCall(async (data, context) => {
    const schoolId = data.schoolId;
  
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
  
    if (typeof schoolId !== "string" || schoolId.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a valid schoolId."
      );
    }
  
    const schoolDocRef = admin.firestore().collection("schools").doc(schoolId);
  
    try {
      const schoolSnap = await schoolDocRef.get();
      if (!schoolSnap.exists) {
        throw new functions.https.HttpsError("not-found", "School not found.");
      }
  
      const schoolData = schoolSnap.data()!;
  
      if (schoolData.hasMigratedCoupons) {
        return { success: true, message: "Coupons have already been migrated." };
      }
  
      const coupons = schoolData.coupons || [];
      if (coupons.length === 0) {
          await schoolDocRef.update({ hasMigratedCoupons: true });
          return { success: true, message: "No coupons to migrate." };
      }
  
  
      const batch = admin.firestore().batch();
      const couponsCollectionRef = schoolDocRef.collection("coupons");
  
      coupons.forEach((c: any) => {
        const couponDocRef = couponsCollectionRef.doc(c.id);
        batch.set(couponDocRef, c);
      });
  
      batch.update(schoolDocRef, { hasMigratedCoupons: true, coupons: admin.firestore.FieldValue.delete() });
  
      await batch.commit();
  
      return { success: true, message: `Migrated ${coupons.length} coupons.` };
  
    } catch (error) {
      console.error("Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred during migration."
      );
    }
  });
