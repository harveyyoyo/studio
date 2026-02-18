'use client';
import * as icons from 'lucide-react';
import React from 'react';

type DynamicIconProps = {
  name: string;
  [key: string]: any; 
};

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const LucideIcon = icons[name as keyof typeof icons];

  // A more robust check. A valid ForwardRef component (which lucide-react icons are)
  // is an object that has a 'render' function. This filters out other exports.
  if (LucideIcon && typeof LucideIcon === 'object' && 'render' in LucideIcon) {
    const Component = LucideIcon as unknown as React.ElementType;
    return <Component {...props} />;
  }

  // Fallback for any invalid icon name.
  return <icons.Gift {...props} />; 
};

export default DynamicIcon;
