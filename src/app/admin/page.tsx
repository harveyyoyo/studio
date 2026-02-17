'use client';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import {
  ArrowLeft, BookOpen, Tag, Database, Plus, Trash2, Upload, Download,
  FileSpreadsheet, Printer, Settings, Edit, History, Gift, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StudentActivityModal } from '@/components/StudentActivityModal';
import { format } from 'date-fns';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="bg-card p-6 shadow-lg flex justify-between items-center">
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
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [printTeacher, setPrintTeacher] = useState('Admin');
  const [printCategory, setPrintCategory] = useState(db.categories[0] || '');
  const [printValue, setPrintValue] = useState('10');
  
  const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
  const [newPrintCategoryName, setNewPrintCategoryName] = useState('');

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

  const handleAddPrintCategory = async () => {
    if (!newPrintCategoryName) return;
    await addCategory(newPrintCategoryName);
    setPrintCategory(newPrintCategoryName);
    setNewPrintCategoryName('');
    setIsPrintCategoryDialogOpen(false);
    toast({ title: 'Category Added' });
  };

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
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

  const recentRedemptions = db.students
    .flatMap(s => 
        s.history
            .filter(h => h.desc.startsWith('Redeemed:'))
            .map(h => ({
                studentName: `${s.firstName} ${s.lastName}`,
                description: h.desc,
                points: h.amount,
                date: h.date,
            }))
    )
    .sort((a, b) => b.date - a.date)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-b-4 border-slate-700 dark:border-slate-500 p-6 shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
            <Settings /> Admin Portal: <span className="text-primary">{schoolId}</span>
          </h2>
        </div>
        <Button onClick={() => router.push('/portal')} variant="secondary" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal
        </Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-2xl font-bold">{db.students.length}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-2xl font-bold">{db.teachers.length}</p>
                <p className="text-sm text-muted-foreground">Teachers</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-2xl font-bold">{db.coupons.length}</p>
                <p className="text-sm text-muted-foreground">Coupons Created</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-2xl font-bold">{usedCoupons}</p>
                <p className="text-sm text-muted-foreground">Coupons Used</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg col-span-2">
                <p className="text-2xl font-bold">{totalPointsAwarded.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Points Awarded</p>
              </div>
              <div className="bg-secondary p-4 rounded-lg col-span-2">
                <p className="text-2xl font-bold">{totalPointsOnCards.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Points on Student Cards</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
           <Card className="border-t-4 border-chart-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="text-chart-3" /> Recent Prize Redemptions
                </CardTitle>
            </CardHeader>
            <CardContent>
                {recentRedemptions.length > 0 ? (
                    <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {recentRedemptions.map((item, index) => (
                            <li key={index} className="text-sm">
                                <p className="font-medium">{item.studentName} redeemed <span className="font-bold">{item.description.replace('Redeemed: ', '')}</span></p>
                                <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, h:mm a")}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground italic py-4">No prizes have been redeemed yet.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-chart-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="text-chart-1" /> Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Teacher Name"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
              />
              <Button onClick={handleAddTeacher}>Add</Button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {db.teachers.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between items-center bg-secondary p-2 rounded border"
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
                          This action cannot be undone. Students in this class will become unassigned.
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

        <Card className="border-t-4 border-chart-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="text-chart-2" /> Categories
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
              >
                Add
              </Button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {db.categories.map((c) => (
                <li
                  key={c}
                  className="flex justify-between items-center bg-secondary p-2 rounded border"
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

        <Card className="border-t-4 border-chart-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="text-chart-4" /> System Data
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

      <Card className="border-t-4 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="text-primary" /> Master Coupon Printer
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
            <div className="flex items-center gap-2">
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
              <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Add New Category</DialogTitle>
                          <DialogDescription>Create a new category for coupons.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                          <Label htmlFor="new-print-category-name">Category Name</Label>
                          <Input id="new-print-category-name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddPrintCategory()} />
                      </div>
                      <DialogFooter>
                          <Button onClick={handleAddPrintCategory}>Save Category</Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>
            </div>
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
                  className="flex justify-between items-center bg-secondary p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-bold">
                      {s.lastName}, {s.firstName}{' '}
                      <span className="text-primary font-normal text-xs">
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
                      onClick={() => handleOpenActivityModal(s)}
                    >
                      <History className="w-4 h-4 text-gray-500" />
                    </Button>
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
      <StudentActivityModal
        isOpen={!!activityStudent}
        setIsOpen={() => setActivityStudent(null)}
        student={activityStudent}
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
