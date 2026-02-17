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
