
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();

const SUBCOLLECTIONS = ["students", "classes", "teachers", "categories", "prizes", "coupons"];
const RETENTION_DAYS = 30;

// ========================================================================
// Auth helpers
// ========================================================================

function requireAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
}

function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `A valid ${name} is required.`
    );
  }
}

// ========================================================================
// Core backup engine
// ========================================================================

async function collectFullSchoolData(schoolId: string) {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const schoolSnap = await schoolRef.get();

  if (!schoolSnap.exists) {
    throw new functions.https.HttpsError("not-found", `School "${schoolId}" not found.`);
  }

  const schoolData: Record<string, any> = JSON.parse(JSON.stringify(schoolSnap.data()));
  delete schoolData.passcode;

  const counts: Record<string, number> = {};
  let totalDocs = 1;

  for (const sub of SUBCOLLECTIONS) {
    const snap = await schoolRef.collection(sub).get();
    const items: any[] = [];
    counts[sub] = snap.size;
    totalDocs += snap.size;

    for (const d of snap.docs) {
      const item: any = { id: d.id, ...d.data() };

      if (sub === "students") {
        const activitiesSnap = await d.ref.collection("activities").get();
        if (activitiesSnap.size > 0) {
          item._activities = activitiesSnap.docs.map((a) => ({ id: a.id, ...a.data() }));
          counts.activities = (counts.activities || 0) + activitiesSnap.size;
          totalDocs += activitiesSnap.size;
        }
      }

      items.push(item);
    }

    schoolData[`_${sub}`] = items;
  }

  return { data: schoolData, counts, totalDocs };
}

async function performFullBackup(schoolId: string, type: string) {
  const backupId = Date.now().toString();
  const db = admin.firestore();

  try {
    const { data, counts, totalDocs } = await collectFullSchoolData(schoolId);

    const jsonStr = JSON.stringify(data);
    const sha256 = crypto.createHash("sha256").update(jsonStr).digest("hex");
    const sizeBytes = Buffer.byteLength(jsonStr, "utf8");
    const storagePath = `backups/${schoolId}/${backupId}.json`;

    const bucket = admin.storage().bucket();
    await bucket.file(storagePath).save(jsonStr, {
      contentType: "application/json",
      metadata: { schoolId, sha256, type, backupId },
    });

    const metadata = {
      createdAt: Date.now(),
      storagePath,
      sha256,
      sizeBytes,
      type,
      status: "complete",
      collections: counts,
      totalDocs,
    };

    await db.collection("schools").doc(schoolId).collection("backups").doc(backupId).set(metadata);

    return { success: true, backupId, metadata };
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error";
    console.error(`Backup failed for ${schoolId}:`, error);

    try {
      await db.collection("schools").doc(schoolId).collection("backups").doc(backupId).set({
        createdAt: Date.now(),
        type,
        status: "failed",
        error: errorMsg,
        storagePath: "",
        sha256: "",
        sizeBytes: 0,
        collections: {},
        totalDocs: 0,
      });
    } catch (logErr) {
      console.error("Could not log backup failure:", logErr);
    }

    return { success: false, backupId, error: errorMsg };
  }
}

async function restoreSchoolFromData(schoolId: string, backupData: Record<string, any>) {
  const db = admin.firestore();
  const schoolRef = db.collection("schools").doc(schoolId);
  const BATCH_LIMIT = 499;

  const currentSnap = await schoolRef.get();
  const currentPasscode = currentSnap.exists ? currentSnap.data()?.passcode : null;

  for (const sub of SUBCOLLECTIONS) {
    const snap = await schoolRef.collection(sub).get();

    if (sub === "students") {
      for (const studentDoc of snap.docs) {
        const activitiesSnap = await studentDoc.ref.collection("activities").get();
        for (let i = 0; i < activitiesSnap.docs.length; i += BATCH_LIMIT) {
          const batch = db.batch();
          activitiesSnap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    }

    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  const schoolDocData: Record<string, any> = {};
  for (const key of Object.keys(backupData)) {
    if (!key.startsWith("_")) {
      schoolDocData[key] = backupData[key];
    }
  }
  if (currentPasscode) {
    schoolDocData.passcode = currentPasscode;
  }
  await schoolRef.set(schoolDocData);

  for (const sub of SUBCOLLECTIONS) {
    const items = backupData[`_${sub}`] as any[] | undefined;
    if (!items || items.length === 0) continue;

    const ops: Array<{ ref: any; data: any }> = [];

    for (const item of items) {
      const itemObj = { ...item };
      const itemId = itemObj.id;
      const activities = itemObj._activities;
      delete itemObj.id;
      delete itemObj._activities;

      const docRef = schoolRef.collection(sub).doc(itemId);
      ops.push({ ref: docRef, data: itemObj });

      if (sub === "students" && Array.isArray(activities)) {
        for (const act of activities) {
          const actObj = { ...act };
          const actId = actObj.id;
          delete actObj.id;
          ops.push({ ref: docRef.collection("activities").doc(actId), data: actObj });
        }
      }
    }

    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      ops.slice(i, i + BATCH_LIMIT).forEach((op) => batch.set(op.ref, op.data));
      await batch.commit();
    }
  }
}

async function pruneOldBackups(schoolId: string): Promise<number> {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const allBackups = await db.collection("schools").doc(schoolId).collection("backups").get();

  let deleted = 0;
  for (const backupDoc of allBackups.docs) {
    const data = backupDoc.data();
    const createdAt = data.createdAt || 0;

    if (createdAt > 0 && createdAt < cutoff) {
      if (data.storagePath) {
        try {
          await bucket.file(data.storagePath).delete();
        } catch {
          /* file already gone */
        }
      }
      await backupDoc.ref.delete();
      deleted++;
    }
  }

  return deleted;
}

// ========================================================================
// Callable: Full-depth backup
// ========================================================================

exports.createBackupTrigger = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    const type = data.type || "manual";
    const result = await performFullBackup(data.schoolId, type);

    if (!result.success) {
      throw new functions.https.HttpsError("internal", result.error || "Backup failed.");
    }

    return { success: true, backupId: result.backupId, metadata: result.metadata };
  });

// ========================================================================
// Callable: Backup all schools
// ========================================================================

exports.backupAllSchools = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onCall(async (_data: any, context: functions.https.CallableContext) => {
    requireAuth(context);

    const schoolsSnap = await admin.firestore().collection("schools").get();
    const results: Array<{ schoolId: string; success: boolean; error?: string }> = [];

    for (const schoolDoc of schoolsSnap.docs) {
      const result = await performFullBackup(schoolDoc.id, "manual");
      results.push({ schoolId: schoolDoc.id, success: result.success, error: result.error });
    }

    const failed = results.filter((r) => !r.success);
    return {
      total: results.length,
      succeeded: results.length - failed.length,
      failed: failed.length,
      failures: failed,
    };
  });

// ========================================================================
// Callable: Full restore from backup
// ========================================================================

exports.restoreFromFullBackup = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.backupId, "backupId");

    const { schoolId, backupId } = data;
    const db = admin.firestore();
    const backupDoc = await db
      .collection("schools").doc(schoolId)
      .collection("backups").doc(backupId)
      .get();

    if (!backupDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Backup not found.");
    }

    const backupMeta = backupDoc.data()!;

    await performFullBackup(schoolId, "pre-restore");

    if (!backupMeta.storagePath) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This backup has no Cloud Storage file and cannot be restored."
      );
    }

    const bucket = admin.storage().bucket();
    const [fileContents] = await bucket.file(backupMeta.storagePath).download();
    const jsonStr = fileContents.toString("utf8");

    if (backupMeta.sha256) {
      const hash = crypto.createHash("sha256").update(jsonStr).digest("hex");
      if (hash !== backupMeta.sha256) {
        throw new functions.https.HttpsError(
          "data-loss",
          "Backup integrity check failed — the file may be corrupted."
        );
      }
    }

    await restoreSchoolFromData(schoolId, JSON.parse(jsonStr));

    return { success: true };
  });

// ========================================================================
// Callable: Download backup data
// ========================================================================

exports.downloadFullBackup = functions
  .runWith({ timeoutSeconds: 120, memory: "512MB" })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.backupId, "backupId");

    const db = admin.firestore();
    const backupDoc = await db
      .collection("schools").doc(data.schoolId)
      .collection("backups").doc(data.backupId)
      .get();

    if (!backupDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Backup not found.");
    }

    const meta = backupDoc.data()!;

    if (!meta.storagePath) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This backup has no Cloud Storage file and cannot be downloaded."
      );
    }

    const bucket = admin.storage().bucket();
    const [fileContents] = await bucket.file(meta.storagePath).download();
    return { data: JSON.parse(fileContents.toString("utf8")), metadata: meta };
  });

// ========================================================================
// Callable: Verify backup integrity (SHA-256)
// ========================================================================

exports.verifyBackupIntegrity = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");
    requireString(data.backupId, "backupId");

    const db = admin.firestore();
    const backupDoc = await db
      .collection("schools").doc(data.schoolId)
      .collection("backups").doc(data.backupId)
      .get();

    if (!backupDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Backup not found.");
    }

    const meta = backupDoc.data()!;

    if (!meta.storagePath || !meta.sha256) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This backup has no Cloud Storage file or integrity hash and cannot be verified."
      );
    }

    try {
      const bucket = admin.storage().bucket();
      const [fileContents] = await bucket.file(meta.storagePath).download();
      const hash = crypto.createHash("sha256").update(fileContents).digest("hex");
      const match = hash === meta.sha256;

      return {
        verified: match,
        expectedHash: meta.sha256,
        actualHash: hash,
        reason: match
          ? "Backup integrity verified — SHA-256 hash matches."
          : "Hash mismatch — backup file may be corrupted.",
      };
    } catch (error: any) {
      return { verified: false, reason: `Cannot read backup file: ${error.message}` };
    }
  }
);

// ========================================================================
// Scheduled: Automatic daily full backup + retention pruning
// Requires: Firebase Blaze plan + Cloud Scheduler API enabled
// ========================================================================

exports.scheduledFullBackup = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 24 hours")
  .timeZone("UTC")
  .onRun(async () => {
    const schoolsSnap = await admin.firestore().collection("schools").get();
    let succeeded = 0;
    let failed = 0;
    let totalPruned = 0;

    for (const schoolDoc of schoolsSnap.docs) {
      const result = await performFullBackup(schoolDoc.id, "scheduled");
      if (result.success) {
        succeeded++;
        totalPruned += await pruneOldBackups(schoolDoc.id);
      } else {
        failed++;
      }
    }

    functions.logger.info(
      `Scheduled backup: ${succeeded} succeeded, ${failed} failed, ${totalPruned} old backups pruned.`
    );

    return null;
  });

// ========================================================================
// Callable: Verify school passcode (used by login and student logout)
// ========================================================================

exports.verifySchoolPasscode = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    requireAuth(context);
    requireString(data.schoolId, "schoolId");

    if (typeof data.passcode !== "string" || data.passcode.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "A valid passcode is required.");
    }

    const db = admin.firestore();
    const schoolDoc = await db.collection("schools").doc(data.schoolId).get();

    if (!schoolDoc.exists) {
      throw new functions.https.HttpsError("not-found", "School not found.");
    }

    const schoolData = schoolDoc.data()!;
    if (schoolData.passcode !== data.passcode) {
      throw new functions.https.HttpsError("permission-denied", "Invalid passcode.");
    }

    return { success: true };
  }
);

// ========================================================================
// Migration functions (unchanged from original)
// ========================================================================

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

exports.migrateCategoriesToSubcollection = functions.https.onCall(async (data, context) => {
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
  
      if (schoolData.hasMigratedCategories) {
        return { success: true, message: "Categories have already been migrated." };
      }
  
      const categories = schoolData.categories || [];
      if (categories.length === 0) {
          await schoolDocRef.update({ hasMigratedCategories: true });
          return { success: true, message: "No categories to migrate." };
      }
  
  
      const batch = admin.firestore().batch();
      const categoriesCollectionRef = schoolDocRef.collection("categories");
  
      categories.forEach((c: any) => {
        const categoryDocRef = categoriesCollectionRef.doc(c.id);
        batch.set(categoryDocRef, c);
      });
  
      batch.update(schoolDocRef, { hasMigratedCategories: true, categories: admin.firestore.FieldValue.delete() });
  
      await batch.commit();
  
      return { success: true, message: `Migrated ${categories.length} categories.` };
  
    } catch (error) {
      console.error("Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred during migration."
      );
    }
});
