'use client';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  ArrowLeft, BookOpen, Tag, Database, Plus, Trash2, Upload, Download,
  FileSpreadsheet, Printer, Settings, Edit, History, Users, User, Gift, UploadCloud, IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, Coupon, Category, Class, Teacher } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { PrizeModal } from '@/components/PrizeModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import DynamicIcon from '@/components/DynamicIcon';
import { Coupon as CouponPreview } from '@/components/Coupon';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';


import { ErrorBoundary } from '@/components/ErrorBoundary';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="bg-card p-6 shadow-lg flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
        </div>
        <Skeleton className="h-9 w-36" />
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
    </div>
  );
}

function AdminDashboardInner() {
  const {
    schoolId, setCouponsToPrint, deleteStudent,
    addClass, deleteClass, deleteCategory, addCategory, addCoupons,
    devCreateBackup, devRestoreFromBackup, devDownloadBackup, addTeacher, deleteTeacher,
    addPrize, updatePrize, deletePrize, uploadStudents, setStudentsToPrint,
  } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const backupTriggeredRef = useRef(false);

  // Data fetching hooks
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

  const couponsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null, [firestore, schoolId]);
  const { data: coupons, isLoading: couponsLoading } = useCollection<Coupon>(couponsQuery);

  const backupsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'backups') : null, [firestore, schoolId]);
  const { data: backups, isLoading: backupsLoading } = useCollection<{ id: string }>(backupsQuery);


  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPoints, setNewCategoryPoints] = useState('10');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [printTeacher, setPrintTeacher] = useState('Admin');
  const [printCategoryId, setPrintCategoryId] = useState('');
  const [printValue, setPrintValue] = useState('10');

  const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
  const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
  const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

  const [uploadReport, setUploadReport] = useState<{ success: number, failed: number, errors: string[] } | null>(null);

  const isDbLoading = studentsLoading || classesLoading || teachersLoading || categoriesLoading || prizesLoading || couponsLoading || backupsLoading;

  const getClassName = (classId: string) => {
    return classes?.find((c) => c.id === classId)?.name || 'Unassigned';
  };

  useEffect(() => {
    if (isDbLoading || !schoolId || backupTriggeredRef.current || !backups) return;

    const lastBackupTime = backups.length > 0 ? parseInt(backups[0].id) : 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (Date.now() - lastBackupTime > oneDay) {
      backupTriggeredRef.current = true;
      devCreateBackup(schoolId).then(() => {
        toast({
          title: "Automatic Backup Created",
          description: "A backup was created as the last one was over 24 hours ago."
        });
      });
    }
  }, [isDbLoading, backups, devCreateBackup, toast, schoolId]);

  useEffect(() => {
    if (categories && categories.length > 0 && !printCategoryId) {
      setPrintCategoryId(categories[0].id);
    }
  }, [categories, printCategoryId]);

  useEffect(() => {
    const category = categories?.find(c => c.id === printCategoryId);
    if (category) {
      setPrintValue(category.points.toString());
    }
  }, [printCategoryId, categories]);


  if (isDbLoading) {
    return <AdminDashboardSkeleton />;
  }

  const handleAddClass = () => {
    if (!newClassName) {
      toast({
        variant: 'destructive',
        title: 'Class Name Required',
        description: 'Please enter a name for the new class.',
      });
      return;
    }
    addClass({ name: newClassName });
    setNewClassName('');
  };

  const handleAddTeacher = () => {
    if (!newTeacherName) {
      toast({
        variant: 'destructive',
        title: 'Teacher Name Required',
        description: 'Please enter a name for the new teacher.',
      });
      return;
    }
    addTeacher({ name: newTeacherName });
    setNewTeacherName('');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryPoints) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a name and point value for the category.',
      });
      return;
    }
    const points = parseInt(newCategoryPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Points',
        description: 'Points must be a positive number.',
      });
      return;
    }
    await addCategory({ name: newCategoryName, points });
    setNewCategoryName('');
    setNewCategoryPoints('10');
  };

  const handleAddPrintCategory = async () => {
    if (!newPrintCategoryName || !newPrintCategoryPoints) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a name and point value for the category.',
      });
      return;
    }
    const points = parseInt(newPrintCategoryPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Points',
        description: 'Points must be a positive number.',
      });
      return;
    }
    const newCategory = await addCategory({ name: newPrintCategoryName, points });
    if (newCategory) {
      setPrintCategoryId(newCategory.id);
    }
    setNewPrintCategoryName('');
    setNewPrintCategoryPoints('10');
    setIsPrintCategoryDialogOpen(false);
  };

  const handleOpenStudentModal = (student: Student | null) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleOpenPrizeModal = (prize: Prize | null) => {
    setEditingPrize(prize);
    setIsPrizeModalOpen(true);
  }

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
    const selectedCategory = categories?.find(c => c.id === printCategoryId);
    if (!selectedCategory) {
      toast({
        variant: 'destructive',
        title: 'Category Not Found',
        description: 'Please select a valid category.',
      });
      return;
    }
    const couponsToCreate = Array.from({ length: 24 }, () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        id: code,
        code,
        value: value,
        category: selectedCategory.name,
        teacher: printTeacher,
        used: false,
        createdAt: Date.now(),
      };
    });
    await addCoupons(couponsToCreate);
    setCouponsToPrint(couponsToCreate);
  };

  const handleCreateBackup = async () => {
    if (!schoolId) return;
    await devCreateBackup(schoolId);
    toast({ title: "Backup Created", description: "A new backup has been saved." });
  }

  const handleRestoreFromBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devRestoreFromBackup(schoolId, backupId);
    toast({ title: "Restore Complete", description: "Data has been restored from the backup." });
  }

  const handleDownloadBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devDownloadBackup(schoolId, backupId);
  }

  const handleRestoreFromFile = () => {
    backupFileInputRef.current?.click();
  };

  const onStudentCsvFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const report = await uploadStudents(text, students || [], classes || []);
      if (report.failed > 0) {
        setUploadReport(report);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to process CSV file.',
        description: (err as Error).message,
      });
    }
    if (studentCsvInputRef.current) studentCsvInputRef.current.value = '';
  }


  const usedCouponsCount = coupons?.filter((c) => c.used).length || 0;
  const totalPointsAwarded = coupons
    ?.filter((c) => c.used)
    .reduce((sum, c) => sum + c.value, 0) || 0;

  const selectedCategoryForPreview = categories?.find(c => c.id === printCategoryId);
  const previewCoupon: Coupon = {
    id: 'PREVIEW',
    code: 'PREVIEW',
    value: parseInt(printValue) || 0,
    category: selectedCategoryForPreview?.name || 'Category',
    teacher: printTeacher,
    used: false,
    createdAt: Date.now(),
  };

  const handleStudentCsvUpload = () => {
    studentCsvInputRef.current?.click();
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="bg-card border-b-4 border-slate-700 dark:border-slate-500 p-6 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 font-headline">
              <Settings /> Admin Portal: <span className="text-primary">{schoolId}</span>
            </h2>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => router.push('/portal')} variant="secondary" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Return to the main portal selection screen.</p>
            </TooltipContent>
          </Tooltip>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-t-4 border-chart-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-chart-1" /> Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Class Name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleAddClass}>Add</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new class to the school.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {classes?.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between items-center bg-secondary p-2 rounded border"
                  >
                    <span className="font-bold text-sm">{c.name}</span>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete Class</p></TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. Students in this class will become unassigned.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteClass(c.id, students || [])}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="text-purple-500" /> Teachers / Faculty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Teacher/Faculty Name"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleAddTeacher}>Add</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new teacher or faculty member.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {teachers?.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between items-center bg-secondary p-2 rounded border"
                  >
                    <span className="font-bold text-sm">{t.name}</span>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete Teacher</p></TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {t.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTeacher(t.id)}>Continue</AlertDialogAction>
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
              <div className="flex items-end gap-2 mb-4">
                <div className='flex-grow'>
                  <Label>Name</Label>
                  <Input
                    placeholder="Category Name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className='w-24'>
                  <Label>Points</Label>
                  <Input
                    type="number"
                    placeholder="Pts"
                    value={newCategoryPoints}
                    onChange={(e) => setNewCategoryPoints(e.target.value)}
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleAddCategory}>Add</Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Add a new reward category.</p></TooltipContent>
                </Tooltip>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories?.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between items-center bg-secondary p-2 rounded border"
                  >
                    <div>
                      <span className="font-bold text-sm">{c.name}</span>
                      <p className="text-xs text-muted-foreground">{c.points} pts</p>
                    </div>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete Category</p></TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete category "{c.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCategory(c.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-t-4 border-chart-3 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="text-chart-3" /> Manage Prizes
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleOpenPrizeModal(null)} size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add Prize
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Add a new prize to the prize shop.</p></TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Add, edit, or delete prizes available in the prize shop.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {prizes && prizes.length > 0 ? [...prizes].sort((a, b) => a.points - b.points).map(prize => (
                  <li key={prize.id} className="flex justify-between items-center bg-secondary p-2 rounded border">
                    <div className='flex items-center gap-3'>
                      <Switch
                        checked={prize.inStock}
                        onCheckedChange={(checked) => updatePrize({ ...prize, inStock: checked })}
                        aria-label="In Stock"
                      />
                      <DynamicIcon name={prize.icon} className={cn("w-5 h-5 text-primary", !prize.inStock && "opacity-40")} />
                      <div>
                        <span className={cn("font-bold text-sm", !prize.inStock && "line-through opacity-60")}>{prize.name}</span>
                        <p className="text-xs text-muted-foreground">{prize.points} pts</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenPrizeModal(prize)}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Edit Prize</p></TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Trash2 className="h-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete Prize</p></TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete prize "{prize.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePrize(prize.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                )) : <p className="text-center text-sm text-muted-foreground italic py-2">No prizes found. Add one to get started!</p>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-chart-4">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="text-chart-4" /> System Backups
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleCreateBackup} size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Create Backup
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Save a snapshot of the current school database.</p></TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Create a manual backup of the current database state.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                {backups && backups.length > 0 ? backups.map(backup => (
                  <li key={backup.id} className="flex justify-between items-center bg-secondary p-2 rounded border">
                    <span className="font-code text-sm break-all">{new Date(parseInt(backup.id)).toLocaleString()}</span>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadBackup(backup.id)}><Download className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Download this backup as a JSON file.</p></TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline"><Upload className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent><p>Restore the database to this state.</p></TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
                            <AlertDialogDescription>This will overwrite all current data with the data from {new Date(parseInt(backup.id)).toLocaleString()}. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRestoreFromBackup(backup.id)}>Restore</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                )) : <p className="text-center text-sm text-muted-foreground italic py-2">No backups found.</p>}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-t-4 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="text-primary" /> Master Coupon Printer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6">
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>Issue By</Label>
                <Select value={printTeacher} onValueChange={setPrintTeacher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin/General</SelectItem>
                    {teachers?.map((t) => (
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
                  <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0"><Plus className="h-4 w-4" /></Button>
                        </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent><p>Add a new category on the fly.</p></TooltipContent>
                    </Tooltip>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>Create a new category for coupons.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-3 items-center gap-4 py-4">
                        <Label htmlFor="new-print-category-name" className="text-right">Name</Label>
                        <Input id="new-print-category-name" value={newPrintCategoryName} onChange={e => setNewPrintCategoryName(e.target.value)} className="col-span-2" />

                        <Label htmlFor="new-print-category-points" className="text-right">Points</Label>
                        <Input id="new-print-category-points" type="number" value={newPrintCategoryPoints} onChange={e => setNewPrintCategoryPoints(e.target.value)} className="col-span-2" />
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handlePrintSheet} className="w-full font-bold gap-2 sm:col-span-2 md:col-span-3">
                    <Printer /> Print Sheet (24 Coupons)
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Generate and print a full sheet of 24 coupons with these settings.</p></TooltipContent>
              </Tooltip>
            </div>
            <div className="w-full md:w-1/3 flex flex-col items-center">
              <Label className="font-semibold text-muted-foreground">Live Preview</Label>
              <div className="mt-2 w-full max-w-[240px] aspect-[2/1]">
                <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Students</CardTitle>
              <CardDescription>{students?.length || 0} students in the database.</CardDescription>
            </div>
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleStudentCsvUpload} variant="outline" className="flex-1">
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bulk upload students from a CSV file. <br />Format: `firstName,lastName` or `firstName,lastName,className`. No header row needed.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setStudentsToPrint(students || [])} variant="outline" className="flex-1">
                    <Printer className="mr-2 h-4 w-4" /> Print ID Cards
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Print physical ID cards for all students in the database.</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => handleOpenStudentModal(null)} className="flex-1">
                    <Plus className="mr-2 h-4 w-4" /> Add Student
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Manually add a new student to the database.</p></TooltipContent>
              </Tooltip>
              <input
                type="file"
                ref={studentCsvInputRef}
                onChange={onStudentCsvFileChange}
                className="hidden"
                accept=".csv"
              />
            </div>
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
            <ScrollArea className="h-96">
              <ul className="space-y-2 pr-4">
                {students && [...students]
                  .filter(s =>
                    s.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                    s.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                    (s.nfcId || s.id).toLowerCase().includes(studentSearchTerm.toLowerCase())
                  )
                  .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-secondary p-3 rounded-lg border gap-2"
                    >
                      <div>
                        <p className="font-bold">
                          {s.lastName}, {s.firstName}{' '}
                          <span className="text-primary font-normal text-xs">
                            ({s.points} pts)
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Class: {getClassName(s.classId || '')} | ID: {s.nfcId}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 self-end sm:self-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setStudentsToPrint([s])}>
                              <IdCard className="w-4 h-4 text-green-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Print ID Card</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenActivityModal(s)}>
                              <History className="w-4 h-4 text-gray-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View Activity</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenStudentModal(s)}>
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit Student</p></TooltipContent>
                        </Tooltip>
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete Student</p></TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {s.firstName} {s.lastName}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this student's record.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteStudent(s.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{students?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{classes?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Classes</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{teachers?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Teachers / Faculty</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{coupons?.length || 0} / {usedCouponsCount}</p>
              <p className="text-sm text-muted-foreground">Coupons (Created/Used)</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{prizes?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Prize Types</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{totalPointsAwarded.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Points Awarded</p>
            </div>
          </CardContent>
        </Card>

        <StudentModal
          isOpen={isStudentModalOpen}
          setIsOpen={setIsStudentModalOpen}
          student={editingStudent}
          allStudents={students || []}
          allClasses={classes || []}
        />
        <PrizeModal
          isOpen={isPrizeModalOpen}
          setIsOpen={setIsPrizeModalOpen}
          prize={editingPrize}
        />
        <StudentActivityModal
          isOpen={!!activityStudent}
          setIsOpen={() => setActivityStudent(null)}
          student={activityStudent}
        />
        <AlertDialog open={!!uploadReport} onOpenChange={() => setUploadReport(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>CSV Upload Report</AlertDialogTitle>
              <AlertDialogDescription>
                {uploadReport?.success} students uploaded successfully. {uploadReport?.failed} rows failed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {uploadReport && uploadReport.errors.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-sm font-code">
                <p className="font-bold mb-2">Error Details:</p>
                <ul className="space-y-1">
                  {uploadReport.errors.map((error, i) => <li key={i}>{error}</li>)}
                </ul>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setUploadReport(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
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
    return <AdminDashboardSkeleton />;
  }

  return (
    <ErrorBoundary name="AdminPage">
      <AdminDashboardInner />
    </ErrorBoundary>
  );
}
