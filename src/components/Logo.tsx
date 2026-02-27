import React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-primary", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path
          d="M50 15L5 35L50 55L95 35L50 15Z"
          fill="currentColor"
          className="opacity-80"
        />
        <path
          d="M5 35V65L50 85V55L5 35Z"
          fill="currentColor"
          className="opacity-100"
        />
        <path
          d="M95 35V65L50 85V55L95 35Z"
          fill="currentColor"
          className="opacity-60"
        />
        <path
          d="M60 25L55.5 35.5L45 38L52.5 45L50 55.5L60 50L70 55.5L67.5 45L75 38L64.5 35.5L60 25Z"
          fill="white"
        />
      </g>
    </svg>
  );
}
