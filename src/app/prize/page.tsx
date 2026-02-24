
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, getDoc } from 'firebase/firestore';
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
import type { Student, Prize } from '@/lib/types';
import {
    Nfc,
    Type,
    Gift,
    LogOut,
    ShoppingBag,
    ArrowLeft,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import DynamicIcon from '@/components/DynamicIcon';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

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

    useEffect(() => {
        if (!studentLoading && !student) {
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {prizes?.filter(p => p.inStock).sort((a, b) => a.points - b.points).map((prize: Prize) => {
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
                    })}
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

    // Same login logic as student kiosk (student/page.tsx) so ID lookup behaves identically
    const handleNfcSubmit = useCallback(async (scannedId?: string) => {
        const rawId = scannedId || nfcId;
        if (!rawId || !schoolId) return;
        const idToSubmit = rawId.trim();

        try {
            let finalStudentId: string | null = null;

            const { getDocs, where, collection, query } = await import('firebase/firestore');
            const studentsRef = collection(firestore, 'schools', schoolId, 'students');

            const qStr = query(studentsRef, where('nfcId', '==', idToSubmit));
            const querySnap = await getDocs(qStr);

            if (!querySnap.empty) {
                finalStudentId = querySnap.docs[0].id;
            } else {
                const asNum = /^\d+$/.test(idToSubmit) ? parseInt(idToSubmit, 10) : NaN;
                if (!Number.isNaN(asNum)) {
                    const qNum = query(studentsRef, where('nfcId', '==', asNum));
                    const numSnap = await getDocs(qNum);
                    if (!numSnap.empty) {
                        finalStudentId = numSnap.docs[0].id;
                    }
                }
            }

            if (finalStudentId == null) {
                const studentSnap = await getDoc(doc(firestore, 'schools', schoolId, 'students', idToSubmit));
                if (studentSnap.exists()) {
                    finalStudentId = studentSnap.id;
                }
            }

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
        return <p>Loading...</p>;
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
                        <CardDescription>Scan your student card to redeem prizes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={loginTab} onValueChange={setLoginTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()}>
                                    <Nfc className="mr-2 h-4 w-4" /> Card
                                </TabsTrigger>
                                <TabsTrigger value="manual">
                                    <Type className="mr-2 h-4 w-4" /> Type
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
                                    <Button onClick={() => handleNfcSubmit()} className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95 bg-primary hover:bg-primary/90">
                                        Login to Redeem
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="text-center mt-6">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="link" className="text-xs h-auto p-0">
                                        <Link href="/portal"><ArrowLeft className="mr-2" /> Back to Portal Selection</Link>
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
