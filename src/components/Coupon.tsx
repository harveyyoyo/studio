'use client';

import type { Coupon } from '@/lib/types';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';

export function Coupon({ coupon, schoolId, isNew = false }: { coupon: Coupon, schoolId?: string | null, isNew?: boolean }) {
  const { settings } = useSettings();
  const schoolName = schoolId ? schoolId.replace(/_/g, ' ') : null;
  const title = schoolName ? `levelUp EDU - ${schoolName}` : 'levelUp EDU';

  const isColored = settings.enableColorPrinting && coupon.color;

  const style = isColored ? {
    borderColor: coupon.color,
    color: coupon.color,
  } : {};

  return (
    <div
      style={style}
      className={cn(
        "p-2 border border-dotted rounded-xl bg-white shadow-sm inline-flex flex-col items-center justify-between text-center h-[5rem] w-[9.5rem]",
        !isColored && "border-slate-400 text-slate-800"
      )}
    >
      {isNew && (
        <div className="absolute top-1 right-1 bg-primary/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
          NEW
        </div>
      )}
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5">
        {title}
      </div>
      <div className={cn("w-full flex items-center justify-center gap-2 border-y py-0.5", isColored ? 'border-[currentColor]/30' : 'border-slate-200')}>
        <div className="flex flex-col items-center leading-none">
          <span className="text-[18px] font-black text-black">{coupon.value}</span>
          <span className="text-[7px] font-bold uppercase tracking-[0.2em] mt-0.5">
            Points
          </span>
        </div>
        <div className="text-left text-[8px] leading-snug">
          <div className="font-semibold italic text-[9px]">
            {coupon.category}
          </div>
          <div className={cn(isColored ? 'opacity-80' : 'text-slate-600')}>
            Issued by: {coupon.teacher}
          </div>
        </div>
      </div>
      <div className="font-barcode text-[24px] leading-none pt-0.5 text-black tracking-wider">
        *{coupon.code}*
      </div>
    </div>
  );
}
