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
      
      // This is the most reliable method to solve a font-loading "race condition".
      // We must ensure the 'Libre Barcode 39 Text' font is fully loaded and ready
      // to be rendered before we trigger the browser's print dialog.
      // Using `document.fonts.load()` is more specific than `document.fonts.ready`.
      // We check for the font at the specific size it's used for printing.
      document.fonts.load('38pt "Libre Barcode 39 Text"').then(() => {
        // Once the promise resolves, the font is ready. We can now print.
        window.print();
      }).catch((error) => {
        console.error("Barcode font could not be loaded. Printing with fallback.", error);
        // If the font fails to load for some reason, we still trigger the print.
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
