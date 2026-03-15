'use client';

import { useMemo } from 'react';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from './providers/SettingsProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';

interface StudentIdPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
}

export function StudentIdPrintSheet({ students, classes, schoolId }: StudentIdPrintSheetProps) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: appConfig } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
  const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

  const classMap = useMemo(() => {
    if (!classes) return new Map<string, string>();
    return new Map(classes.map(c => [c.id, c.name]));
  }, [classes]);

  const getClassName = (classId: string) => {
    return classMap.get(classId) || 'Unassigned';
  };

  // Always show the exact school name stored in Firestore.
  // Fall back to a generic label only if the document somehow has no name.
  const schoolName = schoolData?.name?.trim() || 'School';
  const appName = appConfig?.appName?.trim() || APP_NAME;
  const appTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
  const appLogoUrl = appConfig?.appLogoUrl || null;

  if (students.length === 0) {
    return null;
  }

  return (
    <div id="student-id-print-container">
      {students.map((s) => (
        <StudentIdCard
          key={s.id}
          student={s}
          schoolName={schoolName}
          schoolLogoUrl={schoolData?.logoUrl ?? null}
          className={getClassName(s.classId || '')}
          isColorEnabled={settings.enableColorPrinting}
          appLogoUrl={appLogoUrl}
          appName={appName}
          appTagline={appTagline}
        />
      ))}
    </div>
  );
}
