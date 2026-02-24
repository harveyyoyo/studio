
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { lookupStudentId } from '@/lib/db';
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
            toast({
                variant: 'destructive',
                title: 'Student not found',
                description: 'The student may have been deleted. Logging out.',
            });
            onDone();
        }
    }, [student, studentLoading, onDone, toast]);

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
    const [nfcId, setNfcId] = useState('');
    const nfcInputRef = useRef<HTMLInputElement>(null);
    const [loginTab, setLoginTab] = useState('nfc');
    const [hasCameraPermission, setHasCameraPermission] = useState(true);

    const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
        loginTab === 'camera' && !activeStudentId,
        (code) => handleNfcSubmit(code),
        (err) => {
            setHasCameraPermission(false);
            if (loginTab === 'camera') setLoginTab('nfc');
            toast({ variant: 'destructive', title: 'Camera Error', description: err });
        }
    );

    useEffect(() => { setHasCameraPermission(hookHasPermission); }, [hookHasPermission]);

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    useEffect(() => {
        if (!activeStudentId && loginTab === 'nfc') {
            setTimeout(() => nfcInputRef.current?.focus(), 100);
        }
    }, [activeStudentId, loginTab]);

    const handleNfcSubmit = useCallback(async (scannedId?: string) => {
        const rawId = scannedId || nfcId;
        if (!rawId?.trim() || !schoolId) return;

        try {
            const finalStudentId = await lookupStudentId(firestore, schoolId, rawId.trim());
            if (finalStudentId) {
                setActiveStudentId(finalStudentId);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Student Not Found',
                    description: 'The provided ID does not match any student.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not look up student.',
            });
        }
        setNfcId('');
    }, [firestore, schoolId, nfcId, toast]);

    const handleDone = useCallback(() => {
        setActiveStudentId(null);
        setNfcId('');
        setLoginTab('nfc');
    }, []);

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
                <Card className="w-full max-w-md border-t-4 border-chart-3">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-accent p-4 rounded-full mb-4 w-24 h-24 flex items-center justify-center">
                            <Gift className="w-16 h-16 text-chart-3" />
                        </div>
                        <CardTitle className="text-2xl font-bold font-headline">
                            Prize Redemption
                        </CardTitle>
                        <CardDescription>Choose how to identify the student below. Scan a card, type an ID, or use the camera.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={loginTab} onValueChange={setLoginTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()}>
                                    <Nfc className="mr-2 h-4 w-4" /> Card
                                </TabsTrigger>
                                <TabsTrigger value="manual">
                                    <Type className="mr-2 h-4 w-4" /> Type
                                </TabsTrigger>
                                <TabsTrigger value="camera">
                                    <Camera className="mr-2 h-4 w-4" /> Scan
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="nfc" className="text-center">
                                <div className="py-8 space-y-4">
                                    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/50 dark:border-primary/40 animate-pulse"></div>
                                        <Nfc className="w-16 h-16 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">
                                        Tap your card on the reader...
                                    </p>
                                    <Input
                                        ref={nfcInputRef}
                                        type="text"
                                        className="absolute -top-[9999px] -left-[9999px]"
                                        value={nfcId}
                                        onChange={(e) => setNfcId(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNfcSubmit()}
                                        autoFocus
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="manual">
                                <div className="space-y-6 py-4">
                                    <div className="space-y-3">
                                        <Label htmlFor="manual-nfcId-prize" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Student ID Code</Label>
                                        <Input
                                            id="manual-nfcId-prize"
                                            className="h-16 rounded-2xl text-2xl font-mono text-center border-2 border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner"
                                            value={nfcId}
                                            onChange={(e) => setNfcId(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleNfcSubmit()}
                                            placeholder="e.g. 100"
                                            autoFocus
                                        />
                                    </div>
                                    <Button onClick={() => handleNfcSubmit()} className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95 bg-primary hover:bg-primary/90 text-white">
                                        Login to Redeem
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="camera">
                                <div className="py-4 space-y-6">
                                    <div className="relative border-4 border-slate-100 rounded-2xl overflow-hidden shadow-xl bg-black">
                                        <video ref={videoRef} className="w-full aspect-square object-cover" playsInline muted />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-3/4 h-3/4 border-2 border-white/30 rounded-xl border-dashed animate-pulse" />
                                        </div>
                                        {!hasCameraPermission && (
                                            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                                <Camera className="w-12 h-12 text-red-400 mb-4" />
                                                <p className="text-white font-bold">Camera access required</p>
                                                <p className="text-white/60 text-xs mt-2">Please enable camera in settings</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Position barcode within the frame</p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="text-center mt-6">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="link" className="text-xs h-auto p-0">
                                        <Link href="/portal"><ArrowLeft className="mr-2" /> Back to portal</Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Return to the main portal selection screen.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
