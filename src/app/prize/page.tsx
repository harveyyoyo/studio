
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { lookupStudentId } from '@/lib/db';
import { StudentScanner } from '@/components/StudentScanner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem } from '@/lib/types';
import { format } from 'date-fns';
import {
    Nfc,
    Type,
    Camera,
    Gift,
    LogOut,
    ShoppingBag,
    ArrowLeft,
    ChevronRight,
    Clock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useArcadeSound } from '@/hooks/useArcadeSound';

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
        <ScrollArea className="h-56 w-full pr-4">
            <ul className="space-y-2">
                {history && history.length > 0 ? (
                    history.map((item, index) => (
                        <li key={index} className="flex justify-between items-center text-sm py-2 px-1 border-b border-border last:border-b-0">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{item.desc}</p>
                                {item.date && (
                                    <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'MMM d, yyyy h:mm a')}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                <Badge variant={item.amount > 0 ? 'default' : 'secondary'} className={cn("text-xs", item.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                    {item.amount > 0 ? `+${item.amount}` : item.amount} pts
                                </Badge>
                            </div>
                        </li>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground italic py-4 text-sm">No activity history yet.</p>
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

    const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

    // Track whether useDoc has done its first load (isLoading starts false, goes true, then back to false)
    const hasLoadedOnce = useRef(false);
    useEffect(() => {
        if (studentLoading) hasLoadedOnce.current = true;
    }, [studentLoading]);

    useEffect(() => {
        if (hasLoadedOnce.current && !studentLoading && !student) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Student not found',
                description: 'The student may have been deleted. Logging out.',
            });
            onDone();
        }
    }, [student, studentLoading, onDone, toast, playSound]);

    if (studentLoading || prizesLoading || !student) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-28 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            </div>
        );
    }

    const handleRedeemReward = async (prize: Prize) => {
        await redeemPrize(student.id, prize);
        playSound('redeem');
        toast({
            title: 'Reward Redeemed!',
            description: `You redeemed a ${prize.name} for ${prize.points} points.`,
        });
    };

    return (
        <TooltipProvider>
            <div className="space-y-6 animate-in fade-in-50">
                <Card className="bg-card border-t-4 border-chart-3">
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">School: {schoolId?.replace(/_/g, ' ')}</p>
                            <CardTitle className="font-headline text-2xl flex items-center gap-2">
                                <ShoppingBag className="text-chart-3" /> Prize Shop
                            </CardTitle>
                            <CardDescription>Redeem your points for awesome prizes!</CardDescription>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-sm font-bold">{student.firstName} {student.lastName}</p>
                            <p className="text-2xl font-bold text-primary">{student.points.toLocaleString()} pts</p>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(!prizes || prizes.filter(p => p.inStock).length === 0) ? (
                            <Card className="col-span-full p-10 text-center">
                                <Gift className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
                                <p className="font-bold text-lg text-foreground">No prizes available right now</p>
                                <p className="text-sm text-muted-foreground mt-2">Check back later or ask your teacher to add prizes.</p>
                            </Card>
                        ) : (
                            prizes.filter(p => p.inStock).sort((a, b) => a.points - b.points).map((prize: Prize) => {
                                const canAfford = student.points >= prize.points;
                                return (
                                    <Card key={prize.id} className={cn(
                                        "p-4 flex flex-col items-center justify-between text-center bg-background dark:bg-card transition-all",
                                        !canAfford && "opacity-60 grayscale"
                                    )}>
                                        <div className="p-6 bg-accent rounded-full mb-3 text-primary">
                                            <DynamicIcon name={prize.icon} className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-xl">{prize.name}</p>
                                        <Badge variant="secondary" className="my-3 text-lg font-bold">{prize.points.toLocaleString()} pts</Badge>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button onClick={() => handleRedeemReward(prize)} disabled={!canAfford} className="w-full">
                                                    <Gift className="mr-2" /> Redeem
                                                </Button>
                                            </TooltipTrigger>
                                            {!canAfford && (
                                                <TooltipContent>
                                                    <p>You need {prize.points - student.points} more points for this prize.</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                    <Card className="h-fit lg:sticky lg:top-4">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-muted-foreground" /> Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PrizeActivityList schoolId={schoolId!} studentId={student.id} />
                        </CardContent>
                    </Card>
                </div>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="destructive" className="w-full mt-4" onClick={onDone}>
                            <LogOut className="mr-2" /> Log Out & Finish
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>End your session in the prize shop.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}

export default function PrizePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    const handleDone = useCallback(() => {
        setActiveStudentId(null);
    }, []);

    const handleUnlockRequest = () => {
        // Simple unlock for now, just toggle state
        // In a real app, this would probably open a password modal
        setIsLocked(false);
        toast({
            title: "Unlocked",
            description: "Scanner unlocked."
        });
    };

    if (!isInitialized || loginState !== 'school') {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
                <p className="font-medium">Just a moment…</p>
                <p className="text-sm">Loading your school.</p>
            </div>
        );
    }

    if (activeStudentId) {
        return <PrizeDashboard studentId={activeStudentId} onDone={handleDone} />;
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col items-center justify-center py-10">
                <StudentScanner
                    onStudentFound={setActiveStudentId}
                    title="Prize Redemption"
                    description="Choose how to identify the student below."
                    icon={<Gift className="w-8 h-8" />}
                    isLocked={isLocked}
                    setIsLocked={setIsLocked}
                    onUnlockRequest={handleUnlockRequest}
                />
            </div>
        </TooltipProvider>
    );
}
