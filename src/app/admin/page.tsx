'use client';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import {
  ArrowLeft, UserCheck, Tag, Database, Plus, Trash2, Upload, Download,
  FileSpreadsheet, Printer, Settings, Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Database as DbInfo } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="bg-slate-800 text-white p-6 shadow-lg flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
        </div>
        <Skeleton className="h-9 w-36" />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24 col-span-2" />
          <Skeleton className="h-24 col-span-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Skeleton className="h-10 flex-grow" />
                        <Skeleton className="h-10 w-16" />
                    </div>
                     <Skeleton className="h-8" />
                     <Skeleton className="h-8" />
                     <Skeleton className="h-8" />
                </CardContent>
            </Card>
        ))}
      </div>

       <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
            </CardContent>
        </Card>

       <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
                 {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16" />
                ))}
            </CardContent>
        </Card>
    </div>
  );
}

function AdminDashboard() {
  const { db, schoolId, getTeacherName, setCouponsToPrint, deleteStudent,
    addTeacher, deleteTeacher, deleteCategory, addCategory, addCoupons, setData, isDbLoading } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [printTeacher, setPrintTeacher] = useState('Admin');
  const [printCategory, setPrintCategory] = useState(db.categories[0] || '');
  const [printValue, setPrintValue] = useState('10');

  useEffect(() => {
    if (db.categories.length > 0 && !printCategory) {
      setPrintCategory(db.categories[0]);
    }
  }, [db.categories, printCategory]);

  if (isDbLoading) {
      return <AdminDashboardSkeleton />;
  }

  const handleAddTeacher = async () => {
    if (!newTeacherName) return;
    await addTeacher({ name: newTeacherName });
    setNewTeacherName('');
    toast({ title: 'Teacher Added' });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    await addCategory(newCategoryName);
    setNewCategoryName('');
    toast({ title: 'Category Added' });
  };

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
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
        teacher: printTeacher,
        used: false,
        createdAt: Date.now(),
      };
    });
    await addCoupons(coupons);
    setCouponsToPrint(coupons);
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(db, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reward-arcade-backup-${schoolId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Backup downloading...' });
  };

  const handleRestore = () => {
    if (
      window.confirm(
        'Are you sure? This will permanently overwrite all current data for this school with the data from the backup file.'
      )
    ) {
      fileInputRef.current?.click();
    }
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as DbInfo;
      if (data.students && data.teachers && data.categories && data.coupons) {
        await setData(data);
        toast({ title: 'Data restored successfully!' });
      } else {
        throw new Error('Invalid data file format. Missing required fields.');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to restore data.',
        description: (err as Error).message,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const usedCoupons = db.coupons.filter((c) => c.used).length;
  const totalPointsAwarded = db.coupons
    .filter((c) => c.used)
    .reduce((sum, c) => sum + c.value, 0);
  const totalPointsOnCards = db.students.reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 text-white p-6 shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
            <Settings /> Admin Portal: <span className="text-yellow-300">{schoolId}</span>
          </h2>
        </div>
        <Button onClick={() => router.push('/portal')} variant="secondary" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-2xl font-bold">{db.students.length}</p>
            <p className="text-sm text-muted-foreground">Students</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-2xl font-bold">{db.teachers.length}</p>
            <p className="text-sm text-muted-foreground">Teachers</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-2xl font-bold">{db.coupons.length}</p>
            <p className="text-sm text-muted-foreground">Coupons Created</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-2xl font-bold">{usedCoupons}</p>
            <p className="text-sm text-muted-foreground">Coupons Used</p>
          </div>
           <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg col-span-2">
            <p className="text-2xl font-bold">{totalPointsAwarded.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Points Awarded</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg col-span-2">
            <p className="text-2xl font-bold">{totalPointsOnCards.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Points on Student Cards</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {t.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. Students currently assigned to this teacher will become unassigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                           await deleteTeacher(t.id);
                           toast({ title: 'Teacher Deleted' });
                        }}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

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
              <Button
                onClick={handleAddCategory}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Add
              </Button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {db.categories.map((c) => (
                <li
                  key={c}
                  className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded border"
                >
                  <span className="text-sm">{c}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete category "{c}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                           await deleteCategory(c);
                           toast({ title: 'Category Deleted' });
                        }}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="text-yellow-500" /> System Data
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleBackup}
                variant="outline"
                className="w-full justify-center gap-2"
              >
                <Download /> Backup
              </Button>
              <Button
                onClick={handleRestore}
                variant="outline"
                className="w-full justify-center gap-2"
              >
                <Upload /> Restore
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept="application/json"
              />
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="text-indigo-500" /> Master Coupon Printer
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Issue As</Label>
            <Select value={printTeacher} onValueChange={setPrintTeacher}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin/General</SelectItem>
                {db.teachers.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={printCategory} onValueChange={setPrintCategory}>
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

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>All Students</CardTitle>
          <Button onClick={() => handleOpenStudentModal(null)}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              placeholder="Search students by name..."
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <ul className="space-y-2">
            {db.students
              .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearchTerm.toLowerCase()))
              .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))
              .map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-bold">
                      {s.lastName}, {s.firstName}{' '}
                      <span className="text-emerald-600 font-normal text-xs">
                        ({s.points} pts)
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Teacher: {getTeacherName(s.teacherId)} | NFC: {s.nfcId}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenStudentModal(s)}
                    >
                      <Edit className="w-4 h-4 text-blue-500" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {s.firstName} {s.lastName}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this student's record.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            await deleteStudent(s.id);
                            toast({ title: 'Student Deleted' });
                          }}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      <StudentModal
        isOpen={isStudentModalOpen}
        setIsOpen={setIsStudentModalOpen}
        student={editingStudent}
      />
    </div>
  );
}

export default function AdminPage() {
  const { loginState, isInitialized } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && loginState !== 'school') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  if (!isInitialized || loginState !== 'school') {
    return <p>Loading...</p>;
  }

  return <AdminDashboard />;
}
