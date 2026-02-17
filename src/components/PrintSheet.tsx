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
      
      // A small delay to ensure DOM is fully painted with the new content and fonts.
      const printTimeout = setTimeout(() => {
        window.print();
      }, 100);

      return () => {
        clearTimeout(printTimeout);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [coupons, onPrintComplete]);
  
  if (coupons.length === 0) {
    return null;
  }

  const couponsToRender = Array.from({ length: 24 }, (_, i) => coupons[i % coupons.length]);
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : 'REWARD ARCADE';

  return (
    <div id="print-container">
      {couponsToRender.map((c, index) => (
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
