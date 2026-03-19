'use client';

import { Edit, Gift, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Switch } from '@/components/ui/switch';
import DynamicIcon from '@/components/DynamicIcon';
import { cn } from '@/lib/utils';
import type { Prize } from '@/lib/types';

export function AdminPrizesTab({
  prizes,
  onAddPrize,
  onEditPrize,
  onDeletePrize,
  onToggleInStock,
}: {
  prizes: Prize[] | null | undefined;
  onAddPrize: () => void;
  onEditPrize: (p: Prize) => void;
  onDeletePrize: (prizeId: string) => void;
  onToggleInStock: (p: Prize, inStock: boolean) => void;
}) {
  return (
    <Card className="border-t-4 border-destructive shadow-md">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <Helper content="Manage items available for student redemption in the Prize Shop.">
            <CardTitle className="flex items-center gap-2">
              <Gift className="text-destructive w-5 h-5" /> Prize Shop
            </CardTitle>
          </Helper>
          <CardDescription>Items available for student redemption.</CardDescription>
        </div>
        <Button onClick={onAddPrize} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add Prize
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
          {prizes
            ?.sort((a, b) => a.points - b.points)
            .map((p) => (
              <li
                key={p.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-secondary/30 p-4 rounded-2xl border group transition-all hover:bg-background"
              >
                <div className="flex items-center gap-4 flex-grow">
                  <div className="flex flex-col items-center">
                    <Switch
                      checked={p.inStock}
                      onCheckedChange={(checked) => onToggleInStock(p, checked)}
                      className="data-[state=checked]:bg-green-500 scale-75"
                    />
                    <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-50">{p.inStock ? 'On' : 'Off'}</p>
                  </div>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-background border flex-shrink-0", !p.inStock && "opacity-40 grayscale")}>
                    <DynamicIcon name={p.icon} className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className={cn("font-bold text-base leading-none mb-1", !p.inStock && "line-through opacity-40")}>{p.name}</p>
                    <p className="text-xs font-bold text-primary">{p.points} points</p>
                  </div>
                </div>
                <div className="flex gap-1 self-end sm:self-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onEditPrize(p)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500" onClick={() => onDeletePrize(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}

