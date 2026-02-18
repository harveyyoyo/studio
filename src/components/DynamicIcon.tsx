'use client';
import * as icons from 'lucide-react';
import React from 'react';

type DynamicIconProps = {
  name: string;
  [key: string]: any; 
};

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const LucideIcon = icons[name as keyof typeof icons];

  // Check if the icon exists and is a valid React component object (lucide icons are objects).
  // This prevents errors if a non-component export (like a helper function) is passed as the name.
  if (!LucideIcon || typeof LucideIcon !== 'object') {
    return <icons.Gift {...props} />; // Fallback icon
  }

  const Component = LucideIcon as React.ElementType;
  return <Component {...props} />;
};

export default DynamicIcon;
