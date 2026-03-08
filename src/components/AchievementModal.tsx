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
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { Achievement, Category } from '@/lib/types';
import DynamicIcon from './DynamicIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useArcadeSound } from '@/hooks/useArcadeSound';

interface AchievementModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    achievement: Achievement | null;
    categories: Category[];
}

export function AchievementModal({ isOpen, setIsOpen, achievement, categories }: AchievementModalProps) {
    const { addAchievement, updateAchievement } = useAppContext();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('Trophy');
    const [type, setType] = useState<Achievement['criteria']['type']>('points');
    const [threshold, setThreshold] = useState('100');
    const [categoryId, setCategoryId] = useState<string>('');
    const [bonusPoints, setBonusPoints] = useState('0');
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const isEditing = !!achievement;

    useEffect(() => {
        if (isOpen) {
            if (achievement) { // Edit mode
                setName(achievement.name);
                setDescription(achievement.description);
                setIcon(achievement.icon);
                setType(achievement.criteria.type);
                setThreshold(achievement.criteria.threshold.toString());
                setCategoryId(achievement.criteria.categoryId || '');
                setBonusPoints((achievement.bonusPoints || 0).toString());
            } else { // Create mode
                setName('');
                setDescription('');
                setIcon('Trophy');
                setType('points');
                setThreshold('100');
                setCategoryId('');
                setBonusPoints('0');
            }
        }
    }, [achievement, isOpen]);

    const handleSave = async () => {
        const thresholdValue = parseInt(threshold);
        const bonusPointsValue = parseInt(bonusPoints);

        if (!name || !description || !icon) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Name, Description, and Icon are required.' });
            return;
        }

        if (isNaN(thresholdValue) || thresholdValue < 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Invalid Threshold', description: 'Threshold must be a non-negative number.' });
            return;
        }

        const data: Omit<Achievement, 'id'> = {
            name,
            description,
            icon,
            criteria: {
                type,
                threshold: thresholdValue,
                categoryId: type === 'points' && categoryId ? categoryId : undefined,
            },
            bonusPoints: isNaN(bonusPointsValue) ? 0 : bonusPointsValue,
        };

        try {
            if (isEditing && achievement) {
                await updateAchievement({ ...data, id: achievement.id });
                playSound('success');
                toast({ title: 'Achievement updated!' });
            } else {
                await addAchievement(data);
                playSound('success');
                toast({ title: 'Achievement added!' });
            }
            setIsOpen(false);
        } catch (err: any) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Error saving achievement', description: err.message });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Achievement' : 'New Achievement'}</DialogTitle>
                    <DialogDescription>
                        Define the rules for earning this achievement.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="ach-name">Name</Label>
                        <Input id="ach-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Early Bird" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ach-desc">Description</Label>
                        <Input id="ach-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Earn your first 100 points" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="ach-icon">Icon</Label>
                            <div className="flex items-center gap-2">
                                <Input id="ach-icon" value={icon} onChange={e => setIcon(e.target.value)} />
                                <div className="p-2 border rounded-md bg-secondary flex items-center justify-center w-10 h-10">
                                    <DynamicIcon name={icon} className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ach-bonus">Bonus Points</Label>
                            <Input id="ach-bonus" type="number" value={bonusPoints} onChange={e => setBonusPoints(e.target.value)} />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Criteria</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Type</Label>
                                <Select value={type} onValueChange={(v: any) => setType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="points">Current Points</SelectItem>
                                        <SelectItem value="lifetimePoints">Total Points</SelectItem>
                                        <SelectItem value="coupons">Coupons Redeemed</SelectItem>
                                        <SelectItem value="manual">Manual Award</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Threshold</Label>
                                <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} disabled={type === 'manual'} />
                            </div>
                        </div>

                        {type === 'points' && (
                            <div className="space-y-1">
                                <Label>Specific Category (Optional)</Label>
                                <Select value={categoryId || 'all'} onValueChange={v => setCategoryId(v === 'all' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Achievement</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
