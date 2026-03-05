'use client';

import { useEffect, useRef } from 'react';
import type { Coupon } from '@/lib/types';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';

const getContrastingTextColor = (hexcolor?: string): string => {
  if (!hexcolor) return '#000000';
  hexcolor = hexcolor.replace("#", "");
  const r = parseInt(hexcolor.substring(0, 2), 16);
  const g = parseInt(hexcolor.substring(2, 4), 16);
  const b = parseInt(hexcolor.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
}

export function PrintSheet({ coupons, schoolId }: PrintSheetProps) {
  const { settings } = useSettings();

  if (coupons.length === 0) {
    return null;
  }

  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : null;
  const title = schoolName ? `levelUp EDU - ${schoolName}` : 'levelUp EDU';

  const isColorEnabled = settings.enableCouponColor;

  return (
    <div id="print-container">
      {coupons.map((c, index) => {
        const isColored = isColorEnabled && c.color;
        const style = isColored ? {
          '--coupon-bg-color': c.color,
          '--coupon-border-color': c.color,
          '--coupon-text-color': getContrastingTextColor(c.color),
        } as React.CSSProperties : {};

        return (
          <div key={`${c.code}-${index}`} className={cn("print-coupon", isColored && "is-colored")} style={style}>
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
        );
      })}
    </div>
  );
}
