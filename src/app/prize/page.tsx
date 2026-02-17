'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAppContext } from '@/components/AppProvider';
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
import type { Student } from '@/lib/types';
import { rewards, Reward } from '@/lib/rewards';
import {
  Nfc,
  Type,
  Gift,
  LogOut,
  ShoppingBag,
  ArrowLeft
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function PrizeDashboard({
  student,
  onDone,
}: {
  student: Student;
  onDone: () => void;
}) {
    const { updateStudent } = useAppContext();
    const { toast } = useToast();
    const [logoutTimer, setLogoutTimer] = useState(30);

    const resetTimer = useCallback(() => setLogoutTimer(30), []);

    // Auto-logout timer effect
    useEffect(() => {
        const handleDone = () => onDone();
        if (logoutTimer <= 0) {
        handleDone();
        return;
        }

        const intervalId = setInterval(() => {
        setLogoutTimer((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [logoutTimer, onDone]);

    const handleRedeemReward = async (reward: Reward) => {
        resetTimer();
        if (student.points < reward.points) {
            toast({
                variant: 'destructive',
                title: 'Not enough points',
                description: `You need ${reward.points} points to redeem this item.`,
            });
            return;
        }

        const newHistoryItem = {
            desc: `Redeemed: ${reward.name}`,
            amount: -reward.points,
            date: Date.now(),
        };

        const updatedStudent: Student = {
            ...student,
            points: student.points - reward.points,
            history: [newHistoryItem, ...student.history],
        };

        await updateStudent(updatedStudent);
        toast({
            title: 'Reward Redeemed!',
            description: `You redeemed a ${reward.name} for ${reward.points} points. Your new balance is ${updatedStudent.points}.`,
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in-50">
            <Card className="bg-card border-t-4 border-chart-3">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <ShoppingBag className="text-chart-3" /> Prize Shop
                        </CardTitle>
                        <CardDescription>Redeem your points for awesome prizes!</CardDescription>
                    </div>
                     <div className="text-right">
                        <p className="text-sm font-bold">{student.firstName} {student.lastName}</p>
                        <p className="text-2xl font-bold text-primary">{student.points.toLocaleString()} pts</p>
                    </div>
                </CardHeader>
            </Card>

             <div className="text-center text-sm bg-secondary p-2 rounded-md">
                Auto-logging out in {logoutTimer} seconds...
             </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward: Reward) => (
                    <Card key={reward.name} className="p-4 flex flex-col items-center justify-between text-center bg-background dark:bg-card transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="p-6 bg-accent rounded-full mb-3 text-primary">
                            {reward.icon}
                        </div>
                        <p className="font-bold text-xl">{reward.name}</p>
                        <Badge variant="secondary" className="my-3 text-lg font-bold">{reward.points.toLocaleString()} pts</Badge>
                        <Button onClick={() => handleRedeemReward(reward)} disabled={student.points < reward.points} className="w-full">
                            <Gift className="mr-2" /> Redeem
                        </Button>
                    </Card>
                ))}
            </div>

             <Button variant="destructive" className="w-full mt-4" onClick={onDone}>
                <LogOut className="mr-2"/> Log Out & Finish
            </Button>
        </div>
    );
}

export default function PrizePage() {
    const { loginState, isInitialized, schoolId, db } = useAppContext();
    const router = useRouter();
    const { toast } = useToast();

    const [activeStudent, setActiveStudent] = useState<Student | null>(null);
    const [nfcId, setNfcId] = useState('');
    const nfcInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);
    
    useEffect(() => {
        if (!activeStudent) {
            setTimeout(() => nfcInputRef.current?.focus(), 100);
        }
    }, [activeStudent]);

    const handleNfcSubmit = () => {
        if(!nfcId) return;
        const student = db.students.find((s) => s.nfcId === nfcId);
        if (student) {
        setActiveStudent(student);
        } else {
        toast({
            variant: 'destructive',
            title: 'Student Not Found',
            description: 'The provided ID does not match any student.',
        });
        }
        setNfcId('');
    };

    const handleDone = useCallback(() => {
        setActiveStudent(null);
        setNfcId('');
    }, []);

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }

    if (activeStudent) {
        return <PrizeDashboard student={activeStudent} onDone={handleDone} />;
    }

    return (
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
            <Tabs defaultValue="nfc" className="w-full" onValueChange={() => nfcInputRef.current?.focus()}>
                <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nfc">
                    <Nfc className="mr-2 h-4 w-4" /> NFC Card
                </TabsTrigger>
                <TabsTrigger value="manual">
                    <Type className="mr-2 h-4 w-4" /> Manual
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
                    onKeyPress={(e) => e.key === 'Enter' && handleNfcSubmit()}
                    autoFocus
                    />
                </div>
                </TabsContent>
                <TabsContent value="manual">
                <div className="space-y-4 py-4">
                    <div>
                    <Label htmlFor="manual-nfcId">Student NFC ID</Label>
                    <Input
                        id="manual-nfcId"
                        value={nfcId}
                        onChange={(e) => setNfcId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleNfcSubmit()}
                        placeholder="Enter student NFC ID"
                    />
                    </div>
                    <Button onClick={handleNfcSubmit} className="w-full">
                    Login to Redeem
                    </Button>
                </div>
                </TabsContent>
            </Tabs>

            <div className="text-center mt-6">
                <Button asChild variant="link" className="text-xs h-auto p-0">
                <Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal Selection</Link>
                </Button>
            </div>
            </CardContent>
        </Card>
        </div>
    );
}
