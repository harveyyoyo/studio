import type { Coupon } from '@/lib/types';

interface PrintSheetProps {
  coupons: Coupon[];
  schoolId: string | null;
}

export function PrintSheet({ coupons, schoolId }: PrintSheetProps) {
  if (coupons.length === 0) {
    return null;
  }

  const couponsToRender = Array.from({ length: 24 }, (_, i) => coupons[i % coupons.length]);
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ').toUpperCase() : 'REWARD ARCADE';

  return (
    <div id="print-container">
      {couponsToRender.map((c, index) => (
        <div key={`${c.code}-${index}`} className="print-coupon">
          <div className="school-name">{schoolName}</div>
          <div className="points-value">{c.value}</div>
          <div className="points-label">Points</div>
          <div className="category">{c.category || 'General'}</div>
          <div className="barcode">{c.code}</div>
          <div className="code-text">{c.code}</div>
          <div className="footer">
            Issued by: {c.teacher}
          </div>
        </div>
      ))}
    </div>
  );
}
