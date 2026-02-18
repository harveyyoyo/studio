import type { Student } from '@/lib/types';

export function StudentIdCard({ student, schoolId, className }: { student: Student, schoolId: string | null, className: string }) {
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : 'Reward Arcade';
  
  return (
    <div className="print-id-card">
        <div className="print-id-header">{schoolName}</div>
        <div className="print-id-name">{student.firstName} {student.lastName}</div>
        <div className="print-id-class">{className}</div>
        <div className="print-id-barcode-container">
            <div className="font-barcode">*{student.nfcId}*</div>
        </div>
    </div>
  );
}
