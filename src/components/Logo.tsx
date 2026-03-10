'use client';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-visible", className)}>
      <div className="w-5 h-10 relative flex items-center justify-center">
        <Image
          src="/logo coupon.png"
          alt="levelUp EDU Logo"
          width={65}
          height={28}
          className="min-w-[65px] h-auto object-contain rotate-90"
          priority
        />
      </div>
    </div>
  );
}
