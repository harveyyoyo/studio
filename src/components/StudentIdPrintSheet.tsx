'use client';

import type { Student } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';

interface StudentIdPrintSheetProps {
  students: Student[];
  schoolId: string | null;
  getClassName: (classId: string) => string;
}

export function StudentIdPrintSheet({ students, schoolId, getClassName }: StudentIdPrintSheetProps) {
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
        />
      ))}
    </div>
  );
}
