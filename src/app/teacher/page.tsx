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
import { Award, User, ArrowLeft, Printer, LogIn, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentActivityModal } from '@/components/StudentActivityModal';

// AwardPointsModal component
function AwardPointsModal({ student, isOpen, setIsOpen, teacherName }: { student: Student | null, isOpen: boolean, setIsOpen: (isOpen: boolean) => void, teacherName: string }) {
    const { updateStudent } = useAppContext();
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
            desc: description || `Awarded by ${teacherName}`,
            amount: points,
            date: Date.now(),
        };

        const updatedStudent = {
            ...student,
            points: student.points + points,
            history: [newHistoryItem, ...student.history],
        };

        await updateStudent(updatedStudent);
        toast({ title: 'Points Awarded!', description: `${points} points awarded to ${student.firstName} ${student.lastName}.` });
        setIsOpen(false);
        setAmount('10');
        setDescription('');
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Award Points to {student.firstName} {student.lastName}</DialogTitle>
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
  
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
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
function TeacherDashboard({ teacher }: { teacher: Teacher }) {
    const { db, addCoupons, setCouponsToPrint, isDbLoading } = useAppContext();
    const [awardingStudent, setAwardingStudent] = useState<Student | null>(null);
    const [activityStudent, setActivityStudent] = useState<Student | null>(null);
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const { toast } = useToast();
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // State for printing coupons
    const [printCategory, setPrintCategory] = useState(db.categories[0] || '');
    const [printValue, setPrintValue] = useState('10');

     useEffect(() => {
        if (db.categories.length > 0 && !printCategory) {
          setPrintCategory(db.categories[0]);
        }
      }, [db.categories, printCategory]);

    const myStudents = db.students.filter(s => s.teacherIds?.includes(teacher.id));
    const filteredStudents = myStudents
        .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearchTerm.toLowerCase()))
        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));


    const handleOpenAwardModal = (student: Student) => {
        setAwardingStudent(student);
        setIsAwardModalOpen(true);
    };

    const handleOpenActivityModal = (student: Student) => {
        setActivityStudent(student);
    };
    
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
        const coupons = Array.from({ length: 24 }, () => {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          return {
            code,
            value: value,
            category: printCategory,
            teacher: teacher.name, // Use logged-in teacher's name
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
                        <CardTitle className="font-headline text-2xl flex items-center gap-2"><User className="text-chart-1"/>{teacher.name}'s Dashboard</CardTitle>
                        <CardDescription>Award points and create coupon print sheets for your students.</CardDescription>
                    </div>
                    <Button asChild variant="outline"><Link href="/portal"><ArrowLeft className="mr-2"/> Back to Portal</Link></Button>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Students ({myStudents.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Input 
                            placeholder="Search students..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            />
                        </div>
                        <ul className="space-y-2 max-h-[30rem] overflow-y-auto pr-2">
                            {filteredStudents.map(s => (
                                <li key={s.id} className="flex items-center justify-between p-3 bg-secondary rounded-md border">
                                    <div>
                                        <p className="font-bold">{s.lastName}, {s.firstName}</p>
                                        <p className="text-sm text-muted-foreground">{s.points} points</p>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenActivityModal(s)}>
                                          <History className="mr-2 h-4 w-4"/> Activity
                                        </Button>
                                        <Button size="sm" onClick={() => handleOpenAwardModal(s)}><Award className="mr-2 h-4 w-4"/> Award</Button>
                                    </div>
                                </li>
                            ))}
                             {myStudents.length > 0 && filteredStudents.length === 0 && (
                                 <p className="text-center text-muted-foreground italic py-4">No matching students found.</p>
                             )}
                             {myStudents.length === 0 && <p className="text-center text-muted-foreground italic py-4">No students assigned to you.</p>}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Printer className="text-primary" /> Coupon Printer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 items-end">
                       <div>
                            <Label>Issue As</Label>
                            <Input value={teacher.name} disabled />
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
            
            <AwardPointsModal student={awardingStudent} isOpen={isAwardModalOpen} setIsOpen={setIsAwardModalOpen} teacherName={teacher.name} />
            <StudentActivityModal student={activityStudent} isOpen={!!activityStudent} setIsOpen={() => setActivityStudent(null)} />
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

    useEffect(() => {
        if(loginState === 'school') {
            const savedTeacherId = sessionStorage.getItem('teacherId');
            if (savedTeacherId) {
                const teacher = db.teachers.find(t => t.id === savedTeacherId);
                if (teacher) setLoggedInTeacher(teacher);
            }
        }
    }, [loginState, db.teachers]);

    const handleLogin = () => {
        const teacher = db.teachers.find(t => t.id === selectedTeacherId);
        if (teacher) {
            setLoggedInTeacher(teacher);
            sessionStorage.setItem('teacherId', teacher.id);
        }
    };

    if (!isInitialized || loginState !== 'school') {
        return <p>Loading...</p>;
    }
    
    if (loggedInTeacher) {
        return <TeacherDashboard teacher={loggedInTeacher} />;
    }

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-accent p-3 rounded-full mb-4">
                        <User className="w-12 h-12 text-primary" />
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
                                    {db.teachers.sort((a,b) => a.name.localeCompare(b.name)).map((t) => (
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
