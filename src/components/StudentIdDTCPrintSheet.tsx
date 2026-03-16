'use client';

import { useMemo, useEffect } from 'react';
import type { Student, Class } from '@/lib/types';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from './providers/SettingsProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';

interface StudentIdDTCPrintSheetProps {
  students: Student[];
  classes: Class[];
  schoolId: string | null;
  onReady: () => void;
}

export function StudentIdDTCPrintSheet({ students, classes, schoolId, onReady }: StudentIdDTCPrintSheetProps) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const appConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'appConfig', 'global') : null), [firestore]);
  const schoolDocRef = useMemoFirebase(() => (firestore && schoolId ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId]);
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
  const { data: schoolData, isLoading: isSchoolLoading } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);

  // Trigger print dialog only after the async configurations have finished loading
  useEffect(() => {
    if (!isAppConfigLoading && !isSchoolLoading) {
      const t = setTimeout(() => {
        onReady();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isAppConfigLoading, isSchoolLoading, onReady]);

  const classMap = useMemo(() => {
    if (!classes) return new Map<string, string>();
    return new Map(classes.map(c => [c.id, c.name]));
  }, [classes]);

  const getClassName = (classId: string) => {
    return classMap.get(classId) || 'Unassigned';
  };

  const schoolName = schoolData?.name?.trim() || 'School';
  const appName = appConfig?.appName?.trim() || APP_NAME;
  const appTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
  const appLogoUrl = appConfig?.appLogoUrl || null;

  if (students.length === 0) {
    return null;
  }

  return (
    <div id="student-id-dtc-print-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          title { display: none; }
          @page {
            /* CR80 card size (landscape) for Fargo DTC printers */
            size: 3.375in 2.125in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #student-id-dtc-print-wrapper {
            display: block !important;
            visibility: visible !important;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            background: white;
          }
          #student-id-dtc-print-wrapper .dtc-page {
            width: 3.375in;
            height: 2.125in;
            overflow: hidden;
            page-break-after: always;
            position: relative;
            background: white;
            box-sizing: border-box;
            display: flex;
            align-items: stretch;
            justify-content: stretch;
          }

          /*
           * The global print stylesheet sizes .print-id-card for Avery labels.
           * For DTC printing we must override to full CR80, otherwise the card is
           * scaled/cropped and looks like it isn't "full page".
           */
          #student-id-dtc-print-wrapper .dtc-page .print-id-card {
            width: 3.375in !important;
            height: 2.125in !important;
            min-width: 3.375in !important;
            min-height: 2.125in !important;
            max-width: 3.375in !important;
            max-height: 2.125in !important;
            padding: 0.12in 0.14in !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          /* Hide everything else */
          body > *:not(#student-id-dtc-print-wrapper) {
            display: none !important;
          }
        }
      `}} />
      {students.map((s) => (
        <div key={s.id} className="dtc-page">
          <StudentIdCard
            student={s}
            schoolName={schoolName}
            schoolLogoUrl={schoolData?.logoUrl ?? null}
            className={getClassName(s.classId || '')}
            isColorEnabled={settings.enableColorPrinting}
            appLogoUrl={appLogoUrl}
            appName={appName}
            appTagline={appTagline}
          />
        </div>
      ))}
    </div>
  );
}
