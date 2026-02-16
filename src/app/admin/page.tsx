'use client';
import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import {
  LogOut,
  UserCheck,
  Tag,
  Database,
  Plus,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Printer,
  CloudCog,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Teacher, Student } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminDashboard() {
  const {
    isAdmin,
    enterAdmin,
    logout,
    db,
    saveDb,
    schoolId,
    isInitialized,
    getTeacherName,
    setCouponsToPrint,
  } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  // Managers State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Printer State
  const [printTeacher, setPrintTeacher] = useState('Admin');
  const [printCategory, setPrintCategory] = useState(db.categories[0] || '');
  const [printValue, setPrintValue] = useState('10');

  useEffect(() => {
    enterAdmin();
  }, [enterAdmin]);

  useEffect(() => {
    if (isInitialized && !schoolId) {
      router.replace('/setup');
    }
  }, [isAdmin, schoolId, isInitialized, router]);

  if (!isInitialized || !schoolId || !isAdmin) return <p>Loading...</p>;

  const handleAddTeacher = () => {
    if (!newTeacherName) return;
    const newTeacher: Teacher = { id: 't' + Date.now(), name: newTeacherName };
    saveDb({ ...db, teachers: [...db.teachers, newTeacher] });
    setNewTeacherName('');
    toast({ title: 'Teacher Added' });
  };
  
  const handleDeleteTeacher = (id: string) => {
    if(window.confirm("Delete this teacher? Students will become unassigned.")){
      const newTeachers = db.teachers.filter(t => t.id !== id);
      saveDb({...db, teachers: newTeachers});
      toast({title: "Teacher Deleted"});
    }
  }

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    saveDb({ ...db, categories: [...db.categories, newCategoryName] });
    setNewCategoryName('');
    toast({ title: 'Category Added' });
  };

  const handleDeleteCategory = (name: string) => {
    if(window.confirm("Delete this category?")){
      const newCategories = db.categories.filter(c => c !== name);
      saveDb({...db, categories: newCategories});
      toast({title: "Category Deleted"});
    }
  }

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };
  
  const handleDeleteStudent = (id: string) => {
    if(window.confirm("Delete this student permanently?")){
      const newStudents = db.students.filter(s => s.id !== id);
      saveDb({...db, students: newStudents});
      toast({title: "Student Deleted"});
    }
  }
  
  const handlePrintSheet = () => {
    const coupons = Array.from({ length: 24 }, () => {
        const randomPart = Math.floor(100000 + Math.random() * 900000);
        const code = `PTS-${printValue}-${randomPart}`;
        return {
            code,
            value: parseInt(printValue),
            category: printCategory,
            teacher: printTeacher,
            used: false,
            createdAt: Date.now()
        };
    });
    saveDb({...db, coupons: [...db.coupons, ...coupons]});
    setCouponsToPrint(coupons);
    toast({title: "Generating print sheet..."});
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 text-white p-6 shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
            <Settings /> Admin Portal
          </h2>
          <p className="text-slate-400 text-sm">System Configuration</p>
        </div>
        <Button onClick={logout} variant="secondary" size="sm">
          <LogOut className="mr-2 h-4 w-4" /> Exit Admin
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teacher Manager */}
        <Card className="border-t-4 border-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="text-indigo-500" /> Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Name"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
              />
              <Button onClick={handleAddTeacher}>Add</Button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {db.teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded border"
                >
                  <span className="font-bold text-sm">{t.name}</span>
                  <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => handleDeleteTeacher(t.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Category Manager */}
        <Card className="border-t-4 border-pink-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="text-pink-500" /> Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Category Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button onClick={handleAddCategory} className="bg-pink-600 hover:bg-pink-700">Add</Button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {db.categories.map((c) => (
                <li
                  key={c}
                  className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded border"
                >
                  <span className="text-sm">{c}</span>
                   <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => handleDeleteCategory(c)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Data Manager */}
        <Card className="border-t-4 border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="text-yellow-500" /> System Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <Button variant="outline" className="w-full justify-center gap-2"><CloudCog /> Cloud Sync</Button>
             <div className="flex gap-2">
                 <Button variant="outline" className="w-full justify-center gap-2"><Download /> Backup</Button>
                 <Button variant="outline" className="w-full justify-center gap-2"><Upload /> Restore</Button>
             </div>
              <Button variant="outline" className="w-full justify-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"><FileSpreadsheet /> Import CSV</Button>
               <Button variant="destructive" className="w-full font-bold mt-4" >Factory Reset</Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Master Coupon Printer */}
      <Card className="border-t-4 border-indigo-500">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Printer className="text-indigo-500" /> Master Coupon Printer</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <Label>Issue As</Label>
                <Select value={printTeacher} onValueChange={setPrintTeacher}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Admin">Admin/General</SelectItem>
                        {db.teachers.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label>Category</Label>
                 <Select value={printCategory} onValueChange={setPrintCategory}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {db.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label>Value</Label>
                <Select value={printValue} onValueChange={setPrintValue}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                         <SelectItem value="10">10</SelectItem>
                         <SelectItem value="50">50</SelectItem>
                         <SelectItem value="100">100</SelectItem>
                         <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handlePrintSheet} className="w-full font-bold gap-2"><Printer /> Print Sheet (24)</Button>
        </CardContent>
      </Card>

      {/* All Students List */}
      <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>All Students (Global List)</CardTitle>
              <Button onClick={() => handleOpenStudentModal(null)}><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
          </CardHeader>
          <CardContent>
                <ul className="space-y-2">
                  {db.students.map(s => (
                    <li key={s.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border">
                      <div>
                        <p className="font-bold">{s.name} <span className="text-emerald-600 font-normal text-xs">({s.points} pts)</span></p>
                        <p className="text-xs text-muted-foreground">Teacher: {getTeacherName(s.teacherId)} | NFC: {s.nfcId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenStudentModal(s)}><Plus className="w-4 h-4 text-blue-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
          </CardContent>
      </Card>
      
      <StudentModal isOpen={isStudentModalOpen} setIsOpen={setIsStudentModalOpen} student={editingStudent} />
    </div>
  );
}


function StudentModal({ isOpen, setIsOpen, student }: {isOpen: boolean, setIsOpen: (val: boolean) => void, student: Student | null}) {
    const { db, saveDb } = useAppContext();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [points, setPoints] = useState('0');
    const [nfcId, setNfcId] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (student) {
            setName(student.name);
            setPassword(student.password);
            setPoints(student.points.toString());
            setNfcId(student.nfcId);
            setTeacherId(student.teacherId);
        } else {
            setName('');
            setPassword('1234');
            setPoints('0');
            setNfcId('');
            setTeacherId(db.teachers[0]?.id || '');
        }
    }, [student, isOpen, db.teachers]);

    const handleSave = () => {
        if (!name || !nfcId) {
            toast({ variant: 'destructive', title: 'Name and NFC ID are required.' });
            return;
        }

        if (student) {
            const updatedStudents = db.students.map(s =>
                s.id === student.id ? { ...s, name, password, nfcId, points: parseInt(points) || 0, teacherId } : s
            );
            saveDb({ ...db, students: updatedStudents });
            toast({ title: 'Student updated!' });
        } else {
            const newStudent: Student = {
                id: 's' + Date.now(),
                name, password, nfcId,
                points: parseInt(points) || 0,
                teacherId, history: [],
            };
            saveDb({ ...db, students: [...db.students, newStudent] });
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
                    <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="nfcId">NFC ID</Label>
                        <Input id="nfcId" value={nfcId} onChange={e => setNfcId(e.target.value)} placeholder="Tap card now..." />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="points">Points</Label>
                        <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="teacher">Assign to Teacher</Label>
                        <Select value={teacherId} onValueChange={setTeacherId}>
                            <SelectTrigger id="teacher"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {db.teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
