'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { StudentScanner } from '@/components/StudentScanner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem } from '@/lib/types';
import { format } from 'date-fns';
import {
    Gift,
    LogOut,
    ShoppingBag,
    ChevronRight,
    Clock,
    ShoppingBasket,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from '@/components/providers/SettingsProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function ConfirmRedemptionDialog({
    student,
    prize,
    isOpen,
    onOpenChange,
    onConfirm
}: {
    student: Student | null,
    prize: Prize | null,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onConfirm: (quantity: number) => void
}) {
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
        }
    }, [isOpen]);

    if (!prize || !student) return null;

    const totalCost = prize.points * quantity;
    const canAfford = student.points >= totalCost;
    const remainingPoints = student.points - totalCost;

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are redeeming <span className="font-bold">{prize.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24"
                        />
                    </div>
                    <div className="text-sm space-y-1 bg-secondary p-3 rounded-lg">
                        <div className="flex justify-between"><span>Total Cost:</span> <span className="font-bold">{totalCost.toLocaleString()} pts</span></div>
                        <div className={`flex justify-between ${!canAfford ? 'text-destructive' : ''}`}><span>Your balance after:</span> <span className="font-bold">{remainingPoints.toLocaleString()} pts</span></div>
                    </div>
                    {!canAfford && <p className="text-sm text-destructive font-bold text-center">You don't have enough points for this quantity.</p>}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onConfirm(quantity)} disabled={!canAfford}>
                        Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function PrizeActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
    const firestore = useFirestore();
    const activitiesQuery = useMemoFirebase(() => (
        query(
            collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
            orderBy('date', 'desc'),
            limit(20)
        )
    ), [firestore, schoolId, studentId]);
    const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

    if (isLoading) {
        return <div className="py-4 text-center text-sm text-muted-foreground">Loading history...</div>;
    }

    return (
        <ScrollArea className="h-[400px] w-full pr-4">
            <ul className="space-y-3">
                {history && history.length > 0 ? (
                    history.map((item, index) => (
                        <li key={index} className="bg-background/50 rounded-xl p-3 border border-border/40 transition-all hover:bg-background/80">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-sm text-foreground truncate">{item.desc}</p>
                                <Badge variant={item.amount > 0 ? 'default' : 'secondary'} className={cn("text-[10px] h-5 px-1.5", item.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                    {item.amount > 0 ? `+${item.amount}` : item.amount} pts
                                </Badge>
                            </div>
                            {item.date && (
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{format(new Date(item.date), 'MMM d, h:mm a')}</p>
                            )}
                        </li>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground italic py-4 text-sm font-medium">No recent activity.</p>
                )}
            </ul>
        </ScrollArea>
    );
}

function PrizeDashboard({
    studentId,
    onDone,
}: {
    studentId: string;
    onDone: () => void;
}) {
    const { schoolId, redeemPrize } = useAppContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const [hoveredPrize, setHoveredPrize] = useState<string | null>(null);
    const { settings } = useSettings();
    const [confirmingPrize, setConfirmingPrize] = useState<Prize | null>(null);

    const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

    const handleRedeemReward = async (prize: Prize, quantity: number) => {
        if (!student) return;
        await redeemPrize(student.id, prize, quantity);
        playSound('redeem');
        toast({
            title: 'Reward Redeemed!',
            description: `Successfully redeemed ${prize.name}${quantity > 1 ? ` (x${quantity})` : ''}.`,
        });
        setConfirmingPrize(null);
    };

    if (studentLoading || prizesLoading || !student) {
        return (
            <div className="space-y-6 animate-pulse p-8">
                <Skeleton className="h-32 w-full rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className={cn("min-h-screen bg-background text-foreground relative overflow-hidden font-sans flex flex-col items-center", settings.displayMode === 'app' && 'pb-24')}>
                 {/* Noise overlay */}
                <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

                <main className="relative z-10 w-full max-w-6xl px-8">
                  <Card className="border-t-8 border-chart-3 shadow-2xl mt-12 mb-24 bg-card/80 backdrop-blur-md">
                    <CardContent className="p-6 md:p-8">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                          <div className="text-center md:text-left">
                              <h2 className="text-5xl font-black tracking-tighter text-primary font-headline drop-shadow-sm mb-4 flex items-center justify-center md:justify-start gap-4">
                                  <ShoppingBag className="w-12 h-12 text-chart-3" /> Prize Shop
                              </h2>
                              <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">
                                  Redeem your points for rewards
                              </p>
                          </div>
                          <div className="bg-card/40 backdrop-blur-md border-2 border-primary/20 rounded-3xl p-6 px-10 text-center shadow-xl">
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{student.firstName} {student.lastName}</p>
                              <p className="text-4xl font-black text-primary tracking-tighter">{(student.points || 0).toLocaleString()} <span className="text-sm text-primary/60 font-bold uppercase tracking-widest ml-1">pts</span></p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
                          {/* Prizes Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-fit">
                              {(!prizes || prizes.filter(p => p.inStock).length === 0) ? (
                                  <div className="col-span-full py-20 text-center bg-card/30 backdrop-blur-sm rounded-3xl border-2 border-dashed border-border">
                                      <ShoppingBasket className="w-20 h-20 mx-auto text-muted-foreground/30 mb-6" />
                                      <p className="font-black text-2xl text-muted-foreground">The shop is empty</p>
                                      <p className="text-sm text-muted-foreground/60 font-medium mt-2 uppercase tracking-widest">Check back soon for new rewards!</p>
                                  </div>
                              ) : (
                                  prizes.filter(p => p.inStock).sort((a, b) => a.points - b.points).map((prize: Prize, index) => {
                                      const canAfford = student.points >= prize.points;
                                      const isHovered = hoveredPrize === prize.id;

                                      return (
                                          <motion.div
                                              key={prize.id}
                                              initial={{ opacity: 0, y: 20 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{ delay: index * 0.05 }}
                                              onMouseEnter={() => setHoveredPrize(prize.id)}
                                              onMouseLeave={() => setHoveredPrize(null)}
                                              className={cn(
                                                  "group relative flex flex-col items-center justify-between text-center p-8 rounded-3xl border-2 border-transparent transition-all duration-300",
                                                  canAfford ? "bg-card/40 backdrop-blur-sm hover:bg-card hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1" : "bg-card/10 opacity-60 grayscale cursor-not-allowed"
                                              )}
                                          >
                                               {/* SVG Border Draw Animation */}
                                              {isHovered && canAfford && (
                                                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-3xl z-20">
                                                      <motion.rect
                                                          initial={{ pathLength: 0 }}
                                                          animate={{ pathLength: 1 }}
                                                          transition={{ duration: 0.6 }}
                                                          width="100%"
                                                          height="100%"
                                                          rx="24"
                                                          className="stroke-primary stroke-[3px] fill-none"
                                                      />
                                                  </svg>
                                              )}

                                              <div className={cn(
                                                  "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500",
                                                  canAfford ? "bg-primary/10 text-primary group-hover:scale-110 group-hover:rotate-6" : "bg-muted text-muted-foreground",
                                                  isHovered && canAfford ? "grayscale-0" : "grayscale"
                                              )}>
                                                  <DynamicIcon name={prize.icon} className="w-10 h-10" />
                                              </div>

                                              <div className="mb-6">
                                                  <h3 className="font-black text-xl text-foreground tracking-tight line-clamp-1">{prize.name}</h3>
                                                  <div className="mt-3 flex items-center justify-center gap-2">
                                                      <Badge className="bg-primary text-primary-foreground font-black text-base px-4 py-1 rounded-xl">
                                                          {prize.points.toLocaleString()} pts
                                                      </Badge>
                                                  </div>
                                              </div>

                                              <Button 
                                                  onClick={() => setConfirmingPrize(prize)}
                                                  disabled={!canAfford}
                                                  className={cn(
                                                      "w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs transition-all",
                                                      canAfford ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                                                  )}
                                              >
                                                  <Gift className="mr-2 w-4 h-4" /> Redeem Now
                                              </Button>

                                              <AnimatePresence>
                                                  {isHovered && canAfford && (
                                                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.05 }} exit={{ opacity: 0 }} className="absolute inset-0 rounded-3xl pointer-events-none bg-primary" />
                                                  )}
                                              </AnimatePresence>
                                          </motion.div>
                                      );
                                  })
                              )}
                          </div>

                          {/* Sidebar */}
                          <div className="space-y-6">
                              <Card className="bg-card/40 backdrop-blur-sm border-2 border-border/50 rounded-3xl overflow-hidden shadow-xl">
                                  <CardHeader className="bg-primary/5 border-b border-border/50 py-6 px-8">
                                      <CardTitle className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3 text-primary">
                                          <Clock className="w-5 h-5 text-chart-3" /> Recent Activity
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-6">
                                      <PrizeActivityList schoolId={schoolId!} studentId={student.id} />
                                  </CardContent>
                              </Card>

                              <Button 
                                  variant="outline" 
                                  className="w-full h-16 rounded-3xl border-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-black uppercase tracking-widest text-xs transition-all group" 
                                  onClick={onDone}
                              >
                                  <LogOut className="mr-2 w-5 h-5 transition-transform group-hover:-translate-x-1" /> Log Out & Finish
                              </Button>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                </main>
                 <ConfirmRedemptionDialog
                    isOpen={!!confirmingPrize}
                    onOpenChange={setConfirmingPrize}
                    student={student}
                    prize={confirmingPrize}
                    onConfirm={(quantity) => confirmingPrize && handleRedeemReward(confirmingPrize, quantity)}
                />
            </div>
        </TooltipProvider>
    );
}

export default function PrizePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();
    const { toast } = useToast();
    const { settings } = useSettings();

    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    const handleDone = useCallback(() => {
        setActiveStudentId(null);
    }, []);

    const handleUnlockRequest = () => {
        setIsLocked(false);
        toast({ title: "Unlocked", description: "Scanner unlocked." });
    };

    if (!isInitialized || loginState !== 'school') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-full h-full bg-primary" />
                </div>
            </div>
        );
    }

    if (activeStudentId) {
        return <PrizeDashboard studentId={activeStudentId} onDone={handleDone} />;
    }

    return (
        <TooltipProvider>
            <div className={cn("min-h-[80vh] flex flex-col items-center justify-center", settings.displayMode === 'app' && 'pb-24')}>
                <StudentScanner
                    onStudentFound={setActiveStudentId}
                    title="Prize Redemption"
                    description="Choose how to identify the student below."
                    icon={<Gift className="w-10 h-10 text-chart-3" />}
                    isLocked={isLocked}
                    setIsLocked={setIsLocked}
                    onUnlockRequest={handleUnlockRequest}
                />
            </div>
        </TooltipProvider>
    );
}
