'use client';

import { useEffect } from 'react';
import type { Coupon } from '@/lib/types';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
  onPrintComplete: () => void;
}

export function PrintSheet({ coupons, schoolId, onPrintComplete }: PrintSheetProps) {
  
  useEffect(() => {
    const handleAfterPrint = () => {
      onPrintComplete();
    };

    if (coupons.length > 0) {
      window.addEventListener('afterprint', handleAfterPrint, { once: true });
      
      // This is the robust fix:
      // We wait for the browser to tell us all fonts are loaded and ready.
      document.fonts.ready.then(() => {
        // Now that fonts are loaded, we can safely trigger the print dialog.
        window.print();
      });

      return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
      };
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
                    <div className="print-coupon-teacher">Issued by: {c.teacher}</div>
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
