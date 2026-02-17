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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Teacher, Student, Coupon } from '@/lib/types';
import { Award, PlusCircle, LogIn, User, ArrowLeft } from 'lucide-react';
import { Coupon as CouponComponent } from '@/components/Coupon';

// AwardPointsModal component
function AwardPointsModal({ student, isOpen, setIsOpen }: { student: Student | null, isOpen: boolean, setIsOpen: (isOpen: boolean) => void }) {
    const { updateStudent, getTeacherName } = useAppContext();
    const { toast } = useToast();
    const [amount, setAmount] = useState('10');
    const [description, setDescription] = useState('');

    const handleAward = async () => {
        if (!student || !amount) return;
        const points = parseInt(amount);
        if (isNaN(points) || points <= 0) {
            toast({ variant: 'destructive', title: 'Invalid amount' });
            return;
        }

        const newHistoryItem = {
            desc: description || `Awarded by ${getTeacherName(student.teacherId)}`,
            amount: points,
            date: Date.now(),
        };

        const updatedStudent = {
            ...student,
            points: student.points + points,
            history: [newHistoryItem, ...student.history],
        };

        await updateStudent(updatedStudent);
        toast({ title: 'Points Awarded!', description: `${points} points awarded to ${student.name}.` });
        setIsOpen(false);
        setAmount('10');
        setDescription('');
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Award Points to {student.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="amount">Points Amount</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="description">Reason (optional)</Label>
                        <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Excellent class participation" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleAward}>Award</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Teacher Dashboard component
function TeacherDashboard({ teacher, onLogout }: { teacher: Teacher, onLogout: () => void }) {
    const { db, addCoupons } = useAppContext();
    const [awardingStudent, setAwardingStudent] = useState<Student | null>(null);
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const { toast } = useToast();

    // State for creating coupons
    const [couponValue, setCouponValue] = useState('25');
    const [couponCategory, setCouponCategory] = useState(db.categories[0] || '');
    const [createdCoupon, setCreatedCoupon] = useState<Coupon | null>(null);

    const myStudents = db.students.filter(s => s.teacherId === teacher.id).sort((a, b) => a.name.localeCompare(b.name));

    const handleOpenAwardModal = (student: Student) => {
        setAwardingStudent(student);
        setIsAwardModalOpen(true);
    };
    
    const handleCreateCoupon = async () => {
        const value = parseInt(couponValue);
        if (isNaN(value) || value <= 0) {
            toast({ variant: 'destructive', title: 'Invalid coupon value.' });
            return;
        }

        const newCoupon: Coupon = {
            code: `C${Date.now().toString().slice(-6)}`,
            value: value,
            category: couponCategory,
            teacher: teacher.name,
            used: false,
            createdAt: Date.now(),
        };

        await addCoupons([newCoupon]);
        setCreatedCoupon(newCoupon);
        toast({ title: 'Coupon Created!' });
    };

    return (
        <div className="space-y-6">
             <Card className="bg-blue-50 dark:bg-blue-900/20 border-t-4 border-blue-500">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2"><User />{teacher.name}'s Dashboard</CardTitle>
                        <CardDescription>Award points and create coupons for your students.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={onLogout}><ArrowLeft className="mr-2"/> Back to login</Button>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Students ({myStudents.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {myStudents.map(s => (
                                <li key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border">
                                    <div>
                                        <p className="font-bold">{s.name}</p>
                                        <p className="text-sm text-muted-foreground">{s.points} points</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleOpenAwardModal(s)}><Award className="mr-2"/> Award</Button>
                                </li>
                            ))}
                             {myStudents.length === 0 && <p className="text-center text-muted-foreground italic py-4">No students assigned to you.</p>}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Create Coupon</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-1">
                            <Label>Category</Label>
                            <Select value={couponCategory} onValueChange={setCouponCategory}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {db.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                         <div className="space-y-1">
                            <Label>Points Value</Label>
                            <Input type="number" value={couponValue} onChange={e => setCouponValue(e.target.value)} />
                        </div>
                        <Button onClick={handleCreateCoupon} className="w-full"><PlusCircle className="mr-2"/>Create Single Coupon</Button>

                        {createdCoupon && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-bold text-center">Your new coupon:</p>
                                <CouponComponent coupon={createdCoupon} isNew />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <AwardPointsModal student={awardingStudent} isOpen={isAwardModalOpen} setIsOpen={setIsAwardModalOpen} />
        </div>
    );
}

// Main component
export default function TeacherLoginPage() {
    const { loginState, isInitialized, db } = useAppContext();
    const router = useRouter();
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);

    useEffect(() => {
        if (isInitialized && loginState !== 'school') {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    const handleLogin = () => {
        const teacher = db.teachers.find(t => t.id === selectedTeacherId);
        if (teacher) {
            setLoggedInTeacher(teacher);
        }
    };
    
    const handleLogout = () => {
        setLoggedInTeacher(null);
        setSelectedTeacherId('');
    };

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }
    
    if (loggedInTeacher) {
        return <TeacherDashboard teacher={loggedInTeacher} onLogout={handleLogout} />;
    }

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full mb-4">
                        <User className="w-12 h-12 text-blue-500" />
                    </div>
                    <CardTitle className="font-headline text-2xl">Teacher Portal Login</CardTitle>
                    <CardDescription>Please select your name to continue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {db.teachers.length > 0 ? (
                         <>
                            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select your name..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {db.teachers.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleLogin} className="w-full" disabled={!selectedTeacherId}>
                                <LogIn className="mr-2" /> Sign In
                            </Button>
                        </>
                    ) : (
                        <p className="text-muted-foreground italic">No teachers have been added to this school yet.</p>
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
