import type { Coupon } from '@/lib/types';

export function Coupon({ coupon, isNew = false }: { coupon: Coupon, isNew?: boolean }) {
  return (
    <div className="bg-card/80 p-2 border border-dashed rounded-lg flex flex-col items-center justify-between shadow-sm relative overflow-hidden text-center h-full">
      {isNew && (
        <div className="absolute top-1 right-1 bg-primary/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
            NEW
        </div>
      )}
      <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
        Arcade Rewards
      </div>
      <div className="w-full flex items-center justify-center gap-3 border-y my-1 py-1">
        <div className="font-headline text-3xl font-extrabold flex flex-col items-center leading-none">
          {coupon.value}
          <span className="text-[10px] font-sans font-bold tracking-widest uppercase">
            Points
          </span>
        </div>
        <div className="text-left text-xs">
          <div className="font-bold italic text-sm">{coupon.category}</div>
          <div className="text-muted-foreground">
            Issued by: {coupon.teacher}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="font-barcode text-5xl leading-none pt-1 tracking-wider">
          *{coupon.code}*
        </div>
        <div className="font-code text-xs font-bold tracking-wider">
          {coupon.code.split('').join(' ')}
        </div>
      </div>
    </div>
  );
}
