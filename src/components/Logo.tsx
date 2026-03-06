'use client';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative text-foreground", className)}>
       <svg viewBox="0 0 96 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-full h-full", className)}>
        <path d="M91 2H5C3.34315 2 2 3.34315 2 5V12.5C3.38071 12.5 4.5 13.6193 4.5 15V21C4.5 22.3807 3.38071 23.5 2 23.5V31C2 32.6569 3.34315 34 5 34H91C92.6569 34 94 32.6569 94 31V23.5C92.6193 23.5 91.5 22.3807 91.5 21V15C91.5 13.6193 92.6193 12.5 94 12.5V5C94 3.34315 92.6569 2 91 2Z" stroke="currentColor" strokeWidth="3"/>
        <path d="M38.5 22L45.5 16L52.5 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M38.5 16L45.5 10L52.5 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="18" y1="10" x2="18" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="22" y1="10" x2="22" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="26" y1="10" x2="26" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="10" x2="30" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="34" y1="10" x2="34" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="78" y1="10" x2="78" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="74" y1="10" x2="74" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="70" y1="10" x2="70" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="66" y1="10" x2="66" y2="26" stroke="currentColor" strokeWidth="2"/>
        <line x1="62" y1="10" x2="62" y2="26" stroke="currentColor" strokeWidth="2"/>
    </svg>
    </div>
  );
}
