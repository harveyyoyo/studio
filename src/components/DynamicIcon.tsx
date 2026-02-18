'use client';

import React from 'react';
import { icons, Gift } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type DynamicIconProps = LucideProps & {
  name: string;
};

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const Icon = (icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];

  if (!Icon) {
    return <Gift {...props} />;
  }

  return <Icon {...props} />;
};

export default DynamicIcon;
