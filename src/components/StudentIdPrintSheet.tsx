
'use client';

import { useMemo } from 'react';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from './providers/SettingsProvider';

interface StudentIdPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
}

export function StudentIdPrintSheet({ students, classes, schoolId }: StudentIdPrintSheetProps) {
  const { settings } = useSettings();

  const classMap = useMemo(() => {
    if (!classes) return new Map<string, string>();
    return new Map(classes.map(c => [c.id, c.name]));
  }, [classes]);

  const getClassName = (classId: string) => {
    return classMap.get(classId) || 'Unassigned';
  };

  if (students.length === 0) {
    return null;
  }

  return (
    <div id="student-id-print-container">
      {students.map((s) => (
        <StudentIdCard 
          key={s.id} 
          student={s} 
          schoolId={schoolId} 
          className={getClassName(s.classId || '')} 
          isColorEnabled={settings.enableColorPrinting}
        />
      ))}
    </div>
  );
}
