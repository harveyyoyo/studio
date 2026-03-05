'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import type { Coupon, Student } from '@/lib/types';
import { PrintSheet } from '@/components/PrintSheet';
import { StudentIdPrintSheet } from '@/components/StudentIdPrintSheet';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useAuth } from './AuthProvider';

interface PrintContextType {
    setCouponsToPrint: (coupons: Coupon[]) => void;
    setStudentsToPrint: (students: Student[]) => void;
}

const PrintContext = createContext<PrintContextType | null>(null);

export function PrintProvider({ children }: { children: React.ReactNode }) {
    const [couponsToPrint, setCouponsToPrint] = useState<Coupon[]>([]);
    const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);
    const playSound = useArcadeSound();
    const { schoolId } = useAuth();

    const printTriggered = useRef(false);
    useEffect(() => {
        if (couponsToPrint.length > 0 && !printTriggered.current) {
            printTriggered.current = true;
            const afterPrint = () => {
                setCouponsToPrint([]);
                printTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('38pt "Libre Barcode 39"').finally(window.print);
        }
    }, [couponsToPrint, playSound]);

    const studentPrintTriggered = useRef(false);
    useEffect(() => {
        if (studentsToPrint.length > 0 && !studentPrintTriggered.current) {
            studentPrintTriggered.current = true;
            const afterPrint = () => {
                setStudentsToPrint([]);
                studentPrintTriggered.current = false;
                window.removeEventListener('afterprint', afterPrint);
            };
            window.addEventListener('afterprint', afterPrint);
            playSound('swoosh');
            document.fonts.load('48pt "Libre Barcode 39"').finally(window.print);
        }
    }, [studentsToPrint, playSound]);

    const value = useMemo(
        () => ({ setCouponsToPrint, setStudentsToPrint }),
        []
    );

    return (
        <PrintContext.Provider value={value}>
            {children}
            {couponsToPrint.length > 0 && <PrintSheet coupons={couponsToPrint} schoolId={schoolId} />}
            {studentsToPrint.length > 0 && <StudentIdPrintSheet students={studentsToPrint} schoolId={schoolId} />}
        </PrintContext.Provider>
    );
}

export const usePrint = () => {
    const context = useContext(PrintContext);
    if (!context) {
        throw new Error('usePrint must be used within a PrintProvider');
    }
    return context;
};
