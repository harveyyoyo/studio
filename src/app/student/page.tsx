'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';
import { GraduationCap, LogIn, LogOut, Ticket, History } from 'lucide-react';
import { format } from 'date-fns';

// Student Dashboard component
function StudentDashboard({ student, onLogout }: { student: Student, onLogout: () => void }) {
    const { redeemCoupon } = useAppContext();
    const { toast } = useToast();
    const [couponCode, setCouponCode] = useState('');

    const handleRedeem = async () => {
        if (!couponCode) return;
        const result = await redeemCoupon(student.id, couponCode);
        if (result.success) {
            toast({ title: 'Coupon Redeemed!', description: `You gained ${result.value} points.` });
            setCouponCode('');
        } else {
            toast({ variant: 'destructive', title: 'Redemption Failed', description: result.message });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-t-4 border-emerald-500">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-2xl">Welcome, {student.name}!</CardTitle>
                        <CardDescription>Your current points balance:</CardDescription>
                         <p className="text-4xl font-bold text-emerald-600">{student.points.toLocaleString()} pts</p>
                    </div>
                    <Button variant="outline" onClick={onLogout}><LogOut className="mr-2"/> Log Out</Button>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Ticket /> Redeem a Coupon</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Input 
                            placeholder="Enter coupon code" 
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            onKeyPress={e => e.key === 'Enter' && handleRedeem()}
                        />
                        <Button onClick={handleRedeem} className="w-full">Redeem Points</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><History /> Points History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                           {student.history.length > 0 ? student.history.map((item, index) => (
                               <li key={index} className="flex justify-between items-center text-sm">
                                   <div>
                                       <p className="font-medium">{item.desc}</p>
                                       <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy 'at' h:mm a")}</p>
                                   </div>
                                   <span className={`font-bold ${item.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                       {item.amount > 0 ? `+${item.amount}`: item.amount}
                                   </span>
                               </li>
                           )) : (
                               <p className="text-center text-muted-foreground italic py-4">No transaction history yet.</p>
                           )}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Main component
export default function StudentLoginPage() {
    const { loginState, isInitialized, db } = useAppContext();
    const router = useRouter();
    const { toast } = useToast();

    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);
    
    // Restore student session
    useEffect(() => {
        if(loginState === 'school') {
            const savedStudentId = sessionStorage.getItem('studentId');
            if (savedStudentId) {
                const student = db.students.find(s => s.id === savedStudentId);
                if (student) setLoggedInStudent(student);
            }
        }
    }, [loginState, db.students]);

    const handleLogin = () => {
        const student = db.students.find(s => s.id === selectedStudentId);
        if (student && student.password === password) {
            setLoggedInStudent(student);
            sessionStorage.setItem('studentId', student.id); // Save student session
        } else {
            toast({ variant: 'destructive', title: 'Login Failed', description: 'Incorrect student name or password.' });
            setPassword('');
        }
    };
    
    const handleLogout = () => {
        setLoggedInStudent(null);
        sessionStorage.removeItem('studentId'); // Clear student session
        setSelectedStudentId('');
        setPassword('');
    };

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }
    
    if (loggedInStudent) {
        return <StudentDashboard student={loggedInStudent} onLogout={handleLogout} />;
    }

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-full mb-4">
                        <GraduationCap className="w-12 h-12 text-emerald-500" />
                    </div>
                    <CardTitle className="font-headline text-2xl">Student Portal Login</CardTitle>
                    <CardDescription>Please select your name and enter your password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {db.students.length > 0 ? (
                         <>
                            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select your name..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {db.students.sort((a,b) => a.name.localeCompare(b.name)).map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input 
                                type="password" 
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleLogin()}
                                disabled={!selectedStudentId}
                            />
                            <Button onClick={handleLogin} className="w-full" disabled={!selectedStudentId || !password}>
                                <LogIn className="mr-2" /> Sign In
                            </Button>
                        </>
                    ) : (
                        <p className="text-muted-foreground italic">No students have been added to this school yet.</p>
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
