'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
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
import type { Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { StudentModal } from '@/components/StudentModal';

function CouponPrinter() {
  const { currentTeacher, db, addCoupons, setCouponsToPrint } = useAppContext();
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('10');

  useEffect(() => {
    if (db.categories.length > 0) {
      setCategory(db.categories[0]);
    }
  }, [db.categories]);

  const handlePrintSheet = async () => {
    if (!currentTeacher) return;
    
    const numValue = parseInt(value);
    if (!numValue || numValue <= 0) {
        toast({variant: 'destructive', title: "Invalid Value", description: "Coupon value must be a positive number."});
        return;
    }
    
    const coupons = Array.from({ length: 24 }, () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        code,
        value: numValue,
        category: category,
        teacher: currentTeacher.name,
        used: false,
        createdAt: Date.now(),
      };
    });
    
    await addCoupons(coupons);
    setCouponsToPrint(coupons);
    toast({ title: 'Generating print sheet...' });
  };

  if (!currentTeacher) return null;

  return (
    <Card className="border-t-4 border-indigo-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="text-indigo-500" /> Coupon Printer
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-4 items-end">
        <div>
          <Label>Issue As</Label>
          <Input value={currentTeacher.name} disabled />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {db.categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Value</Label>
          <Input type="number" placeholder="e.g. 25" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button onClick={handlePrintSheet} className="w-full font-bold gap-2">
          <Printer /> Print Sheet (24)
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { currentTeacher, logout, db, deleteStudent, isInitialized } = useAppContext();
  const { toast } = useToast();
  const [isStudentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const students = useMemo(() => {
    if (!currentTeacher) return [];
    return db.students.filter(s => s.teacherId === currentTeacher.id).sort((a,b) => a.name.localeCompare(b.name));
  }, [currentTeacher, db.students]);

  useEffect(() => {
    if (isInitialized && !currentTeacher) {
      router.replace('/teacher/login');
    }
  }, [isInitialized, currentTeacher, router]);

  if (!isInitialized || !currentTeacher) {
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
        
        <div className="lg:col-span-1">
          <CouponPrinter />
        </div>
      </div>
    </div>
  );
}
