'use client';
import * as icons from 'lucide-react';

type DynamicIconProps = {
  name: string;
  [key: string]: any; 
};

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const LucideIcon = icons[name as keyof typeof icons];

  if (!LucideIcon) {
    return <icons.Gift {...props} />; // Fallback icon
  }

  return <LucideIcon {...props} />;
};

export default DynamicIcon;
