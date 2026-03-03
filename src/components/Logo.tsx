'use client';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative text-foreground", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("w-full h-full dark:invert", className)}
      >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        {/* Barcode lines */}
        <g strokeLinecap="butt">
            <path strokeWidth="1" d="M8 10 V 14" />
            <path strokeWidth="2" d="M10.5 10 V 14" />
            <path strokeWidth="1" d="M13 10 V 14" />
            <path strokeWidth="1.5" d="M15 10 V 14" />
            <path strokeWidth="1" d="M17 10 V 14" />
        </g>
      </svg>
    </div>
  );
}
