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
    <div style={style} className={cn("p-2 border border-dashed rounded-lg flex flex-col items-center justify-between shadow-sm relative overflow-hidden text-center h-full bg-white")}>
      {isNew && (
        <div className="absolute top-1 right-1 bg-primary/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
          NEW
        </div>
      )}
      <div className={cn("font-bold text-[10px] uppercase tracking-wider px-1", isColored ? '' : 'text-muted-foreground')}>
        {title}
      </div>
      <div className={cn("w-full flex items-center justify-center gap-3 border-y my-1 py-1", isColored ? 'border-[currentColor]/20' : 'border-border')}>
        <div className={cn("font-headline text-3xl font-extrabold flex flex-col items-center leading-none", !isColored && 'text-foreground')}>
          {coupon.value}
          <span className={cn("text-[10px] font-sans font-bold tracking-widest uppercase", isColored ? 'opacity-80' : '')}>
            Points
          </span>
        </div>
        <div className="text-left text-xs">
          <div className="font-bold italic text-sm">{coupon.category}</div>
          <div className={cn(isColored ? 'opacity-70' : 'text-muted-foreground')}>
            Issued by: {coupon.teacher}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className={cn("font-barcode text-5xl leading-none pt-1 tracking-wider text-black")}>
          *{coupon.code}*
        </div>
      </div>
    </div>
  );
}
