'use client';

import { useEffect, useRef } from 'react';
import type { Coupon } from '@/lib/types';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/app-branding';
import { Coupon as CouponComponent } from '@/components/Coupon';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
}

export function PrintSheet({ coupons, schoolId }: PrintSheetProps) {
  const { settings } = useSettings();

  if (coupons.length === 0) {
    return null;
  }

  return (
    <div id="print-container">
      {coupons.map((c, index) => (
        <div key={`${c.code}-${index}`} className="print-coupon-wrapper">
          <CouponComponent coupon={c} schoolId={schoolId} />
        </div>
      ))}
    </div>
  );
}
