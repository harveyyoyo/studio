'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Student } from '@/lib/types';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/components/AppProvider';
import { Separator } from '@/components/ui/separator';

interface StudentActivityModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  student: Student | null;
}

export function StudentActivityModal({ isOpen, setIsOpen, student }: StudentActivityModalProps) {
  const { getStudentPointsByCategory } = useAppContext();
  
  if (!student) {
    return null;
  }

  const pointsByCategory = getStudentPointsByCategory(student.id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Activity for {student.firstName} {student.lastName}
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="font-bold text-primary">{student.points.toLocaleString()} points</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold mb-2">Points by Category</h4>
                <ScrollArea className="h-24 w-full pr-4">
                    <ul className="space-y-1">
                        {Object.entries(pointsByCategory).map(([category, points]) => (
                            <li key={category} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{category}</span>
                                <span className="font-bold">{points} pts</span>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </div>
            <div className="md:border-l md:pl-6">
                <h4 className="font-semibold mb-2">Full History</h4>
                <ScrollArea className="h-72 w-full pr-4">
                    <ul className="space-y-4">
                    {student.history.length > 0 ? (
                        student.history
                        .sort((a, b) => b.date - a.date)
                        .map((item, index) => (
                            <li
                            key={index}
                            className="flex justify-between items-center text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border"
                            >
                            <div>
                                <p className="font-medium">{item.desc}</p>
                                <p className="text-xs text-muted-foreground">
                                {format(new Date(item.date), 'MMM d, yyyy, h:mm a')}
                                </p>
                            </div>
                            <Badge
                                variant={item.amount >= 0 ? 'default' : 'destructive'}
                                className={`font-bold ${item.amount >= 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                            >
                                {item.amount > 0 ? `+${item.amount}` : item.amount}
                            </Badge>
                            </li>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground italic py-4">
                        No transaction history yet.
                        </p>
                    )}
                    </ul>
                </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
