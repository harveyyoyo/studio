'use client';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
       <Image 
         src="/logo coupon.png" 
         alt="levelUp EDU Logo" 
         width={100} 
         height={42} 
         className="w-full h-auto object-contain"
         priority
       />
    </div>
  );
}
