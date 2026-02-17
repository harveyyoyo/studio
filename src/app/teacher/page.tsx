'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Class, Coupon } from '@/lib/types';
import { User, ArrowLeft, Printer, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function TeacherDashboardSkeleton() {
    return (
      <div className="space-y-6 animate-pulse">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-36" />
          </CardHeader>
        </Card>
  
        <div className="flex justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 items-end">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
}

// Teacher Dashboard component
function TeacherDashboard({ klass }: { klass: Class }) {
    const { db, addCoupons, setCouponsToPrint, isDbLoading } = useAppContext();
    const { toast } = useToast();

    // State for printing coupons
    const [printCategory, setPrintCategory] = useState(db.categories[0] || '');
    const [printValue, setPrintValue] = useState('10');

     useEffect(() => {
        if (db.categories.length > 0 && !printCategory) {
          setPrintCategory(db.categories[0]);
        }
      }, [db.categories, printCategory]);
    
    const handlePrintSheet = async () => {
        const value = parseInt(printValue);
        if (!value || value <= 0) {
          toast({
            variant: 'destructive',
            title: 'Invalid Value',
            description: 'Coupon value must be a positive number.',
          });
          return;
        }
        const coupons: Coupon[] = Array.from({ length: 24 }, () => {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          return {
            code,
            value: value,
            category: printCategory,
            teacher: klass.name, // Use logged-in class's name
            used: false,
            createdAt: Date.now(),
          };
        });
        await addCoupons(coupons);
        setCouponsToPrint(coupons);
    };

    if(isDbLoading) {
        return <TeacherDashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
             <Card className="bg-card border-t-4 border-chart-1">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2"><User className="text-chart-1"/>{klass.name}'s Portal</CardTitle>
                        <CardDescription>Create coupon print sheets.</CardDescription>
                    </div>
                    <Button asChild variant="outline"><Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal</Link></Button>
                </CardHeader>
            </Card>

            <div className="flex justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Printer className="text-primary" /> Coupon Printer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 items-end">
                       <div>
                            <Label>Issue As</Label>
                            <Input value={klass.name} disabled />
                        </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={printCategory} onValueChange={setPrintCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {db.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 25"
                          value={printValue}
                          onChange={(e) => setPrintValue(e.target.value)}
                        />
                      </div>
                      <Button onClick={handlePrintSheet} className="w-full font-bold gap-2">
                        <Printer /> Print Sheet (24)
                      </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Main component
export default function TeacherLoginPage() {
    const { loginState, isInitialized, db } = useAppContext();
    const router = useRouter();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [loggedInClass, setLoggedInClass] = useState<Class | null>(null);

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    useEffect(() => {
        if(loginState === 'school') {
            const savedClassId = sessionStorage.getItem('classId');
            if (savedClassId) {
                const klass = db.classes.find(c => c.id === savedClassId);
                if (klass) setLoggedInClass(klass);
            }
        }
    }, [loginState, db.classes]);

    const handleLogin = () => {
        const klass = db.classes.find(t => t.id === selectedClassId);
        if (klass) {
            setLoggedInClass(klass);
            sessionStorage.setItem('classId', klass.id);
        }
    };

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }
    
    if (loggedInClass) {
        return <TeacherDashboard klass={loggedInClass} />;
    }

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-accent p-3 rounded-full mb-4">
                        <User className="w-12 h-12 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-2xl">Class Portal Login</CardTitle>
                    <CardDescription>Please select your class to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {db.classes.length > 0 ? (
                         <>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select your class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {db.classes.sort((a,b) => a.name.localeCompare(b.name)).map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleLogin} className="w-full" disabled={!selectedClassId}>
                                <LogIn className="mr-2" /> Sign In
                            </Button>
                        </>
                    ) : (
                        <p className="text-muted-foreground italic">No classes have been added to this school yet.</p>
                    )}
                    <hr className="my-4"/>
                    <Button asChild variant="link">
                        <Link href="/portal">Back to Portal Selection</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
