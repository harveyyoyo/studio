'use client';

import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

interface StudentIdPrintSheetProps {
  students: Student[];
  schoolId: string | null;
}

export function StudentIdPrintSheet({ students, schoolId }: StudentIdPrintSheetProps) {
  const firestore = useFirestore();
  
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes } = useCollection<Class>(classesQuery);

  const classMap = useMemoFirebase(() => {
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
