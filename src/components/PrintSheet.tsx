'use client';

import { useEffect, useRef } from 'react';
import type { Coupon } from '@/lib/types';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
}

export function PrintSheet({ coupons, schoolId }: PrintSheetProps) {
  
  if (coupons.length === 0) {
    return null;
  }

  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : null;
  const title = schoolName ? `Arcade Rewards - ${schoolName}` : 'Arcade Rewards';

  return (
    <div id="print-container">
      {coupons.map((c, index) => (
        <div key={`${c.code}-${index}`} className="print-coupon">
            <div className="print-coupon-header">{title}</div>
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
                <div className="font-barcode">*{c.code}*</div>
            </div>
        </div>
      ))}
    </div>
  );
}
