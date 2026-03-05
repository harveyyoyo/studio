'use client';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative text-foreground", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("w-full h-full", className)}
      >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        {/* Barcode with thinner lines */}
        <line x1="8" y1="10" x2="8" y2="14" strokeWidth="1.2" />
        <line x1="10" y1="10" x2="10" y2="14" strokeWidth="0.8" />
        <line x1="12" y1="10" x2="12" y2="14" strokeWidth="1.6" />
        <line x1="14" y1="10" x2="14" y2="14" strokeWidth="0.8" />
        <line x1="16" y1="10" x2="16" y2="14" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
