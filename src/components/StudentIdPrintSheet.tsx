'use client';

import { useMemo } from 'react';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useAppContext } from './AppProvider';
import { useFirestore, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';

interface StudentIdPrintSheetProps {
  students: Student[];
}

export function StudentIdPrintSheet({ students }: StudentIdPrintSheetProps) {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  
  const classesQuery = useMemo(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes } = useCollection<Class>(classesQuery);

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
        />
      ))}
    </div>
  );
}
