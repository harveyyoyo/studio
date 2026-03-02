'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Logo({ className }: { className?: string }) {
  const logoImage = PlaceHolderImages.find(img => img.id === 'logo');

  if (!logoImage) {
    // Fallback or empty div if logo isn't found, to avoid crashing.
    return <div className={cn("w-10 h-10 bg-muted rounded-lg", className)}></div>;
  }
  
  return (
    <Image
      src={logoImage.imageUrl}
      width={100}
      height={100}
      alt={logoImage.description}
      className={cn(className)}
      data-ai-hint={logoImage.imageHint}
      priority
    />
  );
}
