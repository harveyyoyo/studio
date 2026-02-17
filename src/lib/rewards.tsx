import { Pencil, Gift, FileText } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Reward {
  name: string;
  points: number;
  icon: ReactNode;
}

export const rewards: Reward[] = [
  { name: 'Cool Pencil', points: 50, icon: <Pencil className="w-8 h-8" /> },
  { name: 'Candy Bar', points: 150, icon: <Gift className="w-8 h-8" /> },
  { name: 'Homework Pass', points: 500, icon: <FileText className="w-8 h-8" /> },
];
