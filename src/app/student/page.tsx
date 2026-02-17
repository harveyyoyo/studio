'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

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
import {
  Nfc,
  Type,
  ScanLine,
  History,
  Gift,
  Pencil,
  FileText,
  LogOut,
  ShoppingBag,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';


// Student Dashboard component
function StudentDashboard({
  student,
  onDone,
}: {
  student: Student;
  onDone: () => void;
}) {
  const { redeemCoupon, updateStudent } = useAppContext();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [logoutTimer, setLogoutTimer] = useState(10);

  const resetTimer = useCallback(() => setLogoutTimer(10), []);

  const rewards = [
    { name: 'Cool Pencil', points: 50, icon: <Pencil className="w-8 h-8" /> },
    { name: 'Candy Bar', points: 150, icon: <Gift className="w-8 h-8" /> },
    { name: 'Homework Pass', points: 500, icon: <FileText className="w-8 h-8" /> },
  ];

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


  const handleRedeemCoupon = async () => {
    if (!couponCode) return;
    resetTimer(); 
    const result = await redeemCoupon(student.id, couponCode);
    setCouponCode('');
    
    if (result.success) {
      toast({
        title: 'Coupon Redeemed!',
        description: `You gained ${result.value} points.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Redemption Failed',
        description: result.message,
      });
    }
  };

  const handleRedeemReward = async (reward: { name: string, points: number }) => {
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
        description: `You redeemed a ${reward.name} for ${reward.points} points.`,
    });
};

  return (
    <div className="space-y-6 animate-in fade-in-50 bg-secondary/50 dark:bg-background p-2 md:p-4 rounded-xl">
      <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-32 h-32 text-primary-foreground/20">
            <Gift size={128} strokeWidth={1} />
        </div>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardDescription className="text-primary-foreground/80">Welcome back,</CardDescription>
            <CardTitle className="font-headline text-4xl">
              {student.firstName} {student.lastName}
            </CardTitle>
          </div>
          <div className="text-right">
             <CardDescription className="text-primary-foreground/80">Current Balance</CardDescription>
             <p className="text-5xl font-bold">
              {student.points.toLocaleString()}{' '}
              <span className="text-3xl font-normal">pts</span>
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ScanLine /> Scan Coupon
              </CardTitle>
               <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
                Auto-logout in {logoutTimer}s
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Scan barcode now..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleRedeemCoupon()}
                autoFocus
              />
              <Button onClick={handleRedeemCoupon}>Redeem</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                <ShoppingBag /> Rewards Shop
              </CardTitle>
              <CardDescription>Use your points to get cool stuff!</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <Card key={reward.name} className="p-4 flex flex-col items-center justify-between text-center bg-background dark:bg-card transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="p-4 bg-accent rounded-full mb-3 text-primary">
                      {reward.icon}
                    </div>
                    <p className="font-bold text-lg">{reward.name}</p>
                    <Badge variant="secondary" className="mb-3 text-base font-bold">{reward.points.toLocaleString()} pts</Badge>
                    <Button size="sm" className="w-full" onClick={() => handleRedeemReward(reward)} disabled={student.points < reward.points}>Redeem</Button>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History /> Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-3 max-h-[30rem] overflow-y-auto pr-2">
                {student.history.length > 0 ? (
                  student.history
                    .sort((a, b) => b.date - a.date)
                    .map((item, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center text-sm"
                      >
                        <div>
                          <p className="font-medium">{item.desc}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(item.date),
                              "MMM d, yyyy, h:mm a"
                            )}
                          </p>
                        </div>
                        <span
                          className={`font-bold ${
                            item.amount > 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {item.amount > 0 ? `+${item.amount}` : item.amount}
                        </span>
                      </li>
                    ))
                ) : (
                  <p className="text-center text-muted-foreground italic py-4">
                    No transaction history yet.
                  </p>
                )}
              </ul>
              <Button variant="ghost" className="w-full mt-4 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={onDone}>
                <LogOut className="mr-2"/> Log Out Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Main Student Login component
export default function StudentLoginPage() {
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

  // Auto-focus the NFC input when the component mounts or tab is selected
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
    setNfcId(''); // Clear after submit
  };

  const handleDone = useCallback(() => {
    setActiveStudent(null);
    setNfcId('');
  }, []);

  if (!isInitialized || loginState !== 'school') {
    return <p>Loading...</p>;
  }

  if (activeStudent) {
    return <StudentDashboard student={activeStudent} onDone={handleDone} />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md border-t-4 border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">
            Student Kiosk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="nfc" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()}>
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
                  className="absolute -top-[9999px] -left-[9999px]" // Visually hide but keep focusable
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
                  Login
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-6">
            <p className="text-xs text-muted-foreground">
              Connected to <span className="font-bold">{schoolId}</span>
            </p>
            <Button asChild variant="link" className="text-xs h-auto p-0">
              <Link href="/portal">Back to Portal Selection</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
