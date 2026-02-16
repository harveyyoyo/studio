'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Users,
  Plus,
  User,
  LogOut,
  Printer,
  Trash2,
  Edit,
} from 'lucide-react';

import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Coupon, Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

function CouponGenerator() {
  const { currentTeacher, db, addCoupons, setCouponsToPrint } = useAppContext();
  const [category, setCategory] = useState(db.categories[0] || '');
  const [value, setValue] = useState('10');
  const [qty, setQty] = useState(1);
  const [recentlyGenerated, setRecentlyGenerated] = useState<Coupon[]>([]);
  const { toast } = useToast();

  const generateCoupons = async (printSheet = false) => {
    if (!currentTeacher) return;
    const numToGenerate = printSheet ? 24 : qty;
    const generated: Coupon[] = [];

    for (let i = 0; i < numToGenerate; i++) {
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const code = `PTS-${value}-${randomPart}`;
      const newCoupon = {
        code,
        value: parseInt(value),
        category,
        teacher: currentTeacher.name,
        used: false,
        createdAt: Date.now(),
      };
      generated.push(newCoupon);
    }
    await addCoupons(generated);
    setRecentlyGenerated(generated);
    toast({ title: `${numToGenerate} coupons generated!` });

    if (printSheet) {
      setCouponsToPrint(generated);
    }
  };

  return (
    <>
      <Card className="lg:col-span-1 h-fit border-b-4 border-indigo-500 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <PlusCircle className="text-indigo-500" />
            Generate Coupons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase">
              Reason/Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {db.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Point Value
              </Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select points" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Points</SelectItem>
                  <SelectItem value="50">50 Points</SelectItem>
                  <SelectItem value="100">100 Points</SelectItem>
                  <SelectItem value="500">500 Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Quantity
              </Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value)))}
                min="1"
                max="50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateCoupons(false)}
              className="flex-1 font-bold"
            >
              Add to System
            </Button>
            <Button
              onClick={() => generateCoupons(true)}
              variant="secondary"
              className="flex-1 font-bold flex items-center justify-center gap-1"
            >
              <Printer /> Print Sheet
            </Button>
          </div>
        </CardContent>
      </Card>
      {recentlyGenerated.length > 0 && (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Recently Generated</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentlyGenerated.map(c => (
                    <div key={c.code} className="bg-white p-3 border-2 border-slate-800 rounded-lg flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 bg-slate-800 text-white text-[10px] px-2 py-0.5 font-bold">NEW</div>
                        <div className="font-headline text-3xl font-bold text-emerald-600 mt-2">{c.value}</div>
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Points</p>
                        <p className="text-xs text-center font-bold text-indigo-500 mb-1 h-8">{c.category}</p>
                        <div className="font-barcode text-4xl mb-1">{c.code}</div>
                        <div className="font-code text-[10px] text-slate-500 tracking-widest bg-slate-100 px-2 rounded mt-1">{c.code}</div>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}
    </>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { currentTeacher, logout, db, deleteStudent } = useAppContext();
  const { toast } = useToast();
  const [isStudentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const students = useMemo(() => {
    if (!currentTeacher) return [];
    return db.students.filter(s => s.teacherId === currentTeacher.id);
  }, [currentTeacher, db.students]);

  useEffect(() => {
    if (!currentTeacher) {
      router.replace('/teacher/login');
    }
  }, [currentTeacher, router]);

  if (!currentTeacher) {
    return <div>Loading...</div>;
  }
  
  const handleOpenStudentModal = (student: Student | null = null) => {
    setEditingStudent(student);
    setStudentModalOpen(true);
  }

  const handleDeleteStudent = async (studentId: string) => {
    if(window.confirm("Are you sure you want to delete this student?")){
      await deleteStudent(studentId);
      toast({title: "Student Deleted"});
    }
  }


  return (
    <div className="space-y-6">
      <Card className="p-4 shadow-sm flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <User className="text-indigo-600" />
          </div>
          <span className="hidden sm:inline">
            {currentTeacher.name}'s Station
          </span>
          <span className="sm:hidden">{currentTeacher.name}</span>
        </h2>
        <Button variant="ghost" onClick={logout} className="text-red-500 hover:text-red-600">
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="text-emerald-500" /> My Students
              </CardTitle>
              <Button onClick={() => handleOpenStudentModal(null)} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Student
              </Button>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <ul className="space-y-2">
                  {students.map(s => (
                    <li key={s.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border">
                      <div>
                        <p className="font-bold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Pass: {s.password} | NFC: {s.nfcId}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-600 font-bold text-lg">{s.points} pts</span>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenStudentModal(s)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No students assigned to you yet.
                </p>
              )}
            </CardContent>
          </Card>
           <StudentModal
                isOpen={isStudentModalOpen}
                setIsOpen={setStudentModalOpen}
                student={editingStudent}
            />
        </div>
        
        <CouponGenerator />
      </div>
    </div>
  );
}

interface StudentModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    student: Student | null;
}

function StudentModal({ isOpen, setIsOpen, student }: StudentModalProps) {
    const { addStudent, updateStudent, currentTeacher } = useAppContext();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [points, setPoints] = useState('0');
    const [nfcId, setNfcId] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (student) {
            setName(student.name);
            setPassword(student.password);
            setPoints(student.points.toString());
            setNfcId(student.nfcId);
        } else {
            setName('');
            setPassword('1234');
            setPoints('0');
            setNfcId('');
        }
    }, [student, isOpen]);

    const handleSave = async () => {
        if (!name || !nfcId || !currentTeacher) {
            toast({ variant: 'destructive', title: 'Name and NFC ID are required.' });
            return;
        }

        if (student) { // Editing
            const updatedStudent: Student = { ...student, name, password, nfcId, points: parseInt(points) || 0 };
            await updateStudent(updatedStudent);
            toast({ title: 'Student updated!' });
        } else { // Adding
            const newStudent: Student = {
                id: 's' + Date.now(),
                name,
                password,
                nfcId,
                points: parseInt(points) || 0,
                teacherId: currentTeacher.id,
                history: [],
            };
            await addStudent(newStudent);
            toast({ title: 'Student added!' });
        }
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{student ? 'Edit Student' : 'New Student'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Password</Label>
                        <Input id="password" value={password} onChange={e => setPassword(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="nfcId" className="text-right">NFC ID</Label>
                        <Input id="nfcId" value={nfcId} onChange={e => setNfcId(e.target.value)} className="col-span-3" placeholder="Tap card now..." />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="points" className="text-right">Points</Label>
                        <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
