'use client';

import type { Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

export function StudentIdCard({ student, schoolId, className, isColorEnabled }: { student: Student, schoolId: string | null, className: string, isColorEnabled: boolean }) {
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : 'School Reward System';

  return (
    <div className={cn("print-id-card", isColorEnabled && "is-colored")}>
      <div className="print-id-header">{schoolName}</div>
      <div className="print-id-name">{getStudentNickname(student)} {student.lastName}</div>
      <div className="print-id-class">{className}</div>
      <div className="print-id-barcode-container">
        <div className="font-barcode">*{student.nfcId}*</div>
      </div>
    </div>
  );
}
