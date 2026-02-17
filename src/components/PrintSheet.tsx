'use client';

import { useEffect, useRef } from 'react';
import type { Coupon } from '@/lib/types';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
  onPrintComplete: () => void;
}

export function PrintSheet({ coupons, schoolId, onPrintComplete }: PrintSheetProps) {
  const printTriggered = useRef(false);
  
  useEffect(() => {
    if (coupons.length > 0 && !printTriggered.current) {
      printTriggered.current = true;

      const handleAfterPrint = () => {
        onPrintComplete();
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      
      window.addEventListener('afterprint', handleAfterPrint);

      document.fonts.load('38pt "Libre Barcode 39 Text"').finally(() => {
        setTimeout(() => {
          window.print();
        }, 100); 
      });
    }
  }, [coupons, onPrintComplete]);
  
  if (coupons.length === 0) {
    return null;
  }

  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : 'REWARD ARCADE';

  return (
    <div id="print-container">
      {coupons.map((c, index) => (
        <div key={`${c.code}-${index}`} className="print-coupon">
            <div className="print-coupon-header">{schoolName}</div>
            <div className="print-coupon-main">
                <div className="print-coupon-value">
                    {c.value}
                    <span>Points</span>
                </div>
                <div className="print-coupon-details">
                    <div className="print-coupon-category">{c.category || 'General'}</div>
                    <div className="print-coupon-teacher">Issued for: {c.className}</div>
                </div>
            </div>
            <div className="print-coupon-barcode">
                <div className="barcode-font">*{c.code}*</div>
            </div>
        </div>
      ))}
    </div>
  );
}
