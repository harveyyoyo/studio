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
    <div className={cn("relative", className)}>
        <Image
          src={logoImage.imageUrl}
          fill
          alt={logoImage.description}
          className="object-cover"
          data-ai-hint={logoImage.imageHint}
          sizes="(max-width: 768px) 32px, 40px"
          priority
        />
    </div>
  );
}
