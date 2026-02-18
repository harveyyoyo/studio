'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { Prize } from '@/lib/types';
import DynamicIcon from './DynamicIcon';
import { Switch } from './ui/switch';

interface PrizeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  prize: Prize | null;
}

export function PrizeModal({ isOpen, setIsOpen, prize }: PrizeModalProps) {
  const { addPrize, updatePrize } = useAppContext();
  const [name, setName] = useState('');
  const [points, setPoints] = useState('0');
  const [icon, setIcon] = useState('Gift');
  const [inStock, setInStock] = useState(true);
  const { toast } = useToast();

  const isEditing = !!prize;

  useEffect(() => {
    if (isOpen) {
      if (prize) { // Edit mode
        setName(prize.name);
        setPoints(prize.points.toString());
        setIcon(prize.icon);
        setInStock(prize.inStock);
      } else { // Create mode
        setName('');
        setPoints('0');
        setIcon('Gift');
        setInStock(true);
      }
    }
  }, [prize, isOpen]);

  const handleSave = async () => {
    const pointsValue = parseInt(points);
    if (!name || !icon) {
      toast({ variant: 'destructive', title: 'Name and Icon are required.' });
      return;
    }
     if (isNaN(pointsValue) || pointsValue < 0) {
      toast({ variant: 'destructive', title: 'Points must be a positive number.' });
      return;
    }

    if (isEditing && prize) {
      const updatedPrize: Prize = { ...prize, name, points: pointsValue, icon, inStock };
      await updatePrize(updatedPrize);
      toast({ title: 'Prize updated!' });
    } else {
      const newPrize = { name, points: pointsValue, icon, inStock };
      await addPrize(newPrize);
      toast({ title: 'Prize added!' });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Prize' : 'New Prize'}</DialogTitle>
           <DialogDescription>
            Enter the prize details below. For the icon, use any valid name from the Lucide icon library.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="prize-name">Prize Name</Label>
            <Input id="prize-name" value={name} onChange={e => setName(e.target.value)} />
          </div>
           <div className="space-y-1">
            <Label htmlFor="prize-points">Point Cost</Label>
            <Input id="prize-points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prize-icon">Icon Name</Label>
            <div className="flex items-center gap-2">
              <Input id="prize-icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g., 'Gift', 'Star', 'Trophy'" />
              <div className="p-2 border rounded-md bg-secondary">
                <DynamicIcon name={icon} className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="in-stock">In Stock</Label>
              <p className="text-xs text-muted-foreground">
                Is this prize currently available for redemption?
              </p>
            </div>
            <Switch
              id="in-stock"
              checked={inStock}
              onCheckedChange={setInStock}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
