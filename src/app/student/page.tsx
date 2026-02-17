'use client';

import { useState, useEffect, useRef } from 'react';
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
  Ticket,
  History,
  Nfc,
  Type,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

// Student Dashboard component
function StudentDashboard({
  student,
  onDone,
}: {
  student: Student;
  onDone: () => void;
}) {
  const { redeemCoupon } = useAppContext();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');

  const handleRedeem = async () => {
    if (!couponCode) return;
    const result = await redeemCoupon(student.id, couponCode);
    if (result.success) {
      toast({
        title: 'Coupon Redeemed!',
        description: `You gained ${result.value} points.`,
      });
      setCouponCode('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Redemption Failed',
        description: result.message,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-t-4 border-emerald-500">
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">
              Welcome, {student.firstName} {student.lastName}!
            </CardTitle>
            <CardDescription>Your current points balance:</CardDescription>
            <p className="text-4xl font-bold text-emerald-600">
              {student.points.toLocaleString()} pts
            </p>
          </div>
          <Button variant="secondary" onClick={onDone}>
            Finish & Go Back
          </Button>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket /> Redeem a Coupon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleRedeem()}
            />
            <Button onClick={handleRedeem} className="w-full">
              Redeem Points
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History /> Points History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
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
                            "MMM d, yyyy 'at' h:mm a"
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
          </CardContent>
        </Card>
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

  const handleDone = () => {
    setActiveStudent(null);
    setNfcId('');
  };

  const handleSimulate = () => {
    const testStudent = db.students.find((s) => s.nfcId === '100');
    if (testStudent) {
      setNfcId(testStudent.nfcId)
      // Use a timeout to ensure state updates before submitting
      setTimeout(() => handleNfcSubmit(), 0);
    } else {
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: 'Could not find student with NFC ID "100" in the database.',
      });
    }
  };

  if (!isInitialized || loginState !== 'school') {
    return <p>Loading...</p>;
  }

  if (activeStudent) {
    return <StudentDashboard student={activeStudent} onDone={handleDone} />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className="w-full max-w-md border-t-4 border-emerald-500">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">
            Student Login
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
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 animate-pulse"></div>
                  <Nfc className="w-16 h-16 text-slate-400" />
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
              <div className="space-y-2 text-left">
                <Label className="text-xs text-muted-foreground px-1">
                  SIMULATOR
                </Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSimulate}
                >
                  Simulate Test Student (NFC: 100)
                </Button>
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
