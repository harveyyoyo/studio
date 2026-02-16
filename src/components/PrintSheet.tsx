import type { Coupon } from '@/lib/types';

interface PrintSheetProps {
  coupons: Coupon[];
}

export function PrintSheet({ coupons }: PrintSheetProps) {
  if (coupons.length === 0) {
    return null;
  }

  const couponsToRender = Array.from({ length: 24 }, (_, i) => coupons[i % coupons.length]);

  return (
    <div id="print-container">
      {couponsToRender.map((c, index) => (
        <div key={`${c.code}-${index}`} className="print-coupon">
          <div className="title">Reward Points</div>
          <div className="points">{c.value}</div>
          <div className="cat">{c.category || 'General'}</div>
          <div className="barcode-font">{c.code}</div>
          <div className="meta">
            {c.code} | {c.teacher}
          </div>
        </div>
      ))}
    </div>
  );
}
