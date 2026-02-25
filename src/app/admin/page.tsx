
'use client';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { SchoolGate } from '@/components/SchoolGate';
import {
  BookOpen, Tag, Database, Plus, Trash2, Upload, Download,
  Printer, Edit, History, Users, User, Gift, UploadCloud,
  Trophy, ShieldCheck, LayoutDashboard, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, Coupon, Category, Class, Teacher, BackupInfo, Achievement } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudentModal } from '@/components/StudentModal';
import { PrizeModal } from '@/components/PrizeModal';
import { AchievementModal } from '@/components/AchievementModal';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useArcadeSound } from '@/hooks/useArcadeSound';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-8">
      <Card className="bg-card p-6 shadow-lg flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-36" />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AwardPointsDialog({ student, isOpen, onOpenChange, onAward }: {
  student: Student | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAward: (studentId: string, points: number, description: string) => Promise<{ success: boolean; message: string; bonusTotal?: number }>;
}) {
  const [points, setPoints] = useState('10');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const playSound = useArcadeSound();

  useEffect(() => {
    if (isOpen) {
      setPoints('10');
      setDescription('');
    }
  }, [isOpen]);

  if (!student) return null;

  const handleAward = async () => {
    const pointsValue = parseInt(points);
    if (!description.trim()) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Description is required' });
      return;
    }
    if (isNaN(pointsValue) || pointsValue <= 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Points must be a positive number' });
      return;
    }

    const result = await onAward(student.id, pointsValue, description);
    
    if(result.success) {
      playSound('success');
      let toastDescription = `Awarded ${pointsValue} points to ${student.firstName}.`;
      if(result.bonusTotal && result.bonusTotal > 0) {
        toastDescription += ` They also earned ${result.bonusTotal} bonus points from achievements!`;
      }
      toast({ title: 'Points Awarded!', description: toastDescription });
      onOpenChange(false);
    } else {
      playSound('error');
      toast({ variant: 'destructive', title: 'Failed to award points', description: result.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Award Points to {student.firstName} {student.lastName}</DialogTitle>
          <DialogDescription>Manually grant points for a specific reason.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="award-points">Points to Award</Label>
            <Input id="award-points" type="number" value={points} onChange={e => setPoints(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor="award-desc">Reason / Description</Label>
            <Input id="award-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., 'Classroom leadership'" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAward}>Award Points</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function AdminDashboardInner() {
  const {
    schoolId, setCouponsToPrint, deleteStudent,
    addClass, deleteClass, deleteCategory, addCategory, addCoupons,
    devCreateBackup, devRestoreFromBackup, devDownloadBackup, addTeacher, deleteTeacher,
    addPrize, updatePrize, deletePrize, uploadStudents, setStudentsToPrint,
    deleteAchievement, awardPoints,
  } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const studentCsvInputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings } = useSettings();

  // Data fetching hooks
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'students') : null, [firestore, schoolId]);
  const { data: students, isLoading: studentsLoading, error: studentsError } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
  const { data: classes, isLoading: classesLoading, error: classesError } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading, error: teachersError } = useCollection<Teacher>(teachersQuery);

  const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCollection<Category>(categoriesQuery);

  const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
  const { data: prizes, isLoading: prizesLoading, error: prizesError } = useCollection<Prize>(prizesQuery);

  const couponsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null, [firestore, schoolId]);
  const { data: coupons, isLoading: couponsLoading, error: couponsError } = useCollection<Coupon>(couponsQuery);

  const backupsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'backups') : null, [firestore, schoolId]);
  const { data: backups, isLoading: backupsLoading, error: backupsError } = useCollection<BackupInfo>(backupsQuery);

  const achievementsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'achievements') : null, [firestore, schoolId]);
  const { data: achievements, isLoading: achievementsLoading, error: achievementsError } = useCollection<Achievement>(achievementsQuery);

  const [newClassName, setNewClassName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPoints, setNewCategoryPoints] = useState('10');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [awardingStudent, setAwardingStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [printTeacher, setPrintTeacher] = useState('Admin');
  const [printCategoryId, setPrintCategoryId] = useState('');
  const [printValue, setPrintValue] = useState('10');

  const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
  const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
  const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

  const [uploadReport, setUploadReport] = useState<{ success: number, failed: number, errors: string[] } | null>(null);

  const isDbLoading = studentsLoading || classesLoading || teachersLoading || categoriesLoading || prizesLoading || couponsLoading || backupsLoading || achievementsLoading;

  const collectionErrors = [
    { name: 'Students', error: studentsError },
    { name: 'Classes', error: classesError },
    { name: 'Teachers', error: teachersError },
    { name: 'Categories', error: categoriesError },
    { name: 'Prizes', error: prizesError },
    { name: 'Coupons', error: couponsError },
    { name: 'Backups', error: backupsError },
    { name: 'Achievements', error: achievementsError },
  ].filter(c => c.error);

  const getClassName = (classId: string) => {
    return classes?.find((c) => c.id === classId)?.name || 'Unassigned';
  };

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

  if (collectionErrors.length > 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Data Fetch Error</AlertTitle>
          <AlertDescription>
            Some school data could not be loaded. This may be due to temporary network issues or missing permissions.
            <ul className="mt-2 text-xs font-code list-disc pl-4">
              {collectionErrors.map((c, i) => (
                <li key={i}>{c.name}: {c.error?.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="rounded-full">
          <History className="mr-2 h-4 w-4" /> Retry Loading
        </Button>
      </div>
    );
  }

  const handleAddClass = () => {
    if (!newClassName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Class Name Required', description: 'Please enter a name for the new class.' });
      return;
    }
    addClass({ name: newClassName });
    setNewClassName('');
  };

  const handleAddTeacher = () => {
    if (!newTeacherName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Teacher Name Required', description: 'Please enter a name for the new teacher.' });
      return;
    }
    addTeacher({ name: newTeacherName });
    setNewTeacherName('');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryPoints) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a name and point value for the category.' });
      return;
    }
    const points = parseInt(newCategoryPoints);
    if (isNaN(points) || points <= 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Invalid Points', description: 'Points must be a positive number.' });
      return;
    }
    await addCategory({ name: newCategoryName, points });
    setNewCategoryName('');
    setNewCategoryPoints('10');
  };

  const handleAddPrintCategory = async () => {
    if (!newPrintCategoryName || !newPrintCategoryPoints) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a name and point value for the category.' });
      return;
    }
    const points = parseInt(newPrintCategoryPoints);
    if (isNaN(points) || points <= 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Invalid Points', description: 'Points must be a positive number.' });
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

  const handleOpenAchievementModal = (achievement: Achievement | null) => {
    setEditingAchievement(achievement);
    setIsAchievementModalOpen(true);
  };

  const handleOpenActivityModal = (student: Student) => {
    setActivityStudent(student);
  };

  const handlePrintSheet = async () => {
    const value = parseInt(printValue);
    if (!value || value <= 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Invalid Value', description: 'Coupon value must be a positive number.' });
      return;
    }
    const selectedCategory = categories?.find(c => c.id === printCategoryId);
    if (!selectedCategory) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Category Not Found', description: 'Please select a valid category.' });
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
    playSound('success');
    toast({ title: "Backup Created", description: "A new backup has been saved." });
  }

  const handleRestoreFromBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devRestoreFromBackup(schoolId, backupId);
    playSound('success');
    toast({ title: "Restore Complete", description: "Data has been restored from the backup." });
  }

  const handleDownloadBackup = async (backupId: string) => {
    if (!schoolId) return;
    await devDownloadBackup(schoolId, backupId);
  }

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
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Failed to process CSV file.',
        description: (err as Error).message,
      });
    }
    if (studentCsvInputRef.current) studentCsvInputRef.current.value = '';
  }

  const usedCouponsCount = coupons?.filter((c) => c.used).length || 0;
  const totalPointsAwarded = coupons?.filter((c) => c.used).reduce((sum, c) => sum + c.value, 0) || 0;

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
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
        <Tabs defaultValue="students" className="space-y-6">
          <div className="flex justify-start sm:justify-center overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 p-1.5 rounded-2xl inline-flex w-max border shadow-sm">
              <TabsTrigger value="stats" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <LayoutDashboard className="w-4 h-4" /> Stats
              </TabsTrigger>
              <TabsTrigger value="students" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" /> Students
              </TabsTrigger>
              <TabsTrigger value="classes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="w-4 h-4" /> Classes
              </TabsTrigger>
              <TabsTrigger value="teachers" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <User className="w-4 h-4" /> Teachers
              </TabsTrigger>
              <TabsTrigger value="categories" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Tag className="w-4 h-4" /> Categories
              </TabsTrigger>
              <TabsTrigger value="prizes" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Gift className="w-4 h-4" /> Prizes
              </TabsTrigger>
              {settings.enableAchievements && (
                <TabsTrigger value="achievements" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Trophy className="w-4 h-4" /> Achievements
                </TabsTrigger>
              )}
              <TabsTrigger value="coupons" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Printer className="w-4 h-4" /> Coupons
              </TabsTrigger>
              <TabsTrigger value="backups" className="rounded-xl px-3 py-2 font-bold flex items-center gap-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Database className="w-4 h-4" /> Backups
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="classes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-chart-1 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-chart-1" /> Classes</CardTitle>
                <CardDescription>Manage class groups for your school.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input placeholder="New class name..." value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="rounded-xl" />
                  <Button onClick={handleAddClass} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add</Button>
                </div>
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {classes?.map((c) => (
                    <li key={c.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-primary/20 transition-colors">
                      <span className="font-bold">{c.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteClass(c.id, students || [])}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                  {(!classes || classes.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No classes yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-purple-500 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-purple-500" /> Teachers</CardTitle>
                <CardDescription>Add and manage teachers who can issue coupons.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input placeholder="New teacher name..." value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="rounded-xl" />
                  <Button onClick={handleAddTeacher} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add</Button>
                </div>
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {teachers?.map((t) => (
                    <li key={t.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-purple-200 transition-colors">
                      <span className="font-bold">{t.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteTeacher(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                  {(!teachers || teachers.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No teachers yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-chart-2 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-chart-2" /> Reward Categories</CardTitle>
                <CardDescription>Define categories and point values for coupons.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-6">
                  <Input placeholder="Category Name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="rounded-xl" />
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Points" value={newCategoryPoints} onChange={(e) => setNewCategoryPoints(e.target.value)} className="rounded-xl" />
                    <Button onClick={handleAddCategory} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add</Button>
                  </div>
                </div>
                <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {categories?.map((c) => (
                    <li key={c.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border hover:border-chart-2/20 transition-colors">
                      <div>
                        <p className="font-bold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.points} pts</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteCategory(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8 opacity-50">No categories yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-primary shadow-md overflow-hidden">
              <CardHeader className="bg-primary/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-8">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="text-primary w-6 h-6" /> Students
                  </CardTitle>
                  <CardDescription>Manage your enrollments and view student activity.</CardDescription>
                </div>
                <div className='flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0'>
                  <Button onClick={handleStudentCsvUpload} variant="outline" className="rounded-full px-4"><UploadCloud className="mr-2 h-4 w-4" /> Import CSV</Button>
                  <Button onClick={() => setStudentsToPrint(students || [])} variant="outline" className="rounded-full px-4"><Printer className="mr-2 h-4 w-4" /> Bulk ID Print</Button>
                  <Button onClick={() => handleOpenStudentModal(null)} className="rounded-full px-6 shadow-md"><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
                  <input type="file" ref={studentCsvInputRef} onChange={onStudentCsvFileChange} className="hidden" accept=".csv" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative mb-6">
                  <Input placeholder="Search students by name or ID..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="rounded-full pl-10 h-11" />
                  <LayoutDashboard className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                </div>
                <ScrollArea className="h-[500px]">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                    {students?.filter(s =>
                      `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                      (s.nfcId || '').toLowerCase().includes(studentSearchTerm.toLowerCase())
                    ).sort((a, b) => a.lastName.localeCompare(b.lastName)).map(s => (
                      <li key={s.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-secondary/20 p-4 rounded-2xl border hover:border-primary/30 transition-all hover:bg-background shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-lg">{s.lastName}, {s.firstName}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">{getClassName(s.classId || '')} | ID: <span className="font-code">{s.nfcId || '---'}</span></p>
                            <p className="text-primary font-bold text-xs mt-1">{s.points} pts accumulated</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 self-end sm:self-center">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenActivityModal(s)}><History className="w-4 h-4" /></Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setAwardingStudent(s)}><Award className="w-4 h-4 text-green-500" /></Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenStudentModal(s)}><Edit className="w-4 h-4 text-blue-500" /></Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50" onClick={() => deleteStudent(s.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prizes" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-chart-3 shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="text-chart-3 w-5 h-5" /> Prize Shop
                  </CardTitle>
                  <CardDescription>Items available for student redemption.</CardDescription>
                </div>
                <Button onClick={() => handleOpenPrizeModal(null)} className="rounded-full px-6 shadow-md shadow-chart-3/20">
                  <Plus className="mr-2 h-4 w-4" /> Add Prize
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {prizes?.sort((a, b) => a.points - b.points).map(p => (
                    <li key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-secondary/30 p-4 rounded-2xl border group transition-all hover:bg-background">
                      <div className="flex items-center gap-4 flex-grow">
                        <div className="flex flex-col items-center">
                          <Switch checked={p.inStock} onCheckedChange={(checked) => updatePrize({ ...p, inStock: checked })} className="data-[state=checked]:bg-green-500 scale-75" />
                          <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-50">{p.inStock ? 'On' : 'Off'}</p>
                        </div>
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-background border flex-shrink-0", !p.inStock && "opacity-40 grayscale")}>
                          <DynamicIcon name={p.icon} className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className={cn("font-bold text-base leading-none mb-1", !p.inStock && "line-through opacity-40")}>{p.name}</p>
                          <p className="text-xs font-bold text-primary">{p.points} points</p>
                        </div>
                      </div>
                      <div className="flex gap-1 self-end sm:self-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOpenPrizeModal(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500" onClick={() => deletePrize(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {settings.enableAchievements && (
            <TabsContent value="achievements" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border-t-4 border-amber-500 shadow-md">
                <CardHeader className="flex flex-row justify-between items-center py-6">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="text-amber-500 w-5 h-5" /> Achievements
                    </CardTitle>
                    <CardDescription>Badges for student milestones.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenAchievementModal(null)} variant="outline" className="rounded-full px-4 border-amber-200 hover:bg-amber-50">
                    <Plus className="mr-2 h-4 w-4" /> Add Achievement
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {(achievements || []).sort((a, b) => a.name.localeCompare(b.name)).map(ach => (
                      <li key={ach.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-secondary/30 p-4 rounded-2xl border group transition-all hover:bg-background">
                        <div className="flex items-center gap-4 flex-grow">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40 flex-shrink-0">
                            <DynamicIcon name={ach.icon} className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-bold text-base leading-none mb-1">{ach.name}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{ach.description}</p>
                            <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-tighter">
                              {ach.criteria.type}: {ach.criteria.threshold} {ach.bonusPoints ? `• +${ach.bonusPoints} pts` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 self-end sm:self-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOpenAchievementModal(ach)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500" onClick={() => deleteAchievement(ach.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </li>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div className="text-center py-8 opacity-40">
                        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No achievements created yet.</p>
                      </div>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="coupons" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-primary shadow-md overflow-hidden bg-primary/5">
              <CardHeader className="py-6">
                <CardTitle className="flex items-center gap-2">
                  <Printer className="text-primary w-5 h-5" /> Coupon Generation
                </CardTitle>
                <CardDescription>Batch create and print physical point rewards.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row gap-8 pb-10">
                <div className="flex-grow space-y-6 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold opacity-70">Issued By</Label>
                      <Select value={printTeacher} onValueChange={setPrintTeacher}>
                        <SelectTrigger className="rounded-xl h-12 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Admin">Admin</SelectItem>
                          {teachers?.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold opacity-70">Reward Category</Label>
                      <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                        <SelectTrigger className="rounded-xl h-12 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.points}p)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold opacity-70">Custom Point Value</Label>
                    <Input type="number" value={printValue} onChange={e => setPrintValue(e.target.value)} className="rounded-xl h-12 bg-background font-bold text-lg" />
                  </div>
                  <Button onClick={handlePrintSheet} className="w-full font-bold h-14 rounded-2xl text-lg shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform">
                    <Printer className="mr-3 w-6 h-6" /> Print Sheet (24 Coupons)
                  </Button>
                </div>
                <div className="w-full lg:w-80 flex flex-col items-center justify-center p-8 border border-dashed border-primary/40 rounded-3xl bg-background/50 backdrop-blur-sm self-center">
                  <p className="text-xs font-bold text-primary mb-6 uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full">DESIGN PREVIEW</p>
                  <div className="hover:scale-105 transition-transform duration-500">
                    <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                  </div>
                  <p className="mt-6 text-[10px] text-muted-foreground italic text-center max-w-[200px]">This is how each individual coupon will look when printed.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-slate-800 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LayoutDashboard className="w-5 h-5" /> System Stats</CardTitle>
                <CardDescription>Overview of your school data at a glance.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Students', val: students?.length || 0 },
                  { label: 'Classes', val: classes?.length || 0 },
                  { label: 'Teachers', val: teachers?.length || 0 },
                  { label: 'Coupons', val: coupons?.length || 0 },
                  { label: 'Used', val: usedCouponsCount },
                  { label: 'Points Issued', val: totalPointsAwarded.toLocaleString() },
                ].map((stat, i) => (
                  <div key={i} className="bg-secondary/30 border p-6 rounded-2xl">
                    <p className="text-3xl font-bold font-code">{stat.val}</p>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter opacity-70 mt-1">{stat.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backups" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-t-4 border-chart-4 shadow-md">
              <CardHeader className="flex flex-row justify-between items-center py-6">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="text-chart-4 w-5 h-5" /> System Backups
                  </CardTitle>
                  <CardDescription>Create and restore data snapshots.</CardDescription>
                </div>
                <Button onClick={handleCreateBackup} className="rounded-full px-6 shadow-md"><Plus className="mr-2 h-4 w-4" /> Create Snapshot</Button>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-[400px]">
                  <ul className="space-y-2.5 pr-4">
                    {(backups || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(b => (
                      <li key={b.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-secondary/20 p-4 rounded-2xl border group transition-all hover:bg-background">
                        <div className="flex items-center gap-4 flex-grow">
                          <div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center flex-shrink-0">
                            <Database className="w-5 h-5 text-chart-4" />
                          </div>
                          <div>
                            <p className="font-code text-sm font-bold">{b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Unknown date'}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{b.totalDocs} documents • <span className={b.type === 'scheduled' ? 'text-green-600' : 'text-blue-600'}>{b.type || 'manual'}</span></p>
                          </div>
                        </div>
                        <div className="flex gap-2 self-end sm:self-center">
                          <Button size="icon" variant="outline" className="rounded-full h-10 w-10 shadow-sm" onClick={() => handleDownloadBackup(b.id)}><Download className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="outline" className="rounded-full h-10 w-10 shadow-sm hover:border-red-200 hover:bg-red-50"><Upload className="h-4 w-4 text-orange-600" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl border-2">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold">Restore snapshot?</AlertDialogTitle>
                                <AlertDialogDescription className="text-base text-balance mt-2">
                                  This will <span className="font-bold text-red-600">OVERWRITE all current school data</span> with the state from {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'unknown date'}. This cannot be easily undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-6">
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestoreFromBackup(b.id)} className="rounded-full bg-orange-600 hover:bg-orange-700">Restore Data</AlertDialogAction>
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
          </TabsContent>

        </Tabs>

        {/* Modals outside Tabs */}
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
        <AchievementModal
          isOpen={isAchievementModalOpen}
          setIsOpen={setIsAchievementModalOpen}
          achievement={editingAchievement}
          categories={categories || []}
        />
        <AwardPointsDialog
          isOpen={!!awardingStudent}
          onOpenChange={() => setAwardingStudent(null)}
          student={awardingStudent}
          onAward={awardPoints}
        />
        <AlertDialog open={!!uploadReport} onOpenChange={() => setUploadReport(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Import Report</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="flex gap-4 mt-2">
                  <div className="bg-green-100 text-green-700 p-3 rounded-2xl flex-1 text-center font-bold">
                    {uploadReport?.success} SUCCESS
                  </div>
                  <div className="bg-red-100 text-red-700 p-3 rounded-2xl flex-1 text-center font-bold">
                    {uploadReport?.failed} FAILED
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {uploadReport && uploadReport.errors.length > 0 && (
              <ScrollArea className="h-40 mt-4 rounded-xl border bg-muted/50 p-3">
                <p className="font-bold text-xs uppercase mb-2 opacity-60">Error Details</p>
                <ul className="space-y-1 text-xs font-code">
                  {uploadReport.errors.map((error, i) => <li key={i} className="text-red-500">• {error}</li>)}
                </ul>
              </ScrollArea>
            )}
            <AlertDialogFooter className="mt-4">
              <AlertDialogAction onClick={() => setUploadReport(null)} className="rounded-full">Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}


export default function AdminPage() {
  const { loginState, isInitialized, isAdmin } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && loginState !== 'school') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  if (!isInitialized || loginState !== 'school' || !isAdmin) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <ErrorBoundary name="AdminPage">
      <SchoolGate fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardInner />
      </SchoolGate>
    </ErrorBoundary>
  );
}
